"""Package a self-contained source + data delivery without dependencies or secrets."""
from pathlib import Path
from zipfile import ZipFile, ZIP_DEFLATED
import json

ROOT = Path(__file__).resolve().parents[1]
OUTPUT = ROOT.parent / 'AgroDecide_Papa_4_3_Motor_V2.zip'
TOP = 'AgroDecide_Papa_4_3_Motor_V2'
FILES = ['DESIGN.md', 'README.md', 'ABRIR_AGRODECIDE.cmd', 'package.json', 'package-lock.json',
         'tsconfig.json', 'vite.config.ts', 'vercel.json', 'index.html', '.env.example',
         '.gitignore', '.gitattributes', 'requirements-v4.txt', 'requirements-ops.txt']
DIRS = ['src', 'api', 'server', 'public/analytics', 'public/forecasting', 'agrodecide', 'reference', 'tests', 'docs', 'sql', 'scripts', '.github', 'archive', 'data/v4', 'dist']

def include(path):
    return path.is_file() and not path.name.startswith('development_') and not {'__pycache__','model_cache','partial','registry','bronze','cache'}.intersection(path.parts) and path.suffix not in {'.pyc', '.wal', '.tmp','.log'}

def main():
    index = json.loads((ROOT/'public/data/index.json').read_text(encoding='utf-8'))
    published = {'index.json', 'prices.csv', 'peru.geojson'} | {s['file'] for s in index['series']}
    paths = [ROOT/name for name in FILES]
    for directory in DIRS:
        paths.extend(p for p in (ROOT/directory).rglob('*') if include(p))
    paths.extend(ROOT/'public/data'/name for name in published)
    # dist may contain obsolete content-addressed files after refresh: omit unreferenced files.
    paths = [p for p in paths if not (p.parent == ROOT/'dist/data' and p.name not in published)]
    # Only the current advanced publication; raw source/cache originals stay in
    # the local warehouse delivery rather than hundreds of obsolete web assets.
    forecasting=json.loads((ROOT/'public/forecasting/index.json').read_text(encoding='utf-8'))
    advanced={'index.json',forecasting['sources_file']}
    for item in forecasting['series']:
        advanced.add(item['file'])
        summary=json.loads((ROOT/'public/forecasting'/item['file']).read_text(encoding='utf-8'))
        advanced.update(summary['details_by_horizon'].values())
        if summary.get('master_csv'):advanced.add(summary['master_csv'])
    paths=[p for p in paths if not (p.parent in {ROOT/'public/forecasting',ROOT/'dist/forecasting'} and p.name not in advanced)]
    with ZipFile(OUTPUT, 'w', ZIP_DEFLATED, compresslevel=7) as archive:
        for path in sorted(set(paths)):
            archive.write(path, TOP+'/'+path.relative_to(ROOT).as_posix())
    with ZipFile(OUTPUT) as archive:
        if archive.testzip() is not None:
            raise RuntimeError('ZIP corrupto')
        print(f'{OUTPUT}: {OUTPUT.stat().st_size/1048576:.2f} MB, {len(archive.namelist())} archivos, integridad OK')

if __name__ == '__main__':
    main()
