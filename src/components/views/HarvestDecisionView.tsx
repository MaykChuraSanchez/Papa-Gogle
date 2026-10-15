import React, { useState } from 'react';
import { evaluateHarvestDecision } from '../../utils/economicEngine';
import {
  Truck,
  DollarSign,
  TrendingUp,
  Clock,
  ArrowRight,
  Warehouse,
  Scale,
  CheckCircle2,
  AlertTriangle,
  MapPin,
  Sparkles,
} from 'lucide-react';

export const HarvestDecisionView: React.FC = () => {
  // Inputs for harvested crop
  const [volumeTon, setVolumeTon] = useState<number>(15);
  const [varietyName, setVarietyName] = useState<string>('Papa Canchán');
  const [originName, setOriginName] = useState<string>('Tarma, Junín');
  const [currentPrice, setCurrentPrice] = useState<number>(1.48);
  const [freightCost, setFreightCost] = useState<number>(120); // S/ per ton Tarma-Lima
  const [storageCostPerWeek, setStorageCostPerWeek] = useState<number>(35); // S/ per ton/week
  const [shrinkagePct, setShrinkagePct] = useState<number>(1.5); // % natural merma per week

  // Simulated short-term forecasts for 7d, 14d, 21d from Champion model
  const forecast7d = Number((currentPrice * 1.06).toFixed(2)); // +6% (S/ 1.57)
  const forecast14d = Number((currentPrice * 1.09).toFixed(2)); // +9% (S/ 1.61)
  const forecast21d = Number((currentPrice * 1.04).toFixed(2)); // +4% (S/ 1.54)

  const decision = evaluateHarvestDecision({
    volumeTon,
    currentGMMLPrice: currentPrice,
    forecast7dPrice: forecast7d,
    forecast14dPrice: forecast14d,
    forecast21dPrice: forecast21d,
    originName,
    freightPerTonToLima: freightCost,
    storageCostPerTonWeek: storageCostPerWeek,
    shrinkagePctPerWeek: shrinkagePct,
  });

  return (
    <div className="space-y-8 pb-12">
      {/* View Header */}
      <div className="bg-white rounded-3xl p-6 sm:p-8 border border-slate-200 shadow-sm flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-amber-50 text-amber-800 text-xs font-bold border border-amber-200 mb-2">
            <Truck className="w-3.5 h-3.5" />
            Evaluador de Cosecha Lista — Camino B
          </div>
          <h1 className="text-2xl sm:text-3xl font-extrabold text-slate-900">
            ¿Vender hoy en Lima, esperar o vender en tu valle?
          </h1>
          <p className="text-xs sm:text-sm text-slate-500 max-w-2xl mt-1">
            Si ya tienes tus sacos cosechados, compara el precio de hoy frente a esperar 1 o 2 semanas considerando la merma de peso por deshidratación del tubérculo y el costo del flete.
          </p>
        </div>

        <div className="p-3 bg-slate-50 rounded-2xl border border-slate-200 text-xs">
          <span className="text-slate-500 font-medium">Volumen a comercializar:</span>
          <div className="text-xl font-black text-slate-900 mt-0.5">
            {volumeTon} Ton <span className="text-xs font-normal text-slate-500">({(volumeTon * 20).toLocaleString()} sacos de 50 kg)</span>
          </div>
        </div>
      </div>

      {/* Inputs Form */}
      <div className="bg-white rounded-3xl p-6 border border-slate-200 shadow-sm space-y-4">
        <h2 className="text-sm font-bold text-slate-900 uppercase tracking-wider flex items-center gap-2">
          <Scale className="w-4 h-4 text-amber-700" />
          Datos de tu Cosecha y Logística
        </h2>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <div className="space-y-1">
            <label className="text-xs font-bold text-slate-700">Toneladas Disponibles</label>
            <input
              type="number"
              min="1"
              max="150"
              value={volumeTon}
              onChange={(e) => setVolumeTon(Number(e.target.value) || 1)}
              className="w-full px-3 py-2 rounded-xl border border-slate-300 text-xs font-bold bg-slate-50 focus:ring-2 focus:ring-amber-500 focus:outline-none"
            />
          </div>

          <div className="space-y-1">
            <label className="text-xs font-bold text-slate-700">Variedad Cosechada</label>
            <select
              value={varietyName}
              onChange={(e) => {
                setVarietyName(e.target.value);
                if (e.target.value.includes('Amarilla')) setCurrentPrice(2.52);
                else if (e.target.value.includes('Yungay')) setCurrentPrice(1.42);
                else setCurrentPrice(1.48);
              }}
              className="w-full px-3 py-2 rounded-xl border border-slate-300 text-xs font-medium bg-slate-50 focus:ring-2 focus:ring-amber-500 focus:outline-none"
            >
              <option value="Papa Canchán">Papa Canchán (S/ 1.48 hoy)</option>
              <option value="Papa Yungay">Papa Yungay (S/ 1.42 hoy)</option>
              <option value="Papa Amarilla Tumbay">Papa Amarilla Tumbay (S/ 2.52 hoy)</option>
              <option value="Papa Huamantanga">Papa Huamantanga (S/ 2.10 hoy)</option>
            </select>
          </div>

          <div className="space-y-1">
            <label className="text-xs font-bold text-slate-700">Flete Tarma → Lima (S/ por Ton)</label>
            <input
              type="number"
              min="50"
              max="250"
              value={freightCost}
              onChange={(e) => setFreightCost(Number(e.target.value) || 100)}
              className="w-full px-3 py-2 rounded-xl border border-slate-300 text-xs font-bold bg-slate-50 focus:ring-2 focus:ring-amber-500 focus:outline-none"
            />
            <span className="text-[10px] text-slate-400">Total flete: S/ {(freightCost * volumeTon).toLocaleString()}</span>
          </div>

          <div className="space-y-1">
            <label className="text-xs font-bold text-slate-700">Merma Natural Semanal (%)</label>
            <input
              type="number"
              step="0.1"
              min="0.5"
              max="5"
              value={shrinkagePct}
              onChange={(e) => setShrinkagePct(Number(e.target.value) || 1.5)}
              className="w-full px-3 py-2 rounded-xl border border-slate-300 text-xs font-bold bg-slate-50 focus:ring-2 focus:ring-amber-500 focus:outline-none"
            />
            <span className="text-[10px] text-slate-400">Pérdida por evaporación en almacén</span>
          </div>
        </div>
      </div>

      {/* Decision Alternatives Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {decision.options.map((opt) => {
          const isBest = opt.id === decision.bestOption.id;
          return (
            <div
              key={opt.id}
              className={`p-5 rounded-3xl border transition-all flex flex-col justify-between space-y-4 ${
                isBest
                  ? 'border-2 border-[#20C77A] bg-emerald-50/50 shadow-md ring-2 ring-[#20C77A]/20'
                  : 'border-slate-200 bg-white hover:border-slate-300'
              }`}
            >
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-[10px] font-bold uppercase tracking-wider text-slate-500 bg-slate-100 px-2 py-0.5 rounded">
                    {opt.timeframe}
                  </span>
                  {isBest && (
                    <span className="text-[10px] font-extrabold uppercase text-[#07241C] bg-[#20C77A] px-2 py-0.5 rounded-full">
                      Mayor Ingreso Neto
                    </span>
                  )}
                </div>

                <div>
                  <h3 className="font-extrabold text-base text-slate-900 leading-tight">
                    {opt.name}
                  </h3>
                  <p className="text-[11px] text-slate-500 flex items-center gap-1 mt-1">
                    <MapPin className="w-3 h-3 text-slate-400 shrink-0" />
                    <span>{opt.destination}</span>
                  </p>
                </div>

                <div className="p-3 bg-white rounded-2xl border border-slate-100 space-y-1 font-mono text-xs">
                  <div className="flex justify-between text-slate-600">
                    <span>Precio Unitario:</span>
                    <strong className="text-slate-900">S/ {opt.pricePerKg.toFixed(2)} /kg</strong>
                  </div>
                  <div className="flex justify-between text-slate-600">
                    <span>Kilos útiles:</span>
                    <strong className="text-slate-900">{opt.effectiveKg.toLocaleString()} kg</strong>
                  </div>
                  <div className="flex justify-between text-slate-600">
                    <span>Flete + Almacén:</span>
                    <strong className="text-red-700">-S/ {opt.logisticsCost.toLocaleString()}</strong>
                  </div>
                </div>

                <div className="pt-2">
                  <span className="text-xs text-slate-400 block font-medium">Ingreso Neto de Bolsillo:</span>
                  <div className="text-2xl font-black text-slate-900 mt-0.5">
                    S/ {opt.netIncome.toLocaleString()}
                  </div>
                  {opt.deltaVsToday !== 0 && (
                    <span
                      className={`text-xs font-bold ${
                        opt.deltaVsToday > 0 ? 'text-emerald-700' : 'text-red-700'
                      }`}
                    >
                      {opt.deltaVsToday > 0 ? `+S/ ${opt.deltaVsToday.toLocaleString()} vs Hoy` : `-S/ ${Math.abs(opt.deltaVsToday).toLocaleString()} vs Hoy`}
                    </span>
                  )}
                </div>
              </div>

              {/* Pros and Cons */}
              <div className="pt-3 border-t border-slate-100 space-y-1 text-[11px]">
                <div className="text-emerald-800 flex items-start gap-1">
                  <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600 shrink-0 mt-0.5" />
                  <span>{opt.pros}</span>
                </div>
                <div className="text-slate-500 flex items-start gap-1">
                  <AlertTriangle className="w-3.5 h-3.5 text-amber-500 shrink-0 mt-0.5" />
                  <span>{opt.cons}</span>
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {/* Golden Principle Footer */}
      <div className="p-5 rounded-2xl bg-[#0B3025] text-white flex flex-col sm:flex-row items-center justify-between gap-4">
        <div className="space-y-1 text-center sm:text-left">
          <div className="flex items-center gap-2 justify-center sm:justify-start">
            <Sparkles className="w-4 h-4 text-[#B7F36B]" />
            <h4 className="font-extrabold text-sm text-[#B7F36B]">
              Regla de Oro de AgroDecide: La Decisión es Tuya
            </h4>
          </div>
          <p className="text-xs text-slate-300 max-w-2xl">
            La plataforma no emite órdenes ("Debes vender"). Presentamos escenarios auditables de precio, mermas de almacén y flete para que tú evalúes según tus necesidades de liquidez y compromisos familiares.
          </p>
        </div>
      </div>
    </div>
  );
};
