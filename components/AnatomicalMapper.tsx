
import React, { useState, useRef } from 'react';
import { PatientData, AnatomicalMarker } from '../types';
import { translations } from '../translations';

interface AnatomicalMapperProps {
  patientData: PatientData | null;
  setPatientData: (data: PatientData) => void;
  language: string;
  examData?: any;
}

const views = [
  { id: 'frontal', icon: '👤', labelKey: 'frontal' },
  { id: 'posterior', icon: '👤', labelKey: 'posterior' },
  { id: 'head', icon: '🧠', labelKey: 'head' },
  { id: 'hands', icon: '✋', labelKey: 'hands' },
  { id: 'feet', icon: '👣', labelKey: 'feet' }
];

// Usando a imagem enviada pelo usuário (assumindo que será processada ou apontada corretamente)
// Para este exemplo, a imagem enviada contém Frente e Verso em um único quadro 50/50.
const NSO_ATLAS_URL = "https://i.postimg.cc/tJ7mXyHh/anatomia-nso-3d.png"; // Placeholder representativo da imagem enviada

const Silhouettes: Record<string, string> = {
  frontal: NSO_ATLAS_URL,
  posterior: NSO_ATLAS_URL,
  head: "https://images.unsplash.com/photo-1559757175-0eb30cd8c063?q=80&w=1000&auto=format&fit=crop",
  hands: "https://images.unsplash.com/photo-1515518554271-9659f1373511?q=80&w=1000&auto=format&fit=crop",
  feet: "https://images.unsplash.com/photo-1560713615-dce19197c31e?q=80&w=1000&auto=format&fit=crop"
};

export const AnatomicalMapper: React.FC<AnatomicalMapperProps> = ({ patientData, setPatientData, language, examData }) => {
  const [activeView, setActiveView] = useState('frontal');
  const [selectedMarker, setSelectedMarker] = useState<AnatomicalMarker | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const t = translations[language as keyof typeof translations] || translations.pt;

  // Sincronizar marcadores com o diagnóstico se existirem
  React.useEffect(() => {
    if (examData && examData.summary) {
      console.log("Diagnóstico sincronizado no Mapeador:", examData.summary);
    }
  }, [examData]);

  if (!patientData) {
    return (
      <div className="h-[60vh] flex flex-col items-center justify-center text-center p-10 bg-white rounded-[3rem] border border-slate-100 shadow-sm">
        <div className="text-6xl mb-6">👤</div>
        <h3 className="text-xl font-black text-slate-800 uppercase tracking-tight">Nenhum Paciente Ativo</h3>
        <p className="text-slate-500 max-w-xs mt-2">Selecione ou crie um paciente para iniciar o mapeamento anatômico.</p>
      </div>
    );
  }

  const markers = patientData.anatomicalMarkers || [];

  const handleImageClick = (e: React.MouseEvent<HTMLDivElement>) => {
    const rect = e.currentTarget.getBoundingClientRect();
    let x = ((e.clientX - rect.left) / rect.width) * 100;
    const y = ((e.clientY - rect.top) / rect.height) * 100;

    // Lógica para imagem 50/50: 
    // Se estivermos na vista frontal, o x original (0-100) mapeia para os primeiros 50% da imagem real
    // Se estivermos na vista posterior, o x original (0-100) mapeia para os últimos 50% da imagem real
    let internalX = x;
    if (activeView === 'frontal') {
        internalX = x / 2;
    } else if (activeView === 'posterior') {
        internalX = 50 + (x / 2);
    }

    const newMarker: AnatomicalMarker = {
      id: Math.random().toString(36).substr(2, 9),
      viewId: activeView,
      x: internalX,
      y,
      label: 'Novo Ponto',
      description: '',
      intensity: 'medium'
    };

    const updatedMarkers = [...markers, newMarker];
    setPatientData({ ...patientData, anatomicalMarkers: updatedMarkers });
    setSelectedMarker(newMarker);
  };

  const updateMarker = (id: string, updates: Partial<AnatomicalMarker>) => {
    const updatedMarkers = markers.map(m => m.id === id ? { ...m, ...updates } : m);
    setPatientData({ ...patientData, anatomicalMarkers: updatedMarkers });
    if (selectedMarker?.id === id) {
      setSelectedMarker({ ...selectedMarker, ...updates });
    }
  };

  const removeMarker = (id: string) => {
    const updatedMarkers = markers.filter(m => m.id !== id);
    setPatientData({ ...patientData, anatomicalMarkers: updatedMarkers });
    setSelectedMarker(null);
  };

  // Filtra marcadores que devem aparecer na vista atual
  const visibleMarkers = markers.filter(m => m.viewId === activeView);

  return (
    <div className="space-y-8 animate-fadeIn pb-20">
      <header className="flex flex-col md:flex-row justify-between items-start md:items-end gap-6">
        <div>
          <h2 className="text-3xl font-black text-slate-900 tracking-tighter uppercase">{t.mapping}</h2>
          <p className="text-slate-500 font-medium italic">Utilizando Atlas Clínico 3D de Alta Precisão NSOFISION.</p>
        </div>
        <div className="flex bg-slate-900 p-1 rounded-2xl border border-slate-700 shadow-2xl flex-wrap justify-center">
           {['frontal', 'posterior', 'head', 'hands', 'feet'].map(v => (
             <button 
                key={v}
                onClick={() => { setActiveView(v); setSelectedMarker(null); }}
                className={`px-4 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all ${activeView === v ? 'bg-emerald-500 text-slate-900 shadow-lg' : 'text-slate-400 hover:text-white'}`}
             >
                {t[views.find(view => view.id === v)?.labelKey || '']}
             </button>
           ))}
        </div>
      </header>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-10">
        <div className="lg:col-span-3 space-y-2 overflow-y-auto max-h-[600px] pr-2 custom-scrollbar">
          {views.map(view => (
            <button
              key={view.id}
              onClick={() => { setActiveView(view.id); setSelectedMarker(null); }}
              className={`w-full flex items-center justify-between p-5 rounded-3xl transition-all border ${
                activeView === view.id 
                  ? 'bg-emerald-600 text-white shadow-2xl border-emerald-500 scale-[1.02]' 
                  : 'bg-white text-slate-600 hover:bg-slate-50 border-slate-100 shadow-sm'
              }`}
            >
              <div className="flex items-center gap-4">
                 <span className="text-2xl">{view.icon}</span>
                 <span className="font-black text-xs uppercase tracking-tight">{t[view.labelKey]}</span>
              </div>
              {markers.filter(m => m.viewId === view.id).length > 0 && (
                <span className={`w-5 h-5 rounded-full flex items-center justify-center text-[10px] font-black ${activeView === view.id ? 'bg-white text-emerald-600' : 'bg-emerald-100 text-emerald-600'}`}>
                  {markers.filter(m => m.viewId === view.id).length}
                </span>
              )}
            </button>
          ))}
        </div>

        <div className="lg:col-span-5 bg-white p-4 rounded-[3.5rem] shadow-sm border border-slate-100 flex flex-col items-center">
           <div className="w-full mb-4 flex justify-between items-center px-6 pt-4">
              <div className="space-y-1">
                 <h4 className="font-black text-slate-900 uppercase text-xs tracking-widest">{t[views.find(v => v.id === activeView)?.labelKey || '']}</h4>
                 <div className="w-12 h-1 bg-emerald-500 rounded-full"></div>
              </div>
              <div className="flex gap-2">
                 <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">MAPA ATIVO: {activeView.toUpperCase()}</span>
              </div>
           </div>
           
           <div 
             ref={containerRef}
             className={`relative w-full aspect-[3/4] rounded-[2.5rem] border-4 border-slate-100 shadow-2xl mx-auto cursor-crosshair overflow-hidden group transition-all duration-500 ${activeView === 'head' || activeView === 'hands' || activeView === 'feet' ? 'aspect-square' : ''}`}
             onClick={handleImageClick}
           >
             <div className="w-full h-full relative">
                {/* Lógica de posicionamento para Frente e Verso na mesma imagem */}
                <img 
                  src={Silhouettes[activeView]} 
                  alt={`Anatomia ${activeView}`} 
                  className={`absolute w-[200%] h-full max-w-none transition-all duration-700 pointer-events-none ${
                    activeView === 'frontal' ? 'left-0' : 
                    activeView === 'posterior' ? 'left-[-100%]' : 
                    'w-full h-full left-0 object-cover'
                  }`}
                />
             </div>
             
             <div className="absolute inset-0 bg-gradient-to-t from-slate-900/10 to-transparent pointer-events-none"></div>
             
             {visibleMarkers.map(m => {
               // Ajusta a posição visual do marcador com base no recorte da imagem
               let displayX = m.x;
               if (activeView === 'frontal') {
                   displayX = m.x * 2;
               } else if (activeView === 'posterior') {
                   displayX = (m.x - 50) * 2;
               }

               return (
                 <div 
                   key={m.id}
                   onClick={(e) => { e.stopPropagation(); setSelectedMarker(m); }}
                   className={`absolute w-10 h-10 -ml-5 -mt-5 rounded-full border-4 border-white shadow-2xl transition-all hover:scale-125 cursor-pointer flex items-center justify-center animate-pulse z-20 ${
                     m.intensity === 'high' ? 'bg-red-500/90' : m.intensity === 'medium' ? 'bg-amber-500/90' : 'bg-blue-500/90'
                   } ${selectedMarker?.id === m.id ? 'ring-8 ring-white/50 scale-125' : ''}`}
                   style={{ left: `${displayX}%`, top: `${m.y}%` }}
                 >
                   <span className="text-[12px] font-black text-white">{m.intensity === 'high' ? '!' : '●'}</span>
                 </div>
               );
             })}

             <div className="absolute top-4 left-4 bg-slate-900 text-white px-3 py-1 rounded-full text-[8px] font-black uppercase tracking-widest border border-slate-700">
               COORD_IA: {activeView}
             </div>
           </div>

           <div className="mt-6 text-center bg-slate-50 p-6 rounded-3xl border border-slate-100 w-full">
              <p className="text-[10px] text-slate-400 font-bold uppercase tracking-widest leading-relaxed">Clique exatamente sobre a zona de dor ou desequilíbrio na imagem 3D.</p>
           </div>
        </div>

        <div className="lg:col-span-4 space-y-6">
           {selectedMarker ? (
             <div className="bg-white p-8 rounded-[3rem] shadow-[0_30px_60px_rgba(0,0,0,0.1)] border border-emerald-100 animate-slideUp space-y-6 relative overflow-hidden">
                <div className="absolute top-0 right-0 w-32 h-32 bg-emerald-500/5 rounded-full -mr-16 -mt-16 pointer-events-none"></div>
                
                <div className="flex justify-between items-center relative z-10">
                   <h4 className="font-black text-slate-900 uppercase text-[10px] tracking-widest">Detalhes do Ponto</h4>
                   <button onClick={() => removeMarker(selectedMarker.id)} className="w-8 h-8 bg-red-50 text-red-500 rounded-full flex items-center justify-center hover:bg-red-500 hover:text-white transition-all text-xs">✕</button>
                </div>

                <div className="space-y-5 relative z-10">
                   <div className="space-y-1.5">
                      <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest">Órgão / Tecido Afetado</label>
                      <input 
                        type="text" 
                        value={selectedMarker.label}
                        onChange={(e) => updateMarker(selectedMarker.id, { label: e.target.value })}
                        className="w-full p-4 bg-slate-50 rounded-2xl border border-slate-200 font-bold outline-none focus:ring-4 focus:ring-emerald-500/10 transition-all text-sm shadow-inner"
                        placeholder="Ex: Fígado, Lombar, Epicôndilo..."
                        autoFocus
                      />
                   </div>

                   <div className="space-y-1.5">
                      <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest">Sintomatologia / Queixa</label>
                      <textarea 
                        value={selectedMarker.description}
                        onChange={(e) => updateMarker(selectedMarker.id, { description: e.target.value })}
                        rows={3}
                        className="w-full p-4 bg-slate-50 rounded-2xl border border-slate-200 font-medium outline-none focus:ring-4 focus:ring-emerald-500/10 transition-all text-xs shadow-inner resize-none"
                        placeholder="Descreva a dor, inflamação ou bloqueio..."
                      />
                   </div>

                   <div className="space-y-2">
                      <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest">Nível de Desequilíbrio</label>
                      <div className="flex gap-2">
                         {(['low', 'medium', 'high'] as const).map(lvl => (
                           <button
                             key={lvl}
                             onClick={() => updateMarker(selectedMarker.id, { intensity: lvl })}
                             className={`flex-1 py-3 rounded-xl font-black text-[9px] uppercase tracking-widest transition-all shadow-sm ${
                               selectedMarker.intensity === lvl 
                                 ? (lvl === 'high' ? 'bg-red-600 text-white scale-105 shadow-red-200' : lvl === 'medium' ? 'bg-amber-500 text-white scale-105 shadow-amber-200' : 'bg-blue-600 text-white scale-105 shadow-blue-200')
                                 : 'bg-slate-50 text-slate-400 hover:bg-slate-100 border border-slate-200'
                             }`}
                           >
                             {lvl === 'high' ? 'Agudo' : lvl === 'medium' ? 'Crônico' : 'Latente'}
                           </button>
                         ))}
                      </div>
                   </div>
                </div>

                <div className="p-5 bg-emerald-50 rounded-[1.5rem] border border-emerald-100 flex gap-3 items-start relative z-10">
                   <span className="text-xl">🧬</span>
                   <p className="text-[10px] text-emerald-800 font-medium leading-relaxed italic">
                     A IA NSOFISION correlaciona este ponto com o histórico do paciente para sugerir os pares biomagnéticos.
                   </p>
                </div>
             </div>
           ) : (
             <div className="bg-slate-900 p-12 rounded-[3.5rem] text-center space-y-8 shadow-2xl overflow-hidden relative group">
                <div className="absolute inset-0 bg-gradient-to-br from-emerald-500/10 to-transparent opacity-50"></div>
                <div className="w-24 h-24 bg-white/5 rounded-full mx-auto flex items-center justify-center text-5xl animate-pulse duration-[3s]">👨‍⚕️</div>
                <div className="space-y-4 relative z-10">
                   <h4 className="text-xl font-black text-white uppercase tracking-tight">Mapeamento Geográfico</h4>
                   <p className="text-emerald-100/60 text-xs font-bold uppercase tracking-widest leading-relaxed">Selecione uma zona no Atlas 3D para registrar achados clínicos específicos.</p>
                </div>
             </div>
           )}

           <div className="bg-white p-10 rounded-[3rem] shadow-sm border border-slate-100 space-y-6">
              <div className="flex justify-between items-center">
                 <h4 className="font-black text-xs uppercase tracking-widest text-slate-400">Pontos Marcados ({markers.length})</h4>
                 <span className="w-2 h-2 bg-emerald-500 rounded-full animate-ping"></span>
              </div>
              <div className="space-y-3 max-h-[250px] overflow-y-auto pr-2 custom-scrollbar">
                 {markers.length === 0 ? (
                    <p className="text-center py-10 text-[10px] font-black text-slate-300 uppercase tracking-widest">Nenhum marcador ativo</p>
                 ) : (
                    markers.map(m => (
                      <div 
                        key={m.id} 
                        onClick={() => { setActiveView(m.viewId); setSelectedMarker(m); }} 
                        className={`flex items-center justify-between p-4 rounded-2xl border transition-all cursor-pointer group ${selectedMarker?.id === m.id ? 'bg-emerald-50 border-emerald-200' : 'bg-slate-50 border-slate-100 hover:bg-white hover:shadow-lg hover:border-emerald-200'}`}
                      >
                         <div className="flex items-center gap-4">
                            <span className={`w-3 h-3 rounded-full shadow-sm ${m.intensity === 'high' ? 'bg-red-500' : m.intensity === 'medium' ? 'bg-amber-500' : 'bg-blue-500'}`}></span>
                            <div className="flex flex-col">
                               <span className="text-xs font-black uppercase tracking-tight text-slate-700">{m.label}</span>
                               <span className="text-[8px] font-black text-slate-400 uppercase tracking-widest">{t[views.find(v => v.id === m.viewId)?.labelKey || '']}</span>
                            </div>
                         </div>
                         <div className="opacity-0 group-hover:opacity-100 transition-opacity">
                            <span className="text-[10px] text-emerald-600 font-black">AJUSTAR</span>
                         </div>
                      </div>
                    ))
                 )}
              </div>
           </div>
        </div>
      </div>
    </div>
  );
};
