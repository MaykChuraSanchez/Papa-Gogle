"""Publish content-addressed, history-bound harvest evidence, never core models."""
import json
from hashlib import sha256
from pathlib import Path
import sys
ROOT=Path(__file__).resolve().parents[1]
sys.path.insert(0,str(ROOT))
from agrodecide.v4.storage import DATA,atomic_json
from agrodecide.research_v6.run import fingerprint


def run():
    report=json.loads((DATA/'research_v6/report.json').read_text(encoding='utf-8'))
    if report['code_hash']!=fingerprint():raise ValueError('El código cambió: repetir entrenamiento V6')
    folder=ROOT/'public/harvest-v6';folder.mkdir(parents=True,exist_ok=True)
    def asset(payload):
        raw=json.dumps(payload,ensure_ascii=False,separators=(',',':'),allow_nan=False).encode()
        name=sha256(raw).hexdigest()+'.json';(folder/name).write_bytes(raw);return name
    manifest={k:report[k] for k in ('schema_version','code_hash','protocol_sha256','run_id','generated_at','limitations','models','versions')}
    manifest['series']=[]
    for s in report['series']:
        common={k:s[k] for k in ('variety','history_hash','last_date','last_price','observations')}
        common['run_id']=report['run_id'];details={}
        for e in s['evaluations']:
            payload={**common,**e,'schema_version':'6.0.0'}
            details[f"{e['horizon']}-{e['target']}"]=asset(payload)
        summary={**common,'eda':s['eda'],'details':details,'failures':s['failures'],'limitations':report['limitations']}
        manifest['series'].append({**common,'file':asset(summary)})
    atomic_json(folder/'index.json',manifest)
    return manifest


if __name__=='__main__':print(json.dumps({'run_id':run()['run_id']}))
