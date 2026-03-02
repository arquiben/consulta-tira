
import React, { useState, useRef, useEffect } from 'react';
import { generateAnatomicalImage, generateAnatomicalExplanation, generateTTS, AnatomicalExplanation } from '../services/gemini';
import { PatientData } from '../types';
import { motion, AnimatePresence } from 'motion/react';
import { Sparkles, Download, RefreshCw, Image as ImageIcon, Volume2, VolumeX, Info } from 'lucide-react';

interface AnatomicalGeneratorProps {
  patientData: PatientData | null;
}

export const AnatomicalGenerator: React.FC<AnatomicalGeneratorProps> = ({ patientData }) => {
  const [prompt, setPrompt] = useState('');
  const [generatedImage, setGeneratedImage] = useState<string | null>(null);
  const [explanation, setExplanation] = useState<AnatomicalExplanation | null>(null);
  const [audioUrl, setAudioUrl] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isMuted, setIsMuted] = useState(false);
  const [activePoint, setActivePoint] = useState<number | null>(null);
  const audioContextRef = useRef<AudioContext | null>(null);
  const audioBufferSourceRef = useRef<AudioBufferSourceNode | null>(null);

  const playRawPCM = async (base64Data: string) => {
    try {
      if (!audioContextRef.current) {
        audioContextRef.current = new (window.AudioContext || (window as any).webkitAudioContext)({ sampleRate: 24000 });
      }
      
      const ctx = audioContextRef.current;
      
      // Converter base64 para ArrayBuffer
      const binaryString = window.atob(base64Data);
      const bytes = new Uint8Array(binaryString.length);
      for (let i = 0; i < binaryString.length; i++) {
        bytes[i] = binaryString.charCodeAt(i);
      }
      
      // Converter PCM 16-bit para Float32
      const int16Array = new Int16Array(bytes.buffer);
      const float32Array = new Float32Array(int16Array.length);
      for (let i = 0; i < int16Array.length; i++) {
        float32Array[i] = int16Array[i] / 32768.0;
      }
      
      const audioBuffer = ctx.createBuffer(1, float32Array.length, 24000);
      audioBuffer.getChannelData(0).set(float32Array);
      
      if (audioBufferSourceRef.current) {
        audioBufferSourceRef.current.stop();
      }
      
      const source = ctx.createBufferSource();
      source.buffer = audioBuffer;
      
      const gainNode = ctx.createGain();
      gainNode.gain.value = isMuted ? 0 : 1;
      
      source.connect(gainNode);
      gainNode.connect(ctx.destination);
      
      source.start();
      audioBufferSourceRef.current = source;
    } catch (e) {
      console.error("Erro ao reproduzir PCM:", e);
    }
  };

  useEffect(() => {
    if (audioUrl && !isMuted) {
      const base64Data = audioUrl.split(',')[1];
      if (base64Data) {
        playRawPCM(base64Data);
      }
    }
    return () => {
      if (audioBufferSourceRef.current) {
        audioBufferSourceRef.current.stop();
      }
    };
  }, [audioUrl, isMuted]);

  const handleGenerate = async () => {
    if (!prompt && !patientData) return;
    
    setLoading(true);
    setError(null);
    setExplanation(null);
    setAudioUrl(null);
    setActivePoint(null);

    try {
      const finalPrompt = prompt || (patientData ? `Anatomia relacionada a: ${patientData.complaints}` : 'Anatomia humana geral');
      
      // Gerar imagem e explicação em paralelo
      const [imageUrl, expl] = await Promise.all([
        generateAnatomicalImage(finalPrompt),
        generateAnatomicalExplanation(finalPrompt, patientData)
      ]);

      setGeneratedImage(imageUrl);
      setExplanation(expl);

      // Gerar áudio TTS
      const audio = await generateTTS(expl.narration);
      setAudioUrl(audio);

    } catch (err) {
      setError('Falha ao gerar análise anatômica. Tente novamente.');
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const downloadImage = () => {
    if (!generatedImage) return;
    const link = document.createElement('a');
    link.href = generatedImage;
    link.download = `anatomia_${Date.now()}.png`;
    link.click();
  };

  return (
    <div className="space-y-8 animate-fadeIn pb-20">
      <header>
        <h2 className="text-3xl font-black text-slate-900 tracking-tighter uppercase">Gerador de Anatomia Realista</h2>
        <p className="text-slate-500 font-medium italic">Utilizando IA Nano Banana para visualização clínica avançada.</p>
      </header>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
        <div className="lg:col-span-5 space-y-6">
          <div className="bg-white p-8 rounded-[2.5rem] shadow-sm border border-slate-100 space-y-6">
            <div className="space-y-2">
              <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">O que você deseja visualizar?</label>
              <textarea
                value={prompt}
                onChange={(e) => setPrompt(e.target.value)}
                placeholder={patientData ? `Ex: Detalhe do ${patientData.complaints}...` : "Ex: Sistema circulatório do braço, detalhe do fêmur..."}
                className="w-full p-5 bg-slate-50 rounded-3xl border border-slate-200 font-medium outline-none focus:ring-4 focus:ring-emerald-500/10 transition-all text-sm shadow-inner resize-none h-32"
              />
            </div>

            <button
              onClick={handleGenerate}
              disabled={loading}
              className="w-full bg-slate-900 text-white py-6 rounded-[2rem] font-black text-xs uppercase tracking-widest shadow-xl hover:bg-emerald-600 transition-all flex items-center justify-center gap-3 disabled:opacity-50"
            >
              {loading ? (
                <RefreshCw className="animate-spin" size={18} />
              ) : (
                <Sparkles size={18} />
              )}
              {loading ? 'Gerando Imagem...' : 'Gerar Anatomia Realista'}
            </button>

            {error && (
              <p className="text-red-500 text-[10px] font-bold uppercase text-center">{error}</p>
            )}

            {patientData && (
              <div className="p-5 bg-emerald-50 rounded-3xl border border-emerald-100 flex gap-3 items-start">
                <span className="text-xl">💡</span>
                <p className="text-[10px] text-emerald-800 font-medium leading-relaxed italic">
                  A IA usará as queixas do paciente ({patientData.complaints}) como contexto se o campo acima estiver vazio.
                </p>
              </div>
            )}
          </div>

          <div className="bg-slate-900 text-white p-8 rounded-[2.5rem] shadow-2xl relative overflow-hidden">
            <div className="relative z-10 space-y-4">
              <h4 className="text-[10px] font-black text-emerald-400 uppercase tracking-widest">Tecnologia Nano Banana</h4>
              <p className="text-xs font-medium leading-relaxed opacity-80">
                Nossa IA gera visualizações anatômicas sob demanda para auxiliar na explicação de patologias e procedimentos aos pacientes.
              </p>
            </div>
            <div className="absolute -right-4 -bottom-4 opacity-10 text-8xl">🍌</div>
          </div>
        </div>

        <div className="lg:col-span-7">
          <div className="bg-white p-4 rounded-[3.5rem] shadow-sm border border-slate-100 min-h-[600px] flex flex-col items-center justify-center relative overflow-hidden">
            {generatedImage ? (
              <motion.div 
                initial={{ opacity: 0, scale: 0.9 }}
                animate={{ opacity: 1, scale: 1 }}
                className="w-full h-full flex flex-col items-center gap-6 p-4"
              >
                <div className="relative group w-full aspect-square max-w-lg">
                  <img 
                    src={generatedImage} 
                    alt="Anatomia Gerada" 
                    className="w-full h-full object-cover rounded-[2.5rem] shadow-2xl border-8 border-white"
                  />
                  
                  {/* Pontos Anatômicos */}
                  <AnimatePresence>
                    {explanation?.points.map((point, idx) => (
                      <motion.div
                        key={idx}
                        initial={{ scale: 0, opacity: 0 }}
                        animate={{ scale: 1, opacity: 1 }}
                        transition={{ delay: 0.5 + idx * 0.2 }}
                        style={{ left: `${point.x}%`, top: `${point.y}%` }}
                        className="absolute -translate-x-1/2 -translate-y-1/2 z-30"
                      >
                        <button
                          onMouseEnter={() => setActivePoint(idx)}
                          onMouseLeave={() => setActivePoint(null)}
                          className="w-6 h-6 bg-emerald-500 text-white rounded-full flex items-center justify-center shadow-lg border-2 border-white hover:scale-125 transition-transform animate-pulse"
                        >
                          <span className="text-[10px] font-black">{idx + 1}</span>
                        </button>
                        
                        {activePoint === idx && (
                          <motion.div
                            initial={{ opacity: 0, y: 10 }}
                            animate={{ opacity: 1, y: 0 }}
                            className="absolute bottom-full mb-4 left-1/2 -translate-x-1/2 w-48 bg-slate-900 text-white p-4 rounded-2xl shadow-2xl z-40 text-center"
                          >
                            <p className="text-[10px] font-black uppercase tracking-widest text-emerald-400 mb-1">{point.label}</p>
                            <p className="text-[9px] font-medium leading-tight opacity-80">{point.description}</p>
                            <div className="absolute top-full left-1/2 -translate-x-1/2 border-8 border-transparent border-t-slate-900"></div>
                          </motion.div>
                        )}
                      </motion.div>
                    ))}
                  </AnimatePresence>

                  <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity rounded-[2.5rem] flex items-center justify-center gap-4">
                    <button 
                      onClick={downloadImage}
                      className="bg-white text-slate-900 p-4 rounded-full shadow-xl hover:scale-110 transition-transform"
                    >
                      <Download size={24} />
                    </button>
                    <button 
                      onClick={handleGenerate}
                      className="bg-emerald-500 text-white p-4 rounded-full shadow-xl hover:scale-110 transition-transform"
                    >
                      <RefreshCw size={24} />
                    </button>
                  </div>
                </div>

                {/* Narração e Controles */}
                {explanation && (
                  <motion.div 
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="w-full max-w-lg bg-slate-50 p-6 rounded-3xl border border-slate-100 space-y-4"
                  >
                    <div className="flex justify-between items-center">
                      <div className="flex items-center gap-3">
                        <div className="w-8 h-8 bg-emerald-100 text-emerald-600 rounded-xl flex items-center justify-center">
                          <Volume2 size={16} />
                        </div>
                        <span className="text-[10px] font-black uppercase tracking-widest text-slate-400">Narração IA Ativa</span>
                      </div>
                      <div className="flex gap-2">
                        <button 
                          onClick={() => {
                            if (audioUrl) {
                              const base64Data = audioUrl.split(',')[1];
                              playRawPCM(base64Data);
                            }
                          }}
                          className="p-2 bg-slate-200 text-slate-600 rounded-xl hover:bg-emerald-100 hover:text-emerald-600 transition-all"
                          title="Repetir Narração"
                        >
                          <RefreshCw size={16} />
                        </button>
                        <button 
                          onClick={() => setIsMuted(!isMuted)}
                          className={`p-2 rounded-xl transition-all ${isMuted ? 'bg-red-50 text-red-500' : 'bg-slate-200 text-slate-600'}`}
                        >
                          {isMuted ? <VolumeX size={16} /> : <Volume2 size={16} />}
                        </button>
                      </div>
                    </div>
                    <p className="text-sm font-medium text-slate-700 leading-relaxed italic">
                      "{explanation.narration}"
                    </p>
                  </motion.div>
                )}

                <div className="flex gap-4">
                   <button onClick={downloadImage} className="bg-slate-100 text-slate-600 px-8 py-4 rounded-2xl font-black text-[10px] uppercase tracking-widest flex items-center gap-2">
                     <Download size={14} /> Baixar Imagem
                   </button>
                   <button onClick={() => {
                     setGeneratedImage(null);
                     setExplanation(null);
                     setAudioUrl(null);
                   }} className="bg-slate-50 text-slate-400 px-8 py-4 rounded-2xl font-black text-[10px] uppercase tracking-widest">
                     Limpar
                   </button>
                </div>
              </motion.div>
            ) : (
              <div className="text-center space-y-6 opacity-30">
                <div className="w-32 h-32 bg-slate-50 rounded-[3rem] flex items-center justify-center text-6xl mx-auto border-2 border-dashed border-slate-200">
                  <ImageIcon size={48} />
                </div>
                <p className="text-[10px] font-black uppercase tracking-[0.4em]">Aguardando Geração</p>
              </div>
            )}

            {loading && (
              <div className="absolute inset-0 bg-white/80 backdrop-blur-sm flex flex-col items-center justify-center z-20">
                <div className="w-16 h-16 border-4 border-emerald-500 border-t-transparent rounded-full animate-spin mb-4"></div>
                <p className="text-xs font-black text-emerald-600 uppercase tracking-widest animate-pulse">Renderizando Anatomia...</p>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
