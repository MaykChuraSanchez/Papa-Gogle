import React, { useEffect, useState } from 'react';
import { Context } from './DataContext';
import type { DataIndex, Series } from './contracts';
// Cache entries are tied to the content-addressed file in the selected publication.
const memory = new Map<string, unknown>();
async function load<T>(url: string, validate: (x: any) => boolean): Promise<{data: T; cached: boolean}> {
  if (memory.has(url)) return { data: memory.get(url) as T, cached: false };
  try {
    const response = await fetch(url, { cache: 'no-cache' });
    if (!response.ok) throw new Error(`HTTP ${response.status}`);
    const data = await response.json(); if (!validate(data)) throw new Error('Publicación incompatible');
    memory.set(url, data);
    try { localStorage.setItem('agro:' + url, JSON.stringify(data)); } catch { /* Optional offline cache. */ }
    return { data, cached: false };
  } catch (error) {
    try {
      const data = JSON.parse(localStorage.getItem('agro:' + url) || 'null');
      if (data && validate(data)) return { data, cached: true };
    } catch { /* Report original network error. */ }
    throw error;
  }
}
export function DataProvider({children}: {children: React.ReactNode}) {
  const [index, setIndex] = useState<DataIndex | null>(null), [series, setSeries] = useState<Series | null>(null);
  const [variety, select] = useState('Canchán'), [error, setError] = useState(''), [cached, setCached] = useState(false), [attempt, setAttempt] = useState(0);
  useEffect(() => { let active = true;
    load<DataIndex>('/data/index.json', x => x && Array.isArray(x.series) && x.series.length && x.sources && x.regional)
      .then(x => {if (active) {setIndex(x.data);setCached(x.cached);setError('');}})
      .catch(() => {if(active)setError('No se pudo cargar la publicación de datos. Revisa tu conexión e intenta nuevamente.');});
    return () => {active = false;};
  }, [attempt]);
  useEffect(() => {let active = true; setSeries(null); if (!index) return;
    const summary = index.series.find(s => s.variety === variety);
    if (!summary || !/^[a-f0-9]{20}\.json$/.test(summary.file)) {setError('Variedad no disponible.');return;}
    load<Series>('/data/' + summary.file, x => x?.variety === variety && x?.market_id === summary.market_id && Array.isArray(x.history) && Array.isArray(x.forecast) && x.history.length > 0 && x.forecast.every((p: any) => Number.isFinite(p.price) && Number.isFinite(p.low) && Number.isFinite(p.high) && p.low <= p.price && p.price <= p.high))
      .then(x => {if(active){setSeries({...x.data, evaluated_at: summary.evaluated_at});setCached(c => c || x.cached);setError('');}})
      .catch(() => {if(active)setError('No se pudo cargar esta variedad. Los resultados anteriores no se usan para otra variedad.');});
    return () => {active = false;};
  }, [index, variety, attempt]);
  const retry = () => {memory.clear();setError('');setCached(false);setAttempt(a => a + 1);};
  return <Context.Provider value={{index, series: series?.variety === variety ? series : null, variety, select, error, cached, retry}}>{children}</Context.Provider>;
}
