"""Read the warehouse once, run isolated research, emit evidence and model cards.

python -m agrodecide.research_v5.run
No writes to DuckDB, public/, the V2 registry or production manifests.
"""
import argparse
from datetime import datetime
from hashlib import sha256
import importlib.metadata
import json
from pathlib import Path
from zoneinfo import ZoneInfo
import duckdb
import numpy as np
import pandas as pd
from agrodecide.v4.storage import ROOT, DATA, atomic_json
from . import VERSION
from .eda import describe,plot_report
from .evaluation import HORIZONS,evaluate,finish,holm

FOLDER=DATA/'research_v5'


def clean(value):
    if isinstance(value,dict):return {k:clean(v) for k,v in value.items()}
    if isinstance(value,(list,tuple)):return [clean(v) for v in value]
    if isinstance(value,(float,np.floating)) and not np.isfinite(value):return None
    if isinstance(value,np.integer):return int(value)
    return value


def code_hash():
    return sha256(b''.join(p.name.encode()+p.read_bytes() for p in sorted(Path(__file__).parent.glob('*.py')))).hexdigest()


def frame_hash(frame):
    ordered=frame.sort_values(['variedad','mercado_id','fecha']).reindex(sorted(frame.columns),axis=1)
    return sha256(ordered.to_csv(index=False,date_format='%Y-%m-%dT%H:%M:%S').encode()).hexdigest()


def run(minimum_improvement=.03):
    if not 0<=minimum_improvement<=.5:raise ValueError('Umbral de promoción entre 0 y 0.5')
    # Read-only connection makes concurrent readers safe and cannot mutate the master.
    with duckdb.connect(str(DATA/'warehouse.duckdb'),read_only=True) as conn:
        frame=conn.execute('SELECT * FROM prices ORDER BY variedad,mercado_id,fecha').df()
    index=json.loads((ROOT/'public/data/index.json').read_text(encoding='utf-8'))
    current={(s['variety'],str(s['market_id'])) for s in index['series']}
    implementation=code_hash();input_hash=frame_hash(frame)
    run_id='research-v5-'+sha256((implementation+input_hash+str(minimum_improvement)).encode()).hexdigest()[:20]
    report={'schema_version':VERSION,'run_id':run_id,'code_hash':implementation,'input_hash':input_hash,
            'generated_at':datetime.now(ZoneInfo('America/Lima')).isoformat(),
            'scope':'Investigación complementaria de precios; no reemplaza silenciosamente V2.',
            'data_contract':{'market_level':'mayorista','price_unit':'PEN/kg','volume_unit':'t','future_covariates':False,
                             'publication_vintage':'Desconocido en SISAP; quote-date sólo, historia actual revisable',
                             'provenance_fields':['source_url','archivo_origen','fuente','fecha','variedad','mercado_id']},
            'versions':{p:importlib.metadata.version(p) for p in ('numpy','pandas','scipy','statsmodels','duckdb')},
            'series':[],'excluded':[],'protocol':{
                'horizons':list(HORIZONS),'target':'Cada día t+1…t+h; MAE endpoint t+h por separado; no media del precio de la ventana.',
                'phases':'6 selección, 6 calibración, 12 auditoría; purga del horizonte entre fases; orígenes mensuales.',
                'internal_tuning':'3 cortes internos por origen; ventanas365/540/730/1095/expanding; sólo historia anterior al corte.',
                'final_test':'Últimos240d no puntuados ni usados para seleccionar ganador en este protocolo. La historia ya fue vista por V2. Las curvas actuales son refits que sí aprovechan información actual; test prospectivo realmente nuevo pendiente.',
                'multiplicity':'Holm global sobre los60 challengers seleccionados sin auditoría; 4999 bootstrap circular por bloques; semilla20261016.',
                'promotion':'Mejora>=umbral, ICbootstrap95%>0, pHolm<=.05, >=6bloques efectivos y >=8/12 orígenes favorables.',
                'band_method':'Cuantiles de error absoluto separados80/95, corrección de rango finito. Dependencia temporal: cobertura nominal no garantizada.',
                'minimum_improvement':minimum_improvement}}
    for (variety,market),part in frame.groupby(['variedad','mercado_id'],sort=True):
        if (variety,str(market)) not in current:
            report['excluded'].append({'variety':variety,'market_id':str(market),'reason':'Serie fuera del catálogo vigente (p.ej. Perricholi discontinuada)','observations':len(part)});continue
        y=part.set_index(pd.to_datetime(part.fecha)).precio_s_kg.asfreq('D')
        data_hash=sha256(y.to_csv().encode()).hexdigest()
        key=sha256((implementation+data_hash).encode()).hexdigest()
        cache=FOLDER/'cache'/f'{key}-eda.json'
        if cache.exists():eda=json.loads(cache.read_text(encoding='utf-8'))
        else:eda=clean(describe(part,y));atomic_json(cache,eda)
        series={'variety':variety,'market_id':str(market),'market':str(part.mercado.iloc[0]),'level':'mayorista',
                'last_date':str(y.index[-1].date()),'last_price':float(y.iloc[-1]),'start':str(y.index[0].date()),
                'data_hash':data_hash,'input_hash':frame_hash(part),'observations':int(y.notna().sum()),
                'source_urls':sorted(part.source_url.dropna().unique().tolist()),'raw_files':sorted(part.archivo_origen.dropna().unique().tolist()),
                'quality':eda['quality'],'eda':eda,'evaluations':[],'forecasts_by_horizon':{},'run_id':run_id}
        for h in HORIZONS:
            cache=FOLDER/'cache'/f'{key}-{h}.json'
            if cache.exists():result=json.loads(cache.read_text(encoding='utf-8'))
            else:
                try:result=clean(evaluate(y,h))
                except ValueError as exc:result={'horizon':h,'state':'NO DISPONIBLE','reason':str(exc)}
                atomic_json(cache,result)
            series['evaluations'].append(result)
            print(f'{variety} {h}d: '+str(result.get('selected_challenger',result.get('reason'))),flush=True)
        report['series'].append(series)
    comparisons=[e for s in report['series'] for e in s['evaluations'] if e.get('comparison')]
    adjusted=holm([e['comparison']['p_one_sided_raw'] for e in comparisons])
    for e,p in zip(comparisons,adjusted):e['_adjusted_p']=p
    for series in report['series']:
        part=frame[(frame.variedad==series['variety'])&(frame.mercado_id.astype(str)==series['market_id'])]
        y=part.set_index(pd.to_datetime(part.fecha)).precio_s_kg.asfreq('D')
        for e in series['evaluations']:
            if 'candidates' not in e:continue
            finish(e,y,e.pop('_adjusted_p',1.),minimum_improvement)
            # Keep dated evidence for baseline, preselected challenger and requested AR1.
            keep={'Naive',e['selected_challenger'],'AR1 log · ventana validada'}
            e['audit_rows']={name:rows for name,rows in e['audit_rows'].items() if name in keep}
            series['forecasts_by_horizon'][str(e['horizon'])]=e['forecast']
        series['forecast']=series['forecasts_by_horizon'].get('240',[])
        series['model_version']='research-v5-5.0.0'
    report['multiplicity_tests']=len(comparisons)
    report['promoted_combinations']=sum(e.get('promoted',False) for s in report['series'] for e in s['evaluations'])
    atomic_json(FOLDER/'report.json',clean(report))
    documentation(report,frame)
    print(json.dumps({'run_id':run_id,'series':len(report['series']),'comparisons':len(comparisons),
                      'promotions':report['promoted_combinations'],'file':str(FOLDER/'report.json')},ensure_ascii=False),flush=True)
    return report


def documentation(report,frame):
    eda_dir=ROOT/'docs/eda';model_dir=ROOT/'docs/modelos'
    eda_dir.mkdir(parents=True,exist_ok=True);model_dir.mkdir(parents=True,exist_ok=True)
    lines=['# Diagnóstico por variedad · investigación V5','',f"Ejecución `{report['run_id']}`. Datos hasta {max(s['last_date'] for s in report['series'])}; mercado mayorista GMML Lima, PEN/kg nominal. Fecha original de publicación y revisiones SISAP desconocidas.",'',
           'Estas estadísticas descriptivas no se usan para elegir el ganador. ACF alta no demuestra optimalidad de Naive. Los contrastes ADF/KPSS tienen supuestos; diferencias de régimen y dependencia limitan sus inferencias. Ninguna variedad representa precio en chacra de Tarma.','',
           '| Variedad | n | Cobertura diaria | Volumen disponible | ACF(1) nivel | ADF p nivel | KPSS p tabulado | Drift KS |','|---|---:|---:|---:|---:|---:|---:|---:|']
    result=['# Evaluación reproducible V5','',f"Run `{report['run_id']}`; código `{report['code_hash']}`; entrada `{report['input_hash']}`.",'',
            'No se recuperaron las supuestas mejoras17/29/28% del encargo: no eran resultados existentes en este repositorio. Este experimento vuelve a medirlas con otro protocolo; no se comparan directamente scores de cortes distintos.','',
            '| Variedad | h | Challenger seleccionado | Mejora audit % | p Holm | Bloques efectivos | Recomendado por compuerta | MAE recomendado | MAE endpoint |','|---|---:|---|---:|---:|---:|---|---:|---:|']
    for s in report['series']:
        d=s['eda'];q=d['quality'];level=d['levels'];safe=lambda x: 'ND' if x is None else f'{x:.4f}'
        lines.append(f"| {s['variety']} | {q['observations']} | {q['coverage_daily']:.1%} | {q['volume_coverage']:.1%} | {level['acf'][1]['value']:.4f} | {safe(level.get('adf',{}).get('p'))} | {safe(level.get('kpss',{}).get('p_table_bound'))} | {d['drift']['ks_statistic']:.3f} |")
        slug=''.join(c if c.isalnum() else '-' for c in s['variety'].lower())
        part=frame[(frame.variedad==s['variety'])&(frame.mercado_id.astype(str)==s['market_id'])];y=part.set_index(pd.to_datetime(part.fecha)).precio_s_kg.asfreq('D')
        figure=eda_dir/f'{slug}.png';plot_report(y,{**d,'variety':s['variety']},figure)
        lines.extend(['',f"## {s['variety']}",'',f"Rango {q['first_date']}–{q['last_date']}; faltan {len(q['missing_dates'])} cotizaciones en la rejilla diaria. Imputación causal ≤7d para ajustar modelos; cero objetivos imputados. Duplicados {q['duplicate_identity_rows']}; precios no positivos {q['negative_or_zero_prices']}; flags MAD8 {len(q['outliers_mad8'])}, conservados.",'',
                      f"Media {d['statistics']['mean']:.3f}, mediana {d['statistics']['median']:.3f}, CV {d['statistics']['coefficient_variation']:.3f}; rango {d['statistics']['min']:.2f}–{d['statistics']['max']:.2f} PEN/kg. Drift PSI {d['drift']['psi']:.3f} y KS {d['drift']['ks_statistic']:.3f}: descriptivos, no p independiente. Suficiencia de datos: {q['forecast_data_sufficient']}; latencia de publicación NO VERIFICABLE.",'',f"![EDA {s['variety']}]({slug}.png)",''])
        for e in s['evaluations']:
            if 'candidates' not in e:
                result.append(f"| {s['variety']} | {e['horizon']} | No disponible | — | — | — | Conservar publicación previa | — | — |");continue
            c=e['comparison'];a=e['published_audit'];ep=e['published_endpoint_audit']
            result.append(f"| {s['variety']} | {e['horizon']} | {e['selected_challenger']} | {100*c['relative_mae_improvement']:.2f} | {c['p_holm']:.4f} | {c['effective_blocks_approx']:.2f} | {e['published_model']} | {a['mae']:.4f} | {ep['mae'] if ep else float('nan'):.4f} |")
        lines.append('Ficha por horizonte: consultar tabla de evaluación y JSON del run; faltan vintages para deflactar, atribuir shocks o usar volumen/clima/macro como predictores. Cambios mensuales no se etiquetan causalmente como pandemia/El Niño sin evidencia.')
    lines.extend(['','## Reproducibilidad y límites','','`python -m agrodecide.research_v5.run` lee DuckDB una sola vez en modo `read_only=True`, no altera tablas. Las figuras son Matplotlib; JSON guarda percentiles, asimetría, curtosis, ADF/KPSS/ACF/PACF con intervalos, fuerza STL7/365, volatilidad, estacionalidad y relación volumen con retornos7d (exploratoria).','',
                  'Cobertura = cotizaciones observadas / días entre extremos. Volumen = no nulos / filas. Suficiencia = cobertura≥85%, ≥730 días, último precio válido, ningún hueco>7d. No se presenta una puntuación de confianza inventada: latencia y revisiones desconocidas se registran como tales. La cobertura de la rejilla no certifica operación real todos los días.','',
                  'No se calculó precio real IPC ni impactos climáticos: los vintages actuales no permiten justificar su disponibilidad histórica. Procedencia, calidad comercial y mercado de origen no están en estos registros. Los outliers se señalan sin eliminarlos.'])
    (eda_dir/'DIAGNOSTICO_POR_VARIEDAD.md').write_text('\n'.join(lines)+'\n',encoding='utf-8')
    result.extend(['','## Interpretación de resultados','','La compuerta puede conservar Naive aunque una MAE retrospectiva aparente ser mejor. Con12 orígenes mensuales, h180/240 tienen aproximadamente2/1.5 bloques efectivos, insuficientes para una promoción defendible. El mínimo6 es una regla conservadora preespecificada, no un teorema. El bootstrap circular supone pérdidas aproximadamente estacionarias; cambios de régimen pueden invalidarlo.','',
                   'El tramo final240d no fue puntuado para escoger un ganador, pero la historia ya fue inspeccionada por V2. Las curvas emitidas hoy son refits con datos actuales. No se afirma test final globalmente virgen: la validación verdaderamente nueva será prospectiva tras la fecha de emisión.','',
                   'MAE trayectoria reúne los errores observados de cada día t+1…t+h; no significa error del precio promedio de la ventana. MAE endpoint usa sólo lead=h por origen. No se interpolan seis puntos para construir la trayectoria diaria.','',
                   'Esta investigación NO sobrescribe el campeón V2 de Única: tiene cortes, gates y candidatos distintos. La app debe nombrar el run y objetivo al comparar. Modelos multivariables V2 quedan preservados; este experimento añade AR1 y cuatro referentes sencillos, no reentrena16 familias sobre10series sin justificación.','',
                   '## Regenerar','', '`python -m agrodecide.research_v5.run --min-improvement 0.03`','',
                   f"Combinaciones evaluadas {len(report['series'])*len(HORIZONS)}; contrastes Holm {report['multiplicity_tests']}; promociones {report['promoted_combinations']}. Los umbrales0/3/5/10% se muestran como sensibilidad sin retunear la auditoría."])
    (model_dir/'RESULTADOS_V5.md').write_text('\n'.join(result)+'\n',encoding='utf-8')


if __name__=='__main__':
    parser=argparse.ArgumentParser();parser.add_argument('--min-improvement',type=float,default=.03)
    run(parser.parse_args().min_improvement)
