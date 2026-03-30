import React, { useState } from 'react';
import { Search, Activity, Play, Plus, ChevronRight, Info, Save, Sparkles, Loader2 } from 'lucide-react';
import { useStore } from '../store/useStore';
import { narrateText } from '../services/NarrationService';
import { GoogleGenAI, Type } from "@google/genai";

interface Exercise {
  id: string;
  name: string;
  category: string;
  pathology?: string;
  description: string;
  duration: string;
  reps: string;
  steps?: string[];
}

const MOCK_EXERCISES: Exercise[] = [
  {
    id: '1',
    name: 'Alongamento Cervical',
    category: 'Cervical',
    pathology: 'Cervicalgia',
    description: 'Incline a cabeça para o lado, levando a orelha em direção ao ombro. Mantenha por 30 segundos.',
    duration: '2 min',
    reps: '3 séries de 30s',
    steps: [
      'Sente-se com a postura ereta.',
      'Incline suavemente a cabeça para a direita.',
      'Use a mão direita para aplicar uma leve pressão.',
      'Mantenha por 30 segundos.',
      'Repita para o lado esquerdo.'
    ]
  },
  {
    id: '2',
    name: 'Fortalecimento de Core',
    category: 'Lombar',
    pathology: 'Lombalgia',
    description: 'Deite-se de costas, dobre os joelhos e levante o quadril. Mantenha por 10 segundos.',
    duration: '5 min',
    reps: '10 repetições',
    steps: [
      'Deite-se em uma superfície firme.',
      'Dobre os joelhos mantendo os pés no chão.',
      'Contraia o abdômen e levante o quadril.',
      'Mantenha a posição por 10 segundos.',
      'Desça lentamente e repita.'
    ]
  },
  {
    id: '3',
    name: 'Mobilidade de Ombro',
    category: 'Ombro',
    pathology: 'Impacto de Ombro',
    description: 'Gire os ombros para trás em movimentos circulares lentos.',
    duration: '3 min',
    reps: '20 repetições',
    steps: [
      'Fique de pé com os braços relaxados.',
      'Eleve os ombros em direção às orelhas.',
      'Rode-os para trás em um círculo amplo.',
      'Sinta a mobilidade das escápulas.',
      'Repita o movimento de forma fluida.'
    ]
  },
  {
    id: '4',
    name: 'Agachamento Terapêutico',
    category: 'Membros Inferiores',
    pathology: 'Fraqueza Muscular',
    description: 'Mantenha os pés afastados na largura dos ombros e desça o quadril como se fosse sentar em uma cadeira.',
    duration: '4 min',
    reps: '15 repetições',
    steps: [
      'Pés paralelos e afastados.',
      'Mantenha o peito aberto e olhar para frente.',
      'Desça o quadril como se fosse sentar.',
      'Não deixe os joelhos passarem da ponta dos pés.',
      'Retorne à posição inicial contraindo os glúteos.'
    ]
  },
  {
    id: '5',
    name: 'Exercício de Codman',
    category: 'Ombro / Bursite',
    pathology: 'Bursite / Capsulite Adesiva',
    description: 'Movimentos pendulares para descompressão da articulação do ombro.',
    duration: '5 min',
    reps: '3 séries de 1 min',
    steps: [
      'Incline o tronco para frente apoiando o braço são em uma mesa.',
      'Deixe o braço afetado pendurado relaxado.',
      'Inicie pequenos balanços para frente e para trás.',
      'Faça movimentos circulares suaves.',
      'O braço deve agir como um pêndulo, sem esforço muscular ativo.'
    ]
  },
  {
    id: '6',
    name: 'Ponte de Glúteo',
    category: 'Lombar / Quadril',
    pathology: 'Instabilidade Lombar',
    description: 'Fortalecimento da cadeia posterior para estabilização lombar.',
    duration: '4 min',
    reps: '12 repetições',
    steps: [
      'Deitado de costas com joelhos dobrados.',
      'Pés apoiados no chão.',
      'Eleve o quadril até alinhar com os joelhos.',
      'Mantenha a contração por 2 segundos.',
      'Retorne devagar.'
    ]
  },
  {
    id: '7',
    name: 'Exercício de Klapp',
    category: 'Escoliose',
    pathology: 'Escoliose Idiopática',
    description: 'Posicionamento em quatro apoios para correção de desvios posturais.',
    duration: '10 min',
    reps: '5 repetições de cada lado',
    steps: [
      'Fique na posição de quatro apoios.',
      'Mantenha a coluna neutra.',
      'Deslize o braço oposto à curvatura para frente.',
      'Sinta o alongamento na região côncava.',
      'Mantenha por 15 segundos e retorne.'
    ]
  },
  {
    id: '8',
    name: 'Método McKenzie - Extensão',
    category: 'Hérnia de Disco',
    pathology: 'Hérnia Discal Lombar',
    description: 'Exercício de centralização da dor para hérnias discais posteriores.',
    duration: '5 min',
    reps: '10 repetições',
    steps: [
      'Deite-se de bruços.',
      'Apoie as mãos no chão ao lado dos ombros.',
      'Estenda os braços elevando apenas o tronco.',
      'Mantenha o quadril relaxado no chão.',
      'Retorne à posição inicial.'
    ]
  }
];

export const Physiotherapy: React.FC = () => {
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedExercise, setSelectedExercise] = useState<Exercise | null>(null);
  const [aiExercises, setAiExercises] = useState<Exercise[]>([]);
  const [isGenerating, setIsGenerating] = useState(false);
  const [displayedDescription, setDisplayedDescription] = useState('');
  const [displayedSteps, setDisplayedSteps] = useState<string[]>([]);

  // Automatic narration and typing effect when an exercise is selected
  React.useEffect(() => {
    if (selectedExercise) {
      // 1. Automatic Narration
      handleNarrate(selectedExercise);

      // 2. Typing Effect for Description
      setDisplayedDescription('');
      let i = 0;
      const fullText = selectedExercise.description;
      const descInterval = setInterval(() => {
        setDisplayedDescription(fullText.slice(0, i + 1));
        i++;
        if (i >= fullText.length) clearInterval(descInterval);
      }, 15);

      // 3. Typing Effect for Steps (sequential)
      setDisplayedSteps([]);
      let currentStepIdx = 0;
      const steps = selectedExercise.steps || [];
      
      const showNextStep = () => {
        if (currentStepIdx < steps.length) {
          setDisplayedSteps(prev => [...prev, steps[currentStepIdx]]);
          currentStepIdx++;
          setTimeout(showNextStep, 400); // Delay between steps
        }
      };
      
      setTimeout(showNextStep, 500); // Start steps after a small delay

      return () => {
        clearInterval(descInterval);
      };
    } else {
      setDisplayedDescription('');
      setDisplayedSteps([]);
    }
  }, [selectedExercise?.id]);

  const generateAIExercises = async (query: string) => {
    if (!query.trim()) return;
    
    setIsGenerating(true);
    try {
      const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY! });
      const response = await ai.models.generateContent({
        model: "gemini-3-flash-preview",
        contents: `Gere uma lista de 3 a 5 exercícios de fisioterapia para a seguinte patologia ou condição: "${query}". 
        Retorne os exercícios em formato JSON seguindo este esquema:
        Array<{
          name: string,
          category: string,
          pathology: string,
          description: string,
          duration: string,
          reps: string,
          steps: string[]
        }>. 
        Certifique-se de que os exercícios sejam seguros e baseados em evidências.`,
        config: {
          responseMimeType: "application/json",
          responseSchema: {
            type: Type.ARRAY,
            items: {
              type: Type.OBJECT,
              properties: {
                name: { type: Type.STRING },
                category: { type: Type.STRING },
                pathology: { type: Type.STRING },
                description: { type: Type.STRING },
                duration: { type: Type.STRING },
                reps: { type: Type.STRING },
                steps: { 
                  type: Type.ARRAY,
                  items: { type: Type.STRING }
                }
              },
              required: ["name", "category", "pathology", "description", "duration", "reps", "steps"]
            }
          }
        }
      });

      const generated = JSON.parse(response.text || "[]") as Exercise[];
      const withIds = generated.map((ex, idx) => ({
        ...ex,
        id: `ai-${Date.now()}-${idx}`
      }));
      
      setAiExercises(withIds);
      if (withIds.length > 0) {
        setSelectedExercise(withIds[0]);
      }
    } catch (error) {
      console.error("Erro ao gerar exercícios com IA:", error);
      alert("Não foi possível gerar exercícios com IA no momento.");
    } finally {
      setIsGenerating(false);
    }
  };

  const localFiltered = MOCK_EXERCISES.filter(ex => 
    ex.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    ex.category.toLowerCase().includes(searchTerm.toLowerCase()) ||
    ex.pathology?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const filteredExercises = [...localFiltered, ...aiExercises];

  const handleSearch = () => {
    if (searchTerm.trim() === '') {
      setSelectedExercise(null);
      setAiExercises([]);
      return;
    }
    
    if (localFiltered.length > 0) {
      setSelectedExercise(localFiltered[0]);
      setAiExercises([]); // Clear previous AI results if local ones are found
    } else {
      // If no local results, try AI generation
      generateAIExercises(searchTerm);
    }
  };

  const handleNarrate = (ex: Exercise) => {
    let text = `Exercício: ${ex.name}. Categoria: ${ex.category}. Instruções: ${ex.description}. Duração: ${ex.duration}. Repetições: ${ex.reps}.`;
    if (ex.steps) {
      text += ` Passo a passo: ${ex.steps.join('. ')}`;
    }
    narrateText(text);
  };

  return (
    <div className="space-y-6 animate-fadeIn pb-24">
      <header className="flex justify-between items-end">
        <div>
          <h2 className="text-2xl font-black text-slate-900 tracking-tight uppercase">Fisioterapia Integrativa</h2>
          <p className="text-slate-500 font-medium text-sm">Gestão de exercícios e reabilitação física</p>
        </div>
        <button className="bg-emerald-600 text-white p-3 rounded-2xl shadow-lg hover:bg-emerald-700 transition-all flex items-center gap-2 font-bold text-xs uppercase tracking-widest">
          <Plus size={18} /> Novo Exercício
        </button>
      </header>

      <div className="flex gap-2">
        <div className="relative flex-1">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" size={20} />
          <input 
            type="text" 
            placeholder="Pesquisar exercícios, categorias ou patologias..." 
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && handleSearch()}
            className="w-full p-4 pl-12 bg-white rounded-3xl border border-slate-100 shadow-sm font-bold outline-none focus:ring-2 focus:ring-emerald-500/20 transition-all"
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
          <h3 className="text-xs font-black text-slate-400 uppercase tracking-widest px-2">Biblioteca de Exercícios</h3>
          <div className="space-y-3">
            {isGenerating && (
              <div className="p-8 bg-white rounded-[2rem] border border-dashed border-emerald-200 flex flex-col items-center justify-center text-emerald-600 space-y-3 animate-pulse">
                <Sparkles size={32} />
                <p className="text-[10px] font-black uppercase tracking-widest">A IA está gerando exercícios personalizados...</p>
              </div>
            )}
            {filteredExercises.map(ex => (
              <div 
                key={ex.id}
                onClick={() => setSelectedExercise(ex)}
                className={`p-4 rounded-[2rem] border transition-all cursor-pointer flex items-center justify-between group ${selectedExercise?.id === ex.id ? 'bg-emerald-50 border-emerald-200' : 'bg-white border-slate-100 hover:border-emerald-100'} ${ex.id.startsWith('ai-') ? 'border-l-4 border-l-emerald-500' : ''}`}
              >
                <div className="flex items-center gap-4">
                  <div className={`w-12 h-12 rounded-2xl flex items-center justify-center transition-all ${selectedExercise?.id === ex.id ? 'bg-emerald-600 text-white' : 'bg-slate-100 text-slate-500 group-hover:bg-emerald-100 group-hover:text-emerald-600'}`}>
                    {ex.id.startsWith('ai-') ? <Sparkles size={20} /> : <Activity size={20} />}
                  </div>
                  <div>
                    <div className="flex items-center gap-2">
                      <p className="font-black text-slate-900 leading-tight">{ex.name}</p>
                      {ex.id.startsWith('ai-') && (
                        <span className="bg-emerald-100 text-emerald-700 text-[8px] px-1.5 py-0.5 rounded-full font-black uppercase tracking-widest">IA</span>
                      )}
                    </div>
                    <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">{ex.category}</p>
                  </div>
                </div>
                <ChevronRight size={18} className={selectedExercise?.id === ex.id ? 'text-emerald-600' : 'text-slate-300'} />
              </div>
            ))}
          </div>
        </div>

        <div className="space-y-4">
          <h3 className="text-xs font-black text-slate-400 uppercase tracking-widest px-2">Detalhes do Exercício</h3>
          {selectedExercise ? (
            <div className="bg-white p-8 rounded-[2.5rem] border border-slate-100 shadow-sm space-y-6 sticky top-6">
              <div className="flex justify-between items-start">
                <div>
                  <h4 className="text-xl font-black text-slate-900 leading-tight">{selectedExercise.name}</h4>
                  <span className="inline-block px-3 py-1 bg-emerald-100 text-emerald-700 rounded-full text-[10px] font-black uppercase tracking-widest mt-2">{selectedExercise.category}</span>
                </div>
                <button 
                  onClick={() => handleNarrate(selectedExercise)}
                  className="w-12 h-12 bg-emerald-600 text-white rounded-2xl flex items-center justify-center shadow-lg hover:bg-emerald-700 transition-all hover:scale-110"
                >
                  <Play size={20} fill="currentColor" />
                </button>
              </div>

              <div className="space-y-4">
                <div className="p-4 bg-slate-50 rounded-2xl border border-slate-100 space-y-1">
                  <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest flex items-center gap-1">
                    <Info size={12} /> Descrição
                  </p>
                  <p className="text-sm text-slate-700 font-medium leading-relaxed">
                    {displayedDescription}
                    {displayedDescription.length < (selectedExercise?.description?.length || 0) && (
                      <span className="inline-block w-1 h-4 bg-emerald-500 ml-1 animate-pulse" />
                    )}
                  </p>
                </div>

                {displayedSteps.length > 0 && (
                  <div className="p-4 bg-emerald-50 rounded-2xl border border-emerald-100 space-y-3">
                    <p className="text-[10px] font-black text-emerald-800 uppercase tracking-widest flex items-center gap-1">
                      <Activity size={12} /> Guia Passo a Passo (Sem Mestre)
                    </p>
                    <div className="space-y-2">
                      {displayedSteps.map((step, idx) => (
                        <div key={idx} className="flex gap-3 items-start animate-slideInRight">
                          <span className="w-5 h-5 bg-emerald-600 text-white rounded-full flex items-center justify-center text-[10px] font-black shrink-0 mt-0.5">{idx + 1}</span>
                          <p className="text-xs text-slate-700 font-bold">{step}</p>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                <div className="grid grid-cols-2 gap-4">
                  <div className="p-4 bg-slate-50 rounded-2xl border border-slate-100 space-y-1">
                    <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Duração</p>
                    <p className="text-lg font-black text-slate-900">{selectedExercise.duration}</p>
                  </div>
                  <div className="p-4 bg-slate-50 rounded-2xl border border-slate-100 space-y-1">
                    <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Repetições</p>
                    <p className="text-lg font-black text-slate-900">{selectedExercise.reps}</p>
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <button className="py-4 bg-slate-900 text-white rounded-2xl font-black text-[10px] uppercase tracking-widest hover:bg-slate-800 transition-all shadow-xl flex items-center justify-center gap-2">
                  Adicionar ao Protocolo
                </button>
                <button className="py-4 bg-emerald-600 text-white rounded-2xl font-black text-[10px] uppercase tracking-widest hover:bg-emerald-700 transition-all shadow-xl flex items-center justify-center gap-2">
                  <Save size={16} /> Salvar
                </button>
              </div>
            </div>
          ) : (
            <div className="h-64 bg-slate-50 border-2 border-dashed border-slate-200 rounded-[2.5rem] flex flex-col items-center justify-center text-slate-400 space-y-3">
              <Activity size={48} className="opacity-20" />
              <p className="text-xs font-bold uppercase tracking-widest">Selecione um exercício para ver detalhes</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
