import React,{useEffect,useId,useState} from 'react';
import {ArrowUpRight,CloudRain,MapPin,ShieldCheck,Thermometer,TriangleAlert} from 'lucide-react';
import {evidenceJson} from '../data/useResearch';
import {Card} from './ConnectedViews';
import {Bars} from './Charts';
import {Glossary} from './Glossary';
import type {ViewTab} from '../types/agro';

type EvidenceKind='observation'|'institutional_forecast'|'agricultural_hypothesis'|'economic_simulation';
type EvidenceState='not_yet_available'|'expired'|'historical'|'update_due'|'current_context';
interface ClimateSource {institution:string;title:string;url:string;download_url?:string|null;sha256:string;retrieved_at:string}
interface ClimateEvidence {
 id:string;kind:EvidenceKind;title:string;summary:string;issue_date:string|null;issue_month?:string;
 available_at:string;valid_from:string|null;valid_to:string|null;next_update?:string|null;
 observation_period?:string|null;spatial_scope:string;risk_scope:string;source:ClimateSource;
 catalog_pdf_mismatch?:boolean;model_eligible:false;
 station?:{name:string;altitude_m:number;phenology:string};
}
interface ClimateIndicator {id:string;label:string;quantity:'sst_anomaly'|'seasonal_index';value:number|null;unit:string;evidence_id:string;observation_period:string|null;reported_on:string|null;methodology:string;model_eligible:false}
interface ClimateLayer {id:string;label:string;spatial_resolution:string|null;evidence_ids:string[];tarma_value:string|null;tarma_status:string}
interface ClimateScenario {id:string;title:string;kind:'agricultural_hypothesis';assumption:string;preparation:string[];limitations:string[];evidence_ids:string[];price_effect:null;probability:null;price_simulation_enabled:false;price_effect_reason:string}
interface EventPoint {month_offset:number;period:string;value:number|null;status:string}
interface EventComparison {index:string;ocean_region:string;methodology:string;unit:string;alignment:string;events:{id:string;label:string;points:EventPoint[];available_periods:number}[];limitations:string[]}
interface ClimateCatalog {schema_version:'1.0.0';generated_at:string;as_of:string;evidence:ClimateEvidence[];indicators:ClimateIndicator[];regional_scenarios:ClimateScenario[];map_layers:ClimateLayer[];event_comparisons:EventComparison[];limitations:string[];missing_indicators:{id:string;label:string;status:string;reason:string}[]}
type ClimateTab='region'|'ocean'|'scenarios'|'compare';
const kinds:Record<EvidenceKind,string>={observation:'Observación',institutional_forecast:'Pronóstico institucional',agricultural_hypothesis:'Hipótesis agrícola',economic_simulation:'Simulación económica'};
const states:Record<EvidenceState,string>={not_yet_available:'Aún no disponible',expired:'Pronóstico vencido',historical:'Observación histórica',update_due:'Actualización por verificar',current_context:'Contexto publicado'};
const months=['Jul','Ago','Set','Oct','Nov','Dic','Ene','Feb','Mar','Abr','May','Jun'];
const dayPattern=/^\d{4}-\d{2}-\d{2}$/;
const tabs:[ClimateTab,string][]=[['region','Tu zona'],['ocean','El océano'],['scenarios','Preparar escenarios'],['compare','Comparar eventos']];

function limaDay(){
 const parts=new Intl.DateTimeFormat('en',{timeZone:'America/Lima',year:'numeric',month:'2-digit',day:'2-digit'}).formatToParts(new Date());
 return ['year','month','day'].map(k=>parts.find(p=>p.type===k)?.value).join('-');
}
function dateText(value:string|null|undefined){
 if(!value)return 'Día no verificado';
 if(!dayPattern.test(value))return value;
 return new Intl.DateTimeFormat('es-PE',{day:'numeric',month:'short',year:'numeric',timeZone:'America/Lima'}).format(new Date(value+'T12:00:00Z'));
}
function climateState(row:ClimateEvidence,today:string):EvidenceState{
 if(row.available_at>today||(row.issue_date&&row.issue_date>today))return 'not_yet_available';
 if(row.valid_to&&row.valid_to<today)return row.kind==='institutional_forecast'?'expired':'historical';
 if(row.next_update&&row.next_update<today)return 'update_due';
 return 'current_context';
}
function officialUrl(value:string|null|undefined){
 try{const u=new URL(value||'');if(!['https:','http:'].includes(u.protocol)||!['enfen.imarpe.gob.pe','www.senamhi.gob.pe','www.cpc.ncep.noaa.gov','cpc.ncep.noaa.gov','met.igp.gob.pe','siofen.imarpe.gob.pe'].includes(u.hostname))return null;return u.href;}catch{return null;}
}
function isCatalog(value:unknown):value is ClimateCatalog{
 if(!value||typeof value!=='object')return false;
 const d=value as ClimateCatalog;
 return d.schema_version==='1.0.0'&&dayPattern.test(d.as_of)&&Array.isArray(d.evidence)&&d.evidence.length>0&&
 d.evidence.every(r=>r&&typeof r.id==='string'&&r.kind in kinds&&typeof r.title==='string'&&typeof r.summary==='string'&&dayPattern.test(r.available_at)&&r.model_eligible===false&&typeof r.source?.sha256==='string'&&Boolean(officialUrl(r.source?.url)))&&
 Array.isArray(d.indicators)&&d.indicators.every(r=>r&&typeof r.id==='string'&&['sst_anomaly','seasonal_index'].includes(r.quantity)&&(r.value===null||Number.isFinite(r.value)))&&
 Array.isArray(d.map_layers)&&d.map_layers.every(r=>r&&typeof r.id==='string'&&Array.isArray(r.evidence_ids))&&
 Array.isArray(d.regional_scenarios)&&d.regional_scenarios.every(r=>r&&r.kind==='agricultural_hypothesis'&&r.price_effect===null&&r.probability===null&&r.price_simulation_enabled===false&&Array.isArray(r.preparation)&&Array.isArray(r.limitations))&&
 Array.isArray(d.event_comparisons)&&d.event_comparisons.every(r=>r&&Array.isArray(r.events)&&r.events.every(e=>e&&Array.isArray(e.points)))&&Array.isArray(d.limitations)&&Array.isArray(d.missing_indicators);
}
function EvidenceCard({row,today}:{row:ClimateEvidence;today:string}){
 const state=climateState(row,today),url=officialUrl(row.source.url),download=officialUrl(row.source.download_url);
 return <article className="climate-evidence-card">
  <div className="flex flex-wrap gap-2"><span className="evidence-label" data-kind={row.kind}>{kinds[row.kind]}</span><span className="evidence-label" data-state={state}>{states[state]}</span></div>
  <h3>{row.title}</h3><p>{row.summary}</p>
  <dl className="climate-card-meta">
   <div><dt>Emisión</dt><dd><strong>{row.issue_date?dateText(row.issue_date):row.issue_month?'Mes '+row.issue_month+' · día sin verificar':'Día no verificado'}</strong></dd></div>
   <div><dt>Disponible en este registro</dt><dd><strong>{dateText(row.available_at)}</strong></dd></div>
   <div><dt>{row.kind==='observation'?'Observación':'Vigencia del escenario'}</dt><dd><strong>{row.observation_period?dateText(row.observation_period):row.valid_from&&row.valid_to?dateText(row.valid_from)+' – '+dateText(row.valid_to):'Ventana exacta no precisada'}</strong></dd></div>
   <div><dt>Alcance geográfico</dt><dd><strong>{row.spatial_scope}</strong></dd></div>
  </dl>
  {row.catalog_pdf_mismatch&&<p className="info-banner">El título del catálogo y el periodo impreso del PDF difieren. Aquí se conserva la vigencia del PDF.</p>}
  {row.next_update&&<p>Próxima emisión anunciada: {dateText(row.next_update)}.</p>}
  <div className="flex flex-wrap gap-4 mt-4">{url&&<a className="text-button" href={url} target="_blank" rel="noreferrer">{row.source.institution} · fuente<ArrowUpRight size={14}/></a>}{download&&download!==url&&<a className="text-button" href={download} target="_blank" rel="noreferrer">Documento<ArrowUpRight size={14}/></a>}</div>
  <details className="evidence-details"><summary>Fecha de consulta y trazabilidad</summary><p>Consulta: {dateText(row.source.retrieved_at.slice(0,10))}. Original: {row.source.title}.</p><p className="break-all text-xs mt-2">SHA-256: {row.source.sha256}</p><p className="help-text mt-2">Contexto informativo; esta evidencia no se incorpora retrospectivamente al entrenamiento de precios.</p></details>
 </article>;
}

export function RegionalClimate({navigate}:{navigate:(tab:ViewTab)=>void}){
 const [data,setData]=useState<ClimateCatalog|null>(null),[error,setError]=useState(''),[tab,setTab]=useState<ClimateTab>('region');
 const [layerId,setLayerId]=useState('potato_risk'),[scenarioId,setScenarioId]=useState('base'),[index,setIndex]=useState('ICEN'),[eventId,setEventId]=useState('2026-2027');
 const base=useId().replace(/:/g,''),today=limaDay();
 useEffect(()=>{let active=true;
  evidenceJson('/release.json').then(async release=>{
   const ref=release?.climate;
   if(typeof ref?.url!=='string'||!/^\/climate-v5\/(?:index|[a-f0-9]{64})\.json$/.test(ref.url)||typeof ref.sha256!=='string'||!/^[a-f0-9]{64}$/.test(ref.sha256))throw Error('No hay una publicación climática verificable en el manifiesto.');
   const result:unknown=await evidenceJson(ref.url,ref.sha256);
   if(!isCatalog(result))throw Error('El catálogo climático no cumple el contrato de evidencia.');
   return result;
  }).then(value=>{if(active)setData(value);}).catch((reason:unknown)=>{if(active)setError(reason instanceof Error?reason.message:'No se pudo verificar la evidencia climática.');});
  return()=>{active=false;};
 },[]);
 if(!data)return <Card><div className="flex items-center gap-3"><ShieldCheck size={22}/><h2 className="text-xl font-bold">Inteligencia climática · Tarma, Junín</h2></div><p className="help-text mt-3" role="status">{error||'Verificando fuentes, fechas y la integridad del catálogo climático…'}</p>{error&&<button className="text-button mt-4" onClick={()=>location.reload()}>Volver a verificar<ArrowUpRight size={15}/></button>}</Card>;
 const evidence=new Map(data.evidence.map(row=>[row.id,row]));
 const layer=data.map_layers.find(row=>row.id===layerId)||data.map_layers[0];
 const scenario=data.regional_scenarios.find(row=>row.id===scenarioId)||data.regional_scenarios[0];
 const comparison=data.event_comparisons.find(row=>row.index===index)||data.event_comparisons[0];
 const event=comparison?.events.find(row=>row.id===eventId)||comparison?.events[0];
 const sourceAge=Math.max(0,Math.floor((Date.parse(today+'T12:00:00Z')-Date.parse(data.as_of+'T12:00:00Z'))/86400000));
 const senamhiRows=['senamhi-papa-central-ond2026','senamhi-tarma-phenology-sep2026','senamhi-agromet-oct2026'].map(id=>evidence.get(id)).filter((r):r is ClimateEvidence=>Boolean(r));
 return <section className="space-y-6" aria-label="Inteligencia climática regional">
  <Card><div className="section-heading"><div><span className="eyebrow">CLIMA · EVIDENCIA PARA TU CAMPAÑA</span><h2 className="text-2xl font-bold mt-2">Tu zona primero. El océano, en contexto.</h2><p>Consulta qué fue observado, qué prevén las instituciones y qué sigue siendo una hipótesis para tu cultivo.</p></div><span className="evidence-label">Fuentes al {dateText(data.as_of)}</span></div>
   <div className="regional-scope mt-5"><MapPin size={18}/><strong>Tarma · Junín</strong><span>Zona productora</span><span>Mercado de precio: GMML Lima</span></div>
   <p className="help-text mt-4">El precio mayorista de Lima no equivale a tu precio en chacra. La etapa y el agua disponible de tu parcela deben confirmarse localmente.</p>
   {sourceAge>0&&<p className="info-banner mt-4" role="status">El catálogo fue verificado hace {sourceAge} {sourceAge===1?'día':'días'}. Los vencimientos se revisan con la fecha actual de Perú ({dateText(today)}); consulta la última emisión oficial antes de decidir.</p>}
  </Card>
  <div className="workspace-switch" role="tablist" aria-label="Explorar inteligencia climática">
   {tabs.map(([id,label],position)=><button id={base+'-'+id} key={id} role="tab" tabIndex={tab===id?0:-1} aria-selected={tab===id} aria-controls={base+'-panel'} aria-pressed={tab===id} onClick={()=>setTab(id)} onKeyDown={event=>{let next=position;if(event.key==='ArrowRight')next=(position+1)%tabs.length;else if(event.key==='ArrowLeft')next=(position+tabs.length-1)%tabs.length;else if(event.key==='Home')next=0;else if(event.key==='End')next=tabs.length-1;else return;event.preventDefault();setTab(tabs[next][0]);document.getElementById(base+'-'+tabs[next][0])?.focus();}}>{label}</button>)}
  </div>
  <div id={base+'-panel'} role="tabpanel" aria-labelledby={base+'-'+tab} className="space-y-6" tabIndex={0}>
   {tab==='region'&&<>
    <Card><div className="section-heading"><div><h2 className="text-xl font-bold">Cada capa responde una pregunta distinta</h2><p>Los documentos regionales y las observaciones de estación tienen alcances diferentes. Una zona sin clasificación validada conserva su estado desconocido.</p></div><label className="field">Capa de información<select value={layerId} onChange={e=>setLayerId(e.target.value)}>{data.map_layers.map(row=><option value={row.id} key={row.id}>{row.label}</option>)}</select></label></div>
     {layer&&<div className="climate-layer-status mt-5"><strong>{layer.label} · {layer.tarma_status}</strong><p>{layer.tarma_value||'No hay un valor puntual verificado para tu parcela de Tarma.'}</p><p>Resolución: {layer.spatial_resolution||'Sin capa regional validada'}.</p><div className="flex flex-wrap gap-3 mt-3">{layer.evidence_ids.map(id=>{const row=evidence.get(id);return row&&<a className="text-button" href={officialUrl(row.source.url)||undefined} target="_blank" rel="noreferrer" key={id}>{row.source.institution} · {row.kind==='observation'?'observado':'perspectiva'}<ArrowUpRight size={14}/></a>;})}</div></div>}
     <p className="help-text mt-4">La condición de la estación CO-Tarma no se usa para colorear toda la provincia. El catálogo no contiene polígonos validados de riesgo de parcela.</p>
    </Card>
    <div className="climate-evidence-grid">{senamhiRows.map(row=><div id={base+'-evidence-'+row.id} key={row.id}><EvidenceCard row={row} today={today}/></div>)}</div>
    <Card><h2 className="text-xl font-bold">Lo que aún necesitamos medir</h2><div className="climate-evidence-grid mt-5">{data.missing_indicators.map(row=><div className="climate-layer-status" key={row.id}><strong>{row.label}</strong><p>{row.reason}</p><span className="evidence-label mt-3">Dato no disponible</span></div>)}</div></Card>
   </>}
   {tab==='ocean'&&<>
    <Card><div className="section-heading"><div><h2 className="text-xl font-bold">Dos regiones del mar. Dos indicadores.</h2><p>Anomalía significa diferencia respecto a una referencia climática; no temperatura absoluta.</p></div><Thermometer size={25}/></div>
     <div className="evidence-stat-grid">{data.indicators.filter(row=>row.quantity==='sst_anomaly').map(row=>{const ref=evidence.get(row.evidence_id);return <div key={row.id}><span>{row.label} · {row.unit}</span><strong>{row.value===null?'No disponible':(row.value>0?'+':'')+row.value.toLocaleString('es-PE',{maximumFractionDigits:2})+' °C'}</strong><span>Reportado: {dateText(row.reported_on)}</span><span className="mt-2">Ventana observada exacta no precisada en el texto.</span>{ref&&<a className="text-button mt-3" href={officialUrl(ref.source.url)||undefined} target="_blank" rel="noreferrer">NOAA CPC<ArrowUpRight size={14}/></a>}</div>;})}</div>
     <p className="info-banner">La anomalía del mar no mide la lluvia de Tarma. El calentamiento costero y el Pacífico central no determinan por sí solos el precio de la papa.</p>
    </Card>
    <div className="climate-evidence-grid">{data.evidence.filter(row=>['enfen-2026-17-coastal','enfen-2026-17-regional','noaa-2026-10-forecast'].includes(row.id)).map(row=><EvidenceCard row={row} today={today} key={row.id}/>)}</div>
    <Card><h2 className="text-xl font-bold">Índices trimestrales: otra medida, otra fecha</h2><p className="help-text">ICEN, ONI y RONI conservan su metodología y último periodo propio. Se recuperaron como historia revisada; no se retrofechan para evaluar pronósticos del pasado.</p><div className="evidence-stat-grid">{data.indicators.filter(row=>row.quantity==='seasonal_index').map(row=><div key={row.id}><span>{row.label}</span><strong>{row.value===null?'Sin dato':row.value.toLocaleString('es-PE',{maximumFractionDigits:2})+' °C'}</strong><span>Periodo central: {dateText(row.observation_period)}</span><span className="mt-2">{row.methodology}</span></div>)}</div></Card>
   </>}
   {tab==='scenarios'&&scenario&&<>
    <Card><div className="section-heading"><div><h2 className="text-xl font-bold">Preparar una decisión sin inventar el impacto</h2><p>Estas opciones son hipótesis condicionales de planificación. No modifican el pronóstico estadístico de precio.</p></div><CloudRain size={25}/></div><label className="field mt-5">Situación a explorar<select value={scenarioId} onChange={e=>setScenarioId(e.target.value)}>{data.regional_scenarios.map(row=><option key={row.id} value={row.id}>{row.title}</option>)}</select></label>
     <div className="climate-layer-status mt-5"><span className="evidence-label" data-kind="agricultural_hypothesis">Hipótesis agrícola · sin probabilidad estimada</span><h3 className="text-xl font-bold mt-4">{scenario.title}</h3><p><strong>Supuesto que debes verificar</strong>{scenario.assumption}</p></div>
     <ul className="scenario-actions mt-5">{scenario.preparation.map(action=><li key={action}>{action}</li>)}</ul>
     <div className="evidence-stat-grid"><div><span>Variación del precio por este escenario</span><strong>No estimada</strong></div><div><span>Probabilidad de ocurrencia en la parcela</span><strong>No estimada</strong></div><div><span>Alcance del escenario</span><strong>Tarma · hipótesis local</strong></div></div>
     <p className="info-banner">{scenario.price_effect_reason}</p><ul className="scenario-actions mt-4">{scenario.limitations.map(limit=><li key={limit}>{limit}</li>)}</ul>
     <div className="flex flex-wrap gap-3 mt-6"><button className="primary" onClick={()=>navigate('planting')}>Planificar mi siembra<ArrowUpRight size={16}/></button><button className="secondary" onClick={()=>navigate('harvest')}>Evaluar mi venta<ArrowUpRight size={16}/></button></div>
     <p className="help-text mt-4">En los simuladores, ingresa tus costos conocidos. Una sensibilidad económica elegida por ti sigue siendo un supuesto, no un efecto climático validado.</p>
    </Card>
    <details className="evidence-glossary"><summary>Evidencia y límites del escenario</summary><div className="climate-evidence-grid mt-5">{scenario.evidence_ids.map(id=>evidence.get(id)).filter((r):r is ClimateEvidence=>Boolean(r)).map(row=><EvidenceCard row={row} today={today} key={row.id}/>)}</div></details>
   </>}
   {tab==='compare'&&comparison&&event&&<>
    <Card><div className="section-heading"><div><h2 className="text-xl font-bold">Comparar historia, sin repetir sus impactos</h2><p>Julio a junio en ventanas de doce meses. Cada panel conserva un único índice y metodología.</p></div><label className="field">Índice<select value={index} onChange={e=>setIndex(e.target.value)}>{data.event_comparisons.map(row=><option key={row.index} value={row.index}>{row.index} · {row.ocean_region}</option>)}</select></label></div>
     <label className="field mt-5">Ventana del evento<select value={eventId} onChange={e=>setEventId(e.target.value)}>{comparison.events.map(row=><option key={row.id} value={row.id}>{row.label} · {row.available_periods}/12 valores publicados</option>)}</select></label>
     <h3 className="text-lg font-bold mt-6">{comparison.index} · {event.label}</h3><p className="help-text">{comparison.methodology}. Eje horizontal: mes de la ventana, no fechas sintéticas ni observaciones del año actual.</p>
     <Bars rows={event.points.map(p=>({name:months[p.month_offset],value:p.value}))} unit={comparison.unit}/>
     <p className="info-banner">Los meses sin publicación permanecen vacíos. Los valores de 2027 no se completan con pronósticos ni ceros.</p>
     <div className="engine-table-scroll mt-5" role="region" aria-label="Comparación de índices por mes del evento" tabIndex={0}><table><thead><tr><th>Mes relativo</th>{comparison.events.map(row=><th key={row.id}>{row.label}</th>)}</tr></thead><tbody>{months.map((month,offset)=><tr key={month}><td>{month}</td>{comparison.events.map(row=>{const point=row.points.find(p=>p.month_offset===offset);return <td key={row.id} title={point?.period}>{point?.value===null||point?.value===undefined?'Sin dato':point.value.toLocaleString('es-PE',{maximumFractionDigits:2})}</td>;})}</tr>)}</tbody></table></div>
     <ul className="scenario-actions mt-4">{comparison.limitations.map(limit=><li key={limit}>{limit}</li>)}</ul>
    </Card>
   </>}
  </div>
  <details className="evidence-glossary"><summary><span className="inline-flex items-center gap-2"><TriangleAlert size={16}/>Qué puede y qué no puede decir esta evidencia</span></summary><ul className="scenario-actions">{data.limitations.map(limit=><li key={limit}>{limit}</li>)}</ul></details>
  <Glossary/>
 </section>;
}
