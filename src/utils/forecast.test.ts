import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { addDays, change, dateValue, economics, forecastWindow, freshness } from './forecast.ts';
import type { DataIndex, Series } from '../data/contracts';
const root = new URL('../../', import.meta.url);
const load = (name: string) => JSON.parse(readFileSync(new URL('public/data/' + name, root), 'utf8'));
const index = load('index.json') as DataIndex;
const series = JSON.parse(readFileSync(new URL('tests/fixtures/canchan_20261015.json', root), 'utf8')) as Series;
const today=series.last_date;

test('Exact harvest dates and leap years; invalid calendar dates rejected',()=>{
  assert.equal(addDays('2026-10-15',115),'2027-02-07');assert.equal(addDays('2026-10-15',130),'2027-02-22');
  assert.equal(addDays('2024-02-28',1),'2024-02-29');assert.throws(()=>dateValue('2026-02-30'));assert.throws(()=>dateValue('15/10/2026'));
});
test('Real Canchán quote and forecast identity match SISAP publication',()=>{
  assert.equal(series.variety,'Canchán');assert.equal(series.market_id,'15011501');assert.equal(series.last_price,2.23);assert.equal(series.last_date,'2026-10-15');
  const result=forecastWindow(series,'2027-02-07','2027-02-22',today);
  assert.equal(result.points.length,16);assert.equal(Number(result.price.toFixed(2)),2.23);assert.equal(result.experimental,true);
});
test('Forecast window must be completely covered: no nearest-date substitution',()=>{
  assert.throws(()=>forecastWindow(series,today,addDays(today,10),today),/ventana completa/);
  assert.throws(()=>forecastWindow(series,addDays(today,239),addDays(today,241),today),/ventana completa/);
  assert.throws(()=>forecastWindow(series,'2027-02-22','2027-02-07',today));
});
test('A missing interior target blocks the entire window',()=>{
  const broken={...series,forecast:series.forecast.filter(p=>p.date!=='2027-02-10')};
  assert.throws(()=>forecastWindow(broken,'2027-02-07','2027-02-22',today),/ventana completa/);
});
test('Stale prices, future observations and expired evaluation block forecasts',()=>{
  assert.equal(freshness(series,today),'');assert.match(freshness(series,addDays(today,8)),/8 días/);
  assert.match(freshness(series,addDays(today,-1)),/futura/);
  assert.match(freshness({...series,evaluated_at:'2026-08-01T00:00:00Z'},today),/evaluación/);
});
test('Economics account for loss, freight and sales commission; break-even really breaks even',()=>{
  const result=economics(2.23,1,22,15000,10,.25,5);
  assert.equal(result.kg,19800);assert.equal(result.gross,44154);assert.ok(Math.abs(result.margin-21996.3)<.001);
  assert.ok(Math.abs(economics(result.breakEven,1,22,15000,10,.25,5).margin)<1e-8);
});
test('Invalid economic inputs cannot create plausible results',()=>{
  for(const args of [[2,0,22,15000,10,.25,5],[2,1,22,15000,100,.25,5],[2,1,22,15000,10,.25,100],[2,1,NaN,15000,10,.25,5],[2,1,22,-1,10,.25,5]]) assert.throws(()=>economics(...args as [number,number,number,number,number,number,number]));
});
test('Changes compare exact calendar dates; gaps are not replaced by adjacent days',()=>{
  assert.equal(change([{date:'2026-10-01',price:1},{date:'2026-10-08',price:1.2}],7),19.999999999999996);
  assert.equal(change([{date:'2026-10-02',price:1},{date:'2026-10-08',price:1.2}],7),null);
});
test('Every published variety is distinct, complete, and has traceable evaluated horizons',()=>{
  assert.equal(index.series.length,10);assert.equal(new Set(index.series.map(s=>s.variety)).size,10);
  for(const summary of index.series){
    assert.match(summary.file,/^[a-f0-9]{20}\.json$/);
    const data=load(summary.file) as Series;
    assert.equal(data.variety,summary.variety);assert.equal(data.market_id,summary.market_id);
    assert.equal(data.history.length,data.observations);assert.equal(data.forecast.length,240);
    assert.equal(new Set(data.history.map(p=>p.date)).size,data.history.length);
    assert.equal(data.history.at(-1)?.price,data.last_price);
    for(const [n,p] of data.forecast.entries()){
      assert.equal(p.date,addDays(data.last_date,n+1));assert.equal(p.lead,n+1);
      assert.ok(Number.isFinite(p.price)&&p.low<=p.price&&p.price<=p.high);
      const e=data.evaluations.find(e=>e.horizon===p.evaluated_horizon)!;
      assert.ok(e);assert.equal(e.model,p.model);assert.equal(e.status,p.status);
      assert.equal(e.selection_folds,3);assert.equal(e.calibration_folds,3);assert.equal(e.audit_folds,2);
    }
  }
});
test('Regional snapshot reconciles and is not labeled regional forecast',()=>{
  assert.equal(index.regional.regions.length,26);
  const sum=index.regional.regions.reduce((n,r)=>n+r.production_t,0);
  assert.ok(Math.abs(sum-index.regional.total_t)<1);
  assert.match(index.regional.note,/no es precio regional ni pronóstico/);
});
