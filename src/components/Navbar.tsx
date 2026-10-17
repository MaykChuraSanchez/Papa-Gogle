import React, {useEffect, useRef} from 'react';
import { useData } from '../data/DataContext';
import { money } from '../utils/forecast';
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
  const {index} = useData();
  const rail = useRef<HTMLElement>(null);
  useEffect(() => {
    const nav=rail.current;
    const selected=nav?.querySelector<HTMLElement>('[aria-current="page"]');
    if(nav && selected && nav.scrollWidth>nav.clientWidth) {
      nav.scrollLeft=Math.max(0,selected.offsetLeft-nav.offsetLeft-(nav.clientWidth-selected.offsetWidth)/2);
    }
  }, [currentTab]);
  const navItems: { id: ViewTab; label: string; icon: React.ReactNode; shortLabel: string }[] = [
    { id: 'home', label: '01. Inicio', shortLabel: 'Inicio', icon: <Sprout className="w-3.5 h-3.5" /> },
    { id: 'sync', label: '02. Conectores', shortLabel: 'Datos', icon: <Database className="w-3.5 h-3.5" /> },
    { id: 'varieties', label: '03. 10 Variedades SISAP', shortLabel: 'Explorar precios', icon: <BarChart3 className="w-3.5 h-3.5 text-[#B7F36B]" /> },
    { id: 'market', label: '04. Mercado & Mapa', shortLabel: 'Mercado', icon: <BarChart3 className="w-3.5 h-3.5" /> },
    { id: 'enfen', label: '05. Inteligencia Climática · El Niño', shortLabel: 'Clima y El Niño', icon: <TrendingUp className="w-3.5 h-3.5 text-amber-300" /> },
    { id: 'planting', label: '06. Quiero Sembrar', shortLabel: 'Sembrar', icon: <CalendarDays className="w-3.5 h-3.5" /> },
    { id: 'harvest', label: '07. Ya Coseché', shortLabel: 'Coseché', icon: <Truck className="w-3.5 h-3.5" /> },
    { id: 'modellab', label: '08. Model Lab', shortLabel: 'Laboratorio', icon: <Cpu className="w-3.5 h-3.5" /> },
    { id: 'architecture', label: '09. Asistente', shortLabel: 'Asistente', icon: <Workflow className="w-3.5 h-3.5" /> },
  ];

  return (
    <header className="site-header top-0 z-50 bg-[#0B3025] text-white border-b border-[#1A4537] shadow-lg">
      <div className="market-strip bg-[#07241C] text-xs py-2 px-4 border-b border-[#143B2E] text-slate-300">
        <div className="market-strip-inner max-w-7xl mx-auto flex gap-5 overflow-x-auto whitespace-nowrap nav-scroll">
          <span className="text-[#20C77A] font-bold">GMML · SISAP</span>
          {index?.series.map(s => <button key={s.variety} onClick={() => onSelectVariety?.(s.variety)} className="shrink-0">{s.variety}: <strong className="text-[#B7F36B]">{money(s.last_price)}</strong></button>)}
          <span>Última fecha: {index?.series[0]?.last_date || 'Cargando…'}</span>
        </div>
      </div>

      {/* Main Bar */}
      <div className="brand-bar max-w-[1600px] mx-auto px-4 sm:px-6 py-2.5 flex items-center justify-between gap-3">
        {/* Brand */}
        <button
          onClick={() => onSelectTab('home')}
          className="brand-button flex items-center gap-2.5 text-left group cursor-pointer shrink-0"
        >
          <div className="brand-mark w-9 h-9 rounded-xl bg-gradient-to-br from-[#20C77A] to-[#0E6845] flex items-center justify-center text-white shadow-md shadow-[#20C77A]/20 group-hover:scale-105 transition-transform">
            <Sprout className="w-5 h-5 text-[#F7FAF7]" />
          </div>
          <div>
            <div className="flex items-center gap-1.5">
              <span className="font-extrabold text-lg tracking-tight text-white">AgroDecide</span>
              <span className="text-[10px] px-1.5 py-0.5 bg-[#20C77A]/20 border border-[#20C77A]/40 rounded-full text-[#B7F36B] font-bold">
                AI
              </span>
            </div>
            <p className="brand-description text-[10px] text-[#A2C7B8] hidden xl:block">
              Siembra con información. Cosecha con mejores decisiones.
            </p>
          </div>
        </button>

        {/* Action Button: Open AI Assistant */}
        <div className="flex items-center gap-2 shrink-0">
          <span className="header-context"><i/>GMML Lima · Datos SISAP</span>
          <button
            onClick={onOpenAssistant}
            aria-label="Pregunta a AgroDecide"
            className="assistant-trigger flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-gradient-to-r from-[#20C77A] to-[#129A5B] text-[#07241C] font-bold text-xs shadow-md shadow-[#20C77A]/20 hover:brightness-110 active:scale-95 cursor-pointer"
          >
            <Sparkles className="w-3.5 h-3.5 text-[#07241C]" />
            <span className="hidden sm:inline">Pregunta a AgroDecide</span>
            <span className="sm:hidden">IA</span>
          </button>
        </div>
      </div>

      {/* Mobile/Tablet Nav Scroller */}
      <div className="nav-rail border-t"><nav ref={rail} className="primary-nav whitespace-nowrap" aria-label="Navegación principal">
        {navItems.map((item) => {
          const isActive = currentTab === item.id;
          return (
            <button
              aria-current={isActive ? 'page' : undefined}
              key={item.id}
              onClick={() => onSelectTab(item.id)}
              className={`nav-item flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-xs font-medium shrink-0 cursor-pointer ${
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
      </nav></div>
    </header>
  );
};
