import React, { useState } from 'react';
import { VARIETIES_CATALOG, getSpreadVsCanchan } from '../../utils/agronomicEngine';
import { HISTORICAL_PRICES } from '../../data/seedData';
import { VarietyInfo, ViewTab } from '../../types/agro';
import {
  Sparkles,
  ExternalLink,
  TrendingUp,
  Scale,
  Calendar,
  Layers,
  Thermometer,
  ShieldAlert,
  ShieldCheck,
  CheckCircle2,
  ChevronRight,
  Info,
  ArrowRight,
  BarChart2,
  MapPin,
  Flame,
  Award
} from 'lucide-react';

interface VarietiesBreakdownViewProps {
  onNavigateTab: (tab: ViewTab) => void;
  onSelectVarietyForPlanting?: (varietyId: string) => void;
}

export const VarietiesBreakdownView: React.FC<VarietiesBreakdownViewProps> = ({
  onNavigateTab,
  onSelectVarietyForPlanting,
}) => {
  const [selectedVarietyId, setSelectedVarietyId] = useState<string>('canchan');
  const [filterType, setFilterType] = useState<'all' | 'blanca' | 'amarilla' | 'color' | 'nativa'>('all');
  const [sortBy, setSortBy] = useState<'price' | 'volume' | 'yield' | 'cycle'>('price');

  const selectedVariety =
    VARIETIES_CATALOG.find((v) => v.id === selectedVarietyId) || VARIETIES_CATALOG[0];

  const filteredVarieties = VARIETIES_CATALOG.filter((v) => {
    if (filterType === 'all') return true;
    return v.type === filterType;
  }).sort((a, b) => {
    if (sortBy === 'price') return b.currentGMMLPrice - a.currentGMMLPrice;
    if (sortBy === 'volume') return (b.dailyVolumeTon || 0) - (a.dailyVolumeTon || 0);
    if (sortBy === 'yield') return b.avgYield - a.avgYield;
    if (sortBy === 'cycle') return a.cycleAvgDays - b.cycleAvgDays;
    return 0;
  });

  const selectedSpread = getSpreadVsCanchan(selectedVariety);

  // Helper to extract historical prices for the selected variety
  const getHistoricalForVariety = (varietyId: string) => {
    const keyMap: Record<string, keyof typeof HISTORICAL_PRICES[0]> = {
      canchan: 'canchán',
      yungay: 'yungay',
      amarilla: 'amarilla',
      blanca: 'blanca',
      color: 'color',
      huayro: 'huayro',
      huamantanga: 'huamantanga',
      negra_andina: 'negraAndina',
      peruanita: 'peruanita',
      unica: 'unica',
    };
    const key = keyMap[varietyId] || 'canchán';
    return HISTORICAL_PRICES.map((p) => ({
      date: p.date,
      monthLabel: `${p.year}-${String(p.month).padStart(2, '0')}`,
      price: (p[key] as number) || 1.48,
      canchanPrice: p.canchán,
    }));
  };

  const chartData = getHistoricalForVariety(selectedVariety.id);
  const minP = Math.min(...chartData.map((d) => Math.min(d.price, d.canchanPrice))) * 0.9;
  const maxP = Math.max(...chartData.map((d) => Math.max(d.price, d.canchanPrice))) * 1.1;

  const totalGMMLVolume = VARIETIES_CATALOG.reduce((acc, v) => acc + (v.dailyVolumeTon || 0), 0);

  return (
    <div className="space-y-8 animate-fadeIn">
      {/* Header Banner */}
      <div className="bg-gradient-to-r from-[#0B3025] via-[#124234] to-[#0A261E] rounded-2xl p-6 sm:p-8 text-white border border-[#1A4537] shadow-xl relative overflow-hidden">
        <div className="absolute top-0 right-0 w-96 h-96 bg-[#20C77A]/10 rounded-full blur-3xl pointer-events-none -mr-20 -mt-20"></div>

        <div className="relative z-10 flex flex-col lg:flex-row lg:items-center justify-between gap-6">
          <div className="space-y-3 max-w-3xl">
            <div className="flex flex-wrap items-center gap-2">
              <span className="px-3 py-1 rounded-full text-xs font-bold uppercase tracking-wider bg-[#20C77A]/20 text-[#B7F36B] border border-[#20C77A]/40 flex items-center gap-1.5">
                <Sparkles className="w-3.5 h-3.5" />
                Catálogo Homologado Oficial
              </span>
              <span className="px-3 py-1 rounded-full text-xs font-semibold bg-white/10 text-slate-200 border border-white/20">
                10 Variedades MIDAGRI SISAP & EMMSA GMML
              </span>
            </div>

            <h1 className="text-2xl sm:text-4xl font-extrabold tracking-tight">
              Desglose y Análisis Técnico de las <span className="text-[#B7F36B]">10 Variedades de Papa</span>
            </h1>

            <p className="text-slate-300 text-sm sm:text-base leading-relaxed">
              Consulta de precios diarios en el Gran Mercado Mayorista de Lima (GMML Santa Anita),
              homologación con el Sistema de Información de Abastecimiento y Precios (SISAP MIDAGRI),
              fichas agronómicas del INIA y perfiles agroindustriales.
            </p>
          </div>

          {/* Official External Link Badges */}
          <div className="flex flex-col sm:flex-row lg:flex-col gap-2 shrink-0">
            <a
              href="http://sistemas.midagri.gob.pe/sisap/portal2/mayorista/resumenes/consultar/#"
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center justify-between gap-3 px-4 py-2.5 rounded-xl bg-white/10 hover:bg-white/15 text-white text-xs font-medium border border-white/20 transition-all group"
            >
              <div className="text-left">
                <div className="text-[10px] text-slate-300">Consultar Sistema Oficial</div>
                <div className="font-bold text-[#B7F36B] group-hover:underline">MIDAGRI SISAP Portal Mayorista</div>
              </div>
              <ExternalLink className="w-4 h-4 text-slate-300 group-hover:text-white" />
            </a>

            <a
              href="https://www.emmsa.com.pe/index.php/precios-diarios/"
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center justify-between gap-3 px-4 py-2.5 rounded-xl bg-white/10 hover:bg-white/15 text-white text-xs font-medium border border-white/20 transition-all group"
            >
              <div className="text-left">
                <div className="text-[10px] text-slate-300">Boletín Oficial de Precios</div>
                <div className="font-bold text-[#B7F36B] group-hover:underline">EMMSA GMML Santa Anita</div>
              </div>
              <ExternalLink className="w-4 h-4 text-slate-300 group-hover:text-white" />
            </a>
          </div>
        </div>

        {/* Global Summary Stats */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mt-6 pt-6 border-t border-white/10">
          <div>
            <div className="text-xs text-slate-400">Variedades Monitoreadas</div>
            <div className="text-2xl font-bold text-white mt-1">10 Oficiales</div>
            <div className="text-[11px] text-[#B7F36B]">100% Cobertura SISAP</div>
          </div>
          <div>
            <div className="text-xs text-slate-400">Ingreso Diario Total (GMML)</div>
            <div className="text-2xl font-bold text-white mt-1">{totalGMMLVolume.toLocaleString()} t/día</div>
            <div className="text-[11px] text-slate-300">~140 camiones pesados</div>
          </div>
          <div>
            <div className="text-xs text-slate-400">Rango de Precios Hoy</div>
            <div className="text-2xl font-bold text-[#B7F36B] mt-1">S/ 1.35 - S/ 2.52</div>
            <div className="text-[11px] text-slate-300">Papa Única vs Amarilla Tumbay</div>
          </div>
          <div>
            <div className="text-xs text-slate-400">Variedad Referente (45% vol)</div>
            <div className="text-2xl font-bold text-white mt-1">Papa Canchán</div>
            <div className="text-[11px] text-[#B7F36B]">S/ 1.48 / kg mayorista</div>
          </div>
        </div>
      </div>

      {/* Filter and Control Bar */}
      <div className="flex flex-wrap items-center justify-between gap-4 bg-white p-4 rounded-xl border border-slate-200 shadow-sm">
        <div className="flex flex-wrap items-center gap-2">
          <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider mr-1">Filtrar:</span>
          {(['all', 'blanca', 'amarilla', 'color', 'nativa'] as const).map((type) => (
            <button
              key={type}
              onClick={() => setFilterType(type)}
              className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${
                filterType === type
                  ? 'bg-[#0B3025] text-white shadow-sm'
                  : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
              }`}
            >
              {type === 'all'
                ? 'Todas (10)'
                : type === 'blanca'
                ? 'Blancas / Comerciales (3)'
                : type === 'amarilla'
                ? 'Amarillas (1)'
                : type === 'color'
                ? 'Color / Valles (2)'
                : 'Nativas / Especiales (3)'}
            </button>
          ))}
        </div>

        <div className="flex items-center gap-2">
          <span className="text-xs font-semibold text-slate-500">Ordenar por:</span>
          <select
            value={sortBy}
            onChange={(e) => setSortBy(e.target.value as any)}
            className="text-xs bg-slate-50 border border-slate-300 rounded-lg px-2.5 py-1.5 font-medium text-slate-700 focus:outline-none focus:ring-2 focus:ring-[#20C77A]"
          >
            <option value="price">Precio GMML (Mayor a menor)</option>
            <option value="volume">Volumen de Ingreso (t/día)</option>
            <option value="yield">Rendimiento Agronómico (t/ha)</option>
            <option value="cycle">Precocidad (Menor ciclo)</option>
          </select>
        </div>
      </div>

      {/* Main 2-Column Layout: Varieties List + Detail View */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        {/* Left: 10 Varieties Cards List */}
        <div className="lg:col-span-5 space-y-3">
          <div className="text-xs font-bold text-slate-500 uppercase tracking-wider px-1 flex items-center justify-between">
            <span>Selecciona una variedad ({filteredVarieties.length})</span>
            <span className="text-[11px] text-slate-400 font-normal">Clic para ver análisis</span>
          </div>

          {filteredVarieties.map((v) => {
            const spread = getSpreadVsCanchan(v);
            const isSelected = v.id === selectedVariety.id;

            return (
              <div
                key={v.id}
                onClick={() => setSelectedVarietyId(v.id)}
                className={`p-4 rounded-xl border transition-all cursor-pointer ${
                  isSelected
                    ? 'bg-[#F2FAF6] border-[#20C77A] ring-2 ring-[#20C77A]/20 shadow-md'
                    : 'bg-white border-slate-200 hover:border-slate-300 hover:shadow-sm'
                }`}
              >
                <div className="flex items-start justify-between gap-3">
                  <div className="space-y-1">
                    <div className="flex items-center gap-2">
                      <span className="font-bold text-slate-900 text-sm sm:text-base">{v.name}</span>
                      <span
                        className={`text-[10px] font-bold px-2 py-0.5 rounded-full uppercase ${
                          v.type === 'blanca'
                            ? 'bg-blue-50 text-blue-700 border border-blue-200'
                            : v.type === 'amarilla'
                            ? 'bg-amber-50 text-amber-700 border border-amber-200'
                            : v.type === 'nativa'
                            ? 'bg-purple-50 text-purple-700 border border-purple-200'
                            : 'bg-rose-50 text-rose-700 border border-rose-200'
                        }`}
                      >
                        {v.type}
                      </span>
                    </div>

                    <div className="text-[11px] font-mono text-slate-500 line-clamp-1">
                      MIDAGRI SISAP: <strong className="text-slate-700">{v.officialMidagriName}</strong>
                    </div>
                  </div>

                  <div className="text-right shrink-0">
                    <div className="text-base sm:text-lg font-extrabold text-[#0B3025]">
                      S/ {v.currentGMMLPrice.toFixed(2)}
                      <span className="text-xs font-normal text-slate-500"> /kg</span>
                    </div>
                    <div
                      className={`text-[11px] font-semibold flex items-center justify-end gap-1 ${
                        spread.isPremium
                          ? 'text-emerald-600'
                          : spread.isDiscount
                          ? 'text-amber-600'
                          : 'text-slate-500'
                      }`}
                    >
                      {spread.isPremium
                        ? `+S/ ${spread.diff.toFixed(2)} vs Canchán`
                        : spread.isDiscount
                        ? `-S/ ${Math.abs(spread.diff).toFixed(2)} vs Canchán`
                        : 'Referente base'}
                    </div>
                  </div>
                </div>

                {/* Submetrics preview */}
                <div className="mt-3 pt-2.5 border-t border-slate-100 flex items-center justify-between text-xs text-slate-600">
                  <div className="flex items-center gap-1">
                    <Calendar className="w-3.5 h-3.5 text-slate-400" />
                    <span>Ciclo: <strong>{v.cycleAvgDays}d</strong></span>
                  </div>
                  <div className="flex items-center gap-1">
                    <Layers className="w-3.5 h-3.5 text-slate-400" />
                    <span>Rend: <strong>{v.avgYield} t/ha</strong></span>
                  </div>
                  <div className="flex items-center gap-1">
                    <BarChart2 className="w-3.5 h-3.5 text-slate-400" />
                    <span>Vol: <strong>{v.dailyVolumeTon || 0} t/d</strong></span>
                  </div>
                </div>
              </div>
            );
          })}
        </div>

        {/* Right: Deep Dive Inspection of Selected Variety */}
        <div className="lg:col-span-7 space-y-6">
          <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-6 sm:p-7 space-y-6">
            {/* Variety Title Header */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-6 border-b border-slate-100">
              <div>
                <div className="flex items-center gap-2">
                  <span className="text-xs font-bold uppercase tracking-wider text-[#20C77A] bg-[#20C77A]/10 px-2.5 py-0.5 rounded-full">
                    {selectedVariety.commercialName}
                  </span>
                  <span className="text-xs text-slate-400 font-mono">ID: {selectedVariety.id}</span>
                </div>
                <h2 className="text-2xl sm:text-3xl font-extrabold text-slate-900 mt-1">
                  {selectedVariety.name}
                </h2>
                <div className="text-xs font-mono text-slate-500 mt-0.5">
                  Nombre en MIDAGRI SISAP: <span className="font-semibold text-slate-800">{selectedVariety.officialMidagriName}</span>
                </div>
                {selectedVariety.scientificName && (
                  <div className="text-xs italic text-slate-400">
                    Científico: {selectedVariety.scientificName}
                  </div>
                )}
              </div>

              <div className="bg-slate-50 rounded-xl p-3 border border-slate-200 text-right shrink-0">
                <div className="text-[11px] text-slate-500 font-medium">Cotización GMML Hoy</div>
                <div className="text-2xl sm:text-3xl font-extrabold text-[#0B3025]">
                  S/ {selectedVariety.currentGMMLPrice.toFixed(2)}
                  <span className="text-xs font-normal text-slate-500"> / kg</span>
                </div>
                <div className="flex items-center justify-end gap-2 text-xs font-semibold mt-0.5">
                  <span className="text-emerald-600">7d: +{selectedVariety.change7d}%</span>
                  <span className="text-slate-300">•</span>
                  <span className="text-emerald-700">30d: +{selectedVariety.change30d}%</span>
                </div>
              </div>
            </div>

            {/* Live Spread vs Canchán Badge */}
            <div className={`p-4 rounded-xl border flex flex-col sm:flex-row sm:items-center justify-between gap-3 ${
              selectedSpread.isPremium
                ? 'bg-emerald-50 border-emerald-200 text-emerald-900'
                : selectedSpread.isDiscount
                ? 'bg-amber-50 border-amber-200 text-amber-900'
                : 'bg-blue-50 border-blue-200 text-blue-900'
            }`}>
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-white shadow-sm flex items-center justify-center font-bold">
                  <Scale className="w-5 h-5 text-slate-700" />
                </div>
                <div>
                  <div className="text-xs font-bold uppercase tracking-wider">
                    Diferencial de Mercado (Spread vs Papa Canchán)
                  </div>
                  <div className="text-xs text-slate-600 mt-0.5">
                    {selectedSpread.isPremium ? (
                      <>Cotiza con una prima de <strong className="text-emerald-700 font-bold">+S/ {selectedSpread.diff.toFixed(2)}/kg ({selectedSpread.pct > 0 ? `+${selectedSpread.pct}%` : `${selectedSpread.pct}%`})</strong> sobre la papa blanca estándar.</>
                    ) : selectedSpread.isDiscount ? (
                      <>Cotiza con un descuento de <strong className="text-amber-700 font-bold">-S/ {Math.abs(selectedSpread.diff).toFixed(2)}/kg ({selectedSpread.pct}%)</strong> debido a su gran volumen o precocidad.</>
                    ) : (
                      <>Esta variedad es el estándar de referencia (Canchán) con el mayor volumen del mercado.</>
                    )}
                  </div>
                </div>
              </div>

              <div className="text-right shrink-0">
                <span className="text-xs font-mono font-bold px-3 py-1 bg-white rounded-lg border border-slate-200 shadow-xs">
                  Ref Canchán: S/ 1.48
                </span>
              </div>
            </div>

            {/* Technical Agronomic Sheet (INIA) */}
            <div className="space-y-3">
              <h3 className="text-xs font-bold uppercase tracking-wider text-slate-500 flex items-center gap-1.5">
                <Award className="w-4 h-4 text-[#20C77A]" />
                Ficha Agronómica Oficial (INIA / CIP)
              </h3>

              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                <div className="bg-slate-50 rounded-xl p-3 border border-slate-100">
                  <div className="text-[11px] text-slate-500 font-medium">Ciclo Vegetativo</div>
                  <div className="text-base font-bold text-slate-800 mt-0.5">{selectedVariety.cycleAvgDays} días</div>
                  <div className="text-[10px] text-slate-400">Rango: {selectedVariety.cycleMinDays} - {selectedVariety.cycleMaxDays} d</div>
                </div>

                <div className="bg-slate-50 rounded-xl p-3 border border-slate-100">
                  <div className="text-[11px] text-slate-500 font-medium">Altitud Óptima</div>
                  <div className="text-base font-bold text-slate-800 mt-0.5">{selectedVariety.altitudeMin} - {selectedVariety.altitudeMax}</div>
                  <div className="text-[10px] text-slate-400">msnm (Pisos ecológicos)</div>
                </div>

                <div className="bg-slate-50 rounded-xl p-3 border border-slate-100">
                  <div className="text-[11px] text-slate-500 font-medium">Rendimiento Promedio</div>
                  <div className="text-base font-bold text-slate-800 mt-0.5">{selectedVariety.avgYield} t/ha</div>
                  <div className="text-[10px] text-slate-400">Bajo buen manejo técnico</div>
                </div>

                <div className="bg-slate-50 rounded-xl p-3 border border-slate-100">
                  <div className="text-[11px] text-slate-500 font-medium">Ingreso GMML</div>
                  <div className="text-base font-bold text-slate-800 mt-0.5">{selectedVariety.dailyVolumeTon || 0} t/d</div>
                  <div className="text-[10px] text-slate-400">{selectedVariety.gmmlSharePct}% del mercado</div>
                </div>
              </div>
            </div>

            {/* Climate & Disease Resistance Badges */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <div className="p-3 rounded-xl border border-slate-200 bg-slate-50 flex items-center justify-between">
                <div>
                  <div className="text-[11px] text-slate-500">Resistencia a Heladas</div>
                  <div className="text-xs font-bold text-slate-800 mt-0.5">{selectedVariety.frostResistance}</div>
                </div>
                <Thermometer className="w-4 h-4 text-slate-400" />
              </div>

              <div className="p-3 rounded-xl border border-slate-200 bg-slate-50 flex items-center justify-between">
                <div>
                  <div className="text-[11px] text-slate-500">Tolerancia a Rancha</div>
                  <div className="text-xs font-bold text-slate-800 mt-0.5">{selectedVariety.blightResistance} (*Phytophthora*)</div>
                </div>
                <ShieldCheck className="w-4 h-4 text-emerald-600" />
              </div>

              <div className="p-3 rounded-xl border border-slate-200 bg-slate-50 flex items-center justify-between">
                <div>
                  <div className="text-[11px] text-slate-500">Sensibilidad a El Niño</div>
                  <div className={`text-xs font-bold mt-0.5 ${
                    selectedVariety.enfenSensitivity === 'Alta'
                      ? 'text-red-600'
                      : selectedVariety.enfenSensitivity === 'Media'
                      ? 'text-amber-600'
                      : 'text-emerald-600'
                  }`}>
                    {selectedVariety.enfenSensitivity}
                  </div>
                </div>
                <ShieldAlert className="w-4 h-4 text-amber-500" />
              </div>
            </div>

            {/* ENFEN Vulnerability Detail */}
            {selectedVariety.enfenVulnerabilityDetail && (
              <div className="p-3.5 rounded-xl bg-amber-50/70 border border-amber-200/80 text-xs text-amber-900 flex items-start gap-2.5">
                <Info className="w-4 h-4 text-amber-700 shrink-0 mt-0.5" />
                <div>
                  <strong className="font-semibold text-amber-950">Comportamiento ante Fenómeno El Niño (ENFEN): </strong>
                  {selectedVariety.enfenVulnerabilityDetail}
                </div>
              </div>
            )}

            {/* Culinary & Agroindustrial Profile */}
            <div className="space-y-2">
              <h3 className="text-xs font-bold uppercase tracking-wider text-slate-500">
                Perfil Gastronómico & Demanda en Mercado
              </h3>
              <p className="text-sm text-slate-700 leading-relaxed bg-slate-50 p-4 rounded-xl border border-slate-100">
                {selectedVariety.culinaryProfile}
              </p>
            </div>

            {/* Main Production Regions */}
            {selectedVariety.mainRegions && selectedVariety.mainRegions.length > 0 && (
              <div className="space-y-2">
                <h3 className="text-xs font-bold uppercase tracking-wider text-slate-500 flex items-center gap-1.5">
                  <MapPin className="w-3.5 h-3.5 text-slate-400" />
                  Principales Valles y Departamentos Productores
                </h3>
                <div className="flex flex-wrap gap-2">
                  {selectedVariety.mainRegions.map((region, idx) => (
                    <span
                      key={idx}
                      className="px-3 py-1 bg-white border border-slate-200 rounded-lg text-xs font-medium text-slate-700 shadow-xs"
                    >
                      {region}
                    </span>
                  ))}
                </div>
              </div>
            )}

            {/* Historical Price Trend Graph vs Canchán */}
            <div className="space-y-3 pt-4 border-t border-slate-100">
              <div className="flex items-center justify-between">
                <h3 className="text-xs font-bold uppercase tracking-wider text-slate-500 flex items-center gap-1.5">
                  <TrendingUp className="w-4 h-4 text-[#20C77A]" />
                  Comportamiento Histórico de Precios (2024 - 2026)
                </h3>
                <div className="flex items-center gap-3 text-xs">
                  <span className="flex items-center gap-1 text-[#0B3025] font-bold">
                    <span className="w-3 h-1 bg-[#20C77A] rounded-full inline-block"></span>
                    {selectedVariety.name}
                  </span>
                  <span className="flex items-center gap-1 text-slate-400">
                    <span className="w-3 h-1 bg-slate-300 rounded-full inline-block"></span>
                    Ref. Canchán
                  </span>
                </div>
              </div>

              {/* Responsive SVG Chart */}
              <div className="bg-slate-900 rounded-xl p-4 text-white">
                <div className="h-44 w-full relative">
                  <svg className="w-full h-full overflow-visible" preserveAspectRatio="none" viewBox="0 0 100 100">
                    {/* Horizontal gridlines */}
                    {[0, 25, 50, 75, 100].map((y) => (
                      <line
                        key={y}
                        x1="0"
                        y1={y}
                        x2="100"
                        y2={y}
                        stroke="#1E293B"
                        strokeDasharray="2,2"
                        strokeWidth="0.5"
                      />
                    ))}

                    {/* Canchan Reference Line */}
                    <polyline
                      fill="none"
                      stroke="#64748B"
                      strokeWidth="1.5"
                      strokeDasharray="3,3"
                      points={chartData
                        .map((d, i) => {
                          const x = (i / (chartData.length - 1)) * 100;
                          const y = 100 - ((d.canchanPrice - minP) / (maxP - minP)) * 100;
                          return `${x},${y}`;
                        })
                        .join(' ')}
                    />

                    {/* Selected Variety Line */}
                    <polyline
                      fill="none"
                      stroke="#20C77A"
                      strokeWidth="2.5"
                      points={chartData
                        .map((d, i) => {
                          const x = (i / (chartData.length - 1)) * 100;
                          const y = 100 - ((d.price - minP) / (maxP - minP)) * 100;
                          return `${x},${y}`;
                        })
                        .join(' ')}
                    />

                    {/* Data Points */}
                    {chartData.map((d, i) => {
                      const x = (i / (chartData.length - 1)) * 100;
                      const y = 100 - ((d.price - minP) / (maxP - minP)) * 100;
                      return (
                        <circle
                          key={i}
                          cx={x}
                          cy={y}
                          r="2"
                          fill="#B7F36B"
                          stroke="#0B3025"
                          strokeWidth="1"
                        />
                      );
                    })}
                  </svg>
                </div>

                <div className="flex justify-between text-[10px] text-slate-400 mt-3 pt-2 border-t border-slate-800">
                  <span>Ene 2024</span>
                  <span>Jul 2024</span>
                  <span>Ene 2025</span>
                  <span>Jul 2025</span>
                  <span>Ene 2026</span>
                  <span className="text-[#B7F36B] font-bold">Hoy (Oct 2026)</span>
                </div>
              </div>
            </div>

            {/* Action Buttons: Simulate Planting & Check Official Portal */}
            <div className="pt-4 border-t border-slate-100 flex flex-col sm:flex-row items-center justify-between gap-3">
              <a
                href={selectedVariety.sisapQueryUrl || 'http://sistemas.midagri.gob.pe/sisap/portal2/mayorista/resumenes/consultar/#'}
                target="_blank"
                rel="noopener noreferrer"
                className="w-full sm:w-auto px-4 py-2.5 rounded-xl border border-slate-200 text-slate-700 hover:bg-slate-50 text-xs font-semibold flex items-center justify-center gap-2 transition-all"
              >
                <ExternalLink className="w-4 h-4 text-slate-400" />
                Ver en MIDAGRI SISAP Resúmenes
              </a>

              <button
                onClick={() => {
                  if (onSelectVarietyForPlanting) {
                    onSelectVarietyForPlanting(selectedVariety.id);
                  }
                  onNavigateTab('planting');
                }}
                className="w-full sm:w-auto px-5 py-2.5 rounded-xl bg-gradient-to-r from-[#20C77A] to-[#128051] text-white text-xs font-bold hover:shadow-md transition-all flex items-center justify-center gap-2 group cursor-pointer"
              >
                <span>Simular Siembra con {selectedVariety.name}</span>
                <ArrowRight className="w-4 h-4 group-hover:translate-x-0.5 transition-transform" />
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
