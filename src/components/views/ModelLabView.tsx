import React, { useState } from 'react';
import {
  BENCHMARK_MODELS,
  BCRP_MACRO_INDICATORS,
  FEATURE_IMPORTANCE_LIST,
} from '../../utils/forecastingEngine';
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
} from 'lucide-react';

export const ModelLabView: React.FC = () => {
  const [selectedModel, setSelectedModel] = useState<ModelMetric>(BENCHMARK_MODELS[0]); // Champion default
  const [selectedHorizon, setSelectedHorizon] = useState<'30d' | '60d' | '120d'>('60d');

  return (
    <div className="space-y-8 pb-12">
      {/* Header */}
      <div className="bg-white rounded-3xl p-6 sm:p-8 border border-slate-200 shadow-sm flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-purple-50 text-purple-800 text-xs font-bold border border-purple-200 mb-2">
            <Cpu className="w-3.5 h-3.5" />
            Model Arena & Macro Econometría
          </div>
          <h1 className="text-2xl sm:text-3xl font-extrabold text-slate-900">
            Laboratorio de Modelos & Variables BCRP
          </h1>
          <p className="text-xs sm:text-sm text-slate-500 max-w-2xl mt-1">
            Auditoría técnica del sistema: comparativa de algoritmos, validación temporal sin data leakage (Walk-Forward Validation) y análisis de correlación macroeconómica.
          </p>
        </div>

        <div className="flex items-center gap-2 p-1.5 bg-slate-100 rounded-2xl">
          <span className="text-xs font-bold text-slate-500 pl-2">Horizonte:</span>
          {(['30d', '60d', '120d'] as const).map((h) => (
            <button
              key={h}
              onClick={() => setSelectedHorizon(h)}
              className={`px-3 py-1 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                selectedHorizon === h ? 'bg-white text-purple-900 shadow-sm' : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              {h === '30d' ? '30 días' : h === '60d' ? '60 días' : '120 días'}
            </button>
          ))}
        </div>
      </div>

      {/* Model Arena Leaderboard */}
      <div className="bg-white rounded-3xl p-6 sm:p-8 border border-slate-200 shadow-sm space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-slate-100 pb-4">
          <div>
            <h2 className="text-lg font-bold text-slate-900 flex items-center gap-2">
              <Trophy className="w-5 h-5 text-amber-500" />
              Model Arena: Tabla de Rendimiento en Backtesting
            </h2>
            <p className="text-xs text-slate-500">
              Evaluación walk-forward mensual sobre datos históricos 2019-2026. Menor MAE/RMSE y mayor cobertura indican mejor precisión.
            </p>
          </div>
          <span className="text-xs font-bold text-emerald-700 bg-emerald-50 px-3 py-1 rounded-full border border-emerald-200">
            Champion actual: LightGBM (MAPE 7.4%)
          </span>
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
                <th className="py-3 px-4 text-right">Estado</th>
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
                        ? 'bg-emerald-50/50 hover:bg-emerald-50'
                        : isSelected
                        ? 'bg-purple-50/50'
                        : 'hover:bg-slate-50'
                    }`}
                  >
                    <td className="py-3.5 px-4 font-sans font-bold text-slate-900 flex items-center gap-2">
                      {model.isChampion && (
                        <Trophy className="w-4 h-4 text-amber-500 shrink-0" />
                      )}
                      <span>{model.name}</span>
                    </td>
                    <td className="py-3.5 px-3 font-sans text-slate-500">
                      <span className="px-2 py-0.5 rounded bg-slate-100 text-slate-700 text-[10px] font-semibold">
                        {model.category}
                      </span>
                    </td>
                    <td className="py-3.5 px-3 font-bold text-slate-900">
                      S/ {model.mae.toFixed(2)}
                    </td>
                    <td className="py-3.5 px-3 text-slate-700">
                      S/ {model.rmse.toFixed(2)}
                    </td>
                    <td className="py-3.5 px-3 font-bold text-emerald-800">
                      {model.mape.toFixed(1)}%
                    </td>
                    <td className="py-3.5 px-3 text-slate-600">
                      {model.wape.toFixed(1)}%
                    </td>
                    <td className="py-3.5 px-3 text-slate-600">
                      {model.coverage95.toFixed(1)}%
                    </td>
                    <td className="py-3.5 px-4 text-right font-sans">
                      {model.isChampion ? (
                        <span className="px-2.5 py-1 rounded-full bg-[#20C77A] text-[#07241C] font-extrabold text-[11px]">
                          CHAMPION
                        </span>
                      ) : (
                        <span className="text-slate-400 text-xs">Candidato</span>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>

        <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200 text-xs text-slate-600 flex items-start gap-3">
          <Info className="w-4 h-4 text-purple-700 shrink-0 mt-0.5" />
          <div>
            <strong className="text-slate-900">Detalle del modelo seleccionado ({selectedModel.name}):</strong>
            <p className="mt-0.5">{selectedModel.notes}</p>
          </div>
        </div>
      </div>

      {/* BCRP Macro Econometrics Panel */}
      <div className="bg-white rounded-3xl p-6 sm:p-8 border border-slate-200 shadow-sm space-y-6">
        <div>
          <div className="flex items-center gap-2">
            <TrendingUp className="w-5 h-5 text-emerald-700" />
            <h2 className="text-xl font-bold text-slate-900">
              Correlación e Impacto de Variables Macroeconómicas (BCRPData)
            </h2>
          </div>
          <p className="text-xs text-slate-500 mt-1">
            Análisis econométrico oficial: ¿Realmente las variables macro ayudan a predecir el precio de la papa o es correlación espuria?
          </p>
        </div>

        {/* BCRP Indicators Table */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {BCRP_MACRO_INDICATORS.map((macro) => (
            <div
              key={macro.code}
              className={`p-5 rounded-2xl border space-y-3 ${
                macro.predictiveStatus === 'Consolidada'
                  ? 'bg-emerald-50/40 border-emerald-200'
                  : macro.predictiveStatus === 'Moderada'
                  ? 'bg-blue-50/40 border-blue-200'
                  : 'bg-slate-50 border-slate-200 opacity-80'
              }`}
            >
              <div className="flex items-start justify-between gap-2">
                <div>
                  <span className="font-mono text-[10px] text-slate-400 block">{macro.code} • BCRP</span>
                  <h3 className="font-bold text-sm text-slate-900 mt-0.5">{macro.name}</h3>
                </div>
                <span
                  className={`text-[10px] font-extrabold uppercase px-2 py-0.5 rounded-full shrink-0 ${
                    macro.predictiveStatus === 'Consolidada'
                      ? 'bg-emerald-200 text-emerald-950'
                      : macro.predictiveStatus === 'Moderada'
                      ? 'bg-blue-200 text-blue-950'
                      : 'bg-slate-200 text-slate-700'
                  }`}
                >
                  {macro.predictiveStatus}
                </span>
              </div>

              <div className="grid grid-cols-3 gap-2 font-mono text-xs bg-white/80 p-2.5 rounded-xl border border-slate-100">
                <div>
                  <span className="text-[10px] text-slate-400 block">Valor Actual</span>
                  <strong className="text-slate-900">{macro.currentValue} {macro.unit.split(' ')[0]}</strong>
                </div>
                <div>
                  <span className="text-[10px] text-slate-400 block">Correlación (r)</span>
                  <strong className={`${macro.correlationWithPotato > 0.4 ? 'text-emerald-700' : 'text-slate-700'}`}>
                    r = {macro.correlationWithPotato.toFixed(2)}
                  </strong>
                </div>
                <div>
                  <span className="text-[10px] text-slate-400 block">Significancia (p)</span>
                  <strong className="text-slate-700">p = {macro.pVal}</strong>
                </div>
              </div>

              <p className="text-xs text-slate-600 leading-relaxed">
                {macro.description}
              </p>

              <div className="text-right pt-1">
                <a
                  href={macro.sourceUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-[11px] font-bold text-emerald-700 hover:underline inline-flex items-center gap-1"
                >
                  Consultar serie oficial BCRP <ExternalLink className="w-3 h-3" />
                </a>
              </div>
            </div>
          ))}
        </div>

        {/* Golden Rule of Macroeconomic Integration */}
        <div className="p-5 rounded-2xl bg-gradient-to-r from-[#0B3025] to-[#124234] text-white space-y-2">
          <div className="flex items-center gap-2">
            <ShieldCheck className="w-5 h-5 text-[#B7F36B]" />
            <h4 className="font-extrabold text-sm text-[#B7F36B]">
              Regla Científica: Filtro de Mejora Predictiva Out-Of-Sample
            </h4>
          </div>
          <p className="text-xs text-slate-200 leading-relaxed">
            En AgroDecide AI aplicamos el principio de parsimonia econométrica: <strong>una variable macroeconómica de BCRP solo se conserva en la BaseMotor final si demuestra reducir el RMSE en backtesting out-of-sample frente al modelo sin macro.</strong> Por este motivo, el Petróleo Diésel (flete camionero) y el IPC Alimentos se mantienen, mientras que la Tasa de Interés BCRP fue excluida del modelo final al no aportar ganancia predictiva a corto plazo.
          </p>
        </div>
      </div>

      {/* Feature Importance & Walk-Forward Backtesting Explanation */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Feature Importance */}
        <div className="bg-white rounded-3xl p-6 sm:p-8 border border-slate-200 shadow-sm space-y-4">
          <div className="flex items-center gap-2">
            <Activity className="w-5 h-5 text-purple-700" />
            <h3 className="text-lg font-bold text-slate-900">
              Importancia de Variables (Feature Importance / SHAP)
            </h3>
          </div>
          <p className="text-xs text-slate-500">
            Contribución relativa de cada variable en el pronóstico del modelo Champion:
          </p>

          <div className="space-y-3 pt-2">
            {FEATURE_IMPORTANCE_LIST.map((item, idx) => (
              <div key={idx} className="space-y-1">
                <div className="flex justify-between text-xs">
                  <span className="font-medium text-slate-800">{item.feature}</span>
                  <span className="font-mono font-bold text-purple-900">{(item.importance * 100).toFixed(0)}%</span>
                </div>
                <div className="h-2 w-full bg-slate-100 rounded-full overflow-hidden">
                  <div
                    className="h-full bg-gradient-to-r from-purple-500 to-[#20C77A] rounded-full"
                    style={{ width: `${item.importance * 100 * 2.5}%` }}
                  />
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Walk-Forward Backtesting Card */}
        <div className="bg-white rounded-3xl p-6 sm:p-8 border border-slate-200 shadow-sm space-y-4">
          <div className="flex items-center gap-2">
            <LineChart className="w-5 h-5 text-emerald-700" />
            <h3 className="text-lg font-bold text-slate-900">
              Metodología: Walk-Forward Validation
            </h3>
          </div>
          <p className="text-xs text-slate-500">
            Por qué nunca usamos un split aleatorio (k-fold tradicional) en series de tiempo agrícolas:
          </p>

          <div className="space-y-3 text-xs text-slate-600 leading-relaxed pt-2">
            <div className="p-3.5 rounded-2xl bg-amber-50 border border-amber-200 space-y-1">
              <strong className="text-amber-950 flex items-center gap-1.5">
                <AlertTriangle className="w-4 h-4 text-amber-700" />
                Cero Fuga de Información (Data Leakage)
              </strong>
              <p className="text-amber-900 text-[11px]">
                En la agricultura es un error usar datos del futuro para predecir el pasado. Un split aleatorio filtraría precios de 2026 para predecir 2024.
              </p>
            </div>

            <div className="p-3.5 rounded-2xl bg-emerald-50 border border-emerald-200 space-y-1">
              <strong className="text-emerald-950 flex items-center gap-1.5">
                <CheckCircle2 className="w-4 h-4 text-emerald-700" />
                Entrenamiento Secuencial
              </strong>
              <p className="text-emerald-900 text-[11px]">
                El modelo se entrena hasta el mes <em>t</em> y pronostica el mes <em>t+k</em>. Luego la ventana avanza un mes y repite el proceso. Esto asegura que las métricas reflejen la realidad operativa que experimentará el agricultor.
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
