export interface Metric { model?: string; mae: number; rmse: number; smape: number; n: number; coverage80?: number }
export interface Evaluation {
  horizon: number; model: string; selection: Metric[]; audit: Metric;
  baseline_audit: Metric; skill: number; status: string; band_method: string;
  origins: string[]; selection_folds: number; calibration_folds: number; audit_folds: number;
}
export interface Summary {
  variety: string; market: string; market_id: string; last_date: string;
  last_price: number; observations: number; coverage: number; evaluations: Evaluation[];
  file: string; evaluated_at: string; run_id: string; model_version: string;
}
export interface Point { date: string; price: number }
export interface Prediction extends Point {
  low: number; high: number; lead: number; model: string; evaluated_horizon: number; status: string;
}
export interface Series extends Summary {
  history: Point[]; forecast: Prediction[]; generated_at: string; data_hash: string;
}
export interface DataIndex {
  generated_at: string; exported_at: string; series: Summary[];
  sources: { id: string; name: string; state: string; kind: string; url: string; detail: string }[];
  regional: { period: string; total_t: number; source_url: string; note: string; regions: {region: string; production_t: number; cell: string}[] };
  correlations: { variety: string; lag_months: number; correlation: number | null; n: number }[];
  ingestion: {state: string}; monitoring: {note?: string};
}
