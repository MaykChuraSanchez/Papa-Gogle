from pathlib import Path
import tempfile
import unittest
from unittest.mock import patch
import json
import numpy as np
import pandas as pd
from agrodecide.v4.sisap import parse_prices,SchemaError,number,Client
from agrodecide.v4.modeling import series,causal_values,predict,metrics,evaluate
from agrodecide.v4.storage import atomic_json,identifier

def response(price='2.20',volume='...'):
    return f'''<table><tr><td rowspan="2">Fecha</td><td colspan="2">Papa Canchan</td></tr>
    <tr><td>Precio Promedio <br/><small>(S/. x Kg., S/. x Lt. o S/. x Unid.)</small></td><td>Volumen <br/>(t)</td></tr>
    <tr><td>14/10/2026</td><td>{price}</td><td>{volume}</td></tr></table>'''.encode()

class Contracts(unittest.TestCase):
    def test_null_volume_is_not_zero(self):
        d=parse_prices(response(),'2026-10-01','2026-10-15')
        self.assertTrue(pd.isna(d.volumen_t.iloc[0]));self.assertEqual(d.precio_s_kg.iloc[0],2.2)
    def test_fail_closed_changed_schema_and_units(self):
        for content in [response().replace(b'Papa Canchan',b'Consultas'),response().replace(b'Volumen',b'Ingreso'),response('-1'),response('200'),b'<html>error</html>']:
            with self.assertRaises((SchemaError,ValueError)):
                parse_prices(content,'2026-10-01','2026-10-15')
    def test_wrong_date_and_duplicates(self):
        with self.assertRaises(SchemaError):parse_prices(response(),'2026-09-01','2026-09-30')
        extra=response().replace(b'</table>',b'<tr><td>14/10/2026</td><td>2.2</td><td>0</td></tr></table>')
        with self.assertRaises(SchemaError):parse_prices(extra,'2026-10-01','2026-10-15')
    def test_zero_observed_volume(self):
        self.assertEqual(parse_prices(response(volume='0'),'2026-10-01','2026-10-15').volumen_t.iloc[0],0)
    def test_cache_integrity(self):
        import hashlib
        with tempfile.TemporaryDirectory() as tmp,patch('agrodecide.v4.sisap.DATA',Path(tmp)):
            root=Path(tmp);archive=root/'sample.html';archive.write_bytes(response())
            cache=root/'cache/sisap/15011501_2026-10.json'
            atomic_json(cache,{'archive':'sample.html','start':'2026-10-01','end':'2026-10-15','sha256':hashlib.sha256(response()).hexdigest()})
            d,state=Client().month('2026-10-01','2026-10-15',offline=True)
            self.assertEqual(state,'CACHE');self.assertEqual(len(d),1)
            archive.write_bytes(b'corrupt')
            with self.assertRaises(FileNotFoundError):Client().month('2026-10-01','2026-10-15',offline=True)
    def test_no_silent_causal_leakage(self):
        y=pd.Series([np.nan,2.,np.nan,50.])
        v=causal_values(y)
        self.assertTrue(np.isnan(v[0]));self.assertEqual(v[2],2.)
        y.iloc[-1]=500.;self.assertEqual(causal_values(y)[2],2.)
    def test_no_market_pooling(self):
        frame=pd.DataFrame({'fecha':['2025-01-01','2025-01-02'],'variedad':['A','A'],'mercado_id':['a','b'],'precio_s_kg':[1.,20.]})
        with self.assertRaises(ValueError):series(frame)
    def test_forecast_does_not_need_future_truth(self):
        y=pd.Series(2.+np.sin(np.arange(1100)/365*2*np.pi)*.3,index=pd.date_range('2020-01-01',periods=1100))
        p=predict('Ridge directo',y,120)
        self.assertEqual(len(p),120);self.assertTrue(np.isfinite(p).all());self.assertTrue((p>0).all())
        with self.assertRaises(ValueError):predict('Ridge directo',y,241)
    def test_missing_targets_not_scored(self):
        m=metrics(np.array([1.,np.nan,3.]),np.array([2.,100.,3.]))
        self.assertEqual(m['n'],2);self.assertEqual(m['mae'],.5)
    def test_audit_is_separate_and_folds_do_not_overlap(self):
        y=pd.Series(2.+np.sin(np.arange(1200)/60)*.2,index=pd.date_range('2020-01-01',periods=1200))
        r=evaluate(y,30,['Último precio','Media 28 días'])
        origins=pd.to_datetime(r['origins'])
        self.assertEqual(len(origins),8);self.assertTrue(((origins[1:]-origins[:-1]).days==30).all())
        self.assertEqual(r['audit']['n'],60)
    def test_failed_refresh_preserves_previous_json(self):
        with tempfile.TemporaryDirectory() as tmp:
            path=Path(tmp)/'artifact.json';atomic_json(path,{'good':1})
            with self.assertRaises(ValueError):atomic_json(path,{'broken':float('nan')})
            self.assertEqual(json.loads(path.read_text()),{'good':1})
    def test_identifiers_are_validated(self):
        with self.assertRaises(ValueError):identifier('prices; DROP TABLE prices')
    def test_network_failure_does_not_replace_good_prices(self):
        from agrodecide.v4.ingest import run
        old=pd.DataFrame({'fecha':[pd.Timestamp('2026-09-30')]})
        with tempfile.TemporaryDirectory() as tmp,patch('agrodecide.v4.ingest.DATA',Path(tmp)),patch('agrodecide.v4.ingest.Client') as client,patch('agrodecide.v4.ingest.read',return_value=old),patch('agrodecide.v4.ingest.replace') as replace:
            client.return_value.month.side_effect=ConnectionError('Portal caído')
            status=run('2026-10-01','2026-10-15')
            self.assertEqual(status['state'],'DEGRADED')
            self.assertEqual([c.args[0] for c in replace.call_args_list],['ingestion_log'])

if __name__=='__main__':unittest.main()
