import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {resolve} from 'node:path';
import {createHash} from 'node:crypto';
import {gunzipSync} from 'node:zlib';
import {validateResearchSummary,validateResearchDetail} from './research';
const root=resolve(import.meta.dirname,'../../public');
const json=(p:string)=>JSON.parse(readFileSync(resolve(root,p),'utf8'));
const index=json('research-v5/index.json');
const hash=(b:Buffer)=>createHash('sha256').update(b).digest('hex');
function asset(name:string){const bytes=readFileSync(resolve(root,'research-v5',name));assert.equal(hash(bytes),name.slice(0,64));return JSON.parse(name.endsWith('.gz')?gunzipSync(bytes).toString():bytes.toString());}
test('All ten research varieties bind to the same real operational histories and six complete horizons',()=>{
 const core=json('data/index.json');assert.equal(index.series.length,10);let promotions=0;
 for(const row of index.series){const summary=asset(row.file),operational=json('data/'+core.series.find((s:any)=>s.variety===row.variety).file);validateResearchSummary(summary,row.variety,operational.data_hash,index.run_id);
  for(const h of [7,15,30,90,180,240]){const d=validateResearchDetail(asset(summary.details_by_horizon[h]),summary,h);assert.ok(d.forecast_paths.Naive);if(d.promoted){promotions++;assert.equal(d.published_model,d.selected_challenger);}else assert.equal(d.published_model,'Naive');assert.equal(d.sealed_test.scored,false);assert.equal(d.phases.audit.length,12);}
 }
 assert.equal(promotions,index.promoted_combinations);
});
test('Consumer rejects stale varieties, mixed runs, missing targets and non-nested intervals',()=>{
 const summary=asset(index.series[0].file),original=asset(summary.details_by_horizon[15]);
 assert.throws(()=>validateResearchSummary(summary,'Otra',summary.history_hash,index.run_id));
 for(const mutate of [(d:any)=>d.run_id='wrong',(d:any)=>d.forecast_paths.Naive.pop(),(d:any)=>d.forecast_paths.Naive[0].low95=d.forecast_paths.Naive[0].price+1,(d:any)=>d.forecast_paths.Naive[1].date=d.forecast_paths.Naive[0].date]){const d=structuredClone(original);mutate(d);assert.throws(()=>validateResearchDetail(d,summary,15));}
});
test('Compressed dated research audits reconcile with observed prices and reported MAE',()=>{
 const core=json('data/index.json');
 for(const row of index.series){const summary=asset(row.file),operational=json('data/'+core.series.find((s:any)=>s.variety===row.variety).file),observed=new Map(operational.history.map((p:any)=>[p.date,p.price]));
  for(const h of [7,15,30,90,180,240]){const d=asset(summary.details_by_horizon[h]),audit=asset(d.audit_file);assert.equal(audit.run_id,index.run_id);assert.equal(audit.horizon,h);for(const [model,rows]of Object.entries(audit.rows) as [string,any[]][]){const c=d.candidates.find((c:any)=>c.model===model);let loss=0;for(const r of rows){assert.equal(r.actual,observed.get(r.date));assert.equal(r.baseline,observed.get(r.origin));loss+=Math.abs(r.predicted-r.actual);}assert.ok(Math.abs(loss/rows.length-c.audit.mae)<1e-10);assert.equal(rows.length,c.audit.n);}}
 }
});
