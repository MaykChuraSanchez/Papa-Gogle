"""Controlled synthetic fixtures only; production inputs always come from sources."""
from pathlib import Path
from tempfile import TemporaryDirectory
from unittest.mock import patch,Mock
import json
import unittest
import numpy as np
import pandas as pd
from agrodecide.forecasting.data import MarketCalendar,master,asof_series,import_vintages
from agrodecide.forecasting.features import prices,alert_features,build
from agrodecide.forecasting.models import CLASSICAL,MULTIVARIATE,classical,multivariate
from agrodecide.forecasting.engine import score,origins,quantile,combine_rows
from agrodecide.forecasting.sources import bulletin_date,parse_bulletin,get

def synthetic(n=1460):
    dates=pd.date_range('2019-01-01',periods=n)
    value=2.+.3*np.sin(np.arange(n)*2*np.pi/365)+.08*np.sin(np.arange(n)*2*np.pi/7)
    return pd.Series(value,index=dates)

def frame(y):return pd.DataFrame({'fecha':y.index,'variedad':'Única','mercado_id':'15011501','mercado':'GMML Lima','producto':'Papa','nivel':'mayorista','precio_s_kg':y.to_numpy(),'volumen_t':100.,'fuente':'MIDAGRI SISAP'})

def alert(date,state='no activo',method='ENFEN 01-2015'):
    return {'fecha_disponibilidad':date,'clasificacion':state,'version_metodologica':method}

class ForecastingContracts(unittest.TestCase):
    def test_calendar_does_not_assume_sunday_is_closed(self):
        dates=MarketCalendar().dates('2026-10-10',2)
        self.assertEqual(str(dates[0].date()),'2026-10-11')
        business=MarketCalendar(weekdays=(0,1,2,3,4),closed=('2026-10-12',)).dates('2026-10-09',2,'market')
        self.assertEqual([str(d.date()) for d in business],['2026-10-13','2026-10-14'])

    def test_master_keeps_unknown_release_dates_unknown(self):
        f=frame(synthetic(10));x=master(f)
        self.assertTrue(x.fecha_publicacion.isna().all());self.assertTrue(x.fecha_disponibilidad.isna().all())
        self.assertTrue(x.unidad_precio.eq('PEN/kg').all())
        f.loc[0,'precio_s_kg']=0
        with self.assertRaises(ValueError):master(f)

    def test_master_rejects_mixed_units_and_duplicate_identity(self):
        f=frame(synthetic(10));f=pd.concat([f,f.iloc[[0]]])
        with self.assertRaises(ValueError):master(f)

    def test_price_features_do_not_see_a_future_spike(self):
        y=synthetic();a=prices(y).iloc[1000].copy();y.iloc[1001:]=999
        pd.testing.assert_series_equal(a,prices(y).iloc[1000])
        self.assertEqual(a.precio_lag_1,synthetic().iloc[1000])

    def test_alert_is_not_available_on_or_before_its_release(self):
        d=pd.date_range('2020-01-01',periods=5);f=alert_features(d,[alert('2020-01-04','alerta de el nino costero')])
        self.assertEqual(f.enfen_conocido_lag0.iloc[2],0)
        self.assertTrue(pd.isna(f.enfen_v0_lag0_s1.iloc[2]))
        self.assertEqual(f.enfen_v0_lag0_s1.iloc[3],1)

    def test_future_bulletin_cannot_rewrite_past_features(self):
        dates=pd.date_range('2020-01-01',periods=60);records=[alert('2019-12-31')]
        a=alert_features(dates,records)
        b=alert_features(dates,records+[alert('2020-03-10','alerta de el nino costero')])
        pd.testing.assert_frame_equal(a,b)

    def test_methodological_regimes_remain_separate(self):
        d=pd.date_range('2026-02-01',periods=10)
        f=alert_features(d,[alert('2026-01-20','no activo','ENFEN 02-2024'),alert('2026-02-06','alerta de el nino costero','ENFEN 02-2026')])
        self.assertEqual(f.enfen_v1_lag0_s0.iloc[0],1);self.assertEqual(f.enfen_v2_lag0_s1.iloc[-1],1)
        self.assertEqual(f.enfen_v1_lag0_s0.iloc[-1],0)

    def test_monthly_values_join_on_release_not_observation_month(self):
        x=pd.DataFrame({'variable':['ICEN','ICEN'],'metodologia':['v1','v1'],'region':['Nino 1+2']*2,'vintage_eligible':[True,True],
            'periodo_observacion':['2020-01-01']*2,'fecha_disponibilidad':['2020-03-10','2020-06-10'],'valor':[.5,1.2]})
        dates=pd.to_datetime(['2020-02-15','2020-04-01','2020-07-01']);s=asof_series(x,'ICEN',dates)
        self.assertTrue(np.isnan(s.iloc[0]));self.assertEqual(s.iloc[1],.5);self.assertEqual(s.iloc[2],1.2)

    def test_current_revised_table_is_not_a_historical_vintage(self):
        x=pd.DataFrame({'variable':['ICEN'],'metodologia':['v2024'],'vintage_eligible':[False],'periodo_observacion':['2020-01-01'],'fecha_disponibilidad':['2026-10-15'],'valor':[1.2]})
        self.assertTrue(asof_series(x,'ICEN',pd.date_range('2020-01-01',periods=2)).isna().all())

    def test_ocean_regions_are_not_accidentally_pooled(self):
        x=pd.DataFrame({'variable':['anomalia']*2,'metodologia':['v1']*2,'region':['Nino 1+2','Nino 3.4'],'vintage_eligible':[True,True]})
        with self.assertRaises(ValueError):asof_series(x,'anomalia',pd.date_range('2020-01-01',periods=2))

    def test_import_requires_real_availability_and_explicit_price_units(self):
        with TemporaryDirectory() as tmp:
            path=Path(tmp)/'controlled.csv'
            x=pd.DataFrame({'variable':['precio'],'periodo_observacion':['2020-01-01'],'valor':[10.],'unidad':['PEN/saco'],'fuente':['EMMSA'],'source_url':['https://www.emmsa.com.pe/'],'fecha_publicacion':['2020-01-02'],'fecha_disponibilidad':['2020-01-03'],'metodologia':['v1'],'tipo_registro':['observado']})
            x.to_csv(path,index=False)
            with self.assertRaises(ValueError):import_vintages(path)
            x.unidad='PEN/kg';x.fecha_disponibilidad='2019-12-01';x.to_csv(path,index=False)
            with self.assertRaises(ValueError):import_vintages(path)

    def test_temporal_phases_and_ensemble_weight_targets_are_purged(self):
        y=synthetic(2845)
        for horizon in [7,15,30,90,180,240]:
            plan=origins(y,horizon)
            self.assertEqual([len(v) for v in plan.values()],[6,6,6])
            self.assertLessEqual(plan['selection'][-1]+pd.Timedelta(days=horizon),plan['calibration'][0])
            self.assertLessEqual(plan['calibration'][-1]+pd.Timedelta(days=horizon),plan['audit'][0])
            self.assertLessEqual(plan['selection'][2]+pd.Timedelta(days=horizon),plan['selection'][3])
            self.assertLessEqual(plan['audit'][-1]+pd.Timedelta(days=horizon),y.index[-1])

    def test_metrics_have_correct_units_and_ignore_missing_targets(self):
        s=score([1,2,3,np.nan],[2,2,2,999],scale=[.5,.5,.5,.5])
        self.assertAlmostEqual(s['mae'],2/3);self.assertAlmostEqual(s['wape'],100/3)
        self.assertAlmostEqual(s['mase'],4/3);self.assertEqual(s['bias'],0);self.assertEqual(s['n'],3)

    def test_intervals_use_calibration_errors_not_arbitrary_percentages(self):
        self.assertEqual(quantile(np.arange(100),.8),81)
        self.assertGreaterEqual(quantile(np.arange(100),.95),quantile(np.arange(100),.8))
        with self.assertRaises(ValueError):quantile([.1,.2],.95)

    def test_ensemble_refuses_misaligned_target_dates(self):
        a=[{'origin':'2020-01-01','date':'2020-01-02','predicted':1.}]
        b=[{'origin':'2020-01-01','date':'2020-01-03','predicted':2.}]
        with self.assertRaises(ValueError):combine_rows([a,b],[.5,.5])
        result=combine_rows([a,[{**a[0],'predicted':3.}]],[.25,.75])
        self.assertEqual(result[0]['predicted'],2.5)

    def test_classical_api_cannot_accept_external_features(self):
        with self.assertRaises(TypeError):classical('Naive',synthetic(),7,exogenous=np.ones((1460,2)))
        self.assertEqual(len(CLASSICAL),10);self.assertEqual(len(MULTIVARIATE),6)

    def test_all_ten_classical_implementations_execute_independently(self):
        y=synthetic()
        for name in CLASSICAL:
            with self.subTest(name=name):
                p,meta=classical(name,y,15)
                self.assertEqual(len(p),15);self.assertTrue(np.isfinite(p).all())
                self.assertEqual(meta['features'],['precio histórico'])

    def test_sarimax_requires_external_covariates(self):
        y=synthetic();f=build(frame(y),y,[])
        with self.assertRaises(ValueError):multivariate('SARIMAX',y,f,7,'A')

    def test_direct_and_recursive_use_no_future_covariate_observations(self):
        y=synthetic();f=build(frame(y),y,[alert('2019-01-01')])
        train=y.iloc[:-30];x=f.iloc[:-30].copy()
        for strategy in ['direct','recursive']:
            a,_=multivariate('Decision Tree',train,x,7,'B',strategy)
            changed=f.copy();changed.iloc[-30:,:]=999
            b,_=multivariate('Decision Tree',train,changed.iloc[:-30],7,'B',strategy)
            np.testing.assert_allclose(a,b)

    def test_bulletin_dates_and_categorical_alert_are_not_an_ocean_index(self):
        self.assertEqual(str(bulletin_date('COMUNICADO 28 setiembre 2026').date()),'2026-09-28')
        text='COMUNICADO OFICIAL ENFEN 04 de enero de 2019 Estado de sistema de alerta: Alerta de El Niño'
        doc=Mock();doc.pages=[Mock()];doc.pages[0].extract_text.return_value=text
        info={'url':'https://enfen.imarpe.gob.pe/download/sample?ind=1546634457697','sha256':'abc','file':'bronze/sample.pdf','retrieved_at':'2026-10-15'}
        with patch('agrodecide.forecasting.sources.PdfReader',return_value=doc):r=parse_bulletin(b'controlled',info,info['url'])
        self.assertIsNone(r['valor']);self.assertEqual(r['indice'],'ALERTA_ENFEN');self.assertEqual(r['fecha_disponibilidad'],'2019-01-05')

    def test_late_archive_upload_cannot_be_backdated_to_printed_date(self):
        text='COMUNICADO OFICIAL ENFEN 04 de enero de 2019 Estado del sistema de alerta: Alerta de El Niño'
        doc=Mock();doc.pages=[Mock()];doc.pages[0].extract_text.return_value=text
        info={'url':'https://enfen.imarpe.gob.pe/download/sample?ind=1704153600000','sha256':'abc','file':'bronze/sample.pdf','retrieved_at':'2026-10-15'}
        with patch('agrodecide.forecasting.sources.PdfReader',return_value=doc):r=parse_bulletin(b'controlled',info,info['url'])
        self.assertEqual(r['fecha_disponibilidad'],'2024-01-02');self.assertTrue(r['vintage_eligible'])
        info['url']='https://enfen.imarpe.gob.pe/download/sample'
        with patch('agrodecide.forecasting.sources.PdfReader',return_value=doc):r=parse_bulletin(b'controlled',info,info['url'])
        self.assertFalse(r['vintage_eligible']);self.assertEqual(r['fecha_disponibilidad'],'2026-10-15')

    def test_delayed_older_bulletin_never_supersedes_newer_issue(self):
        records=[{**alert('2024-01-02','no activo'),'fecha_publicacion':'2024-01-01'},
                 {**alert('2024-01-05','alerta de el nino costero'),'fecha_publicacion':'2023-03-01'}]
        f=alert_features(pd.date_range('2024-01-02',periods=8),records)
        self.assertTrue(f.enfen_v0_lag0_s0.eq(1).all())

    def test_latest_issued_bulletin_wins_for_same_release_day(self):
        records=[{**alert('2024-01-05','no activo'),'fecha_publicacion':'2024-01-04'},
                 {**alert('2024-01-05','alerta de el nino costero'),'fecha_publicacion':'2024-01-01'}]
        f=alert_features(pd.date_range('2024-01-05',periods=2),records)
        self.assertTrue(f.enfen_v0_lag0_s0.eq(1).all())

    def test_stale_or_unknown_alert_is_not_interpreted_as_neutral(self):
        dates=pd.date_range('2024-05-01',periods=2)
        f=alert_features(dates,[alert('2024-01-01')])
        self.assertTrue(f.enfen_conocido_lag0.eq(0).all());self.assertTrue(f.enfen_v0_lag0_s0.isna().all())
        y=synthetic();features=build(frame(y),y,[])
        with self.assertRaisesRegex(ValueError,'alerta ENFEN'):multivariate('Decision Tree',y,features,7,'A+ENFEN')

    def test_scenario_changes_current_category_without_rewriting_lags_or_index(self):
        from agrodecide.forecasting.models import apply_scenario
        names=['enfen_v2_lag0_s0','enfen_v2_lag0_s1','enfen_v2_lag1_s0','enfen_indice_ICEN_lag_1','precio_lag_1']
        x=np.array([[1.,0.,1.,.7,2.]])
        result=apply_scenario(x,names,1)
        np.testing.assert_allclose(result,[[0.,1.,1.,.7,2.]])
        np.testing.assert_allclose(x,[[1.,0.,1.,.7,2.]])

    def test_all_six_multivariable_families_produce_serializable_metadata(self):
        y=synthetic();features=build(frame(y),y,[alert(str(y.index[-1].date()))])
        for name in MULTIVARIATE:
            with self.subTest(name=name):
                p,meta=multivariate(name,y,features,7,'B')
                self.assertEqual(len(p),7);self.assertTrue(np.isfinite(p).all())
                json.dumps(meta,allow_nan=False)

    def test_offline_cache_corruption_fails_closed(self):
        from hashlib import sha256
        with TemporaryDirectory() as tmp,patch('agrodecide.forecasting.sources.ROOT',Path(tmp)),patch('agrodecide.forecasting.sources.DATA',Path(tmp)):
            url='https://enfen.imarpe.gob.pe/test';key=sha256(('GET'+url).encode()).hexdigest();cache=Path(tmp)/'cache';cache.mkdir()
            raw=Path(tmp)/'raw';raw.write_bytes(b'changed')
            (cache/(key+'.json')).write_text(json.dumps({'file':'raw','sha256':sha256(b'original').hexdigest(),'retrieved_at':'2020-01-01'}))
            with self.assertRaises(FileNotFoundError):get(url,offline=True)

    def test_model_cache_reuses_fit_and_invalidates_when_prices_change(self):
        from agrodecide.forecasting.engine import prediction
        spec={'id':'Naive | PRICE_ONLY | classical','name':'Naive','configuration':'PRICE_ONLY','strategy':'classical','family':'Clásico','deployable':True}
        y=synthetic();f=prices(y)
        with TemporaryDirectory() as tmp,patch('agrodecide.forecasting.engine.FOLDER',Path(tmp)),patch('agrodecide.forecasting.engine.classical',return_value=(np.repeat(2.,240),{'features':['precio histórico']})) as fit:
            prediction(spec,y,f,7);prediction(spec,y,f,30)
            self.assertEqual(fit.call_count,1)
            changed=y.copy();changed.iloc[-1]+=1
            prediction(spec,changed,prices(changed),7)
            self.assertEqual(fit.call_count,2)

    def test_currency_quantile_boundary_is_covered_consistently(self):
        from agrodecide.forecasting.enrich import interval_contains
        self.assertTrue(interval_contains(2.,2.2,.19999999999999996))
        self.assertFalse(interval_contains(1.999,2.2,.19999999999999996))
        self.assertTrue(interval_contains(1.58,1.28,.29999999999999993))

    def test_multivariable_cache_includes_available_feature_values(self):
        from agrodecide.forecasting.engine import prediction
        spec={'id':'Decision Tree | A | direct','name':'Decision Tree','configuration':'A','strategy':'direct','family':'Multivariable','deployable':True}
        y=synthetic();f=prices(y)
        with TemporaryDirectory() as tmp,patch('agrodecide.forecasting.engine.FOLDER',Path(tmp)),patch('agrodecide.forecasting.engine.multivariate',return_value=(np.repeat(2.,7),{'features':['precio_lag_1']})) as fit:
            prediction(spec,y,f,7);prediction(spec,y,f,7)
            self.assertEqual(fit.call_count,1)
            changed=f.copy();changed.iloc[-1,0]+=1
            prediction(spec,y,changed,7)
            self.assertEqual(fit.call_count,2)

    def test_official_emmsa_import_preserves_units_and_vintage_identity(self):
        with TemporaryDirectory() as tmp,patch('agrodecide.forecasting.data.read',return_value=pd.DataFrame()),patch('agrodecide.forecasting.data.replace') as write:
            path=Path(tmp)/'official.csv'
            pd.DataFrame([{'variable':'precio_mayorista','periodo_observacion':'2020-01-01','valor':2.,'unidad':'PEN/kg','fuente':'EMMSA','source_url':'https://www.emmsa.com.pe/documento-oficial','fecha_publicacion':'2020-01-02','fecha_disponibilidad':'2020-01-03','metodologia':'v1','tipo_registro':'observado'}]).to_csv(path,index=False)
            x=import_vintages(path)
            self.assertEqual(x.unidad.iloc[0],'PEN/kg');self.assertTrue(x.vintage_eligible.iloc[0]);write.assert_called_once()

    def test_import_command_rejects_demo_and_unidentified_weather(self):
        from agrodecide.forecasting.import_data import run
        with TemporaryDirectory() as tmp:
            path=Path(tmp)/'invalid.csv'
            pd.DataFrame([{'variable':'ICEN','tipo_registro':'DEMO'}]).to_csv(path,index=False)
            with self.assertRaisesRegex(ValueError,'observado'):run(path)
            pd.DataFrame([{'variable':'precipitacion','tipo_registro':'observado','region':'Junin','unidad':'mm'}]).to_csv(path,index=False)
            with self.assertRaisesRegex(ValueError,'estación'):run(path)

    def test_import_command_refuses_to_pool_varieties_under_one_variable_identity(self):
        from agrodecide.forecasting.import_data import run
        with TemporaryDirectory() as tmp,patch('agrodecide.forecasting.import_data.read',return_value=pd.DataFrame()):
            path=Path(tmp)/'ambiguous.csv'
            pd.DataFrame([{'variable':'volumen','tipo_registro':'observado','metodologia':'v1','unidad':'t','variedad':v} for v in ['Única','Canchán']]).to_csv(path,index=False)
            with self.assertRaisesRegex(ValueError,'variedad'):run(path)

if __name__=='__main__':unittest.main()
