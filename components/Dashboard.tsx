
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
  recommendedCount?: number;
}

export const Dashboard: React.FC<DashboardProps> = ({ 
  setView, 
  patientData, 
  examData, 
  clinicSettings, 
  allPatients, 
  onSelectPatient, 
  onDeletePatient, 
  onLogout, 
  userRole,
  recommendedCount = 0
}) => {
  const t = translations[clinicSettings.language || 'pt'] || translations.pt;
  const isInternal = userRole === UserRole.DOCTOR || userRole === UserRole.THERAPIST || userRole === UserRole.STUDENT;

  return (
    <div className="space-y-6 animate-fadeIn pb-10">
      <header className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-black text-slate-900 tracking-tighter uppercase">{clinicSettings.clinicName}</h1>
          <p className="text-slate-500 text-xs font-medium">{t.welcome}</p>
        </div>
        <button 
          onClick={() => setView('settings')}
          className="w-10 h-10 bg-white border border-slate-200 rounded-full flex items-center justify-center shadow-sm"
        >
          ⚙️
        </button>
      </header>

      {/* Quick Actions Bento Grid */}
      <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
        <button 
          onClick={() => setView('patient')}
          className="bg-emerald-600 text-white p-6 rounded-[2rem] flex flex-col items-start justify-between gap-4 shadow-lg shadow-emerald-200 h-40"
        >
          <div className="w-10 h-10 bg-white/20 rounded-xl flex items-center justify-center text-xl">➕</div>
          <div className="text-left">
            <p className="text-[10px] font-black uppercase tracking-widest opacity-80">Ação Rápida</p>
            <p className="text-lg font-black leading-tight uppercase">{t.newPatient}</p>
          </div>
        </button>

        <button 
          onClick={() => setView('iridology')}
          className="bg-blue-600 text-white p-6 rounded-[2rem] flex flex-col items-start justify-between gap-4 shadow-lg shadow-blue-200 h-40"
        >
          <div className="w-10 h-10 bg-white/20 rounded-xl flex items-center justify-center text-xl">👁️</div>
          <div className="text-left">
            <p className="text-[10px] font-black uppercase tracking-widest opacity-80">NSO Vision</p>
            <p className="text-lg font-black leading-tight uppercase">Iridologia</p>
          </div>
        </button>

        <button 
          onClick={() => setView('exams')}
          className="bg-slate-800 text-white p-6 rounded-[2rem] flex flex-col items-start justify-between gap-4 shadow-lg shadow-slate-200 h-40"
        >
          <div className="w-10 h-10 bg-white/20 rounded-xl flex items-center justify-center text-xl">📸</div>
          <div className="text-left">
            <p className="text-[10px] font-black uppercase tracking-widest opacity-80">IA Vision</p>
            <p className="text-lg font-black leading-tight uppercase">Analisar Exames</p>
          </div>
        </button>
      </div>

      {/* Active Patient Card */}
      {patientData ? (
        <div className="bg-slate-900 text-white p-6 rounded-[2.5rem] relative overflow-hidden shadow-2xl border-l-8 border-emerald-500">
          <div className="relative z-10 space-y-4">
            <div className="flex items-center gap-4">
              <div className="w-14 h-14 bg-emerald-500 text-slate-900 rounded-2xl flex items-center justify-center text-2xl">👤</div>
              <div>
                <h2 className="text-xl font-black uppercase tracking-tight">{patientData.name}</h2>
                <p className="text-emerald-400 text-[10px] font-bold uppercase tracking-widest">Atendimento Ativo</p>
              </div>
            </div>
            <div className="flex gap-2 flex-wrap">
              <button 
                onClick={() => setView('protocols')}
                className="flex-1 bg-white text-slate-900 py-3 px-4 rounded-xl font-black text-[10px] uppercase tracking-widest whitespace-nowrap"
              >
                Analisar
              </button>
              {isInternal && (
                <button 
                  onClick={() => setView('exam_request')}
                  className="flex-1 bg-emerald-500 text-white py-3 px-4 rounded-xl font-black text-[10px] uppercase tracking-widest whitespace-nowrap"
                >
                  Pedir Exames
                </button>
              )}
              <button 
                onClick={() => setView('mapping')}
                className="flex-1 bg-white/10 border border-white/20 text-white py-3 px-4 rounded-xl font-black text-[10px] uppercase tracking-widest whitespace-nowrap"
              >
                Mapear
              </button>
            </div>
          </div>
          <div className="absolute -right-4 -bottom-4 opacity-10 text-8xl">🧬</div>
        </div>
      ) : (
        <div className="bg-slate-100 border-2 border-dashed border-slate-200 p-8 rounded-[2.5rem] text-center space-y-2">
          <p className="text-slate-400 text-xs font-bold uppercase tracking-widest">Nenhum paciente selecionado</p>
          <button onClick={() => setView('patient')} className="text-emerald-600 font-black text-sm uppercase">Iniciar agora</button>
        </div>
      )}

      {/* Stats Row */}
      <div className="grid grid-cols-3 gap-3">
        <button 
          onClick={() => setView('generator')}
          className="bg-white p-4 rounded-2xl border border-slate-100 text-center flex flex-col items-center justify-center gap-1 active:scale-95 transition-all"
        >
          <p className="text-[8px] font-black text-emerald-600 uppercase tracking-widest">Atlas IA</p>
          <p className="text-xs font-black text-slate-900">Gerar Imagem</p>
        </button>
        <button 
          onClick={() => setView('frequency')}
          className="bg-white p-4 rounded-2xl border border-slate-100 text-center flex flex-col items-center justify-center gap-1 active:scale-95 transition-all relative"
        >
          {recommendedCount > 0 && (
            <span className="absolute -top-1 -right-1 bg-emerald-500 text-white text-[8px] font-black w-4 h-4 rounded-full flex items-center justify-center animate-bounce shadow-lg">
              {recommendedCount}
            </span>
          )}
          <p className="text-[8px] font-black text-amber-600 uppercase tracking-widest">Bio-Res</p>
          <p className="text-xs font-black text-slate-900">Frequências</p>
        </button>
        <div className="bg-white p-4 rounded-2xl border border-slate-100 text-center">
          <p className="text-[8px] font-black text-slate-400 uppercase tracking-widest mb-1">Status IA</p>
          <p className="text-xs font-black text-emerald-600 uppercase mt-2">OK</p>
        </div>
      </div>

      {/* Recent Patients List */}
      {allPatients.length > 0 && (
        <div className="space-y-4">
          <div className="flex justify-between items-center px-2">
            <h3 className="text-sm font-black text-slate-900 uppercase tracking-widest">Recentes</h3>
            <button onClick={() => setView('history')} className="text-[10px] font-bold text-emerald-600 uppercase">Ver todos</button>
          </div>
          <div className="space-y-2">
            {allPatients.slice(0, 3).map(p => (
              <div 
                key={p.id} 
                onClick={() => onSelectPatient(p.id)}
                className="bg-white p-4 rounded-2xl border border-slate-100 flex items-center justify-between group active:scale-95 transition-all"
              >
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 bg-slate-50 rounded-xl flex items-center justify-center text-lg">👤</div>
                  <div>
                    <p className="font-black text-slate-900 text-sm">{p.name}</p>
                    <p className="text-[9px] text-slate-400 font-mono">{p.id.slice(0, 8)}</p>
                  </div>
                </div>
                <div className="text-slate-300">→</div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};
