
import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  Zap, 
  Search, 
  RefreshCw, 
  Sparkles, 
  Volume2, 
  Square, 
  Play, 
  Download, 
  ChevronRight, 
  ChevronLeft,
  Info,
  Shield,
  Activity,
  User
} from 'lucide-react';
import { PatientData } from '../types';
import { generateBiomagnetismGuide, generateAnatomicalImage, BiomagnetismGuide as IBiomagnetismGuide, BiomagnetismPair } from '../services/gemini';
import { speakText, stopAllAudio } from '../services/tts';

interface BiomagnetismGuideProps {
  patientData: PatientData | null;
}

export const BiomagnetismGuide: React.FC<BiomagnetismGuideProps> = ({ patientData }) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [loading, setLoading] = useState(false);
  const [guide, setGuide] = useState<IBiomagnetismGuide | null>(null);
  const [atlasImage, setAtlasImage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [currentPairIndex, setCurrentPairIndex] = useState(0);
  const [isDictating, setIsDictating] = useState(false);
  const [isSpeaking, setIsSpeaking] = useState(false);

  const handleSearch = async (term?: string) => {
    const query = term || searchTerm;
    if (!query) return;

    setLoading(true);
    setError(null);
    setGuide(null);
    setAtlasImage(null);
    setCurrentPairIndex(0);
    stopAllAudio();

    try {
      const guideData = await generateBiomagnetismGuide(query);
      setGuide(guideData);

      const pairsList = guideData.pairs.map(p => `${p.point1} (polo negativo) e ${p.point2} (polo positivo)`).join(', ');
      const imagePrompt = `Atlas anatômico de Biomagnetismo para ${query}. 
      A imagem deve mostrar um modelo humano 3D detalhado com imãs coloridos (preto para negativo, vermelho para positivo) aplicados exatamente nos seguintes pares de pontos: ${pairsList}. 
      Os imãs devem estar visíveis sobre a pele ou órgãos correspondentes. 
      Estilo: Ilustração médica profissional, 3D, alta resolução, atlas clínico, sem textos na imagem, iluminação de estúdio.`;

      const imageData = await generateAnatomicalImage(imagePrompt);
      setAtlasImage(imageData);
    } catch (err: any) {
      console.error(err);
      setError("Erro ao gerar guia. Verifique sua conexão.");
    } finally {
      setLoading(false);
    }
  };

  const dictatePair = async (index: number) => {
    if (!guide) return;
    const pair = guide.pairs[index];
    if (!pair) return;

    setIsSpeaking(true);
    const text = `Par número ${index + 1}: ${pair.point1} para ${pair.point2}. ${pair.description}`;
    await speakText(text);
    setIsSpeaking(false);
  };

  const startDictation = async () => {
    if (!guide) return;
    setIsDictating(true);
    
    for (let i = currentPairIndex; i < guide.pairs.length; i++) {
      if (!isDictating) break; // Check if stopped
      setCurrentPairIndex(i);
      await dictatePair(i);
      if (i < guide.pairs.length - 1) {
        await new Promise(resolve => setTimeout(resolve, 2000)); // Wait between pairs
      }
    }
    
    setIsDictating(false);
  };

  const stopDictation = () => {
    setIsDictating(false);
    stopAllAudio();
  };

  const downloadGuide = () => {
    if (!guide) return;
    const text = `GUIA DE BIOMAGNETISMO - ${guide.pathology.toUpperCase()}\n\n` +
      `Explicação: ${guide.explanation}\n\n` +
      `PARES BIOMAGNÉTICOS:\n` +
      guide.pairs.map((p, i) => `${i + 1}. ${p.point1} -> ${p.point2} (${p.pathogen || 'Geral'}): ${p.description}`).join('\n');
    
    const element = document.createElement("a");
    const file = new Blob([text], { type: 'text/plain' });
    element.href = URL.createObjectURL(file);
    element.download = `guia_biomagnetismo_${guide.pathology.toLowerCase().replace(/\s+/g, '_')}.txt`;
    document.body.appendChild(element);
    element.click();
  };

  return (
    <div className="space-y-8 animate-fadeIn pb-20">
      <header className="flex justify-between items-end">
        <div>
          <h2 className="text-3xl font-black text-slate-900 tracking-tighter uppercase">Guia de Biomagnetismo</h2>
          <p className="text-slate-500 font-medium italic">Atlas digital e protocolos narrados para aplicação de imãs.</p>
        </div>
        <div className="px-4 py-2 bg-emerald-50 text-emerald-600 rounded-full flex items-center gap-2 text-[10px] font-black uppercase tracking-widest border border-emerald-100">
          <Shield size={14} /> Protocolo Seguro
        </div>
      </header>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
        {/* Search & Controls */}
        <div className="lg:col-span-4 space-y-6">
          <div className="bg-white p-8 rounded-[2.5rem] shadow-sm border border-slate-100 space-y-6">
            <div className="space-y-4">
              <div className="flex items-center gap-2 text-slate-400">
                <Search size={14} />
                <span className="text-[10px] font-black uppercase tracking-widest">Buscar Patologia</span>
              </div>
              <div className="relative">
                <input 
                  type="text"
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && handleSearch()}
                  placeholder="Ex: Gastrite, Ansiedade, Gripe..."
                  className="w-full pl-6 pr-14 py-4 bg-slate-50 rounded-2xl focus:outline-none focus:ring-4 focus:ring-emerald-500/10 transition-all text-sm font-bold border border-slate-100"
                />
                <button 
                  onClick={() => handleSearch()}
                  disabled={loading || !searchTerm.trim()}
                  className="absolute right-2 top-1/2 -translate-y-1/2 w-10 h-10 bg-emerald-600 text-white rounded-xl flex items-center justify-center shadow-lg hover:bg-emerald-700 transition-all disabled:opacity-50"
                >
                  {loading ? <RefreshCw className="animate-spin" size={18} /> : <ChevronRight size={18} />}
                </button>
              </div>
            </div>

            {patientData && (
              <button
                onClick={() => {
                  setSearchTerm(patientData.complaints);
                  handleSearch(patientData.complaints);
                }}
                className="w-full p-4 bg-slate-50 border border-slate-100 rounded-2xl flex items-center gap-3 group hover:bg-emerald-50 hover:border-emerald-100 transition-all"
              >
                <div className="w-10 h-10 bg-white rounded-xl flex items-center justify-center text-emerald-600 shadow-sm group-hover:scale-110 transition-transform">
                  <User size={18} />
                </div>
                <div className="text-left">
                  <p className="text-[8px] font-black text-slate-400 uppercase tracking-widest">Usar Queixa do Paciente</p>
                  <p className="text-[10px] font-black text-slate-900 truncate max-w-[180px]">{patientData.name}</p>
                </div>
              </button>
            )}

            <div className="p-6 bg-emerald-50 rounded-3xl border border-emerald-100 space-y-4">
              <div className="flex items-center gap-3 text-emerald-600">
                <Activity size={24} />
                <h3 className="font-black uppercase tracking-tight">Modo Ditado</h3>
              </div>
              <p className="text-xs text-emerald-800/70 leading-relaxed font-medium">
                A IA ditará os pares um a um, permitindo que você aplique os imãs sem precisar olhar para a tela.
              </p>
              <button
                onClick={isDictating ? stopDictation : startDictation}
                disabled={!guide || loading}
                className={`w-full py-4 rounded-2xl font-black text-[10px] uppercase tracking-widest transition-all flex items-center justify-center gap-2 shadow-lg disabled:opacity-50 ${
                  isDictating ? 'bg-red-500 text-white' : 'bg-slate-900 text-white'
                }`}
              >
                {isDictating ? <Square size={14} fill="currentColor" /> : <Volume2 size={14} />}
                {isDictating ? 'Parar Ditado' : 'Iniciar Ditado IA'}
              </button>
            </div>
          </div>

          {guide && (
            <div className="bg-white p-8 rounded-[2.5rem] shadow-sm border border-slate-100 space-y-6">
              <div className="flex items-center justify-between">
                <h4 className="text-[10px] font-black uppercase tracking-widest text-slate-400">Pares Encontrados</h4>
                <span className="bg-emerald-100 text-emerald-600 px-2 py-0.5 rounded text-[10px] font-black">{guide.pairs.length}</span>
              </div>
              <div className="space-y-2 max-h-[300px] overflow-y-auto custom-scrollbar pr-2">
                {guide.pairs.map((p, i) => (
                  <button
                    key={i}
                    onClick={() => {
                      setCurrentPairIndex(i);
                      dictatePair(i);
                    }}
                    className={`w-full p-4 rounded-2xl text-left transition-all border ${
                      currentPairIndex === i 
                        ? 'bg-emerald-600 border-emerald-600 text-white shadow-lg shadow-emerald-100 scale-[1.02]' 
                        : 'bg-slate-50 border-slate-100 text-slate-600 hover:bg-slate-100'
                    }`}
                  >
                    <div className="flex justify-between items-start mb-1">
                      <p className={`text-[10px] font-black uppercase tracking-widest ${currentPairIndex === i ? 'text-white/70' : 'text-slate-400'}`}>Par {i + 1}</p>
                      {currentPairIndex === i && isSpeaking && <RefreshCw size={10} className="animate-spin" />}
                    </div>
                    <p className="text-xs font-black uppercase">{p.point1} → {p.point2}</p>
                  </button>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Atlas & Details */}
        <div className="lg:col-span-8 space-y-8">
          <div className="bg-white rounded-[3.5rem] shadow-sm border border-slate-100 overflow-hidden min-h-[600px] flex flex-col">
            <AnimatePresence mode="wait">
              {guide ? (
                <motion.div
                  key="guide-content"
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                  className="flex-1 flex flex-col"
                >
                  {/* Atlas Image */}
                  <div className="relative h-[400px] bg-slate-100">
                    {atlasImage ? (
                      <img 
                        src={atlasImage} 
                        alt="Atlas de Biomagnetismo" 
                        className="w-full h-full object-cover"
                        referrerPolicy="no-referrer"
                      />
                    ) : (
                      <div className="w-full h-full flex flex-col items-center justify-center gap-4">
                        <RefreshCw className="animate-spin text-slate-300" size={32} />
                        <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Gerando Atlas Anatômico...</p>
                      </div>
                    )}
                    <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent"></div>
                    <div className="absolute bottom-8 left-8 right-8 text-white">
                      <h3 className="text-3xl font-black uppercase tracking-tighter">{guide.pathology}</h3>
                      <p className="text-white/70 text-xs font-medium italic mt-1">{guide.explanation}</p>
                    </div>
                    <button 
                      onClick={downloadGuide}
                      className="absolute top-6 right-6 p-4 bg-white/10 backdrop-blur-md text-white rounded-2xl hover:bg-white/20 transition-all border border-white/20"
                    >
                      <Download size={20} />
                    </button>
                  </div>

                  {/* Current Pair Detail */}
                  <div className="p-10 flex-1 bg-white relative">
                    <div className="flex items-center justify-between mb-8">
                      <div className="flex items-center gap-4">
                        <div className="w-12 h-12 bg-emerald-600 text-white rounded-2xl flex items-center justify-center shadow-lg shadow-emerald-100">
                          <Zap size={24} />
                        </div>
                        <div>
                          <h4 className="text-xl font-black text-slate-900 uppercase tracking-tight">
                            {guide.pairs[currentPairIndex].point1} <span className="text-emerald-500 mx-2">→</span> {guide.pairs[currentPairIndex].point2}
                          </h4>
                          <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Ponto de Aplicação Ativo</p>
                        </div>
                      </div>
                      <div className="flex gap-2">
                        <button 
                          onClick={() => setCurrentPairIndex(prev => Math.max(0, prev - 1))}
                          disabled={currentPairIndex === 0}
                          className="p-3 bg-slate-50 text-slate-400 rounded-xl hover:bg-emerald-50 hover:text-emerald-600 transition-all disabled:opacity-30"
                        >
                          <ChevronLeft size={20} />
                        </button>
                        <button 
                          onClick={() => setCurrentPairIndex(prev => Math.min(guide.pairs.length - 1, prev + 1))}
                          disabled={currentPairIndex === guide.pairs.length - 1}
                          className="p-3 bg-slate-50 text-slate-400 rounded-xl hover:bg-emerald-50 hover:text-emerald-600 transition-all disabled:opacity-30"
                        >
                          <ChevronRight size={20} />
                        </button>
                      </div>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                      <div className="space-y-4">
                        <div className="flex items-center gap-2 text-slate-400">
                          <Info size={14} />
                          <span className="text-[10px] font-black uppercase tracking-widest">Descrição do Par</span>
                        </div>
                        <p className="text-sm text-slate-600 font-medium leading-relaxed">
                          {guide.pairs[currentPairIndex].description}
                        </p>
                      </div>
                      <div className="space-y-4">
                        <div className="flex items-center gap-2 text-slate-400">
                          <Sparkles size={14} />
                          <span className="text-[10px] font-black uppercase tracking-widest">Patógeno Relacionado</span>
                        </div>
                        <div className="p-4 bg-slate-50 rounded-2xl border border-slate-100">
                          <p className="text-sm font-black text-slate-900 uppercase italic">
                            {guide.pairs[currentPairIndex].pathogen || 'Equilíbrio Energético Geral'}
                          </p>
                        </div>
                      </div>
                    </div>

                    {/* Progress Bar */}
                    <div className="absolute bottom-0 left-0 right-0 h-1.5 bg-slate-100">
                      <motion.div 
                        className="h-full bg-emerald-600"
                        initial={{ width: 0 }}
                        animate={{ width: `${((currentPairIndex + 1) / guide.pairs.length) * 100}%` }}
                      />
                    </div>
                  </div>
                </motion.div>
              ) : (
                <motion.div
                  key="empty-state"
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  className="flex-1 flex flex-col items-center justify-center p-20 text-center space-y-6"
                >
                  <div className="w-32 h-32 bg-emerald-50 rounded-[3rem] flex items-center justify-center text-emerald-200 mx-auto border-2 border-dashed border-emerald-100 group-hover:scale-110 transition-transform">
                    <Zap size={48} />
                  </div>
                  <div className="max-w-xs space-y-2">
                    <p className="text-[10px] font-black uppercase tracking-[0.4em] text-slate-400">Aguardando Busca</p>
                    <p className="text-xs text-slate-400 font-medium italic">
                      Busque por uma patologia para gerar o atlas anatômico e o guia de pares biomagnéticos.
                    </p>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>

            {loading && (
              <div className="absolute inset-0 bg-white/80 backdrop-blur-sm flex flex-col items-center justify-center z-50">
                <div className="w-16 h-16 border-4 border-emerald-600 border-t-transparent rounded-full animate-spin mb-4"></div>
                <p className="text-xs font-black text-emerald-600 uppercase tracking-widest animate-pulse">Sincronizando Atlas de Biomagnetismo...</p>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
