"""Build a conservative, UI-ready climate evidence snapshot.

Run `python -m agrodecide.climate_v5.build --as-of YYYY-MM-DD` after source
review. --refresh fetches official catalogs/PDFs and fails closed on a changed
reviewed regional bulletin. There are no warehouse writes or price multipliers.
"""
from __future__ import annotations

from datetime import date, datetime, timezone
from hashlib import sha256
from pathlib import Path
from zoneinfo import ZoneInfo
from io import BytesIO
from urllib.parse import urljoin
import argparse
import json
import re
import unicodedata
from lxml import html
from pypdf import PdfReader

from .contracts import evidence_status, validate_catalog
from .inspect_sources import retrieve

ROOT = Path(__file__).resolve().parents[2]
CACHE = ROOT / 'docs/clima/originales'
PUBLIC = ROOT / 'public/climate-v5'
V2 = ROOT / 'data/v4/forecasting/sources'
MONTHS = dict(zip('january february march april may june july august september october november december'.split(), range(1,13)))
REVIEWED_RISK_HASH = 'c42f7f6daf237a4ed290b51bc9284b9f07e457fe067cd5c5bbba093177556d1d'
REVIEWED_AGROMET_HASH = 'a8e37bb2a6a37a0399dc41423f437e1c7b893783367093f2947867371846d625'


def normalized(text: str) -> str:
    return ''.join(c for c in unicodedata.normalize('NFD', text.lower()) if unicodedata.category(c) != 'Mn')


def compact(text: str) -> str:
    return ' '.join(text.split())


def read_snapshot(name: str, extension: str):
    content = (CACHE / f'{name}.{extension}').read_bytes()
    meta = json.loads((CACHE / f'{name}.metadata.json').read_text(encoding='utf-8'))
    if sha256(content).hexdigest() != meta['sha256']:
        raise ValueError(f'Original alterado: {name}')
    return content, meta


def source(meta: dict, institution: str, title: str, url: str | None = None) -> dict:
    return {'institution': institution, 'title': title, 'url': url or meta['url'],
            'download_url': meta['url'] if meta['url'].lower().endswith('.pdf') else None,
            'sha256': meta['sha256'], 'retrieved_at': meta['retrieved_at']}


def pdf_text(content: bytes) -> str:
    return '\n'.join(p.extract_text() or '' for p in PdfReader(BytesIO(content)).pages)


def first_recovered_day(meta: dict) -> str:
    return datetime.fromisoformat(meta.get('first_retrieved_at',meta['retrieved_at'])).astimezone(ZoneInfo('America/Lima')).date().isoformat()


def parse_noaa(content: bytes) -> dict:
    """Only parse the explicitly dated discussion, not a climatology or figure."""
    text = compact(html.fromstring(content).text_content())
    clean = normalized(text)
    issue = re.search(r'\b(\d{1,2}) ('+'|'.join(MONTHS)+r') (20\d{2})\b', clean)
    if not issue:
        raise ValueError('NOAA sin fecha de emisión reconocible')
    day, month, year = issue.groups()
    issue_date = date(int(year), MONTHS[month], int(day)).isoformat()
    if issue_date!='2026-10-08':
        raise ValueError('Nueva discusión NOAA: revisar proyecciones y próxima emisión antes de publicar')
    values = {}
    for region in ('1+2', '3.4'):
        pattern = r'([+-]\d+(?:\.\d+)?)\s*°?\s*c\s+in\s+nino[- ]'+re.escape(region)
        match = re.search(pattern, clean)
        if not match:
            raise ValueError('NOAA cambió la descripción de anomalías: requiere revisión')
        values[region] = float(match.group(1))
    return {'issue_date': issue_date, 'values': values, 'text': text}


def reviewed_risk(content: bytes) -> dict:
    """Interpret only a source version whose geographic wording was reviewed."""
    if sha256(content).hexdigest()!=REVIEWED_RISK_HASH:
        raise ValueError('La versión de riesgo cambió: requiere revisión')
    text = normalized(compact(pdf_text(content)))
    required = ['octubre, noviembre y diciembre de 2026', 'sierra central',
                'durante octubre predominarian niveles de riesgo bajo y medio',
                'para diciembre continuarian niveles de riesgo principalmente entre bajo y medio']
    if any(s not in text for s in required):
        raise ValueError('Nuevo boletín regional: revisar alcance y vigencia antes de interpretar')
    return {'valid_from':'2026-10-01','valid_to':'2026-12-31','issue_date':None,
            'issue_date_precision':'month','issue_month':'2026-10',
            'risk_levels':['bajo','medio','alto localizado'],
            'summary':'Para la sierra central, SENAMHI prevé riesgo mayormente bajo a medio, con focos altos. La humedad disponible y la etapa del cultivo condicionan el riesgo; en zonas altas también considera granizo y descensos térmicos.'}


def parse_agromet(content: bytes) -> dict:
    """The PDF period wins over a contradictory catalog label."""
    if sha256(content).hexdigest()!=REVIEWED_AGROMET_HASH:
        raise ValueError('La versión agrometeorológica cambió: requiere revisión')
    text = compact(pdf_text(content)); clean = normalized(text)
    match = re.search(r'pronostico agrometeorologico del (\d{1,2}) al (\d{1,2}) de octubre (20\d{2})', clean)
    if not match:
        raise ValueError('Vigencia agrometeorológica requiere revisión')
    start, end, year = map(int, match.groups())
    observed = re.search(r'co-tarma\s+junin\s+(-?\d+\.\d+)\s+(-?\d+\.\d+)\s+(\d+)\s+terreno en descanso', clean)
    if not observed or 'al 30 de septiembre de 2026' not in clean:
        raise ValueError('No se verificó la fila de Tarma y su fecha de observación')
    return {'valid_from':date(year,10,start).isoformat(), 'valid_to':date(year,10,end).isoformat(),
            'observed_at':'2026-09-30','station':{'name':'CO-Tarma','latitude':float(observed[1]),
            'longitude':float(observed[2]),'altitude_m':int(observed[3]),'phenology':'Terreno en descanso'},
            'catalog_label':'Década del 21/10/2026 al 30/10/2026',
            'catalog_pdf_mismatch':(start,end)!=(21,30)}


def load_v2_source(name: str) -> dict:
    cached=V2/(name+'.json')
    if cached.exists():return json.loads(cached.read_text(encoding='utf-8'))
    manifest=json.loads((ROOT/'public/forecasting/index.json').read_text(encoding='utf-8'))
    sources=json.loads((ROOT/'public/forecasting'/manifest['sources_file']).read_text(encoding='utf-8'))
    return sources[name]


def assemble(as_of: str) -> dict:
    evidence=[]; indicators=[]; checks=[];comparisons=[]
    generated_at=datetime.now(timezone.utc).isoformat()

    def add(row):
        row.setdefault('model_eligible',False)
        row['status']=evidence_status(row,as_of)
        evidence.append(row)

    # Existing ENFEN immutable source versions remain separate from today's
    # newly recovered NOAA/SENAMHI material. No file timestamp becomes an issue day.
    enfen=load_v2_source('enfen')
    bulletin=max(enfen['rows'],key=lambda x:x['fecha_publicacion'])
    original_path=ROOT/'data/v4'/bulletin['archivo_origen']
    original=original_path.read_bytes() if original_path.exists() else read_snapshot('enfen_latest','pdf')[0]
    if sha256(original).hexdigest()!=bulletin['sha256']:
        raise ValueError('Original ENFEN no íntegro')
    enfen_text=normalized(compact(pdf_text(original)))
    if bulletin['fecha_publicacion']!='2026-09-28' or 'hasta enero 2027' not in enfen_text or 'magnitud extraordinaria' not in enfen_text:
        raise ValueError('Nuevo comunicado ENFEN: actualizar revisión de perspectivas')
    enfen_src={'institution':'ENFEN','title':'Comunicado Oficial 17-2026','url':bulletin['source_url'],
               'download_url':bulletin['download_url'],'sha256':bulletin['sha256'],'retrieved_at':bulletin['fecha_actualizacion']}
    add({'id':'enfen-2026-17-coastal','kind':'institutional_forecast','title':'Perspectiva de El Niño costero',
         'summary':'ENFEN mantiene la alerta costera y proyecta calentamiento de magnitud extraordinaria hasta enero de 2027. Es una perspectiva oceánica; no determina el precio de la papa ni la lluvia de una parcela.',
         'issue_date':'2026-09-28','available_at':bulletin['fecha_disponibilidad'],
         'availability_basis':bulletin['availability_basis'],'valid_from':'2026-09-28','valid_to':'2027-01-31','next_update':'2026-10-15',
         'geography':{'region':None,'province':None,'market':None,'ocean_region':'Niño 1+2'},
         'spatial_scope':'Pacífico costero, Niño 1+2','risk_scope':'ocean_region','source':enfen_src,
         'classification':'Alerta de El Niño Costero','probability':None})
    add({'id':'enfen-2026-17-regional','kind':'institutional_forecast','title':'Lluvias regionalmente distintas',
         'summary':'La perspectiva ENFEN diferencia lluvias por encima de lo habitual en parte de la costa y condiciones de normales a deficitarias en la sierra sur y Amazonía. Ese resumen no constituye una alerta específica para Tarma.',
         'issue_date':'2026-09-28','available_at':bulletin['fecha_disponibilidad'],
         'valid_from':'2026-10-01','valid_to':'2026-12-31','next_update':'2026-10-15',
         'geography':{'region':None,'province':None,'market':None,'ocean_region':None},
         'spatial_scope':'Costa norte/central, sierra sur y Amazonía; no parcela de Tarma','risk_scope':'macroregion','source':enfen_src})

    noaa_raw,noaa_meta=read_snapshot('noaa_diagnostic','html');noaa=parse_noaa(noaa_raw)
    noaa_src=source(noaa_meta,'NOAA CPC','ENSO Diagnostic Discussion · '+noaa['issue_date'])
    for region,value in noaa['values'].items():
        key='noaa-current-nino'+region.replace('+','').replace('.','')
        add({'id':key,'kind':'observation','title':'Anomalía de TSM · Niño '+region,
             'summary':'Anomalía reportada para la referencia reciente del diagnóstico NOAA; no es temperatura absoluta, ICEN ni RONI. El texto no precisa la fecha inicial y final de esa semana.',
             'issue_date':noaa['issue_date'],'available_at':max(noaa['issue_date'],first_recovered_day(noaa_meta)),
             'valid_from':None,'valid_to':None,'next_update':'2026-11-12',
             'observation_period':None,'observation_period_note':'Referencia observada más reciente citada por la discusión; ventana exacta no precisada en el texto.',
             'geography':{'region':None,'province':None,'market':None,'ocean_region':'Niño '+region},
             'spatial_scope':'Región oceánica Niño '+region,'risk_scope':'ocean_region','source':noaa_src})
        indicators.append({'id':'nino'+region,'label':'Niño '+region,'quantity':'sst_anomaly',
                           'value':value,'unit':'°C de anomalía','evidence_id':key,'observation_period':None,
                           'reported_on':noaa['issue_date'],'methodology':'Diagnóstico NOAA CPC; indicador reciente citado, distinto de índices trimestrales ICEN/ONI/RONI',
                           'model_eligible':False,'publication_vintage':'snapshot recovered '+first_recovered_day(noaa_meta)})
    # This curated projection is refused if the next monthly discussion changes.
    if noaa['issue_date']=='2026-10-08' and 'strong-to-very strong el nino likely through january-march 2027' in normalized(noaa['text']):
        add({'id':'noaa-2026-10-forecast','kind':'institutional_forecast','title':'Perspectiva de ENSO del Pacífico central',
             'summary':'NOAA anticipa que el evento podría mantenerse fuerte a muy fuerte hacia enero–marzo de 2027. Su probabilidad oceánica no es una probabilidad de pérdida agrícola ni de aumento del precio.',
             'issue_date':noaa['issue_date'],'available_at':first_recovered_day(noaa_meta),
             'valid_from':noaa['issue_date'],'valid_to':'2027-03-31','next_update':'2026-11-12',
             'geography':{'region':None,'province':None,'market':None,'ocean_region':'Niño 3.4'},
             'spatial_scope':'Pacífico ecuatorial central','risk_scope':'ocean_region','source':noaa_src})

    risk_raw,risk_meta=read_snapshot('senamhi_papa_riesgo_2026_10','pdf');risk=reviewed_risk(risk_raw)
    risk_src=source(risk_meta,'SENAMHI','Riesgo agroclimático de papa · octubre–diciembre 2026')
    risk_catalog=html.fromstring(read_snapshot('senamhi_riesgo_catalog','html')[0].decode('utf-8'))
    risk_links=[urljoin(risk_meta['url'],a.get('href')) for a in risk_catalog.xpath('//a[@href]')
                if 'riesgo agroclimatico para el cultivo de papa' in normalized(a.get('title',''))]
    if not risk_links or risk_links[0]!=risk_meta['url']:
        raise ValueError('Hay un boletín de riesgo de papa distinto al revisado: actualizar interpretación')
    add({'id':'senamhi-papa-central-ond2026','kind':'institutional_forecast','title':'Papa · sierra central · octubre–diciembre',
         **risk,'available_at':first_recovered_day(risk_meta),'next_update':None,'next_update_month':'2026-11',
         'availability_basis':'Día exacto de emisión no impreso/verificado: disponible desde la recuperación de esta versión, sin retrofechar a octubre 1.',
         'geography':{'region':'Junín','province':None,'market':None,'ocean_region':None},
         'spatial_scope':'Sierra central; contexto regional para Junín, sin clasificación puntual de Tarma',
         'risk_scope':'macroregion','source':risk_src,'parcel_risk':None})

    agro_raw,agro_meta=read_snapshot('senamhi_papa_agromet_latest','pdf');agro=parse_agromet(agro_raw)
    agro_src=source(agro_meta,'SENAMHI','Agrometeorología de papa · PDF válido 03–12 octubre 2026')
    agro_catalog=html.fromstring(read_snapshot('senamhi_boletines_catalog','html')[0].decode('utf-8'))
    agro_links=[urljoin(agro_meta['url'],a.get('href')) for a in agro_catalog.xpath('//a[@href]')
                if normalized(a.get('title',''))=='pronostico agrometeorologico para el cultivo de papa']
    if not agro_links or agro_links[0]!=agro_meta['url']:
        raise ValueError('Hay un boletín agrometeorológico distinto al revisado: actualizar interpretación')
    add({'id':'senamhi-agromet-oct2026','kind':'institutional_forecast','title':'Pronóstico decadal de papa · vencido',
         'summary':'El PDF previó lluvia para la sierra central del 3 al 12 de octubre. Su periodo ya terminó; el título del catálogo apunta a otras fechas y no se utiliza para extender la vigencia del documento.',
         'issue_date':None,'available_at':first_recovered_day(agro_meta),'valid_from':agro['valid_from'],'valid_to':agro['valid_to'],
         'next_update':'2026-10-14','catalog_pdf_mismatch':agro['catalog_pdf_mismatch'],'catalog_label':agro['catalog_label'],
         'geography':{'region':'Junín','province':None,'market':None,'ocean_region':None},'spatial_scope':'Sierra central','risk_scope':'macroregion','source':agro_src})
    add({'id':'senamhi-tarma-phenology-sep2026','kind':'observation','title':'Monitoreo de la estación CO-Tarma',
         'summary':'La fila CO-Tarma del anexo fenológico registra terreno en descanso al 30 de septiembre. Describe esa observación de estación; no todas las parcelas de la provincia.',
         'issue_date':None,'available_at':first_recovered_day(agro_meta),'valid_from':agro['observed_at'],'valid_to':agro['observed_at'],
         'next_update':None,'observation_period':agro['observed_at'],'station':agro['station'],
         'geography':{'region':'Junín','province':'Tarma','market':None,'ocean_region':None},
         'spatial_scope':'Estación CO-Tarma; representatividad de parcela no evaluada','risk_scope':'station','source':agro_src})

    for filename,code in [('icen','ICEN'),('central','RONI_ERSSTv6'),('central','ONI_ERSSTv5')]:
        payload=load_v2_source(filename)
        rows=[r for r in payload['rows'] if r['indice']==code]
        last=max(rows,key=lambda r:r['periodo_observacion']);key='revised-'+code.lower()
        original_meta=payload.get('metadata') or next(c['metadata'] for c in payload.get('catalog',[]) if c['code']==code)
        meta={'url':last['source_url'],'sha256':last['sha256'],'retrieved_at':original_meta['retrieved_at']}
        add({'id':key,'kind':'observation','title':code+' · histórico revisado',
             'summary':'Índice trimestral recuperado de la serie revisada actual. Se conserva separado por metodología; carece de publicación original por valor para backtest operacional.',
             'issue_date':None,'available_at':last['fecha_disponibilidad'],'valid_from':None,'valid_to':None,'next_update':None,
             'observation_period':last['periodo_observacion'],'geography':{'region':None,'province':None,'market':None,'ocean_region':last['region_oceanica']},
             'spatial_scope':last['region_oceanica'],'risk_scope':'ocean_region','source':source(meta,'IGP / IMARPE' if code=='ICEN' else 'NOAA CPC',code),
             'publication_vintage':'revised_history_not_backtest_eligible'})
        indicators.append({'id':code,'label':code,'quantity':'seasonal_index','value':last['valor'],
                           'unit':'°C de índice trimestral','evidence_id':key,'observation_period':last['periodo_observacion'],
                           'reported_on':None,'methodology':last['metodologia'],'model_eligible':False,
                           'publication_vintage':'histórico revisado; publicación original no recuperada'})
        if code in {'ICEN','RONI_ERSSTv6'}:
            comparisons.append(event_comparison(rows,code,as_of))

    for name in ['senamhi_riesgo_catalog','senamhi_boletines_catalog','enfen_catalog','noaa_diagnostic']:
        raw,meta=read_snapshot(name,'html')
        checks.append({'id':name,**meta,'status':'verified_snapshot','first_recovered_at':meta.get('first_retrieved_at',meta['retrieved_at']),
                       'note':'La consulta directa puede ser más reciente que el índice de búsqueda.'})
    catalog_enfen=read_snapshot('enfen_catalog','html')[0].decode('utf-8')
    if 'comunicado-oficial-enfen-n-18-2026' in catalog_enfen:
        raise ValueError('Hay un ENFEN posterior al revisado; revisar antes de publicar el estado')
    checks.append({'id':'enfen_next_update','status':'update_due','expected_on':'2026-10-15',
                   'checked_at':checks[2]['retrieved_at'],'latest_verified_issue':'2026-09-28',
                   'note':'El catálogo consultado todavía muestra 17-2026. No se afirma que un comunicado posterior no exista en otra ruta.'})

    scenarios=regional_scenarios()
    catalog={'schema_version':'1.0.0','generated_at':generated_at,'as_of':as_of,
             'context':{'region':'Junín','province':'Tarma','market':'GMML Lima','market_price_scope':'Mayorista, PEN/kg; no es precio en chacra',
                        'climate_forecast_is_price_forecast':False},
             'evidence':evidence,'indicators':indicators,'regional_scenarios':scenarios,'source_checks':checks,
             'event_comparisons':comparisons,
             'map_layers':[
                 {'id':'rainfall_outlook','label':'Lluvia prevista','spatial_resolution':'macroregional','evidence_ids':['enfen-2026-17-regional'],'tarma_value':None,'tarma_status':'Sin clasificación puntual validada'},
                 {'id':'potato_risk','label':'Riesgo agroclimático de papa','spatial_resolution':'Sierra central','evidence_ids':['senamhi-papa-central-ond2026'],'tarma_value':None,'tarma_status':'Contexto regional; no alerta de parcela'},
                 {'id':'phenology','label':'Condición observada','spatial_resolution':'Estación','evidence_ids':['senamhi-tarma-phenology-sep2026'],'tarma_value':'Terreno en descanso · 30/09/2026','tarma_status':'Observación histórica de estación'},
                 {'id':'origin_supply','label':'Producción / procedencia','spatial_resolution':None,'evidence_ids':[],'tarma_value':None,'tarma_status':'Sin participación de procedencia validada en este snapshot'},
                 {'id':'reliability','label':'Fiabilidad del dato','spatial_resolution':'Documento / estación','evidence_ids':['senamhi-agromet-oct2026'],'tarma_value':None,'tarma_status':'PDF decadal vencido y catálogo discordante; fecha de emisión exacta no recuperada'}],
             'missing_indicators':[
                 {'id':'parcel_rainfall','label':'Lluvia diaria de la parcela (mm)','status':'unavailable','reason':'Catálogo de estaciones disponible, sin serie diaria validada con fechas de publicación.'},
                 {'id':'parcel_temperature','label':'Temperatura mínima/máxima y heladas locales','status':'unavailable','reason':'No se deduce de anomalías del mar ni de una grilla como lectura exacta de parcela.'},
                 {'id':'dry_days','label':'Días secos, acumulados 7/15/30/90 y humedad del suelo','status':'unavailable','reason':'Requieren observaciones diarias locales completas y control de calidad.'},
                 {'id':'ocean_subsurface','label':'Calor subsuperficial y termoclina','status':'unavailable','reason':'Las cifras externas propuestas no fueron replicadas como una serie trazable.'}],
             'unverified_external_claims':{'status':'excluded_from_production','reason':'No se replicaron temperaturas absolutas récord, comparación diaria con 1997, índice de calor subsuperficial ni conteos de estaciones de una publicación externa. No se incorporan como hechos ni features.'},
             'limitations':['Las nuevas evidencias NOAA/SENAMHI son contexto recuperado ahora; no se retrofechan para entrenar modelos pasados.',
                            'Niño 1+2 y Niño 3.4 son zonas diferentes; una anomalía no es una temperatura absoluta y ICEN/ONI/RONI no son intercambiables.',
                            'Tarma está en Junín, zona productora; el objetivo de precio sigue siendo el mercado mayorista de Lima.',
                            'El efecto de un escenario húmedo/seco sobre precio, rendimiento y costos no está estimado; no se publican coeficientes ni probabilidades inventadas.',
                            'Los mapas PDF no se digitalizan como polígonos de riesgo de parcela sin una capa geográfica validada.']}
    validate_catalog(catalog)
    return catalog


def event_comparison(rows:list[dict],code:str,as_of:str)->dict:
    """Align July–June windows within one revised series; missing stays null."""
    lookup={r['periodo_observacion']:r['valor'] for r in rows}
    events=[]
    for year in [1982,1997,2015,2026]:
        points=[]
        for offset in range(12):
            month=(6+offset)%12+1;yy=year+(6+offset)//12
            period=date(yy,month,1).isoformat()
            value=lookup.get(period) if period<=as_of else None
            points.append({'month_offset':offset,'period':period,'value':value,
                           'status':'observed_revised' if value is not None else 'future_unobserved' if period>as_of else 'unavailable'})
        events.append({'id':f'{year}-{year+1}','label':f'{year}/{str(year+1)[-2:]}',
                       'points':points,'available_periods':sum(p['value'] is not None for p in points)})
    return {'index':code,'ocean_region':rows[0]['region_oceanica'],'methodology':rows[0]['metodologia'],
            'unit':'°C de índice trimestral','alignment':'Julio a junio; ventanas de comparación, no equivalencias de impactos',
            'events':events,'model_eligible':False,
            'limitations':['Una sola versión metodológica por comparación. ICEN y RONI se muestran en paneles separados.',
                           'Historia revisada actual: útil para descripción, sin fechas de publicación originales por valor.',
                           'Una trayectoria oceánica parecida no reproduce la lluvia de Tarma ni el precio de la papa.',
                           'Periodos de 2026/27 sin valor publicado se conservan nulos; no son observaciones de 2027.']}


def regional_scenarios() -> list[dict]:
    common={'kind':'agricultural_hypothesis','geography':{'region':'Junín','province':'Tarma','market':'GMML Lima'},
            'risk_scope':'scenario','probability':None,'plausibility_interval':None,
            'price_effect':None,'price_simulation_enabled':False,
            'price_effect_reason':'No se estimó una relación regional validada clima → rendimiento/oferta → precio. El pronóstico estadístico central permanece sin ajuste climático arbitrario.',
            'evidence_ids':['senamhi-papa-central-ond2026','senamhi-tarma-phenology-sep2026']}
    definitions=[
        ('base','Planificación base','La parcela conserva su calendario y condiciones de agua verificadas por el productor.',
         ['Confirmar fecha de siembra, variedad, altitud y disponibilidad efectiva de riego.','Consultar el pronóstico de precio con su cobertura y el mercado de destino.'],
         ['La fila de CO-Tarma no determina la etapa de todas las parcelas.']),
        ('wetter','Si la parcela recibe más lluvia','Solo si un pronóstico local vigente y la observación de la parcela respaldan mayor humedad.',
         ['Revisar drenajes y ventanas de labores y cosecha.','Conservar registros de lluvia y estado del cultivo para contrastar el supuesto.'],
         ['Mayor humedad puede aliviar el déficit o generar exceso; depende del suelo y la fase.','No diagnostica hongos ni predice aumento del precio.']),
        ('drier','Si persiste la falta de humedad','Solo si lluvia y humedad locales verificadas indican déficit respecto a la necesidad del cultivo.',
         ['Verificar disponibilidad de agua antes de ampliar la siembra.','Revisar prioridades de riego con asistencia agronómica local.'],
         ['El escenario de sierra sur no se transfiere automáticamente a Tarma.','La necesidad hídrica cambia con fase, suelo y altitud.']),
        ('logistics','Si se interrumpe el transporte','Requiere aviso vial oficial y una ruta de comercialización afectada; este catálogo no verifica cierres.',
         ['Confirmar rutas y tiempos de entrega antes del traslado.','Ingresar costos de transporte conocidos en la simulación económica.'],
         ['Estado vial y costo adicional no disponibles.','Un cambio de oferta local no equivale necesariamente al mismo cambio de precio en GMML.'])]
    return [{**common,'id':ident,'title':title,'assumption':assumption,'preparation':actions,'limitations':limits} for ident,title,assumption,actions,limits in definitions]


def main():
    parser=argparse.ArgumentParser(description=__doc__)
    parser.add_argument('--as-of',default=datetime.now(ZoneInfo('America/Lima')).date().isoformat())
    parser.add_argument('--refresh',action='store_true',help='Refresca originales oficiales; nuevas versiones requieren revisión de interpretación.')
    args=parser.parse_args()
    if args.refresh:
        failures=retrieve()+retrieve(pdf=True)
        if failures:raise RuntimeError('Fuentes no actualizadas; se preserva último artefacto: '+str(failures))
    catalog=assemble(args.as_of)
    PUBLIC.mkdir(parents=True,exist_ok=True)
    blob=json.dumps(catalog,ensure_ascii=False,indent=2,allow_nan=False)+'\n'
    staged=PUBLIC/'index.json.tmp';staged.write_text(blob,encoding='utf-8');staged.replace(PUBLIC/'index.json')
    print(json.dumps({'as_of':args.as_of,'evidence':len(catalog['evidence']),'indicators':len(catalog['indicators']),
                      'scenarios':len(catalog['regional_scenarios']),'sha256':sha256((PUBLIC/'index.json').read_bytes()).hexdigest()},ensure_ascii=True))


if __name__=='__main__':main()
