
import React, { useState, useEffect, useRef } from 'react';
import { speakText } from '../services/tts';
import { translations } from '../translations';
import { Volume2, Square, Loader2, ArrowRight } from 'lucide-react';

interface WelcomeIntroProps {
  onFinish: () => void;
}

const introText = `Ao longo da história da humanidade, o cuidado com a saúde sempre seguiu diferentes caminhos, moldados pela ciência, pela cultura e pela experiência ancestral dos povos. Atualmente, duas grandes abordagens convivem e se complementam no cuidado com o ser humano: a medicina convencional (científica) e a medicina tradicional ou holística.

A medicina convencional, baseada em evidências científicas, avanços tecnológicos e estudos clínicos rigorosos, tem um papel fundamental no diagnóstico preciso, no tratamento de doenças agudas, no controle de epidemias e na realização de intervenções cirúrgicas que salvam vidas. Ela atua com rapidez e eficácia sobretudo nos momentos críticos da saúde humana.

Por outro lado, a medicina holística compreende o ser humano como um todo — corpo, mente, emoções e energia — valorizando a prevenção, o equilíbrio interno e as terapias naturais. Enraizada em saberes tradicionais e práticas integrativas, ela promove o fortalecimento do organismo, o autocuidado e a harmonia entre o indivíduo e o seu meio.

Quando essas duas abordagens trabalham em paralelo, com respeito e responsabilidade, os benefícios para a humanidade são amplificados. A ciência oferece precisão e segurança, enquanto a visão holística acrescenta profundidade, humanização e prevenção. Juntas, constroem um modelo de cuidado mais completo, eficaz e centrado no bem-estar integral do ser humano.

A verdadeira evolução da saúde não está na exclusão, mas na integração consciente desses dois caminhos, colocando a vida, a dignidade e o equilíbrio humano no centro de todas as práticas terapêuticas.`;

export const WelcomeIntro: React.FC<WelcomeIntroProps> = ({ onFinish }) => {
  const [isSpeaking, setIsSpeaking] = useState(false);
  const [loadingAudio, setLoadingAudio] = useState(false);
  const audioRef = useRef<{ source: AudioBufferSourceNode, audioCtx: AudioContext } | null>(null);
  const t = translations.pt;

  const handleStartVoice = async () => {
    if (isSpeaking) {
      if (audioRef.current) {
        audioRef.current.source.stop();
        audioRef.current = null;
      }
      setIsSpeaking(false);
      return;
    }

    setLoadingAudio(true);
    try {
      const result = await speakText(introText);
      setLoadingAudio(false);

      if (result) {
        audioRef.current = result;
        setIsSpeaking(true);
        result.source.onended = () => {
          setIsSpeaking(false);
          audioRef.current = null;
        };
      }
    } catch (err) {
      console.error("Erro ao iniciar áudio automático:", err);
      setLoadingAudio(false);
    }
  };

  useEffect(() => {
    // Inicia a leitura automática após um pequeno delay para garantir que o DOM está pronto
    // Nota: Alguns navegadores podem bloquear áudio automático se não houver interação prévia.
    // Como o usuário clica para entrar no app ou ativa a licença, o contexto de áudio geralmente é permitido.
    const timer = setTimeout(() => {
      handleStartVoice();
    }, 1500);

    return () => {
      clearTimeout(timer);
      if (audioRef.current) {
        audioRef.current.source.stop();
      }
    };
  }, []);

  return (
    <div className="fixed inset-0 z-[600] bg-slate-900 flex items-center justify-center p-4 md:p-6">
      <div className="max-w-4xl w-full bg-white rounded-3xl shadow-[0_50px_100px_rgba(0,0,0,0.5)] overflow-hidden flex flex-col max-h-[90vh] animate-slideUp">
        
        <div className="bg-emerald-950 p-6 md:p-8 text-white flex flex-col md:flex-row justify-between items-center gap-4 relative overflow-hidden shrink-0">
          <div className="relative z-10">
            <h1 className="text-2xl md:text-3xl font-black tracking-tighter uppercase mb-1">Manifesto Consulfision</h1>
            <div className="flex items-center gap-2">
               <span className="w-1.5 h-1.5 bg-emerald-400 rounded-full animate-pulse"></span>
               <p className="text-emerald-400 text-[9px] font-black uppercase tracking-[0.3em]">IA Voice Narrator Active</p>
            </div>
          </div>
          <button 
            onClick={handleStartVoice}
            disabled={loadingAudio}
            className={`relative z-10 px-6 py-3 rounded-xl font-black text-[10px] uppercase tracking-widest transition-all shadow-xl flex items-center gap-2 ${
              isSpeaking ? 'bg-red-500 hover:bg-red-600' : 'bg-emerald-500 hover:bg-emerald-400 text-emerald-950'
            }`}
          >
            {loadingAudio ? (
              <>
                <Loader2 size={14} className="animate-spin" />
                <span>Sincronizando...</span>
              </>
            ) : isSpeaking ? (
              <>
                <Square size={14} fill="currentColor" /> Parar
              </>
            ) : (
              <>
                <Volume2 size={14} /> Ouvir Manifesto
              </>
            )}
          </button>
          <div className="absolute -right-20 -top-20 w-64 h-64 bg-emerald-500/10 rounded-full blur-3xl"></div>
        </div>

        <div className="flex-1 overflow-y-auto p-6 md:p-10 custom-scrollbar bg-slate-50/50">
          <div className="max-w-3xl mx-auto space-y-8">
            <div className="flex items-center gap-4 opacity-30">
               <div className="h-px bg-slate-400 flex-1"></div>
               <span className="text-[9px] font-black uppercase tracking-[0.5em] text-slate-500 shrink-0">Filosofia NSOFISION</span>
               <div className="h-px bg-slate-400 flex-1"></div>
            </div>

            <div className="space-y-6 text-slate-700 leading-relaxed font-medium text-base text-justify">
              {introText.split('\n\n').map((paragraph, i) => (
                <p key={i} className={`transition-all duration-1000 ${isSpeaking ? 'opacity-100 text-slate-900' : 'opacity-70'}`}>
                  {paragraph}
                </p>
              ))}
            </div>

            <div className="pt-8 border-t border-slate-200">
               <div className="bg-emerald-900 text-white p-6 md:p-8 rounded-2xl shadow-2xl relative overflow-hidden group">
                  <div className="relative z-10 flex flex-col md:flex-row items-center justify-between gap-6">
                     <div className="text-center md:text-left">
                        <h4 className="font-black uppercase text-sm tracking-tight mb-0.5">Entendido e Pronto</h4>
                        <p className="text-emerald-400 text-[10px] font-bold uppercase tracking-widest">Hub de Inteligência Bio-Integrativa</p>
                     </div>
                     <button 
                       onClick={onFinish}
                       className="w-full md:w-auto bg-white text-emerald-950 px-10 py-4 rounded-xl font-black text-[10px] uppercase tracking-widest shadow-xl hover:scale-105 active:scale-95 transition-all group-hover:bg-emerald-400 transition-colors"
                     >
                       Prosseguir Agora <ArrowRight size={14} />
                     </button>
                  </div>
                  <div className="absolute top-0 right-0 w-48 h-48 bg-white/5 rounded-full -mr-24 -mt-24 group-hover:scale-150 transition-transform duration-1000"></div>
               </div>
            </div>
          </div>
        </div>

        <div className="p-4 bg-white border-t border-slate-100 text-center shrink-0">
           <p className="text-[8px] font-black text-slate-400 uppercase tracking-[0.5em]">Obra Exclusiva • Quissambi Benvindo • Consulfision 2026</p>
        </div>
      </div>
    </div>
  );
};
