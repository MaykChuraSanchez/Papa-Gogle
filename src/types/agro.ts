export type ViewTab =
  | 'home'
  | 'sync'
  | 'varieties'
  | 'market'
  | 'enfen'
  | 'planting'
  | 'harvest'
  | 'modellab'
  | 'architecture';

export interface VarietyInfo {
  id: string;
  name: string;
  officialMidagriName: string;
  commercialName: string;
  type: 'blanca' | 'amarilla' | 'color' | 'nativa' | 'mixta';
  cycleMinDays: number;
  cycleMaxDays: number;
  cycleAvgDays: number;
  altitudeMin: number;
  altitudeMax: number;
  avgYield: number; // t/ha
  currentGMMLPrice: number; // S/ per kg
  change7d: number; // %
  change30d: number; // %
  frostResistance: 'Baja' | 'Media' | 'Alta';
  blightResistance: 'Baja' | 'Media' | 'Alta'; // Rancha
  enfenSensitivity: 'Alta' | 'Media' | 'Baja';
  culinaryProfile: string;
  description: string;
  source: string;
  dailyVolumeTon?: number;
  gmmlSharePct?: number;
  mainRegions?: string[];
  enfenVulnerabilityDetail?: string;
  scientificName?: string;
  sisapQueryUrl?: string;
  emmsaQueryUrl?: string;
}

export interface EnfenAlertInfo {
  status: 'NO ACTIVA' | 'VIGILANCIA DE EL NIÑO COSTERO' | 'ALERTA DE EL NIÑO COSTERO' | 'ALERTA DE LA NIÑA COSTERA';
  ensoGlobalStatus: 'Condición Neutra' | 'El Niño Débil' | 'El Niño Moderado' | 'La Niña Débil';
  latestBulletinNumber: string;
  bulletinDate: string;
  seaSurfaceTempAnomaly: number; // TSM Anomaly in °C (Región Niño 1+2)
  pacificCentralAnomaly: number; // Región Niño 3.4
  officialSummary: string;
  probabilities: {
    neutro: number;
    ninoDebil: number;
    ninoModerado: number;
    nina: number;
  };
  impactOnPotato: {
    coast: string;
    centralHighlands: string;
    southernHighlands: string;
    priceShockMultiplier: number; // e.g. 1.15 in supply disruption
  };
  officialUrl: string;
}

export interface DepartmentData {
  id: string;
  name: string;
  region: 'Costa' | 'Sierra' | 'Selva';
  productionTon: number; // Annual production in Tonnes
  harvestedAreaHa: number; // Hectares
  yieldTonHa: number; // t/ha
  farmgatePrice: number; // S/ per kg (precio en chacra)
  wholesalePriceGMML: number; // S/ per kg at GMML Lima
  gmmlSharePct: number; // Share of total volume entering GMML Lima
  climateRisk: 'Bajo' | 'Moderado' | 'Alto' | 'Muy Alto';
  frostRiskMonths: string[];
  rainfallSeason: string;
  pathD: string; // SVG path coordinate for map
  labelPos: { x: number; y: number };
}

export interface HistoricalPricePoint {
  date: string; // YYYY-MM-DD
  year: number;
  month: number;
  canchán: number; // S/ per kg
  yungay: number;
  amarilla: number;
  blanca: number;
  color: number;
  huayro: number;
  huamantanga: number;
  negraAndina: number;
  peruanita: number;
  unica: number;
  volumeTon: number; // Daily potato inflow in GMML
  juninInflowTon: number;
  dieselIndex: number; // S/ per gallon / BCRP proxy
  ipcAlimentos: number; // BCRP Index
  tipoCambio: number; // PEN/USD
  senamhiMinTempJunin: number; // °C
  enfenAnomalyTSM: number; // °C
  arequipaInflowTon?: number;
  costaSurInflowTon?: number; // Nazca, Palpa, Ica
  predictedLightGBM?: number;
  predictedSARIMAX?: number;
  predictedHoltWinters?: number;
  predictedRidge?: number;
  residualLightGBM?: number;
}

export interface MacroIndicator {
  code: string;
  name: string;
  frequency: string;
  unit: string;
  currentValue: number;
  previousValue: number;
  deltaYoY: number;
  correlationWithPotato: number;
  pVal: number;
  predictiveStatus: 'Consolidada' | 'Moderada' | 'Baja' | 'Filtro (no predictiva)';
  description: string;
  sourceUrl: string;
}

export interface DataSourceStatus {
  id: string;
  name: string;
  category: 'Mercados' | 'Estadística Agraria' | 'Clima' | 'Macroeconomía' | 'Agronomía';
  url: string;
  officialEntity: string;
  status: 'LIVE' | 'CACHE' | 'DEMO' | 'ERROR';
  lastSync: string;
  rowCount: number;
  latencyMs: number;
  format: 'API REST' | 'CSV / XLSX' | 'WABI (Power BI)' | 'Web Portal';
  frequency: 'Diario' | 'Mensual' | 'Decadal' | 'Estacional';
  message: string;
}

export interface ModelMetric {
  id: string;
  name: string;
  category: 'Baseline' | 'Series de Tiempo' | 'Machine Learning';
  mae: number;
  rmse: number;
  mape: number; // percentage
  wape: number;
  smape: number;
  coverage80: number; // % of true values within 80% interval
  coverage95: number;
  hitRate?: number; // Directional accuracy %
  isChampion?: boolean;
  notes: string;
}

export interface ForecastResult {
  variety: VarietyInfo;
  plantingDate: string;
  estimatedHarvestStart: string;
  estimatedHarvestEnd: string;
  horizonDays: number;
  targetDate: string;
  championModel: string;
  currentPrice: number;
  forecastPrice: number;
  rangeMin: number;
  rangeMax: number;
  adverseScenario: {
    label: string;
    price: number;
    yieldTonHa: number;
    kilosTotal: number;
    grossIncome: number;
    totalCost: number;
    netMargin: number;
    roiPct: number;
  };
  centralScenario: {
    label: string;
    price: number;
    yieldTonHa: number;
    kilosTotal: number;
    grossIncome: number;
    totalCost: number;
    netMargin: number;
    roiPct: number;
  };
  favorableScenario: {
    label: string;
    price: number;
    yieldTonHa: number;
    kilosTotal: number;
    grossIncome: number;
    totalCost: number;
    netMargin: number;
    roiPct: number;
  };
  breakEvenPrice: number;
  keyFactors: { factor: string; impact: 'positivo' | 'negativo' | 'neutro'; detail: string }[];
  aiExplanation?: string;
}

export interface ChatMessage {
  id: string;
  sender: 'user' | 'assistant' | 'system';
  text: string;
  timestamp: string;
  dataCard?: any;
}
