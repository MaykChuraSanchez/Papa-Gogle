import type { Series, Prediction } from '../data/contracts';
const DAY = 86400000;
export function dateValue(date: string) {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) throw new Error('Fecha inválida.');
  const time = Date.parse(date + 'T12:00:00Z');
  if (!Number.isFinite(time) || new Date(time).toISOString().slice(0, 10) !== date) throw new Error('Fecha inválida.');
  return time;
}
export const addDays = (date: string, days: number) => new Date(dateValue(date) + days * DAY).toISOString().slice(0, 10);
export const limaToday = () => new Intl.DateTimeFormat('en-CA', { timeZone: 'America/Lima', year: 'numeric', month: '2-digit', day: '2-digit' }).format(new Date());
export function freshness(series: Pick<Series, 'last_date' | 'evaluated_at'>, today = limaToday()) {
  const age = (dateValue(today) - dateValue(series.last_date)) / DAY;
  const evaluationAge = (dateValue(today) - dateValue(series.evaluated_at.slice(0, 10))) / DAY;
  if (age < 0) return 'El último dato tiene una fecha futura. Revisa la publicación.';
  if (age > 7) return `El último precio tiene ${age} días. Actualiza los datos antes de proyectar.`;
  if (evaluationAge > 45 || evaluationAge < 0) return 'La evaluación necesita actualizarse antes de proyectar.';
  return '';
}
export function forecastWindow(series: Series, start: string, end: string, today = limaToday()) {
  const stale = freshness(series, today); if (stale) throw new Error(stale);
  const count = (dateValue(end) - dateValue(start)) / DAY + 1;
  if (!Number.isInteger(count) || count < 1 || count > 240) throw new Error('Ventana de cosecha inválida.');
  const lead = (dateValue(end)-dateValue(series.last_date))/DAY;
  const appropriate = Object.keys(series.forecasts_by_horizon||{}).map(Number).sort((a,b)=>a-b).find(h=>h>=lead);
  const curve = appropriate ? series.forecasts_by_horizon![String(appropriate)] : series.forecast;
  const lookup = new Map(curve.map(p => [p.date, p]));
  const points: Prediction[] = [];
  for (let day = 0; day < count; day++) {
    const point = lookup.get(addDays(start, day));
    if (!point) throw new Error('La ventana completa debe estar dentro de los 240 días pronosticados. Cambia la fecha o el ciclo.');
    points.push(point);
  }
  const mean = (key: 'price' | 'low' | 'high') => points.reduce((sum, p) => sum + p[key], 0) / count;
  return { price: mean('price'), low: mean('low'), high: mean('high'), points,
    experimental: points.some(p => p.status === 'experimental'), models: [...new Set(points.map(p => p.model))] };
}
export function economics(price: number, hectares: number, yieldT: number, costHa: number, lossPct: number, freight: number, commissionPct: number) {
  if (![price, hectares, yieldT, costHa, lossPct, freight, commissionPct].every(Number.isFinite) || price < 0 || hectares <= 0 || yieldT <= 0 || costHa < 0 || freight < 0 || lossPct < 0 || lossPct >= 100 || commissionPct < 0 || commissionPct >= 100) throw new Error('Revisa área, rendimiento, costos, merma y comisión.');
  const kg = hectares * yieldT * 1000 * (1 - lossPct / 100);
  const gross = kg * price;
  const cost = hectares * costHa + kg * freight + gross * commissionPct / 100;
  return { kg, gross, cost, margin: gross - cost, breakEven: (hectares * costHa / kg + freight) / (1 - commissionPct / 100) };
}
export function change(history: {date: string; price: number}[], days: number) {
  const last = history.at(-1); if (!last) return null;
  const previous = history.find(p => p.date === addDays(last.date, -days));
  return previous ? 100 * (last.price / previous.price - 1) : null;
}
export const money = (n: number) => 'S/ ' + n.toLocaleString('es-PE', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
