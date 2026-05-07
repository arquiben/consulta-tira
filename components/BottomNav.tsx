
import React from 'react';
import { LayoutDashboard, UserPlus, FileText, Sparkles, Camera, ClipboardList, Activity, Wind, Eye, Zap, Brain, Apple, Waves } from 'lucide-react';
import { UserRole, ClinicSettings } from '../types';
import { translations } from '../translations';

interface BottomNavProps {
  currentView: string;
  setView: (view: any) => void;
  userRole: UserRole | null;
  clinicSettings: ClinicSettings;
}

export const BottomNav: React.FC<BottomNavProps> = ({ currentView, setView, userRole, clinicSettings }) => {
  const t = translations[clinicSettings.language || 'pt'] || translations.pt;
  const isProfessional = userRole === UserRole.DOCTOR || userRole === UserRole.THERAPIST || userRole === UserRole.STUDENT;

  const navItems = [
    { id: 'dashboard', label: t.dashboard.split(' ')[0], icon: LayoutDashboard },
    { id: 'consultation', label: t.consultation.split(' ')[0], icon: ClipboardList },
    { id: 'patient', label: t.newPatient.split(' ')[0], icon: UserPlus, hidden: !isProfessional },
    { id: 'exams', label: t.exams.split(' ')[0], icon: Camera, hidden: !isProfessional },
    { id: 'prescriptions', label: 'Receita', icon: Sparkles, hidden: !isProfessional },
    { id: 'physiotherapy', label: 'Fisio', icon: Activity },
    { id: 'massotherapy', label: 'Masso', icon: Wind },
    { id: 'energy_diet', label: 'Dieta', icon: Apple },
    { id: 'hydrotherapy', label: 'Hidro', icon: Waves },
    { id: 'biomagnetism_guide', label: 'BioMag', icon: Zap },
    { id: 'history', label: t.clinicalHistory.split(' ')[0], icon: FileText },
  ];

  const visibleItems = navItems.filter(item => !item.hidden);

  return (
    <nav className="fixed bottom-0 left-0 right-0 bg-white border-t border-slate-200 px-1 py-1.5 flex justify-around items-center md:hidden z-50 shadow-[0_-4px_10px_rgba(0,0,0,0.05)]">
      {visibleItems.map((item) => {
        const Icon = item.icon;
        const isActive = currentView === item.id;
        return (
          <button
            key={item.id}
            onClick={() => setView(item.id)}
            className={`flex flex-col items-center gap-0.5 p-1.5 transition-all ${
              isActive ? 'text-emerald-600' : 'text-slate-400'
            }`}
          >
            <Icon size={16} className={isActive ? 'scale-110' : ''} />
            <span className="text-[8px] font-black uppercase tracking-tighter">{item.label}</span>
          </button>
        );
      })}
    </nav>
  );
};
