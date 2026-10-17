"""Package the current V5 source and public evidence; no credentials or warehouse.

python scripts/package.py --list  # inspect without creating an archive
python scripts/package.py         # after QA, seal and matching Vite build
Source bytes (including research fingerprints) are copied without transformation.
"""
import argparse
from hashlib import sha256
import json
import os
from pathlib import Path
import re
import sys
import tempfile
from zipfile import ZipFile, ZIP_DEFLATED

ROOT = Path(__file__).resolve().parents[1]
OUTPUT = ROOT.parent / 'AgroDecide_Papa_V5.zip'
TOP = 'AgroDecide_Papa_V5'
FILES = ('DESIGN.md', 'README.md', 'ABRIR_AGRODECIDE.cmd', 'package.json',
         'package-lock.json', 'tsconfig.json', 'vite.config.ts', 'vercel.json',
         'index.html', '.env.example', '.gitignore', '.gitattributes',
         'requirements-v4.txt', 'requirements-v5.txt', 'requirements-ops.txt')
DIRECTORIES = ('src', 'api', 'server', 'agrodecide', 'reference', 'tests', 'docs',
               'sql', 'scripts', '.github')
EXCLUDED_PARTS = {'.git', '.venv', 'node_modules', '__pycache__', 'model_cache',
                  'partial', 'registry', 'bronze', 'cache', '.aws', '.codex', '.agents'}
EXCLUDED_SUFFIXES = {'.pyc', '.wal', '.tmp', '.log', '.zip', '.duckdb', '.sqlite', '.sqlite3', '.db'}


def read(path):
    return json.loads(Path(path).read_text(encoding='utf-8'))


def allowed(path):
    return (path.is_file() and not EXCLUDED_PARTS.intersection(path.parts)
            and path.suffix.lower() not in EXCLUDED_SUFFIXES
            and (not path.name.startswith('.env') or path.name == '.env.example')
            and not path.name.startswith('development_'))


def published_files(root=ROOT):
    """Traverse the live manifests, excluding obsolete content-addressed assets."""
    public = root / 'public'
    paths = set()

    def add(relative):
        target = public / relative
        if not target.resolve().is_relative_to(public.resolve()) or not allowed(target):
            raise ValueError('Asset público ausente o no permitido: ' + relative)
        paths.add(target)
        return target

    core = read(add('data/index.json'))
    for name in ('prices.csv', 'peru.geojson'):
        add('data/' + name)
    for row in core['series']:
        if not re.fullmatch(r'[a-f0-9]{20}\.json', row['file']):
            raise ValueError('Nombre de serie operativa inválido')
        add('data/' + row['file'])
    # Diagnostics use stable variety filenames and are still consumed by the app.
    for path in (public / 'analytics').glob('*.json'):
        add(path.relative_to(public).as_posix())

    advanced = read(add('forecasting/index.json'))
    add('forecasting/' + advanced['sources_file'])
    for row in advanced['series']:
        summary = read(add('forecasting/' + row['file']))
        for filename in summary['details_by_horizon'].values():
            add('forecasting/' + filename)
        if summary.get('master_csv'):
            add('forecasting/' + summary['master_csv'])

    research = read(add('research-v5/index.json'))
    if research.get('schema_version') != '5.0.0' or len(research.get('series', [])) != 10:
        raise ValueError('Investigación V5 incompleta')
    visited = set()

    def research_asset(filename):
        if filename in visited:
            return
        visited.add(filename)
        if not re.fullmatch(r'[a-f0-9]{64}\.json(?:\.gz)?', filename):
            raise ValueError('Nombre de evidencia V5 inválido')
        path = add('research-v5/' + filename)
        if sha256(path.read_bytes()).hexdigest() != filename[:64]:
            raise ValueError('Checksum de evidencia incorrecto: ' + filename)
        if filename.endswith('.gz'):
            return
        value = read(path)
        if value['run_id'] != research['run_id']:
            raise ValueError('No se mezclan ejecuciones de investigación')
        for child in value.get('details_by_horizon', {}).values():
            research_asset(child)
        if value.get('audit_file'):
            research_asset(value['audit_file'])
    for row in research['series']:
        research_asset(row['file'])

    add('climate-v5/index.json')
    release = read(add('release.json'))
    if release.get('harvest'):
        harvest=read(add('harvest-v6/index.json'))
        if harvest['run_id']!=release['harvest_run_id']:raise ValueError('Ejecución cosecha distinta del sello')
        for row in harvest['series']:
            summary=read(add('harvest-v6/'+row['file']))
            for name in [row['file'],*summary['details'].values()]:
                path=add('harvest-v6/'+name)
                if sha256(path.read_bytes()).hexdigest()!=name[:64]:raise ValueError('Checksum cosecha incorrecto')
        ref=release['harvest'];assert sha256((public/ref['url'].lstrip('/')).read_bytes()).hexdigest()==ref['sha256']
    add('deployment.json')
    for field in ('operational', 'advanced', 'research', 'climate'):
        reference = release[field]
        path = add(reference['url'].lstrip('/'))
        if sha256(path.read_bytes().replace(b'\r\n',b'\n') if reference.get('normalization')=='LF' else path.read_bytes()).hexdigest() != reference['sha256']:
            raise ValueError('Publicación modificada después del sellado: ' + field)
    # Only the four optimized and authorized adult photographs, never originals.
    photography = read(root / 'reference/photography/ASSETS.json')
    for asset in photography['assets']:
        if not re.fullmatch(r'(campo-cosecha|productora-andina)-\d+\.webp', asset['file']):
            raise ValueError('Fotografía fuera del alcance autorizado')
        add('images/' + asset['file'])
    return paths


def collect_paths(root=ROOT, include_dist=True):
    root = Path(root)
    paths = set()
    for name in FILES:
        path = root / name
        if not allowed(path):
            raise ValueError('Archivo de entrega requerido ausente: ' + name)
        paths.add(path)
    for directory in DIRECTORIES:
        paths.update(p for p in (root / directory).rglob('*') if allowed(p))
    public = published_files(root)
    paths.update(public)
    if include_dist and (root / 'dist').exists():
        # Match the QA build to the sealed source, rather than shipping an old dist.
        release = (root / 'public/release.json').read_bytes()
        if not (root / 'dist/release.json').exists() or (root / 'dist/release.json').read_bytes() != release:
            raise ValueError('dist no corresponde a la publicación sellada; vuelve a construir')
        for path in public:
            compiled = root / 'dist' / path.relative_to(root / 'public')
            if not allowed(compiled) or compiled.read_bytes() != path.read_bytes():
                raise ValueError('Asset compilado desactualizado: ' + str(compiled.relative_to(root)))
            paths.add(compiled)
        paths.add(root / 'dist/index.html')
        paths.update(p for p in (root / 'dist/assets').rglob('*') if allowed(p))
    return sorted(paths, key=lambda p: p.relative_to(root).as_posix())


def manifest(paths, root=ROOT):
    release = read(root / 'public/release.json')
    return {'schema_version': '5.0.0', 'build_id': release['build_id'],
            'harvest_run_id': release.get('harvest_run_id'),
            'research_run_id': release['research_run_id'],
            'source_tree_sha256': release['source_tree_sha256'],
            'exclusions': 'Credenciales, warehouse, caché, originales y archivo demo; sólo publicación vigente.',
            'files': [{'path': path.relative_to(root).as_posix(),
                       'bytes': path.stat().st_size,
                       'sha256': sha256(path.read_bytes()).hexdigest()} for path in paths]}


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('--list', action='store_true', help='Lista verificable; no crea ZIP')
    parser.add_argument('--source-only', action='store_true', help='Omite dist; conserva los assets públicos')
    parser.add_argument('--output', type=Path)
    args = parser.parse_args()
    paths = collect_paths(include_dist=not args.source_only)
    package = manifest(paths)
    top=TOP.replace('V5','V6') if package.get('harvest_run_id') else TOP
    if args.output is None:args.output=OUTPUT.with_name('AgroDecide_Papa_V6.zip') if package.get('harvest_run_id') else OUTPUT
    if args.list:
        print(json.dumps(package, ensure_ascii=False, indent=2))
        return
    sys.path.insert(0, str(ROOT))
    from scripts.publish_release_v5 import source_hash
    if source_hash() != package['source_tree_sha256']:
        raise ValueError('Código modificado después del sello; repite QA, sellado y build')
    if read(ROOT / 'package.json')['version'] != '5.0.0':
        raise ValueError('Versión de software incompatible con la entrega V5')
    if not re.search(r'\bV5\b|\b5\.0', (ROOT / 'README.md').read_text(encoding='utf-8'), re.IGNORECASE):
        raise ValueError('README necesita documentar la entrega V5')
    descriptor, temporary = tempfile.mkstemp(dir=args.output.parent, suffix='.zip.tmp')
    os.close(descriptor)
    try:
        with ZipFile(temporary, 'w', ZIP_DEFLATED, compresslevel=7) as archive:
            for path in paths:
                archive.write(path, top + '/' + path.relative_to(ROOT).as_posix())
            archive.writestr(top + '/PACKAGE_MANIFEST.json', json.dumps(package, ensure_ascii=False, indent=2))
        with ZipFile(temporary) as archive:
            if archive.testzip() is not None:
                raise RuntimeError('ZIP corrupto')
            for entry in package['files']:
                if sha256(archive.read(top + '/' + entry['path'])).hexdigest() != entry['sha256']:
                    raise RuntimeError('Bytes alterados durante empaquetado: ' + entry['path'])
        os.replace(temporary, args.output)
    finally:
        if os.path.exists(temporary):
            os.unlink(temporary)
    print(f'{args.output}: {args.output.stat().st_size/1048576:.2f} MB, {len(paths)+1} archivos, integridad SHA256 OK')


if __name__ == '__main__':
    main()
