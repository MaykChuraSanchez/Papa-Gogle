"""Rolling-origin selection, separate calibration/audit, and cached inference.

Models never receive an outer audit target for selection, weighting or fitting.
The price history is a current SISAP vintage, explicitly disclosed in reports.
"""
import os
os.environ.setdefault('OMP_NUM_THREADS','2')
os.environ.setdefault('OPENBLAS_NUM_THREADS','2')
from hashlib import sha256
from pathlib import Path
import argparse
import importlib.metadata
import json
import math
import time
import warnings
import numpy as np
import pandas as pd
from agrodecide.v4.storage import DATA,ROOT,now,read,atomic_json
from agrodecide.v4.modeling import series
from .data import VERSION,audit,MarketCalendar
from .features import build,load_alerts
from .models import CLASSICAL,MULTIVARIATE,classical,multivariate

HORIZONS=[7,15,30,90,180,240]
FOLDER=DATA/'forecasting'
IMPLEMENTATION=sha256(b''.join((Path(__file__).parent/name).read_bytes() for name in ['models.py','features.py','engine.py','data.py'])).hexdigest()

def score(actual,predicted,scale=None):
    a,p=np.asarray(actual,float),np.asarray(predicted,float);valid=np.isfinite(a)&np.isfinite(p)
    if not valid.any():raise ValueError('No hay objetivos observados comunes')
    a,p=a[valid],p[valid];err=p-a
    out={'mae':float(np.mean(abs(err))),'rmse':float(np.sqrt(np.mean(err**2))),
         'wape':float(np.sum(abs(err))/np.sum(abs(a))*100) if np.sum(abs(a))>0 else None,
         'bias':float(err.mean()),'smape':float(np.mean(200*abs(err)/np.maximum(abs(a)+abs(p),.001))),'n':len(a)}
    out['mase']=float(np.mean(abs(err)/np.asarray(scale)[valid])) if scale is not None and np.all(np.asarray(scale)[valid]>0) else None
    return out

def origins(y,h,folds=6):
    end=y.index[-1]-pd.Timedelta(days=h)
    candidates=[d for d in pd.date_range(y.index[0]+pd.Timedelta(days=730),end,freq='ME') if d in y.index and np.isfinite(y.loc[d]) and y.loc[d+pd.Timedelta(days=1):d+pd.Timedelta(days=h)].notna().sum()>=h*.8]
    if len(candidates)<folds:raise ValueError('Pocos orígenes completos')
    test=candidates[-folds:]
    available=[d for d in candidates if d+pd.Timedelta(days=h)<=test[0]]
    cal=available[-folds:]
    if len(cal)<folds:raise ValueError('Faltan orígenes de calibración')
    available=[d for d in candidates if d+pd.Timedelta(days=h)<=cal[0]]
    ranking=available[-(folds-folds//2):]
    weight_candidates=[d for d in available if d+pd.Timedelta(days=h)<=ranking[0]]
    weighting=weight_candidates[-(folds//2):]
    selection=weighting+ranking
    if len(selection)<folds:raise ValueError('Faltan orígenes de selección/ponderación purgados')
    return {'selection':selection,'calibration':cal,'audit':test}

def specs(h,available_features=None):
    result=[{'name':n,'configuration':'PRICE_ONLY','strategy':'classical','family':'Clásico','deployable':True} for n in CLASSICAL]
    supported=lambda prefix:available_features is not None and any(c.startswith(prefix) and available_features[c].notna().mean()>=.6 for c in available_features)
    verified_volume=supported('oferta_verificada_')
    configurations=['A','A+ENFEN','B']
    if supported('macro_'):configurations.append('C')
    if supported('macro_') and supported('clima_'):configurations.extend(['D','E'])
    for config in configurations:
        for name in MULTIVARIATE:
            if name=='SARIMAX' and config=='A':continue
            strategies=['direct','recursive'] if h<=30 and name!='SARIMAX' else ['direct']
            for strategy in strategies:
                result.append({'name':name,'configuration':config,'strategy':strategy,'family':'Multivariable',
                               'deployable':config in {'A','A+ENFEN'} or verified_volume,'availability':'volumen SISAP sin fecha original de publicación' if config in {'B','C','D','E'} and not verified_volume else 'quote-date precio / covariables publicadas y fechadas'})
    for item in result:item['id']=item['name']+' | '+item['configuration']+' | '+item['strategy']
    return result

def prediction(spec,y,features,h,explain=False,scenario=None):
    # Classical interface cannot receive external data at all.
    train_hash=sha256(y.to_csv().encode()).hexdigest()
    horizon=240 if spec['family']=='Clásico' else h
    payload={'implementation':IMPLEMENTATION,'version':VERSION,'spec':spec,'price_hash':train_hash,'horizon':horizon}
    if spec['family']!='Clásico':payload['feature_hash']=sha256(features.to_csv().encode()).hexdigest()
    key=sha256(json.dumps(payload,sort_keys=True).encode()).hexdigest();cache=FOLDER/'model_cache'/f'{key}.json'
    if cache.exists() and not explain and scenario is None:
        result=json.loads(cache.read_text(encoding='utf-8'))
    else:
        start=time.perf_counter()
        try:
            if spec['family']=='Clásico':p,meta=classical(spec['name'],y,horizon)
            else:p,meta=multivariate(spec['name'],y,features,horizon,spec['configuration'],spec['strategy'],explain,scenario)
            p=np.asarray(p,float)
            if len(p)!=horizon or not np.isfinite(p).all():raise ValueError('Salida incompleta/no finita')
            result={'predictions':p.tolist(),'metadata':meta,'fit_seconds':time.perf_counter()-start,'state':'OK'}
        except Exception as exc:
            result={'state':'NO DISPONIBLE','reason':str(exc),'fit_seconds':time.perf_counter()-start}
        if not explain and scenario is None:atomic_json(cache,result)
    if result['state']!='OK':raise ValueError(result['reason'])
    p=np.asarray(result['predictions'][:h])
    # Refuse impossible outputs instead of silently clipping a diverging model.
    if (p<=0).any() or (p>100).any():raise ValueError('Precio no positivo o fuera del contrato PEN/kg [0,100]')
    return p,result['metadata'],result['fit_seconds']

def records_for(y,origin,h,p):
    cut=y.index.get_loc(origin);target=y.iloc[cut+1:cut+h+1]
    diffs=y.iloc[:cut+1].diff().abs();scale=float(diffs.dropna().mean())
    rows=[]
    for lead,(date,actual) in enumerate(target.items(),1):
        if np.isfinite(actual):rows.append({'date':str(date.date()),'origin':str(origin.date()),'lead':lead,'actual':float(actual),'predicted':float(p[lead-1]),'baseline':float(y.loc[origin]),'scale':scale})
    return rows

def metric_rows(rows):return score([r['actual'] for r in rows],[r['predicted'] for r in rows],[r['scale'] for r in rows])

def quantile(errors,level):
    a=np.asarray(errors,float);a=a[np.isfinite(a)]
    if len(a)<20:raise ValueError('Menos de 20 errores de calibración')
    q=min(1,math.ceil((len(a)+1)*level)/len(a))
    return float(np.quantile(a,q,method='higher'))

def combine_rows(parts,weights):
    if not parts:raise ValueError('Ensemble sin componentes')
    keys=[(r['origin'],r['date']) for r in parts[0]]
    if any([(r['origin'],r['date']) for r in rows]!=keys for rows in parts):raise ValueError('Modelos evaluados en fechas distintas')
    return [{**r,'predicted':float(sum(w*part[i]['predicted'] for w,part in zip(weights,parts)))} for i,r in enumerate(parts[0])]

def evaluate(y,features,h,folds=6):
    plan=origins(y,h,folds);candidates=specs(h,features.loc[:plan['selection'][0]]);allrows={};failures=[];metadata={};runtime={}
    for spec in candidates:
        identifier=spec['id'];blocks={};total=0.;latest=None
        for phase,dates in plan.items():
            blocks[phase]=[]
            for origin in dates:
                try:
                    train=y.loc[:origin];f=features.loc[:origin]
                    p,meta,seconds=prediction(spec,train,f,h)
                    blocks[phase].extend(records_for(y,origin,h,p));total+=seconds;latest=meta
                except Exception as exc:
                    failures.append({'model':identifier,'phase':phase,'origin':str(origin.date()),'reason':str(exc)})
                    blocks=None;break
            if blocks is None:break
        if blocks:
            allrows[identifier]=blocks;metadata[identifier]=latest;runtime[identifier]=total
        print(f'{h}d {identifier}: '+('OK' if blocks else 'no disponible'),flush=True)
    naive=next(s['id'] for s in candidates if s['name']=='Naive')
    if naive not in allrows:raise RuntimeError('No se pudo auditar el benchmark')
    # First half of selection estimates weights, second half ranks ALL candidates.
    weight_origins={str(d.date()) for d in plan['selection'][:folds//2]}
    ranking_origins={str(d.date()) for d in plan['selection'][folds//2:]}
    by_id={s['id']:s for s in candidates}
    eligible=[k for k in allrows if by_id[k]['deployable']]
    weight_scores={k:metric_rows([r for r in allrows[k]['selection'] if r['origin'] in weight_origins])['mae'] for k in eligible}
    best=sorted(eligible,key=lambda k:weight_scores[k])[:3]
    for label,components,weights in [('Ensemble promedio',eligible,np.repeat(1/len(eligible),len(eligible))),('Ensemble top 3',best,np.repeat(1/len(best),len(best))),('Ensemble ponderado',best,np.array([1/max(.001,weight_scores[k]) for k in best]))]:
        weights=np.asarray(weights,float);weights/=weights.sum()
        key=label+' | VALIDATION | ensemble'
        allrows[key]={phase:combine_rows([allrows[k][phase] for k in components],weights) for phase in plan}
        spec={'id':key,'name':label,'configuration':'VALIDATION','strategy':'ensemble','family':'Ensemble','deployable':True,'components':components,'weights':weights.tolist()}
        candidates.append(spec);by_id[key]=spec;runtime[key]=sum(runtime[k] for k in components);metadata[key]={'features':sorted(set(f for k in components for f in metadata[k].get('features',[]))),'weights_fit_origins':sorted(weight_origins)}
    leaderboard=[]
    for key,blocks in allrows.items():
        ranked=[r for r in blocks['selection'] if r['origin'] in ranking_origins]
        scores=metric_rows(ranked);foldmae=[metric_rows([r for r in ranked if r['origin']==o])['mae'] for o in sorted(ranking_origins)]
        leaderboard.append({**by_id[key],**scores,'fold_mae_std':float(np.std(foldmae)),'fit_seconds':runtime[key],
                            'selection_score':scores['mae']+.1*float(np.std(foldmae)),
                            'metadata':metadata[key]})
    leaderboard.sort(key=lambda r:(r['selection_score'],r['rmse'],r['fit_seconds']))
    selected=next(r for r in leaderboard if r['deployable'])
    summaries=[]
    for row in leaderboard:
        blocks=allrows[row['id']];errors=[abs(r['actual']-r['predicted']) for r in blocks['calibration']]
        width80,width95=quantile(errors,.8),quantile(errors,.95)
        rows=blocks['audit'];m=metric_rows(rows)
        m['coverage80']=float(np.mean([abs(r['actual']-r['predicted'])<=width80 for r in rows]));m['coverage95']=float(np.mean([abs(r['actual']-r['predicted'])<=width95 for r in rows]))
        summaries.append({**row,'audit':m,'width80':width80,'width95':width95})
    selected=next(r for r in summaries if r['id']==selected['id']);benchmark=next(r for r in summaries if r['id']==naive)
    skill=1-selected['audit']['mae']/benchmark['audit']['mae'] if benchmark['audit']['mae']>1e-9 else 0.
    # Predeclared go/no-go gate, not a search for a different model on test.
    accepted=skill>0
    intervals_adequate=selected['audit']['coverage80']>=.75 and selected['audit']['coverage95']>=.90
    deployed=selected if accepted else benchmark
    reason=('El candidato reduce el MAE respecto de Naive en auditoría. '+('Los intervalos alcanzan los umbrales de cobertura observada.' if intervals_adequate else 'La cobertura de sus intervalos es insuficiente: interpretar los límites como rangos de error histórico, no como cobertura futura garantizada.')) if accepted else 'El candidato no reduce el MAE de Naive en auditoría; se publica la referencia y se conserva la comparación completa.'
    rows=[]
    for r in allrows[deployed['id']]['audit']:
        rows.append({**r,'residual':r['actual']-r['predicted'],'covered':abs(r['actual']-r['predicted'])<=deployed['width80'],'low80':max(.01,r['predicted']-deployed['width80']),'high80':r['predicted']+deployed['width80'],'low95':max(.01,r['predicted']-deployed['width95']),'high95':r['predicted']+deployed['width95']})
    return {'horizon':h,'plan':{k:[str(d.date()) for d in v] for k,v in plan.items()},
            'candidates':summaries,'selected':selected['id'],'deployed':deployed['id'],'accepted':bool(accepted),'intervals_adequate':bool(intervals_adequate if accepted else benchmark['audit']['coverage80']>=.75 and benchmark['audit']['coverage95']>=.90),'selection_skill_audit':skill,
            'reason':reason,'audit':deployed['audit'],'baseline_audit':benchmark['audit'],
            'width80':deployed['width80'],'width95':deployed['width95'],'audit_rows':rows,'failures':failures,
            'interval_method':'Cuantiles empíricos de errores absolutos de seis orígenes de calibración. Orígenes internos pueden solaparse en h>30; no se garantiza cobertura conformal bajo dependencia.',
            'stacking':'No ejecutado: la ventana reservada para ponderaciones tiene tres orígenes; insuficiente para un metamodelo robusto.'}

def live_prediction(report,y,features,h):
    lookup={r['id']:r for r in report['candidates']};chosen=lookup[report['deployed']]
    try:
        if chosen['family']=='Ensemble':
            components=[lookup[k] for k in chosen['components']]
            values=[prediction(s,y,features,h)[0] for s in components]
            p=np.average(values,axis=0,weights=chosen['weights']);meta=chosen['metadata']
        else:p,meta,_=prediction(chosen,y,features,h,explain=chosen['family']=='Multivariable')
        issue=None
    except Exception as exc:
        # Never attach the old model's intervals/metrics to a fallback.
        chosen=next(r for r in report['candidates'] if r['name']=='Naive');p,meta,_=prediction(chosen,y,features,h)
        issue=str(exc);report.update(deployed=chosen['id'],audit=chosen['audit'],width80=chosen['width80'],width95=chosen['width95'],accepted=False,reason='Fallo de inferencia del candidato; referencia Naive con sus propias métricas: '+str(exc))
    meta['features']=meta.get('features',[])
    state='evaluado' if report['accepted'] and report.get('intervals_adequate') else 'referencia'
    future=[{'date':str(d.date()),'lead':i+1,'price':round(float(v),6),'low':round(max(.01,float(v)-report['width80']),6),'high':round(float(v)+report['width80'],6),'low95':round(max(.01,float(v)-report['width95']),6),'high95':round(float(v)+report['width95'],6),'model':chosen['id'],'evaluated_horizon':h,'status':state} for i,(d,v) in enumerate(zip(MarketCalendar().dates(y.index[-1],h),p))]
    return future,meta

def analyze(features,y):
    target=y.shift(-7)/y-1;rows=[]
    for column in features:
        pair=pd.concat([features[column],target],axis=1).iloc[:-7].dropna()
        if len(pair)<60 or pair.iloc[:,0].nunique()<2 or pair.iloc[:,1].nunique()<2:continue
        midpoint=len(pair)//2
        rows.append({'variable':column,'n':len(pair),'pearson':float(pair.iloc[:,0].corr(pair.iloc[:,1])),'spearman':float(pair.iloc[:,0].corr(pair.iloc[:,1],method='spearman')),
                     'pearson_first_half':float(pair.iloc[:midpoint,0].corr(pair.iloc[:midpoint,1])),'pearson_second_half':float(pair.iloc[midpoint:,0].corr(pair.iloc[midpoint:,1]))})
    rows=[r for r in rows if all(np.isfinite(v) for k,v in r.items() if k!='variable')]
    numeric=features.dropna(axis=1,thresh=int(len(features)*.8));numeric=numeric.loc[:,numeric.std()>.001]
    corr=numeric.corr().abs();pairs=[]
    for i,a in enumerate(corr):
        for b in list(corr)[i+1:]:
            if corr.loc[a,b]>.95:pairs.append({'a':a,'b':b,'correlation':float(corr.loc[a,b])})
    return {'lag_correlations':rows,'multicollinearity':pairs,'note':'Análisis exploratorio de cambios a 7 días sobre histórico vigente, no causalidad ni criterio de selección. La selección ocurre dentro de cada corte.'}

def run(variety='Única',horizons=HORIZONS,folds=6):
    prices=read('prices');quality=audit(prices)
    frame=prices[(prices.variedad==variety)&(prices.mercado_id=='15011501')].sort_values('fecha')
    y=series(frame);alerts=load_alerts();features=build(frame,y,alerts)
    print('Features',features.shape,'alertas',len(alerts),flush=True)
    reports=[];curves={};metadata={}
    for h in horizons:
        report=evaluate(y,features,h,folds)
        curve,meta=live_prediction(report,y,features,h)
        reports.append(report);curves[str(h)]=curve;metadata[str(h)]=meta
        atomic_json(FOLDER/'partial'/f'{variety}_{h}.json',{'report':report,'forecast':curve,'metadata':meta})
        print(f"FINAL {h}d {report['deployed']} MAE={report['audit']['mae']:.4f} aceptación={report['accepted']}",flush=True)
    versions={}
    for package in ['numpy','pandas','statsmodels','scipy','scikit-learn','xgboost','lightgbm','catboost']:
        try:versions[package]=importlib.metadata.version(package)
        except importlib.metadata.PackageNotFoundError:versions[package]='no instalado'
    result={'engine_version':VERSION,'implementation_hash':IMPLEMENTATION,'generated_at':now().isoformat(),'variety':variety,'market_id':'15011501','market':'Gran Mercado Mayorista de Lima','last_date':str(y.index[-1].date()),'last_price':float(y.iloc[-1]),'data_hash':sha256(y.to_csv().encode()).hexdigest(),'quality_hash':quality['data_hash'],
            'evaluations':reports,'forecasts_by_horizon':curves,'model_metadata':metadata,'analysis':analyze(features,y),
            'calendar':{'mode':'calendar','weekdays':[0,1,2,3,4,5,6],'closed':[],'note':'SISAP registra cotizaciones los siete días; ausencias no se convierten en ceros.'},
            'availability':{'A':{'state':'disponible','variables':'precio y calendario, histórico SISAP vigente'},'B':{'state':'investigación','variables':'precio, calendario y volumen; sin vintage original de publicación del volumen'},'C':{'state':'pendiente','reason':'BCRP actual no informa la fecha original por observación; no se retrofechan sus revisiones'},'D':{'state':'pendiente','reason':'Faltan series meteorológicas regionales publicadas con fechas y calidad verificables'},'E':{'state':'pendiente','reason':'La cadena B+C+D+El Niño espera disponibilidad de C y D'},'A+ENFEN':{'state':'disponible' if alerts else 'pendiente','variables':'precio/calendario + alertas costeras de comunicados fechados; versiones metodológicas separadas'},'ICEN':{'state':'histórico revisado','reason':'Histórico revisado descargado; sin vintage original, excluido de entrenamiento operacional'}},
            'sources':{'sisap':'http://sistemas.midagri.gob.pe/sisap/portal2/mayorista/resumenes/consultar/','enfen':'https://enfen.imarpe.gob.pe/','icen':'http://met.igp.gob.pe/datos/ICEN.txt','macro':'https://estadisticas.bcrp.gob.pe/estadisticas/series/ayuda/api'},
            'price_vintage_caveat':quality['price_vintage_caveat'],'library_versions':versions,'folds_per_phase':folds}
    atomic_json(FOLDER/'reports'/f'{variety}.json',result)
    return result

def main():
    parser=argparse.ArgumentParser();parser.add_argument('--variety',default='Única');parser.add_argument('--horizons',type=int,nargs='+',default=HORIZONS);args=parser.parse_args()
    run(args.variety,args.horizons)

if __name__=='__main__':main()
