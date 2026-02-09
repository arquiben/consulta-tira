
import React from 'react';
import { PatientData } from '../types';
import { translations } from '../translations';

interface RecycleBinProps {
  deletedPatients: PatientData[];
  onRestore: (id: string) => void;
  onPermanentDelete: (id: string) => void;
  onEmptyBin: () => void;
  language: string;
}

export const RecycleBin: React.FC<RecycleBinProps> = ({ 
  deletedPatients, 
  onRestore, 
  onPermanentDelete, 
  onEmptyBin,
  language 
}) => {
  const t = translations[language] || translations.pt;

  return (
    <div className="space-y-8 animate-fadeIn pb-32">
      <header className="flex flex-col md:flex-row justify-between items-start md:items-end gap-6">
        <div>
          <h2 className="text-3xl font-black text-slate-900 tracking-tighter uppercase">{t.recycleBin}</h2>
          <p className="text-slate-500 font-medium">Gerencie registros descartados e recupere informações se necessário.</p>
        </div>
        {deletedPatients.length > 0 && (
          <button 
            onClick={onEmptyBin}
            className="bg-red-50 text-red-600 px-8 py-3 rounded-2xl font-black text-[10px] uppercase tracking-widest hover:bg-red-600 hover:text-white transition-all shadow-sm flex items-center gap-2"
          >
            <span>🗑️</span> {t.emptyBin}
          </button>
        )}
      </header>

      <div className="bg-white rounded-[3rem] border border-slate-100 shadow-sm overflow-hidden min-h-[400px]">
        {deletedPatients.length === 0 ? (
          <div className="h-[400px] flex flex-col items-center justify-center text-center p-10">
            <div className="text-6xl mb-6 opacity-20">♻️</div>
            <p className="text-slate-400 font-black uppercase text-xs tracking-widest">{t.binEmpty}</p>
          </div>
        ) : (
          <div className="p-8 space-y-4">
            <h3 className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-6 border-b pb-2">{t.deletedPatients} ({deletedPatients.length})</h3>
            <div className="grid grid-cols-1 gap-4">
              {deletedPatients.map(p => (
                <div key={p.id} className="flex flex-col md:flex-row items-center justify-between p-6 bg-slate-50 rounded-3xl border border-slate-100 group hover:bg-white hover:shadow-xl hover:border-emerald-200 transition-all">
                  <div className="flex items-center gap-6">
                    <div className="w-14 h-14 bg-white rounded-2xl shadow-sm flex items-center justify-center text-2xl">👤</div>
                    <div>
                      <p className="font-black text-slate-900 uppercase">{p.name}</p>
                      <p className="text-[10px] text-slate-400 font-mono">{p.id}</p>
                    </div>
                  </div>
                  <div className="flex gap-4 mt-6 md:mt-0 w-full md:w-auto">
                    <button 
                      onClick={() => onRestore(p.id)}
                      className="flex-1 md:flex-none bg-emerald-600 text-white px-6 py-3 rounded-2xl font-black text-[10px] uppercase tracking-widest hover:bg-emerald-700 transition-all shadow-lg"
                    >
                      {t.restore}
                    </button>
                    <button 
                      onClick={() => onPermanentDelete(p.id)}
                      className="flex-1 md:flex-none bg-white text-red-600 border border-red-100 px-6 py-3 rounded-2xl font-black text-[10px] uppercase tracking-widest hover:bg-red-50 transition-all"
                    >
                      {t.permanentlyDelete}
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>

      <div className="bg-slate-900 p-10 rounded-[2.5rem] text-white space-y-4">
         <h4 className="text-xs font-black text-emerald-400 uppercase tracking-widest">Aviso de Privacidade NSO</h4>
         <p className="text-[10px] text-slate-400 leading-relaxed font-medium">
           Os dados na reciclagem ainda ocupam espaço no seu cache local. Recomendamos esvaziar a reciclagem periodicamente para manter a performance do sistema e a conformidade com a proteção de dados dos pacientes.
         </p>
      </div>
    </div>
  );
};
