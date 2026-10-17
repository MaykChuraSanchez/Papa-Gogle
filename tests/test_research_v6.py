import unittest
import numpy as np
import pandas as pd
from agrodecide.research_v6.models import direct_features,forecasts
from agrodecide.research_v6.evaluation import aggregate,choose,interval,summarize


class HarvestValidation(unittest.TestCase):
    def test_endpoint_is_not_window_or_daily_path(self):
        values=np.arange(1,181,dtype=float)
        self.assertEqual(aggregate(values,180,'endpoint'),180)
        self.assertEqual(aggregate(values,180,'harvest_mean'),165.5)
        values[-1]=np.nan
        self.assertIsNone(aggregate(values,180,'endpoint'))
        self.assertAlmostEqual(aggregate(values,180,'harvest_mean'),165)

    def test_missing_window_not_imputed(self):
        values=np.ones(180);values[-15:]=np.nan
        self.assertIsNone(aggregate(values,180,'harvest_mean'))

    def test_features_do_not_read_future(self):
        z=np.linspace(0,1,1000);dates=pd.date_range('2019-01-01',periods=1000)
        expected=direct_features(z,dates,[600,600],[7,240])
        z[601:]=10000
        np.testing.assert_equal(direct_features(z,dates,[600,600],[7,240]),expected)

    def rows(self,n=12):
        return [{'origin':f'2020-{i+1:02}-01','target_end':f'2020-{i+1:02}-20','actual':1.,
                 'predictions':{'Naive':2.,'Ridge directo 10':1.},'policy':1.2,
                 'selection_scores':{'Naive':1.},'interval80':None,'interval95':None} for i in range(n)]

    def test_unrealized_targets_cannot_select_or_calibrate(self):
        rows=self.rows();winner,_=choose(rows,'2020-07-01',['Naive','Ridge directo 10'])
        self.assertEqual(winner,'Ridge directo 10')
        self.assertIsNone(interval(rows,'2020-07-01',1.,.8))
        for r in rows[6:]:r['predictions']['Ridge directo 10']=10000
        self.assertEqual(choose(rows,'2020-07-01',['Naive','Ridge directo 10'])[0],winner)

    def test_missing_candidate_cannot_cherry_pick_other_origins(self):
        rows=self.rows();rows[-1]['predictions'].pop('Ridge directo 10')
        winner,scores=choose(rows,'2021-01-01',['Naive','Ridge directo 10'])
        self.assertEqual(winner,'Naive');self.assertNotIn('Ridge directo 10',scores)

    def test_calibration_rank_and_audit_alignment(self):
        rows=self.rows()
        self.assertEqual(interval(rows,'2021-01-01',1.,.8),[.8,1.2])
        self.assertIsNone(interval(rows,'2021-01-01',1.,.95))
        summary=summarize(rows,180)
        self.assertEqual(summary['policy']['n'],summary['baseline']['n'])
        self.assertAlmostEqual(summary['policy']['mae'],.2)

    def test_model_output_contract(self):
        index=pd.date_range('2019-01-01',periods=1100)
        y=pd.Series(np.exp(.2*np.sin(np.arange(1100)*2*np.pi/365)),index=index)
        paths,metadata,failures=forecasts(y)
        self.assertEqual(len(paths)+len(failures),10)
        self.assertIn('Ridge directo 10',paths)
        for name,p in paths.items():
            self.assertEqual(p.shape,(240,));self.assertTrue(np.isfinite(p).all());self.assertTrue((p>0).all())
            self.assertEqual(metadata[name]['training_end'],str(index[-1].date()))


if __name__=='__main__':unittest.main()
