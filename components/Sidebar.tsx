
import React, { useState, useEffect } from 'react';
import { ClinicSettings, UserRole, LicenseType } from '../types';
import { translations } from '../translations';

interface SidebarProps {
  currentView: string;
  setView: (view: any) => void;
  patientActive: boolean;
  clinicSettings: ClinicSettings;
  userRole: UserRole | null;
  onLogout: () => void;
  binCount?: number;
  onOpenTutorial?: () => void;
}

export const Sidebar: React.FC<SidebarProps> = ({ 
  currentView, 
  setView, 
  patientActive, 
  clinicSettings, 
  userRole, 
  onLogout, 
  binCount = 0,
  onOpenTutorial
}) => {
  const t = translations[clinicSettings.language || 'pt'] || translations.pt;
  const [isOnline, setIsOnline] = useState(navigator.onLine);

  useEffect(() => {
    const handleOnline = () => setIsOnline(true);
    const handleOffline = () => setIsOnline(false);
    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);
    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  const getRoleIcon = () => {
    switch (userRole) {
      case UserRole.DOCTOR: return '👨‍⚕️';
      case UserRole.THERAPIST: return '🧑‍⚕️';
      case UserRole.STUDENT: return '🧑‍💼';
      case UserRole.PATIENT: return '🧑‍🦱';
      default: return '👤';
    }
  };

  const getRoleLabel = () => {
    switch (userRole) {
      case UserRole.DOCTOR: return t.role_doctor;
      case UserRole.THERAPIST: return t.role_therapist;
      case UserRole.STUDENT: return t.role_student;
      case UserRole.PATIENT: return t.role_patient;
      default: return '';
    }
  };

  const getPlanLabel = () => {
    switch (clinicSettings.licenseType) {
      case LicenseType.FREE: return 'Teste 5 Dias';
      case LicenseType.GO: return 'Plano GO';
      case LicenseType.PREMIUM: return 'Plano PREMIUM';
      case LicenseType.PROFESSIONAL: return 'Plano PROFISSIONAL';
      case LicenseType.CREATOR: return 'CRIADOR NSO';
      default: return 'Free';
    }
  };

  const getDaysRemaining = () => {
    if (!clinicSettings.expiryDate) return 0;
    const diff = new Date(clinicSettings.expiryDate).getTime() - Date.now();
    return Math.max(0, Math.ceil(diff / (1000 * 3600 * 24)));
  };

  const menuItems = [
    { id: 'dashboard', label: t.dashboard, icon: '🏠', roles: [UserRole.DOCTOR, UserRole.THERAPIST, UserRole.STUDENT, UserRole.PATIENT] },
    { id: 'patient', label: t.patientIntake, icon: '👤', roles: [UserRole.DOCTOR, UserRole.THERAPIST, UserRole.STUDENT] },
    { id: 'history', label: t.clinicalHistory, icon: '📂', roles: [UserRole.DOCTOR, UserRole.THERAPIST, UserRole.STUDENT, UserRole.PATIENT] },
    { id: 'mapping', label: t.mapping, icon: '📍', roles: [UserRole.DOCTOR, UserRole.THERAPIST, UserRole.STUDENT] },
    { id: 'consultation', label: t.consultation, icon: '🎙️', roles: [UserRole.DOCTOR, UserRole.THERAPIST, UserRole.STUDENT] },
    { id: 'exams', label: t.exams, icon: '📄', roles: [UserRole.DOCTOR, UserRole.THERAPIST, UserRole.STUDENT] },
    { id: 'library', label: t.libraryNSO, icon: '🏛️', roles: [UserRole.DOCTOR, UserRole.THERAPIST, UserRole.STUDENT, UserRole.PATIENT] },
    { id: 'protocols', label: t.protocols, icon: '📋', roles: [UserRole.DOCTOR, UserRole.THERAPIST, UserRole.STUDENT, UserRole.PATIENT] },
    { id: 'recycle', label: t.recycleBin, icon: '🗑️', roles: [UserRole.DOCTOR, UserRole.THERAPIST], badge: binCount },
    { id: 'settings', label: t.settings, icon: '⚙️', roles: [UserRole.DOCTOR, UserRole.THERAPIST] },
    { id: 'help', label: t.help, icon: '❓', roles: [UserRole.DOCTOR, UserRole.THERAPIST, UserRole.STUDENT, UserRole.PATIENT] },
  ];

  const filteredItems = menuItems.filter(item => userRole && item.roles.includes(userRole));

  const daysLeft = getDaysRemaining();

  return (
    <aside className="w-20 md:w-72 bg-emerald-950 text-white h-full flex flex-col transition-all duration-500 border-r border-emerald-900/50">
      <div className="p-4 md:p-8 flex items-center gap-4">
        <div className="w-12 h-12 bg-emerald-400 rounded-2xl flex items-center justify-center text-emerald-950 shadow-[0_0_20px_rgba(52,211,153,0.3)] shrink-0 group hover:rotate-12 transition-transform duration-300">
          <svg viewBox="0 0 24 24" className="w-8 h-8 fill-current" xmlns="http://www.w3.org/2000/svg">
            <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-1 17.93c-3.95-.49-7-3.85-7-7.93 0-.62.08-1.21.21-1.79L9 15v1c0 1.1.9 2 2 2v1.93zm6.9-2.54c-.26-.81-1-1.39-1.9-1.39h-1v-3c0-.55-.45-1-1-1H8v-2h2c.55 0 1-.45 1-1V7h2c1.1 0 2-.9 2-2v-.41c2.93 1.19 5 4.06 5 7.41 0 2.08-.8 3.97-2.1 5.39z"/>
          </svg>
        </div>
        <div className="hidden md:block overflow-hidden">
          <span className="text-xl font-black tracking-tighter text-emerald-50 block leading-none truncate">{clinicSettings.clinicName}</span>
          <span className="text-[10px] font-bold text-emerald-400 uppercase tracking-[0.2em] block mt-1 truncate">{clinicSettings.therapistName}</span>
        </div>
      </div>

      <div className="px-4 md:px-6 mb-4 space-y-2">
        {/* Status da Conexão (Wi-Fi/Dados) */}
        <div className={`p-3 rounded-2xl flex items-center gap-3 transition-all ${isOnline ? 'bg-emerald-500/10 border border-emerald-500/20' : 'bg-red-500/10 border border-red-500/20'}`}>
           <div className={`w-2 h-2 rounded-full ${isOnline ? 'bg-emerald-400 animate-pulse' : 'bg-red-500'}`}></div>
           <p className="hidden md:block text-[9px] font-black uppercase tracking-widest leading-none">
             {isOnline ? t.online : t.offline}
           </p>
        </div>

        <div className="bg-white/10 p-4 rounded-3xl border border-white/10 flex items-center gap-4">
          <span className="text-2xl">{getRoleIcon()}</span>
          <div className="hidden md:block overflow-hidden">
             <p className="text-[10px] font-black uppercase text-emerald-400 tracking-widest leading-none mb-1">Perfil</p>
             <p className="font-bold text-xs truncate">{getRoleLabel()}</p>
          </div>
        </div>

        {/* Indicador de Plano */}
        <div className={`p-4 rounded-3xl border flex flex-col gap-1 ${daysLeft < 2 ? 'bg-red-500/20 border-red-500/30' : 'bg-blue-500/10 border-blue-500/20'}`}>
           <p className="text-[9px] font-black uppercase text-emerald-400 tracking-widest leading-none">{getPlanLabel()}</p>
           <p className="font-bold text-[10px] hidden md:block">
              {daysLeft > 0 ? `${daysLeft} dias restantes` : 'Expirado'}
           </p>
           {clinicSettings.licenseType === LicenseType.FREE && (
             <div className="h-1 bg-white/10 rounded-full mt-1 overflow-hidden">
                <div className="h-full bg-emerald-400" style={{ width: `${(daysLeft / 5) * 100}%` }}></div>
             </div>
           )}
        </div>
        
        <button 
          onClick={onOpenTutorial}
          className="w-full bg-emerald-400/10 hover:bg-emerald-400/20 text-emerald-400 p-4 rounded-3xl border border-emerald-400/20 flex items-center gap-4 transition-all group"
        >
          <span className="text-xl group-hover:scale-125 transition-transform">✨</span>
          <div className="hidden md:block text-left">
             <p className="text-[9px] font-black uppercase tracking-widest leading-none mb-1">Guia Rápido</p>
             <p className="font-bold text-[10px] uppercase">Como Funciona?</p>
          </div>
        </button>
      </div>
      
      <nav className="flex-1 px-4 py-2 space-y-1.5 overflow-y-auto custom-scrollbar">
        {filteredItems.map((item) => (
          <button
            key={item.id}
            onClick={() => setView(item.id)}
            className={`w-full flex items-center gap-4 p-4 rounded-2xl transition-all relative group ${
              currentView === item.id 
                ? 'bg-emerald-800 text-white shadow-[0_10px_30px_rgba(6,78,59,0.5)] border border-emerald-700' 
                : 'text-emerald-100/60 hover:bg-emerald-900/50 hover:text-white'
            }`}
          >
            <span className={`text-2xl transition-transform duration-300 group-hover:scale-110 ${currentView === item.id ? 'opacity-100' : 'opacity-70'}`}>
              {item.icon}
            </span>
            <span className="font-bold hidden md:block text-sm tracking-tight">{item.label}</span>
            {item.badge && item.badge > 0 && (
               <span className="absolute right-4 top-1/2 -translate-y-1/2 w-5 h-5 bg-red-500 text-white rounded-full flex items-center justify-center text-[10px] font-black">
                  {item.badge}
               </span>
            )}
          </button>
        ))}
      </nav>

      <div className="p-4 md:p-6 border-t border-emerald-900 space-y-4">
        <button 
          onClick={onLogout}
          className="w-full flex items-center gap-4 p-4 rounded-2xl text-red-400 hover:bg-red-500/10 transition-all font-bold text-xs uppercase tracking-widest group"
        >
          <span className="text-xl group-hover:rotate-12 transition-transform">🚪</span>
          <span className="hidden md:block">{t.logout}</span>
        </button>
      </div>
    </aside>
  );
};
