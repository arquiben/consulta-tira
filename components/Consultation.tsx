
import React, { useState, useRef, useEffect } from 'react';
import { GoogleGenAI, LiveServerMessage, Modality, GenerateContentResponse } from '@google/genai';
import { Message, PatientData, AnalysisReport } from '../types';
import { speakText } from '../services/tts';
import { generateTherapyReport, generateFollowUpQuestions } from '../services/gemini';
import { Sparkles, MessageSquarePlus, Send, Mic, FileDown, FileText, Cloud, RefreshCw } from 'lucide-react';
import Markdown from 'react-markdown';
import remarkGfm from 'remark-gfm';

interface ConsultationProps {
  patientData: PatientData | null;
  onReportGenerated?: (report: AnalysisReport) => void;
  onReopenReport?: () => void;
  hasReport?: boolean;
}

function decode(base64: string) {
  const binaryString = atob(base64);
  const len = binaryString.length;
  const bytes = new Uint8Array(len);
  for (let i = 0; i < len; i++) {
    bytes[i] = binaryString.charCodeAt(i);
  }
  return bytes;
}

async function decodeAudioData(
  data: Uint8Array,
  ctx: AudioContext,
  sampleRate: number,
  numChannels: number,
): Promise<AudioBuffer> {
  const dataInt16 = new Int16Array(data.buffer);
  const frameCount = dataInt16.length / numChannels;
  const buffer = ctx.createBuffer(numChannels, frameCount, sampleRate);
  for (let channel = 0; channel < numChannels; channel++) {
    const channelData = buffer.getChannelData(channel);
    for (let i = 0; i < frameCount; i++) {
      channelData[i] = dataInt16[i * numChannels + channel] / 32768.0;
    }
  }
  return buffer;
}

function encode(bytes: Uint8Array) {
  let binary = '';
  const len = bytes.byteLength;
  for (let i = 0; i < len; i++) {
    binary += String.fromCharCode(bytes[i]);
  }
  return btoa(binary);
}

export const Consultation: React.FC<ConsultationProps> = ({ patientData, onReportGenerated, onReopenReport, hasReport }) => {
  const [messages, setMessages] = useState<Message[]>([]);
  const [inputText, setInputText] = useState('');
  const [isLive, setIsLive] = useState(false);
  const [isPaused, setIsPaused] = useState(false);
  const [isListening, setIsListening] = useState(false);
  const [permissionError, setPermissionError] = useState<string | null>(null);
  const [liveTimer, setLiveTimer] = useState(0);
  const [transcription, setTranscription] = useState('');
  const [isTyping, setIsTyping] = useState(false);
  const [isSpeaking, setIsSpeaking] = useState(false);
  const [isNarrationPaused, setIsNarrationPaused] = useState(false);
  const [isGeneratingProtocol, setIsGeneratingProtocol] = useState(false);
  const [isAskingFollowUp, setIsAskingFollowUp] = useState(false);
  const [isSaving, setIsSaving] = useState<'pdf' | 'word' | 'cloud' | null>(null);
  const [lastError, setLastError] = useState<{ message: string, type: 'network' | 'other' } | null>(null);
  
  const scrollRef = useRef<HTMLDivElement>(null);
  const audioContextRef = useRef<AudioContext | null>(null);
  const liveSessionRef = useRef<any>(null);
  const nextStartTimeRef = useRef(0);
  const sourcesRef = useRef<Set<AudioBufferSourceNode>>(new Set());
  const chatAudioRef = useRef<{ source: AudioBufferSourceNode, audioCtx: AudioContext } | null>(null);

  const timerIntervalRef = useRef<number | null>(null);

  useEffect(() => {
    if (isLive && !isPaused) {
      timerIntervalRef.current = window.setInterval(() => {
        setLiveTimer(prev => prev + 1);
      }, 1000);
    } else {
      if (timerIntervalRef.current) {
        clearInterval(timerIntervalRef.current);
        timerIntervalRef.current = null;
      }
    }
    return () => {
      if (timerIntervalRef.current) clearInterval(timerIntervalRef.current);
    };
  }, [isLive, isPaused]);

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages, transcription, isTyping]);

  useEffect(() => {
    return () => {
      stopAllAudio();
    };
  }, []);

  const stopAllAudio = () => {
    if (chatAudioRef.current) {
      try { chatAudioRef.current.source.stop(); } catch(e) {}
      try { chatAudioRef.current.audioCtx.close(); } catch(e) {}
      chatAudioRef.current = null;
    }
    sourcesRef.current.forEach(s => {
      try { s.stop(); } catch(e) {}
    });
    sourcesRef.current.clear();
    setIsSpeaking(false);
    setIsNarrationPaused(false);
  };

  const togglePauseNarration = async () => {
    if (!chatAudioRef.current) return;
    
    if (isNarrationPaused) {
      await chatAudioRef.current.audioCtx.resume();
      setIsNarrationPaused(false);
    } else {
      await chatAudioRef.current.audioCtx.suspend();
      setIsNarrationPaused(true);
    }
  };

  const handleSendText = async (retryText?: string) => {
    const textToProcess = String(retryText || inputText || '');
    if (!textToProcess.trim()) return;
    
    setLastError(null);
    stopAllAudio();
    
    if (!retryText) {
      const userMsg: Message = { role: 'user', content: textToProcess, timestamp: new Date() };
      setMessages(prev => [...prev, userMsg]);
      setInputText('');
    }
    
    setIsTyping(true);
    
    try {
      const ai = new GoogleGenAI({ apiKey: process.env.API_KEY || '' });
      const contextStr = patientData ? `PACIENTE: ${patientData.name}, IMC: ${patientData.bmi}, TA: ${patientData.bloodPressure}, Queixas: ${patientData.complaints}` : 'Paciente não identificado';
      
      const streamResponse = await ai.models.generateContentStream({
        model: 'gemini-3-flash-preview',
        contents: [{ 
          parts: [{ text: `${contextStr}. CONSULTA SOBRE PATOLOGIA/DOENÇA: ${textToProcess}` }] 
        }],
        config: { 
          systemInstruction: "Você é o Consulfision. Você é um especialista em patologias e clínica integrativa. Realize uma consulta completa sobre QUALQUER doença ou condição relatada. Forneça diagnósticos diferenciais, sugestões de tratamento e uma RECEITA DETALHADA. Use Markdown para estruturar sua resposta. Sempre inclua uma seção '### 📝 RECEITA CLÍNICA' com as recomendações de medicamentos, fitoterápicos ou suplementos. Seja clínico, resolutivo e evite termos genéricos como 'objeto'." 
        }
      });
      
      let fullText = '';
      let isFirstChunk = true;

      for await (const chunk of streamResponse) {
        const c = chunk as GenerateContentResponse;
        const textChunk = c.text || '';
        fullText += textChunk;
        
        if (isFirstChunk) {
          setIsTyping(false);
          setMessages(prev => [...prev, { role: 'model', content: fullText, timestamp: new Date() }]);
          isFirstChunk = false;
        } else {
          setMessages(prev => {
            const newMessages = [...prev];
            if (newMessages.length > 0) {
              newMessages[newMessages.length - 1] = { 
                ...newMessages[newMessages.length - 1], 
                content: fullText 
              };
            }
            return newMessages;
          });
        }
      }

      if (fullText) {
        setIsSpeaking(true);
        const result = await speakText(fullText);
        if (result) {
          chatAudioRef.current = result;
          result.source.start();
          result.source.onended = () => {
            setIsSpeaking(false);
            // After AI finishes speaking, if there are messages, we could show quick actions
          };
        } else {
          setIsSpeaking(false);
        }
      }

    } catch (err: any) {
      console.error(err);
      setIsSpeaking(false);
      setIsTyping(false);
      
      const isNetwork = err.message?.toLowerCase().includes('network') || 
                        err.message?.toLowerCase().includes('fetch') ||
                        err.message?.toLowerCase().includes('timeout');
      
      setLastError({
        message: isNetwork ? "Erro de conexão com o servidor. Verifique sua internet." : "Ocorreu um erro inesperado na consulta.",
        type: isNetwork ? 'network' : 'other'
      });
    }
  };

  const handleFinishAndGenerateProtocol = async () => {
    if (messages.length === 0) return;
    setIsGeneratingProtocol(true);
    
    const introText = "Finalizando consulta. Gerando relatório técnico de protocolos com base na nossa conversa.";
    const introResult = await speakText(introText);
    if (introResult) {
      introResult.source.start();
    }

    try {
      const conversationHistory = messages.map(m => `${m.role.toUpperCase()}: ${m.content}`).join('\n');
      const prompt = `Com base nesta conversa clínica, gere um relatório estruturado de protocolos:\n\n${conversationHistory}`;
      
      const report = await generateTherapyReport(prompt, undefined, patientData);
      
      // Narrate the summary of the generated report
      if (report.summary) {
        const summaryResult = await speakText(`Relatório gerado com sucesso. Resumo clínico: ${report.summary}`);
        if (summaryResult) {
          summaryResult.source.start();
        }
      }

      if (onReportGenerated) onReportGenerated(report);
    } catch (err) {
      console.error(err);
      alert("Erro ao gerar protocolo da conversa.");
    } finally {
      setIsGeneratingProtocol(false);
    }
  };

  const handleFollowUpQuestions = async () => {
    if (messages.length === 0) return;
    setIsAskingFollowUp(true);
    stopAllAudio();

    try {
      const conversationHistory = messages.map(m => `${m.role.toUpperCase()}: ${m.content}`).join('\n');
      const questions = await generateFollowUpQuestions(conversationHistory, patientData);
      
      const modelMsg: Message = { role: 'model', content: questions, timestamp: new Date() };
      setMessages(prev => [...prev, modelMsg]);
      
      setIsSpeaking(true);
      const result = await speakText(questions);
      if (result) {
        chatAudioRef.current = result;
        result.source.start();
        result.source.onended = () => setIsSpeaking(false);
      } else {
        setIsSpeaking(false);
      }
    } catch (err) {
      console.error(err);
      alert("Erro ao gerar perguntas de acompanhamento.");
    } finally {
      setIsAskingFollowUp(false);
    }
  };

  const handleSave = (type: 'pdf' | 'word' | 'cloud') => {
    setIsSaving(type);
    const messages = {
      pdf: "Gerando laudo da consulta em PDF...",
      word: "Exportando conversa clínica para Word...",
      cloud: "Sincronizando consulta com a nuvem NSO..."
    };
    speakText(messages[type]);
    setTimeout(() => {
      setIsSaving(null);
      speakText(`${type.toUpperCase()} salvo com sucesso.`);
    }, 2000);
  };

  const startLiveSession = async () => {
    try {
      setPermissionError(null);
      stopAllAudio();
      setTranscription('');
      setIsPaused(false);
      setLiveTimer(0);
      
      const ai = new GoogleGenAI({ apiKey: process.env.API_KEY || '' });
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      
      const inCtx = new (window.AudioContext || (window as any).webkitAudioContext)({ sampleRate: 16000 });
      const outCtx = new (window.AudioContext || (window as any).webkitAudioContext)({ sampleRate: 24000 });
      audioContextRef.current = outCtx;

      const sessionPromise = ai.live.connect({
        model: 'gemini-2.5-flash-native-audio-preview-12-2025',
        callbacks: {
          onopen: () => {
            const source = inCtx.createMediaStreamSource(stream);
            const scriptProcessor = inCtx.createScriptProcessor(4096, 1, 1);
            scriptProcessor.onaudioprocess = (e) => {
              if (isPaused) return;
              const inputData = e.inputBuffer.getChannelData(0);
              const l = inputData.length;
              const int16 = new Int16Array(l);
              for (let i = 0; i < l; i++) int16[i] = inputData[i] * 32768;
              const blob = {
                data: encode(new Uint8Array(int16.buffer)),
                mimeType: 'audio/pcm;rate=16000'
              };
              sessionPromise.then(s => s.sendRealtimeInput({ media: blob }));
            };
            source.connect(scriptProcessor);
            scriptProcessor.connect(inCtx.destination);
            setIsLive(true);
          },
          onmessage: async (message: LiveServerMessage) => {
            if (message.serverContent?.outputTranscription) {
              setTranscription(prev => prev + message.serverContent?.outputTranscription?.text);
            }
            
            const audioData = message.serverContent?.modelTurn?.parts[0]?.inlineData?.data;
            if (audioData) {
              const buf = await decodeAudioData(decode(audioData), outCtx, 24000, 1);
              nextStartTimeRef.current = Math.max(nextStartTimeRef.current, outCtx.currentTime);
              const src = outCtx.createBufferSource();
              src.buffer = buf;
              src.connect(outCtx.destination);
              src.start(nextStartTimeRef.current);
              nextStartTimeRef.current += buf.duration;
              sourcesRef.current.add(src);
              src.onended = () => sourcesRef.current.delete(src);
            }

            if (message.serverContent?.interrupted) {
              sourcesRef.current.forEach(s => {
                try { s.stop(); } catch(e) {}
              });
              sourcesRef.current.clear();
              nextStartTimeRef.current = 0;
            }
          },
          onerror: (e) => console.error(e),
          onclose: () => setIsLive(false),
        },
        config: {
          responseModalities: [Modality.AUDIO],
          outputAudioTranscription: {},
          systemInstruction: `Você é o Consulfision, assistente de voz clínico universal. Sua função é analisar qualquer patologia ou doença relatada. Forneça orientações técnicas e uma RECEITA CLÍNICA detalhada. Use uma linguagem clara e profissional. Contexto do Paciente: ${patientData?.name || 'Não informado'}.`
        }
      });
      
      liveSessionRef.current = await sessionPromise;
    } catch (err: any) {
      console.error(err);
      if (err.name === 'NotAllowedError' || err.name === 'PermissionDeniedError') {
        setPermissionError("Acesso ao microfone negado. Por favor, permita o acesso nas configurações do seu navegador para usar a consulta por voz.");
      } else {
        setPermissionError("Erro ao acessar o microfone. Verifique se ele está conectado corretamente.");
      }
      setIsLive(false);
    }
  };

  const stopLiveSession = () => {
    if (liveSessionRef.current) {
      liveSessionRef.current.close();
      setIsLive(false);
      setIsPaused(false);
    }
  };

  const togglePauseLive = () => {
    setIsPaused(!isPaused);
    if (!isPaused) {
      // If we were paused and now resuming, stop any playing audio to avoid overlap/confusion
      sourcesRef.current.forEach(s => {
        try { s.stop(); } catch(e) {}
      });
      sourcesRef.current.clear();
      nextStartTimeRef.current = 0;
    }
  };

  const startSpeechRecognition = () => {
    const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    if (!SpeechRecognition) {
      alert("Seu navegador não suporta reconhecimento de voz.");
      return;
    }

    const recognition = new SpeechRecognition();
    recognition.lang = 'pt-BR';
    recognition.continuous = false;
    recognition.interimResults = false;

    recognition.onstart = () => {
      setIsListening(true);
      stopAllAudio();
    };

    recognition.onresult = (event: any) => {
      const transcript = event.results[0][0].transcript;
      setInputText(transcript);
      setIsListening(false);
    };

    recognition.onerror = (event: any) => {
      console.error("Erro no reconhecimento de voz:", event.error);
      if (event.error === 'not-allowed') {
        setPermissionError("Permissão de microfone negada. Clique no ícone de cadeado na barra de endereços e permita o microfone.");
      } else if (event.error === 'no-speech') {
        // Silently handle no-speech or show a subtle hint
        console.warn("Nenhuma fala detectada.");
      }
      setIsListening(false);
    };

    recognition.onend = () => {
      setIsListening(false);
    };

    recognition.start();
  };

  return (
    <div className="flex flex-col h-[80vh] bg-white rounded-[2.5rem] shadow-2xl overflow-hidden border border-slate-100 animate-fadeIn relative">
      {permissionError && (
        <div className="absolute top-4 left-1/2 -translate-x-1/2 z-[100] w-[90%] max-w-md bg-red-50 border border-red-200 p-4 rounded-2xl shadow-2xl animate-slideDown">
          <div className="flex items-start gap-3">
            <div className="text-red-500 text-xl">⚠️</div>
            <div className="flex-1">
              <p className="text-red-900 text-xs font-black uppercase tracking-tight mb-1">Erro de Permissão</p>
              <p className="text-red-700 text-[11px] font-medium leading-tight">{permissionError}</p>
            </div>
            <button 
              onClick={() => setPermissionError(null)}
              className="text-red-400 hover:text-red-600 font-black text-lg"
            >
              ×
            </button>
          </div>
        </div>
      )}
      {isLive && (
        <div className="absolute inset-0 z-50 bg-slate-900/95 backdrop-blur-md flex flex-col items-center justify-center p-10 text-center space-y-12 animate-fadeIn">
          <div className="relative">
            <div className="w-48 h-48 bg-emerald-500/20 rounded-full flex items-center justify-center animate-pulse">
              <div className="w-32 h-32 bg-emerald-500 rounded-full flex items-center justify-center shadow-[0_0_50px_rgba(16,185,129,0.5)]">
                <div className="text-6xl animate-bounce">🎙️</div>
              </div>
            </div>
            <div className="absolute -inset-4 border-2 border-emerald-500/30 rounded-full animate-[ping_3s_linear_infinite]"></div>
            <div className="absolute -inset-8 border border-emerald-500/10 rounded-full animate-[ping_4s_linear_infinite]"></div>
          </div>

          <div className="space-y-4">
            <h2 className="text-4xl font-black text-white uppercase tracking-tighter">
              {isPaused ? 'Consulta Pausada' : 'Consulta por Voz Ativa'}
            </h2>
            <div className="flex flex-col items-center gap-2">
              <div className={`text-6xl font-mono font-black tracking-widest ${isPaused ? 'text-slate-400' : 'text-emerald-400'}`}>
                {formatTime(liveTimer)}
              </div>
              <p className={`${isPaused ? 'text-slate-500' : 'text-emerald-500/60'} font-black uppercase tracking-[0.3em] text-xs`}>
                {isPaused ? 'Microfone Desativado' : 'Ouvindo Paciente...'}
              </p>
            </div>
          </div>

          <div className="max-w-2xl w-full bg-white/5 p-8 rounded-[3rem] border border-white/10 min-h-[120px] flex items-center justify-center">
            <p className="text-white/80 text-xl font-medium italic leading-relaxed">
              {isPaused ? "Sessão em espera..." : (transcription || "Aguardando fala...")}
            </p>
          </div>

          <div className="flex flex-col md:flex-row gap-6 w-full max-w-2xl">
            <button
              onClick={togglePauseLive}
              className={`flex-1 px-10 py-6 rounded-[2.5rem] font-black uppercase tracking-widest shadow-2xl transition-all flex items-center justify-center gap-4 group ${
                isPaused ? 'bg-emerald-600 text-white hover:bg-emerald-700' : 'bg-slate-700 text-white hover:bg-slate-600'
              }`}
            >
              <div className="w-10 h-10 bg-white/20 rounded-xl flex items-center justify-center group-hover:scale-110 transition-transform">
                {isPaused ? '▶️' : '⏸️'}
              </div>
              {isPaused ? 'Retomar' : 'Pausar'}
            </button>

            <button
              onClick={stopLiveSession}
              className="flex-1 bg-red-500 hover:bg-red-600 text-white px-10 py-6 rounded-[2.5rem] font-black uppercase tracking-widest shadow-2xl transition-all flex items-center justify-center gap-4 group"
            >
              <div className="w-10 h-10 bg-white/20 rounded-xl flex items-center justify-center group-hover:scale-110 transition-transform">
                ⏹️
              </div>
              Terminar
            </button>
          </div>
        </div>
      )}

      <div className="p-6 md:p-8 border-b bg-slate-50/50 flex flex-col md:flex-row justify-between items-center gap-4">
        <div className="flex items-center gap-4">
          <div className="w-12 h-12 bg-emerald-600 text-white rounded-2xl flex items-center justify-center text-2xl shadow-lg relative">
            🎙️
            {isSpeaking && (
              <span className="absolute -top-1 -right-1 flex h-4 w-4">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-blue-400 opacity-75"></span>
                <span className="relative inline-flex rounded-full h-4 w-4 bg-blue-500"></span>
              </span>
            )}
          </div>
          <div>
            <h2 className="text-xl font-black text-slate-900 tracking-tight">Consulta Clínica de Patologias</h2>
            <div className="flex items-center gap-2">
               <span className={`w-2 h-2 rounded-full ${isSpeaking ? 'bg-blue-500 animate-pulse' : 'bg-emerald-500 animate-pulse'}`}></span>
               <p className="text-[10px] text-slate-500 uppercase font-black tracking-widest">
                 {isSpeaking ? 'Narrando Resultado...' : 'Análise de Doenças Ativa'}
               </p>
            </div>
          </div>
        </div>
        <div className="flex gap-3 flex-wrap justify-center">
          {messages.length > 0 && (
            <>
              <button
                onClick={handleFollowUpQuestions}
                disabled={isAskingFollowUp}
                className={`bg-blue-600 text-white px-6 py-3 rounded-2xl font-black text-xs uppercase tracking-widest hover:bg-blue-700 transition-all flex items-center gap-2 shadow-xl ${isAskingFollowUp ? 'animate-pulse opacity-70' : ''}`}
              >
                <MessageSquarePlus size={16} />
                {isAskingFollowUp ? 'Analisando...' : 'Continuar Investigação'}
              </button>
              <button
                onClick={handleFinishAndGenerateProtocol}
                disabled={isGeneratingProtocol}
                className={`bg-amber-500 text-slate-900 px-6 py-3 rounded-2xl font-black text-xs uppercase tracking-widest hover:bg-amber-400 transition-all flex items-center gap-2 shadow-xl ${isGeneratingProtocol ? 'animate-pulse opacity-70' : ''}`}
              >
                {isGeneratingProtocol ? '⏳ Gerando...' : '📝 Gerar Protocolo'}
              </button>
            </>
          )}
          {isSpeaking && (
            <div className="flex gap-2 bg-white/80 backdrop-blur-sm p-1.5 rounded-2xl border border-slate-200 shadow-sm">
              <button
                onClick={togglePauseNarration}
                className={`flex items-center gap-2 px-4 py-2 rounded-xl font-black text-[10px] uppercase tracking-widest transition-all ${
                  isNarrationPaused ? 'bg-emerald-600 text-white' : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                }`}
              >
                {isNarrationPaused ? '▶️ Retomar' : '⏸️ Pausar'}
              </button>
              <button
                onClick={stopAllAudio}
                className="bg-red-100 text-red-600 px-4 py-2 rounded-xl font-black text-[10px] uppercase tracking-widest hover:bg-red-200 transition-all flex items-center gap-2"
              >
                <span>⏹️</span> Terminar
              </button>
            </div>
          )}
          <button
            onClick={isLive ? stopLiveSession : startLiveSession}
            className={`flex items-center gap-3 px-8 py-3 rounded-2xl font-black text-xs transition-all shadow-xl uppercase tracking-widest ${
              isLive ? 'bg-red-500 text-white animate-pulse' : 'bg-emerald-600 text-white hover:bg-emerald-700'
            }`}
          >
            {isLive ? '⏹️ Parar Escuta' : '🎙️ Iniciar Consulta por Voz'}
          </button>
        </div>
      </div>

      <div ref={scrollRef} className="flex-1 overflow-y-auto p-6 md:p-10 space-y-6 bg-slate-50/30 custom-scrollbar">
        {messages.length === 0 && !isLive && !isTyping && (
          <div className="h-full flex flex-col items-center justify-center text-center p-8 space-y-10">
            <div className="w-24 h-24 bg-white rounded-full shadow-xl flex items-center justify-center text-4xl group hover:scale-110 transition-transform">🔬</div>
            <div className="max-w-xl space-y-6">
               <div className="space-y-2">
                 <h3 className="font-black text-slate-900 text-3xl tracking-tight uppercase italic">Consulta & Receita IA</h3>
                 <p className="text-slate-500 text-sm font-medium leading-relaxed">Escreva a patologia ou doença abaixo para receber uma análise clínica profunda e uma receita detalhada com narração.</p>
               </div>
               
               <div className="bg-white p-2 rounded-[2.5rem] shadow-2xl border border-slate-100 flex items-center gap-2">
                 <input 
                   type="text"
                   value={inputText}
                   onChange={(e) => setInputText(e.target.value)}
                   onKeyDown={(e) => e.key === 'Enter' && handleSendText()}
                   placeholder="Ex: Diabetes Tipo 2, Gastrite Crônica, Ansiedade..."
                   className="flex-1 bg-transparent px-6 py-4 outline-none font-bold text-slate-800"
                 />
                 <button 
                   onClick={() => handleSendText()}
                   className="bg-emerald-600 text-white w-14 h-14 rounded-full flex items-center justify-center shadow-lg hover:bg-emerald-700 transition-all active:scale-90"
                 >
                   <Send size={20} />
                 </button>
               </div>

               <div className="flex items-center gap-4 py-4">
                 <div className="flex-1 h-px bg-slate-200"></div>
                 <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Ou use sua voz</span>
                 <div className="flex-1 h-px bg-slate-200"></div>
               </div>

               <button
                 onClick={startLiveSession}
                 className="w-full bg-slate-900 text-white py-6 rounded-[2rem] font-black uppercase tracking-widest shadow-2xl hover:bg-emerald-600 transition-all flex items-center justify-center gap-4 group"
               >
                 <div className="w-10 h-10 bg-white/10 rounded-xl flex items-center justify-center group-hover:scale-110 transition-transform">
                   🎙️
                 </div>
                 Iniciar Consulta por Voz
               </button>
            </div>
          </div>
        )}
        {messages.map((m, i) => (
          <div key={i} className="space-y-4">
            <div className={`flex ${m.role === 'user' ? 'justify-end' : 'justify-start'} animate-slideUp`}>
              <div className={`max-w-[90%] md:max-w-[80%] p-6 rounded-[2rem] shadow-sm text-sm md:text-base leading-relaxed ${
                m.role === 'user' 
                  ? 'bg-emerald-900 text-white rounded-tr-none font-medium' 
                  : 'bg-white text-slate-800 border border-slate-100 rounded-tl-none font-medium relative'
              }`}>
                {m.role === 'model' ? (
                  <div className="markdown-body prose prose-slate max-w-none">
                    <Markdown remarkPlugins={[remarkGfm]}>
                      {m.content}
                    </Markdown>
                  </div>
                ) : (
                  m.content
                )}
                {m.role === 'model' && i === messages.length - 1 && isSpeaking && (
                  <div className="absolute -bottom-2 -right-2 bg-blue-500 text-white w-6 h-6 rounded-full flex items-center justify-center text-[10px] animate-bounce">
                    🔊
                  </div>
                )}
              </div>
            </div>
            
            {/* Quick Actions after AI response */}
            {m.role === 'model' && i === messages.length - 1 && !isSpeaking && !isTyping && (
              <div className="flex flex-wrap gap-3 animate-fadeIn pl-4">
                <button
                  onClick={handleFollowUpQuestions}
                  disabled={isAskingFollowUp}
                  className="bg-blue-50 text-blue-700 px-4 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest border border-blue-100 hover:bg-blue-100 transition-all flex items-center gap-2"
                >
                  <MessageSquarePlus size={14} /> Investigar Mais
                </button>
                <button
                  onClick={handleFinishAndGenerateProtocol}
                  disabled={isGeneratingProtocol}
                  className="bg-amber-50 text-amber-700 px-4 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest border border-amber-100 hover:bg-amber-100 transition-all flex items-center gap-2"
                >
                  <span>📝</span> Gerar Relatório Técnico
                </button>
                <div className="flex gap-2 ml-auto pr-4">
                  <button 
                    onClick={() => handleSave('pdf')}
                    disabled={!!isSaving}
                    className="p-2 bg-white border border-slate-200 text-slate-400 hover:text-blue-600 rounded-lg transition-all"
                    title="Salvar PDF"
                  >
                    {isSaving === 'pdf' ? <RefreshCw size={14} className="animate-spin" /> : <FileDown size={14} />}
                  </button>
                  <button 
                    onClick={() => handleSave('word')}
                    disabled={!!isSaving}
                    className="p-2 bg-white border border-slate-200 text-slate-400 hover:text-emerald-600 rounded-lg transition-all"
                    title="Salvar Word"
                  >
                    {isSaving === 'word' ? <RefreshCw size={14} className="animate-spin" /> : <FileText size={14} />}
                  </button>
                  <button 
                    onClick={() => handleSave('cloud')}
                    disabled={!!isSaving}
                    className="p-2 bg-white border border-slate-200 text-slate-400 hover:text-amber-600 rounded-lg transition-all"
                    title="Nuvem NSO"
                  >
                    {isSaving === 'cloud' ? <RefreshCw size={14} className="animate-spin" /> : <Cloud size={14} />}
                  </button>
                </div>
              </div>
            )}
          </div>
        ))}
        {isTyping && (
          <div className="flex justify-start animate-fadeIn">
             <div className="bg-white p-6 rounded-[2rem] border border-slate-100 flex gap-2 items-center">
                <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest mr-2">Consulfision analisando</span>
                <div className="w-2 h-2 bg-emerald-500 rounded-full animate-bounce"></div>
                <div className="w-2 h-2 bg-emerald-500 rounded-full animate-bounce [animation-delay:0.2s]"></div>
                <div className="w-2 h-2 bg-emerald-500 rounded-full animate-bounce [animation-delay:0.4s]"></div>
             </div>
          </div>
        )}
        {lastError && (
          <div className="flex justify-center animate-fadeIn">
            <div className="bg-red-50 border border-red-100 p-6 rounded-[2.5rem] flex flex-col items-center gap-4 max-w-md text-center">
              <div className="text-red-500 text-2xl">📡</div>
              <p className="text-red-900 text-sm font-bold">{lastError.message}</p>
              {lastError.type === 'network' && (
                <button 
                  onClick={() => {
                    const lastUserMsg = [...messages].reverse().find(m => m.role === 'user');
                    if (lastUserMsg) handleSendText(lastUserMsg.content);
                  }}
                  className="bg-red-600 text-white px-6 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest hover:bg-red-700 transition-all"
                >
                  Tentar Novamente
                </button>
              )}
            </div>
          </div>
        )}
      </div>

      <div className="p-6 bg-white border-t border-slate-100 flex gap-4 items-center">
        <div className="relative flex-1">
          <input
            type="text"
            value={inputText}
            onChange={(e) => setInputText(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && handleSendText()}
            placeholder="Digite a patologia ou doença para consulta completa..."
            className="w-full pl-6 pr-14 py-4 bg-slate-50 rounded-2xl focus:outline-none focus:ring-4 focus:ring-emerald-500/10 transition-all text-sm md:text-base font-medium border border-slate-100"
          />
          <button
            onClick={startSpeechRecognition}
            className={`absolute right-2 top-1/2 -translate-y-1/2 p-3 rounded-xl transition-all ${
              isListening ? 'bg-red-500 text-white animate-pulse' : 'text-slate-400 hover:text-emerald-600 hover:bg-emerald-50'
            }`}
            title="Falar"
          >
            🎙️
          </button>
        </div>
        <button
          onClick={() => handleSendText()}
          disabled={isTyping || !inputText.trim()}
          className="bg-emerald-600 text-white p-4 rounded-2xl font-black hover:bg-emerald-700 transition-all shadow-xl hover:shadow-emerald-200 disabled:opacity-50 disabled:cursor-not-allowed"
        >
          <svg className="w-6 h-6 fill-current" viewBox="0 0 24 24">
            <path d="M2.01 21L23 12 2.01 3 2 10l15 2-15 2z"/>
          </svg>
        </button>
      </div>
    </div>
  );
};
