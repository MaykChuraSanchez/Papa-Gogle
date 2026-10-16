import React, { useEffect, useRef, useState } from 'react';
import { Sprout } from 'lucide-react';
import { DataProvider } from './data/DataProvider';
import { useData } from './data/DataContext';
import { Navbar } from './components/Navbar';
import { Card, Home, Varieties, Planting, Harvest, ModelLab, Sources, Climate, Market, Assistant } from './components/ConnectedViews';
import { Dashboard } from './components/Dashboard';
import { Explorer } from './components/Explorer';
import { ResearchLab } from './components/ResearchLab';
import {ClimateInsights} from './components/ClimateInsights';
import { AssistantChat } from './components/AssistantChat';
import { freshness } from './utils/forecast';
import type { ViewTab } from './types/agro';
const tabs: ViewTab[] = ['home','sync','varieties','market','enfen','planting','harvest','modellab','architecture'];
function initialTab(): ViewTab {const hash=location.hash.slice(1) as ViewTab;return tabs.includes(hash)?hash:'home';}
function Platform() {
  const main=useRef<HTMLElement>(null);
  const firstVisit=useRef(true);
  const [tab,setTab]=useState<ViewTab>(initialTab);
  const {index,series,select,cached,error,retry}=useData();
  const navigate=(view:ViewTab)=>{setTab(view);location.hash=view;window.scrollTo({top:0,behavior:'instant'});};
  useEffect(()=>{const onHash=()=>setTab(initialTab());window.addEventListener('hashchange',onHash);return()=>window.removeEventListener('hashchange',onHash);},[]);
  useEffect(()=>{if(firstVisit.current){firstVisit.current=false;return;}main.current?.focus({preventScroll:true});},[tab]);
  const stale=series?freshness(series):'';
  return <div className="min-h-screen bg-[#F8FAF8] text-[#14211C] flex flex-col selection:bg-[#20C77A]/30">
    <a className="skip-link" href="#main">Ir al contenido</a>
    <Navbar currentTab={tab} onSelectTab={navigate} onOpenAssistant={()=>navigate('architecture')} onSelectVariety={v=>{select(v);navigate('varieties');}}/>
    <main key={tab} ref={main} tabIndex={-1} id="main" className="app-main flex-1 max-w-[1440px] w-full mx-auto px-4 sm:px-6 py-6 sm:py-8">
      {(cached||stale)&&<div className="rounded-xl bg-amber-50 border border-amber-200 text-amber-900 text-sm p-4 mb-6" role="status">{cached?'Estás viendo la última publicación guardada en este dispositivo. ':''}{stale}</div>}
      {error ? <Card><p role="alert">{error}</p><button className="primary mt-4" onClick={retry}>Reintentar</button></Card> : !index ? <Card><p role="status">Cargando publicación de datos…</p></Card> : <>
        {tab==='home'&&(series?<Dashboard navigate={navigate}/>:<Card>Cargando variedad…</Card>)}
        {tab==='varieties'&&<Explorer plant={()=>navigate('planting')}/>}
        {tab==='planting'&&<Planting/>}
        {tab==='harvest'&&(series?<Harvest/>:<Card>Cargando variedad…</Card>)}
        {tab==='modellab'&&<ResearchLab/>}
        {tab==='sync'&&<Sources/>}
        {tab==='enfen'&&<ClimateInsights navigate={navigate} fallback={<Climate/>}/>}
        {tab==='market'&&(series?<Market/>:<Card>Cargando variedad…</Card>)}
        {tab==='architecture'&&<AssistantChat navigate={navigate}/>}
      </>}
    </main>
    <footer className="app-footer bg-[#0B3025] text-white border-t border-[#174436] py-8 px-4 sm:px-6 mt-10"><div className="max-w-7xl mx-auto flex flex-wrap justify-between gap-5 items-center"><div className="flex gap-3 items-center"><div className="p-3 bg-[#20C77A]/20 rounded-xl"><Sprout className="text-[#B7F36B]"/></div><div><p className="font-extrabold">AgroDecide AI <span className="text-[#B7F36B] text-xs">· Mercado de papa</span></p><p className="text-xs text-[#A2C7B8] mt-1">Siembra con información. Cosecha con mejores decisiones.</p></div></div><div className="text-xs text-[#A2C7B8] max-w-md leading-relaxed">Precios mayoristas de Lima. Escenarios orientativos, con errores y limitaciones visibles.</div></div></footer>
  </div>;
}
export default function App(){return <DataProvider><Platform/></DataProvider>;}
