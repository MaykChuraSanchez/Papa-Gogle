import {readFile} from 'node:fs/promises';
import path from 'node:path';
import {addDays,forecastWindow,limaToday,money,economics,freshness} from '../src/utils/forecast.ts';
import type {DataIndex,Series} from '../src/data/contracts';
export const normal=(s:string)=>s.normalize('NFD').replace(/[\u0300-\u036f]/g,'').toLowerCase();
export async function contextFor(input:{question:string;variety?:string;date?:string},root=process.cwd()){
 const question=input.question;if(typeof question!=='string'||!question.trim()||question.length>1500)throw new Error('Escribe una pregunta de entre 1 y 1500 caracteres.');
 const index:DataIndex=JSON.parse(await readFile(path.join(root,'public/data/index.json'),'utf8'));
 const named=index.series.find(s=>normal(question).includes(normal(s.variety)));
 const summary=named||index.series.find(s=>s.variety===input.variety)||index.series.find(s=>s.variety==='Canchán')!;
 if(!/^[a-f0-9]{20}\.json$/.test(summary.file))throw Error('Publicación no válida');
 const series:Series=JSON.parse(await readFile(path.join(root,'public/data',summary.file),'utf8'));
 const today=limaToday(),date=question.match(/\d{4}-\d{2}-\d{2}/)?.[0]||input.date||(/mañana/i.test(question)?addDays(today,1):today);
 const min=series.variety==='Canchán'?115:120,max=series.variety==='Canchán'?130:160;
 let planting:any=null,forecastError='';
 try{const start=addDays(date,min),end=addDays(date,max),p=forecastWindow(series,start,end);planting={date,start,end,minCycle:min,maxCycle:max,price:p.price,low:p.low,high:p.high,models:p.models,experimental:p.experimental};}catch(e){forecastError=(e as Error).message;}
 const facts={variety:series.variety,market:series.market,market_id:series.market_id,lastDate:series.last_date,lastPrice:series.last_price,staleness:freshness(series),planting,forecastError,
   evaluation:series.evaluations.map(e=>({days:e.horizon,model:e.model,mae:e.audit.mae,rmse:e.audit.rmse,coverage:e.audit.coverage80,status:e.status})),
   unavailable:['Precio local en chacra','Clima actual de una parcela','Efectos causales de El Niño','Rendimiento agronómico previsto','Garantía de ganancia'],
   sources:[{name:'SISAP',url:'http://sistemas.midagri.gob.pe/sisap/portal2/mayorista/resumenes/consultar/'}]};
 let local='';
 if(/clima|lluvia|niño|helada|temperatura/i.test(question))local='Todavía no hay estaciones SENAMHI ni boletines ENFEN conectados a esta publicación. No puedo afirmar el clima actual de tu parcela ni aplicar un efecto climático al precio. Puedes consultar los enlaces oficiales en Clima y trabajar con escenarios explícitos en el simulador.';
 else if(/error|precision|precisión|modelo|riesgo/i.test(question)){const e=facts.evaluation.find(e=>e.days===180)!;local=`Para ${facts.variety}, a 180 días se seleccionó ${e.model}. El error absoluto medio de auditoría fue ${money(e.mae)}/kg y la cobertura observada del rango fue ${((e.coverage||0)*100).toFixed(1)}%, frente a un objetivo de 80%. Estado: ${e.status}. Revisa en Laboratorio la comparación entre precio real y pronosticado.`;}
 else if(/vender|esperar|almacen|almacén/i.test(question))local=`El último precio mayorista observado de ${facts.variety} fue ${money(facts.lastPrice)}/kg el ${facts.lastDate}. En «Ya coseché» puedes comparar ese precio con esperar 7 o 14 días, incluyendo merma, flete, comisión y almacén. Una subida del precio no garantiza que esperar deje más ingreso. ${facts.staleness}`;
 else if(/sembr|cosech|futuro|campaña/i.test(question)){local=planting?`Si siembras ${facts.variety} el ${planting.date}, con un ciclo supuesto de ${min}–${max} días, tu ventana de cosecha sería ${planting.start} a ${planting.end}. El promedio de las predicciones diarias del GMML Lima es ${money(planting.price)}/kg, con límites diarios promediados de ${money(planting.low)}–${money(planting.high)}. Modelo(s): ${planting.models.join(', ')}. ${planting.experimental?'El resultado es experimental. ':''}La ubicación no convierte este dato en un precio local. Ajusta el ciclo y tus costos en el simulador; este rango no es un intervalo calibrado para el promedio.`:facts.forecastError;}

 else if(/precio|cuanto|cuánto/i.test(question))local=`El último precio observado de ${facts.variety} en ${facts.market} es ${money(facts.lastPrice)}/kg, con fecha ${facts.lastDate}. Es una cotización mayorista, no un precio en chacra. ${facts.staleness} En «Explorar precios» puedes filtrar desde 2019, comparar variedades, ver oferta observada y descargar tu selección.`;
 else local='Puedo ayudarte a interpretar el precio de papa, estimar una ventana de cosecha, comparar costos o entender los errores del modelo. Prueba: «Quiero sembrar Canchán mañana en Tarma» o «¿Qué tan confiable es el modelo de Amarilla?». Las respuestas locales se basan en los datos publicados; una conversación más abierta requiere activar el proveedor de IA.';
 return {facts,local};
}
