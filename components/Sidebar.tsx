
import React from 'react';
import { ClinicSettings, UserRole } from '../types';
import { translations } from '../translations';

interface SidebarProps {
  currentView: string;
  setView: (view: any) => void;
  patientActive: boolean;
  clinicSettings: ClinicSettings;
  userRole: UserRole | null;
  onLogout: () => void;
  binCount?: number;
}

export const Sidebar: React.FC<SidebarProps> = ({ 
  currentView, 
  setView, 
  clinicSettings, 
  userRole, 
  onLogout, 
  binCount = 0 
}) => {
  const t = translations[clinicSettings.language || 'pt'] || translations.pt;

  const menuItems = [
    { id: 'dashboard', label: t.dashboard, icon: '🏠', roles: [UserRole.DOCTOR, UserRole.THERAPIST, UserRole.STUDENT, UserRole.PATIENT] },
    { id: 'patient', label: t.patientIntake, icon: '👤', roles: [UserRole.DOCTOR, UserRole.THERAPIST, UserRole.STUDENT] },
    { id: 'consultation', label: t.consultation, icon: '🎙️', roles: [UserRole.DOCTOR, UserRole.THERAPIST, UserRole.STUDENT] },
    { id: 'exams', label: t.exams, icon: '📄', roles: [UserRole.DOCTOR, UserRole.THERAPIST, UserRole.STUDENT] },
    { id: 'iridology', label: 'Iridologia', icon: '👁️', roles: [UserRole.DOCTOR, UserRole.THERAPIST, UserRole.STUDENT] },
    { id: 'mapping', label: t.mapping, icon: '📍', roles: [UserRole.DOCTOR, UserRole.THERAPIST, UserRole.STUDENT] },
    { id: 'exam_request', label: 'Pedidos de Exames', icon: '📝', roles: [UserRole.DOCTOR, UserRole.THERAPIST, UserRole.STUDENT] },
    { id: 'generator', label: 'Atlas IA', icon: '✨', roles: [UserRole.DOCTOR, UserRole.THERAPIST, UserRole.STUDENT] },
    { id: 'frequency', label: t.frequency, icon: '🎵', roles: [UserRole.DOCTOR, UserRole.THERAPIST, UserRole.STUDENT] },
    { id: 'protocols', label: t.protocols, icon: '📋', roles: [UserRole.DOCTOR, UserRole.THERAPIST, UserRole.STUDENT, UserRole.PATIENT] },
    { id: 'library', label: t.libraryNSO, icon: '🏛️', roles: [UserRole.DOCTOR, UserRole.THERAPIST, UserRole.STUDENT, UserRole.PATIENT] },
    { id: 'history', label: t.clinicalHistory, icon: '📂', roles: [UserRole.DOCTOR, UserRole.THERAPIST, UserRole.STUDENT, UserRole.PATIENT] },
    { id: 'recycle', label: t.recycleBin, icon: '🗑️', roles: [UserRole.DOCTOR, UserRole.THERAPIST], badge: binCount },
    { id: 'settings', label: t.settings, icon: '⚙️', roles: [UserRole.DOCTOR, UserRole.THERAPIST] },
    { id: 'help', label: t.help, icon: '❓', roles: [UserRole.DOCTOR, UserRole.THERAPIST, UserRole.STUDENT, UserRole.PATIENT] },
  ];

  const filteredItems = menuItems.filter(item => userRole && item.roles.includes(userRole));

  return (
    <aside className="w-20 md:w-72 bg-emerald-950 text-white h-full flex flex-col border-r border-emerald-900/50">
      <div className="p-6 flex items-center gap-4">
        <div className="w-12 h-12 bg-emerald-400 rounded-2xl flex items-center justify-center text-emerald-950 shadow-lg">
          <svg viewBox="0 0 24 24" className="w-8 h-8 fill-current"><path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-1 17.93c-3.95-.49-7-3.85-7-7.93 0-.62.08-1.21.21-1.79L9 15v1c0 1.1.9 2 2 2v1.93zm6.9-2.54c-.26-.81-1-1.39-1.9-1.39h-1v-3c0-.55-.45-1-1-1H8v-2h2c.55 0 1-.45 1-1V7h2c1.1 0 2-.9 2-2v-.41c2.93 1.19 5 4.06 5 7.41 0 2.08-.8 3.97-2.1 5.39z"/></svg>
        </div>
        <div className="hidden md:block">
          <span className="text-xl font-black tracking-tighter">Consulfision</span>
          <span className="text-[10px] block text-emerald-400 font-bold uppercase tracking-widest">IA Clínica v2026</span>
        </div>
      </div>
      
      <nav className="flex-1 px-4 py-4 space-y-2 overflow-y-auto custom-scrollbar">
        {filteredItems.map((item) => (
          <button
            key={item.id}
            onClick={() => setView(item.id)}
            className={`w-full flex items-center gap-4 p-4 rounded-2xl transition-all relative ${
              currentView === item.id 
                ? 'bg-emerald-800 text-white shadow-xl' 
                : 'text-emerald-100/60 hover:bg-emerald-900/50'
            }`}
          >
            <span className="text-2xl">{item.icon}</span>
            <span className="font-bold hidden md:block text-sm">{item.label}</span>
            {item.badge && item.badge > 0 && (
               <span className="absolute right-4 bg-red-500 text-white w-5 h-5 rounded-full flex items-center justify-center text-[10px] font-black">{item.badge}</span>
            )}
          </button>
        ))}
      </nav>

      <div className="p-6 border-t border-emerald-900">
        <button onClick={onLogout} className="w-full flex items-center gap-4 p-4 rounded-2xl text-red-400 hover:bg-red-500/10 font-bold text-xs uppercase tracking-widest">
          <span>🚪</span><span className="hidden md:block">Sair do Sistema</span>
        </button>
      </div>
    </aside>
  );
};
