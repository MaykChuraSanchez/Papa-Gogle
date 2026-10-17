"""Run frozen retrospective experiments. Only writes V6 research artifacts."""
import json
import importlib.metadata
from hashlib import sha256
from pathlib import Path
from datetime import datetime
from zoneinfo import ZoneInfo
import duckdb
import numpy as np
import pandas as pd
from agrodecide.v4.storage import ROOT,DATA,atomic_json
from agrodecide.research_v5.evaluation import holm
from .models import forecasts,MODELS
from .evaluation import HORIZONS,TARGETS,aggregate,choose,interval,summarize


def fingerprint():
    paths=sorted(Path(__file__).parent.glob('*.py'))+[ROOT/'docs/modelos/PROTOCOLO_V6.md',ROOT/'agrodecide/research_v5/models.py']
    return sha256(b''.join(p.name.encode()+p.read_bytes().replace(b'\r\n',b'\n') for p in paths)).hexdigest()


def fit_cached(y,folder,code):
    key=sha256(code.encode()+y.to_csv().encode()).hexdigest();path=folder/(key+'.json')
    if path.exists():result=json.loads(path.read_text(encoding='utf-8'))
    else:
        pred,meta,failures=forecasts(y)
        result={'predictions':{k:v.tolist() for k,v in pred.items()},'metadata':meta,'failures':failures}
        atomic_json(path,result)
    return result


def run():
    code=fingerprint();folder=DATA/'research_v6';cache=folder/'cache'
    with duckdb.connect(str(DATA/'warehouse.duckdb'),read_only=True) as conn:
        frame=conn.execute('SELECT * FROM prices ORDER BY variedad,mercado_id,fecha').df()
    catalog=json.loads((ROOT/'public/data/index.json').read_text(encoding='utf-8'))
    previous=json.loads((DATA/'research_v5/report.json').read_text(encoding='utf-8'))
    result={'schema_version':'6.0.0','code_hash':code,'protocol_sha256':sha256((ROOT/'docs/modelos/PROTOCOLO_V6.md').read_bytes()).hexdigest(),
            'versions':{p:importlib.metadata.version(p) for p in ('numpy','pandas','scipy','scikit-learn','statsmodels','duckdb')},
            'generated_at':datetime.now(ZoneInfo('America/Lima')).isoformat(),'models':list(MODELS),'series':[],
            'limitations':['Historia retrospectiva ya explorada; no test prospectivo virgen.',
                           'Vintage SISAP actual: fecha original de publicación y revisiones no recuperadas.',
                           'Precio mayorista GMML Lima; no precio en chacra ni pronóstico regional.',
                           'Sin clima, macro ni volumen como predictores; sin garantía de precisión futura.']}
    for item in catalog['series']:
        variety=item['variety'];part=frame[(frame.variedad==variety)&(frame.mercado_id.astype(str)==str(item['market_id']))]
        y=part.set_index(pd.to_datetime(part.fecha)).precio_s_kg.asfreq('D')
        raw_hash=sha256(y.to_csv().encode()).hexdigest()
        current=json.loads((ROOT/'public/data'/item['file']).read_text(encoding='utf-8'))
        old=next(s for s in previous['series'] if s['variety']==variety)
        if old['data_hash']!=raw_hash:raise ValueError('El EDA V5 no corresponde a la historia actual; recalcular antes de entrenar')
        evaluations={(h,t):[] for h in HORIZONS for t in TARGETS};failures=[]
        cuts=[i for i in range(1094,len(y)-7,30) if np.isfinite(y.iloc[i])]
        for j,cut in enumerate(cuts):
            fit=fit_cached(y.iloc[:cut+1],cache,code);origin=str(y.index[cut].date())
            failures.extend({'origin':origin,'model':m,'reason':v} for m,v in fit['failures'].items())
            for (h,target),rows in evaluations.items():
                if cut+h>=len(y):continue
                actual=aggregate(y.iloc[cut+1:cut+h+1].to_numpy(),h,target)
                if actual is None:continue
                predicted={m:aggregate(p,h,target) for m,p in fit['predictions'].items()}
                selected,scores=choose(rows,origin,predicted)
                value=predicted[selected]
                row={'origin':origin,'target_end':str(y.index[cut+h].date()),'actual':actual,
                     'predictions':predicted,'selected_model':selected,'selection_scores':scores,'policy':value,
                     'interval80':interval(rows,origin,value,.8),'interval95':interval(rows,origin,value,.95)}
                rows.append(row)
            if j%15==0:print(f'{variety}: origen {j+1}/{len(cuts)} {origin}',flush=True)
        latest=fit_cached(y,cache,code);details=[]
        failures.extend({'origin':str(y.index[-1].date()),'model':m,'reason':v} for m,v in latest['failures'].items())
        for (h,target),rows in evaluations.items():
            summary=summarize(rows,h);selected,scores=choose(rows,str(y.index[-1].date()),latest['predictions'])
            point=aggregate(latest['predictions'][selected],h,target)
            summary.update(horizon=h,target=target,current={'selected_model':selected,'selection_scores':scores,
                'point':point,'interval80':interval(rows,str(y.index[-1].date()),point,.8),
                'interval95':interval(rows,str(y.index[-1].date()),point,.95),
                'target_start':str((y.index[-1]+pd.Timedelta(days=h if target=='endpoint' else max(1,h-29))).date()),
                'target_end':str((y.index[-1]+pd.Timedelta(days=h)).date()),
                'path':[{'date':str((y.index[-1]+pd.Timedelta(days=i+1)).date()),'price':p} for i,p in enumerate(latest['predictions'][selected][:h])],
                'metadata':latest['metadata'][selected]})
            details.append(summary)
        s={'variety':variety,'market_id':str(item['market_id']),'history_hash':current['data_hash'],'research_data_hash':raw_hash,
           'last_date':str(y.index[-1].date()),'last_price':float(y.iloc[-1]),'observations':int(y.notna().sum()),
           'eda':old['eda'],'evaluations':details,'failures':failures}
        result['series'].append(s);atomic_json(folder/'progress.json',s)
        print(f'{variety}: completa',flush=True)
    comparisons=[(s,e) for s in result['series'] for e in s['evaluations'] if 'comparison' in e]
    pvals=[max(e['comparison']['p_raw'],e['comparison']['sensitivity']['p_raw']) for _,e in comparisons]
    for (s,e),adjusted in zip(comparisons,holm(pvals)):
        c=e['comparison'];c['p_holm']=float(adjusted)
        e['robust_improvement']=bool(c['relative_gain']>=.03 and adjusted<=.05 and c['ci95'][0]>0 and
            c['sensitivity']['ci95'][0]>0 and c['effective_blocks']>=6 and not s['failures'])
    result['run_id']='harvest-v6-'+sha256((code+''.join(s['research_data_hash'] for s in result['series'])).encode()).hexdigest()[:20]
    atomic_json(folder/'report.json',result)
    print(json.dumps({'run_id':result['run_id'],'series':len(result['series']),
                      'robust':sum(e.get('robust_improvement',False) for _,e in comparisons)}),flush=True)
    return result


if __name__=='__main__':run()
