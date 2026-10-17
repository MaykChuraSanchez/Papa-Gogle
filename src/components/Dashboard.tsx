import React, {useState} from 'react';
import {ArrowRight, CalendarDays, Truck, ScanLine, ShieldCheck, ArrowUpRight, Layers, BrainCircuit, Sprout, CloudSun, MapPin, ExternalLink} from 'lucide-react';
import {useData} from '../data/DataContext';
import {money, change} from '../utils/forecast';
import {Card} from './ConnectedViews';
import {FarmScene} from './FarmScene';
import {FieldStories} from './FieldStories';
import {Explorer} from './Explorer';
import {usePresentationMotion} from '../hooks/usePresentationMotion';
import type {ViewTab} from '../types/agro';

const horizons = [7, 15, 30, 90, 180, 240];
export function Dashboard({navigate}: {navigate: (v: ViewTab) => void}) {
  const presentation = usePresentationMotion();
  const {index, series, select} = useData();
  const [horizon, setHorizon] = useState(180);
  if (!series || !index) return null;
  const delta = change(series.history, 7);
  const evaluation = series.evaluations.find(e => e.horizon === horizon);
  const curve = series.forecasts_by_horizon?.[String(horizon)];
  const endpoint = curve?.at(-1) || series.forecast.find(p => p.lead === horizon && p.evaluated_horizon === horizon);
  const maximumLead = Math.max(0, ...series.forecast.map(p => p.lead));
  const coverage = evaluation?.audit.coverage80;
  const baseline = evaluation?.baseline_audit.mae;
  const improvement = evaluation && baseline && baseline > 0 ? 100 * (baseline - evaluation.audit.mae) / baseline : null;
  const availableHorizons = horizons.filter(h => series.evaluations.some(e => e.horizon === h));
  const start = series.history[0]?.date;
  const source = index.sources.find(s => s.id === 'sisap');
  return <div ref={presentation} className="dashboard space-y-6">
    <section className="dashboard-hero">
      <div className="hero-copy" data-presentation="hero-copy">
        <div className="hero-kicker"><span className="status-dot"/>AGRODECIDE · TU CAMPAÑA, CON PERSPECTIVA</div>
        <h1>El futuro de tu cosecha<br/><em>empieza con datos.</em></h1>
        <p>Entiende el mercado de la papa. Explora su historia, prepara tu próxima siembra y compara tus opciones antes de decidir.</p>
        <div className="hero-actions flex flex-wrap gap-3 mt-7">
          <button className="primary" onClick={() => navigate('planting')}><CalendarDays size={17}/>Planificar mi siembra<ArrowRight size={16}/></button>
          <button className="secondary" onClick={() => navigate('harvest')}><Truck size={17}/>Evaluar mi cosecha</button>
        </div>
        <div className="hero-proof"><span><ShieldCheck size={14}/>Fuentes públicas</span><span><Layers size={14}/>{index.series.length} variedades</span><span><ScanLine size={14}/>Modelos evaluados</span></div>
      </div>
      <div data-presentation="hero-crop" data-delay="70"><FarmScene/></div>
    </section>

    <div className="dashboard-ribbon"><span><i/>PUBLICACIÓN DISPONIBLE</span><p>Último dato SISAP: <strong>{series.last_date}</strong> · GMML Lima · No es precio en chacra</p><button onClick={() => navigate('sync')}>Ver fuentes<ArrowUpRight size={14}/></button></div>

    <section className="market-pulse" aria-labelledby="market-pulse-title">
      <div className="section-heading"><div><span className="eyebrow">01 · OBSERVA</span><h2 id="market-pulse-title">El mercado cambia. Empieza por conocerlo.</h2><p>Papa {series.variety} · {series.market} · cotización mayorista en soles por kilogramo.</p></div><button className="text-button" onClick={() => navigate('market')}>Explorar el histórico<ArrowUpRight size={16}/></button></div>
      <div className="dashboard-kpis">
        {[
          {label: 'PRECIO DE ' + series.variety.toUpperCase(), value: money(series.last_price), note: `SISAP · ${series.last_date} · S/kg`},
          {label: 'CAMBIO EN 7 DÍAS', value: delta === null ? 'Sin dato' : `${delta >= 0 ? '+' : ''}${delta.toFixed(1)}%`, note: 'Variación frente a la misma fecha una semana antes'},
          {label: 'HISTORIA DISPONIBLE', value: series.observations.toLocaleString('es-PE'), note: `Cotizaciones observadas${start ? ' desde ' + start : ''}`},
          {label: 'PROYECCIÓN DISPONIBLE', value: maximumLead ? `${maximumLead} días` : 'Sin proyección', note: 'Curva publicada · consulta sus límites por horizonte'},
        ].map(k => <div className="dashboard-kpi" key={k.label}><div><span>{k.label}</span></div><strong>{k.value}</strong><p>{k.note}</p></div>)}
      </div>
    </section>

    <section aria-labelledby="decision-paths-title" className="decision-section">
      <div className="section-heading"><div><span className="eyebrow">02 · COMPARA TUS OPCIONES</span><h2 id="decision-paths-title">¿En qué momento está tu campaña?</h2><p>Empieza con una pregunta concreta. Tus fechas, costos y supuestos dan contexto a cada escenario.</p></div></div>
      <div className="decision-paths">
        {[
          {id: 'planting' as ViewTab, num: '01', title: 'Quiero sembrar', text: 'Explora tu ventana de cosecha y calcula el precio que necesitarías para cubrir tus costos.', icon: <CalendarDays/>, cta: 'Diseñar mi campaña'},
          {id: 'harvest' as ViewTab, num: '02', title: 'Ya tengo cosecha', text: 'Compara escenarios de venta con tus costos de transporte, merma y almacenamiento.', icon: <Truck/>, cta: 'Comparar mi venta'},
          {id: 'architecture' as ViewTab, num: '03', title: 'Necesito orientación', text: 'Pregunta por el mercado y consulta las fuentes y límites de la respuesta.', icon: <BrainCircuit/>, cta: 'Abrir el asistente'},
        ].map(p => <button className="decision-path" data-presentation={'path-' + p.id} data-delay={Number(p.num) * 40} key={p.id} onClick={() => navigate(p.id)}><div className="flex justify-between items-center"><span className="path-icon">{p.icon}</span><span className="path-number">{p.num}</span></div><h3>{p.title}</h3><p>{p.text}</p><strong>{p.cta}<ArrowRight size={16}/></strong></button>)}
      </div>
    </section>

    <Explorer compact/>

    <section className="campaign-roadmap" data-presentation="campaign-roadmap" aria-labelledby="campaign-roadmap-title">
      <div className="campaign-roadmap-intro"><span className="eyebrow"><Sprout size={14}/>03 · DA PERSPECTIVA A TU CAMPAÑA</span><h2 id="campaign-roadmap-title">De la siembra a una decisión mejor informada.</h2><p>El tiempo de cultivo depende de la variedad y las condiciones de tu parcela. Ajusta el ciclo en el simulador antes de comparar precios.</p><button className="primary" onClick={() => navigate('planting')}>Configurar fechas y costos<ArrowRight size={16}/></button></div>
      <ol className="campaign-timeline"><li><span className="campaign-step-icon"><Sprout size={21}/></span><div><span>ANTES DE SEMBRAR</span><h3>Define tus supuestos</h3><p>Fecha, variedad, área, rendimiento y costos que conoces de tu campaña.</p></div></li><li><span className="campaign-step-icon"><CloudSun size={21}/></span><div><span>DURANTE EL CULTIVO</span><h3>Revisa el contexto</h3><p>Separa la evolución del mercado de los avisos climáticos y del estado real de tu parcela.</p></div></li><li><span className="campaign-step-icon"><Truck size={21}/></span><div><span>AL PREPARAR TU VENTA</span><h3>Compara escenarios</h3><p>Contrasta el precio mayorista estimado con tus costos, merma y logística.</p></div></li></ol>
    </section>

    <div className="dashboard-outlook-grid">
      <Card className="dashboard-varieties"><div className="section-heading"><div><span className="eyebrow">04 · AMPLÍA LA MIRADA</span><h2>Tu mercado, de un vistazo.</h2><p>Última cotización de cada variedad. Selecciona una para comparar su comportamiento.</p></div><button className="text-button" onClick={() => navigate('varieties')}>Comparar<ArrowUpRight size={16}/></button></div><div className="variety-watchlist">{index.series.map(s => <button key={s.variety} onClick={() => {select(s.variety); navigate('varieties');}}><span className="potato-dot" aria-hidden="true"/><span>{s.variety}<small className="watchlist-date">{s.last_date}</small></span><strong>{money(s.last_price)}<small>/kg</small></strong><ArrowUpRight size={15}/></button>)}</div><p className="data-lineage">SISAP · GMML Lima · precios observados · no son precios en chacra.</p></Card>
      <section className="evidence-card" aria-labelledby="evidence-card-title">
        <span className="badge">EL PRONÓSTICO, CON SUS LÍMITES</span><h2 id="evidence-card-title">Elige el plazo. Mira la evidencia.</h2>
        <div className="evidence-horizons" role="group" aria-label="Horizonte de la ficha del pronóstico">{horizons.map(h => <button key={h} disabled={!availableHorizons.includes(h)} aria-pressed={horizon === h} onClick={() => setHorizon(h)}>{h} días</button>)}</div>
        {evaluation ? <>
          <p>Para papa <strong>{series.variety}</strong>, a {horizon} días, se publica <strong>{evaluation.model.split(' | ')[0]}</strong>. Los errores siguientes corresponden a la auditoría histórica de la trayectoria de ese horizonte.</p>
          <div className="evidence-metrics"><div><strong>{money(evaluation.audit.mae)}</strong><span>Error medio por kg</span></div><div><strong>{coverage === undefined ? 'Sin dato' : `${(coverage * 100).toFixed(1)}%`}</strong><span>Cobertura del rango 80%</span></div></div>
          {endpoint && <div className="evidence-endpoint"><span>Estimación puntual al {endpoint.date}</span><strong>{money(endpoint.price)}<small>/kg</small></strong><p>Rango 80%: {money(endpoint.low)} – {money(endpoint.high)}</p></div>}
          <p className="evidence-comparison">{improvement === null ? 'Sin comparación calculable con el último precio observado.' : improvement > 0 ? `${improvement.toFixed(1)}% menos error medio que Naive en esta auditoría. No garantiza el mismo resultado futuro.` : 'El último precio observado (Naive) sigue siendo una referencia en esta auditoría; una curva más compleja no garantiza menor error.'}</p>
          <span className="badge">{evaluation.status === 'experimental' ? 'REFERENCIA · REVISA LA COBERTURA' : 'RESULTADO EVALUADO'}</span>
        </> : <p className="evidence-empty" role="status">No hay una evaluación publicada de {horizon} días para esta variedad. Elige uno de los plazos disponibles; no se sustituye por una evaluación de otro plazo.</p>}
        <button className="secondary w-full mt-6" onClick={() => navigate('modellab')}>Explorar el laboratorio<ArrowRight size={16}/></button>
        <p className="evidence-lineage">Corte {series.last_date} · evaluación {series.evaluated_at.slice(0, 10)} · {series.run_id}</p>
      </section>
    </div>

    <section className="regional-context" aria-labelledby="regional-context-title"><div><span className="eyebrow">05 · PON EL DATO EN SU LUGAR</span><h2 id="regional-context-title">Un precio en Lima. Muchas realidades en el campo.</h2><p>La producción regional y los avisos del Pacífico aportan contexto. No describen por sí solos el riesgo ni el precio recibido en tu parcela.</p></div><div className="regional-context-links"><button onClick={() => navigate('market')}><span><MapPin size={22}/><strong>Explorar las regiones</strong><small>Producción regional con fuente y período</small></span><ArrowUpRight size={19}/></button><button onClick={() => navigate('enfen')}><span><CloudSun size={22}/><strong>Entender El Niño</strong><small>Observaciones, comunicados y límites de uso</small></span><ArrowUpRight size={19}/></button></div></section>

    <FieldStories navigate={navigate}/>

    <section className="dashboard-transparency"><div><ShieldCheck size={23}/><div><h2>Que cada decisión pueda volver al dato.</h2><p>SISAP · MIDAGRI para precios mayoristas. Las fuentes complementarias muestran por separado su disponibilidad y uso en el modelo.</p></div></div><div className="transparency-actions"><button className="outline-button" onClick={() => navigate('sync')}>Explorar fuentes<ArrowRight size={15}/></button>{source && <a className="text-button" href={source.url} target="_blank" rel="noreferrer">Consultar SISAP<ExternalLink size={14}/></a>}</div></section>
  </div>;
}
