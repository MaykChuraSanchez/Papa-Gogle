"""Score stored issues only after targets later than their actual issue date exist."""
import json
import pandas as pd
from agrodecide.v4.storage import DATA,read,atomic_json,now,replace
from .engine import score

def run():
    observed=read('prices');rows=[]
    for path in (DATA/'forecasting'/'issued').glob('*/*.json'):
        issue=json.loads(path.read_text(encoding='utf-8'));issued=pd.Timestamp(issue['issued_at']).date()
        actual=observed[(observed.variedad==issue['variety'])&(observed.mercado_id==issue['market_id'])].set_index('fecha').precio_s_kg
        for horizon,curve in issue['forecasts_by_horizon'].items():
            for p in curve:
                date=pd.Timestamp(p['date'])
                if date.date()<=issued or date not in actual.index:continue
                value=float(actual.loc[date]);rows.append({'variety':issue['variety'],'origin':issue['origin'],'issued_at':issue['issued_at'],'date':p['date'],'horizon':int(horizon),'lead':p['lead'],'model':p['model'],'predicted':p['price'],'actual':value,'covered80':p['low']<=value<=p['high'],'covered95':p.get('low95',p['low'])<=value<=p.get('high95',p['high'])})
    summaries=[]
    if rows:
        frame=pd.DataFrame(rows).drop_duplicates(['variety','issued_at','date','horizon'])
        replace('advanced_realized_forecasts',frame)
        for (variety,h),part in frame.groupby(['variety','horizon']):
            summaries.append({'variety':variety,'horizon':int(h),**score(part.actual,part.predicted),'coverage80':float(part.covered80.mean()),'coverage95':float(part.covered95.mean())})
    result={'generated_at':now().isoformat(),'summaries':summaries,'n':len(rows),'state':'seguimiento' if rows else 'Aún no hay fechas futuras realizadas para las emisiones guardadas',
            'note':'Se excluye toda fecha objetivo anterior o igual al día real de emisión, incluso si era posterior al origen histórico. Estos resultados prospectivos se separan de backtesting.'}
    atomic_json(DATA/'forecasting'/'prospective.json',result)
    return result

if __name__=='__main__':print(run())
