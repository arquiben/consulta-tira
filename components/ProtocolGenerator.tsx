
import React, { useState, useEffect, useRef } from 'react';
import { PatientData, AnalysisReport, Protocol } from '../types';
import { generateTherapyReport } from '../services/gemini';
import { speakText } from '../services/tts';
import { useStore } from '../store/useStore';
import { FileDown, FileText, Cloud, Printer, CheckCircle2 } from 'lucide-react';

interface ProtocolGeneratorProps {
  patientData: PatientData | null;
  examData?: AnalysisReport | null;
  onReportGenerated?: (report: AnalysisReport) => void;
}

export const ProtocolGenerator: React.FC<ProtocolGeneratorProps> = ({ patientData, examData, onReportGenerated }) => {
  const [loading, setLoading] = useState(false);
  const [report, setReport] = useState<AnalysisReport | null>(examData || null);
  const [isSpeaking, setIsSpeaking] = useState(false);
  const [isSaving, setIsSaving] = useState<'pdf' | 'word' | 'cloud' | null>(null);
  const [error, setError] = useState<string | null>(null);
  const audioRef = useRef<{ source: AudioBufferSourceNode, audioCtx: AudioContext } | null>(null);
  
  const handleGenerate = async () => {
    if (!patientData) {
        setError("Nenhum paciente selecionado para análise.");
        return;
    }
    setLoading(true);
    setError(null);
    try {
      const prompt = "Gere uma análise de fusão Neuro-Quantum completa baseada nas queixas e marcadores anatômicos do paciente. Inclua protocolos detalhados de Biomagnetismo, Acupuntura, Fitoterapia e Hidroterapia NSO.";
      const response = await generateTherapyReport(prompt, undefined, patientData);
      setReport(response);
      if (onReportGenerated) onReportGenerated(response);
    } catch (err) {
      console.error(err);
      setError("Não foi possível gerar a inteligência clínica automática. Verifique a conexão.");
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
      const textToSpeak = `Relatório Consulfision para o paciente ${patientData?.name}. ${report.summary}. Foram identificados ${report.suggestedProtocols.length} protocolos de tratamento imediato.`;
      const result = await speakText(textToSpeak);
      if (result) {
        audioRef.current = result;
        result.source.start();
        setIsSpeaking(true);
        result.source.onended = () => setIsSpeaking(false);
      }
    }
  };

  const handleSave = (type: 'pdf' | 'word' | 'cloud') => {
    setIsSaving(type);
    const messages = {
      pdf: "Gerando laudo clínico em PDF...",
      word: "Exportando protocolo para Word...",
      cloud: "Sincronizando laudo com a nuvem NSO..."
    };
    speakText(messages[type]);
    setTimeout(() => {
      setIsSaving(null);
      speakText(`${type.toUpperCase()} salvo com sucesso.`);
    }, 2000);
  };

  useEffect(() => {
    if (examData) {
      setReport(examData);
    }
  }, [examData]);

  // Gatilho automático apenas se houver queixas e nenhum relatório atual
  useEffect(() => {
    if (patientData?.complaints && !report && !loading && !error) {
      handleGenerate();
    }
  }, [patientData]);

  if (loading) {
    return (
      <div className="h-[60vh] flex flex-col items-center justify-center space-y-12 animate-fadeIn">
        <div className="relative">
          <div className="w-40 h-40 border-[16px] border-slate-100 border-t-emerald-600 rounded-full animate-spin shadow-2xl"></div>
          <div className="absolute inset-0 flex items-center justify-center text-5xl">🧠</div>
        </div>
        <div className="text-center space-y-4">
          <h2 className="text-4xl font-black text-slate-900 uppercase tracking-tighter italic animate-pulse">Processando Bio-Ressonância</h2>
          <p className="text-slate-400 font-black uppercase tracking-[0.4em] text-[10px]">A IA NSOFISION está gerando protocolos personalizados agora...</p>
        </div>
      </div>
    );
  }

  if (!report) {
    return (
      <div className="h-[60vh] flex flex-col items-center justify-center text-center p-10 space-y-8 animate-fadeIn bg-white rounded-[3rem] border border-slate-100">
        <div className="w-24 h-24 bg-slate-50 rounded-full flex items-center justify-center text-5xl shadow-inner">📋</div>
        <div className="max-w-md space-y-4">
          <h3 className="text-2xl font-black text-slate-900 uppercase tracking-tight">Pronto para Análise</h3>
          <p className="text-slate-500 font-medium leading-relaxed">
            {patientData 
                ? `O paciente ${patientData.name} está ativo, mas o protocolo ainda não foi gerado.` 
                : "Selecione um paciente ou preencha a ficha clínica para gerar o protocolo."}
          </p>
          {error && <p className="text-red-500 font-black text-[10px] uppercase tracking-widest bg-red-50 p-3 rounded-xl">{error}</p>}
        </div>
        {patientData && (
            <button 
                onClick={handleGenerate}
                className="bg-emerald-600 text-white px-12 py-5 rounded-2xl font-black uppercase tracking-widest shadow-2xl hover:bg-emerald-700 transition-all flex items-center gap-4"
            >
                <span>⚡</span> Gerar Protocolo Agora
            </button>
        )}
      </div>
    );
  }

  return (
    <div className="space-y-10 pb-32 animate-fadeIn max-w-6xl mx-auto">
      <header className="flex flex-col md:flex-row justify-between items-center gap-6 print:hidden">
        <div className="flex bg-emerald-50 p-3 rounded-[2rem] shadow-inner border border-emerald-100">
           <div className="px-8 py-3 bg-white text-emerald-900 rounded-2xl shadow-sm font-black text-xs uppercase tracking-widest border border-emerald-100 flex items-center gap-3">
             <span className="w-2 h-2 bg-emerald-500 rounded-full animate-ping"></span>
             Resultados Gerados com Precisão
           </div>
        </div>
        <div className="flex gap-4">
          <button 
            onClick={handleSpeak} 
            className={`px-10 py-5 rounded-[2rem] font-black text-xs uppercase tracking-widest shadow-2xl transition-all flex items-center gap-4 ${isSpeaking ? 'bg-red-500 text-white animate-pulse' : 'bg-blue-600 text-white hover:bg-blue-700'}`}
          >
            {isSpeaking ? '⏹️ Parar Voz' : '🔊 Ouvir Relatório'}
          </button>
          <button 
            onClick={() => window.print()} 
            className="bg-slate-950 text-white px-10 py-5 rounded-[2rem] font-black text-xs uppercase tracking-widest shadow-2xl hover:bg-emerald-600 transition-all flex items-center gap-3"
          >
             🖨️ Imprimir Resultados
          </button>
        </div>
      </header>

      {/* Save Actions Bar */}
      <div className="flex flex-wrap gap-4 justify-center animate-fadeIn print:hidden">
        <button 
          onClick={() => handleSave('pdf')}
          disabled={!!isSaving}
          className="bg-white text-slate-900 px-8 py-4 rounded-2xl font-black text-[10px] uppercase tracking-widest shadow-xl hover:bg-emerald-50 transition-all flex items-center gap-3 border border-emerald-100"
        >
          {isSaving === 'pdf' ? <div className="w-4 h-4 border-2 border-emerald-600 border-t-transparent rounded-full animate-spin"></div> : <FileDown size={18} className="text-emerald-600" />}
          Salvar PDF
        </button>
        <button 
          onClick={() => handleSave('word')}
          disabled={!!isSaving}
          className="bg-white text-slate-900 px-8 py-4 rounded-2xl font-black text-[10px] uppercase tracking-widest shadow-xl hover:bg-blue-50 transition-all flex items-center gap-3 border border-blue-100"
        >
          {isSaving === 'word' ? <div className="w-4 h-4 border-2 border-blue-600 border-t-transparent rounded-full animate-spin"></div> : <FileText size={18} className="text-blue-600" />}
          Salvar Word
        </button>
        <button 
          onClick={() => handleSave('cloud')}
          disabled={!!isSaving}
          className="bg-slate-900 text-white px-8 py-4 rounded-2xl font-black text-[10px] uppercase tracking-widest shadow-xl hover:bg-slate-800 transition-all flex items-center gap-3"
        >
          {isSaving === 'cloud' ? <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div> : <Cloud size={18} className="text-emerald-400" />}
          Nuvem NSO
        </button>
      </div>

      <div className="bg-white rounded-[4.5rem] shadow-2xl border border-slate-100 overflow-hidden print:shadow-none print:border-none print:m-0 print:p-0">
        <div className="bg-slate-950 p-14 text-white relative overflow-hidden print:bg-white print:text-slate-950 print:p-6 print:border-b-4 print:border-slate-100">
           <div className="relative z-10 flex flex-col md:flex-row justify-between items-start md:items-center gap-10">
              <div className="flex items-center gap-8">
                 <div className="w-24 h-24 bg-emerald-500 text-slate-950 rounded-[2.5rem] flex items-center justify-center text-5xl shadow-3xl print:shadow-none print:w-16 print:h-16 print:text-3xl">🧬</div>
                 <div>
                    <h1 className="text-4xl font-black tracking-tighter uppercase leading-none mb-2 print:text-2xl">Laudo Clínico Integrativo</h1>
                    <p className="text-emerald-400 text-xs font-black uppercase tracking-[0.4em] print:text-slate-500">NSOFISION AI • Quissambi Benvindo • Relatório Digital</p>
                 </div>
              </div>
              <div className="bg-white/5 p-6 rounded-[2rem] border border-white/10 text-center print:border-slate-200 print:text-slate-950">
                 <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">Nível de Atenção</p>
                 <p className={`text-xl font-black uppercase ${report.emergencyLevel === 'critical' ? 'text-red-500' : 'text-emerald-500'}`}>
                   {report.emergencyLevel?.toUpperCase() || 'NORMAL'}
                 </p>
              </div>
           </div>
           <div className="absolute top-0 right-0 w-96 h-96 bg-emerald-500/10 rounded-full blur-[120px] -mr-48 -mt-48 print:hidden"></div>
        </div>

        <div className="p-14 space-y-16 print:p-6">
           {/* Patient Info for Print */}
           <div className="hidden print:block mb-10 border-b pb-8">
              <h3 className="text-xs font-black text-slate-400 uppercase tracking-widest mb-4">Informações do Registro</h3>
              <div className="grid grid-cols-3 gap-8">
                 <div><p className="text-[9px] font-bold text-slate-400 uppercase">Paciente</p><p className="font-black text-lg">{patientData?.name}</p></div>
                 <div><p className="text-[9px] font-bold text-slate-400 uppercase">Identificador</p><p className="font-mono font-bold">{patientData?.id}</p></div>
                 <div><p className="text-[9px] font-bold text-slate-400 uppercase">Data de Emissão</p><p className="font-black">{new Date().toLocaleDateString('pt-BR')}</p></div>
              </div>
           </div>

           <section className="relative">
              <div className="flex items-center gap-4 mb-8">
                 <h3 className="text-xs font-black text-slate-400 uppercase tracking-[0.3em]">01. Parecer da Inteligência Artificial</h3>
                 <div className="h-px bg-slate-100 flex-1"></div>
              </div>
              <div className="bg-slate-50 p-12 rounded-[3.5rem] relative border border-slate-100 print:bg-white print:border-none print:p-4">
                 <p className="text-slate-900 text-2xl font-medium leading-relaxed italic text-center px-10 print:text-lg print:px-0">
                   "{report.summary}"
                 </p>
              </div>
           </section>

           <div className="space-y-12">
              {report.suggestedExams && report.suggestedExams.length > 0 && (
                <section className="relative animate-slideUp">
                  <div className="flex items-center gap-4 mb-8">
                    <h3 className="text-xs font-black text-amber-800 uppercase tracking-[0.3em]">02. Exames Recomendados</h3>
                    <div className="h-px bg-amber-50 flex-1"></div>
                  </div>
                  <div className="bg-amber-50 p-10 rounded-[3.5rem] border border-amber-100 space-y-6">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      {report.suggestedExams.map((exam, idx) => (
                        <div key={idx} className="bg-white p-5 rounded-2xl border border-amber-200 flex items-center gap-4 shadow-sm">
                          <div className="w-10 h-10 bg-amber-100 text-amber-600 rounded-xl flex items-center justify-center text-xl">📝</div>
                          <p className="font-black text-xs text-slate-900 uppercase tracking-tight">{exam}</p>
                        </div>
                      ))}
                    </div>
                    <div className="flex justify-end">
                      <button 
                        onClick={() => {
                          const { setView } = useStore.getState();
                          setView('exam_request');
                        }}
                        className="bg-amber-600 text-white px-8 py-4 rounded-2xl font-black text-[10px] uppercase tracking-widest shadow-xl hover:bg-amber-700 transition-all flex items-center gap-3"
                      >
                        <span>📋</span> Formalizar Pedido de Exames
                      </button>
                    </div>
                  </div>
                </section>
              )}
             <div className="flex items-center gap-4">
                <h3 className="text-xs font-black text-emerald-800 uppercase tracking-[0.3em]">03. Protocolos de Intervenção</h3>
                <div className="h-px bg-emerald-50 flex-1"></div>
             </div>
             
             {report.suggestedProtocols.map((p: Protocol, i: number) => (
               <section key={i} className="space-y-6 break-inside-avoid border-b border-slate-50 pb-12 last:border-0">
                  <div className="flex flex-col md:flex-row gap-6 md:items-center justify-between">
                     <div className="flex items-center gap-4">
                        <div className="w-12 h-12 bg-emerald-600 text-white rounded-2xl flex items-center justify-center font-black text-xl">{i + 1}</div>
                        <div>
                           <h4 className="text-2xl font-black text-slate-950 uppercase tracking-tighter">{p.title}</h4>
                           <span className="bg-emerald-100 text-emerald-800 px-3 py-1 rounded-full text-[9px] font-black uppercase tracking-widest">{p.therapy}</span>
                        </div>
                     </div>
                     <div className="flex gap-4 text-center">
                        <div className="bg-slate-50 px-6 py-2 rounded-2xl border border-slate-100">
                           <p className="text-[8px] font-black text-slate-400 uppercase">Sessões</p>
                           <p className="font-black text-slate-900">{p.sessions}</p>
                        </div>
                        <div className="bg-slate-50 px-6 py-2 rounded-2xl border border-slate-100">
                           <p className="text-[8px] font-black text-slate-400 uppercase">Retorno</p>
                           <p className="font-black text-slate-900">{p.revaluationDays}d</p>
                        </div>
                     </div>
                  </div>

                  <div className="bg-white p-10 rounded-[3rem] border border-slate-100 shadow-sm print:p-4 print:border-none">
                     <p className="text-slate-600 mb-8 font-medium leading-relaxed italic text-lg">{p.instructions}</p>
                     
                     <div className="grid grid-cols-1 md:grid-cols-2 gap-10">
                        {p.steps && p.steps.length > 0 && (
                          <div className="space-y-4">
                             <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest flex items-center gap-2">
                                <span className="w-1.5 h-1.5 bg-emerald-500 rounded-full"></span>
                                Guia de Execução Clínica
                             </p>
                             <div className="space-y-3">
                                {p.steps.map((step, idx) => (
                                  <div key={idx} className="flex gap-4 items-start bg-slate-50 p-5 rounded-2xl border border-slate-100 transition-all hover:bg-white hover:shadow-md">
                                     <span className="w-6 h-6 bg-slate-950 text-white rounded-lg flex items-center justify-center text-[10px] font-black shrink-0">{idx+1}</span>
                                     <div className="space-y-1">
                                        <p className="font-black text-xs text-slate-900 uppercase tracking-tight">{step.action}</p>
                                        <p className="text-[10px] text-slate-500 leading-tight">{step.detail}</p>
                                     </div>
                                  </div>
                                ))}
                             </div>
                          </div>
                        )}

                        <div className="space-y-6">
                           {p.suggestedPhytotherapeutics && p.suggestedPhytotherapeutics.length > 0 && (
                             <div className="bg-emerald-50 p-8 rounded-[2.5rem] border border-emerald-100">
                                <p className="text-[9px] font-black text-emerald-800 uppercase tracking-widest mb-4">Apoio Fitoterápico</p>
                                <div className="flex flex-wrap gap-2">
                                   {p.suggestedPhytotherapeutics.map((item, idx) => (
                                      <span key={idx} className="bg-white px-4 py-2 rounded-xl text-[10px] font-black text-emerald-700 border border-emerald-100 uppercase shadow-sm">{item}</span>
                                   ))}
                                </div>
                             </div>
                           )}

                           {p.suggestedSupplements && p.suggestedSupplements.length > 0 && (
                             <div className="bg-amber-50 p-8 rounded-[2.5rem] border border-amber-100">
                                <p className="text-[9px] font-black text-amber-800 uppercase tracking-widest mb-4">Suplementação (Vitaminas & Minerais)</p>
                                <div className="flex flex-wrap gap-2">
                                   {p.suggestedSupplements.map((item, idx) => (
                                      <span key={idx} className="bg-white px-4 py-2 rounded-xl text-[10px] font-black text-amber-700 border border-amber-100 uppercase shadow-sm">{item}</span>
                                   ))}
                                </div>
                             </div>
                           )}

                           {p.dietaryPlan && p.dietaryPlan.length > 0 && (
                             <div className="bg-indigo-50 p-8 rounded-[2.5rem] border border-indigo-100">
                                <p className="text-[9px] font-black text-indigo-800 uppercase tracking-widest mb-4">Plano Alimentar (Oncológico/Energético)</p>
                                <div className="space-y-2">
                                   {p.dietaryPlan.map((item, idx) => (
                                      <div key={idx} className="bg-white p-3 rounded-xl text-[10px] font-bold text-indigo-900 border border-indigo-100 flex items-center gap-3">
                                         <span className="w-1.5 h-1.5 bg-indigo-500 rounded-full"></span>
                                         {item}
                                      </div>
                                   ))}
                                </div>
                             </div>
                           )}

                           {p.suggestedPharmaceuticals && p.suggestedPharmaceuticals.length > 0 && (
                             <div className="bg-rose-50 p-8 rounded-[2.5rem] border border-rose-100">
                                <p className="text-[9px] font-black text-rose-800 uppercase tracking-widest mb-4">Orientação Farmacológica (Receita)</p>
                                <div className="flex flex-wrap gap-2">
                                   {p.suggestedPharmaceuticals.map((item, idx) => (
                                      <span key={idx} className="bg-white px-4 py-2 rounded-xl text-[10px] font-black text-rose-700 border border-rose-100 uppercase shadow-sm">{item}</span>
                                   ))}
                                </div>
                             </div>
                           )}

                           {p.frequencies && p.frequencies.length > 0 && (
                             <div className="bg-blue-50 p-8 rounded-[2.5rem] border border-blue-100">
                                <p className="text-[9px] font-black text-blue-800 uppercase tracking-widest mb-4">Frequências Vibracionais (Hz)</p>
                                <div className="flex flex-wrap gap-2">
                                   {p.frequencies.map((f, idx) => (
                                      <span key={idx} className="bg-white px-4 py-2 rounded-xl text-[10px] font-black text-blue-700 border border-blue-100 uppercase shadow-sm">{f}</span>
                                   ))}
                                </div>
                             </div>
                           )}
                        </div>
                     </div>
                  </div>
               </section>
             ))}
           </div>

           <footer className="pt-20 border-t border-slate-100 flex flex-col md:flex-row justify-between items-center gap-10 opacity-60 print:pt-10 print:opacity-100 print:text-slate-400 print:border-slate-100">
              <div className="text-center md:text-left">
                 <p className="text-[10px] font-black uppercase tracking-[0.5em] mb-2">Autenticação Consulfision 2026</p>
                 <p className="text-xs font-bold text-slate-900">Documento gerado por IA Clínica NSOFISION • Quissambi Benvindo</p>
              </div>
              <div className="w-24 h-24 bg-slate-50 rounded-3xl flex items-center justify-center text-4xl grayscale print:w-16 print:h-16 print:text-2xl">🛡️</div>
           </footer>
        </div>
      </div>
    </div>
  );
};
