import React from 'react';
import {ExternalLink} from 'lucide-react';
import {useForecastingSources} from '../data/useForecasting';

export function SourceEvidence(){
 const {data,error}=useForecastingSources();
 if(!data)return <p className="help-text mb-5" role="status">{error||'Cargando trazabilidad de las fuentes complementarias…'}</p>;
 const sourceRows=[['icen','ICEN costero'],['enfen','Comunicados ENFEN'],['macro','BCRP · cuatro series'],['central','ONI / RONI central'],['weather','Estaciones SENAMHI'],['emmsa','Boletines EMMSA']].map(([key,name])=>{
  const source=data[key]||{},rows=source.rows||source.catalog||[],dates=rows.map((r:any)=>r.periodo_observacion||r.fecha_publicacion).filter(Boolean).sort();
  const urls={icen:'https://siofen.imarpe.gob.pe/nivel2/indice-costero-el-nino-icen',enfen:'https://enfen.imarpe.gob.pe/',macro:'https://estadisticas.bcrp.gob.pe/estadisticas/series/ayuda/api',central:'https://www.cpc.ncep.noaa.gov/products/analysis_monitoring/enso/roni/',weather:'https://www.senamhi.gob.pe/site/descarga-datos/',emmsa:'https://www.emmsa.com.pe/estadistica/estBoletines/bol_semanal.php'};
  const status=data.status?.sources?.find((s:any)=>s.source===key);
  const recovered=[...rows.map((r:any)=>r.fecha_actualizacion),...(source.catalog||[]).map((r:any)=>r.metadata?.retrieved_at)].filter(Boolean).sort();
  return {key,name,n:rows.length,start:dates[0],end:dates.at(-1),at:source.metadata?.retrieved_at||recovered.at(-1)||source.retrieved_at,state:status?.state||source.state||'NO DISPONIBLE',url:urls[key as keyof typeof urls],note:source.reason||source.note||'Alertas candidatas con reconstrucción conservadora de disponibilidad; consultar auditoría.'};
 });
 return <section className="surface-card bg-white rounded-3xl border border-slate-200 shadow-sm p-5 sm:p-7 mb-6"><div className="section-heading"><div><h2>Trazabilidad del motor de pronósticos</h2><p>Datos recuperados y su uso permitido. CACHE identifica una descarga conservada; no convierte un archivo revisado en un vintage histórico.</p></div></div><div className="engine-table-scroll" tabIndex={0} role="region" aria-label="Tabla con desplazamiento horizontal y vertical"><table><thead><tr><th>Fuente</th><th>Estado de acceso</th><th>Registros / enlaces</th><th>Cobertura observada</th><th>Última recuperación del original</th><th>Uso y limitación</th></tr></thead><tbody>{sourceRows.map(r=><tr key={r.key}><td><a className="text-button" href={r.url} target="_blank" rel="noreferrer">{r.name}<ExternalLink size={13}/></a></td><td>{r.state}</td><td>{r.n}</td><td>{r.start?`${r.start} — ${r.end}`:'Catálogo; sin serie diaria importada'}</td><td>{r.at||'Ver metadatos del original'}</td><td>{r.note}</td></tr>)}</tbody></table></div><p className="help-text mt-4">EMMSA es un catálogo semanal; SENAMHI es un catálogo de estaciones. Sus conteos no son precios diarios ni mediciones meteorológicas. No hay datos sintéticos en esta publicación.</p></section>;
}
