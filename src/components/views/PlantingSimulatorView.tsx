import React, { useState } from 'react';
import { VARIETIES_CATALOG, calculateHarvestWindow } from '../../utils/agronomicEngine';
import { calculateEconomicScenarios } from '../../utils/economicEngine';
import { calculateForecastForHarvest } from '../../utils/forecastingEngine';
import { calculateEnfenClimateAdjustment, EnfenScenarioType } from '../../utils/enfenEngine';
import {
  CalendarDays,
  Sparkles,
  TrendingUp,
  AlertCircle,
  HelpCircle,
  CheckCircle2,
  DollarSign,
  Scale,
  BrainCircuit,
  RefreshCw,
  Info,
  Waves,
} from 'lucide-react';

interface PlantingSimulatorViewProps {
  initialVarietyId?: string;
}

export const PlantingSimulatorView: React.FC<PlantingSimulatorViewProps> = ({
  initialVarietyId = 'canchan',
}) => {
  // Simulator Inputs
  const [varietyId, setVarietyId] = useState<string>(initialVarietyId);

  React.useEffect(() => {
    if (initialVarietyId) {
      setVarietyId(initialVarietyId);
    }
  }, [initialVarietyId]);
  const [location, setLocation] = useState<string>('Tarma, Junín (Valle del Mantaro)');
  const [plantingDate, setPlantingDate] = useState<string>('2026-10-15');
  const [hectares, setHectares] = useState<number>(1.5);
  const [expectedYield, setExpectedYield] = useState<number>(24.5);
  const [costPerHa, setCostPerHa] = useState<number>(18500);
  const [enfenScenario, setEnfenScenario] = useState<EnfenScenarioType>('vigilancia');

  // AI explanation state
  const [isExplaining, setIsExplaining] = useState<boolean>(false);
  const [aiExplanation, setAiExplanation] = useState<string | null>(null);

  // Current variety info
  const variety = VARIETIES_CATALOG.find((v) => v.id === varietyId) || VARIETIES_CATALOG[0];

  // Calculate harvest window based on INIA agronomic cycle
  const harvestWindow = calculateHarvestWindow(plantingDate, varietyId);

  // Region determination for ENFEN
  const regionType: 'Costa' | 'Sierra' | 'Sierra_Sur' = location.includes('Barranca')
    ? 'Costa'
    : location.includes('Andahuaylas') || location.includes('Puno')
    ? 'Sierra_Sur'
    : 'Sierra';

  // Base Forecast without ENFEN
  const rawForecast = calculateForecastForHarvest(varietyId, plantingDate, harvestWindow.avgHarvestDate, 1.0);

  // ENFEN Adjustment
  const enfenResult = calculateEnfenClimateAdjustment(
    rawForecast.forecastPrice,
    expectedYield,
    regionType,
    enfenScenario
  );

  const finalForecastPrice = enfenResult.adjustedPrice;
  const effectiveYield = enfenResult.adjustedYield;

  // Economic motor scenarios
  const economics = calculateEconomicScenarios({
    hectares,
    expectedYieldTonHa: effectiveYield,
    costPerHa,
    forecastPricePerKg: finalForecastPrice,
  });

  // Request AI explanation from server
  const handleGenerateAiExplanation = async () => {
    setIsExplaining(true);
    try {
      const response = await fetch('/api/gemini/explain-forecast', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          varietyName: variety.name,
          location,
          plantingDate,
          harvestWindow: `${harvestWindow.minHarvestDate} a ${harvestWindow.maxHarvestDate} (promedio ${harvestWindow.avgHarvestDate})`,
          forecastPrice: finalForecastPrice,
          rangeMin: Number((finalForecastPrice * 0.88).toFixed(2)),
          rangeMax: Number((finalForecastPrice * 1.14).toFixed(2)),
          adversePrice: economics.adverseScenario.price,
          favorablePrice: economics.favorableScenario.price,
          hectares,
          expectedYield: effectiveYield,
          costPerHa,
          netMargin: economics.centralScenario.netMargin,
          roiPct: economics.centralScenario.roiPct,
          championModel: 'LightGBM / HistGradientBoosting',
          mape: 7.4,
          enfenScenario,
          enfenNote: enfenResult.riskNote,
        }),
      });

      if (!response.ok) throw new Error('Error en API');
      const data = await response.json();
      setAiExplanation(data.explanation);
    } catch (err) {
      // Offline fallback explanation
      setAiExplanation(
        `Para una siembra de ${variety.name} (${variety.officialMidagriName}) en ${location} con fecha ${plantingDate}, el ciclo agronómico de INIA (${variety.cycleMinDays}-${variety.cycleMaxDays} días) proyecta cosecha entre ${harvestWindow.minHarvestDate} y ${harvestWindow.maxHarvestDate} (mes de ${rawForecast.monthName}).\n\n` +
        `Bajo el reporte oficial de ENFEN ("${enfenScenario.toUpperCase()}"), ${enfenResult.riskNote} Por este motivo, el precio central estimado se proyecta en S/ ${finalForecastPrice.toFixed(2)} /kg con un rendimiento ajustado de ${effectiveYield} t/ha.\n\n` +
        `Bajo tu inversión de S/ ${costPerHa.toLocaleString()} /ha, tu precio de equilibrio es de S/ ${economics.breakEvenPrice} /kg. Con un margen neto central esperado de S/ ${economics.centralScenario.netMargin.toLocaleString()} (ROI ${economics.centralScenario.roiPct}%), cuentas con un margen de seguridad frente a caídas de mercado. Como siempre en AgroDecide: te mostramos la evidencia, tú tomas la decisión.`
      );
    } finally {
      setIsExplaining(false);
    }
  };

  return (
    <div className="space-y-8 pb-12">
      {/* View Header */}
      <div className="bg-white rounded-3xl p-6 sm:p-8 border border-slate-200 shadow-sm flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-emerald-50 text-emerald-800 text-xs font-bold border border-emerald-200 mb-2">
            <CalendarDays className="w-3.5 h-3.5" />
            Simulador de Siembra — Camino A
          </div>
          <h1 className="text-2xl sm:text-3xl font-extrabold text-slate-900">
            ¿Cuándo y cuánto cosecharás si siembras hoy?
          </h1>
          <p className="text-xs sm:text-sm text-slate-500 max-w-2xl mt-1">
            Configura tus parámetros agronómicos. El motor calcula el ciclo fenológico oficial de INIA, consulta el pronóstico econométrico para la ventana de cosecha y simula tus márgenes netos.
          </p>
        </div>

        <div className="flex items-center gap-2 p-3 bg-slate-50 rounded-2xl border border-slate-200 text-xs">
          <span className="w-2.5 h-2.5 rounded-full bg-[#20C77A] animate-pulse" />
          <span className="text-slate-600 font-medium">
            Champion Model: <strong>LightGBM (MAPE 7.4%)</strong>
          </span>
        </div>
      </div>

      {/* Inputs Form and Agronomic Cycle Result */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Left Column: Form Inputs */}
        <div className="lg:col-span-5 bg-white rounded-3xl p-6 border border-slate-200 shadow-sm space-y-4">
          <h2 className="text-base font-bold text-slate-900 flex items-center gap-2 border-b border-slate-100 pb-3">
            <CalendarDays className="w-4 h-4 text-emerald-700" />
            Parámetros de tu Parcela
          </h2>

          {/* Variedad */}
          <div className="space-y-1">
            <label className="text-xs font-bold text-slate-700">Variedad de Papa (INIA)</label>
            <select
              value={varietyId}
              onChange={(e) => {
                setVarietyId(e.target.value);
                const found = VARIETIES_CATALOG.find((v) => v.id === e.target.value);
                if (found) setExpectedYield(found.avgYield);
              }}
              className="w-full px-3 py-2.5 rounded-xl border border-slate-300 text-xs font-medium focus:ring-2 focus:ring-[#20C77A] focus:outline-none bg-slate-50"
            >
              {VARIETIES_CATALOG.map((v) => (
                <option key={v.id} value={v.id}>
                  {v.name} ({v.commercialName}) — {v.cycleAvgDays} días
                </option>
              ))}
            </select>
            <p className="text-[11px] text-slate-400">{variety.description}</p>
          </div>

          {/* Ubicación */}
          <div className="space-y-1">
            <label className="text-xs font-bold text-slate-700">Ubicación / Origen</label>
            <select
              value={location}
              onChange={(e) => setLocation(e.target.value)}
              className="w-full px-3 py-2.5 rounded-xl border border-slate-300 text-xs font-medium focus:ring-2 focus:ring-[#20C77A] focus:outline-none bg-slate-50"
            >
              <option value="Tarma, Junín (Valle del Mantaro)">Tarma, Junín (Valle del Mantaro) — 3,050 msnm</option>
              <option value="Huancayo / Concepción, Junín">Huancayo / Concepción, Junín — 3,250 msnm</option>
              <option value="Valle del Huallaga, Huánuco">Valle del Huallaga, Huánuco — 2,800 msnm</option>
              <option value="Cerro de Pasco / Paucartambo">Cerro de Pasco / Paucartambo — 3,600 msnm</option>
              <option value="Andahuaylas, Apurímac">Andahuaylas, Apurímac — 2,980 msnm</option>
              <option value="Barranca / Huaral (Costa Norte Lima)">Barranca / Huaral (Costa Norte Lima) — 150 msnm</option>
            </select>
          </div>

          {/* Fecha de Siembra */}
          <div className="space-y-1">
            <label className="text-xs font-bold text-slate-700">Fecha Prevista de Siembra</label>
            <input
              type="date"
              value={plantingDate}
              onChange={(e) => setPlantingDate(e.target.value)}
              className="w-full px-3 py-2 rounded-xl border border-slate-300 text-xs font-semibold focus:ring-2 focus:ring-[#20C77A] focus:outline-none bg-slate-50"
            />
          </div>

          {/* Hectáreas y Rendimiento */}
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1">
              <label className="text-xs font-bold text-slate-700">Área (Hectáreas)</label>
              <input
                type="number"
                step="0.5"
                min="0.5"
                max="50"
                value={hectares}
                onChange={(e) => setHectares(Number(e.target.value) || 1)}
                className="w-full px-3 py-2 rounded-xl border border-slate-300 text-xs font-bold focus:ring-2 focus:ring-[#20C77A] focus:outline-none bg-slate-50"
              />
            </div>

            <div className="space-y-1">
              <label className="text-xs font-bold text-slate-700">Rendimiento (t/ha)</label>
              <input
                type="number"
                step="0.5"
                min="5"
                max="45"
                value={expectedYield}
                onChange={(e) => setExpectedYield(Number(e.target.value) || 20)}
                className="w-full px-3 py-2 rounded-xl border border-slate-300 text-xs font-bold focus:ring-2 focus:ring-[#20C77A] focus:outline-none bg-slate-50"
              />
            </div>
          </div>

          {/* Costo de Producción por Hectárea */}
          <div className="space-y-1">
            <div className="flex items-center justify-between">
              <label className="text-xs font-bold text-slate-700">Costo Inversión por Hectárea</label>
              <span className="text-[11px] text-slate-500 font-mono">Total: S/ {(costPerHa * hectares).toLocaleString()}</span>
            </div>
            <div className="relative">
              <span className="absolute left-3 top-2 text-xs font-bold text-slate-400">S/</span>
              <input
                type="number"
                step="500"
                min="8000"
                max="40000"
                value={costPerHa}
                onChange={(e) => setCostPerHa(Number(e.target.value) || 15000)}
                className="w-full pl-8 pr-3 py-2 rounded-xl border border-slate-300 text-xs font-bold focus:ring-2 focus:ring-[#20C77A] focus:outline-none bg-slate-50"
              />
            </div>
            <p className="text-[10px] text-slate-400">
              Semilla certificada, jornales, fertilizantes, pesticidas y maquinaria.
            </p>
          </div>

          {/* Escenario Climático ENFEN & SENAMHI */}
          <div className="space-y-1.5 pt-2 border-t border-slate-100">
            <div className="flex items-center justify-between">
              <label className="text-xs font-bold text-slate-700 flex items-center gap-1.5">
                <Waves className="w-3.5 h-3.5 text-sky-600" />
                Escenario Climático ENFEN
              </label>
              <span className="text-[10px] text-sky-800 font-bold bg-sky-100 px-2 py-0.5 rounded-full border border-sky-300">
                Oficial
              </span>
            </div>
            <select
              value={enfenScenario}
              onChange={(e) => setEnfenScenario(e.target.value as any)}
              className="w-full px-3 py-2 rounded-xl border border-slate-300 text-xs font-medium focus:ring-2 focus:ring-sky-500 focus:outline-none bg-sky-50/50 text-slate-800"
            >
              <option value="vigilancia">Vigilancia ENFEN (Vigente / Primavera 2026)</option>
              <option value="neutral">Condición Neutra (Sin anomalía ENSO)</option>
              <option value="nino_debil">El Niño Débil (+1.5°C TSM / Veranillos andinos)</option>
              <option value="nino_moderado_fuerte">El Niño Moderado/Fuerte (Lluvias costa / Sequía sur)</option>
            </select>
            <p className="text-[11px] text-sky-900 bg-sky-50 p-2 rounded-xl border border-sky-200">
              {enfenResult.riskNote}
            </p>
          </div>
        </div>

        {/* Right Column: Agronomic Result & Forecast Window */}
        <div className="lg:col-span-7 space-y-4">
          {/* Agronomic Card */}
          <div className="bg-gradient-to-br from-[#0B3025] to-[#124234] text-white rounded-3xl p-6 sm:p-7 shadow-lg space-y-4">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold uppercase tracking-wider text-[#B7F36B] bg-[#20C77A]/20 px-2.5 py-1 rounded-full border border-[#20C77A]/40">
                Fenología INIA: {variety.name}
              </span>
              <span className="text-xs font-mono text-slate-300">
                Ciclo: {variety.cycleMinDays} - {variety.cycleMaxDays} días
              </span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-2">
              <div>
                <span className="text-xs text-slate-300 block">Ventana Estimada de Cosecha</span>
                <div className="text-xl sm:text-2xl font-black text-[#B7F36B] mt-0.5">
                  {harvestWindow.minHarvestDate} <br />
                  <span className="text-xs font-normal text-white">al</span> {harvestWindow.maxHarvestDate}
                </div>
                <p className="text-xs text-slate-300 mt-1">
                  Fecha central: <strong>{harvestWindow.avgHarvestDate}</strong> ({rawForecast.monthName})
                </p>
              </div>

              <div className="bg-white/10 rounded-2xl p-4 border border-white/15 space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-xs text-slate-200 block font-semibold">
                    Pronóstico de Precio GMML
                  </span>
                  {enfenScenario !== 'neutral' && (
                    <span className="text-[10px] bg-amber-400 text-slate-950 font-bold px-1.5 py-0.5 rounded">
                      Ajuste ENFEN
                    </span>
                  )}
                </div>
                <div className="text-3xl font-black text-white">
                  S/ {finalForecastPrice.toFixed(2)} <span className="text-xs font-normal text-slate-300">/kg</span>
                </div>
                <div className="text-xs text-[#B7F36B] font-mono">
                  Rango Probable: S/ {(finalForecastPrice * 0.88).toFixed(2)} – S/ {(finalForecastPrice * 1.14).toFixed(2)}
                </div>
                <p className="text-[11px] text-slate-300">
                  {rawForecast.seasonalTrend}
                </p>
              </div>
            </div>

            {/* Break-even Price */}
            <div className="p-3 bg-black/25 rounded-xl border border-white/10 flex items-center justify-between text-xs">
              <span className="flex items-center gap-1.5 text-slate-200">
                <Scale className="w-4 h-4 text-[#20C77A]" />
                Precio de Equilibrio (Break-even):
              </span>
              <span className="font-mono font-bold text-white text-sm">
                S/ {economics.breakEvenPrice.toFixed(2)} /kg
              </span>
            </div>
          </div>

          {/* Key Determinant Factors */}
          <div className="bg-white rounded-3xl p-6 border border-slate-200 shadow-sm space-y-3">
            <h3 className="text-xs font-bold uppercase tracking-wider text-slate-500">
              Factores que explican este pronóstico
            </h3>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-xs">
              <div className="p-3 rounded-xl bg-slate-50 border border-slate-200 space-y-1">
                <span className="font-bold text-slate-900 block">1. Estacionalidad GMML</span>
                <p className="text-slate-500 text-[11px]">
                  En {rawForecast.monthName}, la oferta de papa en Lima entra en etapa de {rawForecast.seasonalTrend.toLowerCase()}.
                </p>
              </div>

              <div className="p-3 rounded-xl bg-slate-50 border border-slate-200 space-y-1">
                <span className="font-bold text-slate-900 block">2. Alerta ENFEN / Clima</span>
                <p className="text-slate-500 text-[11px]">
                  {enfenResult.riskNote}
                </p>
              </div>

              <div className="p-3 rounded-xl bg-slate-50 border border-slate-200 space-y-1">
                <span className="font-bold text-slate-900 block">3. Insumos & BCRP</span>
                <p className="text-slate-500 text-[11px]">
                  Índice de Diésel y tipo de cambio estables mantienen flete Tarma-Lima en S/ 120/t.
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* 3 Scenarios Financial Table */}
      <div className="bg-white rounded-3xl p-6 sm:p-8 border border-slate-200 shadow-sm space-y-4">
        <div>
          <span className="text-xs font-bold uppercase tracking-wider text-emerald-700">
            Sensibilidad Económica
          </span>
          <h2 className="text-xl font-bold text-slate-900 mt-0.5">
            Escenarios de Ingreso, Costo y Margen Neto
          </h2>
          <p className="text-xs text-slate-500">
            Fórmulas transparentes: Producción = ha × t/ha × 1,000 kg. Margen Neto = Ingreso Bruto − Inversión.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 pt-2">
          {/* Adverso */}
          <div className="p-5 rounded-2xl border border-red-200 bg-red-50/40 space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-xs font-extrabold uppercase text-red-700 bg-red-100 px-2 py-0.5 rounded">
                Escenario Adverso (P10)
              </span>
              <span className="text-xs font-bold text-red-900">
                S/ {economics.adverseScenario.price.toFixed(2)} /kg
              </span>
            </div>

            <div className="space-y-1.5 text-xs text-slate-700 font-mono">
              <div className="flex justify-between">
                <span>Rendimiento:</span>
                <strong className="text-slate-900">{economics.adverseScenario.yieldTonHa} t/ha</strong>
              </div>
              <div className="flex justify-between">
                <span>Cosecha Total:</span>
                <strong className="text-slate-900">{economics.adverseScenario.kilosTotal.toLocaleString()} kg</strong>
              </div>
              <div className="flex justify-between">
                <span>Ingreso Bruto:</span>
                <strong className="text-slate-900">S/ {economics.adverseScenario.grossIncome.toLocaleString()}</strong>
              </div>
              <div className="flex justify-between">
                <span>Costo Inversión:</span>
                <strong className="text-slate-900">S/ {economics.adverseScenario.totalCost.toLocaleString()}</strong>
              </div>
            </div>

            <div className="pt-2 border-t border-red-200 flex items-center justify-between">
              <span className="text-xs font-bold text-red-900">Margen Neto:</span>
              <span className={`text-base font-black ${economics.adverseScenario.netMargin >= 0 ? 'text-emerald-700' : 'text-red-700'}`}>
                S/ {economics.adverseScenario.netMargin.toLocaleString()} ({economics.adverseScenario.roiPct}%)
              </span>
            </div>
          </div>

          {/* Central */}
          <div className="p-5 rounded-2xl border-2 border-[#20C77A] bg-emerald-50/50 space-y-3 relative shadow-md">
            <div className="absolute -top-3 left-1/2 -translate-x-1/2 bg-[#0B3025] text-[#B7F36B] px-3 py-0.5 rounded-full text-[10px] font-extrabold uppercase tracking-wider">
              Caso Más Probable
            </div>

            <div className="flex items-center justify-between pt-1">
              <span className="text-xs font-extrabold uppercase text-emerald-900 bg-emerald-100 px-2 py-0.5 rounded">
                Escenario Central (P50)
              </span>
              <span className="text-base font-black text-emerald-900">
                S/ {economics.centralScenario.price.toFixed(2)} /kg
              </span>
            </div>

            <div className="space-y-1.5 text-xs text-slate-700 font-mono">
              <div className="flex justify-between">
                <span>Rendimiento:</span>
                <strong className="text-slate-900">{economics.centralScenario.yieldTonHa} t/ha</strong>
              </div>
              <div className="flex justify-between">
                <span>Cosecha Total:</span>
                <strong className="text-slate-900">{economics.centralScenario.kilosTotal.toLocaleString()} kg</strong>
              </div>
              <div className="flex justify-between">
                <span>Ingreso Bruto:</span>
                <strong className="text-slate-900">S/ {economics.centralScenario.grossIncome.toLocaleString()}</strong>
              </div>
              <div className="flex justify-between">
                <span>Costo Inversión:</span>
                <strong className="text-slate-900">S/ {economics.centralScenario.totalCost.toLocaleString()}</strong>
              </div>
            </div>

            <div className="pt-2 border-t border-emerald-300 flex items-center justify-between">
              <span className="text-xs font-bold text-emerald-950">Margen Neto:</span>
              <span className="text-lg font-black text-emerald-800">
                S/ {economics.centralScenario.netMargin.toLocaleString()} (+{economics.centralScenario.roiPct}%)
              </span>
            </div>
          </div>

          {/* Favorable */}
          <div className="p-5 rounded-2xl border border-blue-200 bg-blue-50/40 space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-xs font-extrabold uppercase text-blue-800 bg-blue-100 px-2 py-0.5 rounded">
                Escenario Favorable (P90)
              </span>
              <span className="text-xs font-bold text-blue-900">
                S/ {economics.favorableScenario.price.toFixed(2)} /kg
              </span>
            </div>

            <div className="space-y-1.5 text-xs text-slate-700 font-mono">
              <div className="flex justify-between">
                <span>Rendimiento:</span>
                <strong className="text-slate-900">{economics.favorableScenario.yieldTonHa} t/ha</strong>
              </div>
              <div className="flex justify-between">
                <span>Cosecha Total:</span>
                <strong className="text-slate-900">{economics.favorableScenario.kilosTotal.toLocaleString()} kg</strong>
              </div>
              <div className="flex justify-between">
                <span>Ingreso Bruto:</span>
                <strong className="text-slate-900">S/ {economics.favorableScenario.grossIncome.toLocaleString()}</strong>
              </div>
              <div className="flex justify-between">
                <span>Costo Inversión:</span>
                <strong className="text-slate-900">S/ {economics.favorableScenario.totalCost.toLocaleString()}</strong>
              </div>
            </div>

            <div className="pt-2 border-t border-blue-200 flex items-center justify-between">
              <span className="text-xs font-bold text-blue-950">Margen Neto:</span>
              <span className="text-base font-black text-blue-800">
                S/ {economics.favorableScenario.netMargin.toLocaleString()} (+{economics.favorableScenario.roiPct}%)
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* AI Generative Explanation Card */}
      <div className="bg-gradient-to-br from-[#F7FAF7] to-[#EBF3ED] rounded-3xl p-6 sm:p-8 border border-[#20C77A]/30 shadow-sm space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-xl bg-emerald-800 text-[#B7F36B] flex items-center justify-center">
              <Sparkles className="w-4 h-4" />
            </div>
            <div>
              <h3 className="text-base font-bold text-slate-900">
                Explicación Simple con Inteligencia Artificial (Gemini AI)
              </h3>
              <p className="text-xs text-slate-500">
                Traduce el forecast econométrico a recomendaciones directas para la toma de decisión del productor.
              </p>
            </div>
          </div>

          <button
            onClick={handleGenerateAiExplanation}
            disabled={isExplaining}
            className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-emerald-800 hover:bg-emerald-900 text-white font-bold text-xs shadow-md transition-all cursor-pointer shrink-0"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${isExplaining ? 'animate-spin' : ''}`} />
            <span>{isExplaining ? 'Generando análisis...' : 'Explicar Pronóstico con IA'}</span>
          </button>
        </div>

        {aiExplanation ? (
          <div className="bg-white p-5 rounded-2xl border border-emerald-200 text-xs text-slate-700 leading-relaxed space-y-2 whitespace-pre-line shadow-sm">
            {aiExplanation}
          </div>
        ) : (
          <div className="p-4 rounded-xl bg-white/70 border border-slate-200 text-xs text-slate-500 flex items-center justify-between">
            <span>Haz clic en "Explicar Pronóstico con IA" para recibir el desglose contextualizado de tu siembra en lenguaje directo.</span>
            <button
              onClick={handleGenerateAiExplanation}
              className="text-emerald-700 font-bold hover:underline cursor-pointer"
            >
              Generar ahora
            </button>
          </div>
        )}
      </div>
    </div>
  );
};
