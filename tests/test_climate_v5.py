"""Climate context is not retroactively available training data or a price shock."""
from copy import deepcopy
from pathlib import Path
import json
import unittest

from agrodecide.climate_v5.build import parse_noaa, parse_agromet, reviewed_risk, regional_scenarios
from agrodecide.climate_v5.contracts import asof_evidence, evidence_status, validate_catalog

ROOT=Path(__file__).resolve().parents[1]


class ClimateV5Tests(unittest.TestCase):
    @classmethod
    def setUpClass(cls):
        cls.catalog=json.loads((ROOT/'public/climate-v5/index.json').read_text(encoding='utf-8'))

    def test_published_catalog_passes_contract(self):
        validate_catalog(self.catalog)

    def test_date_of_recovery_does_not_become_issue_date(self):
        row=next(r for r in self.catalog['evidence'] if r['id']=='senamhi-papa-central-ond2026')
        self.assertIsNone(row['issue_date'])
        self.assertEqual(row['issue_month'],'2026-10')
        self.assertEqual(row['available_at'],'2026-10-16')

    def test_no_new_climate_evidence_is_retroactively_injected(self):
        before=asof_evidence(self.catalog['evidence'],'2026-10-15')
        self.assertFalse(any(r['source']['institution']=='SENAMHI' for r in before))
        self.assertFalse(any(r['id'].startswith('noaa-current') for r in before))

    def test_all_context_is_not_model_eligible(self):
        self.assertTrue(all(r['model_eligible'] is False for r in self.catalog['evidence']))

    def test_ocean_regions_not_interchanged(self):
        indicators={r['id']:r for r in self.catalog['indicators']}
        self.assertEqual(indicators['nino1+2']['value'],3.9)
        self.assertEqual(indicators['nino3.4']['value'],2.1)
        self.assertNotEqual(indicators['nino1+2']['evidence_id'],indicators['nino3.4']['evidence_id'])

    def test_anomalies_not_absolute_temperature(self):
        cat=deepcopy(self.catalog)
        cat['indicators'][0]['unit']='°C temperatura absoluta'
        with self.assertRaisesRegex(ValueError,'Anomalía'):validate_catalog(cat)

    def test_monthly_ocean_indices_keep_different_methods(self):
        rows=[r for r in self.catalog['indicators'] if r['quantity']=='seasonal_index']
        self.assertEqual(len(rows),3)
        self.assertEqual(len({r['methodology'] for r in rows}),3)
        self.assertTrue(all(r['reported_on'] is None for r in rows))

    def test_catalog_label_cannot_extend_pdf_validity(self):
        row=next(r for r in self.catalog['evidence'] if r['id']=='senamhi-agromet-oct2026')
        self.assertEqual(row['valid_to'],'2026-10-12')
        self.assertEqual(row['status'],'expired')
        self.assertTrue(row['catalog_pdf_mismatch'])
        self.assertIn('30/10/2026',row['catalog_label'])

    def test_tarma_observation_is_station_not_entire_province(self):
        row=next(r for r in self.catalog['evidence'] if r['id']=='senamhi-tarma-phenology-sep2026')
        self.assertEqual(row['risk_scope'],'station')
        self.assertEqual(row['observation_period'],'2026-09-30')
        self.assertEqual(row['station']['altitude_m'],3025)
        self.assertEqual(row['status'],'historical')

    def test_unknown_parcel_risk_is_not_neutral_or_confirmed_alert(self):
        row=next(r for r in self.catalog['evidence'] if r['id']=='senamhi-papa-central-ond2026')
        self.assertIsNone(row['parcel_risk'])
        self.assertEqual(row['risk_scope'],'macroregion')
        self.assertTrue(all(r['tarma_value'] is None for r in self.catalog['map_layers'] if r['id']!='phenology'))

    def test_scenario_cannot_invent_numeric_price_effect(self):
        cat=deepcopy(self.catalog)
        cat['regional_scenarios'][1]['price_effect']=1.1
        with self.assertRaisesRegex(ValueError,'fabricados'):validate_catalog(cat)

    def test_scenario_cannot_invent_price_probability(self):
        cat=deepcopy(self.catalog)
        cat['regional_scenarios'][2]['probability']=.8
        with self.assertRaisesRegex(ValueError,'fabricados'):validate_catalog(cat)

    def test_four_scenarios_keep_fully_explicit_conditions(self):
        scenarios=regional_scenarios()
        self.assertEqual({s['id'] for s in scenarios},{'base','wetter','drier','logistics'})
        self.assertTrue(all(s['assumption'] and s['preparation'] and s['limitations'] for s in scenarios))
        self.assertTrue(all(s['price_simulation_enabled'] is False for s in scenarios))

    def test_expected_new_enfen_is_not_invented(self):
        row=next(r for r in self.catalog['evidence'] if r['id']=='enfen-2026-17-coastal')
        self.assertEqual(row['status'],'update_due')
        self.assertEqual(row['issue_date'],'2026-09-28')
        self.assertEqual(row['next_update'],'2026-10-15')

    def test_future_publication_not_available_at_origin(self):
        row=deepcopy(self.catalog['evidence'][0]);row['issue_date']='2027-01-01';row['available_at']='2027-01-02'
        self.assertEqual(evidence_status(row,'2026-10-16'),'not_yet_available')
        self.assertEqual(asof_evidence([row],'2026-10-16'),[])

    def test_published_source_requires_real_digest(self):
        cat=deepcopy(self.catalog);cat['evidence'][0]['source']['sha256']='missing'
        with self.assertRaisesRegex(ValueError,'SHA-256'):validate_catalog(cat)

    def test_unknown_official_host_is_rejected(self):
        cat=deepcopy(self.catalog);cat['evidence'][0]['source']['url']='https://example.com/opinion'
        with self.assertRaisesRegex(ValueError,'oficial'):validate_catalog(cat)

    def test_revised_history_cannot_be_marked_eligible(self):
        cat=deepcopy(self.catalog);cat['evidence'][-1]['model_eligible']=True
        with self.assertRaisesRegex(ValueError,'retrospectivas'):validate_catalog(cat)

    def test_missing_station_weather_indicators_are_explicit(self):
        self.assertTrue(all(r['status']=='unavailable' and r['reason'] for r in self.catalog['missing_indicators']))
        self.assertEqual(self.catalog['unverified_external_claims']['status'],'excluded_from_production')

    def test_noaa_parser_keeps_reference_and_emission_distinct(self):
        raw=b'<html>8 October 2026. reaching +2.1&deg;C in Ni&ntilde;o-3.4, +3.0&deg;C in Ni&ntilde;o-3, and +3.9&deg;C in Ni&ntilde;o-1+2.</html>'
        result=parse_noaa(raw)
        self.assertEqual(result['issue_date'],'2026-10-08')
        self.assertEqual(result['values'],{'1+2':3.9,'3.4':2.1})

    def test_new_noaa_discussion_requires_outlook_review(self):
        raw=b'<html>12 November 2026. reaching +2.1C in Nino-3.4, and +3.9C in Nino-1+2.</html>'
        with self.assertRaisesRegex(ValueError,'Nueva discusi'):parse_noaa(raw)

    def test_changed_regional_pdf_is_not_silently_reinterpreted(self):
        with self.assertRaisesRegex(ValueError,'versión'):reviewed_risk(b'%PDF-changed')
        with self.assertRaisesRegex(ValueError,'versión'):parse_agromet(b'%PDF-changed')

    def test_historical_comparator_keeps_current_event_incomplete(self):
        for panel in self.catalog['event_comparisons']:
            current=next(e for e in panel['events'] if e['id']=='2026-2027')
            self.assertEqual(len(current['points']),12)
            self.assertTrue(all(p['value'] is None for p in current['points'] if p['period']>'2026-10-16'))
            self.assertLess(current['available_periods'],12)
        self.assertEqual({p['index'] for p in self.catalog['event_comparisons']},{'ICEN','RONI_ERSSTv6'})

    def test_future_comparator_value_is_rejected(self):
        cat=deepcopy(self.catalog)
        future=cat['event_comparisons'][0]['events'][-1]['points'][-1]
        future['value']=3.0
        with self.assertRaisesRegex(ValueError,'futura'):validate_catalog(cat)


if __name__=='__main__':unittest.main()
