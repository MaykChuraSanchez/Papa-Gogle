import React, {useId} from 'react';
import {ResponsiveContainer, ComposedChart, Area, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, Brush, Bar, ReferenceLine, ReferenceArea, ScatterChart, Scatter} from 'recharts';
export const palette=['#10a46b','#e59a32','#7282e8','#db638d','#39aabb'];
const dateLabel=(v:any)=>Number.isFinite(Number(v))?new Date(Number(v)).toISOString().slice(0,10):'';
export function TimeChart({rows,lines,band=false,band95=false,forecastOrigin,brush=true,unit='S/ por kg',height=340}: {rows:any[];lines:{key:string;name:string;color?:string;dashed?:boolean}[];band?:boolean;band95?:boolean;forecastOrigin?:string;brush?:boolean;unit?:string;height?:number}) {
 const id=useId().replace(/:/g,'');
 if(!rows.length)return <div className="empty-state">No hay observaciones para estas fechas.</div>;
 return <div className="interactive-chart" role="group" aria-label={'Gráfico interactivo: '+lines.map(l=>l.name).join(', ')}>
 <div style={{height,width:'100%',minWidth:0}}><ResponsiveContainer width="100%" height="100%"><ComposedChart data={rows.map(p=>({...p,ts:Date.parse(p.date+'T12:00:00Z')}))} margin={{top:12,right:15,left:0,bottom:4}} accessibilityLayer>
 <defs><linearGradient id={'fill'+id} x1="0" y1="0" x2="0" y2="1"><stop offset="0%" stopColor="#20C77A" stopOpacity={.24}/><stop offset="100%" stopColor="#20C77A" stopOpacity={.015}/></linearGradient></defs>
 {forecastOrigin&&rows.some(r=>r.date>forecastOrigin)&&<ReferenceArea x1={Date.parse(forecastOrigin+'T12:00:00Z')} x2={Date.parse(rows.at(-1).date+'T12:00:00Z')} fill="#e59a32" fillOpacity={.045}/>}
 <CartesianGrid strokeDasharray="3 5" vertical={false} stroke="#e7eeea"/>
 <XAxis type="number" dataKey="ts" domain={['dataMin','dataMax']} scale="time" tickFormatter={v=>dateLabel(v).slice(0,7)} minTickGap={45} tick={{fontSize:12,fill:'#526b5e'}} axisLine={false} tickLine={false}/>
 <YAxis width={48} tick={{fontSize:12,fill:'#526b5e'}} domain={['auto','auto']} tickFormatter={v=>Number(v).toFixed(1)} axisLine={false} tickLine={false}/>
 <Tooltip labelFormatter={dateLabel} formatter={(value:any,name:any)=>[Array.isArray(value)?value.map(v=>Number(v).toFixed(2)).join(' – '):Number(value).toFixed(3),name]} contentStyle={{borderRadius:12,border:'1px solid #d8e9df',boxShadow:'0 8px 30px #0b302515',fontSize:12}}/>
 <Legend wrapperStyle={{fontSize:12,paddingTop:12}}/>
 {band95&&<Area type="linear" dataKey="band95" name="Rango diario · objetivo 95%" fill="#7282e8" fillOpacity={.12} stroke="none" isAnimationActive={false}/>}
 {band&&<Area type="linear" dataKey="band" name="Rango diario · objetivo 80%" fill="#20C77A" fillOpacity={.18} stroke="none" isAnimationActive={false}/>}
 {forecastOrigin&&rows.some(r=>r.date>forecastOrigin)&&<ReferenceLine x={Date.parse(forecastOrigin+'T12:00:00Z')} stroke="#7b715c" strokeDasharray="4 4" label={{value:'Corte de datos',position:'insideTopRight',fontSize:11,fill:'#665333'}}/>}
 {lines.map((l,n)=><Line key={l.key} type="linear" dataKey={l.key} name={l.name} stroke={l.color||palette[n%palette.length]} strokeWidth={2} dot={false} connectNulls={false} strokeDasharray={l.dashed?'5 4':undefined} isAnimationActive={false}/>)}
 {brush&&rows.length>25&&<Brush dataKey="ts" height={26} stroke="#9cbca9" fill="#f5faf7" tickFormatter={v=>dateLabel(v).slice(0,7)} travellerWidth={12} ariaLabel="Ajustar período del gráfico"/>}
 </ComposedChart></ResponsiveContainer></div><div className="chart-foot"><span>{unit}</span><span>{brush?'Arrastra los extremos de la barra para ampliar un período.':'Pasa el cursor o toca el gráfico para ver valores.'}</span></div></div>;
}
export function Bars({rows,x='name',y='value',unit='S/ por kg',color='#10a46b'}:{rows:any[];x?:string;y?:string;unit?:string;color?:string}){
 return <div role="group" aria-label={'Gráfico de barras · '+unit} style={{height:270,minWidth:0}}><ResponsiveContainer width="100%" height="100%"><ComposedChart data={rows} margin={{top:12,right:14,bottom:8,left:0}} accessibilityLayer><CartesianGrid strokeDasharray="3 5" vertical={false}/><XAxis dataKey={x} tick={{fontSize:10}} interval="preserveStartEnd"/><YAxis tick={{fontSize:11}} width={48}/><Tooltip formatter={(v:any)=>[Number(v).toLocaleString('es-PE',{maximumFractionDigits:3}),unit]} contentStyle={{borderRadius:12,fontSize:12}}/><ReferenceLine y={0} stroke="#9bb4a5"/><Bar dataKey={y} fill={color} radius={[5,5,0,0]} isAnimationActive={false}/></ComposedChart></ResponsiveContainer></div>;
}
export function OfferScatter({rows}:{rows:{date:string;x:number;y:number}[]}){
 if(rows.length<3)return <div className="empty-state">Faltan fechas comunes con volumen observado para mostrar la relación.</div>;
 return <div style={{height:300,minWidth:0}} role="group" aria-label="Dispersión entre volumen observado y precio"><ResponsiveContainer width="100%" height="100%"><ScatterChart margin={{top:12,right:20,bottom:16,left:0}} accessibilityLayer><CartesianGrid strokeDasharray="3 5"/><XAxis type="number" dataKey="y" name="Volumen" unit=" t" tick={{fontSize:10}}/><YAxis type="number" dataKey="x" name="Precio" unit=" S/kg" tick={{fontSize:10}} width={70}/><Tooltip cursor={{strokeDasharray:'3 3'}} formatter={(v:any,name:any)=>[Number(v).toFixed(2),name]} contentStyle={{borderRadius:12,fontSize:12}}/><Scatter data={rows} fill="#7282e8" fillOpacity={.45} isAnimationActive={false}/></ScatterChart></ResponsiveContainer></div>;
}
