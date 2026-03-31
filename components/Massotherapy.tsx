import React, { useState, useEffect } from 'react';
import { Search, Activity, Play, Plus, ChevronRight, Info, Save, Wind, Sparkles, Loader2 } from 'lucide-react';
import { useStore } from '../store/useStore';
import { narrateText } from '../services/NarrationService';
import { GoogleGenAI, Type } from "@google/genai";
import { getGeminiAI } from "../services/gemini";

interface Massage {
  id: string;
  name: string;
  category: string;
  description: string;
  duration: string;
  benefits: string;
  steps?: string[];
}

const MOCK_MASSAGES: Massage[] = [
  {
    id: '1',
    name: 'Massagem Relaxante NSO',
    category: 'Relaxamento',
    description: 'Movimentos suaves e rítmicos para aliviar o estresse e a tensão muscular profunda.',
    duration: '60 min',
    benefits: 'Redução de cortisol, melhora do sono, relaxamento muscular.',
    steps: [
      'Inicie com deslizamento superficial em toda a coluna.',
      'Aplique amassamento suave nos trapézios.',
      'Realize movimentos circulares na região lombar.',
      'Finalize com vibração leve para relaxamento total.'
    ]
  },
  {
    id: '2',
    name: 'Drenagem Linfática Manual',
    category: 'Estética/Terapêutica',
    description: 'Técnica de massagem que estimula o sistema linfático para eliminar toxinas e reduzir edemas.',
    duration: '50 min',
    benefits: 'Redução de inchaço, desintoxicação, melhora da circulação.',
    steps: [
      'Estimule os linfonodos proximais (pescoço e axilas).',
      'Realize movimentos de bombeamento rítmico.',
      'Siga o sentido do fluxo linfático em direção aos gânglios.',
      'Mantenha a pressão extremamente leve e constante.'
    ]
  },
  {
    id: '3',
    name: 'Massagem Desportiva',
    category: 'Reabilitação',
    description: 'Focada em atletas, utiliza técnicas de compressão e alongamento para preparar ou recuperar a musculatura.',
    duration: '45 min',
    benefits: 'Prevenção de lesões, recuperação acelerada, aumento da flexibilidade.',
    steps: [
      'Aqueça a musculatura com fricção rápida.',
      'Aplique compressões profundas nos ventres musculares.',
      'Realize alongamentos passivos assistidos.',
      'Utilize técnicas de percussão para estimular a circulação.'
    ]
  },
  {
    id: '4',
    name: 'Liberação Miofascial',
    category: 'Terapêutica',
    description: 'Pressão aplicada em pontos específicos do tecido conjuntivo para liberar restrições e dor.',
    duration: '40 min',
    benefits: 'Melhora da postura, alívio de dores crônicas, maior amplitude de movimento.',
    steps: [
      'Identifique os pontos de gatilho (trigger points).',
      'Aplique pressão isquêmica sustentada por 30-90 segundos.',
      'Realize deslizamento profundo longitudinal na fáscia.',
      'Peça ao paciente para realizar movimentos ativos enquanto aplica a pressão.'
    ]
  }
];

export const Massotherapy: React.FC = () => {
  const { customProtocols, setCustomProtocols } = useStore();
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedMassage, setSelectedMassage] = useState<Massage | null>(null);
  const [aiMassages, setAiMassages] = useState<Massage[]>([]);
  const [isGenerating, setIsGenerating] = useState(false);
  const [displayedDescription, setDisplayedDescription] = useState('');
  const [displayedSteps, setDisplayedSteps] = useState<string[]>([]);

  const handleSaveProtocol = () => {
    if (!selectedMassage) return;
    
    const newProtocol = {
      id: `masso-${Date.now()}`,
      therapy: 'Massoterapia',
      title: selectedMassage.name,
      instructions: selectedMassage.description,
      steps: (selectedMassage.steps || []).map((step, idx) => ({
        order: idx + 1,
        action: step,
        detail: ''
      })),
      duration: selectedMassage.duration,
      sessions: 1,
      revaluationDays: 7,
      isCustom: true
    };
    
    setCustomProtocols([...customProtocols, newProtocol]);
    alert('Protocolo de massoterapia salvo com sucesso na Biblioteca!');
  };

  // Automatic narration and typing effect
  useEffect(() => {
    if (selectedMassage) {
      handleNarrate(selectedMassage);

      // Typing effect for description
      setDisplayedDescription('');
      let i = 0;
      const fullText = selectedMassage.description;
      const descInterval = setInterval(() => {
        setDisplayedDescription(fullText.slice(0, i + 1));
        i++;
        if (i >= fullText.length) clearInterval(descInterval);
      }, 15);

      // Sequential steps
      setDisplayedSteps([]);
      let currentStepIdx = 0;
      const steps = selectedMassage.steps || [];
      const showNextStep = () => {
        if (currentStepIdx < steps.length) {
          setDisplayedSteps(prev => [...prev, steps[currentStepIdx]]);
          currentStepIdx++;
          setTimeout(showNextStep, 500);
        }
      };
      setTimeout(showNextStep, 600);

      return () => clearInterval(descInterval);
    } else {
      setDisplayedDescription('');
      setDisplayedSteps([]);
    }
  }, [selectedMassage?.id]);

  const generateAIMassage = async (query: string) => {
    if (!query.trim()) return;
    setIsGenerating(true);
    try {
      const ai = getGeminiAI();
      const response = await ai.models.generateContent({
        model: "gemini-3-flash-preview",
        contents: `Gere uma lista de 2 a 3 protocolos de massoterapia para a seguinte condição: "${query}". 
        Retorne em formato JSON:
        Array<{
          name: string,
          category: string,
          description: string,
          duration: string,
          benefits: string,
          steps: string[]
        }>.`,
        config: {
          responseMimeType: "application/json",
          responseSchema: {
            type: Type.ARRAY,
            items: {
              type: Type.OBJECT,
              properties: {
                name: { type: Type.STRING },
                category: { type: Type.STRING },
                description: { type: Type.STRING },
                duration: { type: Type.STRING },
                benefits: { type: Type.STRING },
                steps: { type: Type.ARRAY, items: { type: Type.STRING } }
              },
              required: ["name", "category", "description", "duration", "benefits", "steps"]
            }
          }
        }
      });

      const generated = JSON.parse(response.text || "[]") as Massage[];
      const withIds = generated.map((m, idx) => ({ ...m, id: `ai-mass-${Date.now()}-${idx}` }));
      setAiMassages(withIds);
      if (withIds.length > 0) setSelectedMassage(withIds[0]);
    } catch (error) {
      console.error("Erro IA Massoterapia:", error);
    } finally {
      setIsGenerating(false);
    }
  };

  const localFiltered = MOCK_MASSAGES.filter(m => 
    m.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    m.category.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const filteredMassages = [...localFiltered, ...aiMassages];

  const handleSearch = () => {
    if (searchTerm.trim() === '') {
      setSelectedMassage(null);
      setAiMassages([]);
      return;
    }
    if (localFiltered.length > 0) {
      setSelectedMassage(localFiltered[0]);
      setAiMassages([]);
    } else {
      generateAIMassage(searchTerm);
    }
  };

  const handleNarrate = (m: Massage) => {
    let text = `Protocolo de Massagem: ${m.name}. Categoria: ${m.category}. Descrição: ${m.description}. Duração: ${m.duration}. Benefícios: ${m.benefits}.`;
    if (m.steps) text += ` Guia passo a passo: ${m.steps.join('. ')}`;
    narrateText(text);
  };

  return (
    <div className="space-y-6 animate-fadeIn pb-24">
      <header className="flex justify-between items-end">
        <div>
          <h2 className="text-2xl font-black text-slate-900 tracking-tight uppercase">Massoterapia Avançada</h2>
          <p className="text-slate-500 font-medium text-sm">Protocolos de massagem e terapias manuais</p>
        </div>
        <button className="bg-indigo-600 text-white p-3 rounded-2xl shadow-lg hover:bg-indigo-700 transition-all flex items-center gap-2 font-bold text-xs uppercase tracking-widest">
          <Plus size={18} /> Novo Protocolo
        </button>
      </header>

      <div className="flex gap-2">
        <div className="relative flex-1">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" size={20} />
          <input 
            type="text" 
            placeholder="Pesquisar massagens ou condições..." 
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && handleSearch()}
            className="w-full p-4 pl-12 bg-white rounded-3xl border border-slate-100 shadow-sm font-bold outline-none focus:ring-2 focus:ring-indigo-500/20 transition-all"
          />
        </div>
        <button 
          onClick={handleSearch}
          disabled={isGenerating}
          className="bg-slate-900 text-white px-6 rounded-3xl font-black text-xs uppercase tracking-widest hover:bg-slate-800 transition-all shadow-md flex items-center gap-2 disabled:opacity-50"
        >
          {isGenerating ? <Loader2 size={16} className="animate-spin" /> : <Search size={16} />}
          {isGenerating ? 'Gerando...' : 'Pesquisar'}
        </button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="space-y-4">
          <h3 className="text-xs font-black text-slate-400 uppercase tracking-widest px-2">Biblioteca de Massagens</h3>
          <div className="space-y-3">
            {isGenerating && (
              <div className="p-8 bg-white rounded-[2rem] border border-dashed border-indigo-200 flex flex-col items-center justify-center text-indigo-600 space-y-3 animate-pulse">
                <Sparkles size={32} />
                <p className="text-[10px] font-black uppercase tracking-widest text-center">A IA está criando um guia passo a passo personalizado...</p>
              </div>
            )}
            {filteredMassages.map(m => (
              <div 
                key={m.id}
                onClick={() => setSelectedMassage(m)}
                className={`p-4 rounded-[2rem] border transition-all cursor-pointer flex items-center justify-between group ${selectedMassage?.id === m.id ? 'bg-indigo-50 border-indigo-200' : 'bg-white border-slate-100 hover:border-indigo-100'} ${m.id.startsWith('ai-') ? 'border-l-4 border-l-indigo-500' : ''}`}
              >
                <div className="flex items-center gap-4">
                  <div className={`w-12 h-12 rounded-2xl flex items-center justify-center transition-all ${selectedMassage?.id === m.id ? 'bg-indigo-600 text-white' : 'bg-slate-100 text-slate-500 group-hover:bg-indigo-100 group-hover:text-indigo-600'}`}>
                    {m.id.startsWith('ai-') ? <Sparkles size={20} /> : <Wind size={20} />}
                  </div>
                  <div>
                    <div className="flex items-center gap-2">
                      <p className="font-black text-slate-900 leading-tight">{m.name}</p>
                      {m.id.startsWith('ai-') && (
                        <span className="bg-indigo-100 text-indigo-700 text-[8px] px-1.5 py-0.5 rounded-full font-black uppercase tracking-widest">IA</span>
                      )}
                    </div>
                    <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">{m.category}</p>
                  </div>
                </div>
                <ChevronRight size={18} className={selectedMassage?.id === m.id ? 'text-indigo-600' : 'text-slate-300'} />
              </div>
            ))}
          </div>
        </div>

        <div className="space-y-4">
          <h3 className="text-xs font-black text-slate-400 uppercase tracking-widest px-2">Detalhes do Protocolo</h3>
          {selectedMassage ? (
            <div className="bg-white p-8 rounded-[2.5rem] border border-slate-100 shadow-sm space-y-6 sticky top-6">
              <div className="flex justify-between items-start">
                <div>
                  <h4 className="text-xl font-black text-slate-900 leading-tight">{selectedMassage.name}</h4>
                  <span className="inline-block px-3 py-1 bg-indigo-100 text-indigo-700 rounded-full text-[10px] font-black uppercase tracking-widest mt-2">{selectedMassage.category}</span>
                </div>
                <button 
                  onClick={() => handleNarrate(selectedMassage)}
                  className="w-12 h-12 bg-indigo-600 text-white rounded-2xl flex items-center justify-center shadow-lg hover:bg-indigo-700 transition-all hover:scale-110"
                >
                  <Play size={20} fill="currentColor" />
                </button>
              </div>

              <div className="space-y-4">
                <div className="p-4 bg-slate-50 rounded-2xl border border-slate-100 space-y-1">
                  <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest flex items-center gap-1">
                    <Info size={12} /> Descrição Técnica
                  </p>
                  <p className="text-sm text-slate-700 font-medium leading-relaxed">
                    {displayedDescription}
                    {displayedDescription.length < (selectedMassage?.description?.length || 0) && (
                      <span className="inline-block w-1 h-4 bg-indigo-500 ml-1 animate-pulse" />
                    )}
                  </p>
                </div>

                {displayedSteps.length > 0 && (
                  <div className="p-4 bg-indigo-50 rounded-2xl border border-indigo-100 space-y-3">
                    <p className="text-[10px] font-black text-indigo-800 uppercase tracking-widest flex items-center gap-1">
                      <Activity size={12} /> Guia Passo a Passo (Sem Mestre)
                    </p>
                    <div className="space-y-2">
                      {displayedSteps.map((step, idx) => (
                        <div key={idx} className="flex gap-3 items-start animate-slideInRight">
                          <span className="w-5 h-5 bg-indigo-600 text-white rounded-full flex items-center justify-center text-[10px] font-black shrink-0 mt-0.5">{idx + 1}</span>
                          <p className="text-xs text-slate-700 font-bold">{step}</p>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                <div className="p-4 bg-slate-50 rounded-2xl border border-slate-100 space-y-1">
                  <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Benefícios Esperados</p>
                  <p className="text-sm text-slate-700 font-medium leading-relaxed">{selectedMassage.benefits}</p>
                </div>

                <div className="p-4 bg-slate-50 rounded-2xl border border-slate-100 space-y-1">
                  <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Duração Recomendada</p>
                  <p className="text-lg font-black text-slate-900">{selectedMassage.duration}</p>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <button 
                  onClick={() => {
                    handleSaveProtocol();
                  }}
                  className="py-4 bg-slate-900 text-white rounded-2xl font-black text-[10px] uppercase tracking-widest hover:bg-slate-800 transition-all shadow-xl flex items-center justify-center gap-2"
                >
                  Adicionar ao Protocolo
                </button>
                <button 
                  onClick={handleSaveProtocol}
                  className="py-4 bg-indigo-600 text-white rounded-2xl font-black text-[10px] uppercase tracking-widest hover:bg-indigo-700 transition-all shadow-xl flex items-center justify-center gap-2"
                >
                  <Save size={16} /> Salvar
                </button>
              </div>
            </div>
          ) : (
            <div className="h-64 bg-slate-50 border-2 border-dashed border-slate-200 rounded-[2.5rem] flex flex-col items-center justify-center text-slate-400 space-y-3">
              <Wind size={48} className="opacity-20" />
              <p className="text-xs font-bold uppercase tracking-widest">Selecione um protocolo para ver detalhes</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
