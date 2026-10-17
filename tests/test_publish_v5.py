"""Publisher checks use controlled temporary data, never production assets."""
from copy import deepcopy
from datetime import date, timedelta
import gzip
from hashlib import sha256
import json
from pathlib import Path
from tempfile import TemporaryDirectory
import unittest
from unittest.mock import patch

import duckdb
import pandas as pd

from scripts.publish_research_v5 import (HORIZONS, atomic_bytes, frame_hash, json_bytes,
                                         publish, research_code_hash, write_asset)


def fixture(folder):
    code = folder / 'code'; code.mkdir()
    (code / '__init__.py').write_text('# Controlled publisher fixture\n', encoding='utf-8')
    core = folder / 'core'; core.mkdir()
    output = folder / 'public'; output.mkdir()
    end = date(2026, 1, 12)
    rows = []
    for index in range(10):
        for offset in range(12):
            rows.append({'fecha': pd.Timestamp(end - timedelta(days=11-offset)),
                         'variedad': f'Variedad {index}', 'mercado_id': '15011501',
                         'mercado': 'GMML Lima', 'precio_s_kg': 2. + index/10,
                         'volumen_t': None if offset == 0 else 10.,
                         'source_url': 'https://www.gob.pe/datos-controlados'})
    prices = pd.DataFrame(rows)
    database = folder / 'warehouse.duckdb'
    with duckdb.connect(str(database)) as connection:
        connection.register('input_prices', prices)
        connection.execute('CREATE TABLE prices AS SELECT * FROM input_prices')
    report = {'schema_version': '5.0.0', 'run_id': 'research-v5-controlled',
              'code_hash': research_code_hash(code), 'input_hash': frame_hash(prices),
              'generated_at': '2026-01-12T12:00:00-05:00', 'series': [],
              'scope': 'Controlled fixture, never published as real data', 'versions': {},
              'protocol': {'horizons': list(HORIZONS)}, 'data_contract': {'price_unit': 'PEN/kg'}}
    core_index = {'series': []}
    for index in range(10):
        name = f'Variedad {index}'
        part = prices[prices.variedad == name].sort_values('fecha')
        y = part.set_index('fecha').precio_s_kg.asfreq('D')
        price = float(y.iloc[-1]); history_hash = sha256(y.to_csv().encode()).hexdigest()
        row = {'variety': name, 'market_id': '15011501', 'market': 'GMML Lima',
               'data_hash': history_hash, 'input_hash': frame_hash(part),
               'last_date': str(end), 'start': str(end-timedelta(days=11)),
               'last_price': price, 'observations': len(y), 'run_id': report['run_id'],
               'quality': {'observations': len(y)}, 'eda': {'statistics': {'mean': price}},
               'source_urls': ['https://www.gob.pe/datos-controlados'],
               'evaluations': [], 'forecasts_by_horizon': {}}
        for horizon in HORIZONS:
            paths = {}
            candidates = []
            audit_rows = {}
            for model in ('Naive', 'AR1 log · ventana validada'):
                curve = []
                for lead in range(1, horizon+1):
                    point_price = price + (.03 if model != 'Naive' else 0.)
                    curve.append({'date': str(end+timedelta(days=lead)), 'lead': lead,
                                  'price': point_price, 'low': point_price-.1,
                                  'high': point_price+.1, 'low95': point_price-.2,
                                  'high95': point_price+.2, 'model': model,
                                  'evaluated_horizon': horizon, 'status': 'referencia'})
                paths[model] = curve
                metric = {'mae': 0., 'rmse': 0., 'bias': 0., 'n': 1,
                          'coverage80': 1., 'coverage95': 1., 'wape': 0., 'mase': None}
                candidates.append({'model': model, 'audit': metric, 'selection': dict(metric),
                                   'endpoint_audit': None, 'bands': {'80': .1, '95': .2},
                                   'current_metadata': {'training_end': str(end)}})
                audit_rows[model] = [{'origin': str(end-timedelta(days=1)), 'date': str(end),
                                      'lead': 1, 'horizon': horizon, 'actual': price,
                                      'predicted': price, 'baseline': price, 'scale': 0.}]
            evaluation = {'horizon': horizon, 'forecast_paths': paths, 'candidates': candidates,
                          'published_model': 'Naive', 'selected_challenger': 'AR1 log · ventana validada',
                          'promoted': False, 'published_audit': candidates[0]['audit'],
                          'published_endpoint_audit': None, 'baseline_audit': candidates[0]['audit'],
                          'audit_rows': audit_rows, 'forecast': paths['Naive'],
                          'promotion_reasons': ['Controlled fixture'], 'phases': {}, 'sealed_test': {},
                          'comparison': {}, 'threshold_sensitivity': {}, 'gate': {}}
            row['evaluations'].append(evaluation)
            row['forecasts_by_horizon'][str(horizon)] = paths['Naive']
        row['forecast'] = row['forecasts_by_horizon']['240']
        report['series'].append(row)
        core_series = {k: v for k, v in row.items() if k not in {'evaluations', 'forecasts_by_horizon'}}
        core_series['history'] = [{'date': str(d.date()), 'price': float(p)} for d, p in y.items()]
        filename = sha256(json_bytes(core_series)).hexdigest()[:20] + '.json'
        (core / filename).write_bytes(json_bytes(core_series))
        core_index['series'].append({'variety': name, 'market_id': '15011501', 'file': filename})
    report_path = folder / 'report.json'; report_path.write_bytes(json_bytes(report))
    index_path = core / 'index.json'; index_path.write_bytes(json_bytes(core_index))
    previous = b'{"run_id":"previous-valid-run"}'
    (output / 'index.json').write_bytes(previous)
    return {'report': report, 'report_path': report_path, 'index': core_index,
            'core_index_path': index_path, 'database': database, 'output': output,
            'code': code, 'previous': previous}


class PublishV5(unittest.TestCase):
    def setUp(self):
        temporary_root = Path(__file__).resolve().parents[1] / 'data/v4'
        temporary_root.mkdir(parents=True, exist_ok=True)
        self.temporary = TemporaryDirectory(dir=temporary_root)
        self.folder = Path(self.temporary.name)
        self.fixture = fixture(self.folder)

    def tearDown(self):
        self.temporary.cleanup()

    def publish(self):
        f = self.fixture
        f['report_path'].write_bytes(json_bytes(f['report']))
        f['core_index_path'].write_bytes(json_bytes(f['index']))
        return publish(f['report_path'], f['core_index_path'], f['database'], f['output'], f['code'])

    def preserved(self):
        self.assertEqual((self.fixture['output'] / 'index.json').read_bytes(), self.fixture['previous'])

    def test_complete_lazy_manifest_compressed_decoded_checksums_and_lossless_rows(self):
        manifest = self.publish(); f = self.fixture
        self.assertEqual(len(manifest['series']), 10)
        self.assertEqual(manifest['schema_version'], '5.0.0')
        self.assertEqual(manifest['code_hash'], research_code_hash(f['code']))
        referenced = set()
        for series in manifest['series']:
            summary_path = f['output'] / series['file']
            summary = json.loads(summary_path.read_bytes())
            self.assertEqual(series['history_hash'], summary['history_hash'])
            self.assertFalse({'forecast', 'evaluations', 'forecasts_by_horizon'} & summary.keys())
            self.assertEqual(set(summary['details_by_horizon']), {str(h) for h in HORIZONS})
            referenced.add(series['file'])
            original = next(s for s in f['report']['series'] if s['variety'] == series['variety'])
            for horizon, filename in summary['details_by_horizon'].items():
                detail = json.loads((f['output'] / filename).read_bytes())
                self.assertEqual(detail['run_id'], manifest['run_id'])
                self.assertEqual(detail['as_of'], summary['last_date'])
                self.assertNotIn('audit_rows', detail); self.assertNotIn('forecast', detail)
                self.assertEqual(len(detail['forecast_paths']['Naive']), int(horizon))
                audit_name = detail['audit_file']; self.assertRegex(audit_name, r'^[a-f0-9]{64}\.json\.gz$')
                compressed = (f['output'] / audit_name).read_bytes()
                self.assertEqual(compressed[4:8], b'\0\0\0\0')
                decoded = gzip.decompress(compressed)
                self.assertEqual(detail['audit_content_sha256'], sha256(decoded).hexdigest())
                self.assertNotEqual(detail['audit_content_sha256'], audit_name[:64])
                audit = json.loads(decoded)
                self.assertEqual(audit['rows'], next(e for e in original['evaluations'] if e['horizon'] == int(horizon))['audit_rows'])
                referenced.update((filename, audit_name))
        self.assertEqual(len(referenced), 130)
        for filename in referenced:
            self.assertEqual(filename.split('.')[0], sha256((f['output'] / filename).read_bytes()).hexdigest())

    def test_republication_is_byte_identical_and_preserves_assets(self):
        self.publish()
        before = {p.name: p.read_bytes() for p in self.fixture['output'].iterdir()}
        self.publish()
        self.assertEqual(before, {p.name: p.read_bytes() for p in self.fixture['output'].iterdir()})

    def test_bad_curve_never_replaces_previous_index(self):
        for mutation, expected in (
            (lambda p: p.update(price=-1.), 'positivo'),
            (lambda p: p.update(low95=p['high95']+1.), 'anidadas'),
            (lambda p: p.update(date='2026-01-14'), 'corte y lead'),
            (lambda p: p.update(lead=2), 'lead'),
            (lambda p: p.update(model='Otro'), 'Modelo/horizonte'),
        ):
            with self.subTest(expected=expected):
                old = deepcopy(self.fixture['report'])
                point = self.fixture['report']['series'][0]['evaluations'][0]['forecast_paths']['Naive'][0]
                mutation(point)
                with self.assertRaisesRegex(ValueError, expected):
                    self.publish()
                self.preserved()
                self.fixture['report'] = old

    def test_missing_horizon_and_duplicate_series_are_refused(self):
        old = deepcopy(self.fixture['report'])
        self.fixture['report']['series'][0]['evaluations'].pop()
        with self.assertRaisesRegex(ValueError, 'seis horizontes'):
            self.publish()
        self.preserved()
        self.fixture['report'] = old
        self.fixture['report']['series'][1] = deepcopy(self.fixture['report']['series'][0])
        with self.assertRaisesRegex(ValueError, 'Catálogo'):
            self.publish()
        self.preserved()

    def test_changed_code_and_full_input_hash_are_refused(self):
        self.fixture['report']['code_hash'] = '0'*64
        with self.assertRaisesRegex(ValueError, 'Código cambió'):
            self.publish()
        self.preserved()
        self.fixture['report']['code_hash'] = research_code_hash(self.fixture['code'])
        with duckdb.connect(str(self.fixture['database'])) as connection:
            connection.execute('UPDATE prices SET volumen_t=17 WHERE volumen_t IS NOT NULL')
        with self.assertRaisesRegex(ValueError, 'Warehouse cambió'):
            self.publish()
        self.preserved()

    def test_hash_lineage_and_warehouse_prices_are_reconciled(self):
        self.fixture['report']['series'][0]['data_hash'] = 'f'*64
        with self.assertRaisesRegex(ValueError, 'Hash histórico'):
            self.publish()
        self.preserved()

    def test_tampered_core_history_fails_even_with_copied_history_hash(self):
        reference = self.fixture['index']['series'][0]
        path = self.fixture['core_index_path'].parent / reference['file']
        value = json.loads(path.read_bytes())
        value['history'][0]['price'] += 1.
        new_file = sha256(json_bytes(value)).hexdigest()[:20] + '.json'
        (path.parent / new_file).write_bytes(json_bytes(value))
        reference['file'] = new_file
        with self.assertRaisesRegex(ValueError, 'Precio operativo vs warehouse'):
            self.publish()
        self.preserved()

    def test_audit_metrics_and_observed_targets_are_independently_checked(self):
        evaluation = self.fixture['report']['series'][0]['evaluations'][0]
        evaluation['audit_rows']['Naive'][0]['actual'] += .5
        with self.assertRaisesRegex(ValueError, 'Objetivo de auditoría'):
            self.publish()
        self.preserved()
        evaluation['audit_rows']['Naive'][0]['actual'] -= .5
        evaluation['candidates'][0]['audit']['mae'] = .5
        with self.assertRaisesRegex(ValueError, 'Naive mae'):
            self.publish()
        self.preserved()

    def test_traversal_and_corrupt_operational_asset_are_refused(self):
        reference = self.fixture['index']['series'][0]
        old = reference['file']; reference['file'] = '../report.json'
        with self.assertRaisesRegex(ValueError, 'Referencia operativa'):
            self.publish()
        self.preserved(); reference['file'] = old
        path = self.fixture['core_index_path'].parent / old
        value = json.loads(path.read_bytes()); value['last_price'] += .1
        path.write_bytes(json_bytes(value))
        with self.assertRaisesRegex(ValueError, 'nombre de contenido'):
            self.publish()
        self.preserved()

    def test_existing_immutable_asset_corruption_does_not_publish(self):
        self.publish()
        summary_file = json.loads((self.fixture['output'] / 'index.json').read_bytes())['series'][0]['file']
        (self.fixture['output'] / summary_file).write_bytes(b'corrupt')
        (self.fixture['output'] / 'index.json').write_bytes(self.fixture['previous'])
        with self.assertRaisesRegex(ValueError, 'inmutable existente corrupto'):
            self.publish()
        self.preserved()

    def test_failed_atomic_index_replace_preserves_previous_publication(self):
        real_replace = __import__('os').replace
        def fail_index(source, destination):
            if Path(destination) == self.fixture['output'] / 'index.json':
                raise OSError('Controlled disk failure at publication point')
            return real_replace(source, destination)
        with patch('scripts.publish_research_v5.os.replace', side_effect=fail_index):
            with self.assertRaisesRegex(OSError, 'Controlled disk failure'):
                self.publish()
        self.preserved()
        self.assertFalse(list(self.fixture['output'].glob('*.tmp')))

    def test_nan_rejected_without_writing_or_replacing_manifest(self):
        self.fixture['report']['series'][0]['eda']['bad'] = float('nan')
        f = self.fixture
        f['report_path'].write_text(json.dumps(f['report']), encoding='utf-8')
        with self.assertRaisesRegex(ValueError, 'JSON no finito'):
            publish(f['report_path'], f['core_index_path'], f['database'], f['output'], f['code'])
        self.preserved()


if __name__ == '__main__':
    unittest.main()
