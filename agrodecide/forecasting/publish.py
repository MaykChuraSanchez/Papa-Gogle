"""Bridge the advanced engine into the existing publication and UI contracts."""
from hashlib import sha256
import json
from agrodecide.v4.storage import DATA,ROOT,now,atomic_json
from agrodecide.v4.diagnostics import slug

def write_asset(folder,value):
    raw=json.dumps(value,ensure_ascii=False,allow_nan=False,separators=(',',':')).encode()
    name=sha256(raw).hexdigest()[:20]+'.json'
    atomic_json(folder/name,value)
    return name

def sources():
    folder=DATA/'forecasting'/'sources';result={}
    for name in ['icen','enfen','macro','emmsa','central','weather','status']:
        path=folder/(name+'.json')
        if path.exists():result[name]=json.loads(path.read_text(encoding='utf-8'))
        else:result[name]={'state':'NO DISPONIBLE','rows':[]}
    # Keep provenance; large raw PDFs stay in bronze, never in the JS bundle.
    for row in result.get('enfen',{}).get('rows',[]):row.pop('text_excerpt',None)
    result['senamhi']={'state':'catálogo verificado, series pendientes','url':'https://www.senamhi.gob.pe/site/descarga-datos/','reason':result.get('weather',{}).get('reason','Faltan series regionales publicadas con calidad y disponibilidad verificables. No se usa Lima como sustituto.')}
    result['methodology_2026']={'coastal':'ICEN ENFEN 01-2024 / ERSSTv5, climatología 1991-2020. Alerta ENFEN 02-2026 separada del índice y de su magnitud.',
        'central':'RONI ERSSTv6 y ONI ERSSTv5 se conservan separados. El cambio operacional CPC de febrero de 2026 no se aplica retroactivamente al ICEN costero.',
        'sources':['https://www.cpc.ncep.noaa.gov/products/analysis_monitoring/enso/roni/announcement.php','https://siofen.imarpe.gob.pe/nivel2/indice-costero-el-nino-icen','https://enfen.imarpe.gob.pe/notas-tecnicas/'],
        'archive_warning':'La nota de prensa ENFEN N01-2026 tiene un título de catálogo sobre índice operacional, pero su PDF fechado 27/04/2026 trata perspectivas. No se infiere una nueva definición del índice a partir de ese título.'}
    result['generated_at']=now().isoformat()
    return result

def attach(artifact):
    from .engine import IMPLEMENTATION
    folder=ROOT/'public'/'forecasting';folder.mkdir(parents=True,exist_ok=True)
    summaries=[]
    for report in artifact['series']:
        path=DATA/'forecasting'/'reports'/(report['variety']+'.json')
        if not path.exists():continue
        advanced=json.loads(path.read_text(encoding='utf-8'))
        if advanced.get('implementation_hash')!=IMPLEMENTATION or not all(e.get('interval_numerical_tolerance_pen_kg')==1e-12 for e in advanced['evaluations']) or not advanced.get('enriched_at') or set(advanced.get('forecasts_by_horizon',{}))!={'7','15','30','90','180','240'}:
            continue
        advanced['publication_validation_version']=1
        if advanced['data_hash']!=report['data_hash']:
            # A new price invalidates the forecast. Never label an old run as live.
            continue
        details={}
        for evaluation in advanced['evaluations']:
            h=str(evaluation['horizon'])
            details[h]=write_asset(folder,{'evaluation':evaluation,'forecast':advanced['forecasts_by_horizon'][h],'model_metadata':advanced['model_metadata'][h]})
        summary={k:v for k,v in advanced.items() if k not in {'evaluations','forecasts_by_horizon','model_metadata'}}
        summary['details_by_horizon']=details
        summary['evaluations']=[{k:v for k,v in e.items() if k not in {'candidates','audit_rows','failures','candidate_forecasts','inference_failures','enfen_scenarios','error_groups','ablations'}} for e in advanced['evaluations']]
        summary['forecasts_by_horizon']=advanced['forecasts_by_horizon']
        quality=DATA/'forecasting'/'quality.json'
        if quality.exists():
            audited=json.loads(quality.read_text(encoding='utf-8'))
            summary['data_quality']=next((q for q in audited['series'] if q['variety']==report['variety'] and q['market_id']==report['market_id']),None)
        tracking=DATA/'forecasting'/'prospective.json'
        summary['prospective']=json.loads(tracking.read_text(encoding='utf-8')) if tracking.exists() else None
        from agrodecide.v4.storage import read
        master=read('master_prices')
        if not master.empty:
            csv=master[master.variedad==report['variety']]
            name='master-'+slug(report['variety'])+'.csv'
            temporary=folder/(name+'.tmp');csv.to_csv(temporary,index=False,encoding='utf-8-sig');temporary.replace(folder/name)
            summary['master_csv']=name
        file=write_asset(folder,summary)
        summaries.append({'variety':report['variety'],'file':file,'data_hash':advanced['data_hash'],'last_date':advanced['last_date']})
        report['forecasts_by_horizon']=advanced['forecasts_by_horizon']
        report['forecast']=advanced['forecasts_by_horizon'][str(max(int(h) for h in advanced['forecasts_by_horizon']))]
        report['model_version']='forecasting-'+advanced['engine_version'];report['generated_at']=advanced['generated_at'];report['evaluated_at']=advanced['generated_at']
        report['run_id']='forecasting-'+advanced['data_hash'][:12]+'-'+advanced['generated_at'][:10]
        report['price_vintage_caveat']=advanced['price_vintage_caveat']
        report['evaluations']=[]
        for e in advanced['evaluations']:
            selected=next(c for c in e['candidates'] if c['id']==e['deployed'])
            report['evaluations'].append({'horizon':e['horizon'],'model':e['deployed'],'selection':[{'model':c['id'],**{k:c[k] for k in ['mae','rmse','smape','n','wape','mase','bias']}} for c in e['candidates']],
                'audit':e['audit'],'baseline_audit':e['baseline_audit'],'skill':1-e['audit']['mae']/e['baseline_audit']['mae'] if e['baseline_audit']['mae']>1e-9 else 0.,
                'status':'evaluado' if e['accepted'] and e.get('intervals_adequate') else 'experimental','band_width':e['width80'],'band_width95':e['width95'],'band_method':e['interval_method'],
                'origins':sum(e['plan'].values(),[]),'selection_folds':len(e['plan']['selection']),'calibration_folds':len(e['plan']['calibration']),'audit_folds':len(e['plan']['audit']),
                'qualification':e['reason'],'embedded_audit':e['audit_rows'],'features':selected['metadata'].get('features',[])})
        # Internal state remains explicit; public wording is production language.
        for curve in report['forecasts_by_horizon'].values():
            for point in curve:
                if point['status']=='referencia':point['status']='experimental'
    src=write_asset(folder,sources())
    atomic_json(folder/'index.json',{'generated_at':now().isoformat(),'series':summaries,'sources_file':src})
    return summaries

if __name__=='__main__':
    from agrodecide.v4.export import run
    run()
