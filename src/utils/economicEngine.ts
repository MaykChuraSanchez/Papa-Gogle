export interface EconomicInputs {
  hectares: number;
  expectedYieldTonHa: number;
  costPerHa: number; // In S/
  forecastPricePerKg: number; // In S/ per kg
}

export interface ScenarioDetail {
  label: string;
  price: number;
  yieldTonHa: number;
  kilosTotal: number;
  grossIncome: number;
  totalCost: number;
  netMargin: number;
  roiPct: number;
}

export function calculateEconomicScenarios(inputs: EconomicInputs) {
  const { hectares, expectedYieldTonHa, costPerHa, forecastPricePerKg } = inputs;
  const totalCost = hectares * costPerHa;
  const baseKilos = hectares * expectedYieldTonHa * 1000;
  const breakEvenPrice = baseKilos > 0 ? Number((totalCost / baseKilos).toFixed(2)) : 0;

  // Central (P50)
  const centralGross = baseKilos * forecastPricePerKg;
  const centralMargin = centralGross - totalCost;
  const centralRoi = totalCost > 0 ? Number(((centralMargin / totalCost) * 100).toFixed(1)) : 0;

  const centralScenario: ScenarioDetail = {
    label: 'Escenario Central (Esperado)',
    price: Number(forecastPricePerKg.toFixed(2)),
    yieldTonHa: expectedYieldTonHa,
    kilosTotal: Math.round(baseKilos),
    grossIncome: Math.round(centralGross),
    totalCost: Math.round(totalCost),
    netMargin: Math.round(centralMargin),
    roiPct: centralRoi,
  };

  // Adverso (P10: -18% precio, -12% rendimiento por factores climáticos o sobreoferta)
  const adversePrice = Number(Math.max(0.6, forecastPricePerKg * 0.82).toFixed(2));
  const adverseYield = Number((expectedYieldTonHa * 0.88).toFixed(1));
  const adverseKilos = hectares * adverseYield * 1000;
  const adverseGross = adverseKilos * adversePrice;
  const adverseMargin = adverseGross - totalCost;
  const adverseRoi = totalCost > 0 ? Number(((adverseMargin / totalCost) * 100).toFixed(1)) : 0;

  const adverseScenario: ScenarioDetail = {
    label: 'Escenario Adverso (P10 / Caída)',
    price: adversePrice,
    yieldTonHa: adverseYield,
    kilosTotal: Math.round(adverseKilos),
    grossIncome: Math.round(adverseGross),
    totalCost: Math.round(totalCost),
    netMargin: Math.round(adverseMargin),
    roiPct: adverseRoi,
  };

  // Favorable (P90: +22% precio, +10% rendimiento por buena campaña y menor oferta competidora)
  const favorablePrice = Number((forecastPricePerKg * 1.22).toFixed(2));
  const favorableYield = Number((expectedYieldTonHa * 1.10).toFixed(1));
  const favorableKilos = hectares * favorableYield * 1000;
  const favorableGross = favorableKilos * favorablePrice;
  const favorableMargin = favorableGross - totalCost;
  const favorableRoi = totalCost > 0 ? Number(((favorableMargin / totalCost) * 100).toFixed(1)) : 0;

  const favorableScenario: ScenarioDetail = {
    label: 'Escenario Favorable (P90 / Repunte)',
    price: favorablePrice,
    yieldTonHa: favorableYield,
    kilosTotal: Math.round(favorableKilos),
    grossIncome: Math.round(favorableGross),
    totalCost: Math.round(totalCost),
    netMargin: Math.round(favorableMargin),
    roiPct: favorableRoi,
  };

  return {
    breakEvenPrice,
    adverseScenario,
    centralScenario,
    favorableScenario,
  };
}

export interface HarvestDecisionInputs {
  volumeTon: number;
  currentGMMLPrice: number; // S/ per kg today
  forecast7dPrice: number; // in 7 days
  forecast14dPrice: number; // in 14 days
  forecast21dPrice: number; // in 21 days
  originName: string; // e.g. "Tarma, Junín"
  freightPerTonToLima: number; // S/ per ton, e.g. 120 S/ton
  storageCostPerTonWeek: number; // S/ per ton/week, e.g. 35 S/ton
  shrinkagePctPerWeek: number; // Natural loss (merma), e.g. 1.5%
}

export function evaluateHarvestDecision(inputs: HarvestDecisionInputs) {
  const {
    volumeTon,
    currentGMMLPrice,
    forecast7dPrice,
    forecast14dPrice,
    forecast21dPrice,
    freightPerTonToLima,
    storageCostPerTonWeek,
    shrinkagePctPerWeek,
  } = inputs;

  const totalKgInitial = volumeTon * 1000;

  // Option 1: Vender Hoy en GMML Lima
  const sellTodayGross = totalKgInitial * currentGMMLPrice;
  const sellTodayTransport = volumeTon * freightPerTonToLima;
  const sellTodayNet = sellTodayGross - sellTodayTransport;

  // Option 2: Esperar 1 semana (7 días)
  const kg7d = totalKgInitial * (1 - shrinkagePctPerWeek / 100);
  const sell7dGross = kg7d * forecast7dPrice;
  const sell7dCost = volumeTon * freightPerTonToLima + volumeTon * storageCostPerTonWeek;
  const sell7dNet = sell7dGross - sell7dCost;

  // Option 3: Esperar 2 semanas (14 días)
  const kg14d = totalKgInitial * Math.pow(1 - shrinkagePctPerWeek / 100, 2);
  const sell14dGross = kg14d * forecast14dPrice;
  const sell14dCost = volumeTon * freightPerTonToLima + volumeTon * (storageCostPerTonWeek * 2);
  const sell14dNet = sell14dGross - sell14dCost;

  // Option 4: Venta en Mercado Regional (ej. Mercado Mayorista Huancayo / Tarma)
  // Precio suele ser 10-14% menor que Lima, pero flete es mucho menor (S/ 35/t en vez de S/ 120/t)
  const regionalPrice = currentGMMLPrice * 0.88;
  const regionalTransport = volumeTon * 35;
  const regionalGross = totalKgInitial * regionalPrice;
  const regionalNet = regionalGross - regionalTransport;

  const options = [
    {
      id: 'today',
      name: 'Vender Hoy en GMML Lima',
      timeframe: 'Inmediato (0 días)',
      destination: 'Gran Mercado Mayorista de Lima (Santa Anita)',
      pricePerKg: currentGMMLPrice,
      effectiveKg: totalKgInitial,
      grossIncome: Math.round(sellTodayGross),
      logisticsCost: Math.round(sellTodayTransport),
      netIncome: Math.round(sellTodayNet),
      deltaVsToday: 0,
      recommendationLevel: 'Base de comparación',
      pros: 'Cero riesgo de merma, cobro inmediato, sin costo de almacenaje.',
      cons: 'Sujeto al precio del día sin aprovechar posibles alzas.',
    },
    {
      id: 'wait_7d',
      name: 'Esperar 7 Días (1 Semana)',
      timeframe: 'Próxima semana',
      destination: 'GMML Lima',
      pricePerKg: forecast7dPrice,
      effectiveKg: Math.round(kg7d),
      grossIncome: Math.round(sell7dGross),
      logisticsCost: Math.round(sell7dCost),
      netIncome: Math.round(sell7dNet),
      deltaVsToday: Math.round(sell7dNet - sellTodayNet),
      recommendationLevel: sell7dNet > sellTodayNet ? 'Ventaja Estimada' : 'Riesgo de Merma',
      pros: `Proyección de precio a S/ ${forecast7dPrice.toFixed(2)}. Puede absorber el costo de almacenaje si el mercado está al alza.`,
      cons: `Merma estimada de ${(totalKgInitial - kg7d).toFixed(0)} kg y costo de depósito S/ ${(volumeTon * storageCostPerTonWeek).toFixed(0)}.`,
    },
    {
      id: 'wait_14d',
      name: 'Esperar 14 Días (2 Semanas)',
      timeframe: 'En 2 semanas',
      destination: 'GMML Lima',
      pricePerKg: forecast14dPrice,
      effectiveKg: Math.round(kg14d),
      grossIncome: Math.round(sell14dGross),
      logisticsCost: Math.round(sell14dCost),
      netIncome: Math.round(sell14dNet),
      deltaVsToday: Math.round(sell14dNet - sellTodayNet),
      recommendationLevel: sell14dNet > sellTodayNet ? 'Potencial Favorable' : 'No Recomendado por Merma',
      pros: `Permite esperar desfase de cosechas masivas de valles vecinos.`,
      cons: `Merma acumulada de ${(totalKgInitial - kg14d).toFixed(0)} kg y S/ ${(volumeTon * storageCostPerTonWeek * 2).toFixed(0)} en almacenaje.`,
    },
    {
      id: 'regional',
      name: 'Venta Directa en Valle / Mercado Regional',
      timeframe: 'Inmediato (0 días)',
      destination: 'Mercado Mayorista de Huancayo / Acopio Tarma',
      pricePerKg: Number(regionalPrice.toFixed(2)),
      effectiveKg: totalKgInitial,
      grossIncome: Math.round(regionalGross),
      logisticsCost: Math.round(regionalTransport),
      netIncome: Math.round(regionalNet),
      deltaVsToday: Math.round(regionalNet - sellTodayNet),
      recommendationLevel: regionalNet >= sellTodayNet ? 'Excelente Alternativa Local' : 'Lima Paga Mejor Margen',
      pros: 'Flete local ultra bajo (S/ 35/t) y sin demoras por congestión en Carretera Central.',
      cons: 'Menor volumen de absorción diaria que Lima y precio unitario menor.',
    },
  ];

  return {
    totalKgInitial,
    currentGMMLPrice,
    options,
    bestOption: [...options].sort((a, b) => b.netIncome - a.netIncome)[0],
  };
}
