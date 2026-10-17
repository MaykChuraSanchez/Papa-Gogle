"""Unattended runner. A failure is visible and retains the last valid artifacts."""
import argparse
from datetime import timedelta
import os
import sys
from .storage import DATA,now,atomic_json

def main():
    parser=argparse.ArgumentParser()
    parser.add_argument('--retrain',action='store_true')
    parser.add_argument('--bootstrap',action='store_true')
    args=parser.parse_args()
    from .ingest import run as ingest
    from .context import main as context
    from .export import run as export
    try:
        start='2019-01-01' if args.bootstrap else str(now().date()-timedelta(days=45))
        status=ingest(start=start)
        context()
        from .monitor import run as monitor
        monitor()
        if args.retrain or now().day==1 or not (DATA/'forecasts.json').exists():
            from .train import run
        else:
            from .refresh import run
        run()
        from agrodecide.forecasting.sources import run as update_sources
        update_sources()
        from agrodecide.forecasting.engine import run as forecast_advanced
        forecast_advanced('Única')
        from agrodecide.forecasting.enrich import run as enrich
        enrich('Única')
        from agrodecide.forecasting.monitor import run as monitor_advanced
        monitor_advanced()
        export()
        # Build one coherent immutable bundle; any exception leaves the live
        # deployment on its previous validated release.
        from agrodecide.research_v5.run import run as research
        research()
        from scripts.publish_research_v5 import publish
        publish()
        # The climate CLI has independent source guards and keeps old snapshots.
        import subprocess
        from .storage import ROOT
        subprocess.run([sys.executable,'-m','agrodecide.climate_v5.build','--refresh'],cwd=ROOT,check=True)
        from scripts.publish_release_v5 import run as seal
        seal()
        if status['state']=='DEGRADED':
            raise RuntimeError('Ingesta parcial; revisa status.json. Se preservaron meses válidos.')
    except Exception as exc:
        atomic_json(DATA/'last_failure.json',{'at':now().isoformat(),'message':str(exc)})
        # GitHub Actions sends repository workflow-failure notifications according to
        # the owner's settings. External messaging is intentionally not configured.
        print(f'::error::AgroDecide: {exc}',file=sys.stderr)
        sys.exit(1)

if __name__=='__main__':
    main()
