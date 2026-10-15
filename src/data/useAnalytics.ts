import {useEffect,useState} from 'react';
import {slug} from '../utils/analytics';
export interface AuditRow {date:string;actual:number;predicted:number;baseline:number;residual:number;covered:boolean;origin:string}
export interface Diagnostics {variety:string;market_id:string;data_hash:string;volume:{date:string;volume:number|null}[];audit:{horizon:number;model:string;verified:boolean;width:number;rows:AuditRow[]}[]}
export function useAnalytics(variety:string,hash?:string,enabled=true){
 const [data,setData]=useState<Diagnostics|null>(null),[error,setError]=useState('');
 useEffect(()=>{let active=true;setData(null);setError('');if(!enabled)return;fetch('/analytics/'+slug(variety)+'.json',{cache:'no-cache'}).then(r=>{if(!r.ok)throw Error();return r.json();}).then(d=>{if(d.variety!==variety||d.market_id!=='15011501'||(hash&&d.data_hash!==hash))throw Error();if(active)setData(d);}).catch(()=>{if(active)setError('Diagnósticos aún no disponibles para esta publicación.');});return()=>{active=false;};},[variety,hash,enabled]);return {data,error};
}
