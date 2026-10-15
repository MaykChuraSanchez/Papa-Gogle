export type ViewTab =
  | 'home'
  | 'sync'
  | 'market'
  | 'planting'
  | 'harvest'
  | 'modellab'
  | 'architecture';

export interface VarietyInfo {
  id: string;
  name: string;
  commercialName: string;
  type: 'blanca' | 'amarilla' | 'color' | 'nativa';
  cycleMinDays: number;
  cycleMaxDays: number;
  cycleAvgDays: number;
  altitudeMin: number;
  altitudeMax: number;
  avgYield: number; // t/ha
  frostResistance: 'Baja' | 'Media' | 'Alta';
  blightResistance: 'Baja' | 'Media' | 'Alta'; // Rancha
  description: string;
  source: string;
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
  huamantanga: number;
  volumeTon: number; // Daily potato inflow in GMML
  juninInflowTon: number;
  dieselIndex: number; // S/ per gallon / BCRP proxy
  ipcAlimentos: number; // BCRP Index
  tipoCambio: number; // PEN/USD
  senamhiMinTempJunin: number; // °C
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
