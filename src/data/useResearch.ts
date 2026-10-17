import {useEffect,useState} from 'react';
import {validateResearchSummary,validateResearchDetail} from '../utils/research';
import {decodeEvidence} from '../utils/evidence';
export interface ResearchMetric {mae:number;rmse:number;bias:number;wape:number;mase:number|null;n:number;origins:number;coverage80?:number;coverage95?:number}
export interface ResearchPoint {date:string;lead:number;price:number;low:number;high:number;low95:number;high95:number;model:string;evaluated_horizon:number}
export interface ResearchCandidate {model:string;selection:ResearchMetric;audit:ResearchMetric;endpoint_audit:ResearchMetric|null;current_metadata:Record<string,any>}
export interface ResearchDetail {
 horizon:number;run_id:string;variety:string;as_of:string;published_model:string;selected_challenger:string;promoted:boolean;
 published_audit:ResearchMetric;published_endpoint_audit:ResearchMetric|null;baseline_audit:ResearchMetric;
 forecast_paths:Record<string,ResearchPoint[]>;candidates:ResearchCandidate[];promotion_reasons:string[];
 comparison:{relative_mae_improvement:number;p_holm:number;ci95_absolute_reduction:number[];effective_blocks_approx:number;wins_by_origin:number;block_length_origins:number;bootstrap_replicates:number};
 failures:{model:string;phase:string;origin?:string;reason:string}[];phases:Record<string,string[]>;sealed_test:{start:string;end:string;scored:boolean;limitation:string};
 threshold_sensitivity:Record<string,boolean>;audit_file:string;audit_content_sha256:string;gate:{minimum_relative_mae_improvement:number};
}
export interface ResearchSummary {variety:string;run_id:string;last_date:string;last_price:number;history_hash:string;quality:any;eda:any;source_urls:string[];details_by_horizon:Record<string,string>}
const cached=new Map<string,Promise<any>>();
export function evidenceJson(url:string,checksum?:string,contentChecksum?:string):Promise<any>{
 const key=url+':'+(checksum||'')+':'+(contentChecksum||'');
 if(!cached.has(key))cached.set(key,fetch(url,{cache:'no-cache'}).then(async r=>{if(!r.ok)throw Error('La evidencia no está disponible. Conserva la publicación operativa.');return decodeEvidence(await r.arrayBuffer(),checksum,url.endsWith('.gz'),contentChecksum);}).catch(e=>{cached.delete(key);throw e;}));
 return cached.get(key)!;
}
export function researchAsset(file:string,contentChecksum?:string){if(!/^[a-f0-9]{64}\.json(?:\.gz)?$/.test(file))return Promise.reject(Error('Referencia de evidencia inválida.'));return evidenceJson('/research-v5/'+file,file.slice(0,64),contentChecksum);}

export function useResearch(variety:string,hash?:string,horizon=30){
 const [summary,setSummary]=useState<ResearchSummary|null>(null),[detail,setDetail]=useState<ResearchDetail|null>(null),[error,setError]=useState(''),[retryId,setRetry]=useState(0);
 useEffect(()=>{let active=true;setSummary(null);setDetail(null);setError('');if(!hash)return;cached.delete('/research-v5/index.json::');evidenceJson('/research-v5/index.json').then(async m=>{if(m.schema_version!=='5.0.0')throw Error('Versión de evidencia incompatible.');const s=m.series.find((r:any)=>r.variety===variety);if(!s)throw Error('Esta variedad todavía no tiene evaluación complementaria.');if(s.history_hash!==hash)throw Error('El histórico cambió: esta evaluación necesita una nueva ejecución.');const result=await researchAsset(s.file);return validateResearchSummary(result,variety,hash,m.run_id);}).then(s=>{if(active)setSummary(s);}).catch(e=>{if(active)setError(e.message);});return()=>{active=false;};},[variety,hash,retryId]);
 useEffect(()=>{let active=true;setDetail(null);setError('');if(!summary||summary.variety!==variety||summary.history_hash!==hash)return;researchAsset(summary.details_by_horizon[String(horizon)]).then(d=>{validateResearchDetail(d,summary,horizon);if(active){setDetail(d);setError('');}}).catch(e=>{if(active)setError(e.message);});return()=>{active=false;};},[summary,horizon,variety,hash]);
 const currentSummary=summary?.variety===variety&&summary?.history_hash===hash?summary:null;
 const currentDetail=currentSummary&&detail?.run_id===currentSummary.run_id&&detail?.variety===variety&&detail?.horizon===horizon?detail:null;
 return {summary:currentSummary,detail:currentDetail,error,retry:()=>setRetry(n=>n+1)};
}
