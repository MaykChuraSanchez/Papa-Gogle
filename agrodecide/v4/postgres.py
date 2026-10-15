"""Optional trusted-worker PostgreSQL sync. No secrets are exposed to the frontend."""
import argparse
import json
import os
from .storage import DATA,ROOT,read,now

def main():
    parser=argparse.ArgumentParser()
    parser.add_argument('--migrate',action='store_true',help='Crear tablas antes de sincronizar')
    args=parser.parse_args()
    # Optional dependency: pip install 'psycopg[binary]>=3.2,<4'
    import psycopg
    from psycopg.types.json import Jsonb
    url=os.environ.get('DATABASE_URL')
    if not url:
        raise RuntimeError('Falta DATABASE_URL en el entorno del worker')
    artifact=json.loads((DATA/'forecasts.json').read_text(encoding='utf-8'))
    prices=read('prices')
    # All changes commit together. Any failure rolls back the complete publication.
    with psycopg.connect(url) as conn:
        with conn.cursor() as cur:
            if args.migrate:
                cur.execute((ROOT/'sql'/'001_warehouse.sql').read_text(encoding='utf-8'))
            rows=[(r.fecha.date(),r.mercado_id,r.variedad,'Papa',float(r.precio_s_kg),None if __import__('pandas').isna(r.volumen_t) else float(r.volumen_t),r.source_url,r.archivo_origen) for r in prices.itertuples()]
            cur.executemany('''INSERT INTO agrodecide.prices VALUES (%s,%s,%s,%s,%s,%s,%s,%s)
                ON CONFLICT(fecha,market_id,variety) DO UPDATE SET price_pen_kg=EXCLUDED.price_pen_kg,
                volume_t=EXCLUDED.volume_t,source_url=EXCLUDED.source_url,source_file=EXCLUDED.source_file''',rows)
            for report in artifact['series']:
                # Snapshot ID changes for each inference; keep monthly model selection ID inside evaluation.
                snapshot=report['run_id']+'_'+report['generated_at']
                cur.execute('''INSERT INTO agrodecide.model_runs VALUES (%s,%s,%s,%s,%s,%s,%s,%s,%s)
                  ON CONFLICT(run_id,market_id,variety) DO NOTHING''',
                  (snapshot,report['market_id'],report['variety'],report['generated_at'],report.get('evaluated_at',report['generated_at']),
                   report['last_date'],report['data_hash'],report['model_version'],Jsonb(report['evaluations'])))
                cur.executemany('''INSERT INTO agrodecide.forecasts VALUES (%s,%s,%s,%s,%s,%s,%s,%s,%s,%s)
                  ON CONFLICT(run_id,market_id,variety,target_date) DO NOTHING''',
                  [(snapshot,report['market_id'],report['variety'],r['date'],r['price'],r['low'],r['high'],r['model'],r['evaluated_horizon'],r['status']) for r in report['forecast']])
    print('PostgreSQL sincronizado; transacción completada')

if __name__=='__main__':
    main()
