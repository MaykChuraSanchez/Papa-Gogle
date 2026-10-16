"""Reconstruct dated audit predictions from known origins; never invent residuals."""
import json
import os
import unicodedata
os.environ.setdefault('OMP_NUM_THREADS', '2')
from .storage import DATA, ROOT, read

def slug(value):
    return ''.join(c for c in unicodedata.normalize('NFD', value.lower()) if not unicodedata.combining(c)).replace(' ', '-')

def run(artifact=None, prices=None):
    import numpy as np
    import pandas as pd
    from .modeling import series, predict, metrics
    artifact = artifact or json.loads((DATA/'forecasts.json').read_text(encoding='utf-8'))
    prices = read('prices') if prices is None else prices
    folder = ROOT/'public'/'analytics'; folder.mkdir(parents=True, exist_ok=True)
    for report in artifact['series']:
        frame=prices[(prices.variedad==report['variety']) & (prices.mercado_id==report['market_id'])].copy()
        y=series(frame); audits=[]
        for evaluation in report['evaluations']:
            h=evaluation['horizon']; rows=[]
            if evaluation.get('embedded_audit') is not None:
                rows=evaluation['embedded_audit']
            else:
                for origin in evaluation['origins'][-2:]:
                    train=y.loc[:origin]; target=y.loc[pd.Timestamp(origin)+pd.Timedelta(days=1):].iloc[:h]
                    p=predict(evaluation['model'], train, h); baseline=predict('Último precio', train, h)
                    for n,(date,actual) in enumerate(target.items()):
                        if np.isfinite(actual) and np.isfinite(p[n]):
                            rows.append({'date':str(date.date()),'actual':round(float(actual),6),
                                'predicted':round(float(p[n]),6),'baseline':round(float(baseline[n]),6),
                                'residual':round(float(actual-p[n]),6),'covered':bool(abs(actual-p[n])<=evaluation['band_width']), 'origin':origin})
            score=metrics(np.array([r['actual'] for r in rows]),np.array([r['predicted'] for r in rows]))
            verified=abs(score['mae']-evaluation['audit']['mae'])<1e-5 and score['n']==evaluation['audit']['n']
            audits.append({'horizon':h,'model':evaluation['model'],'verified':verified,'width':evaluation['band_width'],'rows':rows})
        volume=[{'date':str(pd.Timestamp(r.fecha).date()),'volume':None if pd.isna(r.volumen_t) else float(r.volumen_t)} for r in frame.sort_values('fecha').itertuples()]
        payload={'variety':report['variety'],'market_id':report['market_id'],'data_hash':report['data_hash'],
            'evaluated_at':report.get('evaluated_at',report['generated_at']),'audit':audits,'volume':volume}
        path=folder/(slug(report['variety'])+'.json')
        temporary=path.with_suffix('.tmp');temporary.write_text(json.dumps(payload,ensure_ascii=False,allow_nan=False,separators=(',',':')),encoding='utf-8');os.replace(temporary,path)
        print(report['variety'], 'auditorías reconciliadas',sum(a['verified'] for a in audits), '/',len(audits))

if __name__=='__main__':run()
