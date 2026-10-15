import argparse
import json
import sys
import traceback
import pandas as pd
from .sisap import Client, BASE
from .storage import DATA, now, read, replace, atomic_json

def run(start='2019-01-01', end=None, offline=False):
    end = pd.Timestamp(end or now().date())
    start = pd.Timestamp(start)
    if start > end or end > pd.Timestamp(now().date()):
        raise ValueError('Intervalo inválido o futuro')
    client = Client()
    parts, logs = [], []
    for month in pd.date_range(start.replace(day=1), end.replace(day=1), freq='MS'):
        lo, hi = max(start,month), min(end,month+pd.offsets.MonthEnd(0))
        try:
            frame, state = client.month(lo, hi, offline=offline)
            parts.append(frame)
            logs.append(dict(source='SISAP',period=f'{month:%Y-%m}',state=state,rows=len(frame),error=''))
            print(f'{month:%Y-%m} {state} {len(frame)}', flush=True)
        except Exception as exc:
            # Failure does not overwrite the last good warehouse or monthly cache.
            logs.append(dict(source='SISAP',period=f'{month:%Y-%m}',state='ERROR',rows=0,error=str(exc)))
            print(f'{month:%Y-%m} ERROR {str(exc)[:120]}', flush=True)
    old = read('prices')
    if parts:
        frames = ([old] if not old.empty else []) + parts
        combined = pd.concat(frames,ignore_index=True).drop_duplicates(['fecha','variedad','mercado_id'],keep='last')
        replace('prices', combined.sort_values(['fecha','variedad']))
    elif old.empty:
        atomic_json(DATA/'status.json', {'at':now().isoformat(),'state':'ERROR','logs':logs})
        raise RuntimeError('No hay datos válidos ni caché anterior')
    status = {'at':now().isoformat(),'state':'DEGRADED' if any(x['state']=='ERROR' for x in logs) else ('CACHE' if offline else 'OK'),
              'logs':logs,'source_url':BASE+'resumenes/consultar/'}
    atomic_json(DATA/'status.json',status)
    replace('ingestion_log',pd.DataFrame(logs).assign(run_at=now().isoformat()))
    return status

def main():
    parser = argparse.ArgumentParser(description='Carga idempotente de precios oficiales de papa')
    parser.add_argument('--start',default='2019-01-01')
    parser.add_argument('--end')
    parser.add_argument('--offline',action='store_true')
    args = parser.parse_args()
    result = run(args.start,args.end,args.offline)
    if result['state']=='DEGRADED':
        sys.exit(2)

if __name__=='__main__':
    main()
