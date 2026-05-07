
import React from 'react';
import { PatientData, AnalysisReport, ClinicSettings, UserRole, MedicalDevice } from '../types';
import { translations } from '../translations';
import { 
  Usb, 
  RefreshCw, 
  CheckCircle2, 
  AlertCircle, 
  Activity, 
  Settings as SettingsIcon, 
  UserPlus, 
  Eye, 
  Camera, 
  Zap, 
  Brain, 
  Bot, 
  Sparkles, 
  Music, 
  ShieldCheck,
  ChevronRight,
  ClipboardList,
  Waves,
  Target,
  Heart,
  Droplets,
  FileText
} from 'lucide-react';

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
  connectedDevices?: MedicalDevice[];
  onDetectDevice?: () => void;
  onGenerateAutoProtocol?: () => void;
  isAnalyzing?: boolean;
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
  recommendedCount = 0,
  connectedDevices = [],
  onDetectDevice,
  onGenerateAutoProtocol,
  isAnalyzing = false
}) => {
  const t = translations[clinicSettings.language || 'pt'] || translations.pt;
  const isInternal = userRole === UserRole.DOCTOR || userRole === UserRole.THERAPIST || userRole === UserRole.STUDENT;

  const lang = clinicSettings.language === 'ln' ? 'fr' : (clinicSettings.language || 'pt-BR');
  const formattedDate = new Date().toLocaleDateString(lang === 'pt' ? 'pt-BR' : lang, { day: '2-digit', month: 'short' });

  return (
    <div className="space-y-6 animate-fadeIn pb-10">
      <header className="flex justify-between items-center">
        <div className="flex items-center gap-3">
          <div className="w-12 h-12 bg-slate-900 rounded-2xl flex items-center justify-center text-white shadow-xl shadow-slate-200 rotate-3 group hover:rotate-0 transition-transform cursor-pointer">
            <Brain size={28} className="group-hover:scale-110 transition-transform" />
          </div>
          <div>
            <h1 className="text-2xl font-black text-slate-900 tracking-tighter uppercase leading-none">{clinicSettings.clinicName}</h1>
            <div className="flex items-center gap-2 mt-1">
              <p className="text-slate-500 text-[10px] font-medium uppercase tracking-widest">{t.welcome}</p>
              <span className="w-1 h-1 bg-slate-300 rounded-full"></span>
              <p className="text-[10px] font-black text-emerald-600 uppercase tracking-widest">
                {allPatients.reduce((sum, p) => sum + (p.consultationHistory?.length || 0), 0)} {t.consultations || 'Consultas'}
              </p>
              <span className="w-1 h-1 bg-slate-300 rounded-full"></span>
              <p className="text-[10px] font-black text-blue-600 uppercase tracking-widest">
                {formattedDate}
              </p>
            </div>
          </div>
        </div>
        <div className="flex gap-2">
          <button 
            onClick={onDetectDevice}
            className="w-10 h-10 bg-white border border-slate-200 rounded-full flex items-center justify-center shadow-sm text-slate-600 hover:text-emerald-600 transition-colors"
            title={t.detectHardware}
          >
            <Usb size={18} />
          </button>
          <button 
            onClick={() => setView('settings')}
            className="w-10 h-10 bg-white border border-slate-200 rounded-full flex items-center justify-center shadow-sm text-slate-600 hover:text-emerald-600 transition-colors"
          >
            <SettingsIcon size={18} />
          </button>
        </div>
      </header>

      {/* Hardware Status List */}
      {connectedDevices.length > 0 && (
        <div className="flex gap-2 overflow-x-auto pb-2 no-scrollbar">
          {connectedDevices.map(device => (
            <div 
              key={device.id}
              onClick={() => setView('hardware')}
              className={`flex items-center gap-2 px-3 py-2 rounded-xl border whitespace-nowrap cursor-pointer transition-all ${
                device.status === 'connected' ? 'bg-emerald-50 border-emerald-100 text-emerald-700' : 'bg-slate-50 border-slate-100 text-slate-500'
              }`}
            >
              <div className={`w-2 h-2 rounded-full ${device.status === 'connected' ? 'bg-emerald-500 animate-pulse' : 'bg-slate-300'}`}></div>
              <span className="text-[10px] font-black uppercase tracking-widest">{device.name}</span>
              {device.status === 'connected' ? <Activity size={12} /> : <RefreshCw size={12} className="animate-spin" />}
            </div>
          ))}
        </div>
      )}

      {/* Quick Actions Bento Grid */}
      <div className="grid grid-cols-2 md:grid-cols-3 gap-2">
        <button 
          onClick={() => setView('patient')}
          className="bg-emerald-600 text-white p-3 rounded-xl flex flex-col items-start justify-between gap-2 shadow-lg shadow-emerald-200 h-24"
        >
          <div className="w-7 h-7 bg-white/20 rounded-lg flex items-center justify-center">
            <UserPlus size={16} />
          </div>
          <div className="text-left">
            <p className="text-[7px] font-black uppercase tracking-widest opacity-80">{t.quickAction}</p>
            <p className="text-xs font-black leading-tight uppercase">{t.newPatient}</p>
          </div>
        </button>

        <button 
          onClick={() => setView('consultation')}
          className="bg-blue-600 text-white p-3 rounded-xl flex flex-col items-start justify-between gap-2 shadow-lg shadow-blue-200 h-24"
        >
          <div className="w-7 h-7 bg-white/20 rounded-lg flex items-center justify-center">
            <ClipboardList size={16} />
          </div>
          <div className="text-left">
            <p className="text-[7px] font-black uppercase tracking-widest opacity-80">Consulta</p>
            <p className="text-xs font-black leading-tight uppercase">Atendimento</p>
          </div>
        </button>

        <button 
          onClick={() => setView('exams')}
          className="bg-slate-800 text-white p-3 rounded-xl flex flex-col items-start justify-between gap-2 shadow-lg shadow-slate-200 h-24"
        >
          <div className="w-7 h-7 bg-white/20 rounded-lg flex items-center justify-center">
            <Camera size={16} />
          </div>
          <div className="text-left">
            <p className="text-[7px] font-black uppercase tracking-widest opacity-80">{t.iaVision}</p>
            <p className="text-xs font-black leading-tight uppercase">{t.analyzeExams}</p>
          </div>
        </button>

        <button 
          onClick={() => setView('blood_pressure')}
          className="bg-red-600 text-white p-3 rounded-xl flex flex-col items-start justify-between gap-2 shadow-lg shadow-red-200 h-24"
        >
          <div className="w-7 h-7 bg-white/20 rounded-lg flex items-center justify-center">
            <Heart size={16} />
          </div>
          <div className="text-left">
            <p className="text-[7px] font-black uppercase tracking-widest opacity-80">Monitor</p>
            <p className="text-xs font-black leading-tight uppercase">Pressão Arterial</p>
          </div>
        </button>

        <button 
          onClick={() => setView('glucose')}
          className="bg-blue-500 text-white p-3 rounded-xl flex flex-col items-start justify-between gap-2 shadow-lg shadow-blue-200 h-24"
        >
          <div className="w-7 h-7 bg-white/20 rounded-lg flex items-center justify-center">
            <Droplets size={16} />
          </div>
          <div className="text-left">
            <p className="text-[7px] font-black uppercase tracking-widest opacity-80">Monitor</p>
            <p className="text-xs font-black leading-tight uppercase">Glicemia</p>
          </div>
        </button>

        <button 
          onClick={() => setView('prescriptions')}
          className="bg-purple-600 text-white p-3 rounded-xl flex flex-col items-start justify-between gap-2 shadow-lg shadow-purple-200 h-24"
        >
          <div className="w-7 h-7 bg-white/20 rounded-lg flex items-center justify-center">
            <FileText size={16} />
          </div>
          <div className="text-left">
            <p className="text-[7px] font-black uppercase tracking-widest opacity-80">{t.integratedPrescription}</p>
            <p className="text-xs font-black leading-tight uppercase">Receitas IA</p>
          </div>
        </button>
      </div>

      {/* Active Patient Card */}
      {patientData ? (
        <div className="space-y-4">
          <div className="bg-slate-900 text-white p-4 rounded-2xl relative overflow-hidden shadow-xl border-l-4 border-emerald-500">
            <div className="relative z-10 space-y-3">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-emerald-500 text-slate-900 rounded-lg overflow-hidden flex items-center justify-center">
                  <img 
                    src="https://images.unsplash.com/photo-1522529599102-193c0d76b5b6?auto=format&fit=crop&w=100&h=100" 
                    alt="Patient" 
                    className="w-full h-full object-cover"
                    referrerPolicy="no-referrer"
                  />
                </div>
                <div>
                  <h2 className="text-lg font-black uppercase tracking-tight">{patientData.name}</h2>
                  <p className="text-emerald-400 text-[7px] font-bold uppercase tracking-widest">{t.activeCare}</p>
                </div>
              </div>
              <div className="flex gap-1.5 flex-wrap">
                <button 
                  onClick={() => setView('protocols')}
                  className="flex-1 bg-white text-slate-900 py-2 px-2 rounded-lg font-black text-[8px] uppercase tracking-widest whitespace-nowrap"
                >
                  {t.analyze}
                </button>
                <button 
                  onClick={() => setView('prescriptions')}
                  className="flex-1 bg-purple-500 text-white py-2 px-2 rounded-lg font-black text-[8px] uppercase tracking-widest whitespace-nowrap shadow-lg shadow-purple-900/20"
                >
                  <div className="flex items-center justify-center gap-1">
                    <Sparkles size={10} />
                    {t.integratedPrescription.split(' ')[0]}
                  </div>
                </button>
                {isInternal && (
                  <button 
                    onClick={() => setView('exam_request')}
                    className="flex-1 bg-emerald-500 text-white py-2 px-2 rounded-lg font-black text-[8px] uppercase tracking-widest whitespace-nowrap"
                  >
                    {t.requestExams}
                  </button>
                )}
              </div>
              
              {/* Automatic Protocol Generation Button */}
              <button 
                onClick={onGenerateAutoProtocol}
                disabled={isAnalyzing}
                className="w-full bg-gradient-to-r from-emerald-500 to-blue-500 text-white py-2 rounded-lg font-black text-[8px] uppercase tracking-widest shadow-lg flex items-center justify-center gap-2 group active:scale-95 transition-all"
              >
                {isAnalyzing ? (
                  <div className="w-3 h-3 border-2 border-white/30 border-t-white rounded-full animate-spin"></div>
                ) : (
                  <>
                    <Bot size={12} className="group-hover:rotate-12 transition-transform" />
                    {t.generateAutoProtocol}
                  </>
                )}
              </button>
            </div>
            <div className="absolute -right-1 -bottom-1 opacity-10 text-4xl">
              <ShieldCheck size={60} />
            </div>
          </div>

          {/* Revaluation Alert */}
          {(examData?.revaluationDate || patientData?.nextRevaluation) && (
            <div className="bg-amber-50 border border-amber-100 p-4 rounded-2xl flex items-center justify-between shadow-sm animate-pulse">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-amber-100 text-amber-600 rounded-xl flex items-center justify-center">
                  <RefreshCw size={20} />
                </div>
                <div>
                  <p className="text-[8px] font-black text-amber-800 uppercase tracking-widest">Próxima Reavaliação</p>
                  <p className="text-sm font-black text-slate-900">
                    {new Date(examData?.revaluationDate || patientData?.nextRevaluation!).toLocaleDateString('pt-BR')}
                  </p>
                </div>
              </div>
              <button 
                onClick={() => setView('protocols')}
                className="bg-amber-600 text-white px-4 py-2 rounded-lg font-black text-[8px] uppercase tracking-widest"
              >
                Ver Detalhes
              </button>
            </div>
          )}
        </div>
      ) : (
        <div className="bg-slate-100 border-2 border-dashed border-slate-200 p-4 rounded-2xl text-center space-y-1">
          <p className="text-slate-400 text-[9px] font-bold uppercase tracking-widest">{t.noPatientSelected}</p>
          <button onClick={() => setView('patient')} className="text-emerald-600 font-black text-[10px] uppercase">{t.startNow}</button>
        </div>
      )}

      {/* Stats Row & Modules */}
      <div className="grid grid-cols-4 gap-2">
        <button 
          onClick={() => setView('generator')}
          className="bg-white p-3 rounded-xl border border-slate-100 text-center flex flex-col items-center justify-center gap-1 active:scale-95 transition-all"
        >
          <Sparkles size={14} className="text-emerald-600" />
          <p className="text-[7px] font-black text-emerald-600 uppercase tracking-widest">{t.aiAtlas}</p>
          <p className="text-[9px] font-black text-slate-900">Atlas AI</p>
        </button>
        <button 
          onClick={() => setView('iridology')}
          className="bg-white p-3 rounded-xl border border-slate-100 text-center flex flex-col items-center justify-center gap-1 active:scale-95 transition-all"
        >
          <Eye size={14} className="text-blue-600" />
          <p className="text-[7px] font-black text-blue-600 uppercase tracking-widest">Íris</p>
          <p className="text-[9px] font-black text-slate-900">Iridologia</p>
        </button>
        <button 
          onClick={() => setView('quantum')}
          className="bg-white p-3 rounded-xl border border-slate-100 text-center flex flex-col items-center justify-center gap-1 active:scale-95 transition-all"
        >
          <Waves size={14} className="text-indigo-600" />
          <p className="text-[7px] font-black text-indigo-600 uppercase tracking-widest">Bio</p>
          <p className="text-[9px] font-black text-slate-900">Quantum</p>
        </button>
        <button 
          onClick={() => setView('nsofision')}
          className="bg-white p-3 rounded-xl border border-slate-100 text-center flex flex-col items-center justify-center gap-1 active:scale-95 transition-all"
        >
          <Target size={14} className="text-red-600" />
          <p className="text-[7px] font-black text-red-600 uppercase tracking-widest">Nero</p>
          <p className="text-[9px] font-black text-slate-900">NSO Nero</p>
        </button>
      </div>

      {/* Recent Patients List */}
      {allPatients.length > 0 && (
        <div className="space-y-3">
          <div className="flex justify-between items-center px-1">
            <h3 className="text-[10px] font-black text-slate-900 uppercase tracking-widest">{t.recent}</h3>
            <button onClick={() => setView('history')} className="text-[8px] font-bold text-emerald-600 uppercase">{t.viewAll}</button>
          </div>
          <div className="space-y-1.5">
            {allPatients.slice(0, 3).map(p => (
              <div 
                key={p.id} 
                onClick={() => onSelectPatient(p.id)}
                className="bg-white p-2.5 rounded-xl border border-slate-100 flex items-center justify-between group active:scale-95 transition-all"
              >
                <div className="flex items-center gap-2.5">
                  <div className="w-7 h-7 bg-slate-50 rounded-lg overflow-hidden flex items-center justify-center">
                    <img 
                      src="https://images.unsplash.com/photo-1507152832244-10d45c7eda57?auto=format&fit=crop&w=100&h=100" 
                      alt="Patient" 
                      className="w-full h-full object-cover"
                      referrerPolicy="no-referrer"
                    />
                  </div>
                  <div>
                    <p className="font-black text-slate-900 text-[10px]">{p.name}</p>
                    <p className="text-[7px] text-slate-400 font-mono">{p.id.slice(0, 8)}</p>
                  </div>
                </div>
                <ChevronRight size={14} className="text-slate-300" />
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};

