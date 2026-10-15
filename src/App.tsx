import React, { useState } from 'react';
import { ViewTab } from './types/agro';
import { Navbar } from './components/Navbar';
import { HomeView } from './components/views/HomeView';
import { DataSyncView } from './components/views/DataSyncView';
import { VarietiesBreakdownView } from './components/views/VarietiesBreakdownView';
import { MarketView } from './components/views/MarketView';
import { EnfenSenamhiView } from './components/views/EnfenSenamhiView';
import { PlantingSimulatorView } from './components/views/PlantingSimulatorView';
import { HarvestDecisionView } from './components/views/HarvestDecisionView';
import { ModelLabView } from './components/views/ModelLabView';
import { ArchitectureAssistantView } from './components/views/ArchitectureAssistantView';
import { Sprout, ExternalLink } from 'lucide-react';

export default function App() {
  const [currentTab, setCurrentTab] = useState<ViewTab>('home');
  const [selectedVarietyForPlanting, setSelectedVarietyForPlanting] = useState<string>('canchan');

  const handleOpenAssistant = () => {
    setCurrentTab('architecture');
  };

  const handleSelectVariety = (varId: string) => {
    setSelectedVarietyForPlanting(varId);
    setCurrentTab('varieties');
  };

  const handleVarietyChosenForPlanting = (varId: string) => {
    setSelectedVarietyForPlanting(varId);
    setCurrentTab('planting');
  };

  return (
    <div className="min-h-screen bg-[#F8FAF8] text-[#14211C] flex flex-col font-['Plus_Jakarta_Sans',sans-serif] selection:bg-[#20C77A]/30">
      {/* Top Navbar */}
      <Navbar
        currentTab={currentTab}
        onSelectTab={setCurrentTab}
        onOpenAssistant={handleOpenAssistant}
        onSelectVariety={handleSelectVariety}
      />

      {/* Main Content Area */}
      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 pt-6 sm:pt-8">
        {currentTab === 'home' && (
          <HomeView
            onNavigate={(tab) => setCurrentTab(tab)}
            onOpenAssistant={handleOpenAssistant}
          />
        )}
        {currentTab === 'sync' && <DataSyncView />}
        {currentTab === 'varieties' && (
          <VarietiesBreakdownView
            onNavigateTab={setCurrentTab}
            onSelectVarietyForPlanting={handleVarietyChosenForPlanting}
          />
        )}
        {currentTab === 'market' && <MarketView />}
        {currentTab === 'enfen' && (
          <EnfenSenamhiView
            onNavigateTab={setCurrentTab}
            onSelectVarietyForPlanting={handleVarietyChosenForPlanting}
          />
        )}
        {currentTab === 'planting' && (
          <PlantingSimulatorView initialVarietyId={selectedVarietyForPlanting} />
        )}
        {currentTab === 'harvest' && <HarvestDecisionView />}
        {currentTab === 'modellab' && <ModelLabView />}
        {currentTab === 'architecture' && <ArchitectureAssistantView />}
      </main>

      {/* Footer */}
      <footer className="bg-[#0B3025] text-white border-t border-[#174436] py-10 px-4 sm:px-6 mt-12 text-xs">
        <div className="max-w-7xl mx-auto flex flex-col md:flex-row items-center justify-between gap-6">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-[#20C77A] to-[#0E6845] flex items-center justify-center text-white font-bold">
              <Sprout className="w-5 h-5 text-white" />
            </div>
            <div>
              <div className="font-extrabold text-base tracking-tight text-white flex items-center gap-2">
                AgroDecide AI
                <span className="text-[10px] px-2 py-0.5 bg-[#20C77A]/20 border border-[#20C77A]/40 rounded-full text-[#B7F36B] font-bold">
                  Piloto Papa Canchán
                </span>
              </div>
              <p className="text-[11px] text-[#A2C7B8] mt-0.5">
                Siembra con información. Cosecha con mejores decisiones.
              </p>
            </div>
          </div>

          <div className="flex flex-wrap items-center justify-center gap-4 text-slate-300 text-[11px]">
            <a
              href="https://www.emmsa.com.pe/index.php/precios-diarios/"
              target="_blank"
              rel="noopener noreferrer"
              className="hover:text-[#B7F36B] transition-colors flex items-center gap-1"
            >
              EMMSA <ExternalLink className="w-3 h-3" />
            </a>
            <span>•</span>
            <a
              href="http://sistemas.midagri.gob.pe/sisap/portal2/mayorista/resumenes/consultar/#"
              target="_blank"
              rel="noopener noreferrer"
              className="hover:text-[#B7F36B] transition-colors flex items-center gap-1"
            >
              MIDAGRI SISAP <ExternalLink className="w-3 h-3" />
            </a>
            <span>•</span>
            <a
              href="https://siea.midagri.gob.pe/index.php"
              target="_blank"
              rel="noopener noreferrer"
              className="hover:text-[#B7F36B] transition-colors flex items-center gap-1"
            >
              MIDAGRI SIEA <ExternalLink className="w-3 h-3" />
            </a>
            <span>•</span>
            <a
              href="https://www.senamhi.gob.pe"
              target="_blank"
              rel="noopener noreferrer"
              className="hover:text-[#B7F36B] transition-colors flex items-center gap-1"
            >
              SENAMHI <ExternalLink className="w-3 h-3" />
            </a>
            <span>•</span>
            <a
              href="https://www.bcrp.gob.pe"
              target="_blank"
              rel="noopener noreferrer"
              className="hover:text-[#B7F36B] transition-colors flex items-center gap-1"
            >
              BCRP <ExternalLink className="w-3 h-3" />
            </a>
            <span>•</span>
            <a
              href="https://www.gob.pe/inia"
              target="_blank"
              rel="noopener noreferrer"
              className="hover:text-[#B7F36B] transition-colors flex items-center gap-1"
            >
              INIA <ExternalLink className="w-3 h-3" />
            </a>
          </div>

          <div className="text-[11px] text-slate-400 font-mono text-center md:text-right">
            NAUFEST 2026 Challenge • Datos Reales • Modelos Auditables
          </div>
        </div>
      </footer>
    </div>
  );
}
