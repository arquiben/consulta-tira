
import React, { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Apple, Zap, RefreshCw, Download, Sparkles, Info, Heart, Coffee, Leaf, Flame } from 'lucide-react';
import { PatientData } from '../types';
import { generateTherapyReport } from '../services/gemini';
import { speakText, stopAllAudio } from '../services/tts';

interface EnergyDietProps {
  patientData: PatientData | null;
}

export const EnergyDiet: React.FC<EnergyDietProps> = ({ patientData }) => {
  const [loading, setLoading] = useState(false);
  const [dietPlan, setDietPlan] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isSpeaking, setIsSpeaking] = useState(false);

  const handleGenerateDiet = async () => {
    if (!patientData) {
      setError("Selecione um paciente primeiro.");
      return;
    }

    setLoading(true);
    setError(null);
    setDietPlan(null);
    stopAllAudio();

    try {
      const prompt = `Gere uma Dieta Energética personalizada para o paciente ${patientData.name}.
        Considere as queixas: ${patientData.complaints}.
        Histórico: ${patientData.history}.
        Sinais Vitais: TA ${patientData.bloodPressure}, Glicemia ${patientData.glucose || 'Não informada'}, IMC ${patientData.bmi}.
        
        A dieta deve focar em equilíbrio energético (Yin/Yang), alimentos funcionais e recomendações específicas para o quadro clínico.
        Divida em: Café da Manhã, Almoço, Lanche, Jantar e Recomendações Gerais.
        Inclua uma breve explicação do porquê dessas escolhas baseada na bioenergia.`;

      const response = await generateTherapyReport(prompt, undefined, patientData);
      setDietPlan(response.summary);

      // Speak summary if not muted
      setIsSpeaking(true);
      await speakText(`Dieta energética gerada para ${patientData.name}. Focando em equilíbrio e vitalidade.`);
      setIsSpeaking(false);

    } catch (err: any) {
      console.error(err);
      setError(`Erro ao gerar dieta: ${err.message || 'Erro desconhecido'}`);
    } finally {
      setLoading(false);
    }
  };

  const downloadDiet = () => {
    if (!dietPlan) return;
    const element = document.createElement("a");
    const file = new Blob([dietPlan], { type: 'text/plain' });
    element.href = URL.createObjectURL(file);
    element.download = `dieta_energetica_${patientData?.name || 'paciente'}.txt`;
    document.body.appendChild(element);
    element.click();
  };

  return (
    <div className="space-y-8 animate-fadeIn pb-20">
      <header className="flex justify-between items-end">
        <div>
          <h2 className="text-3xl font-black text-slate-900 tracking-tighter uppercase">Dieta Energética NSO</h2>
          <p className="text-slate-500 font-medium italic">Nutrição bioenergética personalizada para equilíbrio sistêmico.</p>
        </div>
        <div className="px-4 py-2 bg-orange-50 text-orange-600 rounded-full flex items-center gap-2 text-[10px] font-black uppercase tracking-widest border border-orange-100">
          <Zap size={14} /> Vitalidade Máxima
        </div>
      </header>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
        <div className="lg:col-span-4 space-y-6">
          <div className="bg-white p-8 rounded-[2.5rem] shadow-sm border border-slate-100 space-y-6">
            <div className="p-6 bg-orange-50 rounded-3xl border border-orange-100 space-y-4">
              <div className="flex items-center gap-3 text-orange-600">
                <Apple size={24} />
                <h3 className="font-black uppercase tracking-tight">Conceito NSO</h3>
              </div>
              <p className="text-xs text-orange-800/70 leading-relaxed font-medium">
                A dieta energética NSO não foca apenas em calorias, mas na frequência vibracional dos alimentos e como eles interagem com os meridianos de energia do corpo.
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
              onClick={handleGenerateDiet}
              disabled={loading || !patientData}
              className="w-full bg-orange-600 text-white py-6 rounded-[2rem] font-black text-xs uppercase tracking-widest shadow-xl hover:bg-orange-700 transition-all flex items-center justify-center gap-3 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {loading ? <RefreshCw className="animate-spin" size={18} /> : <Sparkles size={18} />}
              {loading ? 'Analisando Bioenergia...' : 'Gerar Plano Alimentar'}
            </button>

            {error && (
              <p className="text-red-500 text-[10px] font-bold uppercase text-center">{error}</p>
            )}
          </div>

          <div className="bg-slate-900 text-white p-8 rounded-[2.5rem] shadow-2xl space-y-6">
            <h4 className="text-sm font-black uppercase tracking-widest text-orange-400">Categorias Energéticas</h4>
            <div className="space-y-4">
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 bg-red-500/20 text-red-400 rounded-lg flex items-center justify-center"><Flame size={16} /></div>
                <div>
                  <p className="text-[10px] font-black uppercase tracking-widest">Alimentos Yang</p>
                  <p className="text-[9px] opacity-60">Aquecem e aceleram o metabolismo.</p>
                </div>
              </div>
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 bg-blue-500/20 text-blue-400 rounded-lg flex items-center justify-center"><Heart size={16} /></div>
                <div>
                  <p className="text-[10px] font-black uppercase tracking-widest">Alimentos Yin</p>
                  <p className="text-[9px] opacity-60">Resfriam e acalmam o sistema.</p>
                </div>
              </div>
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 bg-emerald-500/20 text-emerald-400 rounded-lg flex items-center justify-center"><Leaf size={16} /></div>
                <div>
                  <p className="text-[10px] font-black uppercase tracking-widest">Alimentos Neutros</p>
                  <p className="text-[9px] opacity-60">Estabilizam a energia vital (Qi).</p>
                </div>
              </div>
            </div>
          </div>
        </div>

        <div className="lg:col-span-8">
          <div className="bg-white rounded-[3.5rem] shadow-sm border border-slate-100 min-h-[600px] flex flex-col relative overflow-hidden">
            <AnimatePresence mode="wait">
              {dietPlan ? (
                <motion.div
                  key="result"
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                  className="p-10 space-y-8"
                >
                  <div className="flex justify-between items-center border-b border-slate-100 pb-6">
                    <div className="flex items-center gap-4">
                      <div className="w-12 h-12 bg-orange-600 text-white rounded-2xl flex items-center justify-center shadow-lg shadow-orange-200">
                        <Apple size={24} />
                      </div>
                      <div>
                        <h3 className="text-xl font-black text-slate-900 uppercase tracking-tight">Plano Alimentar Energético</h3>
                        <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Prescrição Bio-Nutricional</p>
                      </div>
                    </div>
                    <button
                      onClick={downloadDiet}
                      className="p-4 bg-slate-50 text-slate-400 rounded-2xl hover:bg-orange-50 hover:text-orange-600 transition-all"
                    >
                      <Download size={20} />
                    </button>
                  </div>

                  <div className="prose prose-slate max-w-none">
                    <div className="whitespace-pre-wrap font-medium text-slate-600 leading-relaxed text-sm">
                      {dietPlan}
                    </div>
                  </div>

                  <div className="pt-8 border-t border-slate-100 flex justify-center">
                    <button
                      onClick={() => setDietPlan(null)}
                      className="text-[10px] font-black text-slate-300 uppercase tracking-[0.3em] hover:text-orange-600 transition-all"
                    >
                      Limpar Prescrição
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
                  <div className="w-32 h-32 bg-orange-50 rounded-[3rem] flex items-center justify-center text-orange-200 mx-auto border-2 border-dashed border-orange-100">
                    <Coffee size={48} />
                  </div>
                  <div className="max-w-xs space-y-2">
                    <p className="text-[10px] font-black uppercase tracking-[0.4em] text-slate-400">Aguardando Análise</p>
                    <p className="text-xs text-slate-400 font-medium italic">
                      Clique em "Gerar Plano Alimentar" para criar uma dieta baseada na bioenergia do paciente.
                    </p>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>

            {loading && (
              <div className="absolute inset-0 bg-white/80 backdrop-blur-sm flex flex-col items-center justify-center z-20">
                <div className="w-16 h-16 border-4 border-orange-600 border-t-transparent rounded-full animate-spin mb-4"></div>
                <p className="text-xs font-black text-orange-600 uppercase tracking-widest animate-pulse">Sincronizando Frequências Alimentares...</p>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
