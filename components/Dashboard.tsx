
import React from 'react';
import { PatientData, AnalysisReport, ClinicSettings, UserRole } from '../types';
import { translations } from '../translations';

interface DashboardProps {
  setView: (view: any) => void;
  patientData: PatientData | null;
  examData?: AnalysisReport | null;
  clinicSettings: ClinicSettings;
  allPatients: PatientData[];
  onSelectPatient: (id: string) => void;
  onDeletePatient?: (id: string) => void;
  onLogout: () => void;
  userRole: UserRole | null;
}

export const Dashboard: React.FC<DashboardProps> = ({ setView, patientData, examData, clinicSettings, allPatients, onSelectPatient, onDeletePatient, onLogout, userRole }) => {
  const t = translations[clinicSettings.language || 'pt'] || translations.pt;
  const isInternal = userRole === UserRole.DOCTOR || userRole === UserRole.THERAPIST || userRole === UserRole.STUDENT;

  const handleCreateRestorePoint = () => {
    const allData = {
      patients: JSON.parse(localStorage.getItem('consulfision_patients') || '[]'),
      settings: clinicSettings,
      timestamp: new Date().toISOString(),
      type: 'RESTORE_POINT'
    };
    const blob = new Blob([JSON.stringify(allData, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `ponto_restauro_consulfision_${new Date().toISOString().split('T')[0]}.nso`;
    link.click();
  };

  return (
    <div className="space-y-10 animate-fadeIn pb-20">
      <header className="flex flex-col md:flex-row justify-between items-start md:items-end gap-6">
        <div>
          <h1 className="text-4xl font-black text-slate-900 tracking-tighter uppercase">{clinicSettings.clinicName}</h1>
          <p className="text-slate-500 mt-2 font-medium">{t.welcome}. System Active.</p>
        </div>
        <div className="flex gap-4 w-full md:w-auto">
          <button 
            onClick={handleCreateRestorePoint}
            className="flex-1 md:flex-none bg-amber-500 text-slate-900 px-6 py-4 rounded-3xl text-[10px] font-black flex items-center justify-center gap-3 shadow-xl hover:bg-amber-400 transition-all uppercase tracking-widest border-b-4 border-amber-600"
          >
            <span>🛡️</span> Criar Ponto de Restauro
          </button>
          {isInternal && (
            <button 
              onClick={() => setView('patient')}
              className="flex-1 md:flex-none bg-emerald-600 text-white px-8 py-4 rounded-3xl text-[10px] font-black flex items-center justify-center gap-3 shadow-xl hover:bg-emerald-700 transition-all uppercase tracking-widest"
            >
              <span>➕</span> {t.newPatient}
            </button>
          )}
        </div>
      </header>

      <div className="bg-slate-900 text-white p-6 rounded-[2rem] flex flex-col md:flex-row items-center justify-between gap-6 overflow-hidden relative shadow-2xl border-l-8 border-amber-500">
         <div className="flex items-center gap-6 relative z-10">
            <div className="w-14 h-14 bg-amber-500 text-slate-900 rounded-2xl flex items-center justify-center text-2xl shadow-[0_0_30px_rgba(245,158,11,0.3)]">💾</div>
            <div>
               <h4 className="font-black uppercase tracking-tight text-lg">Proteção de Dados Ativa</h4>
               <p className="text-amber-400 text-[10px] font-bold uppercase tracking-widest">Ponto de restauro disponível para segurança clínica</p>
            </div>
         </div>
         <div className="bg-white/10 px-6 py-3 rounded-2xl border border-white/10 text-center relative z-10">
            <p className="text-[9px] font-black uppercase text-slate-400 tracking-[0.2em] mb-1">Snapshot do Sistema</p>
            <p className="text-xs font-bold text-emerald-300 uppercase">Version 2026.1 GOLD</p>
         </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {isInternal && (
          <div className="bg-white p-6 rounded-3xl shadow-sm border border-slate-100 flex items-center gap-4">
             <div className="w-12 h-12 bg-emerald-100 text-emerald-600 rounded-2xl flex items-center justify-center text-xl">👥</div>
             <div><p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Total Pacientes</p><p className="text-2xl font-black text-slate-900">{allPatients.length}</p></div>
          </div>
        )}
        <div className="bg-white p-6 rounded-3xl shadow-sm border border-slate-100 flex items-center gap-4">
           <div className="w-12 h-12 bg-blue-100 text-blue-600 rounded-2xl flex items-center justify-center text-xl">📋</div>
           <div><p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">{t.activePatient}</p><p className="text-2xl font-black text-slate-900">{patientData ? '1' : '0'}</p></div>
        </div>
        <div className="bg-white p-6 rounded-3xl shadow-sm border border-slate-100 flex items-center gap-4">
           <div className="w-12 h-12 bg-amber-100 text-amber-600 rounded-2xl flex items-center justify-center text-xl">🧬</div>
           <div><p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Integridade IA</p><p className="text-sm font-black text-amber-600 uppercase">100% Protegido</p></div>
        </div>
      </div>

      {patientData && (
        <div className="bg-white rounded-[2.5rem] p-8 md:p-12 border border-emerald-100 shadow-xl space-y-8 animate-slideUp relative overflow-hidden">
           {examData && (
             <div className="absolute top-0 right-0 bg-blue-600 text-white px-6 py-2 rounded-bl-3xl font-black text-[9px] uppercase tracking-[0.2em] shadow-lg animate-pulse z-20">
               Resultado Pronto para Reaver
             </div>
           )}

           <div className="flex flex-col md:flex-row items-center justify-between gap-6 relative z-10">
              <div className="flex items-center gap-6">
                 <div className="w-20 h-20 bg-emerald-600 text-white rounded-3xl flex items-center justify-center text-4xl shadow-xl">👤</div>
                 <div>
                    <h2 className="text-3xl font-black text-slate-900 tracking-tighter uppercase">{patientData.name}</h2>
                    <p className="text-emerald-600 text-[10px] font-black uppercase tracking-widest">Atendimento Ativo • ID {patientData.id}</p>
                 </div>
              </div>
              <div className="flex flex-col sm:flex-row gap-4 w-full md:w-auto">
                 {examData && (
                   <button 
                     onClick={() => setView('protocols')} 
                     className="bg-blue-600 text-white px-8 py-4 rounded-2xl font-black text-[10px] uppercase tracking-widest shadow-xl hover:bg-blue-700 transition-all flex items-center justify-center gap-3 border-b-4 border-blue-800"
                   >
                     <span>🔄</span> Reaver Último Resultado
                   </button>
                 )}
                 <button onClick={() => setView('protocols')} className="bg-emerald-600 text-white px-8 py-4 rounded-2xl font-black text-[10px] uppercase tracking-widest shadow-lg hover:bg-emerald-700 transition-all flex items-center justify-center gap-3">
                    <span>📋</span> {examData ? 'Novo Diagnóstico' : 'Gerar Resultados'}
                 </button>
                 <button onClick={() => setView('history')} className="bg-slate-100 text-slate-700 px-8 py-4 rounded-2xl font-black text-[10px] uppercase tracking-widest shadow-sm hover:bg-slate-200 transition-all flex items-center justify-center gap-3">
                    <span>📂</span> Histórico Completo
                 </button>
              </div>
           </div>
        </div>
      )}

      {isInternal && allPatients.length > 0 && (
        <div className="bg-white rounded-[2.5rem] p-8 border border-slate-100 shadow-sm space-y-6">
          <h3 className="text-xl font-black text-slate-900 uppercase tracking-tight">Lista de Pacientes</h3>
          <div className="space-y-3 max-h-[400px] overflow-y-auto pr-2 custom-scrollbar">
            {allPatients.map(p => (
              <div key={p.id} onClick={() => onSelectPatient(p.id)} className={`flex items-center justify-between p-5 rounded-2xl border transition-all cursor-pointer group ${patientData?.id === p.id ? 'bg-emerald-50 border-emerald-200' : 'bg-slate-50 border-slate-100 hover:bg-white hover:shadow-lg'}`}>
                <div className="flex items-center gap-4 flex-1">
                   <div className="w-12 h-12 bg-white rounded-xl shadow-sm flex items-center justify-center text-xl">👤</div>
                   <div><p className="font-black text-slate-900 text-sm group-hover:text-emerald-700">{p.name}</p><p className="text-[10px] text-slate-400 font-mono">{p.id}</p></div>
                </div>
                {onDeletePatient && <button onClick={(e) => { e.stopPropagation(); onDeletePatient(p.id); }} className="w-10 h-10 bg-slate-100 text-slate-400 hover:bg-red-50 hover:text-red-600 rounded-xl flex items-center justify-center transition-all opacity-0 group-hover:opacity-100">🗑️</button>}
              </div>
            ))}
          </div>
        </div>
      )}

      <footer className="pt-10 border-t border-slate-200 text-center space-y-2">
        <p className="text-[10px] font-black text-slate-400 uppercase tracking-[0.5em]">Consulfision Intelligence System</p>
      </footer>
    </div>
  );
};
