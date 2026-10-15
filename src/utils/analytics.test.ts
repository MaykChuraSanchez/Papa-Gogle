import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {monthly,aligned,pearson,monthlyChanges,slug} from './analytics.ts';
import type {DataIndex} from '../data/contracts';
import type {Diagnostics} from '../data/useAnalytics';
test('Monthly averages use observed prices and keep sample sizes',()=>{assert.deepEqual(monthly([{date:'2026-02-01',price:1},{date:'2026-01-31',price:4},{date:'2026-02-03',price:3}]),[{date:'2026-01-01',price:4,n:1},{date:'2026-02-01',price:2,n:2}]);});
test('Comparison uses exact common dates and does not fill gaps',()=>{assert.deepEqual(aligned([{date:'2026-01-01',price:1},{date:'2026-01-03',price:3}],[{date:'2026-01-02',price:100},{date:'2026-01-03',price:4}]),[{date:'2026-01-03',x:3,y:4}]);});
test('Correlation requires enough observations and rejects constant series',()=>{assert.equal(pearson([{x:1,y:2},{x:2,y:4}]),null);assert.equal(pearson([{x:1,y:2},{x:1,y:3},{x:1,y:4}]),null);assert.ok(Math.abs(pearson([{x:1,y:2},{x:2,y:4},{x:3,y:6}])!-1)<1e-10);});
test('Monthly changes do not bridge missing calendar months',()=>{assert.deepEqual(monthlyChanges([{date:'2026-01-01',price:1},{date:'2026-03-01',price:2}]),[]);});
test('All dated audits reconcile with published aggregate metrics',()=>{
 const root=new URL('../../',import.meta.url);
 const index=JSON.parse(readFileSync(new URL('public/data/index.json',root),'utf8')) as DataIndex;
 for(const summary of index.series){const diagnostic=JSON.parse(readFileSync(new URL('public/analytics/'+slug(summary.variety)+'.json',root),'utf8')) as Diagnostics;assert.equal(diagnostic.variety,summary.variety);assert.equal(diagnostic.market_id,'15011501');
 for(const e of summary.evaluations){const audit=diagnostic.audit.find(a=>a.horizon===e.horizon);assert.ok(audit);assert.equal(audit.verified,true);assert.equal(audit.rows.length,e.audit.n);const mae=audit.rows.reduce((s,r)=>s+Math.abs(r.actual-r.predicted),0)/audit.rows.length;assert.ok(Math.abs(mae-e.audit.mae)<1e-5);for(const row of audit.rows){assert.ok(row.date>row.origin);assert.ok(Math.abs(row.residual-(row.actual-row.predicted))<2e-6);}}
 }
});
