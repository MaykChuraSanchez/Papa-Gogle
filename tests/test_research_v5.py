"""Synthetic controlled fixtures; no invented records are published as market data."""
from copy import deepcopy
import json
from pathlib import Path
import unittest
from unittest.mock import patch
import numpy as np
import pandas as pd
from statsmodels.stats.multitest import multipletests
from agrodecide.research_v5.models import ar1,tune_ar1,predict,prepared,inner_origins,MODELS
from agrodecide.research_v5.evaluation import plan,metrics,block_test,holm,finish,rows_for,evaluate
from agrodecide.research_v5.run import clean,frame_hash,code_hash


def synthetic(n=2845):
    rng=np.random.default_rng(15);z=np.zeros(n);z[0]=np.log(2.)
    for i in range(1,n):z[i]=np.log(2)+.96*(z[i-1]-np.log(2))+rng.normal(0,.025)
    return pd.Series(np.exp(z),index=pd.date_range('2019-01-01',periods=n))


def loss_rows(errors,h=30):
    rows=[]
    for i,error in enumerate(errors):
        rows.append({'origin':str(pd.Timestamp('2022-01-31')+pd.offsets.MonthEnd(i)),
                     'date':'2023-01-01','horizon':h,'lead':h,'actual':2.,'predicted':2.+error,'scale':.1})
    return rows


class ResearchV5(unittest.TestCase):
    def test_ar1_positive_complete_log_bias_corrected_paths(self):
        p,m=ar1(synthetic(),240,730)
        self.assertEqual(len(p),240);self.assertTrue(np.isfinite(p).all());self.assertTrue((p>0).all())
        self.assertLess(abs(m['phi']),1);self.assertGreaterEqual(p[-1],m['conditional_median_endpoint'])
        self.assertEqual(m['window_days'],730)

    def test_constant_series_log_retransformation_is_exact(self):
        p,m=ar1(pd.Series(2.,index=pd.date_range('2020-01-01',periods=800)),30,365)
        np.testing.assert_allclose(p,2.);self.assertAlmostEqual(m['innovation_variance'],0.)

    def test_ar1_refuses_unavailable_window_and_invalid_price(self):
        with self.assertRaises(ValueError):ar1(synthetic(500),30,730)
        y=synthetic();y.iloc[-3]=0
        with self.assertRaises(ValueError):ar1(y,30,730)

    def test_explosive_phi_is_refused_without_clipping(self):
        y=pd.Series(np.exp(np.linspace(0,1,1000)**3),index=pd.date_range('2020-01-01',periods=1000))
        with self.assertRaisesRegex(ValueError,'no estable'):ar1(y,30,730)

    def test_missing_targets_never_become_zero(self):
        y=synthetic();y.iloc[500:504]=np.nan;origin=y.index[499]
        rows=rows_for(y,origin,7,np.ones(7))
        self.assertEqual(len(rows),3);self.assertEqual(rows[0]['lead'],5)
        self.assertTrue(all(r['actual']>0 for r in rows))

    def test_no_backfill_or_long_gap_concealment(self):
        y=synthetic();y.iloc[0]=np.nan
        with self.assertRaises(ValueError):prepared(y)
        y=synthetic();y.iloc[300:309]=np.nan
        with self.assertRaises(ValueError):prepared(y)

    def test_inner_validation_targets_end_at_outer_origin(self):
        y=synthetic();_,meta=tune_ar1(y,180)
        self.assertEqual(meta['internal_latest_target'],str(y.index[-1].date()))
        for i in inner_origins(y,180):self.assertLessEqual(i+180,len(y)-1)
        self.assertEqual(len(meta['internal_validation']),5)

    def test_internal_cut_without_quote_moves_back_never_forward(self):
        y=synthetic();intended=len(y)-90-1-60;y.iloc[intended]=np.nan
        cuts=inner_origins(y,90)
        self.assertEqual(cuts[0],intended-1);self.assertEqual(len(cuts),3)
        self.assertTrue(all(np.isfinite(y.iloc[i]) for i in cuts))
        p,meta=tune_ar1(y,90);self.assertEqual(len(p),90)

    def test_future_mutation_cannot_change_forecast_before_cutoff(self):
        y=synthetic();cut=y.index[1700]
        a,am=tune_ar1(y.loc[:cut],90);y.loc[cut+pd.Timedelta(days=1):]=50
        b,bm=tune_ar1(y.loc[:cut],90)
        np.testing.assert_array_equal(a,b);self.assertEqual(am,bm)

    def test_all_registered_models_generate_daily_paths(self):
        for name in MODELS:
            p,_=predict(name,synthetic(),15)
            self.assertEqual(len(p),15);self.assertTrue((p>0).all())
        np.testing.assert_array_equal(predict('Naive',synthetic(),7)[0],np.repeat(synthetic().iloc[-1],7))

    def test_each_horizon_has_purged_phases_and_sealed_tail(self):
        for h in (7,15,30,90,180,240):
            p=plan(synthetic(),h)
            self.assertEqual([len(p[k]) for k in ('selection','calibration','audit')],[6,6,12])
            self.assertLess(p['selection'][-1]+pd.Timedelta(days=h),p['calibration'][0])
            self.assertLess(p['calibration'][-1]+pd.Timedelta(days=h),p['audit'][0])
            self.assertLess(p['audit'][-1]+pd.Timedelta(days=h),p['sealed_start'])

    def test_insufficient_history_refused(self):
        with self.assertRaises(ValueError):plan(synthetic(900),240)

    def test_sealed_targets_do_not_change_selection_or_audit(self):
        y=synthetic();first=evaluate(y,7)
        y.iloc[-240:]=9.;second=evaluate(y,7)
        self.assertEqual(first['selected_challenger'],second['selected_challenger'])
        self.assertEqual(first['comparison'],second['comparison'])
        self.assertEqual(first['audit_rows'],second['audit_rows'])

    def test_later_audit_shock_cannot_change_calibration_bands(self):
        y=synthetic();first=evaluate(y,7);audit_start=pd.Timestamp(first['phases']['audit'][0])+pd.Timedelta(days=1)
        y.loc[audit_start:]=y.loc[audit_start:]*1.5;second=evaluate(y,7)
        self.assertEqual(first['selected_challenger'],second['selected_challenger'])
        original={c['model']:c['bands'] for c in first['candidates']}
        for c in second['candidates']:self.assertEqual(c['bands'],original[c['model']])

    def test_endpoint_does_not_equal_path_metric(self):
        rows=loss_rows([.2]);rows.append({**rows[0],'lead':1,'predicted':3.})
        self.assertAlmostEqual(metrics(rows)['mae'],.6);self.assertAlmostEqual(metrics(rows,'endpoint')['mae'],.2)
        self.assertEqual(metrics(rows,'endpoint')['n'],1)

    def test_block_inference_never_counts_daily_errors_as_origins(self):
        a=loss_rows([.1]*12,h=240);b=loss_rows([.2]*12,h=240)
        result=block_test(a,b,240,replicates=199)
        self.assertEqual(result['origins'],12);self.assertEqual(result['block_length_origins'],8)
        self.assertFalse(result['sufficient_effective_blocks'])

    def test_bootstrap_seed_reproducible_and_sign_direction_correct(self):
        a=loss_rows(np.linspace(.05,.15,12));b=loss_rows(np.linspace(.2,.3,12))
        first=block_test(a,b,30,replicates=199);second=block_test(a,b,30,replicates=199)
        self.assertEqual(first,second);self.assertGreater(first['relative_mae_improvement'],0)
        self.assertGreater(first['ci95_absolute_reduction'][0],0)

    def test_paired_test_refuses_mismatched_origins(self):
        with self.assertRaises(ValueError):block_test(loss_rows([.1]*12),loss_rows([.2]*11),30)

    def test_holm_matches_existing_library_and_includes_sixty_tests(self):
        p=[.0001,.02,.03]+[.5]*57
        np.testing.assert_allclose(holm(p),multipletests(p,method='holm')[1])
        self.assertAlmostEqual(holm(p)[0],.006)

    def test_gate_insufficient_blocks_keeps_naive_even_large_apparent_gain(self):
        report={'horizon':7,'selected_challenger':'Media 28 días','comparison':{
            'relative_mae_improvement':.5,'sufficient_effective_blocks':False,'ci95_absolute_reduction':[.1,.2],'wins_by_origin':12},
            'candidates':[{'model':m,'bands':{'80':.2,'95':.4},'audit':{'mae':.1},'endpoint_audit':{'mae':.2}} for m in ('Naive','Media 28 días')],
            'forecast_paths':{},'failures':[]}
        r=finish(report,synthetic(),.001)
        self.assertEqual(r['published_model'],'Naive');self.assertFalse(r['promoted'])
        self.assertEqual(len(r['forecast_paths']['Media 28 días']),7)

    def test_gate_adjusted_p_prevents_promotion_and_interval_order_holds(self):
        report={'horizon':7,'selected_challenger':'Media 28 días','comparison':{
            'relative_mae_improvement':.15,'sufficient_effective_blocks':True,'ci95_absolute_reduction':[.1,.2],'wins_by_origin':12},
            'candidates':[{'model':m,'bands':{'80':.2,'95':.4},'audit':{'mae':.1},'endpoint_audit':{'mae':.2}} for m in ('Naive','Media 28 días')],
            'forecast_paths':{},'failures':[]}
        r=finish(report,synthetic(),.2)
        self.assertFalse(r['promoted'])
        for row in r['forecast']:self.assertTrue(row['low95']<=row['low']<=row['price']<=row['high']<=row['high95'])

    def test_json_contract_has_no_nonfinite_numbers(self):
        clean_value=clean({'x':np.nan,'p':np.float64(np.inf),'a':[np.int64(3)]})
        self.assertEqual(json.loads(json.dumps(clean_value,allow_nan=False)),{'x':None,'p':None,'a':[3]})

    def test_lineage_hash_changes_with_price_and_not_row_order(self):
        frame=pd.DataFrame({'variedad':['A','A'],'mercado_id':['1','1'],'fecha':pd.date_range('2020-01-01',periods=2),'precio':[1.,2.]})
        first=frame_hash(frame);self.assertEqual(first,frame_hash(frame.iloc[::-1]))
        frame.loc[0,'precio']=1.1;self.assertNotEqual(first,frame_hash(frame));self.assertEqual(len(code_hash()),64)

    def test_actual_report_if_available_has_ten_varieties_and_sixty_paths(self):
        path=Path('data/v4/research_v5/report.json')
        if not path.exists():self.skipTest('Run real aún no generado; pruebas controladas independientes')
        report=json.loads(path.read_text(encoding='utf8'))
        self.assertEqual(len(report['series']),10);self.assertEqual(report['multiplicity_tests'],60)
        self.assertEqual(report['code_hash'],code_hash())
        for series in report['series']:
            self.assertEqual(len(series['forecasts_by_horizon']),6)
            for e in series['evaluations']:
                self.assertEqual(len(e['forecast']),e['horizon']);self.assertFalse(e['sealed_test']['scored'])
                if e['horizon']>=90:self.assertFalse(e['promoted'])
                recommended=next(c for c in e['candidates'] if c['model']==e['published_model'])
                self.assertEqual(recommended['audit'],e['published_audit'])
                for name,path in e['forecast_paths'].items():
                    self.assertEqual(len(path),e['horizon'])
                    self.assertEqual([p['lead'] for p in path],list(range(1,e['horizon']+1)))
                    for p in path:
                        self.assertEqual(p['model'],name)
                        self.assertTrue(p['low95']<=p['low']<=p['price']<=p['high']<=p['high95'])
                    if name=='Naive':self.assertAlmostEqual(path[-1]['price'],series['last_price'],places=6)
                for name,rows in e['audit_rows'].items():
                    expected=next(c for c in e['candidates'] if c['model']==name)['audit']['mae']
                    self.assertAlmostEqual(metrics(rows)['mae'],expected,places=12)


if __name__=='__main__':unittest.main()
