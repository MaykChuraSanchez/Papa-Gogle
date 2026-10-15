import React, { useState } from 'react';
import { ENFEN_OFFICIAL_REPORT, SENAMHI_STATIONS_DATA } from '../../data/seedData';
import { VARIETIES_CATALOG } from '../../utils/agronomicEngine';
import { ViewTab } from '../../types/agro';
import {
  Waves,
  Thermometer,
  CloudRain,
  AlertTriangle,
  ExternalLink,
  ShieldAlert,
  ShieldCheck,
  TrendingUp,
  MapPin,
  Sparkles,
  Info,
  ArrowRight,
  Activity,
  CheckCircle2,
  Calendar,
  Truck
} from 'lucide-react';

interface EnfenSenamhiViewProps {
  onNavigateTab: (tab: ViewTab) => void;
  onSelectVarietyForPlanting?: (varietyId: string) => void;
}

export const EnfenSenamhiView: React.FC<EnfenSenamhiViewProps> = ({
  onNavigateTab,
  onSelectVarietyForPlanting,
}) => {
  const [supplyShockPct, setSupplyShockPct] = useState<number>(20); // 0 to 50% supply reduction
  const [filterRegion, setFilterRegion] = useState<string>('all');

  // Price shock calculation formula based on historical MIDAGRI / EMMSA elasticity
  // For GMML potatoes, price elasticity of demand is approximately -0.65 to -0.75
  // Meaning a 20% contraction in supply creates an approximate 28% to 32% increase in wholesale price
  const calculateShockedPrice = (basePrice: number, shockPct: number) => {
    const multiplier = 1 + (shockPct / 100) * 1.45;
    return Number((basePrice * multiplier).toFixed(2));
  };

  return (
    <div className="space-y-8 animate-fadeIn">
      {/* Official ENFEN Header Banner */}
      <div className="bg-gradient-to-r from-[#07241C] via-[#0B3025] to-[#143B2E] rounded-2xl p-6 sm:p-8 text-white border border-[#1A4537] shadow-xl relative overflow-hidden">
        <div className="absolute top-0 right-0 w-96 h-96 bg-amber-500/10 rounded-full blur-3xl pointer-events-none -mr-20 -mt-20"></div>

        <div className="relative z-10 flex flex-col lg:flex-row lg:items-center justify-between gap-6">
          <div className="space-y-3 max-w-3xl">
            <div className="flex flex-wrap items-center gap-2">
              <span className="px-3 py-1 rounded-full text-xs font-bold uppercase tracking-wider bg-amber-400/20 text-amber-300 border border-amber-400/40 flex items-center gap-1.5">
                <span className="relative flex h-2 w-2">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-amber-400 opacity-75"></span>
                  <span className="relative inline-flex rounded-full h-2 w-2 bg-amber-400"></span>
                </span>
                Estado Oficial: {ENFEN_OFFICIAL_REPORT.status}
              </span>
              <span className="px-3 py-1 rounded-full text-xs font-semibold bg-white/10 text-slate-200 border border-white/20">
                {ENFEN_OFFICIAL_REPORT.bulletinNumber}
              </span>
            </div>

            <h1 className="text-2xl sm:text-4xl font-extrabold tracking-tight">
              Observatorio Oficial de <span className="text-amber-300">El Niño (ENFEN & SENAMHI)</span>
            </h1>

            <p className="text-slate-300 text-sm sm:text-base leading-relaxed">
              Monitoreo oficial de anomalías de Temperatura Superficial del Mar (TSM Niño 1+2 y Niño 3.4),
              boletines agroclimáticos del SENAMHI, impacto por pisos altitudinales y su efecto directo en
              el abastecimiento y precio de la papa en el Gran Mercado Mayorista de Lima.
            </p>

            <div className="text-xs text-slate-400 flex flex-wrap items-center gap-2 pt-1">
              <span>{ENFEN_OFFICIAL_REPORT.officialEntity}</span>
              <span>•</span>
              <span className="text-[#B7F36B]">Publicación: {ENFEN_OFFICIAL_REPORT.publishDate}</span>
            </div>
          </div>

          {/* Official Verification Links */}
          <div className="flex flex-col gap-2 shrink-0">
            {ENFEN_OFFICIAL_REPORT.officialSources.slice(0, 2).map((src, i) => (
              <a
                key={i}
                href={src.url}
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center justify-between gap-3 px-4 py-2 rounded-xl bg-white/10 hover:bg-white/15 text-white text-xs font-medium border border-white/20 transition-all group"
              >
                <div>
                  <div className="text-[10px] text-slate-300">{src.badge}</div>
                  <div className="font-bold text-amber-300 group-hover:underline">{src.name}</div>
                </div>
                <ExternalLink className="w-4 h-4 text-slate-300 group-hover:text-white" />
              </a>
            ))}
          </div>
        </div>

        {/* Diagnostic Key Numbers */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mt-6 pt-6 border-t border-white/10">
          <div className="bg-black/20 p-3 rounded-xl border border-white/5">
            <div className="text-xs text-slate-400 flex items-center justify-between">
              <span>TSM Niño 1+2 (Costa)</span>
              <Waves className="w-3.5 h-3.5 text-amber-400" />
            </div>
            <div className="text-2xl font-bold text-amber-300 mt-1">
              +{ENFEN_OFFICIAL_REPORT.tsmAnomalyRegion12.toFixed(1)} °C
            </div>
            <div className="text-[11px] text-slate-300">Anomalía costera leve-moderada</div>
          </div>

          <div className="bg-black/20 p-3 rounded-xl border border-white/5">
            <div className="text-xs text-slate-400 flex items-center justify-between">
              <span>TSM Niño 3.4 (Pacífico)</span>
              <Waves className="w-3.5 h-3.5 text-blue-400" />
            </div>
            <div className="text-2xl font-bold text-white mt-1">
              +{ENFEN_OFFICIAL_REPORT.tsmAnomalyRegion34.toFixed(1)} °C
            </div>
            <div className="text-[11px] text-[#B7F36B]">Rango de condición neutra</div>
          </div>

          <div className="bg-black/20 p-3 rounded-xl border border-white/5">
            <div className="text-xs text-slate-400 flex items-center justify-between">
              <span>Índice Costero (ICEN)</span>
              <Activity className="w-3.5 h-3.5 text-emerald-400" />
            </div>
            <div className="text-2xl font-bold text-white mt-1">
              +{ENFEN_OFFICIAL_REPORT.icenIndex.toFixed(2)}
            </div>
            <div className="text-[11px] text-slate-300">Categoría Neutra Cálida</div>
          </div>

          <div className="bg-black/20 p-3 rounded-xl border border-white/5">
            <div className="text-xs text-slate-400 flex items-center justify-between">
              <span>Probabilidad Neutra</span>
              <CheckCircle2 className="w-3.5 h-3.5 text-[#B7F36B]" />
            </div>
            <div className="text-2xl font-bold text-[#B7F36B] mt-1">
              {ENFEN_OFFICIAL_REPORT.probabilities.neutro}%
            </div>
            <div className="text-[11px] text-amber-300">Niño Débil: {ENFEN_OFFICIAL_REPORT.probabilities.ninoDebil}%</div>
          </div>
        </div>
      </div>

      {/* Official ENFEN Probabilities Breakdown Bar */}
      <div className="bg-white rounded-2xl p-6 border border-slate-200 shadow-sm space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
          <div>
            <h2 className="text-base sm:text-lg font-bold text-slate-900 flex items-center gap-2">
              <Activity className="w-5 h-5 text-[#0B3025]" />
              Probabilidad Oficial ENFEN para el Trimestre Actual (Región 1+2)
            </h2>
            <p className="text-xs text-slate-500 mt-0.5">
              Estimación de la Comisión Multisectorial ENFEN basada en boyas oceanográficas y modelos climáticos internacionales.
            </p>
          </div>
          <span className="text-xs font-mono font-bold text-slate-600 bg-slate-100 px-3 py-1 rounded-lg">
            Válido hasta Dic 2026
          </span>
        </div>

        {/* Visual Probability Distribution Bar */}
        <div className="space-y-2">
          <div className="h-6 w-full bg-slate-100 rounded-xl overflow-hidden flex shadow-inner">
            <div
              style={{ width: `${ENFEN_OFFICIAL_REPORT.probabilities.neutro}%` }}
              className="bg-emerald-500 flex items-center justify-center text-white text-[11px] font-bold"
              title="Condición Neutra"
            >
              Neutra {ENFEN_OFFICIAL_REPORT.probabilities.neutro}%
            </div>
            <div
              style={{ width: `${ENFEN_OFFICIAL_REPORT.probabilities.ninoDebil}%` }}
              className="bg-amber-400 flex items-center justify-center text-slate-900 text-[11px] font-bold"
              title="Niño Débil"
            >
              Débil {ENFEN_OFFICIAL_REPORT.probabilities.ninoDebil}%
            </div>
            <div
              style={{ width: `${ENFEN_OFFICIAL_REPORT.probabilities.ninoModerado}%` }}
              className="bg-orange-500 flex items-center justify-center text-white text-[11px] font-bold"
              title="Niño Moderado"
            >
              Mod {ENFEN_OFFICIAL_REPORT.probabilities.ninoModerado}%
            </div>
            <div
              style={{ width: `${ENFEN_OFFICIAL_REPORT.probabilities.nina}%` }}
              className="bg-blue-400 flex items-center justify-center text-white text-[11px] font-bold"
              title="La Niña"
            >
              Niña {ENFEN_OFFICIAL_REPORT.probabilities.nina}%
            </div>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-xs pt-1">
            <div className="flex items-center gap-2">
              <span className="w-3 h-3 bg-emerald-500 rounded-md"></span>
              <span className="text-slate-700">Condición Neutra: <strong>58%</strong></span>
            </div>
            <div className="flex items-center gap-2">
              <span className="w-3 h-3 bg-amber-400 rounded-md"></span>
              <span className="text-slate-700">El Niño Débil: <strong>32%</strong></span>
            </div>
            <div className="flex items-center gap-2">
              <span className="w-3 h-3 bg-orange-500 rounded-md"></span>
              <span className="text-slate-700">El Niño Moderado: <strong>8%</strong></span>
            </div>
            <div className="flex items-center gap-2">
              <span className="w-3 h-3 bg-blue-400 rounded-md"></span>
              <span className="text-slate-700">La Niña Costera: <strong>2%</strong></span>
            </div>
          </div>
        </div>

        {/* Official ENFEN Quote Box */}
        <div className="bg-slate-50 p-4 rounded-xl border border-slate-200 text-xs text-slate-700 leading-relaxed flex items-start gap-3">
          <Info className="w-4 h-4 text-emerald-700 shrink-0 mt-0.5" />
          <div>
            <strong className="text-slate-900 font-bold">Resumen Técnico Oficial del Comunicado ENFEN: </strong>
            "{ENFEN_OFFICIAL_REPORT.officialSummary}"
          </div>
        </div>
      </div>

      {/* Regional Agroclimatic Impact Table (SENAMHI) */}
      <div className="bg-white rounded-2xl p-6 border border-slate-200 shadow-sm space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
          <div>
            <h2 className="text-base sm:text-lg font-bold text-slate-900 flex items-center gap-2">
              <CloudRain className="w-5 h-5 text-[#0B3025]" />
              Pronóstico Agroclimático SENAMHI por Regiones Paperas
            </h2>
            <p className="text-xs text-slate-500 mt-0.5">
              Condiciones térmicas, pluviométricas e impacto directo en la floración y sanidad del cultivo de la papa.
            </p>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {ENFEN_OFFICIAL_REPORT.keyAgroclimaticImpacts.map((item, idx) => (
            <div
              key={idx}
              className="p-4 rounded-xl border border-slate-200 bg-slate-50 hover:bg-white hover:border-[#20C77A] transition-all space-y-2.5"
            >
              <div className="flex items-center justify-between gap-2">
                <span className="font-bold text-sm text-slate-900 flex items-center gap-1.5">
                  <MapPin className="w-4 h-4 text-[#20C77A]" />
                  {item.region}
                </span>
                <span
                  className={`text-[10px] font-bold px-2.5 py-0.5 rounded-full uppercase ${
                    item.riskLevel === 'Medio-Alto'
                      ? 'bg-orange-100 text-orange-800 border border-orange-200'
                      : item.riskLevel === 'Moderado'
                      ? 'bg-amber-100 text-amber-800 border border-amber-200'
                      : 'bg-emerald-100 text-emerald-800 border border-emerald-200'
                  }`}
                >
                  Riesgo: {item.riskLevel}
                </span>
              </div>

              <div className="grid grid-cols-2 gap-2 text-xs">
                <div className="bg-white p-2 rounded-lg border border-slate-100">
                  <span className="text-[10px] text-slate-400 block">Anomalía Térmica:</span>
                  <strong className="text-slate-800">{item.temperatureAnomaly}</strong>
                </div>
                <div className="bg-white p-2 rounded-lg border border-slate-100">
                  <span className="text-[10px] text-slate-400 block">Régimen de Lluvias:</span>
                  <strong className="text-slate-800">{item.rainfallAnomaly}</strong>
                </div>
              </div>

              <p className="text-xs text-slate-600 leading-relaxed bg-white/70 p-2.5 rounded-lg border border-slate-100">
                {item.impactOnPotato}
              </p>
            </div>
          ))}
        </div>
      </div>

      {/* SENAMHI Weather Stations Live Monitor */}
      <div className="bg-white rounded-2xl p-6 border border-slate-200 shadow-sm space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="text-base sm:text-lg font-bold text-slate-900 flex items-center gap-2">
            <Thermometer className="w-5 h-5 text-[#0B3025]" />
            Red de Estaciones Meteorológicas SENAMHI en Cuencas Paperas
          </h2>
          <span className="text-xs text-slate-500 font-mono">Actualizado Hoy 05:45 hrs</span>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-xs text-left border-collapse">
            <thead>
              <tr className="bg-slate-50 border-b border-slate-200 text-slate-500 font-semibold uppercase">
                <th className="py-2.5 px-3">Estación Meteorológica</th>
                <th className="py-2.5 px-3">Altitud</th>
                <th className="py-2.5 px-3">Temp Mín (°C)</th>
                <th className="py-2.5 px-3">Temp Máx (°C)</th>
                <th className="py-2.5 px-3">Lluvia Acum. (mm)</th>
                <th className="py-2.5 px-3">Días Helada (30d)</th>
                <th className="py-2.5 px-3">Diagnóstico Agronómico</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 text-slate-700">
              {SENAMHI_STATIONS_DATA.map((st, i) => (
                <tr key={i} className="hover:bg-slate-50/70 transition-colors">
                  <td className="py-2.5 px-3 font-bold text-slate-900">{st.station}</td>
                  <td className="py-2.5 px-3 font-mono">{st.altitude} msnm</td>
                  <td className="py-2.5 px-3 font-semibold text-blue-600">{st.tempMin} °C</td>
                  <td className="py-2.5 px-3 font-semibold text-amber-600">{st.tempMax} °C</td>
                  <td className="py-2.5 px-3 font-mono">{st.rainMm} mm</td>
                  <td className="py-2.5 px-3">
                    <span className={`px-2 py-0.5 rounded text-[11px] font-bold ${
                      st.frostDays30d > 0 ? 'bg-blue-100 text-blue-800' : 'bg-slate-100 text-slate-600'
                    }`}>
                      {st.frostDays30d} días
                    </span>
                  </td>
                  <td className="py-2.5 px-3 font-medium text-emerald-800">{st.condition}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Potato Varieties Sensitivity Matrix to El Niño (All 10 Varieties) */}
      <div className="bg-white rounded-2xl p-6 border border-slate-200 shadow-sm space-y-4">
        <div>
          <h2 className="text-base sm:text-lg font-bold text-slate-900 flex items-center gap-2">
            <ShieldAlert className="w-5 h-5 text-[#0B3025]" />
            Matriz de Vulnerabilidad a El Niño: Las 10 Variedades de Papa
          </h2>
          <p className="text-xs text-slate-500 mt-0.5">
            Comportamiento agronómico y susceptibilidad fitosanitaria (Rancha, bacteriosis y estrés térmico) ante eventos ENFEN.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
          {VARIETIES_CATALOG.map((v) => (
            <div
              key={v.id}
              className="p-4 rounded-xl border border-slate-200 bg-slate-50 hover:bg-white hover:border-[#20C77A] transition-all space-y-2"
            >
              <div className="flex items-center justify-between">
                <span className="font-bold text-sm text-slate-900">{v.name}</span>
                <span
                  className={`text-[10px] font-bold px-2 py-0.5 rounded-full uppercase ${
                    v.enfenSensitivity === 'Alta'
                      ? 'bg-red-100 text-red-800 border border-red-200'
                      : v.enfenSensitivity === 'Media'
                      ? 'bg-amber-100 text-amber-800 border border-amber-200'
                      : 'bg-emerald-100 text-emerald-800 border border-emerald-200'
                  }`}
                >
                  Sensibilidad {v.enfenSensitivity}
                </span>
              </div>

              <div className="text-[11px] text-slate-500 font-mono">
                SISAP: {v.officialMidagriName}
              </div>

              <p className="text-xs text-slate-600 leading-relaxed bg-white p-2.5 rounded-lg border border-slate-100">
                {v.enfenVulnerabilityDetail || 'Resistencia estándar ante variaciones climáticas moderadas.'}
              </p>

              <div className="flex items-center justify-between text-[11px] pt-1">
                <span className="text-slate-500">Rancha: <strong>{v.blightResistance}</strong></span>
                <span className="text-slate-500">Heladas: <strong>{v.frostResistance}</strong></span>
                <button
                  onClick={() => {
                    if (onSelectVarietyForPlanting) onSelectVarietyForPlanting(v.id);
                    onNavigateTab('planting');
                  }}
                  className="text-xs text-[#128051] hover:underline font-bold"
                >
                  Simular siembra
                </button>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Interactive Supply Shock Simulator: Impact on GMML Potato Prices */}
      <div className="bg-gradient-to-br from-[#0B3025] to-[#124234] text-white rounded-2xl p-6 sm:p-8 border border-[#1A4537] shadow-lg space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="space-y-1">
            <span className="text-xs font-bold uppercase tracking-wider text-[#B7F36B] flex items-center gap-1.5">
              <Truck className="w-4 h-4" />
              Simulador de Shock de Oferta & Precios GMML
            </span>
            <h2 className="text-xl sm:text-2xl font-extrabold text-white">
              ¿Qué pasa con los precios si El Niño interrumpe el transporte o daña cultivos?
            </h2>
            <p className="text-slate-300 text-xs sm:text-sm max-w-2xl">
              El 85% de la papa de Lima ingresa por la Carretera Central (Junín, Pasco, Huánuco).
              Ajusta el control deslizante para simular una caída en el abastecimiento y observar la reacción de precios en el GMML.
            </p>
          </div>

          <div className="bg-white/10 p-4 rounded-xl border border-white/20 text-right shrink-0">
            <div className="text-xs text-slate-300">Caída de Oferta Simulada</div>
            <div className="text-3xl font-extrabold text-amber-300">-{supplyShockPct}%</div>
            <div className="text-[11px] text-[#B7F36B]">Impacto directo mayorista</div>
          </div>
        </div>

        {/* Slider */}
        <div className="space-y-2 bg-black/20 p-4 rounded-xl border border-white/10">
          <div className="flex justify-between text-xs text-slate-300 font-semibold">
            <span>Abastecimiento Normal (0%)</span>
            <span>Corte Parcial (-20%)</span>
            <span>Bloqueo Severo (-50%)</span>
          </div>
          <input
            type="range"
            min="0"
            max="50"
            step="5"
            value={supplyShockPct}
            onChange={(e) => setSupplyShockPct(Number(e.target.value))}
            className="w-full accent-[#B7F36B] cursor-pointer h-2 bg-slate-700 rounded-lg"
          />
        </div>

        {/* Dynamic Shocked Prices for Top Potato Varieties */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
          {[
            { id: 'canchan', name: 'Papa Canchán', base: 1.48 },
            { id: 'amarilla', name: 'Papa Amarilla', base: 2.52 },
            { id: 'huayro', name: 'Papa Huayro', base: 2.25 },
            { id: 'yungay', name: 'Papa Yungay', base: 1.42 },
          ].map((item) => {
            const shockedPrice = calculateShockedPrice(item.base, supplyShockPct);
            const deltaSoles = (shockedPrice - item.base).toFixed(2);
            const deltaPct = (((shockedPrice - item.base) / item.base) * 100).toFixed(0);

            return (
              <div key={item.id} className="bg-white/10 p-4 rounded-xl border border-white/15">
                <div className="text-xs text-slate-300 font-medium">{item.name}</div>
                <div className="text-xs text-slate-400 mt-0.5">Precio base: S/ {item.base.toFixed(2)}</div>
                <div className="text-2xl font-extrabold text-[#B7F36B] mt-2">
                  S/ {shockedPrice.toFixed(2)}
                  <span className="text-xs font-normal text-slate-300"> / kg</span>
                </div>
                <div className="text-xs font-bold text-amber-300 mt-1">
                  +{deltaSoles} S/kg (+{deltaPct}%)
                </div>
              </div>
            );
          })}
        </div>

        <div className="pt-2 text-xs text-slate-400 flex items-center gap-2">
          <Info className="w-4 h-4 text-[#B7F36B] shrink-0" />
          <span>
            Modelo de elasticidad empírica calibrado con series de EMMSA durante anomalías costeras de 2017 y 2023.
          </span>
        </div>
      </div>
    </div>
  );
};
