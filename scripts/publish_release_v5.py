"""Seal a coherent release after all datasets have been validated. No deployment."""
from datetime import datetime
from hashlib import sha256
import json
from pathlib import Path
import sys
from zoneinfo import ZoneInfo

ROOT=Path(__file__).resolve().parents[1]
sys.path.insert(0,str(ROOT))
from agrodecide.v4.storage import atomic_json
from agrodecide.climate_v5.contracts import validate_catalog


def read(path):
    return json.loads(path.read_text(encoding='utf-8'))


def reference(path,root=ROOT):
    raw=path.read_bytes()
    normalized=path.name=='index.json' and path.parent.name in {'data','forecasting'}
    content=raw.replace(b'\r\n',b'\n') if normalized else raw
    return {'url':'/'+path.relative_to(root/'public').as_posix(),
            'sha256':sha256(content).hexdigest(),'bytes':len(content),'normalization':'LF' if normalized else 'none'}


def source_paths(root=ROOT):
    files=[]
    for folder in ('src','api','server','agrodecide','scripts'):
        files.extend(p for p in (root/folder).rglob('*') if p.suffix in ('.py','.ts','.tsx','.css','.mjs') and '__pycache__' not in p.parts)
    files.extend(root/p for p in ('package.json','package-lock.json','vercel.json','vite.config.ts','requirements-v4.txt','requirements-v5.txt','.gitattributes'))
    return sorted((p for p in set(files) if p.is_file()),key=lambda x:x.relative_to(root).as_posix())


def source_bytes(path):
    # Vercel can reserialize its config before the build; hash its meaning.
    if path.name=='vercel.json':
        return json.dumps(read(path),sort_keys=True,separators=(',',':'),ensure_ascii=False).encode('utf-8')
    return path.read_bytes().replace(b'\r\n',b'\n')


def source_files(root=ROOT):
    return {p.relative_to(root).as_posix():sha256(source_bytes(p)).hexdigest() for p in source_paths(root)}


def source_hash(root=ROOT):
    h=sha256()
    for p in source_paths(root):
        if p.is_file():h.update(p.relative_to(root).as_posix().encode()+b'\0'+source_bytes(p)+b'\0')
    return h.hexdigest()


def run(root=ROOT):
    pub=root/'public';core=read(pub/'data/index.json');research=read(pub/'research-v5/index.json');advanced=read(pub/'forecasting/index.json')
    if research['schema_version']!='5.0.0':raise ValueError('Research schema incompatible')
    core_rows={s['variety']:read(pub/'data'/s['file']) for s in core['series']}
    if len(core_rows)!=10 or set(core_rows)!={s['variety'] for s in research['series']}:raise ValueError('El catálogo y la investigación no coinciden')
    for row in research['series']:
        if row['history_hash']!=core_rows[row['variety']]['data_hash']:raise ValueError('Historia nueva sin investigación actualizada')
    for row in advanced['series']:
        if row['data_hash']!=core_rows[row['variety']]['data_hash']:raise ValueError('Motor avanzado no corresponde a su historia')
    climate_path=pub/'climate-v5/index.json';climate=read(climate_path)
    validate_catalog(climate)
    # Publish an immutable snapshot before pointing the release at it.
    climate_hash=sha256(climate_path.read_bytes()).hexdigest()
    immutable=pub/'climate-v5'/f'{climate_hash}.json'
    if immutable.exists() and immutable.read_bytes()!=climate_path.read_bytes():raise ValueError('Snapshot climático inmutable corrupto')
    if not immutable.exists():immutable.write_bytes(climate_path.read_bytes())
    payload={'schema_version':'5.0.0','version':read(root/'package.json')['version'],
             'source_tree_sha256':source_hash(root),'source_files':source_files(root),'source_config':read(root/'vercel.json'),
             'operational':reference(pub/'data/index.json',root),
             'advanced':reference(pub/'forecasting/index.json',root),
             'research':reference(pub/'research-v5/index.json',root),
             'climate':reference(immutable,root),
             'research_run_id':research['run_id'],
             'operational_runs':{v:s['run_id'] for v,s in core_rows.items()},
             'data_as_of':max(s['last_date'] for s in core_rows.values()),
             'climate_as_of':climate['as_of'],
             'scope':'Published core preserved; complementary research does not override the operational model.'}
    payload['build_id']='agro-v5-'+sha256(json.dumps(payload,sort_keys=True,separators=(',',':')).encode()).hexdigest()[:20]
    harvest_path=pub/'harvest-v6/index.json'
    if harvest_path.exists():
        from agrodecide.research_v6.run import fingerprint
        harvest=read(harvest_path)
        if harvest['code_hash']!=fingerprint():raise ValueError('El código de cosecha cambió después de entrenar')
        for s in harvest['series']:
            if s['history_hash']!=core_rows[s['variety']]['data_hash']:raise ValueError('Cosecha con histórico incompatible')
        if {s['variety'] for s in harvest['series']}!=set(core_rows):raise ValueError('Catálogo cosecha incompleto')
        payload['harvest']=reference(harvest_path,root)
        payload['harvest_run_id']=harvest['run_id']
        payload['build_id']='agro-v6-'+sha256(json.dumps(payload,sort_keys=True,separators=(',',':')).encode()).hexdigest()[:20]
    payload['sealed_at']=datetime.now(ZoneInfo('America/Lima')).isoformat()
    atomic_json(pub/'release.json',payload)
    return payload


if __name__=='__main__':
    result=run();print(json.dumps({'build_id':result['build_id'],'research_run_id':result['research_run_id'],'data_as_of':result['data_as_of']}))
