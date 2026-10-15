import React from 'react';
import { ViewTab } from '../types/agro';
import {
  Sprout,
  Database,
  BarChart3,
  CalendarDays,
  Truck,
  Cpu,
  Workflow,
  Sparkles,
  TrendingUp,
} from 'lucide-react';

interface NavbarProps {
  currentTab: ViewTab;
  onSelectTab: (tab: ViewTab) => void;
  onOpenAssistant: () => void;
  onSelectVariety?: (varietyId: string) => void;
}

export const Navbar: React.FC<NavbarProps> = ({
  currentTab,
  onSelectTab,
  onOpenAssistant,
  onSelectVariety,
}) => {
  const navItems: { id: ViewTab; label: string; icon: React.ReactNode; shortLabel: string }[] = [
    { id: 'home', label: '01. Inicio', shortLabel: 'Inicio', icon: <Sprout className="w-3.5 h-3.5" /> },
    { id: 'sync', label: '02. Conectores', shortLabel: 'Datos', icon: <Database className="w-3.5 h-3.5" /> },
    { id: 'varieties', label: '03. 10 Variedades SISAP', shortLabel: 'Variedades', icon: <BarChart3 className="w-3.5 h-3.5 text-[#B7F36B]" /> },
    { id: 'market', label: '04. Mercado & Mapa', shortLabel: 'Mercado', icon: <BarChart3 className="w-3.5 h-3.5" /> },
    { id: 'enfen', label: '05. El Niño (ENFEN)', shortLabel: 'El Niño', icon: <TrendingUp className="w-3.5 h-3.5 text-amber-300" /> },
    { id: 'planting', label: '06. Quiero Sembrar', shortLabel: 'Sembrar', icon: <CalendarDays className="w-3.5 h-3.5" /> },
    { id: 'harvest', label: '07. Ya Coseché', shortLabel: 'Coseché', icon: <Truck className="w-3.5 h-3.5" /> },
    { id: 'modellab', label: '08. Model Lab', shortLabel: 'Model Lab', icon: <Cpu className="w-3.5 h-3.5" /> },
    { id: 'architecture', label: '09. Arquitectura', shortLabel: 'IA & Arq', icon: <Workflow className="w-3.5 h-3.5" /> },
  ];

  return (
    <header className="sticky top-0 z-50 bg-[#0B3025] text-white border-b border-[#1A4537] shadow-lg">
      {/* Top Ticker: Live Market Status & ENFEN Alert */}
      <div className="bg-[#07241C] text-xs py-1.5 px-4 border-b border-[#143B2E] text-slate-300 flex flex-wrap items-center justify-between gap-2">
        <div className="flex items-center gap-3 overflow-x-auto whitespace-nowrap">
          <button
            onClick={() => onSelectTab('varieties')}
            className="flex items-center gap-1.5 font-semibold text-[#20C77A] hover:underline cursor-pointer"
          >
            <span className="relative flex h-2 w-2">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-[#20C77A] opacity-75"></span>
              <span className="relative inline-flex rounded-full h-2 w-2 bg-[#20C77A]"></span>
            </span>
            GMML HOY:
          </button>
          <button onClick={() => onSelectTab('varieties')} className="text-white hover:text-[#B7F36B] transition-colors cursor-pointer">
            Canchán: <strong className="text-[#B7F36B]">S/ 1.48</strong>
          </button>
          <span className="text-slate-400">•</span>
          <button onClick={() => onSelectTab('varieties')} className="text-white hover:text-amber-300 transition-colors cursor-pointer">
            Amarilla: <strong className="text-amber-300">S/ 2.52</strong>
          </button>
          <span className="text-slate-400">•</span>
          <button onClick={() => onSelectTab('varieties')} className="text-white hover:text-purple-300 transition-colors cursor-pointer">
            Huayro: <strong className="text-purple-300">S/ 2.25</strong>
          </button>
          <span className="text-slate-400">•</span>
          <button onClick={() => onSelectTab('varieties')} className="text-white hover:text-rose-300 transition-colors cursor-pointer">
            Peruanita: <strong className="text-rose-300">S/ 2.38</strong>
          </button>
          <span className="text-slate-400">•</span>
          <button onClick={() => onSelectTab('varieties')} className="text-white hover:text-slate-200 transition-colors cursor-pointer">
            Huamantanga: <strong className="text-white">S/ 2.10</strong>
          </button>
          <span className="text-slate-400">•</span>
          <button onClick={() => onSelectTab('varieties')} className="text-white hover:text-slate-200 transition-colors cursor-pointer">
            Negra Andina: <strong className="text-slate-200">S/ 1.85</strong>
          </button>
          <span className="text-slate-400">•</span>
          <button onClick={() => onSelectTab('varieties')} className="text-white hover:text-slate-200 transition-colors cursor-pointer">
            Yungay: <strong className="text-white">S/ 1.42</strong>
          </button>
          <span className="text-slate-400">•</span>
          <button onClick={() => onSelectTab('varieties')} className="text-white hover:text-slate-200 transition-colors cursor-pointer">
            Color: <strong className="text-white">S/ 1.62</strong>
          </button>
          <span className="text-slate-400">•</span>
          <button onClick={() => onSelectTab('varieties')} className="text-white hover:text-slate-200 transition-colors cursor-pointer">
            Única: <strong className="text-white">S/ 1.35</strong>
          </button>
          <span className="text-slate-400">|</span>
          <button
            onClick={() => onSelectTab('enfen')}
            className="text-amber-300 font-medium hover:underline flex items-center gap-1 cursor-pointer bg-amber-400/10 px-2 py-0.5 rounded border border-amber-400/30"
          >
            ENFEN: Vigilancia Niño Costero (+0.6°C)
          </button>
        </div>
        <div className="flex items-center gap-2 text-[11px] text-slate-300 font-mono">
          <button
            onClick={() => onSelectTab('varieties')}
            className="bg-[#124234] hover:bg-[#1a5543] px-2 py-0.5 rounded text-[#B7F36B] transition-colors cursor-pointer"
          >
            10 VARIEDADES SISAP
          </button>
          <span className="text-slate-400">EMMSA • MIDAGRI • ENFEN • BCRP</span>
        </div>
      </div>

      {/* Main Bar */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 py-2.5 flex items-center justify-between gap-3">
        {/* Brand */}
        <button
          onClick={() => onSelectTab('home')}
          className="flex items-center gap-2.5 text-left focus:outline-none group cursor-pointer shrink-0"
        >
          <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-[#20C77A] to-[#0E6845] flex items-center justify-center text-white shadow-md shadow-[#20C77A]/20 group-hover:scale-105 transition-transform">
            <Sprout className="w-5 h-5 text-[#F7FAF7]" />
          </div>
          <div>
            <div className="flex items-center gap-1.5">
              <span className="font-extrabold text-lg tracking-tight text-white">AgroDecide</span>
              <span className="text-[10px] px-1.5 py-0.5 bg-[#20C77A]/20 border border-[#20C77A]/40 rounded-full text-[#B7F36B] font-bold">
                AI
              </span>
            </div>
            <p className="text-[10px] text-[#A2C7B8] hidden xl:block">
              Siembra con información. Cosecha con mejores decisiones.
            </p>
          </div>
        </button>

        {/* Navigation Tabs */}
        <nav className="hidden xl:flex items-center gap-0.5 bg-[#09281F] p-1 rounded-xl border border-[#164134] overflow-x-auto">
          {navItems.map((item) => {
            const isActive = currentTab === item.id;
            return (
              <button
                key={item.id}
                onClick={() => onSelectTab(item.id)}
                className={`flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-xs font-semibold transition-all cursor-pointer whitespace-nowrap ${
                  isActive
                    ? 'bg-[#20C77A] text-[#07241C] shadow-sm font-bold'
                    : 'text-[#D0E5DC] hover:text-white hover:bg-[#123C30]'
                }`}
              >
                {item.icon}
                <span>{item.label}</span>
              </button>
            );
          })}
        </nav>

        {/* Action Button: Open AI Assistant */}
        <div className="flex items-center gap-2 shrink-0">
          <button
            onClick={onOpenAssistant}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-gradient-to-r from-[#20C77A] to-[#129A5B] text-[#07241C] font-bold text-xs shadow-md shadow-[#20C77A]/20 hover:brightness-110 active:scale-95 transition-all cursor-pointer"
          >
            <Sparkles className="w-3.5 h-3.5 text-[#07241C]" />
            <span className="hidden sm:inline">Pregunta a AgroDecide</span>
            <span className="sm:hidden">IA</span>
          </button>
        </div>
      </div>

      {/* Mobile/Tablet Nav Scroller */}
      <div className="xl:hidden flex items-center gap-1 px-3 py-2 bg-[#09281F] border-t border-[#164134] overflow-x-auto whitespace-nowrap">
        {navItems.map((item) => {
          const isActive = currentTab === item.id;
          return (
            <button
              key={item.id}
              onClick={() => onSelectTab(item.id)}
              className={`flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-xs font-medium shrink-0 cursor-pointer ${
                isActive
                  ? 'bg-[#20C77A] text-[#07241C] font-bold'
                  : 'text-slate-300 hover:bg-[#123C30]'
              }`}
            >
              {item.icon}
              <span>{item.shortLabel}</span>
            </button>
          );
        })}
      </div>
    </header>
  );
};
