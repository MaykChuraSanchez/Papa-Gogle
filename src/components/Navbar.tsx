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
}

export const Navbar: React.FC<NavbarProps> = ({
  currentTab,
  onSelectTab,
  onOpenAssistant,
}) => {
  const navItems: { id: ViewTab; label: string; icon: React.ReactNode; shortLabel: string }[] = [
    { id: 'home', label: '01. Inicio', shortLabel: 'Inicio', icon: <Sprout className="w-4 h-4" /> },
    { id: 'sync', label: '02. Datos & Conectores', shortLabel: 'Datos', icon: <Database className="w-4 h-4" /> },
    { id: 'market', label: '03. Mercado & Mapa Perú', shortLabel: 'Mercado', icon: <BarChart3 className="w-4 h-4" /> },
    { id: 'planting', label: '04. Quiero Sembrar', shortLabel: 'Sembrar', icon: <CalendarDays className="w-4 h-4" /> },
    { id: 'harvest', label: '05. Ya Coseché', shortLabel: 'Coseché', icon: <Truck className="w-4 h-4" /> },
    { id: 'modellab', label: '06. Model Lab & Macro', shortLabel: 'Model Lab', icon: <Cpu className="w-4 h-4" /> },
    { id: 'architecture', label: '07. Arquitectura & IA', shortLabel: 'IA & Arq', icon: <Workflow className="w-4 h-4" /> },
  ];

  return (
    <header className="sticky top-0 z-50 bg-[#0B3025] text-white border-b border-[#1A4537] shadow-lg">
      {/* Top Ticker: Live Market Status */}
      <div className="bg-[#07241C] text-xs py-1.5 px-4 border-b border-[#143B2E] text-slate-300 flex flex-wrap items-center justify-between gap-2">
        <div className="flex items-center gap-3 overflow-x-auto whitespace-nowrap">
          <span className="flex items-center gap-1.5 font-semibold text-[#20C77A]">
            <span className="relative flex h-2 w-2">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-[#20C77A] opacity-75"></span>
              <span className="relative inline-flex rounded-full h-2 w-2 bg-[#20C77A]"></span>
            </span>
            GMML SANTA ANITA HOY:
          </span>
          <span className="text-white font-medium">Papa Canchán: <strong className="text-[#B7F36B]">S/ 1.48 /kg</strong></span>
          <span className="text-[#20C77A] flex items-center gap-0.5"><TrendingUp className="w-3 h-3" /> +2.1% (7d)</span>
          <span className="text-slate-400">|</span>
          <span>Papa Yungay: <strong className="text-white">S/ 1.42</strong></span>
          <span className="text-slate-400">|</span>
          <span>Papa Amarilla: <strong className="text-amber-300">S/ 2.52</strong></span>
          <span className="text-slate-400">|</span>
          <span>Ingreso Total: <strong className="text-white">2,480 Ton</strong></span>
          <span className="text-slate-400">|</span>
          <span>Junín (Tarma/Mantaro): <strong className="text-white">38.5%</strong></span>
        </div>
        <div className="flex items-center gap-2 text-[11px] text-slate-300 font-mono">
          <span className="bg-[#124234] px-2 py-0.5 rounded text-[#B7F36B]">MVP NAUFEST 2026</span>
          <span className="text-slate-400">EMMSA • MIDAGRI • SENAMHI • BCRP</span>
        </div>
      </div>

      {/* Main Bar */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 py-3 flex items-center justify-between gap-4">
        {/* Brand */}
        <button
          onClick={() => onSelectTab('home')}
          className="flex items-center gap-3 text-left focus:outline-none group cursor-pointer"
        >
          <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-[#20C77A] to-[#0E6845] flex items-center justify-center text-white shadow-md shadow-[#20C77A]/20 group-hover:scale-105 transition-transform">
            <Sprout className="w-6 h-6 text-[#F7FAF7]" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="font-extrabold text-xl tracking-tight text-white">AgroDecide</span>
              <span className="text-xs px-2 py-0.5 bg-[#20C77A]/20 border border-[#20C77A]/40 rounded-full text-[#B7F36B] font-bold">
                AI
              </span>
            </div>
            <p className="text-[11px] text-[#A2C7B8] hidden sm:block">
              Siembra con información. Cosecha con mejores decisiones.
            </p>
          </div>
        </button>

        {/* Navigation Tabs */}
        <nav className="hidden lg:flex items-center gap-1 bg-[#09281F] p-1 rounded-xl border border-[#164134]">
          {navItems.map((item) => {
            const isActive = currentTab === item.id;
            return (
              <button
                key={item.id}
                onClick={() => onSelectTab(item.id)}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all cursor-pointer ${
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
        <div className="flex items-center gap-2">
          <button
            onClick={onOpenAssistant}
            className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-gradient-to-r from-[#20C77A] to-[#129A5B] text-[#07241C] font-bold text-xs shadow-md shadow-[#20C77A]/20 hover:brightness-110 active:scale-95 transition-all cursor-pointer"
          >
            <Sparkles className="w-4 h-4 text-[#07241C]" />
            <span className="hidden sm:inline">Pregunta a AgroDecide</span>
            <span className="sm:hidden">IA Asistente</span>
          </button>
        </div>
      </div>

      {/* Mobile Nav Scroller */}
      <div className="lg:hidden flex items-center gap-1 px-3 py-2 bg-[#09281F] border-t border-[#164134] overflow-x-auto whitespace-nowrap">
        {navItems.map((item) => {
          const isActive = currentTab === item.id;
          return (
            <button
              key={item.id}
              onClick={() => onSelectTab(item.id)}
              className={`flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-xs font-medium shrink-0 ${
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
