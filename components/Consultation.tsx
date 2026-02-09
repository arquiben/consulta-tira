
import React, { useState, useRef, useEffect } from 'react';
import { GoogleGenAI, LiveServerMessage, Modality, GenerateContentResponse } from '@google/genai';
import { Message, PatientData } from '../types';
import { speakText } from '../services/tts';

interface ConsultationProps {
  patientData: PatientData | null;
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

export const Consultation: React.FC<ConsultationProps> = ({ patientData, onReopenReport, hasReport }) => {
  const [messages, setMessages] = useState<Message[]>([]);
  const [inputText, setInputText] = useState('');
  const [isLive, setIsLive] = useState(false);
  const [transcription, setTranscription] = useState('');
  const [isTyping, setIsTyping] = useState(false);
  const [isSpeaking, setIsSpeaking] = useState(false);
  
  const scrollRef = useRef<HTMLDivElement>(null);
  const audioContextRef = useRef<AudioContext | null>(null);
  const liveSessionRef = useRef<any>(null);
  const nextStartTimeRef = useRef(0);
  const sourcesRef = useRef<Set<AudioBufferSourceNode>>(new Set());
  const chatAudioRef = useRef<{ source: AudioBufferSourceNode, audioCtx: AudioContext } | null>(null);

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages, transcription, isTyping]);

  // Limpar áudio ao sair do componente
  useEffect(() => {
    return () => {
      stopAllAudio();
    };
  }, []);

  const stopAllAudio = () => {
    if (chatAudioRef.current) {
      try { chatAudioRef.current.source.stop(); } catch(e) {}
      chatAudioRef.current = null;
    }
    sourcesRef.current.forEach(s => {
      try { s.stop(); } catch(e) {}
    });
    sourcesRef.current.clear();
    setIsSpeaking(false);
  };

  const handleSendText = async () => {
    if (!inputText.trim()) return;
    
    // Para áudio anterior se houver
    stopAllAudio();

    const userMsg: Message = { role: 'user', content: inputText, timestamp: new Date() };
    setMessages(prev => [...prev, userMsg]);
    const messageToSend = inputText;
    setInputText('');
    setIsTyping(true);
    
    try {
      const ai = new GoogleGenAI({ apiKey: process.env.API_KEY || '' });
      const contextStr = patientData ? `PACIENTE: ${patientData.name}, IMC: ${patientData.bmi}, TA: ${patientData.bloodPressure}, Queixas: ${patientData.complaints}` : 'Paciente não identificado';
      
      const streamResponse = await ai.models.generateContentStream({
        model: 'gemini-3-flash-preview',
        contents: `${contextStr}. CONSULTA SOBRE PATOLOGIA/DOENÇA: ${messageToSend}`,
        config: { 
          systemInstruction: "Você é o Consulfision. Você é um especialista em patologias e clínica integrativa. Realize uma consulta completa sobre QUALQUER doença ou condição relatada. Forneça diagnósticos diferenciais, sugestões de tratamento e explicações fisiológicas profundas. Seja clínico e resolutivo." 
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

      // VOZ AUTOMÁTICA DO RESULTADO (apenas após o término do stream para garantir contexto completo)
      if (fullText) {
        setIsSpeaking(true);
        const result = await speakText(fullText);
        if (result) {
          chatAudioRef.current = result;
          result.source.start();
          result.source.onended = () => setIsSpeaking(false);
        } else {
          setIsSpeaking(false);
        }
      }

    } catch (err) {
      console.error(err);
      setIsSpeaking(false);
      setIsTyping(false);
    }
  };

  const startLiveSession = async () => {
    try {
      stopAllAudio();
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
            
            if (message.serverContent?.turnComplete) {
              // Note: final transcription handling is complex in live mode
              // We could store it here if desired
              setTranscription('');
            }
          },
          onerror: (e) => console.error(e),
          onclose: () => setIsLive(false),
        },
        config: {
          responseModalities: [Modality.AUDIO],
          outputAudioTranscription: {},
          systemInstruction: `Você é o Consulfision, assistente de voz clínico universal. Sua função é analisar qualquer patologia ou doença relatada pelo paciente ou terapeuta. Forneça orientações técnicas, seguras e integrativas. Contexto do Paciente: ${patientData?.name || 'Não informado'}.`
        }
      });
      
      liveSessionRef.current = await sessionPromise;
    } catch (err) {
      console.error(err);
    }
  };

  const stopLiveSession = () => {
    if (liveSessionRef.current) {
      liveSessionRef.current.close();
      setIsLive(false);
    }
  };

  return (
    <div className="flex flex-col h-[80vh] bg-white rounded-[2.5rem] shadow-2xl overflow-hidden border border-slate-100 animate-fadeIn">
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
        <div className="flex gap-4">
          {isSpeaking && (
            <button
              onClick={stopAllAudio}
              className="bg-red-100 text-red-600 px-6 py-3 rounded-2xl font-black text-xs uppercase tracking-widest hover:bg-red-200 transition-all flex items-center gap-2"
            >
              <span>⏹️</span> Parar Voz
            </button>
          )}
          {hasReport && (
            <button
              onClick={onReopenReport}
              className="bg-blue-600 text-white px-8 py-3 rounded-2xl font-black text-xs transition-all shadow-xl uppercase tracking-widest border-b-4 border-blue-800 hover:bg-blue-700"
            >
              🔄 Reaver Protocolo
            </button>
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
          <div className="h-full flex flex-col items-center justify-center text-center p-8 space-y-6">
            <div className="w-24 h-24 bg-white rounded-full shadow-xl flex items-center justify-center text-4xl group hover:scale-110 transition-transform">🔬</div>
            <div className="max-w-md space-y-2">
               <h3 className="font-black text-slate-900 text-xl tracking-tight">Qual patologia deseja analisar?</h3>
               <p className="text-slate-500 text-sm leading-relaxed">Pode descrever sintomas de qualquer doença, perguntar sobre patologias complexas ou solicitar interpretação clínica de estados de saúde.</p>
            </div>
          </div>
        )}
        {messages.map((m, i) => (
          <div key={i} className={`flex ${m.role === 'user' ? 'justify-end' : 'justify-start'} animate-slideUp`}>
            <div className={`max-w-[85%] md:max-w-[70%] p-6 rounded-[2rem] shadow-sm text-sm md:text-base leading-relaxed ${
              m.role === 'user' 
                ? 'bg-emerald-900 text-white rounded-tr-none font-medium' 
                : 'bg-white text-slate-800 border border-slate-100 rounded-tl-none font-medium relative'
            }`}>
              {m.content}
              {m.role === 'model' && i === messages.length - 1 && isSpeaking && (
                <div className="absolute -bottom-2 -right-2 bg-blue-500 text-white w-6 h-6 rounded-full flex items-center justify-center text-[10px] animate-bounce">
                  🔊
                </div>
              )}
            </div>
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
        {isLive && transcription && (
          <div className="flex justify-start">
             <div className="bg-blue-900 text-white p-6 rounded-[2rem] shadow-2xl italic animate-pulse text-sm md:text-base border-b-4 border-blue-600">
               {transcription}...
             </div>
          </div>
        )}
      </div>

      <div className="p-6 bg-white border-t border-slate-100 flex gap-4 items-center">
        <input
          type="text"
          value={inputText}
          onChange={(e) => setInputText(e.target.value)}
          onKeyDown={(e) => e.key === 'Enter' && handleSendText()}
          placeholder="Digite a patologia ou sintomas para consulta completa..."
          className="flex-1 px-6 py-4 bg-slate-50 rounded-2xl focus:outline-none focus:ring-4 focus:ring-emerald-500/10 transition-all text-sm md:text-base font-medium border border-slate-100"
        />
        <button
          onClick={handleSendText}
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
