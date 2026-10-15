import React from 'react';
import { ViewTab } from '../../types/agro';
import { HISTORICAL_PRICES } from '../../data/seedData';
import {
  CalendarDays,
  Truck,
  TrendingUp,
  ShieldCheck,
  BrainCircuit,
  Scale,
  ArrowRight,
  MapPin,
  Sparkles,
  BarChart3,
  Layers,
  CheckCircle2,
} from 'lucide-react';

interface HomeViewProps {
  onNavigate: (tab: ViewTab) => void;
  onOpenAssistant: () => void;
}

export const HomeView: React.FC<HomeViewProps> = ({ onNavigate, onOpenAssistant }) => {
  // Chart calculation for recent historical prices
  const recentPrices = HISTORICAL_PRICES.slice(-12);
  const maxPrice = Math.max(...recentPrices.map((p) => Math.max(p.canchán, p.amarilla)));
  const minPrice = 1.0;

  return (
    <div className="space-y-8 pb-12">
      {/* Hero Section */}
      <section className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-[#0B3025] via-[#0E3D30] to-[#08261D] text-white p-6 sm:p-10 border border-[#184839] shadow-xl">
        <div className="absolute top-0 right-0 -mr-16 -mt-16 w-80 h-80 rounded-full bg-[#20C77A]/10 blur-3xl pointer-events-none" />
        <div className="relative z-10 max-w-3xl space-y-4">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-[#20C77A]/20 border border-[#20C77A]/40 text-[#B7F36B] text-xs font-bold uppercase tracking-wider">
            <Sparkles className="w-3.5 h-3.5" />
            MVP NAUFEST 2026 — Piloto Papa Canchán
          </div>

          <h1 className="text-3xl sm:text-5xl font-extrabold tracking-tight leading-tight">
            Siembra con información. <br />
            <span className="text-transparent bg-clip-text bg-gradient-to-r from-[#20C77A] via-[#B7F36B] to-emerald-300">
              Cosecha con mejores decisiones.
            </span>
          </h1>

          <p className="text-slate-300 text-sm sm:text-base leading-relaxed">
            Plataforma inteligente para pequeños y medianos agricultores peruanos.
            Conectamos datos públicos de <strong>EMMSA</strong>, <strong>MIDAGRI SISAP</strong>, <strong>SIEA</strong>, <strong>SENAMHI</strong> y <strong>BCRP</strong> para proyectar escenarios de precios, rendimientos y márgenes netos antes de sembrar o vender.
          </p>

          <div className="pt-2 flex flex-wrap gap-3">
            <button
              onClick={() => onNavigate('planting')}
              className="flex items-center gap-2 px-5 py-3 rounded-xl bg-[#20C77A] text-[#07241C] font-bold text-sm shadow-lg shadow-[#20C77A]/25 hover:bg-[#1bb46d] active:scale-95 transition-all cursor-pointer"
            >
              <CalendarDays className="w-4 h-4" />
              <span>Estoy pensando sembrar</span>
              <ArrowRight className="w-4 h-4 ml-1" />
            </button>

            <button
              onClick={() => onNavigate('harvest')}
              className="flex items-center gap-2 px-5 py-3 rounded-xl bg-[#144234] hover:bg-[#1A503F] text-white border border-[#25634F] font-bold text-sm transition-all cursor-pointer"
            >
              <Truck className="w-4 h-4 text-[#B7F36B]" />
              <span>Ya tengo una cosecha</span>
            </button>

            <button
              onClick={onOpenAssistant}
              className="flex items-center gap-2 px-4 py-3 rounded-xl bg-white/10 hover:bg-white/15 text-[#B7F36B] border border-white/20 font-medium text-sm transition-all cursor-pointer"
            >
              <BrainCircuit className="w-4 h-4" />
              <span>Consultar a la IA</span>
            </button>
          </div>
        </div>
      </section>

      {/* Real-Time Market KPIs */}
      <section className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className="bg-white rounded-2xl p-5 border border-slate-200 shadow-sm hover:border-[#20C77A]/40 transition-colors">
          <div className="flex items-center justify-between text-slate-500 text-xs font-semibold mb-2">
            <span>PRECIO HOY GMML</span>
            <span className="p-1 rounded-lg bg-emerald-50 text-emerald-700">EMMSA</span>
          </div>
          <div className="text-2xl sm:text-3xl font-black text-[#0B3025]">
            S/ 1.48 <span className="text-xs font-medium text-slate-500">/kg</span>
          </div>
          <div className="flex items-center gap-1.5 mt-2 text-xs font-semibold text-emerald-600">
            <TrendingUp className="w-3.5 h-3.5" />
            <span>+2.1% últimos 7 días</span>
          </div>
          <p className="text-[11px] text-slate-400 mt-1">Variedad: Papa Canchán</p>
        </div>

        <div className="bg-white rounded-2xl p-5 border border-slate-200 shadow-sm hover:border-[#20C77A]/40 transition-colors">
          <div className="flex items-center justify-between text-slate-500 text-xs font-semibold mb-2">
            <span>VARIACIÓN 30 DÍAS</span>
            <span className="p-1 rounded-lg bg-blue-50 text-blue-700">SISAP</span>
          </div>
          <div className="text-2xl sm:text-3xl font-black text-emerald-700">
            +5.7%
          </div>
          <p className="text-xs text-slate-500 mt-2">
            De S/ 1.40 a S/ 1.48 /kg
          </p>
          <p className="text-[11px] text-slate-400 mt-1">Tendencia alcista de primavera</p>
        </div>

        <div className="bg-white rounded-2xl p-5 border border-slate-200 shadow-sm hover:border-[#20C77A]/40 transition-colors">
          <div className="flex items-center justify-between text-slate-500 text-xs font-semibold mb-2">
            <span>INGRESO FÍSICO DIARIO</span>
            <span className="p-1 rounded-lg bg-amber-50 text-amber-700">GMML</span>
          </div>
          <div className="text-2xl sm:text-3xl font-black text-[#0B3025]">
            2,480 <span className="text-xs font-medium text-slate-500">Ton</span>
          </div>
          <div className="flex items-center gap-1 mt-2 text-xs text-slate-600">
            <MapPin className="w-3.5 h-3.5 text-amber-600" />
            <span>Junín aporta el <strong>38.5%</strong></span>
          </div>
          <p className="text-[11px] text-slate-400 mt-1">Abastecimiento regular</p>
        </div>

        <div className="bg-white rounded-2xl p-5 border border-slate-200 shadow-sm hover:border-[#20C77A]/40 transition-colors">
          <div className="flex items-center justify-between text-slate-500 text-xs font-semibold mb-2">
            <span>COBERTURA HISTÓRICA</span>
            <span className="p-1 rounded-lg bg-purple-50 text-purple-700">BASEMOTOR</span>
          </div>
          <div className="text-2xl sm:text-3xl font-black text-purple-900">
            8+ <span className="text-xs font-medium text-slate-500">Años</span>
          </div>
          <p className="text-xs text-slate-500 mt-2">
            144,495 registros limpios
          </p>
          <p className="text-[11px] text-slate-400 mt-1">2019 hasta Octubre 2026</p>
        </div>
      </section>

      {/* Interactive Pathways: Camino A vs Camino B */}
      <section className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Camino A */}
        <div className="group relative rounded-3xl bg-white p-6 sm:p-8 border border-slate-200 hover:border-[#20C77A] shadow-sm hover:shadow-xl transition-all flex flex-col justify-between">
          <div className="space-y-4">
            <div className="w-12 h-12 rounded-2xl bg-emerald-100 text-emerald-800 flex items-center justify-center font-bold text-lg">
              <CalendarDays className="w-6 h-6 text-[#0B3025]" />
            </div>
            <div>
              <span className="text-xs font-bold uppercase tracking-wider text-[#20C77A]">Camino A</span>
              <h2 className="text-xl sm:text-2xl font-black text-[#0B3025] mt-0.5">
                ¿Estás pensando sembrar?
              </h2>
            </div>
            <p className="text-slate-600 text-sm leading-relaxed">
              Ingresa la fecha de siembra, variedad (ej. Canchán, Yungay o Amarilla), ubicación y hectáreas. La plataforma calcula el ciclo fenológico con INIA, proyecta la ventana de cosecha y ejecuta el <strong>Champion Model</strong> para estimar precios y margen económico neto.
            </p>
            <div className="space-y-1.5 text-xs text-slate-500 font-medium">
              <div className="flex items-center gap-2">
                <CheckCircle2 className="w-4 h-4 text-[#20C77A]" />
                <span>Ventana exacta de cosecha según ciclo agronómico (120 - 180 días)</span>
              </div>
              <div className="flex items-center gap-2">
                <CheckCircle2 className="w-4 h-4 text-[#20C77A]" />
                <span>3 Escenarios auditables: Adverso (P10), Central (P50), Favorable (P90)</span>
              </div>
              <div className="flex items-center gap-2">
                <CheckCircle2 className="w-4 h-4 text-[#20C77A]" />
                <span>Explicación en lenguaje directo generada por IA</span>
              </div>
            </div>
          </div>

          <div className="pt-6">
            <button
              onClick={() => onNavigate('planting')}
              className="w-full py-3.5 px-4 rounded-xl bg-[#0B3025] hover:bg-[#144535] text-white font-bold text-sm flex items-center justify-center gap-2 group-hover:bg-[#20C77A] group-hover:text-[#07241C] transition-colors cursor-pointer"
            >
              <span>Simular mi próxima siembra</span>
              <ArrowRight className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Camino B */}
        <div className="group relative rounded-3xl bg-white p-6 sm:p-8 border border-slate-200 hover:border-emerald-600 shadow-sm hover:shadow-xl transition-all flex flex-col justify-between">
          <div className="space-y-4">
            <div className="w-12 h-12 rounded-2xl bg-amber-100 text-amber-800 flex items-center justify-center font-bold text-lg">
              <Truck className="w-6 h-6 text-amber-900" />
            </div>
            <div>
              <span className="text-xs font-bold uppercase tracking-wider text-amber-600">Camino B</span>
              <h2 className="text-xl sm:text-2xl font-black text-[#0B3025] mt-0.5">
                ¿Ya tienes tu cosecha lista?
              </h2>
            </div>
            <p className="text-slate-600 text-sm leading-relaxed">
              ¿Vender hoy en el GMML Lima, esperar 1 o 2 semanas en almacén, o colocar la papa en mercados regionales como Huancayo o Trujillo? Comparamos mermas por peso, costos de flete y precio proyectado.
            </p>
            <div className="space-y-1.5 text-xs text-slate-500 font-medium">
              <div className="flex items-center gap-2">
                <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                <span>Cálculo real de merma por transpiración de tubérculo (~1.5% semanal)</span>
              </div>
              <div className="flex items-center gap-2">
                <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                <span>Impacto del flete y peajes de la Carretera Central (S/ 110 - S/ 140/t)</span>
              </div>
              <div className="flex items-center gap-2">
                <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                <span>Sin imperativos: te presentamos opciones, tú tomas la decisión</span>
              </div>
            </div>
          </div>

          <div className="pt-6">
            <button
              onClick={() => onNavigate('harvest')}
              className="w-full py-3.5 px-4 rounded-xl bg-slate-900 hover:bg-slate-800 text-white font-bold text-sm flex items-center justify-center gap-2 group-hover:bg-amber-500 group-hover:text-slate-950 transition-colors cursor-pointer"
            >
              <span>Evaluar alternativas de venta</span>
              <ArrowRight className="w-4 h-4" />
            </button>
          </div>
        </div>
      </section>

      {/* Deep Dive Modules: 10 Potato Varieties SISAP & Official ENFEN Observatory */}
      <section className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Module 1: 10 Varieties */}
        <div className="bg-gradient-to-br from-slate-900 to-[#0B3025] text-white rounded-3xl p-6 sm:p-7 border border-[#1A4537] shadow-lg flex flex-col justify-between">
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-[11px] font-bold uppercase tracking-wider text-[#B7F36B] bg-[#20C77A]/20 px-2.5 py-0.5 rounded-full border border-[#20C77A]/30">
                Catálogo Homologado
              </span>
              <span className="text-xs text-slate-400 font-mono">10 Variedades Oficiales</span>
            </div>
            <h3 className="text-xl font-extrabold text-white">
              Desglose y Spreads de las 10 Variedades de Papa
            </h3>
            <p className="text-slate-300 text-xs sm:text-sm leading-relaxed">
              Analiza en detalle <strong>Papa Canchán, Amarilla, Huayro, Peruanita, Huamantanga, Negra Andina, Yungay, Color, Blanca y Única</strong>. Precios en tiempo real del GMML Santa Anita, diferenciales de mercado vs Canchán, volúmenes de ingreso y fichas agronómicas del INIA.
            </p>
            <div className="flex flex-wrap gap-1.5 pt-1">
              {['Canchán', 'Amarilla', 'Huayro', 'Peruanita', 'Huamantanga', 'Negra Andina', 'Yungay', 'Color', 'Blanca', 'Única'].map((v, i) => (
                <span key={i} className="text-[10px] bg-white/10 px-2 py-0.5 rounded-md text-slate-200">
                  {v}
                </span>
              ))}
            </div>
          </div>

          <div className="pt-5">
            <button
              onClick={() => onNavigate('varieties')}
              className="w-full py-3 px-4 rounded-xl bg-[#20C77A] text-[#07241C] hover:bg-[#1db36e] font-bold text-xs flex items-center justify-center gap-2 transition-all cursor-pointer shadow-md"
            >
              <span>Ver desglose completo de las 10 variedades</span>
              <ArrowRight className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Module 2: Official ENFEN / SENAMHI Climate Observatory */}
        <div className="bg-gradient-to-br from-[#1A2D24] to-[#0E1E18] text-white rounded-3xl p-6 sm:p-7 border border-amber-500/30 shadow-lg flex flex-col justify-between">
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-[11px] font-bold uppercase tracking-wider text-amber-300 bg-amber-400/20 px-2.5 py-0.5 rounded-full border border-amber-400/30 flex items-center gap-1.5">
                <span className="relative flex h-2 w-2">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-amber-400 opacity-75"></span>
                  <span className="relative inline-flex rounded-full h-2 w-2 bg-amber-400"></span>
                </span>
                Alerta Oficial ENFEN
              </span>
              <span className="text-xs text-amber-300 font-mono">Boletín N° 14-2026</span>
            </div>
            <h3 className="text-xl font-extrabold text-white">
              Sitio Oficial del Fenómeno El Niño (ENFEN & SENAMHI)
            </h3>
            <p className="text-slate-300 text-xs sm:text-sm leading-relaxed">
              Monitoreo de anomalías de Temperatura Superficial del Mar en la <strong>Región Niño 1+2 (+0.6°C)</strong> y <strong>Niño 3.4 (+0.3°C)</strong>, boletines de precipitación en valles paperos de la sierra central y simulador de shock de precios por huaicos en Carretera Central.
            </p>
            <div className="grid grid-cols-2 gap-2 text-xs pt-1">
              <div className="bg-white/5 p-2 rounded-lg border border-white/10">
                <span className="text-[10px] text-slate-400 block">Condición Neutra:</span>
                <strong className="text-emerald-400">58% probabilidad</strong>
              </div>
              <div className="bg-white/5 p-2 rounded-lg border border-white/10">
                <span className="text-[10px] text-slate-400 block">El Niño Débil:</span>
                <strong className="text-amber-300">32% probabilidad</strong>
              </div>
            </div>
          </div>

          <div className="pt-5">
            <button
              onClick={() => onNavigate('enfen')}
              className="w-full py-3 px-4 rounded-xl bg-gradient-to-r from-amber-400 to-amber-500 hover:from-amber-500 hover:to-amber-600 text-slate-950 font-bold text-xs flex items-center justify-center gap-2 transition-all cursor-pointer shadow-md"
            >
              <span>Abrir Observatorio El Niño (ENFEN / SENAMHI)</span>
              <ArrowRight className="w-4 h-4" />
            </button>
          </div>
        </div>
      </section>

      {/* Historical Market Overview Preview Chart */}
      <section className="bg-white rounded-3xl p-6 sm:p-8 border border-slate-200 shadow-sm space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2">
              <BarChart3 className="w-5 h-5 text-emerald-700" />
              <h2 className="text-xl font-bold text-slate-900">
                Comportamiento Histórico de Precios en GMML Santa Anita
              </h2>
            </div>
            <p className="text-xs text-slate-500 mt-1">
              Serie mensual 2024-2026: Papa Canchán vs Papa Amarilla Tumbay con volumen de ingreso
            </p>
          </div>

          <div className="flex items-center gap-4 text-xs font-medium">
            <div className="flex items-center gap-1.5">
              <span className="w-3 h-3 rounded-full bg-[#20C77A]" />
              <span>Papa Canchán (S/kg)</span>
            </div>
            <div className="flex items-center gap-1.5">
              <span className="w-3 h-3 rounded-full bg-amber-500" />
              <span>Papa Amarilla (S/kg)</span>
            </div>
            <button
              onClick={() => onNavigate('market')}
              className="text-xs text-emerald-700 font-bold hover:underline flex items-center gap-1 cursor-pointer"
            >
              Ver mapa interactivo <ArrowRight className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>

        {/* SVG Sparkline/Bar chart */}
        <div className="h-64 w-full relative pt-4">
          <svg className="w-full h-full overflow-visible" viewBox="0 0 800 200" preserveAspectRatio="none">
            {/* Grid lines */}
            <line x1="0" y1="40" x2="800" y2="40" stroke="#f1f5f9" strokeWidth="1" />
            <line x1="0" y1="90" x2="800" y2="90" stroke="#f1f5f9" strokeWidth="1" />
            <line x1="0" y1="140" x2="800" y2="140" stroke="#f1f5f9" strokeWidth="1" />
            <line x1="0" y1="180" x2="800" y2="180" stroke="#e2e8f0" strokeWidth="1" />

            {/* Volume bars (subtle background) */}
            {recentPrices.map((item, index) => {
              const x = (index / (recentPrices.length - 1)) * 760 + 20;
              const barHeight = (item.volumeTon / 3600) * 80;
              return (
                <rect
                  key={`vol-${index}`}
                  x={x - 12}
                  y={180 - barHeight}
                  width="24"
                  height={barHeight}
                  fill="#E2E8F0"
                  opacity="0.6"
                  rx="3"
                />
              );
            })}

            {/* Amarilla line */}
            <polyline
              fill="none"
              stroke="#F59E0B"
              strokeWidth="3"
              points={recentPrices
                .map((item, index) => {
                  const x = (index / (recentPrices.length - 1)) * 760 + 20;
                  const y = 180 - ((item.amarilla - minPrice) / (maxPrice - minPrice)) * 140;
                  return `${x},${y}`;
                })
                .join(' ')}
            />

            {/* Canchan line */}
            <polyline
              fill="none"
              stroke="#20C77A"
              strokeWidth="4"
              points={recentPrices
                .map((item, index) => {
                  const x = (index / (recentPrices.length - 1)) * 760 + 20;
                  const y = 180 - ((item.canchán - minPrice) / (maxPrice - minPrice)) * 140;
                  return `${x},${y}`;
                })
                .join(' ')}
            />

            {/* Canchan Points */}
            {recentPrices.map((item, index) => {
              const x = (index / (recentPrices.length - 1)) * 760 + 20;
              const y = 180 - ((item.canchán - minPrice) / (maxPrice - minPrice)) * 140;
              return (
                <g key={`can-${index}`} className="group cursor-pointer">
                  <circle cx={x} cy={y} r="5" fill="#0B3025" stroke="#20C77A" strokeWidth="3" />
                  <text
                    x={x}
                    y={y - 10}
                    textAnchor="middle"
                    className="text-[10px] font-bold fill-slate-700"
                  >
                    S/ {item.canchán.toFixed(2)}
                  </text>
                </g>
              );
            })}
          </svg>

          {/* X axis labels */}
          <div className="flex justify-between text-[11px] text-slate-500 pt-2 font-mono">
            {recentPrices.map((item, idx) => (
              <span key={idx} className="truncate max-w-[50px] text-center">
                {item.date.slice(2, 7)}
              </span>
            ))}
          </div>
        </div>

        <div className="p-4 rounded-xl bg-slate-50 border border-slate-200 text-xs text-slate-600 flex items-start gap-3">
          <Layers className="w-5 h-5 text-emerald-700 shrink-0 mt-0.5" />
          <div>
            <strong className="text-slate-900 font-semibold">Patrón Estacional Detectado:</strong>
            <p className="mt-0.5">
              Entre <strong>mayo y julio</strong>, la gran cosecha de la sierra central (Junín y Huancavelica) eleva el ingreso físico a más de 3,300 toneladas diarias en el GMML, presionando los precios a la baja (S/ 1.15 a S/ 1.25). Hacia <strong>octubre y enero</strong>, la oferta disminuye y los precios repuntan hacia S/ 1.80 - S/ 1.90.
            </p>
          </div>
        </div>
      </section>

      {/* 4 Pillars of AgroDecide AI */}
      <section className="bg-gradient-to-b from-[#F2F7F4] to-white rounded-3xl p-6 sm:p-8 border border-emerald-100">
        <div className="text-center max-w-2xl mx-auto mb-8">
          <span className="text-xs font-bold text-emerald-700 uppercase tracking-widest">
            Principios Centrales
          </span>
          <h2 className="text-2xl font-black text-slate-900 mt-1">
            Separación Clara entre Datos, Modelos, Cálculos e IA
          </h2>
          <p className="text-xs text-slate-500 mt-2">
            No todo es un chatbot. Las matemáticas no necesitan IA. La IA explica, la econometría pronostica y el agricultor decide.
          </p>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm space-y-2">
            <div className="w-10 h-10 rounded-xl bg-emerald-100 text-emerald-800 flex items-center justify-center">
              <ShieldCheck className="w-5 h-5 text-emerald-700" />
            </div>
            <h3 className="font-bold text-slate-900 text-sm">1. Datos Reales</h3>
            <p className="text-xs text-slate-500 leading-relaxed">
              Integración automatizada de fuentes oficiales: EMMSA, MIDAGRI SISAP, SIEA, SENAMHI y BCRP. Cero datos inventados.
            </p>
          </div>

          <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm space-y-2">
            <div className="w-10 h-10 rounded-xl bg-blue-100 text-blue-800 flex items-center justify-center">
              <BarChart3 className="w-5 h-5 text-blue-700" />
            </div>
            <h3 className="font-bold text-slate-900 text-sm">2. Modelos Auditables</h3>
            <p className="text-xs text-slate-500 leading-relaxed">
              Model Arena con Walk-Forward Backtesting. Comparación transparente de Naive, Holt-Winters, SARIMAX y Gradient Boosting.
            </p>
          </div>

          <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm space-y-2">
            <div className="w-10 h-10 rounded-xl bg-amber-100 text-amber-800 flex items-center justify-center">
              <Scale className="w-5 h-5 text-amber-700" />
            </div>
            <h3 className="font-bold text-slate-900 text-sm">3. Incertidumbre Visible</h3>
            <p className="text-xs text-slate-500 leading-relaxed">
              Nunca pronósticos puntuales aislados. Siempre mostramos rango probable [P10 - P90] y escenarios económicos de sensibilidad.
            </p>
          </div>

          <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm space-y-2">
            <div className="w-10 h-10 rounded-xl bg-purple-100 text-purple-800 flex items-center justify-center">
              <BrainCircuit className="w-5 h-5 text-purple-700" />
            </div>
            <h3 className="font-bold text-slate-900 text-sm">4. Decisión Humana</h3>
            <p className="text-xs text-slate-500 leading-relaxed">
              La IA generativa traduce la estadística en lenguaje llano. La plataforma no ordena; entrega evidencia para que el productor decida.
            </p>
          </div>
        </div>
      </section>
    </div>
  );
};
