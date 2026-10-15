"""Daily inference with monthly-selected models; no model selection in request path."""
from hashlib import sha256
import json
import pandas as pd
from .storage import DATA, now, read, atomic_json
from .modeling import series,predict

def run():
    path=DATA/'forecasts.json'
    if not path.exists():
        from .train import run as train
        return train()
    artifact=json.loads(path.read_text(encoding='utf-8'))
    prices=read('prices')
    refreshed=[]
    for report in artifact['series']:
        frame=prices[(prices.variedad==report['variety'])&(prices.mercado_id==report['market_id'])]
        y=series(frame)
        if y.notna().mean()<.85 or (now().date()-y.index[-1].date()).days>7:
            raise ValueError(f"Serie insuficiente o desactualizada: {report['variety']}. Se conserva el artefacto anterior.")
        report['evaluated_at']=report.get('evaluated_at',report['generated_at'])
        for evaluation in report['evaluations']:
            evaluation['status']='experimental' if evaluation['skill']<0 or evaluation['audit']['coverage80']<.75 else 'evaluado'
        preds={r['model']:predict(r['model'],y,240) for r in report['evaluations']}
        curve=[]
        for lead in range(1,241):
            r=next(r for r in report['evaluations'] if r['horizon']>=lead)
            p=float(preds[r['model']][lead-1])
            curve.append({'date':str((y.index[-1]+pd.Timedelta(days=lead)).date()),'lead':lead,
                          'price':round(p,4),'low':round(max(.01,p-r['band_width']),4),'high':round(p+r['band_width'],4),
                          'model':r['model'],'evaluated_horizon':r['horizon'],'status':r['status']})
        report.update(forecast=curve,last_date=str(y.index[-1].date()),last_price=float(y.dropna().iloc[-1]),
                      generated_at=now().isoformat(),observations=int(y.notna().sum()),
                      coverage=round(float(y.notna().mean()),4),data_hash=sha256(y.to_csv().encode()).hexdigest(),
                      history=[{'date':str(d.date()),'price':float(v)} for d,v in y.dropna().items()])
        refreshed.append(report)
    artifact.update(series=refreshed,generated_at=now().isoformat())
    atomic_json(path,artifact)
    print(f'Actualizada inferencia de {len(refreshed)} series; evaluación temporal conservada')

if __name__=='__main__':
    run()
