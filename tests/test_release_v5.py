"""Release sealing uses temporary controlled assets, never the live publication."""
from hashlib import sha256
import json
from pathlib import Path
from tempfile import TemporaryDirectory
import unittest
from unittest.mock import patch

from scripts.publish_release_v5 import reference, run, source_hash, source_bytes


def write_json(path, value):
    path.parent.mkdir(parents=True, exist_ok=True)
    path.write_bytes((json.dumps(value, ensure_ascii=False, indent=2)+'\n').encode())


def fixture(root):
    for directory in ('src', 'api', 'server', 'agrodecide', 'scripts'):
        (root/directory).mkdir()
    code = {'src/z.tsx': 'export const z = 1;\n',
            'src/A.ts': 'export const A = 2;\n',
            'src/b.ts': 'export const b = 3;\n',
            'src/b/index.ts': 'export const nested = 4;\n',
            'api/handler.ts': 'export const handler = true;\n',
            'server/bg.ts': 'export const background = false;\n',
            'agrodecide/__init__.py': 'VERSION = "controlled"\n',
            'scripts/x.py': 'print("controlled")\n',
            'requirements-v4.txt': 'pandas==2.2.2\n',
            'requirements-v5.txt': '-r requirements-v4.txt\n',
            '.gitattributes': 'public/research-v5/* -text\n',
            'vite.config.ts': 'export default {};\n'}
    for name, content in code.items():
        path = root/name; path.parent.mkdir(parents=True, exist_ok=True)
        path.write_bytes(content.encode())
    for name, value in (('package.json', {'version': '5.0.0'}),
                        ('package-lock.json', {'lockfileVersion': 3}),
                        ('vercel.json', {'buildCommand': 'npm run build'})):
        write_json(root/name, value)
    public = root/'public'
    core, research = {'series': []}, {'schema_version': '5.0.0', 'run_id': 'research-v5-controlled', 'series': []}
    for i in range(10):
        variety = f'Variedad {i}'; history_hash = sha256(variety.encode()).hexdigest()
        series = {'variety': variety, 'data_hash': history_hash,
                  'last_date': '2026-10-15', 'run_id': f'operational-controlled-{i}'}
        body = (json.dumps(series, ensure_ascii=False, indent=2)+'\n').encode()
        name = sha256(body).hexdigest()[:20]+'.json'
        path = public/'data'/name; path.parent.mkdir(parents=True, exist_ok=True); path.write_bytes(body)
        core['series'].append({'variety': variety, 'file': name})
        research['series'].append({'variety': variety, 'history_hash': history_hash})
    advanced = {'series': [{'variety': 'Variedad 0', 'data_hash': research['series'][0]['history_hash']}]}
    climate = {'as_of': '2026-10-16', 'evidence': [], 'controlled_fixture': True}
    for relative, value in (('data/index.json', core), ('research-v5/index.json', research),
                             ('forecasting/index.json', advanced), ('climate-v5/index.json', climate)):
        write_json(public/relative, value)
    previous = b'{"build_id":"previous-valid-release"}\n'
    (public/'release.json').write_bytes(previous)
    return {'core': core, 'research': research, 'advanced': advanced,
            'climate': climate, 'previous': previous, 'code': code}


class ReleaseV5(unittest.TestCase):
    def setUp(self):
        temporary_root = Path(__file__).resolve().parents[1]/'data/v4'
        temporary_root.mkdir(parents=True, exist_ok=True)
        self.temporary = TemporaryDirectory(dir=temporary_root)
        self.root = Path(self.temporary.name)
        self.value = fixture(self.root)

    def tearDown(self):
        self.temporary.cleanup()

    def preserved(self):
        self.assertEqual((self.root/'public/release.json').read_bytes(), self.value['previous'])

    def test_complete_ten_series_seal_and_climate_snapshot_are_coherent(self):
        with patch('scripts.publish_release_v5.validate_catalog') as validate:
            release = run(self.root)
        validate.assert_called_once_with(self.value['climate'])
        self.assertEqual(release['schema_version'], '5.0.0')
        self.assertEqual(release['version'], '5.0.0')
        self.assertEqual(release['research_run_id'], 'research-v5-controlled')
        self.assertEqual(len(release['operational_runs']), 10)
        self.assertEqual(release['data_as_of'], '2026-10-15')
        self.assertEqual(release['climate_as_of'], '2026-10-16')
        self.assertEqual(release['source_tree_sha256'], source_hash(self.root))
        self.assertEqual(json.loads((self.root/'public/release.json').read_bytes()), release)
        climate = (self.root/'public/climate-v5/index.json').read_bytes()
        snapshot = self.root/'public'/release['climate']['url'].lstrip('/')
        self.assertEqual(snapshot.read_bytes(), climate)
        self.assertEqual(snapshot.name, sha256(climate).hexdigest()+'.json')
        self.assertEqual(release['climate']['normalization'], 'none')

    def test_research_history_mismatch_never_overwrites_release(self):
        self.value['research']['series'][3]['history_hash'] = '0'*64
        write_json(self.root/'public/research-v5/index.json', self.value['research'])
        with patch('scripts.publish_release_v5.validate_catalog') as validate:
            with self.assertRaisesRegex(ValueError, 'Historia nueva'):
                run(self.root)
        validate.assert_not_called(); self.preserved()

    def test_advanced_history_mismatch_never_overwrites_release(self):
        self.value['advanced']['series'][0]['data_hash'] = 'f'*64
        write_json(self.root/'public/forecasting/index.json', self.value['advanced'])
        with patch('scripts.publish_release_v5.validate_catalog'):
            with self.assertRaisesRegex(ValueError, 'Motor avanzado'):
                run(self.root)
        self.preserved()

    def test_missing_variety_refuses_to_seal_catalog(self):
        self.value['research']['series'].pop()
        write_json(self.root/'public/research-v5/index.json', self.value['research'])
        with self.assertRaisesRegex(ValueError, 'catálogo'):
            run(self.root)
        self.preserved()

    def test_existing_corrupt_immutable_climate_snapshot_is_never_sealed(self):
        current = (self.root/'public/climate-v5/index.json').read_bytes()
        snapshot = self.root/'public/climate-v5'/(sha256(current).hexdigest()+'.json')
        snapshot.write_bytes(b'controlled corruption')
        with patch('scripts.publish_release_v5.validate_catalog'):
            with self.assertRaisesRegex(ValueError, 'inmutable corrupto'):
                run(self.root)
        self.preserved()
        self.assertEqual(snapshot.read_bytes(), b'controlled corruption')

    def test_climate_validation_failure_preserves_previous_release(self):
        with patch('scripts.publish_release_v5.validate_catalog', side_effect=ValueError('Controlled invalid climate')):
            with self.assertRaisesRegex(ValueError, 'Controlled invalid climate'):
                run(self.root)
        self.preserved()
        self.assertEqual(list((self.root/'public/climate-v5').glob('*.json')), [self.root/'public/climate-v5/index.json'])

    def test_reference_normalizes_legacy_indexes_but_keeps_evidence_bytes_exact(self):
        content = b'{\r\n  "controlled": true\r\n}\r\n'
        for directory in ('data', 'forecasting', 'research-v5', 'climate-v5'):
            with self.subTest(directory=directory):
                path = self.root/'public'/directory/'index.json'; path.write_bytes(content)
                result = reference(path, self.root)
                expected = content.replace(b'\r\n', b'\n') if directory in ('data', 'forecasting') else content
                self.assertEqual(result['sha256'], sha256(expected).hexdigest())
                self.assertEqual(result['bytes'], len(expected))
                self.assertEqual(result['normalization'], 'LF' if directory in ('data', 'forecasting') else 'none')
                self.assertEqual(result['url'], '/'+directory+'/index.json')

    def test_source_hash_is_canonical_path_sorted_and_normalizes_crlf(self):
        ordered = ['.gitattributes', 'agrodecide/__init__.py', 'api/handler.ts',
                   'package-lock.json', 'package.json', 'requirements-v4.txt',
                   'requirements-v5.txt', 'scripts/x.py', 'server/bg.ts', 'src/A.ts',
                   'src/b.ts', 'src/b/index.ts', 'src/z.tsx', 'vercel.json', 'vite.config.ts']
        content = b''.join(name.encode()+b'\0'+source_bytes(self.root/name)+b'\0' for name in ordered)
        expected = sha256(content).hexdigest()
        self.assertEqual(source_hash(self.root), expected)
        for name in ordered:
            path = self.root/name; path.write_bytes(path.read_bytes().replace(b'\n', b'\r\n'))
        self.assertEqual(source_hash(self.root), expected)

    def test_vercel_config_formatting_is_irrelevant_but_actual_settings_remain_protected(self):
        path=self.root/'vercel.json';value={'headers':[{'source':'/(.*)','headers':[{'key':'X-Content-Type-Options','value':'nosniff'}]}],'framework':'vite'}
        path.write_text(json.dumps(value,indent=2)+'\n',encoding='utf-8');before=source_hash(self.root)
        path.write_text(json.dumps(value,separators=(',',':'),sort_keys=True),encoding='utf-8');self.assertEqual(before,source_hash(self.root))
        value['headers'][0]['headers'][0]['value']='changed'
        path.write_text(json.dumps(value),encoding='utf-8');self.assertNotEqual(before,source_hash(self.root))

    def test_source_hash_ignores_documents_cache_and_data_but_detects_real_code_change(self):
        before = source_hash(self.root)
        for relative in ('docs/explanation.py', 'tests/control.py',
                         'agrodecide/__pycache__/cached.py', 'src/graphic.png', 'data/private.py'):
            path = self.root/relative; path.parent.mkdir(parents=True, exist_ok=True)
            path.write_bytes(b'not part of the source fingerprint\n')
        self.assertEqual(source_hash(self.root), before)
        (self.root/'src/z.tsx').write_bytes(b'export const z = 999;\n')
        self.assertNotEqual(source_hash(self.root), before)

    def test_build_id_is_stable_across_windows_legacy_index_and_code_line_endings(self):
        with patch('scripts.publish_release_v5.validate_catalog'):
            linux = run(self.root)
        for directory in ('data', 'forecasting'):
            path = self.root/'public'/directory/'index.json'
            path.write_bytes(path.read_bytes().replace(b'\n', b'\r\n'))
        for directory in ('src', 'api', 'server', 'agrodecide', 'scripts'):
            for path in (self.root/directory).rglob('*'):
                if path.is_file():
                    path.write_bytes(path.read_bytes().replace(b'\n', b'\r\n'))
        with patch('scripts.publish_release_v5.validate_catalog'):
            windows = run(self.root)
        self.assertEqual(windows['build_id'], linux['build_id'])
        self.assertEqual(windows['operational'], linux['operational'])
        self.assertEqual(windows['advanced'], linux['advanced'])
        self.assertEqual(windows['climate'], linux['climate'])


if __name__ == '__main__':
    unittest.main()
