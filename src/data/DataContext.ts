import { createContext, useContext } from 'react';
import type { DataIndex, Series } from './contracts';
export interface State { index: DataIndex | null; series: Series | null; variety: string; select: (v: string) => void; error: string; cached: boolean; retry: () => void }
export const Context = createContext<State>(null!);
export const useData = () => useContext(Context);
