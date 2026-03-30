
import React, { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { useStore } from '../store/useStore';
import { Brain, Zap, Activity, CheckCircle2, AlertCircle, Sparkles, Waves, ArrowLeft, Play, Info, RefreshCw, Loader2 } from 'lucide-react';
import { OFFICIAL_NSO_LIBRARY } from '../services/libraryNSO';
import { TherapyType } from '../types';
import { getGeminiAI, withRetry } from '../services/gemini';

export const NsofisionNero: React.FC = () => {
  const { setView, patientData } = useStore();
  const [selectedProtocol, setSelectedProtocol] = useState<any>(null);
  const [isRunning, setIsRunning] = useState(false);
  const [progress, setProgress] = useState(0);
  const [isAnalyzing, setIsAnalyzing] = useState(false);

  const neuroProtocols = OFFICIAL_NSO_LIBRARY.protocols.filter(p => p.therapy === TherapyType.NSOFISION);

  const runPredictiveAnalysis = async () => {
    if (!patientData) {
      alert("Selecione um paciente para análise preditiva.");
      return;
    }

    setIsAnalyzing(true);
    try {
      const ai = getGeminiAI();
      const prompt = `Com base no histórico do paciente:
      Nome: ${patientData.name}
      Queixas: ${patientData.complaints}
      Histórico: ${patientData.history}
      
      Qual destes protocolos de reprogramação neuro-emocional (Nsofision Nero) é o mais indicado?
      Protocolos: ${neuroProtocols.map(p => `${p.id}: ${p.title}`).join(', ')}
      
      Responda APENAS o ID do protocolo sugerido.`;

      const response = await withRetry(() => ai.models.generateContent({
        model: 'gemini-3-flash-preview',
        contents: [{ text: prompt }]
      }));

      const suggestedId = response.text?.trim();
      const found = neuroProtocols.find(p => p.id === suggestedId);
      if (found) {
        setSelectedProtocol(found);
      } else {
        // Fallback if AI output is messy
        const firstMatch = neuroProtocols.find(p => suggestedId?.includes(p.id));
        if (firstMatch) setSelectedProtocol(firstMatch);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setIsAnalyzing(false);
    }
  };

  const startProtocol = () => {
    setIsRunning(true);
    setProgress(0);
    const interval = setInterval(() => {
      setProgress(prev => {
        if (prev >= 100) {
          clearInterval(interval);
          setIsRunning(false);
          return 100;
        }
        return prev + 1;
      });
    }, 100);
  };

  return (
    <div className="space-y-8 pb-20">
      <header className="flex flex-col md:flex-row justify-between items-start md:items-center gap-6">
        <div className="flex items-center gap-4">
          <button 
            onClick={() => setView('dashboard')}
            className="w-10 h-10 bg-white border border-slate-200 rounded-full flex items-center justify-center shadow-sm text-slate-600 hover:text-emerald-600 transition-colors"
          >
            <ArrowLeft size={18} />
          </button>
          <div>
            <h2 className="text-4xl font-black text-slate-900 uppercase tracking-tighter leading-none">
              Nsofision <span className="text-emerald-600">Nero</span>
            </h2>
            <p className="text-slate-500 mt-2 font-medium">Protocolos de Reprogramação Neuro-Emocional Avançada</p>
          </div>
        </div>
        
        <div className="px-4 py-2 bg-emerald-50 text-emerald-600 rounded-full flex items-center gap-2 text-[10px] font-black uppercase tracking-widest">
          <Brain size={14} /> Sistema Ativo
        </div>
      </header>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Protocol List */}
        <div className="lg:col-span-1 space-y-4">
          <h3 className="text-sm font-black text-slate-400 uppercase tracking-widest px-2">Protocolos Disponíveis</h3>
          {neuroProtocols.map((p, i) => (
            <motion.button
              key={p.id}
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
              onClick={() => setSelectedProtocol(p)}
              className={`w-full p-6 rounded-[2rem] border text-left transition-all ${
                selectedProtocol?.id === p.id 
                  ? 'bg-slate-900 border-slate-900 text-white shadow-xl' 
                  : 'bg-white border-slate-100 text-slate-900 hover:border-emerald-200'
              }`}
            >
              <div className="flex justify-between items-start mb-4">
                <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${
                  selectedProtocol?.id === p.id ? 'bg-emerald-500 text-white' : 'bg-emerald-50 text-emerald-600'
                }`}>
                  <Zap size={20} />
                </div>
                <span className={`text-[8px] font-black uppercase tracking-widest px-2 py-1 rounded-md ${
                  selectedProtocol?.id === p.id ? 'bg-white/10 text-white' : 'bg-slate-100 text-slate-400'
                }`}>
                  {p.id}
                </span>
              </div>
              <h4 className="font-black uppercase tracking-tight leading-tight mb-1">{p.title}</h4>
              <p className={`text-[10px] font-medium leading-relaxed ${
                selectedProtocol?.id === p.id ? 'text-slate-400' : 'text-slate-500'
              }`}>
                {p.instructions}
              </p>
            </motion.button>
          ))}

          <div className="p-6 bg-emerald-600 rounded-[2rem] text-white space-y-4 shadow-lg shadow-emerald-100">
            <Sparkles size={32} className="opacity-50" />
            <h4 className="text-lg font-black uppercase tracking-tight leading-tight">IA Neuro-Predictiva</h4>
            <p className="text-xs font-medium opacity-80">
              Nossa IA analisa o histórico do paciente para sugerir o protocolo Nero mais adequado para o conflito biológico atual.
            </p>
            <button 
              onClick={runPredictiveAnalysis}
              disabled={isAnalyzing}
              className="w-full bg-white text-emerald-600 py-3 rounded-xl font-black text-[10px] uppercase tracking-widest flex items-center justify-center gap-2"
            >
              {isAnalyzing ? <Loader2 size={14} className="animate-spin" /> : <Sparkles size={14} />}
              Análise Preditiva
            </button>
          </div>
        </div>

        {/* Protocol Detail */}
        <div className="lg:col-span-2">
          <AnimatePresence mode="wait">
            {selectedProtocol ? (
              <motion.div
                key={selectedProtocol.id}
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -20 }}
                className="bg-white rounded-[3rem] border border-slate-100 shadow-sm overflow-hidden"
              >
                <div className="p-10 space-y-8">
                  <div className="flex justify-between items-start">
                    <div className="space-y-2">
                      <h3 className="text-3xl font-black text-slate-900 uppercase tracking-tighter leading-none">
                        {selectedProtocol.title}
                      </h3>
                      <div className="flex gap-2">
                        {selectedProtocol.frequencies?.map((f: string, i: number) => (
                          <span key={i} className="px-2 py-1 bg-blue-50 text-blue-600 rounded-md text-[8px] font-black uppercase tracking-widest border border-blue-100">
                            {f}
                          </span>
                        ))}
                      </div>
                    </div>
                    <div className="text-right">
                      <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Sessões</p>
                      <p className="text-2xl font-black text-slate-900">{selectedProtocol.sessions}</p>
                    </div>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                    <div className="space-y-6">
                      <h4 className="text-xs font-black text-slate-400 uppercase tracking-widest flex items-center gap-2">
                        <Activity size={14} className="text-emerald-500" /> Passos do Protocolo
                      </h4>
                      <div className="space-y-4">
                        {selectedProtocol.steps.map((step: any, i: number) => (
                          <div key={i} className="flex gap-4">
                            <div className="w-8 h-8 bg-slate-50 rounded-lg flex items-center justify-center text-xs font-black text-slate-400 shrink-0">
                              {step.order}
                            </div>
                            <div>
                              <p className="text-sm font-black text-slate-900 uppercase tracking-tight">{step.action}</p>
                              <p className="text-xs text-slate-500 leading-relaxed">{step.detail}</p>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>

                    <div className="space-y-6">
                      <h4 className="text-xs font-black text-slate-400 uppercase tracking-widest flex items-center gap-2">
                        <Waves size={14} className="text-blue-500" /> Afirmação de Cura
                      </h4>
                      <div className="p-6 bg-blue-50 rounded-3xl border border-blue-100 italic text-blue-800 font-medium leading-relaxed">
                        "{selectedProtocol.phrases?.[0]}"
                      </div>

                      <div className="space-y-4">
                        <h4 className="text-xs font-black text-slate-400 uppercase tracking-widest">Status do Paciente</h4>
                        {patientData ? (
                          <div className="p-4 bg-slate-50 rounded-2xl border border-slate-100 flex items-center gap-3">
                            <div className="w-10 h-10 bg-white rounded-xl flex items-center justify-center text-lg shadow-sm">👤</div>
                            <div>
                              <p className="text-xs font-black text-slate-900">{patientData.name}</p>
                              <p className="text-[10px] text-slate-500 font-medium">Pronto para reprogramação</p>
                            </div>
                          </div>
                        ) : (
                          <div className="p-4 border-2 border-dashed border-slate-200 rounded-2xl text-center">
                            <p className="text-[10px] font-bold text-slate-400 uppercase">Selecione um paciente</p>
                          </div>
                        )}
                      </div>
                    </div>
                  </div>

                  {isRunning && (
                    <div className="space-y-2">
                      <div className="flex justify-between items-end">
                        <p className="text-[10px] font-black text-emerald-600 uppercase tracking-widest animate-pulse">Sincronizando Frequências...</p>
                        <p className="text-xs font-black text-slate-900">{progress}%</p>
                      </div>
                      <div className="h-2 bg-slate-100 rounded-full overflow-hidden">
                        <motion.div 
                          className="h-full bg-emerald-500"
                          initial={{ width: 0 }}
                          animate={{ width: `${progress}%` }}
                        />
                      </div>
                    </div>
                  )}

                  <div className="pt-8 border-t border-slate-50 flex gap-4">
                    <button 
                      onClick={startProtocol}
                      disabled={isRunning || !patientData}
                      className="flex-1 bg-slate-900 text-white py-5 rounded-2xl font-black text-xs uppercase tracking-widest shadow-xl hover:bg-slate-800 transition-all flex items-center justify-center gap-3 disabled:opacity-50"
                    >
                      {isRunning ? <RefreshCw className="animate-spin" size={18} /> : <Play size={18} />}
                      Executar Protocolo
                    </button>
                    <button className="w-16 h-16 bg-white border border-slate-200 rounded-2xl flex items-center justify-center text-slate-600 hover:text-emerald-600 transition-colors shadow-sm">
                      <Info size={24} />
                    </button>
                  </div>
                </div>
              </motion.div>
            ) : (
              <div className="h-full flex flex-col items-center justify-center text-center space-y-6 bg-slate-50 rounded-[3rem] border-2 border-dashed border-slate-200 p-20">
                <div className="w-24 h-24 bg-white rounded-[2rem] shadow-sm flex items-center justify-center text-slate-200">
                  <Brain size={48} />
                </div>
                <div className="max-w-xs space-y-2">
                  <h4 className="text-xl font-black text-slate-900 uppercase">Selecione um Protocolo</h4>
                  <p className="text-slate-500 text-sm font-medium">
                    Escolha um protocolo de reprogramação neuro-emocional na lista ao lado para ver os detalhes e iniciar a terapia.
                  </p>
                </div>
              </div>
            )}
          </AnimatePresence>
        </div>
      </div>
    </div>
  );
};
