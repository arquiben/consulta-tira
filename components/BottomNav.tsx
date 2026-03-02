
import React from 'react';
import { LayoutDashboard, UserPlus, FileText, Sparkles, Camera, ClipboardList, Activity, Eye } from 'lucide-react';
import { UserRole } from '../types';

interface BottomNavProps {
  currentView: string;
  setView: (view: any) => void;
  userRole: UserRole | null;
}

export const BottomNav: React.FC<BottomNavProps> = ({ currentView, setView, userRole }) => {
  const isProfessional = userRole === UserRole.DOCTOR || userRole === UserRole.THERAPIST || userRole === UserRole.STUDENT;

  const navItems = [
    { id: 'dashboard', label: 'Início', icon: LayoutDashboard },
    { id: 'consultation', label: 'Consulta', icon: ClipboardList },
    { id: 'patient', label: 'Novo', icon: UserPlus, hidden: !isProfessional },
    { id: 'iridology', label: 'Íris', icon: Eye, hidden: !isProfessional },
    { id: 'exams', label: 'Análise', icon: Camera, hidden: !isProfessional },
    { id: 'history', label: 'Histórico', icon: FileText },
  ];

  const visibleItems = navItems.filter(item => !item.hidden);

  return (
    <nav className="fixed bottom-0 left-0 right-0 bg-white border-t border-slate-200 px-2 py-2 flex justify-around items-center md:hidden z-50 shadow-[0_-4px_10px_rgba(0,0,0,0.05)]">
      {visibleItems.map((item) => {
        const Icon = item.icon;
        const isActive = currentView === item.id;
        return (
          <button
            key={item.id}
            onClick={() => setView(item.id)}
            className={`flex flex-col items-center gap-1 p-2 transition-all ${
              isActive ? 'text-emerald-600' : 'text-slate-400'
            }`}
          >
            <Icon size={18} className={isActive ? 'scale-110' : ''} />
            <span className="text-[9px] font-bold uppercase tracking-tighter">{item.label}</span>
          </button>
        );
      })}
    </nav>
  );
};
