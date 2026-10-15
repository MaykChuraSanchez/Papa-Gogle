import argparse
import json
import os
# Bound CPU usage for reproducible jobs and responsive local UI.
os.environ.setdefault('OMP_NUM_THREADS','2')
os.environ.setdefault('OPENBLAS_NUM_THREADS','2')
from .storage import DATA, ROOT, now, read, atomic_json
from .modeling import train_series

def run(varieties=None, mlflow_enabled=False):
    if mlflow_enabled:
        import mlflow
    prices=read('prices')
    if prices.empty:
        raise RuntimeError('Ejecuta primero python -m agrodecide.v4.ingest')
    outputs=[]
    failures=[]
    for variety, frame in prices.groupby('variedad'):
        if varieties and variety not in varieties:
            continue
        # A retired series cannot be presented as a current forecast.
        if (now().date()-frame.fecha.max().date()).days>7:
            failures.append({'variety':variety,'reason':'Serie desactualizada; se excluye de los pronósticos actuales'})
            continue
        print(f'Entrenando {variety} ({len(frame)} observaciones)',flush=True)
        try:
            report=train_series(frame)
            report['generated_at']=now().isoformat()
            report['evaluated_at']=report['generated_at']
            report['run_id']=now().strftime('%Y%m%dT%H%M%S')+'_'+report['data_hash'][:10]
            slug=report['data_hash'][:16]
            atomic_json(DATA/'registry'/report['run_id']/f'{slug}.json',report)
            outputs.append(report)
            print(f'OK {variety}: '+', '.join(f"{r['horizon']}d {r['model']} MAE={r['audit']['mae']:.3f}" for r in report['evaluations']),flush=True)
            if mlflow_enabled:
                import mlflow
                mlflow.set_tracking_uri(os.getenv('MLFLOW_TRACKING_URI',(DATA/'mlruns').as_uri()))
                mlflow.set_experiment('AgroDecide Papa')
                with mlflow.start_run(run_name=report['run_id']):
                    mlflow.log_params({'variety':variety,'market_id':report['market_id'],'data_hash':report['data_hash'],'version':report['model_version']})
                    for r in report['evaluations']:
                        mlflow.log_metrics({f"mae_{r['horizon']}d":r['audit']['mae'],f"coverage_{r['horizon']}d":r['audit']['coverage80']})
                    mlflow.log_dict(report,'report.json')
        except Exception as exc:
            failures.append({'variety':variety,'reason':str(exc)})
            print(f'ERROR {variety}: {exc}',flush=True)
    if not outputs:
        raise RuntimeError('Ninguna serie superó la evaluación. Se conserva el último artefacto.')
    artifact={'generated_at':now().isoformat(),'series':outputs,'excluded':failures,
              'methodology':{'selection':'3 bloques temporales','calibration':'3 bloques temporales','audit':'2 bloques posteriores sin usar en selección',
                             'bands':'Rangos empíricos de error absoluto; cobertura objetivo 80%, no garantizada',
                             'exogenous':'Macros, clima y volumen aún no se usan en el modelo; necesitan validación de disponibilidad y mejora fuera de muestra'}}
    atomic_json(DATA/'forecasts.json',artifact)
    return artifact

def main():
    parser=argparse.ArgumentParser()
    parser.add_argument('--variety',action='append')
    parser.add_argument('--mlflow',action='store_true')
    args=parser.parse_args()
    run(args.variety,args.mlflow)

if __name__=='__main__':
    main()
