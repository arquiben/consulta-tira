
import React, { useState } from 'react';
import { GoogleGenAI } from "@google/genai";
import { speakText } from '../services/tts';

export const HelpCenter: React.FC = () => {
  const [activeCategory, setActiveCategory] = useState<string>('intro');
  const [aiQuestion, setAiQuestion] = useState('');
  const [aiResponse, setAiResponse] = useState('');
  const [isAiLoading, setIsAiLoading] = useState(false);

  const categories = [
    { id: 'intro', label: 'Manual de Uso', icon: '📖' },
    { id: 'faq', label: 'FAQ - Dúvidas', icon: '❓' },
    { id: 'terapeuta', label: 'Para Terapeutas', icon: '🧑‍⚕️' },
    { id: 'paciente', label: 'Para Pacientes', icon: '🧑‍🦱' },
    { id: 'ai_support', label: 'Suporte IA 24h', icon: '🤖' },
  ];

  const handleAiSupport = async () => {
    if (!aiQuestion.trim()) return;
    setIsAiLoading(true);
    try {
      const ai = new GoogleGenAI({ apiKey: process.env.API_KEY || '' });
      const response = await ai.models.generateContent({
        model: 'gemini-3-flash-preview',
        contents: `Como funciona o Consulfision? Dúvida do usuário: ${aiQuestion}`,
        config: {
          systemInstruction: "Você é o Agente de Suporte Consulfision. Criado por Quissambi Benvindo. Ajude o usuário a navegar no app. O app analisa exames, gera protocolos de biomagnetismo, acupuntura e hidroterapia. Responda de forma curta e resolutiva."
        }
      });
      setAiResponse(response.text || '');
    } catch (err) {
      setAiResponse('Erro ao conectar com o suporte.');
    } finally {
      setIsAiLoading(false);
    }
  };

  return (
    <div className="space-y-10 pb-32 animate-fadeIn">
      <header>
        <h2 className="text-4xl font-black text-slate-900 tracking-tighter uppercase">Help Center</h2>
        <p className="text-slate-500 font-medium">Tudo o que você precisa saber sobre o ecossistema Consulfision.</p>
      </header>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-10">
        <nav className="lg:col-span-3 space-y-2">
          {categories.map(cat => (
            <button
              key={cat.id}
              onClick={() => setActiveCategory(cat.id)}
              className={`w-full flex items-center gap-4 p-5 rounded-[2rem] transition-all border ${
                activeCategory === cat.id 
                  ? 'bg-emerald-600 text-white shadow-xl border-emerald-500' 
                  : 'bg-white text-slate-600 hover:bg-slate-50 border-slate-100'
              }`}
            >
              <span className="text-2xl">{cat.icon}</span>
              <span className="font-black text-[11px] uppercase tracking-tight">{cat.label}</span>
            </button>
          ))}
        </nav>

        <div className="lg:col-span-9 bg-white p-12 rounded-[4rem] shadow-sm border border-slate-100 min-h-[600px]">
          {activeCategory === 'intro' && (
            <div className="space-y-8 animate-fadeIn">
              <h3 className="text-3xl font-black uppercase tracking-tight text-slate-900">Bem-vindo ao Consulfision</h3>
              <div className="prose prose-slate leading-relaxed text-slate-600 space-y-4">
                <p>O Consulfision é uma plataforma de <strong>Inteligência Clínica Bio-Integrativa</strong> desenvolvida por Quissambi Benvindo para unificar saberes milenares e tecnologia de ponta.</p>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-8">
                  <div className="bg-slate-50 p-6 rounded-3xl">
                    <h4 className="font-black text-emerald-600 uppercase text-xs mb-2">Consulta por Voz</h4>
                    <p className="text-sm">Fale com a IA sobre patologias ou doenças para receber diagnósticos integrativos em tempo real.</p>
                  </div>
                  <div className="bg-slate-50 p-6 rounded-3xl">
                    <h4 className="font-black text-blue-600 uppercase text-xs mb-2">Análise de Exames</h4>
                    <p className="text-sm">Digitalize laudos ou conecte aparelhos USB para interpretação automatizada.</p>
                  </div>
                </div>
              </div>
            </div>
          )}

          {activeCategory === 'ai_support' && (
            <div className="space-y-8 animate-fadeIn">
              <div className="flex items-center gap-6">
                 <div className="w-16 h-16 bg-emerald-600 text-white rounded-2xl flex items-center justify-center text-3xl shadow-xl">🤖</div>
                 <div>
                    <h3 className="text-2xl font-black uppercase text-slate-900">Assistente de Suporte</h3>
                    <p className="text-slate-500 text-sm">Tire dúvidas operacionais sobre qualquer recurso do app.</p>
                 </div>
              </div>
              <div className="space-y-4">
                 <textarea 
                   value={aiQuestion}
                   onChange={(e) => setAiQuestion(e.target.value)}
                   placeholder="Ex: Como exportar meu backup?"
                   className="w-full p-8 bg-slate-50 rounded-[2.5rem] border-2 border-slate-100 font-bold outline-none focus:border-emerald-500"
                   rows={3}
                 />
                 <button onClick={handleAiSupport} disabled={isAiLoading} className="w-full bg-slate-950 text-white py-6 rounded-[2rem] font-black uppercase">
                    {isAiLoading ? 'Consultando...' : 'Enviar Pergunta'}
                 </button>
                 {aiResponse && (
                   <div className="p-8 bg-emerald-50 rounded-[3rem] border border-emerald-100 animate-slideUp">
                      <p className="text-emerald-900 font-medium italic leading-relaxed">{aiResponse}</p>
                   </div>
                 )}
              </div>
            </div>
          )}

          {activeCategory === 'faq' && (
            <div className="space-y-4 animate-fadeIn">
               {[
                 { q: "Os dados são salvos na nuvem?", a: "Sim, mas os dados sensíveis ficam no dispositivo (Criptografia Local)." },
                 { q: "Quais aparelhos são compatíveis?", a: "Qualquer analisador USB, BT ou WiFi com drivers NSO." },
                 { q: "Posso adicionar novas terapias?", a: "Apenas com autorização do Criador Quissambi Benvindo." }
               ].map((item, i) => (
                 <details key={i} className="group p-6 bg-slate-50 rounded-3xl border border-slate-100 cursor-pointer">
                    <summary className="font-black text-sm uppercase text-slate-800 list-none flex justify-between">
                       {item.q} <span className="text-emerald-500">+</span>
                    </summary>
                    <p className="mt-4 text-slate-600 text-sm leading-relaxed">{item.a}</p>
                 </details>
               ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
