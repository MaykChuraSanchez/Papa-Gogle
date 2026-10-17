"""Reconcile every published objective against raw quotes and causal selection."""
import json
import math
from pathlib import Path
import sys
import duckdb
import numpy as np
import pandas as pd
ROOT=Path(__file__).resolve().parents[1]
sys.path.insert(0,str(ROOT))
from agrodecide.v4.storage import DATA,atomic_json
from agrodecide.research_v6.run import fingerprint


def verify():
    report=json.loads((DATA/'research_v6/report.json').read_text(encoding='utf-8'))
    assert report['code_hash']==fingerprint(),'Código diferente del entrenamiento'
    with duckdb.connect(str(DATA/'warehouse.duckdb'),read_only=True) as db:
        frame=db.execute('SELECT * FROM prices').df()
    count=0;evals=0
    for s in report['series']:
        part=frame[(frame.variedad==s['variety'])&(frame.mercado_id.astype(str)==s['market_id'])]
        assert not part.duplicated(['fecha','variedad','mercado_id']).any()
        y=part.set_index(pd.to_datetime(part.fecha)).precio_s_kg.asfreq('D')
        assert (y.dropna()>0).all()
        for e in s['evaluations']:
            h=e['horizon'];target=e['target'];past=[];scored=[]
            for r in e['rows']:
                o=pd.Timestamp(r['origin']);end=o+pd.Timedelta(days=h)
                assert str(end.date())==r['target_end']
                start=end if target=='endpoint' else o+pd.Timedelta(days=max(1,h-29))
                observed=y.loc[start:end];assert observed.notna().mean()>=.8
                assert math.isclose(float(observed.mean()),r['actual'],abs_tol=1e-12)
                for model,score in r['selection_scores'].items():
                    mature=[a for a in past if a['target_end']<=r['origin'] and 'Naive' in a['predictions']][-12:]
                    assert len(mature)>=6 and all(model in a['predictions'] for a in mature)
                    actual_score=np.mean([abs(a['predictions'][model]-a['actual']) for a in mature])
                    assert math.isclose(float(actual_score),score,abs_tol=1e-12)
                if r['selection_scores']:
                    assert r['selected_model']==min(r['selection_scores'],key=r['selection_scores'].get)
                    scored.append(r)
                assert r['policy']==r['predictions'][r['selected_model']]
                for label,level in [('80',.8),('95',.95)]:
                    errors=[abs(a['policy']-a['actual']) for a in past if a['target_end']<=r['origin'] and a['selection_scores']][-36:]
                    band=r['interval'+label];rank=math.ceil((len(errors)+1)*level)
                    if len(errors)<12 or rank>len(errors):assert band is None
                    else:
                        width=sorted(errors)[rank-1]
                        assert np.allclose(band,[max(0,r['policy']-width),r['policy']+width])
                past.append(r);count+=1
            for key,pred in [('policy','policy'),('baseline','Naive')]:
                errors=np.array([(r['policy'] if pred=='policy' else r['predictions'][pred])-r['actual'] for r in scored])
                assert len(scored)==e[key]['n']
                assert math.isclose(float(abs(errors).mean()),e[key]['mae'],abs_tol=1e-12)
                assert math.isclose(float(np.sqrt(np.mean(errors**2))),e[key]['rmse'],abs_tol=1e-12)
            curve=np.array([p['price'] for p in e['current']['path']])
            point=curve[-1] if target=='endpoint' else curve[-min(30,h):].mean()
            assert math.isclose(float(point),e['current']['point'],abs_tol=1e-12)
            evals+=1
    receipt={'run_id':report['run_id'],'code_hash':report['code_hash'],'series_verified':len(report['series']),
             'evaluations_verified':evals,'dated_objectives_reconciled':count,
             'checks':['Cotizaciones originales','Métricas pareadas','Madurez de objetivos de selección',
                       'Calibración sin errores futuros','Agregación de curvas actuales']}
    atomic_json(ROOT/'docs/modelos/VERIFICACION_V6.json',receipt)
    print(json.dumps(receipt));return receipt


if __name__=='__main__':verify()
