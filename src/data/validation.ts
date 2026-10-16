import {addDays} from '../utils/forecast';

export function validForecastPublication(data:any){
 if(!data || !Array.isArray(data.forecast) || !data.forecast.length)return false;
 const valid=(curve:any[],horizon:number)=>Array.isArray(curve)&&curve.length===horizon&&curve.every((p:any,i:number)=>{
  if(![p.price,p.low,p.high].every(Number.isFinite)||p.price<=0||p.low<0||p.low>p.price||p.price>p.high)return false;
  if(p.date!==addDays(data.last_date,i+1)||p.lead!==i+1)return false;
  if(p.low95!==undefined||p.high95!==undefined){
   if(![p.low95,p.high95].every(Number.isFinite)||p.low95<0||p.low95>p.low||p.high95<p.high)return false;
  }
  return true;
 });
 try{
  if(!valid(data.forecast,240))return false;
  if(data.forecasts_by_horizon){
   const keys=Object.keys(data.forecasts_by_horizon);
   if(keys.length!==6||![7,15,30,90,180,240].every(h=>keys.includes(String(h))))return false;
   for(const key of keys)if(!valid(data.forecasts_by_horizon[key],Number(key)))return false;
  }
  return true;
 }catch{return false;}
}
