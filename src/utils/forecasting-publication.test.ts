import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {addDays} from './forecast';
import {validForecastPublication} from '../data/validation';

const root=new URL('../../',import.meta.url);
const load=(folder:string,file:string)=>JSON.parse(readFileSync(new URL(`public/${folder}/${file}`,root),'utf8'));
const manifest=load('forecasting','index.json');
const entry=manifest.series.find((s:any)=>s.variety==='Única');
const summary=load('forecasting',entry.file);
const coreIndex=load('data','index.json');
const core=load('data',coreIndex.series.find((s:any)=>s.variety==='Única').file);

test('Advanced publication is tied to the same real Unica history and six complete horizons',()=>{
 assert.equal(summary.engine_version,'2.0.0');assert.equal(summary.data_hash,core.data_hash);
 assert.equal(core.variety,'Única');assert.equal(core.market_id,'15011501');assert.equal(validForecastPublication(core),true);
 assert.deepEqual(Object.keys(summary.details_by_horizon).map(Number),[7,15,30,90,180,240]);
 assert.ok(summary.enriched_at);assert.equal(summary.publication_validation_version,1);assert.match(summary.implementation_hash,/^[a-f0-9]{64}$/);
 for(const h of [7,15,30,90,180,240]){
  const detail=load('forecasting',summary.details_by_horizon[String(h)]);
  assert.equal(detail.forecast.length,h);
  assert.deepEqual(detail.forecast.map((p:any)=>p.date),Array.from({length:h},(_,i)=>addDays(core.last_date,i+1)));
  for(const p of detail.forecast){assert.ok(p.low95<=p.low&&p.low<=p.price&&p.price<=p.high&&p.high<=p.high95);assert.equal(p.model,detail.evaluation.deployed);}
 }
});

test('Dated advanced audit reconciles independently to official observed prices and published scores',()=>{
 const history=new Map(core.history.map((p:any)=>[p.date,p.price]));
 for(const h of [7,15,30,90,180,240]){
  const e=load('forecasting',summary.details_by_horizon[String(h)]).evaluation;
  const rows=e.audit_rows;
  for(const row of rows){assert.equal(row.actual,history.get(row.date));assert.ok(row.date>row.origin);assert.equal(row.date,addDays(row.origin,row.lead));}
  const mean=(values:number[])=>values.reduce((a,b)=>a+b,0)/values.length;
  const errors=rows.map((r:any)=>r.predicted-r.actual);
  assert.ok(Math.abs(mean(errors.map(Math.abs))-e.audit.mae)<1e-10);
  assert.ok(Math.abs(Math.sqrt(mean(errors.map((v:number)=>v*v)))-e.audit.rmse)<1e-10);
  assert.ok(Math.abs(mean(errors)-e.audit.bias)<1e-10);
  assert.equal(e.interval_numerical_tolerance_pen_kg,1e-12);
  assert.ok(Math.abs(mean(rows.map((r:any)=>Number(r.actual>=r.low80-1e-12&&r.actual<=r.high80+1e-12)))-e.audit.coverage80)<1e-10);
  assert.ok(Math.abs(mean(rows.map((r:any)=>Number(r.actual>=r.low95-1e-12&&r.actual<=r.high95+1e-12)))-e.audit.coverage95)<1e-10);
  assert.equal(rows.length,e.audit.n);
 }
});

test('Weights, ranking, calibration and audit targets remain temporally separated',()=>{
 for(const h of [7,15,30,90,180,240]){
  const e=load('forecasting',summary.details_by_horizon[String(h)]).evaluation,p=e.plan;
  assert.equal(p.selection.length,6);assert.equal(p.calibration.length,6);assert.equal(p.audit.length,6);
  assert.ok(addDays(p.selection[2],h)<=p.selection[3]);
  assert.ok(addDays(p.selection.at(-1),h)<=p.calibration[0]);
  assert.ok(addDays(p.calibration.at(-1),h)<=p.audit[0]);
  for(const c of e.candidates){
   if(c.family==='Ensemble'){
    assert.ok(Math.abs(c.weights.reduce((a:number,b:number)=>a+b,0)-1)<1e-10);
    assert.deepEqual(c.metadata.weights_fit_origins,p.selection.slice(0,3));
    assert.ok(c.components.every((id:string)=>e.candidates.find((x:any)=>x.id===id)?.deployable));
   }
   if(c.family==='Clásico')assert.deepEqual(c.metadata.features,['precio histórico']);
  }
  const deployed=e.candidates.find((c:any)=>c.id===e.deployed);
  assert.ok(deployed.deployable);assert.equal(deployed.audit.mae,e.audit.mae);
  if(e.accepted)assert.ok(e.audit.mae<e.baseline_audit.mae);
  else assert.equal(deployed.name,'Naive');
 }
});

test('Revised ocean and macro data are not misrepresented as historical vintages or zero-error experiments',()=>{
 const sources=load('forecasting',manifest.sources_file);
 for(const key of ['icen','central','macro']){
  assert.ok(sources[key].rows.length>24);
  assert.ok(sources[key].rows.every((r:any)=>r.vintage_eligible===false&&r.fecha_publicacion===null));
 }
 for(const r of sources.enfen.rows){
  if(r.vintage_eligible){assert.ok(r.file_version_date);assert.ok(r.fecha_disponibilidad>r.fecha_publicacion);assert.ok(r.fecha_disponibilidad>r.file_version_date);}
 }
 assert.ok(sources.weather.rows.every((r:any)=>r.code&&r.region&&Number.isFinite(r.latitude)&&Number.isFinite(r.longitude)));
 for(const h of [7,15,30,90,180,240]){
  const e=load('forecasting',summary.details_by_horizon[String(h)]).evaluation;
  for(const a of e.ablations.filter((a:any)=>['C','D','E'].includes(a.configuration))){assert.equal(a.state,'pendiente');assert.equal(a.mae,undefined);assert.ok(a.reason);}
 }
});
