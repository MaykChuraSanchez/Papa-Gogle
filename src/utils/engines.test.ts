import test from 'node:test';
import assert from 'node:assert/strict';
import { calculateHarvestWindow, getVarietyById } from './agronomicEngine.ts';
import { calculateEconomicScenarios, evaluateHarvestDecision } from './economicEngine.ts';
import { calculatePearsonCorrelation, calculateForecastForHarvest } from './forecastingEngine.ts';

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

test('Forecasting engine: seasonal potato forecast calculation', () => {
  const forecast = calculateForecastForHarvest('canchan', '2026-10-15', '2027-02-27');
  assert.ok(forecast.forecastPrice > 0);
  assert.ok(forecast.rangeMin < forecast.forecastPrice);
  assert.ok(forecast.rangeMax > forecast.forecastPrice);
  assert.equal(forecast.monthName, 'Febrero');
});
