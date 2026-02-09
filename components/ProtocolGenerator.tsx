
import React, { useState, useEffect, useRef } from 'react';
import { PatientData, AnalysisReport, Protocol } from '../types';
import { generateTherapyReport } from '../services/gemini';
import { speakText } from '../services/tts';
import { translations } from '../translations';

interface ProtocolGeneratorProps {
  patientData: PatientData | null;
  examData?: AnalysisReport | null;
}

export const ProtocolGenerator: React.FC<ProtocolGeneratorProps> = ({ patientData, examData }) => {
  const [loading, setLoading] = useState(false);
  const [report, setReport] = useState<AnalysisReport | null>(examData || null);
  const [isSpeaking, setIsSpeaking] = useState(false);
  const audioRef = useRef<{ source: AudioBufferSourceNode, audioCtx: AudioContext } | null>(null);
  
  const handleGenerate = async () => {
    if (!patientData?.complaints) return;
    setLoading(true);
    try {
      const prompt = "Gere uma análise de fusão Neuro-Quantum, protocolos de Biomagnetismo, Acupuntura, e verifique necessidade de Fármacos, Fitoterápicos e Hidroterapia.";
      const response = await generateTherapyReport(prompt, undefined, patientData);
      setReport(response);
    } catch (err) {
      alert("Erro na geração da inteligência clínica.");
    } finally {
      setLoading(false);
    }
  };

  const handleSpeak = async () => {
    if (isSpeaking) {
      audioRef.current?.source.stop();
      setIsSpeaking(false);
      return;
    }
    if (report?.summary) {
      const textToSpeak = `Relatório Consulfision. ${report.summary}. Protocolos de tratamento integrativo e recomendações farmacológicas detectadas.`;
      const result = await speakText(textToSpeak);
      if (result) {
        audioRef.current = result;
        result.source.start();
        setIsSpeaking(true);
        result.source.onended = () => setIsSpeaking(false);
      }
    }
  };

  useEffect(() => {
    if (patientData?.complaints && !report && !loading && !examData) {
      handleGenerate();
    }
  }, [patientData]);

  if (loading) {
    return (
      <div className="h-[60vh] flex flex-col items-center justify-center space-y-12 animate-pulse">
        <div className="relative">
          <div className="w-32 h-32 border-[12px] border-slate-100 border-t-emerald-600 rounded-full animate-spin"></div>
          <div className="absolute inset-0 flex items-center justify-center text-4xl">🧠</div>
        </div>
        <div className="text-center space-y-4">
          <h2 className="text-3xl font-black text-slate-900 uppercase tracking-tighter italic">Processando Inteligência Clínica</h2>
          <p className="text-slate-400 font-black uppercase tracking-[0.4em] text-xs">Avaliando Bio-Fármacos e Protocolos NSO</p>
        </div>
      </div>
    );
  }

  if (!report) return null;

  return (
    <div className="space-y-10 pb-32 animate-fadeIn max-w-6xl mx-auto">
      <header className="flex flex-col md:flex-row justify-between items-center gap-6 print:hidden">
        <div className="flex bg-slate-100 p-2 rounded-[2rem] shadow-inner">
           <div className="px-8 py-3 bg-white text-emerald-900 rounded-2xl shadow-sm font-black text-xs uppercase tracking-widest border border-emerald-100">
             Relatório Consulfision v2026.1
           </div>
        </div>
        <div className="flex gap-4">
          <button onClick={handleSpeak} className={`px-10 py-5 rounded-2xl font-black text-xs uppercase tracking-widest shadow-2xl transition-all flex items-center gap-4 ${isSpeaking ? 'bg-red-500 text-white shadow-red-200' : 'bg-emerald-600 text-white hover:bg-emerald-500'}`}>
            {isSpeaking ? '⏹️ Parar Narrador' : '🔊 Ouvir Diagnóstico'}
          </button>
          <button onClick={() => window.print()} className="bg-slate-900 text-white px-10 py-5 rounded-2xl font-black text-xs uppercase tracking-widest shadow-2xl hover:bg-slate-800">
             🖨️ Exportar Documento
          </button>
        </div>
      </header>

      <div className="bg-white rounded-[4rem] shadow-sm border border-slate-100 overflow-hidden print:shadow-none print:border-none">
        <div className="bg-slate-950 p-14 text-white relative overflow-hidden">
           <div className="relative z-10 flex flex-col md:flex-row justify-between items-start md:items-center gap-10">
              <div className="flex items-center gap-8">
                 <div className="w-24 h-24 bg-emerald-500 text-slate-950 rounded-[2.5rem] flex items-center justify-center text-5xl shadow-3xl">🧬</div>
                 <div>
                    <h1 className="text-4xl font-black tracking-tighter uppercase leading-none mb-2">Parecer Bio-Integrativo</h1>
                    <p className="text-emerald-400 text-xs font-black uppercase tracking-[0.4em]">NSOFISION Intelligence System</p>
                 </div>
              </div>
              <div className="bg-white/5 p-6 rounded-[2rem] border border-white/10 text-center">
                 <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">Status de Saúde</p>
                 <p className={`text-xl font-black uppercase ${report.emergencyLevel === 'critical' ? 'text-red-500' : 'text-emerald-500'}`}>
                   {report.emergencyLevel}
                 </p>
              </div>
           </div>
           <div className="absolute top-0 right-0 w-96 h-96 bg-emerald-500/10 rounded-full blur-[120px] -mr-48 -mt-48"></div>
        </div>

        <div className="p-14 space-y-20">
           <section className="relative">
              <div className="flex items-center gap-4 mb-8">
                 <h3 className="text-xs font-black text-slate-400 uppercase tracking-[0.3em]">01. Conclusão Clínica</h3>
                 <div className="h-px bg-slate-100 flex-1"></div>
              </div>
              <div className="bg-slate-50 p-14 rounded-[3.5rem] relative border border-slate-100">
                 <p className="text-slate-900 text-2xl font-medium leading-relaxed italic text-center px-10">
                   {report.summary}
                 </p>
                 <div className="absolute top-8 left-8 text-7xl opacity-5 font-serif">"</div>
                 <div className="absolute bottom-8 right-8 text-7xl opacity-5 font-serif rotate-180">"</div>
              </div>
           </section>

           {report.suggestedProtocols.map((p: Protocol, i: number) => (
             <section key={i} className="space-y-12">
                <div className="flex items-center gap-4">
                   <h3 className="text-xs font-black text-slate-400 uppercase tracking-[0.3em]">Protocolo: {p.therapy}</h3>
                   <div className="h-px bg-slate-100 flex-1"></div>
                </div>

                <div className="grid grid-cols-1 lg:grid-cols-2 gap-10">
                   {p.neuroSteps && p.neuroSteps.length > 0 && (
                     <div className="bg-slate-950 text-white p-12 rounded-[3.5rem] shadow-2xl space-y-8 relative overflow-hidden">
                        <div className="flex items-center gap-4">
                           <span className="text-3xl">🧠</span>
                           <h4 className="text-2xl font-black uppercase tracking-tighter">Fase Neuro</h4>
                        </div>
                        <ul className="space-y-4">
                           {p.neuroSteps.map((step: string, si: number) => (
                             <li key={si} className="flex gap-4 items-center bg-white/5 p-4 rounded-2xl border border-white/5">
                                <span className="w-8 h-8 bg-emerald-500 text-slate-950 rounded-lg flex items-center justify-center font-black text-xs shrink-0">{si+1}</span>
                                <p className="text-sm">{step}</p>
                             </li>
                           ))}
                        </ul>
                     </div>
                   )}

                   {p.quantumSteps && p.quantumSteps.length > 0 && (
                     <div className="bg-emerald-900 text-white p-12 rounded-[3.5rem] shadow-2xl space-y-8 relative overflow-hidden">
                        <div className="flex items-center gap-4">
                           <span className="text-3xl">🌌</span>
                           <h4 className="text-2xl font-black uppercase tracking-tighter">Fase Quantum</h4>
                        </div>
                        <ul className="space-y-4">
                           {p.quantumSteps.map((step: string, si: number) => (
                             <li key={si} className="flex gap-4 items-center bg-black/10 p-4 rounded-2xl border border-white/5">
                                <span className="w-8 h-8 bg-white text-emerald-900 rounded-lg flex items-center justify-center font-black text-xs shrink-0">{si+1}</span>
                                <p className="text-sm">{step}</p>
                             </li>
                           ))}
                        </ul>
                     </div>
                   )}
                </div>

                {/* Seção de Fármacos e Fitoterápicos */}
                {( (p.suggestedPhytotherapeutics && p.suggestedPhytotherapeutics.length > 0) || (p.suggestedPharmaceuticals && p.suggestedPharmaceuticals.length > 0) ) && (
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-10">
                    {p.suggestedPhytotherapeutics && p.suggestedPhytotherapeutics.length > 0 && (
                      <div className="bg-emerald-50 p-10 rounded-[3rem] border border-emerald-100 shadow-sm space-y-6">
                        <div className="flex items-center gap-4">
                          <span className="text-3xl">🌿</span>
                          <h4 className="text-xl font-black text-emerald-900 uppercase tracking-tight">Fitoterápicos Sugeridos</h4>
                        </div>
                        <ul className="space-y-3">
                          {p.suggestedPhytotherapeutics.map((item, idx) => (
                            <li key={idx} className="flex items-center gap-3 bg-white p-4 rounded-2xl border border-emerald-100 shadow-inner">
                              <span className="text-emerald-500">●</span>
                              <p className="text-sm font-bold text-slate-800 uppercase">{item}</p>
                            </li>
                          ))}
                        </ul>
                      </div>
                    )}

                    {p.suggestedPharmaceuticals && p.suggestedPharmaceuticals.length > 0 && (
                      <div className="bg-indigo-50 p-10 rounded-[3rem] border border-indigo-100 shadow-sm space-y-6">
                        <div className="flex items-center gap-4">
                          <span className="text-3xl">💊</span>
                          <h4 className="text-xl font-black text-indigo-900 uppercase tracking-tight">Fármacos Sugeridos</h4>
                        </div>
                        <ul className="space-y-3">
                          {p.suggestedPharmaceuticals.map((item, idx) => (
                            <li key={idx} className="flex items-center gap-3 bg-white p-4 rounded-2xl border border-indigo-100 shadow-inner">
                              <span className="text-indigo-500">●</span>
                              <p className="text-sm font-bold text-slate-800 uppercase">{item}</p>
                            </li>
                          ))}
                        </ul>
                        <p className="text-[10px] text-indigo-700 font-black uppercase tracking-widest text-center">Aviso: Consulte sempre um médico antes da ingestão.</p>
                      </div>
                    )}
                  </div>
                )}

                {p.hydroSteps && p.hydroSteps.length > 0 && (
                  <div className="bg-blue-900 text-white p-14 rounded-[4rem] shadow-3xl space-y-10 relative overflow-hidden border-b-[12px] border-blue-600">
                     <div className="flex flex-col md:flex-row justify-between items-center gap-8 relative z-10">
                        <div className="flex items-center gap-6">
                           <div className="w-20 h-20 bg-blue-400 text-blue-900 rounded-[2rem] flex items-center justify-center text-4xl shadow-xl animate-pulse">💧</div>
                           <div>
                              <h4 className="text-4xl font-black uppercase tracking-tighter leading-none mb-2">Hidroterapia NSO (30 Dias)</h4>
                              <p className="text-blue-300 text-xs font-black uppercase tracking-[0.4em]">Protocolo de Hidratação & Detox Disciplinar</p>
                           </div>
                        </div>
                        <div className="bg-white/10 p-6 rounded-[2rem] border border-white/10 text-center backdrop-blur-md">
                           <p className="text-[10px] font-black uppercase tracking-widest mb-1 opacity-60">Meta Diária</p>
                           <p className="text-2xl font-black">{p.hydroSteps[1]?.amount || 'Calculado'}</p>
                        </div>
                     </div>

                     <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-5 lg:grid-cols-6 gap-4 relative z-10">
                        {p.hydroSteps.map((h: any, hi: number) => (
                          <div key={hi} className={`p-4 rounded-3xl border transition-all hover:scale-105 ${h.day === 1 ? 'bg-emerald-500 text-slate-900 border-emerald-400' : 'bg-white/5 border-white/10'}`}>
                             <p className="text-[9px] font-black uppercase opacity-60">Dia {h.day}</p>
                             <p className="text-[11px] font-black uppercase leading-tight mt-1">{h.day === 1 ? 'DETOX' : 'HIDRATAR'}</p>
                             <div className="mt-3 h-1 bg-white/20 rounded-full overflow-hidden">
                                <div className="h-full bg-white/60" style={{ width: '40%' }}></div>
                             </div>
                          </div>
                        ))}
                     </div>

                     <div className="bg-white/5 p-8 rounded-[2.5rem] border border-white/10 relative z-10">
                        <p className="text-sm font-medium leading-relaxed italic text-blue-100">
                           <strong className="text-blue-300">Instrução Disciplinar:</strong> {p.instructions} O Dia 1 é focado na desintoxicação total. Do Dia 2 ao 30, a ingestão de água deve ser rítmica a cada 2 horas.
                        </p>
                     </div>
                     <div className="absolute -bottom-20 -right-20 w-80 h-80 bg-blue-400/10 rounded-full blur-[100px]"></div>
                  </div>
                )}
             </section>
           ))}

           <footer className="pt-20 border-t border-slate-100 flex flex-col md:flex-row justify-between items-center gap-10 opacity-60">
              <div className="text-center md:text-left">
                 <p className="text-[10px] font-black text-slate-400 uppercase tracking-[0.5em] mb-2">Assinatura Digital NSO-BIT</p>
                 <p className="text-xs font-bold text-slate-900">Validado pela Escola NSOFISION • Quissambi Benvindo</p>
              </div>
              <div className="w-24 h-24 bg-slate-100 rounded-3xl flex items-center justify-center text-4xl grayscale">🛡️</div>
           </footer>
        </div>
      </div>
    </div>
  );
};
