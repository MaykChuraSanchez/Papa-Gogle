import type { Point } from '../data/contracts';
export const slug = (v: string) => v.normalize('NFD').replace(/[\u0300-\u036f]/g,'').toLowerCase().replace(/ /g,'-');
export function monthly(points: Point[]) {
  const bins=new Map<string,{sum:number;n:number}>();
  for(const p of points){if(!Number.isFinite(p.price))continue;const month=p.date.slice(0,7);const b=bins.get(month)||{sum:0,n:0};b.sum+=p.price;b.n++;bins.set(month,b);}
  return [...bins].sort(([a],[b])=>a.localeCompare(b)).map(([date,b])=>({date:date+'-01',price:b.sum/b.n,n:b.n}));
}
export function aligned(a:Point[],b:Point[]){const index=new Map(b.map(p=>[p.date,p.price]));return a.filter(p=>index.has(p.date)&&Number.isFinite(p.price)&&Number.isFinite(index.get(p.date))).map(p=>({date:p.date,x:p.price,y:index.get(p.date)!}));}
export function pearson(rows:{x:number;y:number}[]) {
  if(rows.length<3)return null; const mx=rows.reduce((s,p)=>s+p.x,0)/rows.length,my=rows.reduce((s,p)=>s+p.y,0)/rows.length;
  const xx=rows.reduce((s,p)=>s+(p.x-mx)**2,0),yy=rows.reduce((s,p)=>s+(p.y-my)**2,0);
  return xx&&yy ? rows.reduce((s,p)=>s+(p.x-mx)*(p.y-my),0)/Math.sqrt(xx*yy):null;
}
export function monthlyChanges(points:Point[]){const values=new Map(points.map(p=>[p.date,p.price]));return points.flatMap(p=>{const prior=new Date(p.date+'T12:00:00Z');prior.setUTCMonth(prior.getUTCMonth()-1);const v=values.get(prior.toISOString().slice(0,10));return v&&v>0&&p.price>0?[{date:p.date,price:Math.log(p.price/v)}]:[];});}
export function saveCsv(name:string, rows:Record<string,unknown>[]){if(!rows.length)return;const keys=Object.keys(rows[0]);const cell=(v:unknown)=>'"'+String(v??'').replace(/"/g,'""')+'"';const csv='\uFEFF'+[keys.map(cell).join(','),...rows.map(r=>keys.map(k=>cell(r[k])).join(','))].join('\r\n');const url=URL.createObjectURL(new Blob([csv],{type:'text/csv;charset=utf-8'}));const link=document.createElement('a');link.href=url;link.download=name;link.click();setTimeout(()=>URL.revokeObjectURL(url),1000);}
