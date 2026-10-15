import test from 'node:test';
import assert from 'node:assert/strict';
import { calculateHarvestWindow, getVarietyById, VARIETIES_CATALOG, getSpreadVsCanchan } from './agronomicEngine.ts';
import { calculateEconomicScenarios, evaluateHarvestDecision } from './economicEngine.ts';
import { calculatePearsonCorrelation, calculateForecastForHarvest } from './forecastingEngine.ts';
import { calculateEnfenClimateAdjustment, OFFICIAL_ENFEN_DATA } from './enfenEngine.ts';

test('Agronomic engine: Canchan cycle and harvest window calculation', () => {
  const variety = getVarietyById('canchan');
  assert.equal(variety.id, 'canchan');
  assert.equal(variety.cycleAvgDays, 135);

  const window = calculateHarvestWindow('2026-10-15', 'canchan');
  assert.equal(window.variety.name, 'Papa Canchán');
  assert.ok(window.minHarvestDate.length > 0);
  assert.ok(window.maxHarvestDate.length > 0);
  assert.equal(window.durationDays, 135);
});

test('Agronomic engine: all 10 official potato varieties are cataloged', () => {
  assert.equal(VARIETIES_CATALOG.length, 10);
  const ids = VARIETIES_CATALOG.map((v) => v.id);
  assert.ok(ids.includes('canchan'));
  assert.ok(ids.includes('yungay'));
  assert.ok(ids.includes('amarilla'));
  assert.ok(ids.includes('blanca'));
  assert.ok(ids.includes('color'));
  assert.ok(ids.includes('huayro'));
  assert.ok(ids.includes('huamantanga'));
  assert.ok(ids.includes('negra_andina'));
  assert.ok(ids.includes('peruanita'));
  assert.ok(ids.includes('unica'));

  // Test Huayro cycle and altitude
  const huayro = getVarietyById('huayro');
  assert.equal(huayro.type, 'nativa');
  assert.ok(huayro.altitudeMax >= 4000);
  assert.ok(huayro.cycleAvgDays >= 150);

  // Test Peruanita
  const peruanita = getVarietyById('peruanita');
  assert.equal(peruanita.officialMidagriName, 'PAPA PERUANITA (INJERTO)');
});

test('ENFEN Climate engine: adjusts yields and prices according to ENSO scenarios', () => {
  assert.ok(OFFICIAL_ENFEN_DATA.latestBulletinNumber.includes('ENFEN'));
  assert.equal(OFFICIAL_ENFEN_DATA.status, 'VIGILANCIA DE EL NIÑO COSTERO');

  // Neutral condition: price and yield unchanged
  const neutral = calculateEnfenClimateAdjustment(1.50, 24, 'Sierra', 'neutral');
  assert.equal(neutral.adjustedPrice, 1.50);
  assert.equal(neutral.adjustedYield, 24);

  // El Niño Débil in Coast: yield drops, price increases
  const ninoCoast = calculateEnfenClimateAdjustment(1.40, 26, 'Costa', 'nino_debil');
  assert.ok(ninoCoast.adjustedYield < 26);
  assert.ok(ninoCoast.adjustedPrice > 1.40);

  // El Niño Moderado/Fuerte in Sierra Sur: drought risk
  const ninoSur = calculateEnfenClimateAdjustment(1.50, 18, 'Sierra_Sur', 'nino_moderado_fuerte');
  assert.ok(ninoSur.adjustedYield <= 18 * 0.75);
  assert.ok(ninoSur.adjustedPrice >= 1.50 * 1.35);
});

test('Economic engine: production, gross, margin and break-even formulas', () => {
  const inputs = {
    hectares: 1,
    expectedYieldTonHa: 24, // 24 t = 24,000 kg
    costPerHa: 18000,
    forecastPricePerKg: 1.50,
  };

  const result = calculateEconomicScenarios(inputs);
  // Break even = 18,000 / 24,000 = 0.75 S/kg
  assert.equal(result.breakEvenPrice, 0.75);

  // Central scenario: 24,000 * 1.50 = 36,000 gross, 36,000 - 18,000 = 18,000 net margin, ROI = 100%
  assert.equal(result.centralScenario.grossIncome, 36000);
  assert.equal(result.centralScenario.netMargin, 18000);
  assert.equal(result.centralScenario.roiPct, 100);

  // Adverse and favorable scenarios exist and have expected ordering
  assert.ok(result.adverseScenario.netMargin < result.centralScenario.netMargin);
  assert.ok(result.favorableScenario.netMargin > result.centralScenario.netMargin);
});

test('Harvest decision engine: compare sell today vs waiting vs regional market', () => {
  const inputs = {
    volumeTon: 15,
    currentGMMLPrice: 1.40,
    forecast7dPrice: 1.55,
    forecast14dPrice: 1.60,
    forecast21dPrice: 1.45,
    originName: 'Tarma, Junín',
    freightPerTonToLima: 120,
    storageCostPerTonWeek: 35,
    shrinkagePctPerWeek: 1.5,
  };

  const decision = evaluateHarvestDecision(inputs);
  assert.equal(decision.options.length, 4);
  assert.equal(decision.totalKgInitial, 15000);
  assert.ok(decision.bestOption);
  assert.ok(decision.bestOption.netIncome > 0);
});

test('Forecasting engine: Pearson correlation calculation', () => {
  const x = [1, 2, 3, 4, 5];
  const y = [2, 4, 6, 8, 10]; // Perfect positive correlation
  const r = calculatePearsonCorrelation(x, y);
  assert.equal(r, 1);

  const yInv = [10, 8, 6, 4, 2]; // Perfect negative correlation
  const rInv = calculatePearsonCorrelation(x, yInv);
  assert.equal(rInv, -1);
});

test('Forecasting engine: seasonal potato forecast calculation with ENFEN factor', () => {
  const forecastBase = calculateForecastForHarvest('canchan', '2026-10-15', '2027-02-27', 1.0);
  assert.ok(forecastBase.forecastPrice > 0);
  assert.ok(forecastBase.rangeMin < forecastBase.forecastPrice);
  assert.ok(forecastBase.rangeMax > forecastBase.forecastPrice);
  assert.equal(forecastBase.monthName, 'Febrero');

  // With ENFEN +10% price shock
  const forecastEnfen = calculateForecastForHarvest('canchan', '2026-10-15', '2027-02-27', 1.10);
  assert.ok(forecastEnfen.forecastPrice > forecastBase.forecastPrice);
  assert.equal(forecastEnfen.enfenImpactActive, true);
});

test('Agronomic engine: getSpreadVsCanchan computes exact premiums and discounts', () => {
  const canchan = getVarietyById('canchan');
  const amarilla = getVarietyById('amarilla');
  const unica = getVarietyById('unica');

  const spreadCanchan = getSpreadVsCanchan(canchan);
  assert.equal(spreadCanchan.diff, 0);
  assert.equal(spreadCanchan.isEqual, true);

  const spreadAmarilla = getSpreadVsCanchan(amarilla);
  assert.ok(spreadAmarilla.isPremium);
  assert.ok(spreadAmarilla.diff > 0);

  const spreadUnica = getSpreadVsCanchan(unica);
  assert.ok(spreadUnica.isDiscount);
  assert.ok(spreadUnica.diff < 0);
});

