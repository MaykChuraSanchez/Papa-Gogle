import type {ResearchDetail,ResearchSummary} from '../data/useResearch';
import {addDays} from './forecast';
const asset=/^[a-f0-9]{64}\.json(?:\.gz)?$/;
export function validateResearchSummary(s:ResearchSummary,variety:string,hash:string,run:string){
 if(s.variety!==variety||s.history_hash!==hash||s.run_id!==run)throw Error('La variedad y su evaluación no coinciden.');
 for(const h of [7,15,30,90,180,240])if(!asset.test(s.details_by_horizon?.[h]))throw Error('La evaluación no contiene todos los horizontes.');
 return s;
}
export function validateResearchDetail(d:ResearchDetail,s:ResearchSummary,h:number){
 if(d.run_id!==s.run_id||d.variety!==s.variety||d.horizon!==h||d.as_of!==s.last_date)throw Error('El horizonte no corresponde a esta ejecución.');
 if(!/^[a-f0-9]{64}$/.test(d.audit_content_sha256)||!asset.test(d.audit_file)||!d.forecast_paths?.[d.published_model])throw Error('Falta la evidencia del modelo admitido.');
 for(const [model,path] of Object.entries(d.forecast_paths)){
  if(path.length!==h)throw Error('La trayectoria está incompleta.');
  path.forEach((p,i)=>{if(p.date!==addDays(s.last_date,i+1)||p.lead!==i+1||p.model!==model||p.evaluated_horizon!==h||![p.price,p.low,p.high,p.low95,p.high95].every(n=>Number.isFinite(n)&&n>0)||p.low95>p.low||p.low>p.price||p.price>p.high||p.high>p.high95)throw Error('Fechas o rangos incompatibles en la trayectoria.');});
 }
 return d;
}
