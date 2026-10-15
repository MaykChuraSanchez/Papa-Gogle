import React, { useState } from 'react';
import {
  BENCHMARK_MODELS,
  BCRP_MACRO_INDICATORS,
  FEATURE_IMPORTANCE_LIST,
  VARIABLE_CATALOG,
  MODEL_DOCUMENTATION,
  calculatePearsonCorrelation,
  calculateSensitivityStressTest,
  getMonthName,
} from '../../utils/forecastingEngine';
import { HISTORICAL_PRICES } from '../../data/seedData';
import { ModelMetric } from '../../types/agro';
import {
  Cpu,
  Trophy,
  Activity,
  Layers,
  LineChart,
  CheckCircle2,
  AlertTriangle,
  Info,
  ExternalLink,
  ShieldCheck,
  TrendingUp,
  Sparkles,
  Sliders,
  Scale,
  RefreshCw,
  BarChart2,
  ArrowRight,
  Database,
  Calendar,
  Zap,
} from 'lucide-react';

type LabSubTab = 'explorer' | 'arena' | 'importance' | 'sensitivity';

export const ModelLabView: React.FC = () => {
  const [activeTab, setActiveTab] = useState<LabSubTab>('explorer');

  // SubTab 1: Variable Explorer state
  const [var1Key, setVar1Key] = useState<string>('canchán');
  const [var2Key, setVar2Key] = useState<string>('enfenAnomalyTSM');

  // SubTab 2: Arena & Backtesting state
  const [selectedModel, setSelectedModel] = useState<ModelMetric>(BENCHMARK_MODELS[0]);
  const [backtestHorizon, setBacktestHorizon] = useState<'30d' | '60d' | '120d'>('60d');

  // SubTab 4: What-If Sensitivity Simulator state
  const [simVariety, setSimVariety] = useState<string>('canchan');
  const [simBasePrice, setSimBasePrice] = useState<number>(1.48);
  const [simMonth, setSimMonth] = useState<number>(2); // February default
  const [simEnfenAnomaly, setSimEnfenAnomaly] = useState<number>(1.0); // +1.0 °C
  const [simDieselShock, setSimDieselShock] = useState<number>(10); // +10%
  const [simVolumeShock, setSimVolumeShock] = useState<number>(-15); // -15% supply restriction

  // Prepare series data for Explorer
  const metaVar1 = VARIABLE_CATALOG.find((v) => v.key === var1Key) || VARIABLE_CATALOG[0];
  const metaVar2 = VARIABLE_CATALOG.find((v) => v.key === var2Key) || VARIABLE_CATALOG[17];

  const series1 = HISTORICAL_PRICES.map((p) => (p[var1Key as keyof typeof p] as number) || 0);
  const series2 = HISTORICAL_PRICES.map((p) => (p[var2Key as keyof typeof p] as number) || 0);

  const pearsonR = calculatePearsonCorrelation(series1, series2);

  const minV1 = Math.min(...series1);
  const maxV1 = Math.max(...series1);
  const minV2 = Math.min(...series2);
  const maxV2 = Math.max(...series2);

  // Backtest series for selected model
  const backtestModelPredKey =
    selectedModel.id === 'gradient_boosting'
      ? 'predictedLightGBM'
      : selectedModel.id === 'sarimax'
      ? 'predictedSARIMAX'
      : selectedModel.id === 'holt_winters'
      ? 'predictedHoltWinters'
      : selectedModel.id === 'ridge'
      ? 'predictedRidge'
      : 'predictedLightGBM';

  const backtestData = HISTORICAL_PRICES.map((p) => {
    const actual = p.canchán;
    const pred = (p[backtestModelPredKey as keyof typeof p] as number) || actual;
    const residual = Number((actual - pred).toFixed(2));
    return {
      date: p.date,
      actual,
      pred,
      residual,
    };
  });

  // Calculate stress test result
  const sensitivityResult = calculateSensitivityStressTest({
    basePrice: simBasePrice,
    varietyId: simVariety,
    targetMonth: simMonth,
    enfenAnomaly: simEnfenAnomaly,
    dieselShockPct: simDieselShock,
    volumeShockPct: simVolumeShock,
  });

  return (
    <div className="space-y-8 pb-12 animate-fadeIn">
      {/* Header Banner */}
      <div className="bg-gradient-to-r from-[#0B3025] via-[#124234] to-[#0A261E] rounded-3xl p-6 sm:p-8 text-white border border-[#1A4537] shadow-xl relative overflow-hidden">
        <div className="absolute top-0 right-0 w-96 h-96 bg-[#20C77A]/10 rounded-full blur-3xl pointer-events-none -mr-20 -mt-20"></div>

        <div className="relative z-10 flex flex-col lg:flex-row lg:items-center justify-between gap-6">
          <div className="space-y-3 max-w-3xl">
            <div className="flex flex-wrap items-center gap-2">
              <span className="px-3 py-1 rounded-full text-xs font-bold uppercase tracking-wider bg-[#20C77A]/20 text-[#B7F36B] border border-[#20C77A]/40 flex items-center gap-1.5">
                <Cpu className="w-3.5 h-3.5" />
                Laboratorio Cuantitativo & Econometría
              </span>
              <span className="px-3 py-1 rounded-full text-xs font-semibold bg-white/10 text-slate-200 border border-white/20">
                Walk-Forward Backtesting • Macro BCRP • El Niño ENFEN
              </span>
            </div>

            <h1 className="text-2xl sm:text-4xl font-extrabold tracking-tight">
              Model Lab: <span className="text-[#B7F36B]">Histórico, Algoritmos & Backtesting</span>
            </h1>

            <p className="text-slate-300 text-sm sm:text-base leading-relaxed">
              Auditoría abierta y transparente de los modelos predictivos. Explora el histórico de cada variable,
              evalúa el rendimiento en backtesting fuera de muestra (out-of-sample) y simula el impacto de shocks
              macroeconómicos y climáticos en tiempo real.
            </p>
          </div>

          <div className="bg-black/25 p-4 rounded-2xl border border-white/10 text-right shrink-0">
            <div className="text-xs text-slate-400">Modelo Campeón en Producción</div>
            <div className="text-xl sm:text-2xl font-extrabold text-[#B7F36B] mt-0.5">LightGBM (HistGradient)</div>
            <div className="text-xs text-slate-300 mt-1 flex items-center justify-end gap-2">
              <span>MAE: <strong>0.11 S/kg</strong></span>
              <span>•</span>
              <span className="text-emerald-400">MAPE: <strong>7.4%</strong></span>
            </div>
          </div>
        </div>

        {/* 4 Interactive SubTabs Selector */}
        <div className="flex flex-wrap gap-2 mt-6 pt-6 border-t border-white/10">
          {[
            { id: 'explorer', label: '1. Histórico Multivariable & Correlaciones', icon: <LineChart className="w-4 h-4" /> },
            { id: 'arena', label: '2. Arena de Modelos & Backtesting Real vs Pred', icon: <Trophy className="w-4 h-4" /> },
            { id: 'importance', label: '3. Descomposición SHAP & Factores Macro/Clima', icon: <Layers className="w-4 h-4" /> },
            { id: 'sensitivity', label: '4. Simulador What-If de Sensibilidad en Vivo', icon: <Sliders className="w-4 h-4" /> },
          ].map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id as LabSubTab)}
              className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs sm:text-sm font-bold transition-all cursor-pointer ${
                activeTab === tab.id
                  ? 'bg-[#20C77A] text-[#07241C] shadow-md font-extrabold'
                  : 'bg-white/10 text-slate-200 hover:bg-white/15 hover:text-white'
              }`}
            >
              {tab.icon}
              <span>{tab.label}</span>
            </button>
          ))}
        </div>
      </div>

      {/* ========================================================================= */}
      {/* SUBTAB 1: VARIABLE EXPLORER & DUAL-AXIS TIME SERIES                      */}
      {/* ========================================================================= */}
      {activeTab === 'explorer' && (
        <div className="space-y-6">
          <div className="bg-white rounded-3xl p-6 sm:p-8 border border-slate-200 shadow-sm space-y-6">
            <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 border-b border-slate-100 pb-5">
              <div>
                <h2 className="text-xl font-bold text-slate-900 flex items-center gap-2">
                  <LineChart className="w-5 h-5 text-[#0B3025]" />
                  Explorador Histórico de Variables (2024 - 2026)
                </h2>
                <p className="text-xs text-slate-500 mt-0.5">
                  Selecciona dos variables para contrastar sus curvas en doble eje y analizar su covarianza y correlación estadística.
                </p>
              </div>

              {/* Variable Selectors */}
              <div className="flex flex-wrap items-center gap-3">
                <div className="space-y-1">
                  <label className="text-[11px] font-bold text-slate-500 block uppercase">Variable 1 (Eje Verde):</label>
                  <select
                    value={var1Key}
                    onChange={(e) => setVar1Key(e.target.value)}
                    className="text-xs font-semibold bg-emerald-50 text-emerald-950 border border-emerald-300 rounded-xl px-3 py-2 focus:ring-2 focus:ring-[#20C77A] focus:outline-none"
                  >
                    {VARIABLE_CATALOG.map((v) => (
                      <option key={v.key} value={v.key}>
                        {v.label}
                      </option>
                    ))}
                  </select>
                </div>

                <div className="space-y-1">
                  <label className="text-[11px] font-bold text-slate-500 block uppercase">Variable 2 (Eje Ámbar):</label>
                  <select
                    value={var2Key}
                    onChange={(e) => setVar2Key(e.target.value)}
                    className="text-xs font-semibold bg-amber-50 text-amber-950 border border-amber-300 rounded-xl px-3 py-2 focus:ring-2 focus:ring-amber-500 focus:outline-none"
                  >
                    {VARIABLE_CATALOG.map((v) => (
                      <option key={v.key} value={v.key}>
                        {v.label}
                      </option>
                    ))}
                  </select>
                </div>
              </div>
            </div>

            {/* Correlation Badge & Econometric Insight */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="bg-slate-50 p-4 rounded-2xl border border-slate-200">
                <div className="text-[11px] text-slate-500 uppercase font-bold">Coeficiente Pearson (r)</div>
                <div className="text-2xl font-black text-[#0B3025] mt-1 flex items-center gap-2">
                  {pearsonR > 0 ? `+${pearsonR}` : pearsonR}
                  <span className={`text-xs px-2 py-0.5 rounded-full font-bold ${
                    Math.abs(pearsonR) > 0.5 ? 'bg-emerald-100 text-emerald-800' : 'bg-slate-200 text-slate-700'
                  }`}>
                    {Math.abs(pearsonR) > 0.6 ? 'Correlación Fuerte' : Math.abs(pearsonR) > 0.3 ? 'Correlación Moderada' : 'Correlación Débil'}
                  </span>
                </div>
                <div className="text-[11px] text-slate-400 mt-1">Calculado sobre 22 periodos mensuales</div>
              </div>

              <div className="bg-slate-50 p-4 rounded-2xl border border-slate-200 md:col-span-2">
                <div className="text-[11px] text-slate-500 uppercase font-bold">Interpretación Económica del Modelo</div>
                <p className="text-xs text-slate-700 mt-1.5 leading-relaxed">
                  {pearsonR > 0.3 ? (
                    <>Existe una <strong>relación positiva directa</strong>: a medida que sube <span className="text-amber-700 font-semibold">{metaVar2.label}</span>, tiende a incrementarse <span className="text-emerald-700 font-semibold">{metaVar1.label}</span>. El modelo de machine learning utiliza este patrón como señal predictiva rezagada.</>
                  ) : pearsonR < -0.3 ? (
                    <>Existe una <strong>relación inversa negativa</strong>: incrementos en <span className="text-amber-700 font-semibold">{metaVar2.label}</span> coinciden con contracciones en <span className="text-emerald-700 font-semibold">{metaVar1.label}</span> (típico efecto de sobreoferta de volumen en época de cosecha).</>
                  ) : (
                    <>La correlación lineal contemporánea es baja ({pearsonR}), lo que indica que el algoritmo debe evaluar rezagos temporales (lag 30d/60d) o no linealidades mediante árboles de decisión.</>
                  )}
                </p>
              </div>
            </div>

            {/* Dual-Axis SVG Time Series Chart */}
            <div className="space-y-2">
              <div className="flex items-center justify-between text-xs font-semibold text-slate-600 px-1">
                <span className="flex items-center gap-1.5 text-emerald-700">
                  <span className="w-3 h-3 rounded-full bg-[#20C77A]"></span>
                  {metaVar1.label} ({metaVar1.unit})
                </span>
                <span className="flex items-center gap-1.5 text-amber-700">
                  <span className="w-3 h-3 rounded-full bg-amber-500"></span>
                  {metaVar2.label} ({metaVar2.unit})
                </span>
              </div>

              <div className="bg-slate-950 rounded-2xl p-5 text-white shadow-inner">
                <div className="h-56 w-full relative">
                  <svg className="w-full h-full overflow-visible" preserveAspectRatio="none" viewBox="0 0 100 100">
                    {/* Horizontal grid */}
                    {[0, 25, 50, 75, 100].map((y) => (
                      <line key={y} x1="0" y1={y} x2="100" y2={y} stroke="#1E293B" strokeDasharray="2,2" strokeWidth="0.5" />
                    ))}

                    {/* Series 2 (Amber) */}
                    <polyline
                      fill="none"
                      stroke="#F59E0B"
                      strokeWidth="2"
                      strokeDasharray="3,3"
                      points={series2
                        .map((val, i) => {
                          const x = (i / (series2.length - 1)) * 100;
                          const range = maxV2 - minV2 || 1;
                          const y = 100 - ((val - minV2) / range) * 90 - 5;
                          return `${x},${y}`;
                        })
                        .join(' ')}
                    />

                    {/* Series 1 (Emerald) */}
                    <polyline
                      fill="none"
                      stroke="#20C77A"
                      strokeWidth="3"
                      points={series1
                        .map((val, i) => {
                          const x = (i / (series1.length - 1)) * 100;
                          const range = maxV1 - minV1 || 1;
                          const y = 100 - ((val - minV1) / range) * 90 - 5;
                          return `${x},${y}`;
                        })
                        .join(' ')}
                    />

                    {/* Points on Series 1 */}
                    {series1.map((val, i) => {
                      const x = (i / (series1.length - 1)) * 100;
                      const range = maxV1 - minV1 || 1;
                      const y = 100 - ((val - minV1) / range) * 90 - 5;
                      return <circle key={i} cx={x} cy={y} r="2" fill="#B7F36B" stroke="#0B3025" strokeWidth="1" />;
                    })}
                  </svg>
                </div>

                <div className="flex justify-between text-[11px] text-slate-400 mt-4 pt-2 border-t border-slate-800 font-mono">
                  {HISTORICAL_PRICES.filter((_, idx) => idx % 3 === 0 || idx === HISTORICAL_PRICES.length - 1).map((p, i) => (
                    <span key={i} className={i === 0 ? '' : 'text-slate-300'}>
                      {p.date.slice(0, 7)}
                    </span>
                  ))}
                </div>
              </div>
            </div>

            {/* Variable Metadata Footnote */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs pt-2">
              <div className="p-3 bg-slate-50 rounded-xl border border-slate-100">
                <span className="font-bold text-slate-900">{metaVar1.label}: </span>
                <span className="text-slate-600">{metaVar1.description}</span>
                <div className="text-[10px] text-slate-400 mt-1">Fuente: {metaVar1.source}</div>
              </div>
              <div className="p-3 bg-slate-50 rounded-xl border border-slate-100">
                <span className="font-bold text-slate-900">{metaVar2.label}: </span>
                <span className="text-slate-600">{metaVar2.description}</span>
                <div className="text-[10px] text-slate-400 mt-1">Fuente: {metaVar2.source}</div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* SUBTAB 2: MODEL ARENA & WALK-FORWARD BACKTESTING                         */}
      {/* ========================================================================= */}
      {activeTab === 'arena' && (
        <div className="space-y-6">
          {/* Leaderboard */}
          <div className="bg-white rounded-3xl p-6 sm:p-8 border border-slate-200 shadow-sm space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-slate-100 pb-4">
              <div>
                <h2 className="text-xl font-bold text-slate-900 flex items-center gap-2">
                  <Trophy className="w-5 h-5 text-amber-500" />
                  Model Arena: Resultados del Walk-Forward Backtesting
                </h2>
                <p className="text-xs text-slate-500">
                  Entrenamiento con ventana rodante temporal para evitar filtración de futuro (no data leakage). Menor MAE/WAPE indica superioridad.
                </p>
              </div>

              <div className="flex items-center gap-2 bg-slate-100 p-1.5 rounded-xl">
                <span className="text-xs font-bold text-slate-500 px-2">Horizonte:</span>
                {(['30d', '60d', '120d'] as const).map((h) => (
                  <button
                    key={h}
                    onClick={() => setBacktestHorizon(h)}
                    className={`px-3 py-1 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                      backtestHorizon === h ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-600 hover:text-slate-900'
                    }`}
                  >
                    {h === '30d' ? '30 días' : h === '60d' ? '60 días' : '120 días'}
                  </button>
                ))}
              </div>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse text-xs">
                <thead>
                  <tr className="bg-slate-50 text-slate-600 font-bold border-b border-slate-200">
                    <th className="py-3 px-4">Modelo / Algoritmo</th>
                    <th className="py-3 px-3">Categoría</th>
                    <th className="py-3 px-3">MAE (S/)</th>
                    <th className="py-3 px-3">RMSE (S/)</th>
                    <th className="py-3 px-3">MAPE (%)</th>
                    <th className="py-3 px-3">WAPE (%)</th>
                    <th className="py-3 px-3">Cobertura 95%</th>
                    <th className="py-3 px-4 text-right">Acción</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 text-slate-700 font-mono">
                  {BENCHMARK_MODELS.map((model) => {
                    const isSelected = selectedModel.id === model.id;
                    return (
                      <tr
                        key={model.id}
                        onClick={() => setSelectedModel(model)}
                        className={`cursor-pointer transition-colors ${
                          model.isChampion
                            ? 'bg-emerald-50/60 hover:bg-emerald-50'
                            : isSelected
                            ? 'bg-purple-50/60'
                            : 'hover:bg-slate-50'
                        }`}
                      >
                        <td className="py-3 px-4 font-bold text-slate-900 flex items-center gap-2">
                          {model.isChampion && (
                            <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-[#20C77A] text-[#07241C]">
                              CHAMPION
                            </span>
                          )}
                          <span>{model.name}</span>
                        </td>
                        <td className="py-3 px-3 font-sans text-slate-500">{model.category}</td>
                        <td className="py-3 px-3 font-bold text-slate-900">S/ {model.mae.toFixed(2)}</td>
                        <td className="py-3 px-3">S/ {model.rmse.toFixed(2)}</td>
                        <td className="py-3 px-3 font-semibold text-emerald-700">{model.mape.toFixed(1)}%</td>
                        <td className="py-3 px-3">{model.wape.toFixed(1)}%</td>
                        <td className="py-3 px-3">
                          <span className={`px-2 py-0.5 rounded text-[11px] font-bold ${
                            model.coverage95 >= 95 ? 'bg-emerald-100 text-emerald-800' : 'bg-slate-100 text-slate-600'
                          }`}>
                            {model.coverage95.toFixed(1)}%
                          </span>
                        </td>
                        <td className="py-3 px-4 text-right">
                          <button
                            onClick={() => setSelectedModel(model)}
                            className="text-xs text-[#128051] font-bold hover:underline"
                          >
                            Auditar
                          </button>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>

          {/* Detailed Algorithmic Sheet of Selected Model */}
          {(() => {
            const doc = MODEL_DOCUMENTATION[selectedModel.id] || MODEL_DOCUMENTATION.gradient_boosting;
            return (
              <div className="bg-white rounded-3xl p-6 sm:p-8 border border-slate-200 shadow-sm space-y-6">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-4 border-b border-slate-100">
                  <div>
                    <span className="text-xs font-bold uppercase tracking-wider text-purple-700 bg-purple-100 px-3 py-1 rounded-full">
                      Ficha Matemática & Algorítmica
                    </span>
                    <h3 className="text-2xl font-black text-slate-900 mt-2">
                      {selectedModel.name}
                    </h3>
                  </div>
                  <div className="text-right">
                    <span className="text-xs text-slate-500 block">Error Absoluto Medio (MAE)</span>
                    <span className="text-2xl font-extrabold text-[#0B3025]">S/ {selectedModel.mae.toFixed(2)}</span>
                  </div>
                </div>

                {/* Mathematical Equation Box */}
                <div className="bg-slate-900 text-emerald-300 p-4 rounded-2xl font-mono text-xs sm:text-sm overflow-x-auto border border-slate-800">
                  <div className="text-[10px] text-slate-400 mb-1 uppercase font-bold tracking-wider">Formulación Matemática:</div>
                  <code>{doc.formula}</code>
                </div>

                {/* How it works grid */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs">
                  <div className="p-4 bg-slate-50 rounded-2xl border border-slate-200 space-y-2">
                    <h4 className="font-bold text-slate-900 text-sm">Metodología de Ajuste</h4>
                    <p className="text-slate-600 leading-relaxed">{doc.methodology}</p>
                    <div className="pt-2 text-[11px] font-mono text-slate-500">
                      Hiperparámetros: <strong>{doc.hyperparameters}</strong>
                    </div>
                  </div>

                  <div className="p-4 bg-slate-50 rounded-2xl border border-slate-200 space-y-2">
                    <h4 className="font-bold text-slate-900 text-sm">Tratamiento de El Niño & BCRP</h4>
                    <p className="text-slate-600 leading-relaxed">{doc.howItHandlesMacro}</p>
                    <p className="text-slate-600 leading-relaxed pt-1">{doc.howItHandlesEnfen}</p>
                  </div>
                </div>

                {/* Walk-Forward Backtesting Visualizer (Real vs Predicho) */}
                <div className="space-y-3 pt-4 border-t border-slate-100">
                  <div className="flex items-center justify-between">
                    <div>
                      <h4 className="font-bold text-slate-900 text-sm flex items-center gap-2">
                        <LineChart className="w-4 h-4 text-purple-700" />
                        Validación Temporal Walk-Forward: Precio Real vs Predicho ({selectedModel.name})
                      </h4>
                      <p className="text-xs text-slate-500">
                        Evaluación out-of-sample en periodos de prueba mensuales.
                      </p>
                    </div>

                    <div className="flex items-center gap-3 text-xs font-semibold">
                      <span className="flex items-center gap-1.5 text-slate-900">
                        <span className="w-3 h-3 bg-slate-900 rounded-full"></span>
                        Precio Real (GMML)
                      </span>
                      <span className="flex items-center gap-1.5 text-purple-700">
                        <span className="w-3 h-3 bg-purple-500 rounded-full"></span>
                        Predicción Modelo
                      </span>
                    </div>
                  </div>

                  {/* SVG Chart Real vs Pred */}
                  <div className="bg-slate-900 rounded-2xl p-5 text-white">
                    <div className="h-48 w-full relative">
                      <svg className="w-full h-full overflow-visible" preserveAspectRatio="none" viewBox="0 0 100 100">
                        {/* Grid */}
                        {[0, 25, 50, 75, 100].map((y) => (
                          <line key={y} x1="0" y1={y} x2="100" y2={y} stroke="#1E293B" strokeDasharray="2,2" strokeWidth="0.5" />
                        ))}

                        {/* Real Line */}
                        <polyline
                          fill="none"
                          stroke="#FFFFFF"
                          strokeWidth="2.5"
                          points={backtestData
                            .map((d, i) => {
                              const x = (i / (backtestData.length - 1)) * 100;
                              const y = 100 - ((d.actual - 1.0) / (2.0 - 1.0)) * 100;
                              return `${x},${y}`;
                            })
                            .join(' ')}
                        />

                        {/* Pred Line */}
                        <polyline
                          fill="none"
                          stroke="#A855F7"
                          strokeWidth="2.5"
                          strokeDasharray="2,2"
                          points={backtestData
                            .map((d, i) => {
                              const x = (i / (backtestData.length - 1)) * 100;
                              const y = 100 - ((d.pred - 1.0) / (2.0 - 1.0)) * 100;
                              return `${x},${y}`;
                            })
                            .join(' ')}
                        />

                        {/* Residual Error bars below */}
                        {backtestData.map((d, i) => {
                          const x = (i / (backtestData.length - 1)) * 100;
                          const errHeight = Math.abs(d.residual) * 40;
                          return (
                            <rect
                              key={i}
                              x={x - 1}
                              y={100 - errHeight}
                              width="2"
                              height={errHeight}
                              fill={d.residual >= 0 ? '#20C77A' : '#EF4444'}
                              opacity="0.4"
                            />
                          );
                        })}
                      </svg>
                    </div>

                    <div className="flex justify-between text-[11px] text-slate-400 mt-3 pt-2 border-t border-slate-800 font-mono">
                      <span>Ene 2024</span>
                      <span>Jul 2024</span>
                      <span>Ene 2025</span>
                      <span>Jul 2025</span>
                      <span>Ene 2026</span>
                      <span className="text-[#B7F36B] font-bold">Hoy (Oct 2026)</span>
                    </div>
                  </div>
                </div>
              </div>
            );
          })()}
        </div>
      )}

      {/* ========================================================================= */}
      {/* SUBTAB 3: FEATURE IMPORTANCE & SHAP DECOMPOSITION                        */}
      {/* ========================================================================= */}
      {activeTab === 'importance' && (
        <div className="space-y-6">
          <div className="bg-white rounded-3xl p-6 sm:p-8 border border-slate-200 shadow-sm space-y-6">
            <div className="border-b border-slate-100 pb-4">
              <h2 className="text-xl font-bold text-slate-900 flex items-center gap-2">
                <Layers className="w-5 h-5 text-[#0B3025]" />
                Descomposición SHAP & Importancia de Variables en el Pronóstico
              </h2>
              <p className="text-xs text-slate-500 mt-0.5">
                Valores de Shapley que cuantifican la contribución marginal de cada variable en la predicción del precio de la papa.
              </p>
            </div>

            {/* Horizontal Bar Chart of Feature Importance */}
            <div className="space-y-3">
              {FEATURE_IMPORTANCE_LIST.map((item, idx) => {
                const pct = (item.importance * 100).toFixed(0);
                return (
                  <div key={idx} className="space-y-1">
                    <div className="flex items-center justify-between text-xs font-semibold text-slate-800">
                      <span className="flex items-center gap-2">
                        <span className="w-5 h-5 rounded-full bg-slate-100 text-slate-700 flex items-center justify-center text-[10px] font-bold">
                          {idx + 1}
                        </span>
                        <span>{item.feature}</span>
                      </span>
                      <span className="font-mono text-slate-900 font-bold">{pct}% peso</span>
                    </div>

                    <div className="h-3 w-full bg-slate-100 rounded-full overflow-hidden flex">
                      <div
                        style={{ width: `${pct}%` }}
                        className={`rounded-full transition-all ${
                          idx === 0
                            ? 'bg-[#20C77A]'
                            : idx === 1
                            ? 'bg-emerald-600'
                            : idx === 2
                            ? 'bg-amber-500'
                            : idx === 3
                            ? 'bg-blue-500'
                            : 'bg-purple-500'
                        }`}
                      />
                    </div>
                  </div>
                );
              })}
            </div>

            {/* BCRP Macroeconomic Variables In-Depth Table */}
            <div className="space-y-3 pt-6 border-t border-slate-100">
              <h3 className="text-base font-bold text-slate-900 flex items-center gap-2">
                <Database className="w-4 h-4 text-emerald-700" />
                Matriz de Variables Macroeconómicas BCRP Evaluadas
              </h3>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {BCRP_MACRO_INDICATORS.map((macro) => (
                  <div
                    key={macro.code}
                    className="p-4 rounded-2xl border border-slate-200 bg-slate-50 space-y-2 hover:bg-white hover:border-[#20C77A] transition-all"
                  >
                    <div className="flex items-start justify-between gap-2">
                      <div>
                        <span className="text-[10px] font-mono text-slate-400 block">{macro.code} • BCRP</span>
                        <h4 className="font-bold text-sm text-slate-900">{macro.name}</h4>
                      </div>
                      <span
                        className={`text-[10px] font-bold px-2.5 py-0.5 rounded-full uppercase shrink-0 ${
                          macro.predictiveStatus === 'Consolidada'
                            ? 'bg-emerald-100 text-emerald-800 border border-emerald-200'
                            : macro.predictiveStatus === 'Moderada'
                            ? 'bg-blue-100 text-blue-800 border border-blue-200'
                            : 'bg-rose-100 text-rose-800 border border-rose-200'
                        }`}
                      >
                        {macro.predictiveStatus}
                      </span>
                    </div>

                    <div className="grid grid-cols-3 gap-2 text-xs font-mono py-1">
                      <div className="bg-white p-2 rounded-lg border border-slate-100">
                        <span className="text-[10px] text-slate-400 block font-sans">Valor Actual</span>
                        <strong className="text-slate-900">{macro.currentValue}</strong>
                      </div>
                      <div className="bg-white p-2 rounded-lg border border-slate-100">
                        <span className="text-[10px] text-slate-400 block font-sans">Correlación (r)</span>
                        <strong className="text-emerald-700">+{macro.correlationWithPotato}</strong>
                      </div>
                      <div className="bg-white p-2 rounded-lg border border-slate-100">
                        <span className="text-[10px] text-slate-400 block font-sans">p-valor</span>
                        <strong className="text-slate-700">{macro.pVal}</strong>
                      </div>
                    </div>

                    <p className="text-xs text-slate-600 leading-relaxed bg-white p-2.5 rounded-xl border border-slate-100">
                      {macro.description}
                    </p>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* SUBTAB 4: LIVE WHAT-IF SENSITIVITY STRESS TEST SIMULATOR                */}
      {/* ========================================================================= */}
      {activeTab === 'sensitivity' && (
        <div className="space-y-6">
          <div className="bg-gradient-to-br from-[#0B3025] to-[#124234] text-white rounded-3xl p-6 sm:p-8 border border-[#1A4537] shadow-xl space-y-6">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div>
                <span className="text-xs font-bold uppercase tracking-wider text-[#B7F36B] flex items-center gap-1.5">
                  <Sliders className="w-4 h-4" />
                  Simulador de Estrés What-If en Tiempo Real
                </span>
                <h2 className="text-2xl font-black text-white mt-1">
                  ¿Cómo responde el modelo ante cambios en El Niño, Diésel y Oferta?
                </h2>
                <p className="text-slate-300 text-xs sm:text-sm max-w-2xl mt-0.5">
                  Ajusta los parámetros para evaluar la respuesta de precios ante eventos climáticos severos o shocks de flete.
                </p>
              </div>

              {/* Result Preview Header */}
              <div className="bg-white/10 p-4 rounded-2xl border border-white/20 text-right shrink-0">
                <div className="text-xs text-slate-300 font-medium">Precio Pronosticado Resultante</div>
                <div className="text-3xl font-black text-[#B7F36B] mt-1">
                  S/ {sensitivityResult.projectedPrice.toFixed(2)}
                  <span className="text-xs font-normal text-slate-300"> / kg</span>
                </div>
                <div className={`text-xs font-bold mt-1 ${
                  sensitivityResult.deltaSoles >= 0 ? 'text-amber-300' : 'text-emerald-300'
                }`}>
                  {sensitivityResult.deltaSoles >= 0 ? `+S/ ${sensitivityResult.deltaSoles}` : `-S/ ${Math.abs(sensitivityResult.deltaSoles)}`} ({sensitivityResult.deltaPct > 0 ? `+${sensitivityResult.deltaPct}%` : `${sensitivityResult.deltaPct}%`})
                </div>
              </div>
            </div>

            {/* Sliders Grid */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6 bg-black/25 p-5 rounded-2xl border border-white/10">
              {/* Slider 1: El Niño */}
              <div className="space-y-2">
                <div className="flex justify-between text-xs font-semibold">
                  <span className="flex items-center gap-1.5 text-amber-300">
                    <Zap className="w-3.5 h-3.5" />
                    Anomalía TSM El Niño (+°C):
                  </span>
                  <span className="font-mono text-white font-bold">+{simEnfenAnomaly.toFixed(1)} °C</span>
                </div>
                <input
                  type="range"
                  min="0.0"
                  max="2.5"
                  step="0.1"
                  value={simEnfenAnomaly}
                  onChange={(e) => setSimEnfenAnomaly(Number(e.target.value))}
                  className="w-full accent-amber-400 cursor-pointer h-2 bg-slate-700 rounded-lg"
                />
                <div className="flex justify-between text-[10px] text-slate-400">
                  <span>Neutro (0.0°C)</span>
                  <span>Moderado (+1.2°C)</span>
                  <span>Fuerte (+2.5°C)</span>
                </div>
              </div>

              {/* Slider 2: Diesel Shock */}
              <div className="space-y-2">
                <div className="flex justify-between text-xs font-semibold">
                  <span className="flex items-center gap-1.5 text-blue-300">
                    <TrendingUp className="w-3.5 h-3.5" />
                    Variación Precio Diésel (%):
                  </span>
                  <span className="font-mono text-white font-bold">{simDieselShock > 0 ? `+${simDieselShock}%` : `${simDieselShock}%`}</span>
                </div>
                <input
                  type="range"
                  min="-10"
                  max="35"
                  step="5"
                  value={simDieselShock}
                  onChange={(e) => setSimDieselShock(Number(e.target.value))}
                  className="w-full accent-blue-400 cursor-pointer h-2 bg-slate-700 rounded-lg"
                />
                <div className="flex justify-between text-[10px] text-slate-400">
                  <span>-10%</span>
                  <span>Estable (0%)</span>
                  <span>+35% (Alza Flete)</span>
                </div>
              </div>

              {/* Slider 3: Volume Shock */}
              <div className="space-y-2">
                <div className="flex justify-between text-xs font-semibold">
                  <span className="flex items-center gap-1.5 text-emerald-300">
                    <Scale className="w-3.5 h-3.5" />
                    Oferta Física GMML (%):
                  </span>
                  <span className="font-mono text-white font-bold">{simVolumeShock > 0 ? `+${simVolumeShock}%` : `${simVolumeShock}%`}</span>
                </div>
                <input
                  type="range"
                  min="-40"
                  max="25"
                  step="5"
                  value={simVolumeShock}
                  onChange={(e) => setSimVolumeShock(Number(e.target.value))}
                  className="w-full accent-[#B7F36B] cursor-pointer h-2 bg-slate-700 rounded-lg"
                />
                <div className="flex justify-between text-[10px] text-slate-400">
                  <span>-40% (Corte vía)</span>
                  <span>Normal (0%)</span>
                  <span>+25% (Pico cosecha)</span>
                </div>
              </div>
            </div>

            {/* Waterfall Factor Breakdown */}
            <div className="space-y-3">
              <h3 className="text-xs font-bold uppercase tracking-wider text-slate-300">
                Cascada de Aportación al Precio Final
              </h3>

              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
                {sensitivityResult.components.map((c, i) => (
                  <div key={i} className="bg-white/10 p-4 rounded-xl border border-white/15 space-y-1">
                    <div className="text-xs text-slate-300 font-semibold">{c.name}</div>
                    <div className={`text-lg font-extrabold ${
                      c.impactSoles >= 0 ? 'text-amber-300' : 'text-emerald-300'
                    }`}>
                      {c.impactSoles >= 0 ? `+S/ ${c.impactSoles.toFixed(2)}` : `-S/ ${Math.abs(c.impactSoles).toFixed(2)}`}
                      <span className="text-xs font-normal text-slate-300"> ({c.impactPct > 0 ? `+${c.impactPct}%` : `${c.impactPct}%`})</span>
                    </div>
                    <p className="text-[11px] text-slate-300 leading-snug pt-1">
                      {c.explanation}
                    </p>
                  </div>
                ))}
              </div>
            </div>

            {/* Confidence Intervals Card */}
            <div className="p-4 bg-black/30 rounded-2xl border border-white/10 flex flex-col sm:flex-row sm:items-center justify-between gap-4 text-xs">
              <div className="flex items-center gap-3">
                <ShieldCheck className="w-6 h-6 text-[#B7F36B] shrink-0" />
                <div>
                  <div className="font-bold text-white">Intervalos de Cobertura Conformal (Incertidumbre Modelada)</div>
                  <div className="text-slate-300 mt-0.5">
                    Rango 80%: <strong className="text-white">S/ {sensitivityResult.interval80[0]} - S/ {sensitivityResult.interval80[1]}</strong>
                    {' '}• Rango 95%: <strong className="text-[#B7F36B]">S/ {sensitivityResult.interval95[0]} - S/ {sensitivityResult.interval95[1]}</strong>
                  </div>
                </div>
              </div>

              <div className="text-[11px] text-slate-400">
                Calibrado sobre 24 meses de errores residuales en validación cruzada temporal.
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
