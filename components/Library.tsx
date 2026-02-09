
import React, { useState } from 'react';
import { OFFICIAL_NSO_LIBRARY } from '../services/libraryNSO';
import { translations } from '../translations';
import { Protocol, TherapyType } from '../types';

interface LibraryProps {
  language: string;
  isCreator?: boolean;
  customProtocols?: Protocol[];
  onAddCustom?: (p: Protocol) => void;
  onDeleteCustom?: (id: string) => void;
}

export const Library: React.FC<LibraryProps> = ({ 
  language, 
  isCreator, 
  customProtocols = [], 
  onAddCustom,
  onDeleteCustom
}) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [showCreatorPortal, setShowCreatorPortal] = useState(false);
  const t = translations[language] || translations.pt;
  
  const allProtocols = [...OFFICIAL_NSO_LIBRARY.protocols, ...customProtocols];

  const filteredProtocols = allProtocols.filter(p => 
    p.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
    (typeof p.therapy === 'string' && p.therapy.toLowerCase().includes(searchTerm.toLowerCase()))
  );

  const [newProtocol, setNewProtocol] = useState<Partial<Protocol>>({
    id: `NSO-${Math.floor(1000 + Math.random() * 9000)}`,
    therapy: '',
    title: '',
    instructions: '',
    steps: [],
    sessions: 3,
    revaluationDays: 7,
    isCustom: true
  });

  const [stepInput, setStepInput] = useState({ action: '', detail: '' });

  const handleAddStep = () => {
    if (!stepInput.action) return;
    setNewProtocol(prev => ({
      ...prev,
      steps: [...(prev.steps || []), { order: (prev.steps?.length || 0) + 1, ...stepInput }]
    }));
    setStepInput({ action: '', detail: '' });
  };

  const handleSaveProtocol = () => {
    if (!newProtocol.title || !newProtocol.therapy || !onAddCustom) {
      alert("Título e Terapia são obrigatórios.");
      return;
    }
    onAddCustom(newProtocol as Protocol);
    setShowCreatorPortal(false);
    alert("Nova terapia publicada pelo Criador!");
  };

  return (
    <div className="space-y-10 animate-fadeIn pb-32">
      <header className="flex flex-col md:flex-row justify-between items-start md:items-end gap-6">
        <div>
          <h2 className="text-4xl font-black text-emerald-900 tracking-tighter uppercase leading-none">Biblioteca NSO</h2>
          <p className="text-slate-500 font-medium italic mt-2">Protocolos Oficiais Quissambi Benvindo.</p>
        </div>
        <div className="flex gap-4">
          {isCreator && (
            <button onClick={() => setShowCreatorPortal(!showCreatorPortal)} className="bg-amber-500 text-slate-900 px-8 py-4 rounded-2xl font-black text-[10px] uppercase shadow-xl flex items-center gap-3">
              <span>👑</span> Portal do Criador
            </button>
          )}
          <input 
            type="text" 
            placeholder="Buscar saber..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="p-4 bg-white rounded-2xl border border-slate-200 shadow-sm focus:ring-4 focus:ring-emerald-500/10 outline-none"
          />
        </div>
      </header>

      {showCreatorPortal && isCreator && (
        <div className="bg-slate-950 text-white p-12 rounded-[4rem] border-b-[12px] border-amber-500 shadow-3xl animate-slideDown space-y-8">
           <h3 className="text-2xl font-black uppercase text-amber-400">Expandir Base de Conhecimento</h3>
           <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
              <div className="space-y-4">
                 <input type="text" placeholder="Nome da Terapia" value={newProtocol.therapy as string} onChange={e => setNewProtocol(p => ({...p, therapy: e.target.value}))} className="w-full p-5 bg-white/5 rounded-2xl border border-white/10 outline-none focus:border-amber-500" />
                 <input type="text" placeholder="Título do Protocolo" value={newProtocol.title} onChange={e => setNewProtocol(p => ({...p, title: e.target.value}))} className="w-full p-5 bg-white/5 rounded-2xl border border-white/10 outline-none focus:border-amber-500" />
                 <textarea placeholder="Instruções Gerais" value={newProtocol.instructions} onChange={e => setNewProtocol(p => ({...p, instructions: e.target.value}))} className="w-full p-5 bg-white/5 rounded-2xl border border-white/10 h-32" />
              </div>
              <div className="space-y-4">
                 <div className="flex gap-2">
                    <input type="text" placeholder="Ação" value={stepInput.action} onChange={e => setStepInput(p => ({...p, action: e.target.value}))} className="flex-1 p-5 bg-white/5 rounded-2xl border border-white/10" />
                    <button onClick={handleAddStep} className="bg-amber-500 text-slate-900 px-8 rounded-2xl font-black text-xs uppercase">Add Passo</button>
                 </div>
                 <div className="space-y-2 max-h-48 overflow-y-auto pr-2 custom-scrollbar">
                    {newProtocol.steps?.map((s, idx) => (
                       <div key={idx} className="p-3 bg-white/5 border border-white/5 rounded-xl text-xs flex justify-between">
                          <span>{s.order}. {s.action}</span>
                          <button onClick={() => setNewProtocol(p => ({...p, steps: p.steps?.filter((_, i) => i !== idx)}))} className="text-red-500">✕</button>
                       </div>
                    ))}
                 </div>
              </div>
           </div>
           <button onClick={handleSaveProtocol} className="w-full bg-amber-500 text-slate-900 py-6 rounded-[2rem] font-black uppercase shadow-2xl">Publicar Protocolo Oficial</button>
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-8 gap-8">
        <div className="lg:col-span-8 grid grid-cols-1 md:grid-cols-2 gap-6">
           {filteredProtocols.map((p, i) => (
             <div key={p.id || i} className={`bg-white p-10 rounded-[3rem] border shadow-sm hover:shadow-2xl transition-all ${p.isCustom ? 'border-amber-200' : 'border-slate-100'}`}>
                <div className="flex items-center gap-4 mb-4">
                   <div className={`w-12 h-12 rounded-2xl flex items-center justify-center text-2xl ${p.isCustom ? 'bg-amber-500 text-slate-900' : 'bg-emerald-50 text-emerald-600'}`}>{p.isCustom ? '👑' : '📜'}</div>
                   <div>
                      <span className="text-[10px] font-black uppercase tracking-widest text-emerald-600">{p.therapy as string}</span>
                      <h4 className="text-xl font-black text-slate-900 tracking-tight leading-none">{p.title}</h4>
                   </div>
                </div>
                <p className="text-slate-500 text-sm leading-relaxed italic mb-6">"{p.instructions}"</p>
                <div className="space-y-2">
                   {p.steps.slice(0, 2).map((s: any, idx: number) => (
                     <div key={idx} className="flex gap-3 items-center bg-slate-50 p-3 rounded-2xl border border-slate-100">
                        <span className="text-emerald-600 font-black text-xs">{idx + 1}</span>
                        <p className="text-[10px] font-bold text-slate-700">{s.action}</p>
                     </div>
                   ))}
                </div>
             </div>
           ))}
        </div>
      </div>
    </div>
  );
};
