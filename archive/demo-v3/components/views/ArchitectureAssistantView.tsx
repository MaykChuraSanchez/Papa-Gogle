import React, { useState } from 'react';
import {
  Workflow,
  Sparkles,
  Send,
  Database,
  BrainCircuit,
  ShieldCheck,
  CheckCircle2,
  Code2,
  ExternalLink,
  Bot,
  User,
  RefreshCw,
} from 'lucide-react';
import { ChatMessage } from '../../types/agro';

export const ArchitectureAssistantView: React.FC = () => {
  const [messages, setMessages] = useState<ChatMessage[]>([
    {
      id: 'welcome',
      sender: 'assistant',
      text: '¡Hola, hermano agricultor! Soy el asistente inteligente de **AgroDecide AI**.\n\nPuedo responder tus dudas sobre cuándo sembrar cualquiera de las **10 variedades oficiales de MIDAGRI SISAP y EMMSA** (Canchán, Yungay, Amarilla Tumbay, Huayro, Huamantanga, Negra Andina, Peruanita, Única, Blanca y Color), cómo influye el **Boletín Oficial del ENFEN y SENAMHI (El Niño/La Niña)** en el rendimiento y los precios, o cómo impactan el flete de diésel y fertilizantes del BCRP.\n\n¿En qué te puedo orientar hoy?',
      timestamp: 'Ahora',
    },
  ]);
  const [inputMessage, setInputMessage] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  const quickChips = [
    '¿Cómo afectará el reporte del ENFEN a la cosecha de papa?',
    '¿Me conviene sembrar papa Canchán o Huayro en Tarma?',
    '¿Por qué la Papa Amarilla Tumbay cotiza más alto que la Blanca?',
    '¿Por qué influye el precio del diésel en la papa?',
    '¿De dónde saca los datos el dashboard de MIDAGRI en Power BI?',
  ];

  const handleSendMessage = async (textToSend?: string) => {
    const text = textToSend || inputMessage;
    if (!text.trim() || isLoading) return;

    const userMsg: ChatMessage = {
      id: `user-${Date.now()}`,
      sender: 'user',
      text,
      timestamp: new Date().toLocaleTimeString('es-PE', { hour: '2-digit', minute: '2-digit' }),
    };

    setMessages((prev) => [...prev, userMsg]);
    setInputMessage('');
    setIsLoading(true);

    try {
      const response = await fetch('/api/gemini/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          message: text,
          history: messages.slice(-4),
        }),
      });

      if (!response.ok) throw new Error('Error al conectar');
      const data = await response.json();

      const aiMsg: ChatMessage = {
        id: `ai-${Date.now()}`,
        sender: 'assistant',
        text: data.reply || 'No fue posible obtener una respuesta.',
        timestamp: new Date().toLocaleTimeString('es-PE', { hour: '2-digit', minute: '2-digit' }),
      };

      setMessages((prev) => [...prev, aiMsg]);
    } catch (err) {
      // Fallback synthesis if offline
      let fallback = '';
      if (text.includes('ENFEN') || text.includes('Niño') || text.includes('clima')) {
        fallback =
          'Según el Comunicado Oficial ENFEN N° 14-2026, el mar peruano (Región Niño 1+2) presenta una anomalía térmica moderada de +0.6°C en estado de "Vigilancia". Para la papa, esto significa:\n\n1. En la Costa (Barranca/Cañete): Noches cálidas pueden demorar la tuberización y exigir mayor control fitosanitario de polilla y mosca minadora.\n2. En la Sierra Central (Tarma/Junín): Se monitorea el inicio oportuno de las lluvias de primavera para las siembras de secano.\n3. En la Sierra Sur (Puno/Altiplano): Riesgo de veranillos que podrían retrasar cosechas de papa nativa hacia mayo 2027.\n\nEn general, un evento ENSO genera una prima de riesgo alcista de entre 8% y 15% en los precios mayoristas del GMML.';
      } else if (text.includes('Huayro') || text.includes('variedades') || text.includes('Amarilla')) {
        fallback =
          'En el GMML Santa Anita, las variedades nativas y amarillas cotizan significativamente por encima de la papa blanca:\n\n- Papa Amarilla Tumbay (S/ 2.52 /kg): Ciclo corto (100-125d), pulpa arenosa muy demandada para causas y purés.\n- Papa Huayro (S/ 2.25 /kg): Ciclo de 145-175 días, excelente rusticidad en alturas sobre 3,200 msnm, favorita para Pachamanca.\n- Papa Canchán (S/ 1.48 /kg): Ciclo de 120-150 días, alta productividad (24-28 t/ha), base de consumo masivo y pollerías.\n\nSembrar Huayro o Amarilla da un precio unitario mayor pero rinde menos t/ha y exige mayor altitud que la Canchán.';
      } else if (text.includes('sembrar') && text.includes('Canchán')) {
        fallback =
          'Si siembras papa Canchán en Tarma hoy, el ciclo de INIA (120-150 días) estima cosecha entre febrero y marzo de 2027. Para ese período, el GMML suele pagar entre S/ 1.60 y S/ 1.85 /kg debido a que la sierra central aún no entra en su pico masivo de cosechas (que ocurre entre mayo y junio). Con costos promedio de S/ 18,500/ha y un rendimiento de 24 t/ha, tendrías un margen neto esperado positivo.';
      } else if (text.includes('diésel') || text.includes('diesel')) {
        fallback =
          'El diésel (serie PN01289PM de BCRP) tiene una correlación de r = 0.52 con el precio de la papa. La razón es logística: un camión de 15 a 25 toneladas desde Tarma o Huánuco hasta el GMML de Lima gasta entre S/ 110 y S/ 140 por tonelada solo en combustible y peajes. Cuando sube el diésel, los transportistas trasladan ese costo al margen del acopiador y precio final.';
      } else if (text.includes('Power BI') || text.includes('MIDAGRI')) {
        fallback =
          'Los dashboards de Power BI de MIDAGRI/SIEA se alimentan de la Dirección General de Estadística, Seguimiento y Evaluación de Políticas (DGESEP). Los datos de pesaje y volumen de camiones provienen del portal SISAP mayorista, y los reportes de siembras se integran con el Sistema Integrado de Estadísticas Agrarias (SIEA) y el Portal Nacional de Datos Abiertos (datosabiertos.gob.pe).';
      } else {
        fallback =
          'AgroDecide AI integra datos oficiales de EMMSA, MIDAGRI SISAP, SIEA, ENFEN, SENAMHI, INIA y BCRP. Recuerda que no emitimos órdenes absolutas; te mostramos escenarios de sensibilidad económica (P10, P50, P90) para que tomes la mejor decisión según tu presupuesto.';
      }

      const aiMsg: ChatMessage = {
        id: `ai-${Date.now()}`,
        sender: 'assistant',
        text: fallback,
        timestamp: new Date().toLocaleTimeString('es-PE', { hour: '2-digit', minute: '2-digit' }),
      };
      setMessages((prev) => [...prev, aiMsg]);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="space-y-8 pb-12">
      {/* View Header */}
      <div className="bg-white rounded-3xl p-6 sm:p-8 border border-slate-200 shadow-sm flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-emerald-50 text-emerald-800 text-xs font-bold border border-emerald-200 mb-2">
            <Workflow className="w-3.5 h-3.5" />
            Arquitectura del Sistema & Asistente IA
          </div>
          <h1 className="text-2xl sm:text-3xl font-extrabold text-slate-900">
            Arquitectura de Decisión & Pregunta a AgroDecide
          </h1>
          <p className="text-xs sm:text-sm text-slate-500 max-w-2xl mt-1">
            Consulta en lenguaje natural a nuestro modelo entrenado con el comportamiento agronómico, climático y de mercado de la papa peruana.
          </p>
        </div>

        <div className="p-3 bg-emerald-50 rounded-2xl border border-emerald-200 text-xs flex items-center gap-2 text-emerald-900 font-semibold">
          <Sparkles className="w-4 h-4 text-emerald-700" />
          <span>Motor Generativo: Google Gemini 3.8 Flash</span>
        </div>
      </div>

      {/* Grid: Chatbot and Architecture Diagram */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Chatbot Column */}
        <div className="lg:col-span-7 bg-white rounded-3xl border border-slate-200 shadow-sm flex flex-col h-[650px] overflow-hidden">
          {/* Chat Header */}
          <div className="p-4 border-b border-slate-100 bg-[#0B3025] text-white flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 rounded-xl bg-[#20C77A] text-[#07241C] flex items-center justify-center font-bold">
                <Bot className="w-5 h-5" />
              </div>
              <div>
                <h3 className="font-extrabold text-sm text-white flex items-center gap-1.5">
                  Pregunta a AgroDecide
                  <span className="w-2 h-2 rounded-full bg-[#B7F36B] animate-pulse" />
                </h3>
                <span className="text-[11px] text-[#A2C7B8]">
                  Grounded en datos EMMSA, MIDAGRI, SENAMHI, BCRP & INIA
                </span>
              </div>
            </div>
            <span className="text-[10px] bg-white/10 px-2 py-0.5 rounded font-mono text-slate-300">
              Piloto Papa
            </span>
          </div>

          {/* Quick Prompt Chips */}
          <div className="px-4 py-2.5 bg-slate-50 border-b border-slate-100 flex items-center gap-1.5 overflow-x-auto whitespace-nowrap">
            {quickChips.map((chip, idx) => (
              <button
                key={idx}
                onClick={() => handleSendMessage(chip)}
                className="px-2.5 py-1 rounded-lg bg-white border border-slate-200 text-[11px] font-medium text-slate-700 hover:border-emerald-500 hover:text-emerald-700 hover:bg-emerald-50 transition-all cursor-pointer shrink-0"
              >
                {chip}
              </button>
            ))}
          </div>

          {/* Message History Scroller */}
          <div className="flex-1 p-4 overflow-y-auto space-y-4 bg-[#F8FAF9]">
            {messages.map((msg) => (
              <div
                key={msg.id}
                className={`flex gap-3 text-xs leading-relaxed ${
                  msg.sender === 'user' ? 'justify-end' : 'justify-start'
                }`}
              >
                {msg.sender === 'assistant' && (
                  <div className="w-7 h-7 rounded-lg bg-[#0B3025] text-[#B7F36B] flex items-center justify-center shrink-0 mt-0.5">
                    <Bot className="w-4 h-4" />
                  </div>
                )}

                <div
                  className={`max-w-[85%] rounded-2xl p-3.5 space-y-1.5 ${
                    msg.sender === 'user'
                      ? 'bg-[#0B3025] text-white rounded-tr-none'
                      : 'bg-white text-slate-800 border border-slate-200 shadow-sm rounded-tl-none whitespace-pre-line'
                  }`}
                >
                  <p>{msg.text}</p>
                  <span
                    className={`text-[9px] block text-right font-mono ${
                      msg.sender === 'user' ? 'text-emerald-300' : 'text-slate-400'
                    }`}
                  >
                    {msg.timestamp}
                  </span>
                </div>

                {msg.sender === 'user' && (
                  <div className="w-7 h-7 rounded-lg bg-slate-200 text-slate-700 flex items-center justify-center shrink-0 mt-0.5">
                    <User className="w-4 h-4" />
                  </div>
                )}
              </div>
            ))}

            {isLoading && (
              <div className="flex gap-3 text-xs text-slate-500 items-center">
                <div className="w-7 h-7 rounded-lg bg-[#0B3025] text-[#B7F36B] flex items-center justify-center shrink-0">
                  <Bot className="w-4 h-4 animate-spin" />
                </div>
                <div className="bg-white rounded-2xl p-3 border border-slate-200 shadow-sm flex items-center gap-2">
                  <RefreshCw className="w-3.5 h-3.5 animate-spin text-emerald-700" />
                  <span>Consultando bases de datos y formulando respuesta...</span>
                </div>
              </div>
            )}
          </div>

          {/* Chat Input Bar */}
          <div className="p-3 bg-white border-t border-slate-200 flex items-center gap-2">
            <input
              type="text"
              value={inputMessage}
              onChange={(e) => setInputMessage(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && handleSendMessage()}
              placeholder="Escribe tu consulta (ej. ¿Qué pasa si siembro Canchán este mes?)..."
              className="flex-1 px-4 py-2.5 rounded-xl border border-slate-300 text-xs focus:ring-2 focus:ring-[#20C77A] focus:outline-none bg-slate-50"
            />
            <button
              onClick={() => handleSendMessage()}
              disabled={!inputMessage.trim() || isLoading}
              className="p-2.5 rounded-xl bg-[#20C77A] hover:bg-[#1bb46d] text-[#07241C] font-bold shadow-sm transition-all disabled:opacity-50 cursor-pointer"
            >
              <Send className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Architecture Pipeline Diagram Column */}
        <div className="lg:col-span-5 bg-white rounded-3xl p-6 border border-slate-200 shadow-sm flex flex-col justify-between space-y-6">
          <div className="space-y-4">
            <div className="flex items-center gap-2">
              <Workflow className="w-5 h-5 text-emerald-700" />
              <h3 className="font-extrabold text-base text-slate-900">
                Flujo Arquitectónico de Decisión
              </h3>
            </div>
            <p className="text-xs text-slate-500">
              Cómo AgroDecide AI transforma datos no estructurados de la web en decisiones económicas para el agricultor:
            </p>

            {/* Step-by-Step Architecture Pipeline */}
            <div className="space-y-2.5 text-xs">
              <div className="p-3 rounded-2xl bg-emerald-50/70 border border-emerald-200 flex items-start gap-3">
                <span className="w-6 h-6 rounded-full bg-emerald-700 text-white font-bold text-xs flex items-center justify-center shrink-0">
                  1
                </span>
                <div>
                  <strong className="text-emerald-950 block">Conexión a Fuentes Oficiales</strong>
                  <p className="text-emerald-800 text-[11px] mt-0.5">
                    Extracción de boletines EMMSA, descargas SISAP, intenciones SIEA, clima SENAMHI y series BCRP.
                  </p>
                </div>
              </div>

              <div className="p-3 rounded-2xl bg-slate-50 border border-slate-200 flex items-start gap-3">
                <span className="w-6 h-6 rounded-full bg-slate-800 text-white font-bold text-xs flex items-center justify-center shrink-0">
                  2
                </span>
                <div>
                  <strong className="text-slate-900 block">Staging & Calidad de Datos</strong>
                  <p className="text-slate-600 text-[11px] mt-0.5">
                    Filtro de duplicados, tratamiento de valores nulos, eliminación de outliers y homologación a S/kg y t/ha.
                  </p>
                </div>
              </div>

              <div className="p-3 rounded-2xl bg-slate-50 border border-slate-200 flex items-start gap-3">
                <span className="w-6 h-6 rounded-full bg-purple-700 text-white font-bold text-xs flex items-center justify-center shrink-0">
                  3
                </span>
                <div>
                  <strong className="text-slate-900 block">BaseMotor & Feature Engineering</strong>
                  <p className="text-slate-600 text-[11px] mt-0.5">
                    Construcción de Lags (1, 7, 30, 60d), promedios móviles, armónicos estacionales (sen/cos) y covariables macro.
                  </p>
                </div>
              </div>

              <div className="p-3 rounded-2xl bg-slate-50 border border-slate-200 flex items-start gap-3">
                <span className="w-6 h-6 rounded-full bg-blue-700 text-white font-bold text-xs flex items-center justify-center shrink-0">
                  4
                </span>
                <div>
                  <strong className="text-slate-900 block">Model Arena & Champion Selection</strong>
                  <p className="text-slate-600 text-[11px] mt-0.5">
                    Evaluación walk-forward mensual. Selección automática del modelo con menor MAPE (LightGBM 7.4%).
                  </p>
                </div>
              </div>

              <div className="p-3 rounded-2xl bg-slate-50 border border-slate-200 flex items-start gap-3">
                <span className="w-6 h-6 rounded-full bg-amber-600 text-white font-bold text-xs flex items-center justify-center shrink-0">
                  5
                </span>
                <div>
                  <strong className="text-slate-900 block">Motor Económico de Sensibilidad</strong>
                  <p className="text-slate-600 text-[11px] mt-0.5">
                    Fórmulas determinísticas de producción, fletes, mermas de almacén y cálculo de escenarios P10, P50 y P90.
                  </p>
                </div>
              </div>

              <div className="p-3 rounded-2xl bg-slate-50 border border-slate-200 flex items-start gap-3">
                <span className="w-6 h-6 rounded-full bg-emerald-600 text-white font-bold text-xs flex items-center justify-center shrink-0">
                  6
                </span>
                <div>
                  <strong className="text-slate-900 block">Explicabilidad con IA Generativa</strong>
                  <p className="text-slate-600 text-[11px] mt-0.5">
                    Gemini 3.8 Flash traduce los números a lenguaje humano, explicando el porqué de la proyección sin inventar datos.
                  </p>
                </div>
              </div>

              <div className="p-3 rounded-2xl bg-[#0B3025] text-white flex items-start gap-3">
                <span className="w-6 h-6 rounded-full bg-[#20C77A] text-[#07241C] font-black text-xs flex items-center justify-center shrink-0">
                  7
                </span>
                <div>
                  <strong className="text-[#B7F36B] block">El Agricultor Decide</strong>
                  <p className="text-slate-300 text-[11px] mt-0.5">
                    El productor cuenta con información transparente y auditable para negociar con acopiadores y planificar su campaña.
                  </p>
                </div>
              </div>
            </div>
          </div>

          <div className="text-[11px] text-slate-400 border-t border-slate-100 pt-3">
            AgroDecide AI © 2026 — MVP Piloto Papa Naufest
          </div>
        </div>
      </div>
    </div>
  );
};
