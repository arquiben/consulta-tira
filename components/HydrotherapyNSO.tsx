
import React, { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Droplets, Thermometer, RefreshCw, Download, Sparkles, Info, Waves, Wind, Sun, CloudRain } from 'lucide-react';
import { PatientData } from '../types';
import { generateTherapyReport } from '../services/gemini';
import { speakText, stopAllAudio } from '../services/tts';

interface HydrotherapyNSOProps {
  patientData: PatientData | null;
}

export const HydrotherapyNSO: React.FC<HydrotherapyNSOProps> = ({ patientData }) => {
  const [loading, setLoading] = useState(false);
  const [protocol, setProtocol] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isSpeaking, setIsSpeaking] = useState(false);

  const handleGenerateProtocol = async () => {
    if (!patientData) {
      setError("Selecione um paciente primeiro.");
      return;
    }

    setLoading(true);
    setError(null);
    setProtocol(null);
    stopAllAudio();

    try {
      const prompt = `Gere um Protocolo de Hidroterapia NSO personalizado para o paciente ${patientData.name}.
        Considere as queixas: ${patientData.complaints}.
        Histórico: ${patientData.history}.
        Sinais Vitais: TA ${patientData.bloodPressure}, Glicemia ${patientData.glucose || 'Não informada'}, IMC ${patientData.bmi}.
        
        O protocolo deve incluir:
        1. Tipo de banho (Imersão, parcial, compressas, etc.)
        2. Temperatura ideal da água.
        3. Tempo de duração.
        4. Aditivos recomendados (Sais, ervas, óleos essenciais).
        5. Frequência semanal.
        6. Explicação dos benefícios fisiológicos e energéticos para o quadro do paciente.`;

      const response = await generateTherapyReport(prompt, undefined, patientData);
      setProtocol(response.summary);

      // Speak summary if not muted
      setIsSpeaking(true);
      await speakText(`Protocolo de hidroterapia gerado para ${patientData.name}. Focando em desintoxicação e relaxamento.`);
      setIsSpeaking(false);

    } catch (err: any) {
      console.error(err);
      setError(`Erro ao gerar protocolo: ${err.message || 'Erro desconhecido'}`);
    } finally {
      setLoading(false);
    }
  };

  const downloadProtocol = () => {
    if (!protocol) return;
    const element = document.createElement("a");
    const file = new Blob([protocol], { type: 'text/plain' });
    element.href = URL.createObjectURL(file);
    element.download = `hidroterapia_nso_${patientData?.name || 'paciente'}.txt`;
    document.body.appendChild(element);
    element.click();
  };

  return (
    <div className="space-y-8 animate-fadeIn pb-20">
      <header className="flex justify-between items-end">
        <div>
          <h2 className="text-3xl font-black text-slate-900 tracking-tighter uppercase">Hidroterapia NSO</h2>
          <p className="text-slate-500 font-medium italic">Protocolos terapêuticos baseados na água para equilíbrio sistêmico.</p>
        </div>
        <div className="px-4 py-2 bg-blue-50 text-blue-600 rounded-full flex items-center gap-2 text-[10px] font-black uppercase tracking-widest border border-blue-100">
          <Droplets size={14} /> Terapia Hídrica
        </div>
      </header>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
        <div className="lg:col-span-4 space-y-6">
          <div className="bg-white p-8 rounded-[2.5rem] shadow-sm border border-slate-100 space-y-6">
            <div className="p-6 bg-blue-50 rounded-3xl border border-blue-100 space-y-4">
              <div className="flex items-center gap-3 text-blue-600">
                <Waves size={24} />
                <h3 className="font-black uppercase tracking-tight">Conceito NSO</h3>
              </div>
              <p className="text-xs text-blue-800/70 leading-relaxed font-medium">
                A hidroterapia NSO utiliza a água como veículo de informação e temperatura para modular o sistema nervoso autônomo e promover a homeostase.
              </p>
            </div>

            <div className="space-y-4">
              <div className="flex items-center gap-2 text-slate-400">
                <Info size={14} />
                <span className="text-[10px] font-black uppercase tracking-widest">Status do Paciente</span>
              </div>
              {patientData ? (
                <div className="p-4 bg-slate-50 rounded-2xl border border-slate-100">
                  <p className="text-sm font-black text-slate-900">{patientData.name}</p>
                  <p className="text-[10px] text-slate-500 uppercase font-bold mt-1">Queixa: {patientData.complaints}</p>
                </div>
              ) : (
                <div className="p-4 border-2 border-dashed border-slate-200 rounded-2xl text-center">
                  <p className="text-[10px] font-bold text-slate-400 uppercase">Nenhum paciente selecionado</p>
                </div>
              )}
            </div>

            <button
              onClick={handleGenerateProtocol}
              disabled={loading || !patientData}
              className="w-full bg-blue-600 text-white py-6 rounded-[2rem] font-black text-xs uppercase tracking-widest shadow-xl hover:bg-blue-700 transition-all flex items-center justify-center gap-3 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {loading ? <RefreshCw className="animate-spin" size={18} /> : <Sparkles size={18} />}
              {loading ? 'Analisando Bio-Hídrica...' : 'Gerar Protocolo Hídrico'}
            </button>

            {error && (
              <p className="text-red-500 text-[10px] font-bold uppercase text-center">{error}</p>
            )}
          </div>

          <div className="bg-slate-900 text-white p-8 rounded-[2.5rem] shadow-2xl space-y-6">
            <h4 className="text-sm font-black uppercase tracking-widest text-blue-400">Modalidades Térmicas</h4>
            <div className="space-y-4">
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 bg-red-500/20 text-red-400 rounded-lg flex items-center justify-center"><Sun size={16} /></div>
                <div>
                  <p className="text-[10px] font-black uppercase tracking-widest">Água Quente</p>
                  <p className="text-[9px] opacity-60">Vasodilatação e relaxamento muscular.</p>
                </div>
              </div>
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 bg-blue-500/20 text-blue-400 rounded-lg flex items-center justify-center"><Wind size={16} /></div>
                <div>
                  <p className="text-[10px] font-black uppercase tracking-widest">Água Fria</p>
                  <p className="text-[9px] opacity-60">Tonificação e estímulo imunológico.</p>
                </div>
              </div>
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 bg-emerald-500/20 text-emerald-400 rounded-lg flex items-center justify-center"><CloudRain size={16} /></div>
                <div>
                  <p className="text-[10px] font-black uppercase tracking-widest">Alternada</p>
                  <p className="text-[9px] opacity-60">Bombeamento circulatório e linfático.</p>
                </div>
              </div>
            </div>
          </div>
        </div>

        <div className="lg:col-span-8">
          <div className="bg-white rounded-[3.5rem] shadow-sm border border-slate-100 min-h-[600px] flex flex-col relative overflow-hidden">
            <AnimatePresence mode="wait">
              {protocol ? (
                <motion.div
                  key="result"
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                  className="p-10 space-y-8"
                >
                  <div className="flex justify-between items-center border-b border-slate-100 pb-6">
                    <div className="flex items-center gap-4">
                      <div className="w-12 h-12 bg-blue-600 text-white rounded-2xl flex items-center justify-center shadow-lg shadow-blue-200">
                        <Droplets size={24} />
                      </div>
                      <div>
                        <h3 className="text-xl font-black text-slate-900 uppercase tracking-tight">Protocolo Hidroterápico</h3>
                        <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Prescrição Hídrica NSO</p>
                      </div>
                    </div>
                    <button
                      onClick={downloadProtocol}
                      className="p-4 bg-slate-50 text-slate-400 rounded-2xl hover:bg-blue-50 hover:text-blue-600 transition-all"
                    >
                      <Download size={20} />
                    </button>
                  </div>

                  <div className="prose prose-slate max-w-none">
                    <div className="whitespace-pre-wrap font-medium text-slate-600 leading-relaxed text-sm">
                      {protocol}
                    </div>
                  </div>

                  <div className="pt-8 border-t border-slate-100 flex justify-center">
                    <button
                      onClick={() => setProtocol(null)}
                      className="text-[10px] font-black text-slate-300 uppercase tracking-[0.3em] hover:text-blue-600 transition-all"
                    >
                      Limpar Protocolo
                    </button>
                  </div>
                </motion.div>
              ) : (
                <motion.div
                  key="empty"
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  className="flex-1 flex flex-col items-center justify-center p-20 text-center space-y-6"
                >
                  <div className="w-32 h-32 bg-blue-50 rounded-[3rem] flex items-center justify-center text-blue-200 mx-auto border-2 border-dashed border-blue-100">
                    <Waves size={48} />
                  </div>
                  <div className="max-w-xs space-y-2">
                    <p className="text-[10px] font-black uppercase tracking-[0.4em] text-slate-400">Aguardando Análise</p>
                    <p className="text-xs text-slate-400 font-medium italic">
                      Clique em "Gerar Protocolo Hídrico" para criar uma prescrição baseada nas necessidades do paciente.
                    </p>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>

            {loading && (
              <div className="absolute inset-0 bg-white/80 backdrop-blur-sm flex flex-col items-center justify-center z-20">
                <div className="w-16 h-16 border-4 border-blue-600 border-t-transparent rounded-full animate-spin mb-4"></div>
                <p className="text-xs font-black text-blue-600 uppercase tracking-widest animate-pulse">Calculando Equilíbrio Hídrico...</p>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
