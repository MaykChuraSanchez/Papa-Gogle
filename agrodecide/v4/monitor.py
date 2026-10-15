"""Score previously published predictions only when their target becomes observed."""
import json
import numpy as np
import pandas as pd
from .storage import DATA,now,read,replace,atomic_json

def run():
    artifact_path=DATA/'forecasts.json'
    if not artifact_path.exists():
        return
    artifact=json.loads(artifact_path.read_text(encoding='utf-8'))
    actual=read('prices')
    rows=[]
    for report in artifact['series']:
        history=actual[(actual.variedad==report['variety'])&(actual.mercado_id==report['market_id'])].set_index('fecha').precio_s_kg
        for point in report['forecast']:
            target=pd.Timestamp(point['date'])
            if target not in history.index:
                continue
            value=float(history.loc[target])
            rows.append({'run_id':report['run_id'],'forecast_origin':report['last_date'],
                         'variety':report['variety'],'market_id':report['market_id'],'target':target,
                         'lead':point['lead'],'price':point['price'],'actual':value,
                         'absolute_error':abs(value-point['price']),'covered':point['low']<=value<=point['high']})
    previous=read('realized_forecasts')
    if rows:
        parts=([previous] if not previous.empty else [])+[pd.DataFrame(rows)]
        scores=pd.concat(parts,ignore_index=True).drop_duplicates(['run_id','forecast_origin','variety','market_id','target'],keep='last')
        replace('realized_forecasts',scores)
    else:
        scores=previous
    summaries=[]
    for report in artifact['series']:
        benchmark=next(r for r in report['evaluations'] if r['horizon']==7)['audit']['mae']
        if scores.empty:
            summaries.append({'variety':report['variety'],'n':0,'state':'sin observaciones futuras realizadas'})
            continue
        sample=scores[(scores.variety==report['variety'])&(scores.lead<=7)&(scores.target>=pd.Timestamp(now().date())-pd.Timedelta(days=30))]
        if sample.empty:
            summaries.append({'variety':report['variety'],'n':0,'state':'sin observaciones recientes'})
            continue
        mae=float(sample.absolute_error.mean());coverage=float(sample.covered.mean())
        # Operational heuristic; not a statistical proof of drift.
        alert=len(sample)>=30 and (mae>1.5*max(benchmark,.01) or coverage<.65)
        summaries.append({'variety':report['variety'],'n':len(sample),'mae':mae,'coverage':coverage,
                          'state':'revisar degradación' if alert else 'seguimiento','alert':alert})
    atomic_json(DATA/'monitoring.json',{'at':now().isoformat(),'series':summaries,
               'note':'Solo pronósticos emitidos antes de observar la fecha objetivo. Alertas heurísticas requieren al menos 30 pares recientes.'})

if __name__=='__main__':
    run()
