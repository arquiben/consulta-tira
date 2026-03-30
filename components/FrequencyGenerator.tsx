
import React, { useState, useEffect, useRef } from 'react';
import { useStore } from '../store/useStore';
import { FrequencyProtocol } from '../types';
import { motion, AnimatePresence } from 'motion/react';
import { Activity, Save, Trash2, Play, Square as SquareIcon, Zap, Info, Clock, Plus, X, Layers, Search, Loader2, Sparkles, FileDown, Download } from 'lucide-react';
import { getGeminiAI, withRetry } from '../services/gemini';
import { Type } from "@google/genai";
import { generateFrequencyPDF, generateFrequencyWord } from '../services/documentGenerator';

export const FrequencyGenerator: React.FC = () => {
  const { saveFrequencyProtocol, frequencyProtocols, deleteFrequencyProtocol, patientData } = useStore();
  const [activeTab, setActiveTab] = useState<'individual' | 'mixtures' | 'search'>('individual');
  const [isExporting, setIsExporting] = useState<string | null>(null);
  
  // Search State
  const [searchQuery, setSearchQuery] = useState('');
  const [isSearching, setIsSearching] = useState(false);
  const [searchResults, setSearchResults] = useState<{ name: string, frequency: number, waveType: string, description: string }[]>([]);
  
  // Individual State
  const [name, setName] = useState('');
  const [frequency, setFrequency] = useState<number>(432);
  const [waveType, setWaveType] = useState<'sine' | 'square' | 'sawtooth' | 'triangle'>('sine');
  const [description, setDescription] = useState('');
  
  // Timer State
  const [timerMinutes, setTimerMinutes] = useState<number>(15);
  const [timeLeft, setTimeLeft] = useState<number | null>(null);
  const [isTimerRunning, setIsTimerRunning] = useState(false);
  
  // Mixture State
  const [mixtureName, setMixtureName] = useState('');
  const [selectedForMixture, setSelectedForMixture] = useState<FrequencyProtocol[]>([]);
  const [manualFreq, setManualFreq] = useState<string>('');
  const [manualWave, setManualWave] = useState<'sine' | 'square' | 'sawtooth' | 'triangle'>('sine');
  
  const [isSaving, setIsSaving] = useState(false);
  const [isPlaying, setIsPlaying] = useState<string | null>(null);
  const [isAutoGenerating, setIsAutoGenerating] = useState(false);
  
  const audioContextRef = useRef<AudioContext | null>(null);
  const activeOscillators = useRef<Map<string, { osc: OscillatorNode, gain: GainNode }>>(new Map());
  const timerIntervalRef = useRef<NodeJS.Timeout | null>(null);
  const manualFreqRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (activeTab === 'mixtures') {
      manualFreqRef.current?.focus();
    }
  }, [activeTab]);

  const stopAllFrequencies = () => {
    activeOscillators.current.forEach(({ osc }) => {
      try { osc.stop(); } catch (e) {}
    });
    activeOscillators.current.clear();
    setIsPlaying(null);
    setIsTimerRunning(false);
    setTimeLeft(null);
    if (timerIntervalRef.current) clearInterval(timerIntervalRef.current);
  };

  const toggleFrequency = async (id: string, freq: number, type: any, mixtureFrequencies?: any[]) => {
    if (isPlaying === id) {
      stopAllFrequencies();
      return;
    }

    stopAllFrequencies();

    if (!audioContextRef.current) {
      audioContextRef.current = new (window.AudioContext || (window as any).webkitAudioContext)();
    }

    const ctx = audioContextRef.current;
    if (ctx.state === 'suspended') {
      await ctx.resume();
    }

    if (mixtureFrequencies && mixtureFrequencies.length > 0) {
      mixtureFrequencies.forEach((f) => {
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();

        osc.type = f.waveType as any;
        osc.frequency.setValueAtTime(f.frequency, ctx.currentTime);
        
        gain.gain.setValueAtTime(0, ctx.currentTime);
        gain.gain.linearRampToValueAtTime(0.05, ctx.currentTime + 0.1);

        osc.connect(gain);
        gain.connect(ctx.destination);

        osc.start();
        activeOscillators.current.set(`${id}-${f.id}`, { osc, gain });
      });
    } else {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();

      osc.type = type;
      osc.frequency.setValueAtTime(freq, ctx.currentTime);
      
      gain.gain.setValueAtTime(0, ctx.currentTime);
      gain.gain.linearRampToValueAtTime(0.1, ctx.currentTime + 0.1);

      osc.connect(gain);
      gain.connect(ctx.destination);

      osc.start();
      activeOscillators.current.set(id, { osc, gain });
    }
    
    setIsPlaying(id);

    // Start timer if set
    if (timerMinutes > 0) {
      startTimer();
    }
  };

  const toggleMixture = async () => {
    if (isPlaying === 'mixture') {
      stopAllFrequencies();
      return;
    }

    if (selectedForMixture.length === 0) {
      alert("Selecione pelo menos uma frequência para misturar.");
      return;
    }

    stopAllFrequencies();

    if (!audioContextRef.current) {
      audioContextRef.current = new (window.AudioContext || (window as any).webkitAudioContext)();
    }

    const ctx = audioContextRef.current;
    if (ctx.state === 'suspended') {
      await ctx.resume();
    }
    
    selectedForMixture.forEach((protocol) => {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();

      osc.type = protocol.waveType as any;
      osc.frequency.setValueAtTime(protocol.frequency, ctx.currentTime);
      
      gain.gain.setValueAtTime(0, ctx.currentTime);
      gain.gain.linearRampToValueAtTime(0.05, ctx.currentTime + 0.1); // Lower volume for mixtures

      osc.connect(gain);
      gain.connect(ctx.destination);

      osc.start();
      activeOscillators.current.set(protocol.id, { osc, gain });
    });

    setIsPlaying('mixture');
    startTimer(); // Always start timer when mixture begins
  };

  const addManualToMixture = () => {
    const freq = Number(manualFreq);
    if (!freq || freq <= 0) {
      alert("Insira uma frequência válida.");
      return;
    }
    const manualProtocol: FrequencyProtocol = {
      id: `manual-${Date.now()}`,
      name: `Manual ${freq}Hz`,
      frequency: freq,
      waveType: manualWave,
      description: 'Frequência inserida manualmente na mistura.',
      createdAt: new Date().toISOString()
    };
    setSelectedForMixture(prev => [...prev, manualProtocol]);
    setManualFreq('');
  };

  const startTimer = () => {
    if (timerIntervalRef.current) clearInterval(timerIntervalRef.current);
    
    const totalSeconds = timerMinutes * 60;
    setTimeLeft(totalSeconds);
    setIsTimerRunning(true);

    timerIntervalRef.current = setInterval(() => {
      setTimeLeft((prev) => {
        if (prev === null || prev <= 1) {
          stopAllFrequencies();
          return null;
        }
        return prev - 1;
      });
    }, 1000);
  };

  useEffect(() => {
    return () => {
      stopAllFrequencies();
    };
  }, []);

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  const handleAutoGenerate = async () => {
    if (!patientData) {
      alert("Selecione um paciente primeiro.");
      return;
    }
    
    setIsAutoGenerating(true);
    setActiveTab('search');
    setSearchQuery(patientData.complaints);
    
    const { lastExamAnalysis } = useStore.getState();

    try {
      const ai = getGeminiAI();
      let prompt = `Sugira frequências de bio-ressonância (Rife, Solfeggio, etc.) para o paciente ${patientData.name} com as seguintes queixas: "${patientData.complaints}". 
        Histórico: ${patientData.history}.`;
      
      if (lastExamAnalysis) {
        prompt += `\nConsidere também os achados do último diagnóstico: ${lastExamAnalysis.summary}. 
        Achados específicos: ${lastExamAnalysis.findings.join(', ')}.`;
      }

      prompt += `\nRetorne uma lista de até 5 frequências relevantes.
        Para cada frequência, forneça: nome, valor em Hz (número), tipo de onda (sine, square, sawtooth ou triangle) e uma breve descrição terapêutica.`;

      const response = await withRetry(() => ai.models.generateContent({
        model: "gemini-3-flash-preview",
        contents: prompt,
        config: {
          responseMimeType: "application/json",
          responseSchema: {
            type: Type.ARRAY,
            items: {
              type: Type.OBJECT,
              properties: {
                name: { type: Type.STRING },
                frequency: { type: Type.NUMBER },
                waveType: { type: Type.STRING, description: "Deve ser um destes: sine, square, sawtooth, triangle" },
                description: { type: Type.STRING }
              },
              required: ["name", "frequency", "waveType", "description"]
            }
          }
        }
      }));
      
      const results = JSON.parse(response.text || "[]");
      setSearchResults(results);
    } catch (error) {
      console.error("Erro na geração automática de frequências:", error);
      alert("Erro ao gerar frequências automáticas. Tente novamente.");
    } finally {
      setIsAutoGenerating(false);
    }
  };

  const saveMixture = () => {
    if (!mixtureName) {
      alert("Dê um nome para a mistura.");
      return;
    }
    if (selectedForMixture.length === 0) {
      alert("Adicione frequências à mistura antes de salvar.");
      return;
    }

    setIsSaving(true);
    const newProtocol: FrequencyProtocol = {
      id: crypto.randomUUID(),
      name: mixtureName,
      frequency: 0, // Not used for mixtures
      waveType: 'sine', // Not used for mixtures
      description: `Mistura de ${selectedForMixture.length} frequências.`,
      createdAt: new Date().toISOString(),
      isMixture: true,
      mixtureFrequencies: selectedForMixture.map(p => ({
        id: p.id,
        name: p.name,
        frequency: p.frequency,
        waveType: p.waveType
      }))
    };

    setTimeout(() => {
      saveFrequencyProtocol(newProtocol);
      setMixtureName('');
      setSelectedForMixture([]);
      setIsSaving(false);
      alert("Mistura salva com sucesso!");
    }, 600);
  };

  const handleSearch = async () => {
    if (!searchQuery.trim()) return;
    
    setIsSearching(true);
    setSearchResults([]);
    
    try {
      const ai = getGeminiAI();
      const response = await withRetry(() => ai.models.generateContent({
        model: "gemini-3-flash-preview",
        contents: `Sugira frequências de bio-ressonância (Rife, Solfeggio, etc.) para a seguinte patologia ou condição: "${searchQuery}". 
        Retorne uma lista de até 5 frequências relevantes.
        Para cada frequência, forneça: nome, valor em Hz (número), tipo de onda (sine, square, sawtooth ou triangle) e uma breve descrição terapêutica.`,
        config: {
          responseMimeType: "application/json",
          responseSchema: {
            type: Type.ARRAY,
            items: {
              type: Type.OBJECT,
              properties: {
                name: { type: Type.STRING },
                frequency: { type: Type.NUMBER },
                waveType: { type: Type.STRING, description: "Deve ser um destes: sine, square, sawtooth, triangle" },
                description: { type: Type.STRING }
              },
              required: ["name", "frequency", "waveType", "description"]
            }
          }
        }
      }));
      
      const results = JSON.parse(response.text || "[]");
      setSearchResults(results);
    } catch (error) {
      console.error("Erro na pesquisa de frequências:", error);
      alert("Erro ao pesquisar frequências. Tente novamente.");
    } finally {
      setIsSearching(false);
    }
  };

  const handleSave = () => {
    if (!name || !frequency) {
      alert('Por favor, preencha o nome e a frequência.');
      return;
    }

    setIsSaving(true);
    const newProtocol: FrequencyProtocol = {
      id: crypto.randomUUID(),
      name,
      frequency,
      waveType,
      description,
      createdAt: new Date().toISOString(),
    };

    setTimeout(() => {
      saveFrequencyProtocol(newProtocol);
      setName('');
      setFrequency(432);
      setWaveType('sine');
      setDescription('');
      setIsSaving(false);
    }, 600);
  };

  return (
    <div className="max-w-6xl mx-auto p-6 space-y-10 animate-fadeIn">
      <header className="flex flex-col md:flex-row justify-between items-start md:items-center gap-6">
        <div className="space-y-2">
          <h2 className="text-4xl font-black text-slate-900 uppercase tracking-tighter flex items-center gap-4">
            <div className="w-12 h-12 bg-emerald-600 text-white rounded-2xl flex items-center justify-center shadow-lg">
              <Zap size={24} />
            </div>
            Gerador de Frequências Curativas
          </h2>
          <p className="text-slate-500 font-medium italic">Crie e armazene protocolos de bio-ressonância personalizados.</p>
        </div>

        {/* Timer Control */}
        <div className="bg-white p-4 rounded-3xl shadow-xl border border-slate-100 flex items-center gap-6">
          <div className="flex items-center gap-3">
            <Clock size={20} className="text-emerald-600" />
            <div className="space-y-0.5">
              <p className="text-[8px] font-black text-slate-400 uppercase tracking-widest">Tempo de Sessão</p>
              <div className="flex items-center gap-2">
                <input 
                  type="number" 
                  value={timerMinutes}
                  onChange={(e) => setTimerMinutes(Math.max(1, Number(e.target.value)))}
                  disabled={isTimerRunning}
                  className="w-12 bg-slate-50 border-none text-sm font-black text-slate-900 focus:ring-0 p-0"
                />
                <span className="text-[10px] font-black text-slate-400 uppercase">min</span>
              </div>
            </div>
          </div>
          {isTimerRunning && timeLeft !== null && (
            <div className="bg-emerald-600 text-white px-6 py-2 rounded-2xl font-black text-lg animate-pulse">
              {formatTime(timeLeft)}
            </div>
          )}
        </div>
      </header>

        {/* Tabs */}
        <div className="flex flex-wrap gap-4 border-b border-slate-200 pb-4">
          <button 
            onClick={() => setActiveTab('individual')}
            className={`px-8 py-3 rounded-2xl font-black text-xs uppercase tracking-widest transition-all flex items-center gap-2 ${activeTab === 'individual' ? 'bg-emerald-600 text-white shadow-lg' : 'bg-white text-slate-400 hover:bg-slate-50'}`}
          >
            <Zap size={16} />
            Frequência Individual
          </button>
          <button 
            onClick={() => setActiveTab('mixtures')}
            className={`px-8 py-3 rounded-2xl font-black text-xs uppercase tracking-widest transition-all flex items-center gap-2 ${activeTab === 'mixtures' ? 'bg-emerald-600 text-white shadow-lg' : 'bg-white text-slate-400 hover:bg-slate-50'}`}
          >
            <Layers size={16} />
            Misturas de Frequências
          </button>
          <button 
            onClick={() => setActiveTab('search')}
            className={`px-8 py-3 rounded-2xl font-black text-xs uppercase tracking-widest transition-all flex items-center gap-2 ${activeTab === 'search' ? 'bg-emerald-600 text-white shadow-lg' : 'bg-white text-slate-400 hover:bg-slate-50'}`}
          >
            <Search size={16} />
            Pesquisa de Patologias
          </button>
          {patientData && (
            <button 
              onClick={handleAutoGenerate}
              disabled={isAutoGenerating}
              className="px-8 py-3 rounded-2xl font-black text-xs uppercase tracking-widest transition-all flex items-center gap-2 bg-gradient-to-r from-emerald-500 to-blue-500 text-white shadow-lg hover:scale-105 disabled:opacity-50"
            >
              {isAutoGenerating ? <Loader2 size={16} className="animate-spin" /> : <Sparkles size={16} />}
              Gerar para Paciente
            </button>
          )}
        </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-10">
        {/* Form Section */}
        <div className="lg:col-span-1 space-y-8">
          {activeTab === 'search' ? (
            <div className="bg-white p-8 rounded-[3rem] shadow-2xl border border-slate-100 space-y-6">
              <div className="space-y-4">
                <div className="space-y-2">
                  <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest block px-2">Pesquisar Patologia</label>
                  <div className="flex gap-2">
                    <input
                      type="text"
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                      onKeyDown={(e) => e.key === 'Enter' && handleSearch()}
                      placeholder="Ex: Insônia, Gastrite..."
                      className="w-full p-4 bg-slate-50 rounded-2xl border border-slate-100 focus:border-emerald-500 focus:ring-4 focus:ring-emerald-500/10 transition-all font-bold outline-none"
                    />
                    <button
                      onClick={handleSearch}
                      disabled={isSearching}
                      className="bg-emerald-600 text-white p-4 rounded-2xl hover:bg-emerald-700 transition-all shadow-lg disabled:opacity-50"
                    >
                      {isSearching ? <Loader2 size={20} className="animate-spin" /> : <Search size={20} />}
                    </button>
                  </div>
                </div>
              </div>

              <div className="p-5 bg-emerald-50 rounded-3xl border border-emerald-100 flex gap-3 items-start">
                <Info size={18} className="text-emerald-600 shrink-0 mt-0.5" />
                <p className="text-[9px] text-emerald-800 font-medium leading-relaxed italic">
                  Utilize a inteligência artificial para encontrar frequências específicas baseadas em patologias. Você pode testar, salvar ou adicionar à sua mistura.
                </p>
              </div>

              <div className="space-y-4 max-h-[400px] overflow-y-auto pr-2 custom-scrollbar">
                {searchResults.length > 0 ? (
                  searchResults.map((res, idx) => (
                    <div key={idx} className="bg-slate-50 p-5 rounded-3xl border border-slate-100 space-y-3 group hover:border-emerald-200 transition-all">
                      <div className="flex justify-between items-start">
                        <div className="space-y-1">
                          <p className="text-xs font-black text-slate-900 uppercase tracking-tight">{res.name}</p>
                          <p className="text-[10px] font-bold text-emerald-600">{res.frequency} Hz • {res.waveType}</p>
                        </div>
                        <div className="flex gap-1">
                          <button 
                            onClick={() => toggleFrequency(`search-${idx}`, res.frequency, res.waveType)}
                            className={`p-2 rounded-xl transition-all ${
                              isPlaying === `search-${idx}` 
                                ? 'bg-red-500 text-white animate-pulse' 
                                : 'bg-emerald-600 text-white hover:bg-emerald-700'
                            }`}
                            title="Executar"
                          >
                            {isPlaying === `search-${idx}` ? <SquareIcon size={14} /> : <Play size={14} />}
                          </button>
                          <button 
                            onClick={() => {
                              const newProtocol: FrequencyProtocol = {
                                id: crypto.randomUUID(),
                                name: res.name,
                                frequency: res.frequency,
                                waveType: res.waveType as any,
                                description: res.description,
                                createdAt: new Date().toISOString(),
                              };
                              saveFrequencyProtocol(newProtocol);
                            }}
                            className="p-2 bg-slate-900 text-white rounded-xl hover:bg-emerald-600 transition-all"
                            title="Salvar Protocolo"
                          >
                            <Save size={14} />
                          </button>
                          <button 
                            onClick={() => {
                              const protocol: FrequencyProtocol = {
                                id: `search-mix-${idx}`,
                                name: res.name,
                                frequency: res.frequency,
                                waveType: res.waveType as any,
                                description: res.description,
                                createdAt: new Date().toISOString(),
                              };
                              if (!selectedForMixture.find(p => p.frequency === protocol.frequency)) {
                                setSelectedForMixture(prev => [...prev, protocol]);
                              }
                            }}
                            className="p-2 bg-blue-50 text-blue-600 rounded-xl hover:bg-blue-100 transition-all"
                            title="Adicionar à Mistura"
                          >
                            <Plus size={14} />
                          </button>
                        </div>
                      </div>
                      <p className="text-[9px] text-slate-500 font-medium leading-relaxed italic line-clamp-2">
                        {res.description}
                      </p>
                    </div>
                  ))
                ) : !isSearching && searchQuery && (
                  <div className="text-center py-10 opacity-40">
                    <Search size={32} className="mx-auto mb-2" />
                    <p className="text-[10px] font-black uppercase tracking-widest">Nenhum resultado encontrado</p>
                  </div>
                )}
              </div>
            </div>
          ) : activeTab === 'individual' ? (
            <div className="bg-white p-8 rounded-[3rem] shadow-2xl border border-slate-100 space-y-6">
              <div className="space-y-4">
                <div className="space-y-2">
                  <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest block px-2">Nome do Protocolo</label>
                  <input
                    type="text"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    placeholder="Ex: Alívio de Ansiedade"
                    className="w-full p-4 bg-slate-50 rounded-2xl border border-slate-100 focus:border-emerald-500 focus:ring-4 focus:ring-emerald-500/10 transition-all font-bold outline-none"
                  />
                </div>

                <div className="space-y-2">
                  <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest block px-2">Frequência (Hz)</label>
                  <div className="relative">
                    <input
                      type="number"
                      value={frequency}
                      onChange={(e) => setFrequency(Number(e.target.value))}
                      className="w-full p-4 bg-slate-50 rounded-2xl border border-slate-100 focus:border-emerald-500 focus:ring-4 focus:ring-emerald-500/10 transition-all font-bold outline-none pr-12"
                    />
                    <span className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-400 font-black text-xs">Hz</span>
                  </div>
                </div>

                <div className="space-y-2">
                  <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest block px-2">Tipo de Onda</label>
                  <div className="grid grid-cols-2 gap-2">
                    {(['sine', 'square', 'sawtooth', 'triangle'] as const).map((type) => (
                      <button
                        key={type}
                        onClick={() => setWaveType(type)}
                        className={`p-3 rounded-xl border-2 font-black text-[10px] uppercase tracking-widest transition-all ${
                          waveType === type
                            ? 'border-emerald-500 bg-emerald-50 text-emerald-700'
                            : 'border-slate-50 bg-slate-50 text-slate-400 hover:border-slate-200'
                        }`}
                      >
                        {type === 'sine' && 'Senoide'}
                        {type === 'square' && 'Quadrada'}
                        {type === 'sawtooth' && 'Dente Serra'}
                        {type === 'triangle' && 'Triangular'}
                      </button>
                    ))}
                  </div>
                </div>

                <div className="space-y-2">
                  <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest block px-2">Descrição / Notas Clínicas</label>
                  <textarea
                    value={description}
                    onChange={(e) => setDescription(e.target.value)}
                    placeholder="Descreva a aplicação clínica desta frequência..."
                    rows={4}
                    className="w-full p-4 bg-slate-50 rounded-2xl border border-slate-100 focus:border-emerald-500 focus:ring-4 focus:ring-emerald-500/10 transition-all font-medium outline-none resize-none"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <button
                  onClick={() => toggleFrequency('preview', frequency, waveType)}
                  className={`w-full py-5 rounded-2xl font-black uppercase tracking-widest shadow-xl transition-all flex items-center justify-center gap-3 ${
                    isPlaying === 'preview'
                      ? 'bg-red-500 text-white animate-pulse'
                      : 'bg-blue-600 text-white hover:bg-blue-700'
                  }`}
                >
                  {isPlaying === 'preview' ? (
                    <>
                      <SquareIcon size={18} />
                      Parar Teste
                    </>
                  ) : (
                    <>
                      <Play size={18} />
                      Testar Frequência
                    </>
                  )}
                </button>
                <button
                  onClick={handleSave}
                  disabled={isSaving}
                  className="w-full bg-slate-900 text-white py-5 rounded-2xl font-black uppercase tracking-widest shadow-xl hover:bg-emerald-600 transition-all flex items-center justify-center gap-3 disabled:opacity-50"
                >
                  {isSaving ? (
                    <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                  ) : (
                    <>
                      <Save size={18} />
                      Salvar
                    </>
                  )}
                </button>
              </div>
            </div>
          ) : (
            <div className="bg-white p-8 rounded-[3rem] shadow-2xl border border-slate-100 space-y-6">
              <div className="space-y-4">
                <div className="space-y-2">
                  <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest block px-2">Nome da Mistura</label>
                  <input
                    type="text"
                    value={mixtureName}
                    onChange={(e) => setMixtureName(e.target.value)}
                    placeholder="Ex: Protocolo Detox"
                    className="w-full p-4 bg-slate-50 rounded-2xl border border-slate-100 focus:border-emerald-500 focus:ring-4 focus:ring-emerald-500/10 transition-all font-bold outline-none"
                  />
                </div>

                <h4 className="text-[10px] font-black text-slate-400 uppercase tracking-widest block px-2">Adicionar Frequência Manual</h4>
                <div className="flex gap-2">
                  <div className="relative flex-1">
                    <input
                      ref={manualFreqRef}
                      type="number"
                      inputMode="decimal"
                      value={manualFreq}
                      onChange={(e) => setManualFreq(e.target.value)}
                      placeholder="Frequência"
                      className="w-full p-4 bg-slate-50 rounded-xl border border-slate-100 font-bold text-sm outline-none pr-10"
                    />
                    <span className="absolute right-3 top-1/2 -translate-y-1/2 text-[10px] font-black text-slate-400">Hz</span>
                  </div>
                  <select 
                    value={manualWave}
                    onChange={(e) => setManualWave(e.target.value as any)}
                    className="bg-slate-50 border border-slate-100 rounded-xl px-2 text-[10px] font-black uppercase outline-none"
                  >
                    <option value="sine">Seno</option>
                    <option value="square">Quad</option>
                    <option value="sawtooth">Serra</option>
                    <option value="triangle">Tri</option>
                  </select>
                  <button 
                    onClick={addManualToMixture}
                    className="bg-emerald-600 text-white p-3 rounded-xl hover:bg-emerald-700 transition-all"
                  >
                    <Plus size={16} />
                  </button>
                </div>

                <div className="flex justify-between items-center px-2 pt-2">
                  <h4 className="text-[10px] font-black text-slate-400 uppercase tracking-widest block">Mistura Ativa</h4>
                  {selectedForMixture.length > 0 && (
                    <button 
                      onClick={() => setSelectedForMixture([])}
                      className="text-[8px] font-black text-red-500 uppercase tracking-widest hover:underline"
                    >
                      Limpar Lista
                    </button>
                  )}
                </div>
                <div className="space-y-2 min-h-[150px] max-h-[300px] overflow-y-auto pr-2 custom-scrollbar">
                  {selectedForMixture.length === 0 ? (
                    <div className="h-40 flex flex-col items-center justify-center text-center p-6 border-2 border-dashed border-slate-100 rounded-3xl opacity-40">
                      <Plus size={24} className="mb-2" />
                      <p className="text-[10px] font-black uppercase tracking-widest">Adicione frequências da lista ao lado</p>
                    </div>
                  ) : (
                    selectedForMixture.map(protocol => (
                      <div key={protocol.id} className="bg-slate-50 p-4 rounded-2xl border border-slate-100 flex justify-between items-center group">
                        <div>
                          <p className="text-xs font-black text-slate-900 uppercase tracking-tight">{protocol.name}</p>
                          <p className="text-[10px] font-bold text-emerald-600">{protocol.frequency} Hz • {protocol.waveType}</p>
                        </div>
                        <button 
                          onClick={() => setSelectedForMixture(prev => prev.filter(p => p.id !== protocol.id))}
                          className="p-2 text-slate-300 hover:text-red-500 transition-colors"
                        >
                          <X size={14} />
                        </button>
                      </div>
                    ))
                  )}
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <button
                  onClick={toggleMixture}
                  disabled={selectedForMixture.length === 0}
                  className={`w-full py-5 rounded-2xl font-black uppercase tracking-widest shadow-xl transition-all flex items-center justify-center gap-3 disabled:opacity-30 ${
                    isPlaying === 'mixture'
                      ? 'bg-red-500 text-white animate-pulse'
                      : 'bg-emerald-600 text-white hover:bg-emerald-700 shadow-emerald-200'
                  }`}
                >
                  {isPlaying === 'mixture' ? (
                    <>
                      <SquareIcon size={18} />
                      Parar
                    </>
                  ) : (
                    <>
                      <Play size={18} />
                      Executar
                    </>
                  )}
                </button>
                <button
                  onClick={saveMixture}
                  disabled={isSaving || selectedForMixture.length === 0}
                  className="w-full bg-slate-900 text-white py-5 rounded-2xl font-black uppercase tracking-widest shadow-xl hover:bg-emerald-600 transition-all flex items-center justify-center gap-3 disabled:opacity-50"
                >
                  {isSaving ? (
                    <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                  ) : (
                    <>
                      <Save size={18} />
                      Salvar
                    </>
                  )}
                </button>
              </div>
              
              <div className="p-5 bg-blue-50 rounded-3xl border border-blue-100 flex gap-3 items-start">
                <Info size={18} className="text-blue-600 shrink-0 mt-0.5" />
                <p className="text-[9px] text-blue-800 font-medium leading-relaxed italic">
                  A mistura de frequências permite que múltiplos tons sejam executados simultaneamente para um efeito terapêutico combinado.
                </p>
              </div>
            </div>
          )}
        </div>

        {/* List Section */}
        <div className="lg:col-span-2 space-y-6">
          <div className="flex items-center justify-between px-4">
            <h3 className="text-xs font-black text-slate-400 uppercase tracking-[0.3em]">Protocolos Salvos</h3>
            <span className="bg-slate-100 text-slate-500 px-3 py-1 rounded-full text-[10px] font-black">{frequencyProtocols.length}</span>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <AnimatePresence mode="popLayout">
              {frequencyProtocols.length === 0 ? (
                <motion.div 
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  className="col-span-full bg-slate-50 border-2 border-dashed border-slate-200 rounded-[3rem] p-20 text-center space-y-4"
                >
                  <div className="w-16 h-16 bg-white rounded-2xl flex items-center justify-center mx-auto shadow-sm text-slate-300">
                    <Activity size={32} />
                  </div>
                  <div className="space-y-1">
                    <p className="text-slate-900 font-black uppercase tracking-tight">Nenhum protocolo personalizado</p>
                    <p className="text-slate-400 text-xs font-medium">Crie seu primeiro protocolo de frequência ao lado.</p>
                  </div>
                </motion.div>
              ) : (
                frequencyProtocols.map((protocol) => (
                  <motion.div
                    key={protocol.id}
                    layout
                    initial={{ opacity: 0, scale: 0.9 }}
                    animate={{ opacity: 1, scale: 1 }}
                    exit={{ opacity: 0, scale: 0.9 }}
                    className="bg-white p-6 rounded-[2.5rem] shadow-xl border border-slate-100 hover:border-emerald-200 transition-all group relative overflow-hidden"
                  >
                    <div className="absolute top-0 right-0 w-24 h-24 bg-emerald-500/5 rounded-full -mr-12 -mt-12 group-hover:bg-emerald-500/10 transition-all"></div>
                    
                    <div className="relative z-10 space-y-4">
                      <div className="flex justify-between items-start">
                        <div className="space-y-1">
                          <h4 className="text-lg font-black text-slate-900 uppercase tracking-tighter leading-tight">{protocol.name}</h4>
                          <div className="flex items-center gap-2">
                            <span className="w-2 h-2 bg-emerald-500 rounded-full animate-pulse"></span>
                            <span className="text-[10px] font-black text-emerald-600 uppercase tracking-widest">
                              {protocol.isMixture ? `${protocol.mixtureFrequencies?.length} Frequências` : `${protocol.frequency} Hz`}
                            </span>
                          </div>
                        </div>
                        <button 
                          onClick={() => deleteFrequencyProtocol(protocol.id)}
                          className="p-2 text-slate-300 hover:text-red-500 transition-colors"
                        >
                          <Trash2 size={16} />
                        </button>
                      </div>

                      <div className="flex gap-2">
                        <span className="bg-slate-50 px-3 py-1 rounded-lg text-[8px] font-black text-slate-500 uppercase tracking-widest border border-slate-100">
                          {protocol.isMixture ? 'Tipo: Mistura' : `Onda: ${protocol.waveType}`}
                        </span>
                        <span className="bg-slate-50 px-3 py-1 rounded-lg text-[8px] font-black text-slate-500 uppercase tracking-widest border border-slate-100">
                          {new Date(protocol.createdAt).toLocaleDateString('pt-BR')}
                        </span>
                      </div>

                      {protocol.description && (
                        <p className="text-slate-500 text-xs font-medium line-clamp-2 italic">
                          "{protocol.description}"
                        </p>
                      )}

                      <div className="pt-4 flex gap-2">
                        <button 
                          onClick={() => toggleFrequency(protocol.id, protocol.frequency, protocol.waveType, protocol.mixtureFrequencies)}
                          className={`flex-1 py-3 rounded-xl font-black text-[10px] uppercase tracking-widest shadow-lg transition-all flex items-center justify-center gap-2 ${
                            isPlaying === protocol.id 
                              ? 'bg-red-500 text-white animate-pulse' 
                              : 'bg-emerald-600 text-white hover:bg-emerald-700'
                          }`}
                        >
                          {isPlaying === protocol.id ? (
                            <>
                              <SquareIcon size={12} fill="currentColor" />
                              Parar
                            </>
                          ) : (
                            <>
                              <Play size={12} fill="currentColor" />
                              Executar
                            </>
                          )}
                        </button>
                        
                        <div className="flex gap-1">
                          <button 
                            onClick={async () => {
                              setIsExporting(protocol.id + '-pdf');
                              await generateFrequencyPDF(patientData, protocol);
                              setIsExporting(null);
                            }}
                            disabled={isExporting !== null}
                            className="p-3 bg-slate-50 text-slate-400 rounded-xl hover:bg-emerald-50 hover:text-emerald-600 transition-all disabled:opacity-50"
                            title="Exportar PDF"
                          >
                            {isExporting === protocol.id + '-pdf' ? <Loader2 size={14} className="animate-spin" /> : <Download size={14} />}
                          </button>
                          <button 
                            onClick={async () => {
                              setIsExporting(protocol.id + '-word');
                              await generateFrequencyWord(patientData, protocol);
                              setIsExporting(null);
                            }}
                            disabled={isExporting !== null}
                            className="p-3 bg-slate-50 text-slate-400 rounded-xl hover:bg-blue-50 hover:text-blue-600 transition-all disabled:opacity-50"
                            title="Exportar Word"
                          >
                            {isExporting === protocol.id + '-word' ? <Loader2 size={14} className="animate-spin" /> : <FileDown size={14} />}
                          </button>
                        </div>

                        {activeTab === 'mixtures' && (
                          <button 
                            onClick={() => {
                              if (!selectedForMixture.find(p => p.id === protocol.id)) {
                                setSelectedForMixture(prev => [...prev, protocol]);
                              }
                            }}
                            className="p-3 bg-blue-50 text-blue-600 rounded-xl hover:bg-blue-100 transition-all"
                            title="Adicionar à Mistura"
                          >
                            <Plus size={14} />
                          </button>
                        )}
                        <button className="p-3 bg-slate-50 text-slate-400 rounded-xl hover:bg-slate-100 transition-all">
                          <Info size={14} />
                        </button>
                      </div>
                    </div>
                  </motion.div>
                ))
              )}
            </AnimatePresence>
          </div>
        </div>
      </div>
    </div>
  );
};
