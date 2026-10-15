import React, { useState } from 'react';
import { DEPARTMENTS_DATA, HISTORICAL_PRICES } from '../../data/seedData';
import { VARIETIES_CATALOG } from '../../utils/agronomicEngine';
import { OFFICIAL_ENFEN_DATA } from '../../utils/enfenEngine';
import { DepartmentData, VarietyInfo } from '../../types/agro';
import {
  MapPin,
  TrendingUp,
  BarChart3,
  Calendar,
  ThermometerSnowflake,
  DollarSign,
  Truck,
  Waves,
  ShieldAlert,
  ExternalLink,
  Scale,
  Sparkles,
  Info,
  CheckCircle2,
  AlertTriangle,
} from 'lucide-react';

type MapMetric = 'production' | 'yield' | 'gmmlShare' | 'farmgatePrice' | 'climateRisk';

export const MarketView: React.FC = () => {
  const [selectedMetric, setSelectedMetric] = useState<MapMetric>('gmmlShare');
  const [selectedDept, setSelectedDept] = useState<DepartmentData>(DEPARTMENTS_DATA[0]); // Junín default
  const [hoveredDept, setHoveredDept] = useState<DepartmentData | null>(null);
  const [selectedVarietyFilter, setSelectedVarietyFilter] = useState<'all' | 'blanca' | 'amarilla' | 'color' | 'nativa'>('all');
  const [inspectedVariety, setInspectedVariety] = useState<VarietyInfo>(VARIETIES_CATALOG[0]);

  // Filtered varieties
  const filteredVarieties = VARIETIES_CATALOG.filter((v) => {
    if (selectedVarietyFilter === 'all') return true;
    return v.type === selectedVarietyFilter;
  });

  // Color generator for Peru Choropleth Map based on selected metric
  const getDeptFillColor = (dept: DepartmentData) => {
    if (selectedMetric === 'gmmlShare') {
      const share = dept.gmmlSharePct;
      if (share > 30) return '#0B5139'; // Junín ~38%
      if (share > 15) return '#1A875E'; // Huánuco ~24%
      if (share > 5) return '#20C77A'; // Pasco, Ayacucho
      if (share > 2) return '#6CE0A9';
      if (share > 0) return '#B7F36B';
      return '#E2E8F0'; // 0%
    }

    if (selectedMetric === 'production') {
      const ton = dept.productionTon;
      if (ton > 800000) return '#0B5139';
      if (ton > 500000) return '#1A875E';
      if (ton > 300000) return '#20C77A';
      if (ton > 100000) return '#6CE0A9';
      if (ton > 0) return '#B7F36B';
      return '#E2E8F0';
    }

    if (selectedMetric === 'yield') {
      const y = dept.yieldTonHa;
      if (y >= 26) return '#0369A1';
      if (y >= 22) return '#0284C7';
      if (y >= 18) return '#38BDF8';
      if (y >= 14) return '#BAE6FD';
      return '#E2E8F0';
    }

    if (selectedMetric === 'farmgatePrice') {
      const p = dept.farmgatePrice;
      if (p >= 1.15) return '#854D0E';
      if (p >= 0.95) return '#CA8A04';
      if (p >= 0.88) return '#FACC15';
      if (p > 0) return '#FEF08A';
      return '#E2E8F0';
    }

    if (selectedMetric === 'climateRisk') {
      if (dept.climateRisk === 'Muy Alto') return '#DC2626'; // Puno
      if (dept.climateRisk === 'Alto') return '#EA580C'; // Pasco, Huancavelica, Apurímac
      if (dept.climateRisk === 'Moderado') return '#F59E0B'; // Junín, Huánuco, Cajamarca
      return '#10B981';
    }

    return '#CBD5E1';
  };

  return (
    <div className="space-y-8 pb-12">
      {/* View Header */}
      <div className="bg-white rounded-3xl p-6 sm:p-8 border border-slate-200 shadow-sm flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-emerald-50 text-emerald-800 text-xs font-bold border border-emerald-200 mb-2">
            <BarChart3 className="w-3.5 h-3.5" />
            Radiografía Nacional de la Papa
          </div>
          <h1 className="text-2xl sm:text-3xl font-extrabold text-slate-900">
            Mercado Mayorista, Variedades & Alerta ENFEN
          </h1>
          <p className="text-xs sm:text-sm text-slate-500 max-w-2xl mt-1">
            Analiza las 10 variedades oficiales de MIDAGRI SISAP y EMMSA, el mapa de producción departamental y los reportes climáticos del <strong>ENFEN y SENAMHI</strong>.
          </p>
        </div>

        {/* Metric Selector Buttons */}
        <div className="flex flex-wrap gap-1.5 p-1.5 bg-slate-100 rounded-2xl">
          <button
            onClick={() => setSelectedMetric('gmmlShare')}
            className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${
              selectedMetric === 'gmmlShare'
                ? 'bg-white text-emerald-900 shadow-sm'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            % Ingreso a Lima (GMML)
          </button>
          <button
            onClick={() => setSelectedMetric('production')}
            className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${
              selectedMetric === 'production'
                ? 'bg-white text-emerald-900 shadow-sm'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            Producción (Ton)
          </button>
          <button
            onClick={() => setSelectedMetric('yield')}
            className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${
              selectedMetric === 'yield'
                ? 'bg-white text-emerald-900 shadow-sm'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            Rendimiento (t/ha)
          </button>
          <button
            onClick={() => setSelectedMetric('farmgatePrice')}
            className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${
              selectedMetric === 'farmgatePrice'
                ? 'bg-white text-emerald-900 shadow-sm'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            Precio en Chacra
          </button>
          <button
            onClick={() => setSelectedMetric('climateRisk')}
            className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${
              selectedMetric === 'climateRisk'
                ? 'bg-white text-red-900 shadow-sm'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            Riesgo Heladas SENAMHI
          </button>
        </div>
      </div>

      {/* Official ENFEN & SENAMHI Climate Radar Banner */}
      <section className="bg-gradient-to-br from-[#0B2535] via-[#0E3547] to-[#08202C] text-white rounded-3xl p-6 sm:p-8 border border-sky-900/60 shadow-xl space-y-5">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-white/10 pb-4">
          <div className="space-y-1">
            <div className="flex items-center gap-2">
              <span className="w-2.5 h-2.5 rounded-full bg-amber-400 animate-pulse" />
              <span className="text-xs font-extrabold uppercase tracking-widest text-amber-300">
                COMITÉ MULTISECTORIAL ENFEN & SENAMHI
              </span>
            </div>
            <h2 className="text-xl sm:text-2xl font-black text-white flex items-center gap-2">
              <Waves className="w-6 h-6 text-sky-400" />
              Monitoreo Oficial del Fenómeno El Niño
            </h2>
            <p className="text-xs text-sky-200">
              {OFFICIAL_ENFEN_DATA.latestBulletinNumber} • Publicado el {OFFICIAL_ENFEN_DATA.bulletinDate}
            </p>
          </div>

          <div className="flex items-center gap-3">
            <div className="p-3 bg-white/10 rounded-2xl border border-white/15 text-center">
              <span className="text-[10px] text-sky-200 uppercase block font-semibold">Estado Oficial</span>
              <span className="text-xs sm:text-sm font-extrabold text-amber-300">
                {OFFICIAL_ENFEN_DATA.status}
              </span>
            </div>
            <a
              href={OFFICIAL_ENFEN_DATA.officialUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="p-3 bg-sky-500 hover:bg-sky-400 text-slate-950 font-bold rounded-2xl text-xs flex items-center gap-1.5 transition-all shadow-md cursor-pointer"
            >
              <span>Ver Boletín</span>
              <ExternalLink className="w-3.5 h-3.5" />
            </a>
          </div>
        </div>

        {/* Ocean & Atmospheric Indicators */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          <div className="p-3.5 rounded-2xl bg-white/5 border border-white/10">
            <span className="text-[10px] text-sky-300 block uppercase font-mono">Región Niño 1+2 (Costa Perú)</span>
            <div className="text-xl font-black text-amber-300 mt-0.5">
              +{OFFICIAL_ENFEN_DATA.seaSurfaceTempAnomaly} °C
            </div>
            <p className="text-[11px] text-slate-300 mt-0.5">Anomalía Temperatura Superficial del Mar (TSM)</p>
          </div>

          <div className="p-3.5 rounded-2xl bg-white/5 border border-white/10">
            <span className="text-[10px] text-sky-300 block uppercase font-mono">Región Niño 3.4 (Pacífico Central)</span>
            <div className="text-xl font-black text-emerald-300 mt-0.5">
              +{OFFICIAL_ENFEN_DATA.pacificCentralAnomaly} °C
            </div>
            <p className="text-[11px] text-slate-300 mt-0.5">Condición Neutra predominante</p>
          </div>

          <div className="p-3.5 rounded-2xl bg-white/5 border border-white/10">
            <span className="text-[10px] text-sky-300 block uppercase font-mono">Probabilidad ENFEN</span>
            <div className="text-xl font-black text-white mt-0.5">
              {OFFICIAL_ENFEN_DATA.probabilities.neutro}% Neutro
            </div>
            <p className="text-[11px] text-slate-300 mt-0.5">24% Niño Débil | 10% Moderado</p>
          </div>

          <div className="p-3.5 rounded-2xl bg-white/5 border border-white/10">
            <span className="text-[10px] text-sky-300 block uppercase font-mono">Impacto en Precios GMML</span>
            <div className="text-xl font-black text-sky-300 mt-0.5">
              +8% a +15%
            </div>
            <p className="text-[11px] text-slate-300 mt-0.5">Prima de riesgo climático en papa</p>
          </div>
        </div>

        {/* Regional Impact on Potato Sectors */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-3 pt-1 text-xs">
          <div className="p-4 rounded-2xl bg-[#071924] border border-sky-800/60 space-y-1.5">
            <span className="font-extrabold text-amber-300 flex items-center gap-1.5">
              <ShieldAlert className="w-4 h-4 text-amber-400" />
              1. Costa Central & Norte (Barranca/Cañete)
            </span>
            <p className="text-slate-300 text-[11px] leading-relaxed">
              {OFFICIAL_ENFEN_DATA.impactOnPotato.coast}
            </p>
          </div>

          <div className="p-4 rounded-2xl bg-[#071924] border border-sky-800/60 space-y-1.5">
            <span className="font-extrabold text-emerald-300 flex items-center gap-1.5">
              <CheckCircle2 className="w-4 h-4 text-emerald-400" />
              2. Sierra Central (Tarma / Mantaro / Huánuco)
            </span>
            <p className="text-slate-300 text-[11px] leading-relaxed">
              {OFFICIAL_ENFEN_DATA.impactOnPotato.centralHighlands}
            </p>
          </div>

          <div className="p-4 rounded-2xl bg-[#071924] border border-sky-800/60 space-y-1.5">
            <span className="font-extrabold text-sky-300 flex items-center gap-1.5">
              <AlertTriangle className="w-4 h-4 text-sky-400" />
              3. Sierra Sur & Altiplano (Puno / Cusco)
            </span>
            <p className="text-slate-300 text-[11px] leading-relaxed">
              {OFFICIAL_ENFEN_DATA.impactOnPotato.southernHighlands}
            </p>
          </div>
        </div>
      </section>

      {/* Main Grid: Interactive Map of Peru + Department Inspector */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Interactive SVG Choropleth Map of Peru */}
        <div className="lg:col-span-7 bg-white rounded-3xl p-6 border border-slate-200 shadow-sm flex flex-col justify-between">
          <div className="flex items-center justify-between mb-2">
            <div>
              <h2 className="text-base font-bold text-slate-900 flex items-center gap-2">
                <MapPin className="w-4 h-4 text-emerald-700" />
                Mapa Interactivo Departamental (Haz clic para inspeccionar)
              </h2>
              <p className="text-xs text-slate-400">
                Mostrando: <strong>{selectedMetric === 'gmmlShare' ? '% de cuota de abastecimiento al GMML Lima' : selectedMetric === 'production' ? 'Producción anual en Toneladas (SIEA)' : selectedMetric === 'yield' ? 'Rendimiento promedio t/ha' : selectedMetric === 'farmgatePrice' ? 'Precio promedio en chacra S/kg' : 'Riesgo agroclimático y heladas'}</strong>
              </p>
            </div>
            {hoveredDept && (
              <span className="text-xs font-bold text-emerald-700 bg-emerald-50 px-2.5 py-1 rounded-lg border border-emerald-200">
                {hoveredDept.name}
              </span>
            )}
          </div>

          {/* SVG Map Container */}
          <div className="relative w-full h-[460px] flex items-center justify-center p-2 bg-[#F8FAF9] rounded-2xl border border-slate-100 overflow-hidden">
            <svg
              viewBox="60 10 400 480"
              className="w-full h-full max-h-[440px] drop-shadow-sm transition-all"
            >
              {DEPARTMENTS_DATA.map((dept) => {
                const isSelected = selectedDept.id === dept.id;
                const fillColor = getDeptFillColor(dept);

                return (
                  <g key={dept.id} className="cursor-pointer transition-all">
                    <path
                      d={dept.pathD}
                      fill={fillColor}
                      stroke={isSelected ? '#0B3025' : '#FFFFFF'}
                      strokeWidth={isSelected ? '2.5' : '1.2'}
                      strokeLinejoin="round"
                      className="hover:brightness-90 transition-all"
                      onMouseEnter={() => setHoveredDept(dept)}
                      onMouseLeave={() => setHoveredDept(null)}
                      onClick={() => setSelectedDept(dept)}
                    />
                    <text
                      x={dept.labelPos.x}
                      y={dept.labelPos.y}
                      textAnchor="middle"
                      className={`text-[8px] font-bold pointer-events-none select-none ${
                        fillColor === '#0B5139' || fillColor === '#1A875E' ? 'fill-white' : 'fill-slate-800'
                      }`}
                    >
                      {dept.id === 'junin' ? 'JUNÍN (38%)' : dept.id === 'huanuco' ? 'HUÁNUCO (24%)' : dept.name.split(' ')[0]}
                    </text>
                  </g>
                );
              })}

              {/* GMML Lima Market Point with Pulse */}
              <circle cx="185" cy="245" r="7" fill="#EF4444" stroke="#FFFFFF" strokeWidth="2" />
              <circle cx="185" cy="245" r="14" fill="#EF4444" opacity="0.25" className="animate-ping" />
              <text x="185" y="265" textAnchor="middle" className="text-[9px] font-extrabold fill-red-800">
                GMML LIMA
              </text>
            </svg>

            <div className="absolute bottom-3 left-3 bg-white/90 backdrop-blur-sm p-2.5 rounded-xl border border-slate-200 text-[10px] space-y-1 shadow-sm">
              <span className="font-bold text-slate-700 block">Intensidad ({selectedMetric}):</span>
              <div className="flex items-center gap-1">
                <span className="w-3 h-2.5 rounded-sm bg-[#E2E8F0]" />
                <span className="text-slate-500">Bajo / 0%</span>
                <span className="w-3 h-2.5 rounded-sm bg-[#B7F36B] ml-1" />
                <span className="w-3 h-2.5 rounded-sm bg-[#20C77A]" />
                <span className="w-3 h-2.5 rounded-sm bg-[#0B5139]" />
                <span className="text-slate-700 font-bold ml-1">Líder</span>
              </div>
            </div>
          </div>
        </div>

        {/* Selected Department Inspector */}
        <div className="lg:col-span-5 bg-white rounded-3xl p-6 border border-slate-200 shadow-sm flex flex-col justify-between space-y-6">
          <div className="space-y-4">
            <div className="flex items-start justify-between">
              <div>
                <span className="text-[11px] font-bold uppercase tracking-wider text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded border border-emerald-200">
                  Región: {selectedDept.region}
                </span>
                <h3 className="text-2xl font-black text-slate-900 mt-1">
                  {selectedDept.name}
                </h3>
              </div>
              <div className="text-right">
                <span className="text-xs text-slate-400 block font-medium">Cuota GMML Lima</span>
                <span className="text-2xl font-black text-emerald-700">
                  {selectedDept.gmmlSharePct}%
                </span>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="p-3.5 rounded-2xl bg-slate-50 border border-slate-200">
                <div className="flex items-center gap-1.5 text-xs text-slate-500 font-medium">
                  <BarChart3 className="w-3.5 h-3.5 text-emerald-700" />
                  <span>Producción Anual</span>
                </div>
                <div className="text-lg font-bold text-slate-900 mt-1">
                  {selectedDept.productionTon.toLocaleString()} <span className="text-xs font-normal text-slate-500">Ton</span>
                </div>
                <p className="text-[11px] text-slate-400 mt-0.5">
                  Área: {selectedDept.harvestedAreaHa.toLocaleString()} ha
                </p>
              </div>

              <div className="p-3.5 rounded-2xl bg-slate-50 border border-slate-200">
                <div className="flex items-center gap-1.5 text-xs text-slate-500 font-medium">
                  <TrendingUp className="w-3.5 h-3.5 text-blue-700" />
                  <span>Rendimiento</span>
                </div>
                <div className="text-lg font-bold text-slate-900 mt-1">
                  {selectedDept.yieldTonHa} <span className="text-xs font-normal text-slate-500">t/ha</span>
                </div>
                <p className="text-[11px] text-slate-400 mt-0.5">
                  Promedio provincial
                </p>
              </div>

              <div className="p-3.5 rounded-2xl bg-slate-50 border border-slate-200">
                <div className="flex items-center gap-1.5 text-xs text-slate-500 font-medium">
                  <DollarSign className="w-3.5 h-3.5 text-amber-700" />
                  <span>Precio en Chacra</span>
                </div>
                <div className="text-lg font-bold text-amber-900 mt-1">
                  S/ {selectedDept.farmgatePrice.toFixed(2)} <span className="text-xs font-normal text-slate-500">/kg</span>
                </div>
                <p className="text-[11px] text-slate-400 mt-0.5">
                  Mayorista Lima: S/ {selectedDept.wholesalePriceGMML.toFixed(2)}
                </p>
              </div>

              <div className="p-3.5 rounded-2xl bg-slate-50 border border-slate-200">
                <div className="flex items-center gap-1.5 text-xs text-slate-500 font-medium">
                  <ThermometerSnowflake className="w-3.5 h-3.5 text-red-600" />
                  <span>Riesgo Heladas</span>
                </div>
                <div className="text-lg font-bold text-slate-900 mt-1">
                  <span
                    className={`inline-block px-2 py-0.5 rounded text-xs font-extrabold ${
                      selectedDept.climateRisk === 'Muy Alto'
                        ? 'bg-red-100 text-red-800'
                        : selectedDept.climateRisk === 'Alto'
                        ? 'bg-orange-100 text-orange-800'
                        : selectedDept.climateRisk === 'Moderado'
                        ? 'bg-amber-100 text-amber-800'
                        : 'bg-emerald-100 text-emerald-800'
                    }`}
                  >
                    {selectedDept.climateRisk}
                  </span>
                </div>
                <p className="text-[11px] text-slate-400 mt-0.5 truncate">
                  {selectedDept.frostRiskMonths.length > 0 ? selectedDept.frostRiskMonths.join(', ') : 'Sin heladas registradas'}
                </p>
              </div>
            </div>

            <div className="p-4 rounded-2xl bg-emerald-50/70 border border-emerald-200 text-xs text-emerald-950 space-y-1.5">
              <div className="flex items-center justify-between font-bold">
                <span className="flex items-center gap-1.5">
                  <Scale className="w-4 h-4 text-emerald-700" />
                  Diferencial Chacra vs Mayorista Lima:
                </span>
                <span className="text-sm font-black text-emerald-800">
                  +S/ {(selectedDept.wholesalePriceGMML - selectedDept.farmgatePrice).toFixed(2)} /kg
                </span>
              </div>
              <p className="text-[11px] text-emerald-800 leading-relaxed">
                Este diferencial cubre flete de transporte (aprox. S/ 0.11 a S/ 0.14/kg desde Tarma hacia Lima), peajes, pesaje en balanza GMML, estiba y el margen del acopiador mayorista.
              </p>
            </div>
          </div>

          <div className="text-[11px] text-slate-400 border-t border-slate-100 pt-3 flex items-center justify-between">
            <span>Fuente: MIDAGRI SIEA / SISAP 2026</span>
            <span className="font-semibold text-emerald-700">Tarma & Valle del Mantaro</span>
          </div>
        </div>
      </div>

      {/* Complete Varietal Directory: All 10 Varieties from SISAP / EMMSA */}
      <div className="bg-white rounded-3xl p-6 sm:p-8 border border-slate-200 shadow-sm space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-100 pb-4">
          <div>
            <div className="flex items-center gap-2">
              <Sparkles className="w-5 h-5 text-emerald-700" />
              <h2 className="text-xl font-bold text-slate-900">
                Catálogo Completo de las 10 Variedades Oficiales (MIDAGRI SISAP & EMMSA)
              </h2>
            </div>
            <p className="text-xs text-slate-500 mt-0.5">
              Haz clic en cualquier variedad para inspeccionar sus parámetros agronómicos de INIA, cotización actual y sensibilidad climática al ENFEN.
            </p>
          </div>

          {/* Filter Pills */}
          <div className="flex items-center gap-1.5 p-1 bg-slate-100 rounded-2xl overflow-x-auto whitespace-nowrap">
            {[
              { id: 'all', label: 'Todas (10)' },
              { id: 'blanca', label: 'Blancas (4)' },
              { id: 'nativa', label: 'Nativas / Altura (3)' },
              { id: 'color', label: 'Color / Jaspeadas (2)' },
              { id: 'amarilla', label: 'Amarillas (1)' },
            ].map((tab) => (
              <button
                key={tab.id}
                onClick={() => setSelectedVarietyFilter(tab.id as any)}
                className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                  selectedVarietyFilter === tab.id
                    ? 'bg-white text-slate-900 shadow-sm'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                {tab.label}
              </button>
            ))}
          </div>
        </div>

        {/* 10 Varieties Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-3.5">
          {filteredVarieties.map((v) => {
            const isSelected = inspectedVariety.id === v.id;
            return (
              <div
                key={v.id}
                onClick={() => setInspectedVariety(v)}
                className={`p-4 rounded-2xl border transition-all cursor-pointer flex flex-col justify-between space-y-2 ${
                  isSelected
                    ? 'border-2 border-[#20C77A] bg-emerald-50/60 shadow-md ring-2 ring-[#20C77A]/20'
                    : 'border-slate-200 bg-white hover:border-slate-300 hover:bg-slate-50/50'
                }`}
              >
                <div className="space-y-1">
                  <div className="flex items-center justify-between">
                    <span
                      className={`text-[9px] font-extrabold uppercase px-2 py-0.5 rounded-full ${
                        v.type === 'amarilla'
                          ? 'bg-amber-100 text-amber-900'
                          : v.type === 'nativa'
                          ? 'bg-purple-100 text-purple-900'
                          : v.type === 'color'
                          ? 'bg-rose-100 text-rose-900'
                          : 'bg-emerald-100 text-emerald-900'
                      }`}
                    >
                      {v.type}
                    </span>
                    <span className="text-[10px] font-bold text-emerald-700 flex items-center gap-0.5">
                      <TrendingUp className="w-3 h-3" />
                      +{v.change7d}%
                    </span>
                  </div>

                  <h3 className="font-bold text-sm text-slate-900 leading-tight">
                    {v.name}
                  </h3>
                  <p className="text-[10px] text-slate-400 truncate">
                    {v.officialMidagriName}
                  </p>
                </div>

                <div className="pt-1">
                  <span className="text-[10px] text-slate-400 block">Precio GMML</span>
                  <div className="text-xl font-black text-slate-900">
                    S/ {v.currentGMMLPrice.toFixed(2)} <span className="text-xs font-normal text-slate-500">/kg</span>
                  </div>
                  <div className="text-[10px] text-slate-500 mt-1 flex justify-between font-mono">
                    <span>{v.cycleAvgDays} días</span>
                    <span>{v.avgYield} t/ha</span>
                  </div>
                </div>
              </div>
            );
          })}
        </div>

        {/* Selected Variety In-Depth Inspector Card */}
        <div className="p-6 rounded-3xl bg-slate-900 text-white border border-slate-800 space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-800 pb-3">
            <div>
              <span className="text-xs text-[#B7F36B] font-mono uppercase font-bold">
                Ficha Técnica: {inspectedVariety.officialMidagriName}
              </span>
              <h3 className="text-2xl font-black text-white mt-0.5">
                {inspectedVariety.name} ({inspectedVariety.commercialName})
              </h3>
            </div>
            <div className="text-right">
              <span className="text-xs text-slate-400 block">Precio en GMML Hoy</span>
              <span className="text-2xl font-black text-[#B7F36B]">
                S/ {inspectedVariety.currentGMMLPrice.toFixed(2)} /kg
              </span>
            </div>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 font-mono text-xs">
            <div className="p-3 bg-slate-800/80 rounded-xl">
              <span className="text-[10px] text-slate-400 block font-sans">Ciclo Fenológico (INIA)</span>
              <strong className="text-white text-sm">{inspectedVariety.cycleMinDays} – {inspectedVariety.cycleMaxDays} días</strong>
            </div>

            <div className="p-3 bg-slate-800/80 rounded-xl">
              <span className="text-[10px] text-slate-400 block font-sans">Altitud Recomendada</span>
              <strong className="text-white text-sm">{inspectedVariety.altitudeMin} – {inspectedVariety.altitudeMax} msnm</strong>
            </div>

            <div className="p-3 bg-slate-800/80 rounded-xl">
              <span className="text-[10px] text-slate-400 block font-sans">Rendimiento Promedio</span>
              <strong className="text-white text-sm">{inspectedVariety.avgYield} t/ha</strong>
            </div>

            <div className="p-3 bg-slate-800/80 rounded-xl">
              <span className="text-[10px] text-slate-400 block font-sans">Sensibilidad al ENFEN</span>
              <strong className={`text-sm ${inspectedVariety.enfenSensitivity === 'Alta' ? 'text-amber-400' : 'text-emerald-400'}`}>
                {inspectedVariety.enfenSensitivity}
              </strong>
            </div>
          </div>

          <div className="space-y-2 text-xs">
            <div className="p-3 rounded-xl bg-slate-800/50 border border-slate-700/60">
              <strong className="text-[#B7F36B] block">Perfil Culinario & Comercial:</strong>
              <p className="text-slate-300 text-[11px] mt-0.5 leading-relaxed">
                {inspectedVariety.culinaryProfile}
              </p>
            </div>

            <div className="p-3 rounded-xl bg-slate-800/50 border border-slate-700/60">
              <strong className="text-white block">Descripción del Cultivo:</strong>
              <p className="text-slate-300 text-[11px] mt-0.5 leading-relaxed">
                {inspectedVariety.description}
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
