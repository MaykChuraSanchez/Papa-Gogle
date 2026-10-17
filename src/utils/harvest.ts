export function validateHarvest(value:any,variety:string,hash:string,run:string,horizon?:number,target?:string){
 if(value?.variety!==variety||value?.history_hash!==hash||value?.run_id!==run)throw Error('La evaluación no corresponde al histórico seleccionado.');
 if(horizon!==undefined){
  if(value.horizon!==horizon||value.target!==target||value.schema_version!=='6.0.0')throw Error('Objetivo de evaluación incompatible.');
  if(!Array.isArray(value.rows)||!value.current||!Array.isArray(value.current.path)||value.current.path.length!==horizon)throw Error('Evidencia de cosecha incompleta.');
  if(!Number.isFinite(value.current.point)||value.current.point<=0||value.current.path.some((p:any)=>!Number.isFinite(p.price)||p.price<=0))throw Error('Precios de evaluación inválidos.');
  const n=value.rows.filter((r:any)=>Object.keys(r.selection_scores).length>0).length;
  if(value.policy?.n!==n||value.baseline?.n!==n)throw Error('Orígenes de comparación incompatibles.');
 }
 return value;
}
