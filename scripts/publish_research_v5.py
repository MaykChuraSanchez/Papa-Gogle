"""Publish validated V5 evidence without replacing operational V2 forecasts.

python scripts/publish_research_v5.py
All series/curves/lineage are checked before writing; index.json is replaced last.
Audit JSON is lossless gzip (mtime=0). Checksums address the actual served bytes.
"""
from __future__ import annotations

import argparse
from datetime import date, timedelta
import gzip
from hashlib import sha256
import io
import json
import math
import os
from pathlib import Path
import re
import tempfile

import duckdb
import pandas as pd

ROOT = Path(__file__).resolve().parents[1]
DATA = Path(os.getenv('AGRODECIDE_DATA', str(ROOT / 'data/v4')))
HORIZONS = (7, 15, 30, 90, 180, 240)
SCHEMA_VERSION = '5.0.0'
EXPECTED_SERIES = 10


def json_bytes(value):
    return json.dumps(value, ensure_ascii=False, allow_nan=False,
                      separators=(',', ':')).encode('utf-8')


def read_json(path):
    def invalid(value):
        raise ValueError('Número JSON no finito: ' + value)
    return json.loads(Path(path).read_text(encoding='utf-8'), parse_constant=invalid)


def research_code_hash(folder):
    files = sorted(Path(folder).glob('*.py'))
    if not files:
        raise ValueError('No hay código de investigación para verificar la ejecución')
    return sha256(b''.join(p.name.encode() + p.read_bytes() for p in files)).hexdigest()


def frame_hash(frame):
    ordered = frame.sort_values(['variedad', 'mercado_id', 'fecha']).reindex(sorted(frame.columns), axis=1)
    return sha256(ordered.to_csv(index=False, date_format='%Y-%m-%dT%H:%M:%S').encode()).hexdigest()


def number(value, label, positive=False):
    if isinstance(value, bool) or not isinstance(value, (int, float)) or not math.isfinite(value):
        raise ValueError(f'{label}: se requiere un número finito')
    if positive and value <= 0:
        raise ValueError(f'{label}: debe ser positivo')
    return float(value)


def day(value, label):
    if not isinstance(value, str) or not re.fullmatch(r'\d{4}-\d{2}-\d{2}', value):
        raise ValueError(f'{label}: fecha diaria inválida')
    try:
        return date.fromisoformat(value)
    except ValueError as exc:
        raise ValueError(f'{label}: fecha diaria inválida') from exc


def same_number(actual, expected, label):
    if not math.isclose(number(actual, label), number(expected, label), rel_tol=1e-12, abs_tol=1e-12):
        raise ValueError(f'{label}: valor no reconciliado')


def validate_curve(points, horizon, as_of, model):
    if not isinstance(points, list) or len(points) != horizon:
        raise ValueError(f'Curva {model} {horizon}: longitud incompleta')
    origin = day(as_of, 'Corte')
    for lead, point in enumerate(points, 1):
        if point.get('lead') != lead or isinstance(point.get('lead'), bool):
            raise ValueError('Secuencia de lead inválida')
        if day(point.get('date'), 'Fecha de pronóstico') != origin + timedelta(days=lead):
            raise ValueError('Fecha de pronóstico no corresponde al corte y lead')
        if point.get('model') != model or point.get('evaluated_horizon') != horizon:
            raise ValueError('Modelo/horizonte de curva no coincide con el detalle')
        price = number(point.get('price'), 'Precio pronosticado', positive=True)
        low, high, low95, high95 = [number(point.get(k), k, positive=True) for k in ('low', 'high', 'low95', 'high95')]
        if not low95 <= low <= price <= high <= high95:
            raise ValueError('Bandas no anidadas: 95 debe contener 80 y el punto')


def validate_audit(evaluation, observed):
    rows_by_model = evaluation.get('audit_rows')
    if not isinstance(rows_by_model, dict) or not rows_by_model or 'Naive' not in rows_by_model:
        raise ValueError('Auditoría fechada y baseline requeridos')
    candidates = {c['model']: c for c in evaluation['candidates']}
    horizon = evaluation['horizon']
    alignment = None
    for model, rows in rows_by_model.items():
        if model not in candidates or not rows:
            raise ValueError('Auditoría sin candidato o sin filas')
        identities = []
        for row in rows:
            origin = day(row.get('origin'), 'Origen de auditoría')
            target = day(row.get('date'), 'Objetivo de auditoría')
            lead = row.get('lead')
            if isinstance(lead, bool) or not isinstance(lead, int) or not 1 <= lead <= horizon or row.get('horizon') != horizon or target != origin + timedelta(days=lead):
                raise ValueError('Fecha/lead de auditoría incompatible')
            if str(origin) not in observed or str(target) not in observed:
                raise ValueError('La auditoría contiene un origen/objetivo sin cotización observada')
            same_number(row.get('actual'), observed[str(target)], 'Objetivo de auditoría')
            same_number(row.get('baseline'), observed[str(origin)], 'Baseline al origen')
            number(row.get('predicted'), 'Predicción auditada', positive=True)
            number(row.get('scale'), 'Escala auditada')
            identities.append((str(origin), str(target), lead))
        if len(set(identities)) != len(rows):
            raise ValueError('Objetivos de auditoría duplicados')
        if alignment is None:
            alignment = identities
        elif identities != alignment:
            raise ValueError('Auditorías comparadas con fechas distintas')
        errors = [row['predicted'] - row['actual'] for row in rows]
        metric = candidates[model]['audit']
        if metric.get('n') != len(rows):
            raise ValueError('n de auditoría no coincide con las filas')
        for key, value in {'mae': sum(abs(x) for x in errors) / len(rows),
                           'rmse': math.sqrt(sum(x*x for x in errors) / len(rows)),
                           'bias': sum(errors) / len(rows)}.items():
            same_number(metric.get(key), value, f'{model} {key}')
        bands = candidates[model].get('bands', {})
        for level in ('80', '95'):
            if level in bands:
                width = number(bands[level], 'Ancho ' + level)
                if width < 0:
                    raise ValueError('Ancho de banda negativo')
                coverage = sum(abs(x) <= width for x in errors) / len(rows)
                same_number(metric.get('coverage' + level), coverage, 'Cobertura auditada ' + level)
    published = candidates.get(evaluation.get('published_model'))
    if not published or published['audit'] != evaluation.get('published_audit'):
        raise ValueError('Métricas del modelo publicado no corresponden al candidato')
    if candidates['Naive']['audit'] != evaluation.get('baseline_audit'):
        raise ValueError('Métricas baseline no reconciliadas')


def validate(report, core_index, core_folder, prices, code_folder):
    if report.get('schema_version') != SCHEMA_VERSION:
        raise ValueError('Versión del reporte incompatible')
    if not isinstance(report.get('run_id'), str) or not report['run_id'].startswith('research-v5-'):
        raise ValueError('run_id de investigación inválido')
    if report.get('code_hash') != research_code_hash(code_folder):
        raise ValueError('Código cambió después de generar el reporte; repetir investigación')
    if report.get('input_hash') != frame_hash(prices):
        raise ValueError('Warehouse cambió después de generar el reporte; repetir investigación')
    rows, cores = report.get('series', []), core_index.get('series', [])
    if len(rows) != EXPECTED_SERIES or len(cores) != EXPECTED_SERIES:
        raise ValueError('Se requieren las diez series completas del catálogo vigente')
    identity = lambda r: (r['variety'], str(r['market_id']))
    if len({identity(r) for r in rows}) != EXPECTED_SERIES or {identity(r) for r in rows} != {identity(r) for r in cores}:
        raise ValueError('Catálogo de investigación y operativo no coincide')
    if prices.duplicated(['variedad', 'mercado_id', 'fecha']).any():
        raise ValueError('Warehouse con identidades diarias duplicadas')
    selected = []
    for row in rows:
        core_reference = next(c for c in cores if identity(c) == identity(row))
        name = core_reference.get('file', '')
        if not re.fullmatch(r'[a-f0-9]{20}\.json', name):
            raise ValueError('Referencia operativa inválida')
        core = read_json(Path(core_folder) / name)
        if sha256(json_bytes(core)).hexdigest()[:20] + '.json' != name:
            raise ValueError('El archivo operativo no coincide con su nombre de contenido')
        if identity(core) != identity(row) or core.get('last_date') != row.get('last_date') or row.get('run_id') != report['run_id']:
            raise ValueError('Identidad/corte/run del reporte incompatible con la publicación')
        part = prices[(prices.variedad == row['variety']) & (prices.mercado_id.astype(str) == str(row['market_id']))].sort_values('fecha')
        if part.empty:
            raise ValueError('Serie sin datos en warehouse')
        dates = pd.to_datetime(part.fecha, errors='raise')
        if not (dates == dates.dt.normalize()).all():
            raise ValueError('La fecha del warehouse no tiene granularidad diaria')
        history = {str(d.date()): number(float(p), 'Precio observado', positive=True) for d, p in zip(dates, part.precio_s_kg)}
        daily = part.set_index(pd.DatetimeIndex(dates, name='fecha')).precio_s_kg.asfreq('D')
        history_hash = sha256(daily.to_csv().encode()).hexdigest()
        if row.get('data_hash') != history_hash or core.get('data_hash') != history_hash:
            raise ValueError('Hash histórico V2/investigación/warehouse no coincide')
        if row.get('input_hash') != frame_hash(part):
            raise ValueError('Hash de la entrada por serie no coincide')
        if row.get('last_date') != max(history) or row.get('start') != min(history) or row.get('observations') != len(history):
            raise ValueError('Rango/conteo histórico no coincide con warehouse')
        same_number(row.get('last_price'), history[max(history)], 'Último precio del reporte')
        same_number(core.get('last_price'), history[max(history)], 'Último precio operativo')
        published_history = core.get('history', [])
        if len(published_history) != len(history) or len({p['date'] for p in published_history}) != len(history):
            raise ValueError('Historia operativa incompleta o duplicada')
        for point in published_history:
            if point.get('date') not in history:
                raise ValueError('Fecha operativa ausente en warehouse')
            same_number(point.get('price'), history[point['date']], 'Precio operativo vs warehouse')
        evaluations = row.get('evaluations', [])
        if len(evaluations) != len(HORIZONS) or {e.get('horizon') for e in evaluations} != set(HORIZONS) or set(row.get('forecasts_by_horizon', {})) != {str(h) for h in HORIZONS}:
            raise ValueError('Se requieren seis horizontes completos por variedad')
        for evaluation in evaluations:
            horizon = evaluation['horizon']
            paths = evaluation.get('forecast_paths', {})
            if not paths or 'Naive' not in paths or evaluation.get('published_model') not in paths:
                raise ValueError('Falta la curva publicada o el baseline')
            candidates = evaluation.get('candidates', [])
            if len({c['model'] for c in candidates}) != len(candidates):
                raise ValueError('Candidatos duplicados')
            for model, curve in paths.items():
                if model not in {c['model'] for c in candidates}:
                    raise ValueError('Curva sin candidato evaluado')
                validate_curve(curve, horizon, row['last_date'], model)
            published = paths[evaluation['published_model']]
            if evaluation.get('forecast') != published or row['forecasts_by_horizon'][str(horizon)] != published:
                raise ValueError('Curva publicada y copia de horizonte no coinciden')
            validate_audit(evaluation, history)
        if row.get('forecast') != row['forecasts_by_horizon']['240']:
            raise ValueError('La curva resumen de 240 días no coincide')
        selected.append((row, history_hash))
    # Also reject nonfinite fields outside the prediction arrays before any write.
    json_bytes(report)
    return selected


def atomic_bytes(path, body):
    path = Path(path)
    path.parent.mkdir(parents=True, exist_ok=True)
    descriptor, temporary = tempfile.mkstemp(dir=path.parent, suffix='.tmp')
    try:
        with os.fdopen(descriptor, 'wb') as stream:
            stream.write(body)
            stream.flush()
            os.fsync(stream.fileno())
        os.replace(temporary, path)
    finally:
        if os.path.exists(temporary):
            os.unlink(temporary)


def write_asset(folder, value, compressed=False):
    body = json_bytes(value)
    if compressed:
        stream = io.BytesIO()
        # GzipFile emits a fixed OS byte, unlike gzip.compress on Python 3.11/12.
        with gzip.GzipFile(filename='', mode='wb', fileobj=stream, compresslevel=9, mtime=0) as archive:
            archive.write(body)
        body = stream.getvalue()
    filename = sha256(body).hexdigest() + ('.json.gz' if compressed else '.json')
    target = Path(folder) / filename
    if target.exists():
        if target.read_bytes() != body:
            raise ValueError('Asset inmutable existente corrupto: ' + filename)
    else:
        atomic_bytes(target, body)
    return filename


def publish(report_path=None, core_index_path=None, warehouse_path=None,
            output_folder=None, code_folder=None):
    report_path = Path(report_path or DATA / 'research_v5/report.json')
    core_index_path = Path(core_index_path or ROOT / 'public/data/index.json')
    warehouse_path = Path(warehouse_path or DATA / 'warehouse.duckdb')
    output_folder = Path(output_folder or ROOT / 'public/research-v5')
    code_folder = Path(code_folder or ROOT / 'agrodecide/research_v5')
    report, core_index = read_json(report_path), read_json(core_index_path)
    with duckdb.connect(str(warehouse_path), read_only=True) as connection:
        prices = connection.execute('SELECT * FROM prices ORDER BY variedad,mercado_id,fecha').df()
    selected = validate(report, core_index, core_index_path.parent, prices, code_folder)
    index = {k: report[k] for k in ('schema_version', 'run_id', 'code_hash', 'input_hash', 'generated_at', 'scope', 'protocol', 'data_contract', 'versions', 'multiplicity_tests', 'promoted_combinations') if k in report}
    index['series'] = []
    for row, history_hash in selected:
        details = {}
        for evaluation in row['evaluations']:
            horizon = evaluation['horizon']
            audit_file = write_asset(output_folder, {'run_id': report['run_id'], 'variety': row['variety'], 'horizon': horizon, 'rows': evaluation['audit_rows']}, compressed=True)
            # A server may apply Content-Encoding:gzip to .gz files; fetch then
            # exposes decoded JSON bytes. Bind both representations to this
            # immutable detail, rather than trusting an unchecked decoded body.
            audit_content_sha256 = sha256(gzip.decompress((output_folder / audit_file).read_bytes())).hexdigest()
            detail = {k: v for k, v in evaluation.items() if k not in {'audit_rows', 'forecast'}}
            detail.update(run_id=report['run_id'], variety=row['variety'], as_of=row['last_date'],
                          audit_file=audit_file, audit_content_sha256=audit_content_sha256)
            details[str(horizon)] = write_asset(output_folder, detail)
        summary = {k: v for k, v in row.items() if k not in {'forecast', 'evaluations', 'forecasts_by_horizon'}}
        summary.update(history_hash=history_hash, details_by_horizon=details)
        filename = write_asset(output_folder, summary)
        index['series'].append({'variety': row['variety'], 'market_id': row['market_id'], 'history_hash': history_hash, 'last_date': row['last_date'], 'file': filename})
    # The only mutable publication pointer. Any earlier failure preserves it.
    atomic_bytes(output_folder / 'index.json', json_bytes(index))
    return index


if __name__ == '__main__':
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('--report', type=Path)
    parser.add_argument('--core-index', type=Path)
    parser.add_argument('--warehouse', type=Path)
    parser.add_argument('--output', type=Path)
    args = parser.parse_args()
    manifest = publish(args.report, args.core_index, args.warehouse, args.output)
    print(json.dumps({'run_id': manifest['run_id'], 'series': len(manifest['series']), 'horizons_per_series': len(HORIZONS), 'publication': str(args.output or ROOT / 'public/research-v5/index.json')}, ensure_ascii=False))
