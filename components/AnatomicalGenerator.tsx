
import React, { useState, useRef, useEffect } from 'react';
import { generateAnatomicalImage, generateAnatomicalExplanation, generateTTS, AnatomicalExplanation } from '../services/gemini';
import { PatientData, AnalysisReport } from '../types';
import { motion, AnimatePresence } from 'motion/react';
import { Sparkles, Download, RefreshCw, Image as ImageIcon, Volume2, VolumeX, Info, ListFilter, Target, Brain, Activity } from 'lucide-react';
import { NSOFISION_NERO_POINTS, NSOPoint } from '../services/nsofisionPoints';

interface AnatomicalGeneratorProps {
  patientData: PatientData | null;
  examData?: AnalysisReport | null;
}

export const AnatomicalGenerator: React.FC<AnatomicalGeneratorProps> = ({ patientData, examData }) => {
  const [prompt, setPrompt] = useState('');
  const [selectedPoint, setSelectedPoint] = useState<NSOPoint | null>(null);
  const [generatedImage, setGeneratedImage] = useState<string | null>(null);
  const [explanation, setExplanation] = useState<AnatomicalExplanation | null>(null);
  const [audioUrl, setAudioUrl] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isMuted, setIsMuted] = useState(false);
  const [activePoint, setActivePoint] = useState<number | null>(null);
  const [isDownloading, setIsDownloading] = useState(false);
  const [showPointsList, setShowPointsList] = useState(false);
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
    if (!prompt && !patientData && !selectedPoint) return;
    
    setLoading(true);
    setError(null);
    setExplanation(null);
    setAudioUrl(null);
    setActivePoint(null);

    try {
      let finalPrompt = prompt;
      
      if (selectedPoint) {
        finalPrompt = `Ponto NSO ${selectedPoint.id}: ${selectedPoint.name}. Região: ${selectedPoint.region}. Função: ${selectedPoint.function}. Localização: ${selectedPoint.location}.`;
      } else if (!finalPrompt && patientData) {
        finalPrompt = `Anatomia relacionada a: ${patientData.complaints}`;
        if (examData) {
          finalPrompt += `. Achados do exame: ${examData.summary}. Pontos específicos: ${examData.findings.join(', ')}`;
        }
      } else if (!finalPrompt) {
        finalPrompt = 'Anatomia humana geral';
      }
      
      // Enriquecer o prompt com a biblioteca oficial de 41 pontos
      const pointsContext = `Utilize como referência o sistema NSOFISION NERO de 41 pontos anatômicos. Se o ponto solicitado for um dos 41 oficiais, foque estritamente nele.`;
      
      // Gerar imagem e explicação em paralelo
      const [imageUrl, expl] = await Promise.all([
        generateAnatomicalImage(`${finalPrompt}. ${pointsContext}`),
        generateAnatomicalExplanation(`${finalPrompt}. ${pointsContext}`, patientData)
      ]);

      setGeneratedImage(imageUrl);
      setExplanation(expl);

      // Gerar áudio TTS
      const audio = await generateTTS(expl.narration);
      setAudioUrl(audio);

    } catch (err: any) {
      console.error(err);
      const isApiKeyMissing = err.message?.includes('GEMINI_API_KEY is not defined');
      const isApiKeyInvalid = err.message?.includes('403') || err.message?.includes('API_KEY_INVALID');
      
      if (isApiKeyMissing) {
        setError('Erro: Chave da API (GEMINI_API_KEY) não configurada no Netlify. Adicione a variável de ambiente nas configurações do seu deploy.');
      } else if (isApiKeyInvalid) {
        setError('Erro: Chave da API inválida ou sem permissão. Verifique se a chave está correta e se tem saldo/permissões.');
      } else {
        setError(`Falha ao gerar análise anatômica: ${err.message || 'Erro desconhecido'}. Tente novamente.`);
      }
    } finally {
      setLoading(false);
    }
  };

  const downloadImage = async () => {
    if (!generatedImage || !explanation) return;
    setIsDownloading(true);

    try {
      const canvas = document.createElement('canvas');
      const ctx = canvas.getContext('2d');
      if (!ctx) return;

      const img = new Image();
      img.src = generatedImage;

      await new Promise((resolve, reject) => {
        img.onload = resolve;
        img.onerror = reject;
      });

      // Configurações de layout
      const textPadding = 40;
      const headerHeight = 80;
      const footerHeight = 200;
      const totalWidth = img.width;
      const totalHeight = img.height + headerHeight + footerHeight;

      canvas.width = totalWidth;
      canvas.height = totalHeight;

      // Fundo branco
      ctx.fillStyle = '#ffffff';
      ctx.fillRect(0, 0, canvas.width, canvas.height);

      // Cabeçalho
      ctx.fillStyle = '#0f172a'; // slate-900
      ctx.fillRect(0, 0, canvas.width, headerHeight);
      
      ctx.fillStyle = '#ffffff';
      ctx.font = 'bold 24px Inter, sans-serif';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText('ATLAS ANATÔMICO NSOFISION NERO', canvas.width / 2, headerHeight / 2);

      // Desenhar imagem principal
      ctx.drawImage(img, 0, headerHeight);

      // Desenhar pontos e legendas
      explanation.points.forEach((point, idx) => {
        const x = (point.x / 100) * img.width;
        const y = headerHeight + (point.y / 100) * img.height;

        // Círculo do ponto
        ctx.beginPath();
        ctx.arc(x, y, 18, 0, Math.PI * 2);
        ctx.fillStyle = '#10b981'; // emerald-500
        ctx.fill();
        ctx.strokeStyle = '#ffffff';
        ctx.lineWidth = 3;
        ctx.stroke();

        // Número do ponto
        ctx.fillStyle = '#ffffff';
        ctx.font = 'bold 16px Inter, sans-serif';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText((idx + 1).toString(), x, y);

        // Rótulo do ponto (com fundo para legibilidade)
        const labelText = `${idx + 1}. ${point.label}`;
        ctx.font = 'bold 14px Inter, sans-serif';
        const labelWidth = ctx.measureText(labelText).width;
        
        ctx.fillStyle = 'rgba(15, 23, 42, 0.8)'; // slate-900 semi-transparent
        ctx.fillRect(x + 25, y - 12, labelWidth + 10, 24);
        
        ctx.fillStyle = '#ffffff';
        ctx.textAlign = 'left';
        ctx.fillText(labelText, x + 30, y);
      });

      // Rodapé com Narração
      ctx.fillStyle = '#f8fafc'; // slate-50
      ctx.fillRect(0, img.height + headerHeight, canvas.width, footerHeight);
      
      ctx.fillStyle = '#334155'; // slate-700
      ctx.font = 'italic 18px Inter, sans-serif';
      ctx.textAlign = 'center';
      
      // Quebra de linha para a narração
      const maxWidth = canvas.width - (textPadding * 2);
      const words = explanation.narration.split(' ');
      let line = '';
      let textY = img.height + headerHeight + 50;
      const lineHeight = 28;

      for (let n = 0; n < words.length; n++) {
        const testLine = line + words[n] + ' ';
        const metrics = ctx.measureText(testLine);
        const testWidth = metrics.width;
        if (testWidth > maxWidth && n > 0) {
          ctx.fillText(line, canvas.width / 2, textY);
          line = words[n] + ' ';
          textY += lineHeight;
        } else {
          line = testLine;
        }
      }
      ctx.fillText(line, canvas.width / 2, textY);

      // Marca d'água / Data
      ctx.fillStyle = '#94a3b8'; // slate-400
      ctx.font = 'bold 12px Inter, sans-serif';
      ctx.textAlign = 'right';
      const dateStr = new Date().toLocaleString('pt-BR');
      ctx.fillText(`Gerado por Consulfision NSO - ${dateStr}`, canvas.width - 20, canvas.height - 20);

      // Download
      const link = document.createElement('a');
      link.href = canvas.toDataURL('image/png');
      link.download = `atlas_nso_${selectedPoint?.id || 'custom'}_${Date.now()}.png`;
      link.click();
    } catch (err) {
      console.error("Erro ao baixar imagem:", err);
      alert("Erro ao processar imagem para download.");
    } finally {
      setIsDownloading(false);
    }
  };

  return (
    <div className="space-y-8 animate-fadeIn pb-20">
      <header className="flex justify-between items-end">
        <div>
          <h2 className="text-3xl font-black text-slate-900 tracking-tighter uppercase">Atlas AI Nsofision Nero</h2>
          <p className="text-slate-500 font-medium italic">Gerador de imagens realistas baseado no sistema oficial de 41 pontos.</p>
        </div>
        <div className="px-4 py-2 bg-emerald-50 text-emerald-600 rounded-full flex items-center gap-2 text-[10px] font-black uppercase tracking-widest border border-emerald-100">
          <Target size={14} /> 41 Pontos Ativos
        </div>
      </header>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
        <div className="lg:col-span-5 space-y-6">
          <div className="bg-white p-8 rounded-[2.5rem] shadow-sm border border-slate-100 space-y-6">
            <div className="space-y-4">
              <div className="flex justify-between items-center">
                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Selecionar Ponto Oficial</label>
                <button 
                  onClick={() => setShowPointsList(!showPointsList)}
                  className="text-[10px] font-black text-emerald-600 uppercase tracking-widest flex items-center gap-1 hover:underline"
                >
                  <ListFilter size={12} /> {showPointsList ? 'Fechar Lista' : 'Ver Todos'}
                </button>
              </div>

              {showPointsList ? (
                <div className="grid grid-cols-5 gap-2 max-h-48 overflow-y-auto p-2 bg-slate-50 rounded-2xl custom-scrollbar">
                  {NSOFISION_NERO_POINTS.map(p => (
                    <button
                      key={p.id}
                      onClick={() => {
                        setSelectedPoint(p);
                        setShowPointsList(false);
                        setPrompt('');
                      }}
                      className={`h-10 rounded-lg font-black text-xs transition-all ${
                        selectedPoint?.id === p.id 
                          ? 'bg-emerald-500 text-white shadow-lg scale-110' 
                          : 'bg-white text-slate-400 hover:bg-emerald-50 hover:text-emerald-600'
                      }`}
                    >
                      {p.id}
                    </button>
                  ))}
                </div>
              ) : selectedPoint ? (
                <div className="p-4 bg-emerald-50 border border-emerald-100 rounded-2xl flex items-center justify-between group">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 bg-emerald-500 text-white rounded-xl flex items-center justify-center font-black text-lg shadow-sm">
                      {selectedPoint.id}
                    </div>
                    <div>
                      <p className="text-[10px] font-black text-emerald-600 uppercase tracking-widest">{selectedPoint.region}</p>
                      <p className="text-sm font-black text-slate-900 uppercase tracking-tight">{selectedPoint.name}</p>
                    </div>
                  </div>
                  <button 
                    onClick={() => setSelectedPoint(null)}
                    className="text-slate-400 hover:text-red-500 transition-colors"
                  >
                    ×
                  </button>
                </div>
              ) : (
                <div className="p-4 border-2 border-dashed border-slate-200 rounded-2xl text-center">
                  <p className="text-[10px] font-bold text-slate-400 uppercase">Nenhum ponto selecionado</p>
                </div>
              )}

              <div className="space-y-2">
                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Ou descreva uma visualização personalizada</label>
                <textarea
                  value={prompt}
                  onChange={(e) => {
                    setPrompt(e.target.value);
                    if (e.target.value) setSelectedPoint(null);
                  }}
                  placeholder={patientData ? `Ex: Detalhe do ${patientData.complaints}...` : "Ex: Sistema circulatório do braço, detalhe do fêmur..."}
                  className="w-full p-5 bg-slate-50 rounded-3xl border border-slate-200 font-medium outline-none focus:ring-4 focus:ring-emerald-500/10 transition-all text-sm shadow-inner resize-none h-32"
                />
              </div>
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
          </div>

          {selectedPoint && (
            <motion.div 
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              className="bg-slate-900 text-white p-8 rounded-[2.5rem] shadow-2xl space-y-4"
            >
              <div className="flex items-center gap-2 text-emerald-400">
                <Brain size={16} />
                <span className="text-[10px] font-black uppercase tracking-widest">Informação Clínica</span>
              </div>
              <h4 className="text-lg font-black uppercase tracking-tight leading-tight">{selectedPoint.name}</h4>
              <p className="text-xs font-medium leading-relaxed opacity-80">
                <span className="text-emerald-400 font-black uppercase tracking-widest mr-1">Função:</span>
                {selectedPoint.function}
              </p>
              <p className="text-xs font-medium leading-relaxed opacity-80">
                <span className="text-emerald-400 font-black uppercase tracking-widest mr-1">Localização:</span>
                {selectedPoint.location}
              </p>
              <div className="pt-4 border-t border-white/10 flex items-center gap-2">
                <Activity size={14} className="text-emerald-500" />
                <p className="text-[10px] font-bold italic opacity-60">Confirmação: {selectedPoint.confirmation}</p>
              </div>
            </motion.div>
          )}
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
                      disabled={isDownloading}
                      className="bg-white text-slate-900 p-4 rounded-full shadow-xl hover:scale-110 transition-transform disabled:opacity-50"
                    >
                      {isDownloading ? <RefreshCw className="animate-spin" size={24} /> : <Download size={24} />}
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
                   <button 
                     onClick={downloadImage} 
                     disabled={isDownloading}
                     className="bg-slate-100 text-slate-600 px-8 py-4 rounded-2xl font-black text-[10px] uppercase tracking-widest flex items-center gap-2 hover:bg-slate-200 transition-all disabled:opacity-50"
                   >
                     {isDownloading ? <RefreshCw className="animate-spin" size={14} /> : <Download size={14} />}
                     {isDownloading ? 'Processando...' : 'Baixar Imagem Completa'}
                   </button>
                   <button onClick={() => {
                     setGeneratedImage(null);
                     setExplanation(null);
                     setAudioUrl(null);
                     setSelectedPoint(null);
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
