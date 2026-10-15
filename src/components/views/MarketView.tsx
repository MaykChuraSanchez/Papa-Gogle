import React, { useState } from 'react';
import { DEPARTMENTS_DATA, HISTORICAL_PRICES } from '../../data/seedData';
import { DepartmentData } from '../../types/agro';
import {
  MapPin,
  TrendingUp,
  BarChart3,
  Calendar,
  Layers,
  ThermometerSnowflake,
  DollarSign,
  Truck,
  Info,
  Scale,
} from 'lucide-react';

type MapMetric = 'production' | 'yield' | 'gmmlShare' | 'farmgatePrice' | 'climateRisk';

export const MarketView: React.FC = () => {
  const [selectedMetric, setSelectedMetric] = useState<MapMetric>('gmmlShare');
  const [selectedDept, setSelectedDept] = useState<DepartmentData>(DEPARTMENTS_DATA[0]); // Junín default
  const [hoveredDept, setHoveredDept] = useState<DepartmentData | null>(null);
  const [selectedVariety, setSelectedVariety] = useState<'canchan' | 'yungay' | 'amarilla' | 'huamantanga'>('canchan');

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
      if (y >= 26) return '#0369A1'; // Costa tecnificada (Ica, Lima, Arequipa)
      if (y >= 22) return '#0284C7';
      if (y >= 18) return '#38BDF8';
      if (y >= 14) return '#BAE6FD';
      return '#E2E8F0';
    }

    if (selectedMetric === 'farmgatePrice') {
      const p = dept.farmgatePrice;
      if (p >= 1.15) return '#854D0E'; // Costa / cercanas
      if (p >= 0.95) return '#CA8A04';
      if (p >= 0.88) return '#FACC15';
      if (p > 0) return '#FEF08A';
      return '#E2E8F0';
    }

    if (selectedMetric === 'climateRisk') {
      if (dept.climateRisk === 'Muy Alto') return '#DC2626'; // Puno
      if (dept.climateRisk === 'Alto') return '#EA580C'; // Pasco, Huancavelica, Apurímac
      if (dept.climateRisk === 'Moderado') return '#F59E0B'; // Junín, Huánuco, Cajamarca
      return '#10B981'; // Costa bajo riesgo heladas
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
            Mercado Mayorista & Mapa Productivo del Perú
          </h1>
          <p className="text-xs sm:text-sm text-slate-500 max-w-2xl mt-1">
            Visualiza los volúmenes de ingreso a Lima, la distribución de la producción regional, los precios en chacra y los riesgos agroclimáticos en cada departamento del Perú.
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
              {/* Render each department polygon */}
              {DEPARTMENTS_DATA.map((dept) => {
                const isSelected = selectedDept.id === dept.id;
                const isHovered = hoveredDept?.id === dept.id;
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
                    {/* Visual department label */}
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

            {/* Map Legend */}
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

            {/* Metric Cards Grid */}
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

            {/* Differential Spread: Chacra vs GMML Lima */}
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

      {/* Varietal Comparison & Historical Spread */}
      <div className="bg-white rounded-3xl p-6 sm:p-8 border border-slate-200 shadow-sm space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h2 className="text-xl font-bold text-slate-900">
              Comparativa de Precios por Variedad en GMML (2024 - 2026)
            </h2>
            <p className="text-xs text-slate-500 mt-0.5">
              Diferencial entre variedades blancas (Canchán, Yungay) vs variedades amarillas y de color
            </p>
          </div>

          <div className="flex items-center gap-2">
            {(['canchan', 'yungay', 'amarilla', 'huamantanga'] as const).map((v) => (
              <button
                key={v}
                onClick={() => setSelectedVariety(v)}
                className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                  selectedVariety === v
                    ? 'bg-slate-900 text-white shadow-sm'
                    : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                }`}
              >
                {v === 'canchan'
                  ? 'Papa Canchán'
                  : v === 'yungay'
                  ? 'Papa Yungay'
                  : v === 'amarilla'
                  ? 'Amarilla Tumbay'
                  : 'Huamantanga'}
              </button>
            ))}
          </div>
        </div>

        {/* Variety Price Table Comparison */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <div className={`p-4 rounded-2xl border transition-all ${selectedVariety === 'canchan' ? 'border-[#20C77A] bg-emerald-50/40 ring-2 ring-[#20C77A]/20' : 'border-slate-200 bg-white'}`}>
            <span className="text-xs font-bold text-slate-500 uppercase">Líder de Consumo</span>
            <h3 className="font-bold text-base text-slate-900 mt-0.5">Papa Canchán</h3>
            <div className="text-2xl font-black text-emerald-800 mt-2">S/ 1.48 <span className="text-xs font-normal text-slate-500">/kg</span></div>
            <p className="text-xs text-slate-500 mt-1">Variedad blanca de alto rendimiento (24-30 t/ha). Representa el 60% de la papa frita en pollerías de Lima.</p>
          </div>

          <div className={`p-4 rounded-2xl border transition-all ${selectedVariety === 'yungay' ? 'border-[#20C77A] bg-emerald-50/40 ring-2 ring-[#20C77A]/20' : 'border-slate-200 bg-white'}`}>
            <span className="text-xs font-bold text-slate-500 uppercase">Resistente a Altura</span>
            <h3 className="font-bold text-base text-slate-900 mt-0.5">Papa Yungay</h3>
            <div className="text-2xl font-black text-slate-900 mt-2">S/ 1.42 <span className="text-xs font-normal text-slate-500">/kg</span></div>
            <p className="text-xs text-slate-500 mt-1">Ciclo más largo (150-180 días). Tolera heladas severas en zonas altas de Junín y Huancavelica.</p>
          </div>

          <div className={`p-4 rounded-2xl border transition-all ${selectedVariety === 'amarilla' ? 'border-[#20C77A] bg-emerald-50/40 ring-2 ring-[#20C77A]/20' : 'border-slate-200 bg-white'}`}>
            <span className="text-xs font-bold text-amber-600 uppercase">Premium Culinario</span>
            <h3 className="font-bold text-base text-slate-900 mt-0.5">Amarilla Tumbay</h3>
            <div className="text-2xl font-black text-amber-700 mt-2">S/ 2.52 <span className="text-xs font-normal text-slate-500">/kg</span></div>
            <p className="text-xs text-slate-500 mt-1">Menor rendimiento (16 t/ha) pero cotización 70% superior a la Canchán en el mercado limeño.</p>
          </div>

          <div className={`p-4 rounded-2xl border transition-all ${selectedVariety === 'huamantanga' ? 'border-[#20C77A] bg-emerald-50/40 ring-2 ring-[#20C77A]/20' : 'border-slate-200 bg-white'}`}>
            <span className="text-xs font-bold text-purple-600 uppercase">Variedad de Color</span>
            <h3 className="font-bold text-base text-slate-900 mt-0.5">Huamantanga</h3>
            <div className="text-2xl font-black text-purple-900 mt-2">S/ 2.10 <span className="text-xs font-normal text-slate-500">/kg</span></div>
            <p className="text-xs text-slate-500 mt-1">Pulpa harinosa de alta demanda en pollerías gourmet y restaurantes tradicionales.</p>
          </div>
        </div>
      </div>

      {/* Seasonality Heatmap & Supply Volume Curve */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Seasonality Heatmap */}
        <div className="bg-white rounded-3xl p-6 sm:p-8 border border-slate-200 shadow-sm space-y-4">
          <div className="flex items-center gap-2">
            <Calendar className="w-5 h-5 text-emerald-700" />
            <h3 className="text-lg font-bold text-slate-900">
              Calendario Estacional de la Papa en el Perú
            </h3>
          </div>
          <p className="text-xs text-slate-500">
            Comportamiento anual típico de cosechas en valles andinos y su efecto en los precios de Lima:
          </p>

          <div className="grid grid-cols-3 sm:grid-cols-4 gap-2 pt-2">
            {[
              { m: 'Ene', phase: 'Precios Altos', color: 'bg-emerald-100 text-emerald-900 border-emerald-300', note: 'Escasez sierra' },
              { m: 'Feb', phase: 'Transición', color: 'bg-emerald-50 text-emerald-800 border-emerald-200', note: 'Costa temprana' },
              { m: 'Mar', phase: 'Cosecha Temprana', color: 'bg-blue-50 text-blue-800 border-blue-200', note: 'Comienzan arribos' },
              { m: 'Abr', phase: 'Ingreso Creciente', color: 'bg-blue-100 text-blue-900 border-blue-300', note: 'Valles bajos' },
              { m: 'May', phase: 'Pico de Cosecha', color: 'bg-amber-100 text-amber-900 border-amber-300', note: 'Precios a la baja' },
              { m: 'Jun', phase: 'Sobreoferta GMML', color: 'bg-red-100 text-red-900 border-red-300', note: 'Precios mínimos' },
              { m: 'Jul', phase: 'Cosecha Plena', color: 'bg-amber-100 text-amber-900 border-amber-300', note: 'Heladas en altura' },
              { m: 'Ago', phase: 'Fin Campaña Sierra', color: 'bg-amber-50 text-amber-800 border-amber-200', note: 'Se frena oferta' },
              { m: 'Set', phase: 'Inicio de Alza', color: 'bg-emerald-50 text-emerald-800 border-emerald-200', note: 'Poco tubérculo' },
              { m: 'Oct', phase: 'Precios Firmes', color: 'bg-emerald-100 text-emerald-900 border-emerald-300', note: 'Demanda estable' },
              { m: 'Nov', phase: 'Pico de Precios', color: 'bg-emerald-200 text-emerald-950 border-emerald-400', note: 'Oferta mínima' },
              { m: 'Dic', phase: 'Alta Demanda', color: 'bg-emerald-200 text-emerald-950 border-emerald-400', note: 'Fiestas / Navidad' },
            ].map((item, idx) => (
              <div key={idx} className={`p-2.5 rounded-xl border text-center ${item.color} flex flex-col justify-between`}>
                <span className="font-black text-xs block">{item.m}</span>
                <span className="text-[11px] font-semibold mt-1 block leading-tight">{item.phase}</span>
                <span className="text-[10px] opacity-75 mt-0.5 block">{item.note}</span>
              </div>
            ))}
          </div>
        </div>

        {/* Volume vs Price Elasticity Card */}
        <div className="bg-white rounded-3xl p-6 sm:p-8 border border-slate-200 shadow-sm space-y-4">
          <div className="flex items-center gap-2">
            <Truck className="w-5 h-5 text-emerald-700" />
            <h3 className="text-lg font-bold text-slate-900">
              Curva Oferta Física vs Precio Mayorista
            </h3>
          </div>
          <p className="text-xs text-slate-500">
            Relación empírica en el GMML: a mayor volumen de camiones ingresados por día, menor el precio negociado en piso:
          </p>

          <div className="space-y-3 pt-2">
            <div className="p-3.5 rounded-2xl bg-red-50 border border-red-200 flex items-center justify-between text-xs">
              <div>
                <span className="font-bold text-red-900 block">&gt; 3,200 Toneladas / día</span>
                <span className="text-red-700">Sobreoferta de camiones en pabellones</span>
              </div>
              <div className="text-right">
                <span className="font-black text-red-900 text-sm">S/ 1.10 - S/ 1.25</span>
                <span className="text-[10px] text-red-600 block">Presión bajista</span>
              </div>
            </div>

            <div className="p-3.5 rounded-2xl bg-emerald-50 border border-emerald-200 flex items-center justify-between text-xs">
              <div>
                <span className="font-bold text-emerald-900 block">2,400 a 2,700 Toneladas / día (Actual)</span>
                <span className="text-emerald-700">Equilibrio normal de abastecimiento</span>
              </div>
              <div className="text-right">
                <span className="font-black text-emerald-900 text-sm">S/ 1.45 - S/ 1.55</span>
                <span className="text-[10px] text-emerald-600 block">Precio estable</span>
              </div>
            </div>

            <div className="p-3.5 rounded-2xl bg-blue-50 border border-blue-200 flex items-center justify-between text-xs">
              <div>
                <span className="font-bold text-blue-900 block">&lt; 2,100 Toneladas / día</span>
                <span className="text-blue-700">Escasez por lluvias, huaycos o fin de ciclo</span>
              </div>
              <div className="text-right">
                <span className="font-black text-blue-900 text-sm">S/ 1.80 - S/ 2.20</span>
                <span className="text-[10px] text-blue-600 block">Pico alcista</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
