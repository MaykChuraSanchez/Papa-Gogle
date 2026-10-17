import {useEffect,useState} from 'react';
import {evidenceJson} from './useResearch';
import {validateHarvest} from '../utils/harvest';
function asset(name:string){if(!/^[a-f0-9]{64}\.json$/.test(name))throw Error('Referencia de cosecha inválida.');return evidenceJson('/harvest-v6/'+name,name.slice(0,64));}
export function useHarvest(variety:string,hash:string|undefined,horizon:number,target:string){
 const [data,setData]=useState<any>(null),[error,setError]=useState(''),[retry,setRetry]=useState(0);
 useEffect(()=>{let active=true;setData(null);setError('');if(!hash)return;
  evidenceJson('/harvest-v6/index.json').then(async index=>{
   if(index.schema_version!=='6.0.0')throw Error('Versión de cosecha incompatible.');
   const ref=index.series.find((s:any)=>s.variety===variety);
   if(!ref||ref.history_hash!==hash)throw Error('Esta evaluación necesita actualizarse con el histórico vigente.');
   const summary=validateHarvest(await asset(ref.file),variety,hash,index.run_id);
   const detail=validateHarvest(await asset(summary.details[horizon+'-'+target]),variety,hash,index.run_id,horizon,target);
   return {summary,detail};
  }).then(result=>{if(active)setData(result);}).catch(e=>{if(active)setError(e.message);});return()=>{active=false;};
 },[variety,hash,horizon,target,retry]);
 const current=data?.summary.variety===variety&&data?.summary.history_hash===hash&&data?.detail.horizon===horizon&&data?.detail.target===target?data:null;
 return {...current,error,retry:()=>setRetry(n=>n+1)};
}
