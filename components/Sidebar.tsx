
import React, { useState, useEffect } from 'react';
import { ClinicSettings, UserRole } from '../types';
import { translations } from '../translations';
import { 
  LayoutDashboard, 
  UserPlus, 
  Mic, 
  FileText, 
  Eye, 
  Zap, 
  Brain, 
  MapPin, 
  ClipboardList, 
  Sparkles, 
  Music, 
  Usb, 
  BookOpen, 
  History, 
  Trash2, 
  Settings as SettingsIcon, 
  HelpCircle,
  LogOut,
  Globe,
  Activity,
  Wind,
  Heart,
  Droplets
} from 'lucide-react';

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
    { id: 'dashboard', label: t.dashboard, icon: LayoutDashboard, roles: [UserRole.DOCTOR, UserRole.THERAPIST, UserRole.STUDENT, UserRole.PATIENT] },
    { id: 'patient', label: t.patientIntake, icon: UserPlus, roles: [UserRole.DOCTOR, UserRole.THERAPIST, UserRole.STUDENT] },
    { id: 'consultation', label: t.consultation, icon: Mic, roles: [UserRole.DOCTOR, UserRole.THERAPIST, UserRole.STUDENT] },
    { id: 'exams', label: t.exams, icon: FileText, roles: [UserRole.DOCTOR, UserRole.THERAPIST, UserRole.STUDENT] },
    { id: 'mapping', label: t.mapping, icon: MapPin, roles: [UserRole.DOCTOR, UserRole.THERAPIST, UserRole.STUDENT] },
    { id: 'exam_request', label: t.exam_request, icon: ClipboardList, roles: [UserRole.DOCTOR, UserRole.THERAPIST, UserRole.STUDENT] },
    { id: 'blood_pressure', label: 'Pressão Arterial', icon: Heart, roles: [UserRole.DOCTOR, UserRole.THERAPIST, UserRole.STUDENT, UserRole.PATIENT] },
    { id: 'glucose', label: 'Glicemia', icon: Droplets, roles: [UserRole.DOCTOR, UserRole.THERAPIST, UserRole.STUDENT, UserRole.PATIENT] },
    { id: 'physiotherapy', label: 'Fisioterapia', icon: Activity, roles: [UserRole.DOCTOR, UserRole.THERAPIST, UserRole.STUDENT, UserRole.PATIENT] },
    { id: 'massotherapy', label: 'Massoterapia', icon: Wind, roles: [UserRole.DOCTOR, UserRole.THERAPIST, UserRole.STUDENT, UserRole.PATIENT] },
    { id: 'generator', label: 'Atlas IA', icon: Sparkles, roles: [UserRole.DOCTOR, UserRole.THERAPIST, UserRole.STUDENT] },
    { id: 'frequency', label: t.frequency, icon: Music, roles: [UserRole.DOCTOR, UserRole.THERAPIST, UserRole.STUDENT] },
    { id: 'protocols', label: t.protocols, icon: ClipboardList, roles: [UserRole.DOCTOR, UserRole.THERAPIST, UserRole.STUDENT, UserRole.PATIENT] },
    { id: 'library', label: t.libraryNSO, icon: BookOpen, roles: [UserRole.DOCTOR, UserRole.THERAPIST, UserRole.STUDENT, UserRole.PATIENT] },
    { id: 'history', label: t.clinicalHistory, icon: History, roles: [UserRole.DOCTOR, UserRole.THERAPIST, UserRole.STUDENT, UserRole.PATIENT] },
    { id: 'recycle', label: t.recycleBin, icon: Trash2, roles: [UserRole.DOCTOR, UserRole.THERAPIST], badge: binCount },
    { id: 'settings', label: t.settings, icon: SettingsIcon, roles: [UserRole.DOCTOR, UserRole.THERAPIST] },
    { id: 'help', label: t.help, icon: HelpCircle, roles: [UserRole.DOCTOR, UserRole.THERAPIST, UserRole.STUDENT, UserRole.PATIENT] },
  ];

  const filteredItems = menuItems.filter(item => userRole && item.roles.includes(userRole));

  const [currentTime, setCurrentTime] = useState(new Date());

  useEffect(() => {
    const timer = setInterval(() => {
      setCurrentTime(new Date());
    }, 1000);
    return () => clearInterval(timer);
  }, []);

  const lang = clinicSettings.language === 'ln' ? 'fr' : (clinicSettings.language || 'pt-BR'); // Fallback for Lingala locale if not supported by browser
  const formattedTime = currentTime.toLocaleTimeString(lang === 'pt' ? 'pt-BR' : lang, { hour: '2-digit', minute: '2-digit', second: '2-digit' });
  const formattedDate = currentTime.toLocaleDateString(lang === 'pt' ? 'pt-BR' : lang, { day: '2-digit', month: '2-digit', year: 'numeric' });

  return (
    <aside className="w-20 md:w-64 bg-emerald-950 text-white h-full flex flex-col border-r border-emerald-900/50">
      <div className="p-4 flex items-center gap-2">
        <div className="w-8 h-8 bg-emerald-400 rounded-lg flex items-center justify-center text-emerald-950 shadow-lg">
          <Globe size={18} />
        </div>
        <div className="hidden md:block">
          <span className="text-base font-black tracking-tighter">Consulfision</span>
          <span className="text-[8px] block text-emerald-400 font-bold uppercase tracking-widest">IA Clínica v2026</span>
        </div>
      </div>
      
      <nav className="flex-1 px-2 py-2 space-y-1 overflow-y-auto custom-scrollbar">
        {filteredItems.map((item) => {
          const Icon = item.icon;
          return (
            <button
              key={item.id}
              onClick={() => setView(item.id)}
              className={`w-full flex items-center gap-2.5 p-2.5 rounded-xl transition-all relative ${
                currentView === item.id 
                  ? 'bg-emerald-800 text-white shadow-xl' 
                  : 'text-emerald-100/60 hover:bg-emerald-900/50'
              }`}
            >
              <Icon size={18} />
              <span className="font-bold hidden md:block text-[10px] uppercase tracking-tight">{item.label}</span>
              {item.badge && item.badge > 0 && (
                 <span className="absolute right-3 bg-red-500 text-white w-3.5 h-3.5 rounded-full flex items-center justify-center text-[8px] font-black">{item.badge}</span>
              )}
            </button>
          );
        })}
      </nav>

      <div className="p-3 border-t border-emerald-900 space-y-2">
        <div className="hidden md:block bg-emerald-900/50 p-2.5 rounded-xl border border-emerald-800/50">
          <div className="flex items-center justify-between mb-0.5">
            <span className="text-[8px] font-black text-emerald-400 uppercase tracking-widest">{t.dateTime}</span>
            <span className="w-1 h-1 bg-emerald-500 rounded-full animate-pulse"></span>
          </div>
          <p className="text-base font-black tracking-tighter text-white font-mono">{formattedTime}</p>
          <p className="text-[8px] font-bold text-emerald-100/40 uppercase">{formattedDate}</p>
        </div>
        
        <button onClick={onLogout} className="w-full flex items-center gap-2.5 p-2.5 rounded-xl text-red-400 hover:bg-red-500/10 font-bold text-[9px] uppercase tracking-widest">
          <LogOut size={16} /><span className="hidden md:block">{t.logoutSystem}</span>
        </button>
      </div>
    </aside>
  );
};

