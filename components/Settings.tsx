
import React, { useState, useRef, useEffect } from 'react';
import { ClinicSettings } from '../types';
import { translations } from '../translations';
import { OFFICIAL_NSO_LIBRARY } from '../services/libraryNSO';
import { getSupabase } from '../services/supabase';
import { useStore } from '../store/useStore';
import { Cloud, CheckCircle2, AlertCircle, RefreshCw, User, Clock, Globe, Shield, Save, Download, Upload, Share2, GitBranch, Layout, Globe2, Smartphone, Lock } from 'lucide-react';
import { exportToGit, exportToGlide, exportToNetlify, exportToFlutter } from '@/services/exportService';

interface SettingsProps {
  settings: ClinicSettings;
  setSettings: (s: ClinicSettings) => void;
}

export const Settings: React.FC<SettingsProps> = ({ settings, setSettings }) => {
  const t = translations[settings.language || 'pt'] || translations.pt;
  const { allPatients, savePatient } = useStore();
  
  const [tempTherapist, setTempTherapist] = useState(settings.therapistName);
  const [tempClinic, setTempClinic] = useState(settings.clinicName);
  const [tempLang, setTempLang] = useState(settings.language || 'pt');
  const [tempAccessPass, setTempAccessPass] = useState(settings.accessPassword || '');
  const [currentTime, setCurrentTime] = useState(new Date());
  const [backupProgress, setBackupProgress] = useState(0);
  const [syncingWithCentral, setSyncingWithCentral] = useState(false);
  const [supabaseStatus, setSupabaseStatus] = useState<'connected' | 'disconnected' | 'error'>('disconnected');

  useEffect(() => {
    const checkSupabase = async () => {
      const client = getSupabase();
      if (!client) {
        setSupabaseStatus('disconnected');
        return;
      }
      
      try {
        const { error } = await client.from('patients').select('count', { count: 'exact', head: true });
        if (error) throw error;
        setSupabaseStatus('connected');
      } catch (err) {
        setSupabaseStatus('disconnected');
      }
    };
    checkSupabase();
  }, []);

  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    const timer = setInterval(() => {
      setCurrentTime(new Date());
    }, 1000);
    return () => clearInterval(timer);
  }, []);

  const handleSave = () => {
    setSettings({
      ...settings,
      therapistName: tempTherapist,
      clinicName: tempClinic,
      language: tempLang,
      accessPassword: tempAccessPass
    });
    alert(t.saveSettings + "!");
  };

   const handleExportBackup = () => {
    setBackupProgress(10);
    const interval = setInterval(() => {
      setBackupProgress(prev => {
        if (prev >= 100) {
          clearInterval(interval);
          const allData = {
            patients: allPatients,
            settings: settings,
            exportDate: new Date().toISOString(),
            author: "NSOFISION",
            coreVersion: OFFICIAL_NSO_LIBRARY.version,
            isRestorePoint: true
          };
          const blob = new Blob([JSON.stringify(allData, null, 2)], { type: 'application/json' });
          const url = URL.createObjectURL(blob);
          const link = document.createElement('a');
          link.href = url;
          link.download = `ponto_restauro_clinica_${new Date().toISOString().split('T')[0]}.nso`;
          link.click();
          setTimeout(() => setBackupProgress(0), 1000);
          return 100;
        }
        return prev + 20;
      });
    }, 200);
  };

  const handleImportBackup = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      try {
        const data = JSON.parse(event.target?.result as string);
        if (data.author !== "NSOFISION") throw new Error(t.invalidFormat);
        
        if (window.confirm(t.restoreConfirm)) {
          // Import patients one by one using savePatient
          if (Array.isArray(data.patients)) {
            data.patients.forEach((p: any) => savePatient(p));
          }
          setSettings(data.settings);
          alert(t.restoreSuccess);
          window.location.reload();
        }
      } catch (err) {
        alert(t.restoreError);
      }
    };
    reader.readAsText(file);
  };

  return (
    <div className="space-y-8 animate-fadeIn pb-32">
      <header className="flex justify-between items-end">
        <div>
          <h2 className="text-2xl font-black text-slate-900 tracking-tight uppercase">{t.settings}</h2>
          <p className="text-slate-500 font-medium">{t.settingsDesc}</p>
        </div>
      </header>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-10">
        <section className="bg-white p-10 rounded-[2.5rem] shadow-sm border border-slate-100 space-y-8">
           <div className="flex items-center gap-4">
              <div className="w-12 h-12 bg-emerald-100 text-emerald-600 rounded-2xl flex items-center justify-center"><User size={24} /></div>
              <h3 className="text-lg font-black uppercase tracking-tight">{t.therapistName}</h3>
           </div>
           <div className="space-y-4">
              <div className="space-y-1">
                 <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">{t.therapistName}</label>
                 <input 
                   type="text" 
                   value={tempTherapist}
                   onChange={(e) => setTempTherapist(e.target.value)}
                   className="w-full p-4 bg-slate-50 rounded-2xl border border-slate-200 font-bold outline-none"
                 />
              </div>
              <div className="space-y-1">
                 <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">{t.clinicNameLabel}</label>
                 <input 
                   type="text" 
                   value={tempClinic}
                   onChange={(e) => setTempClinic(e.target.value)}
                   className="w-full p-4 bg-slate-50 rounded-2xl border border-slate-200 font-bold outline-none"
                 />
              </div>
              <div className="space-y-1">
                 <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">{t.language}</label>
                 <div className="flex gap-2">
                    <select 
                      value={tempLang}
                      onChange={(e) => setTempLang(e.target.value)}
                      className="flex-1 p-4 bg-slate-50 rounded-2xl border border-slate-200 font-bold outline-none appearance-none cursor-pointer"
                    >
                      <option value="pt">Português (Brasil)</option>
                      <option value="en">English (International)</option>
                      <option value="fr">Français (International)</option>
                      <option value="es">Español (Internacional)</option>
                      <option value="ln">Lingala (Congo/Angola)</option>
                      <option value="kg">Kikongo (Angola/Congo)</option>
                      <option value="umb">Umbundu (Angola)</option>
                      <option value="kmb">Kimbundu (Angola)</option>
                      <option value="cjk">Chokwe (Angola)</option>
                    </select>
                    <button 
                      onClick={handleSave}
                      className="bg-emerald-600 text-white px-6 rounded-2xl font-black text-[10px] uppercase tracking-widest hover:bg-emerald-700 transition-all shadow-md flex items-center gap-2"
                      title={t.saveSettings}
                    >
                      <Save size={14} /> {t.saveSettings.split(' ')[0]}
                    </button>
                 </div>
              </div>
              <div className="space-y-1">
                 <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">{t.accessPasswordLabel}</label>
                 <div className="relative">
                    <Lock className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
                    <input 
                      type="password" 
                      value={tempAccessPass}
                      onChange={(e) => setTempAccessPass(e.target.value)}
                      placeholder={t.accessPasswordPlaceholder}
                      className="w-full p-4 pl-12 bg-slate-50 rounded-2xl border border-slate-200 font-bold outline-none"
                    />
                 </div>
              </div>
           </div>
        </section>

        <section className="bg-white p-10 rounded-[2.5rem] shadow-sm border border-slate-100 space-y-8">
           <div className="flex items-center gap-4">
              <div className="w-12 h-12 bg-blue-100 text-blue-600 rounded-2xl flex items-center justify-center text-xl">
                <Cloud size={24} />
              </div>
              <h3 className="text-lg font-black uppercase tracking-tight">{t.supabaseIntegration}</h3>
           </div>
           <div className="space-y-6">
              <div className="flex items-center justify-between p-4 bg-slate-50 rounded-2xl border border-slate-100">
                <div className="flex items-center gap-3">
                  {supabaseStatus === 'connected' ? (
                    <CheckCircle2 size={20} className="text-emerald-500" />
                  ) : supabaseStatus === 'error' ? (
                    <AlertCircle size={20} className="text-red-500" />
                  ) : (
                    <RefreshCw size={20} className="text-slate-400" />
                  )}
                  <span className="text-xs font-bold uppercase tracking-widest text-slate-600">
                    {t.supabaseStatus}: {supabaseStatus === 'connected' ? t.supabaseConnected : t.supabaseWaiting}
                  </span>
                </div>
              </div>
              
              <div className="p-4 bg-blue-50 rounded-2xl border border-blue-100">
                <p className="text-[10px] text-blue-800 font-medium leading-relaxed italic">
                  {t.supabaseDesc}
                </p>
              </div>

              <div className="space-y-4">
                <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">{t.requiredConfig}</p>
                <div className="text-[10px] text-slate-500 space-y-2">
                  <p>{t.supabaseStep1}</p>
                  <p>{t.supabaseStep2}</p>
                  <p>{t.supabaseStep3}</p>
                </div>
              </div>
           </div>
        </section>

        <section className="bg-white p-10 rounded-[2.5rem] shadow-sm border border-slate-100 space-y-8">
           <div className="flex items-center gap-4">
              <div className="w-12 h-12 bg-indigo-100 text-indigo-600 rounded-2xl flex items-center justify-center"><Clock size={24} /></div>
              <h3 className="text-lg font-black uppercase tracking-tight">{t.systemDateTime}</h3>
           </div>
           <div className="space-y-6">
              <div className="p-6 bg-slate-50 rounded-[2rem] border border-slate-100 text-center space-y-2">
                <p className="text-[10px] font-black text-slate-400 uppercase tracking-[0.3em]">{t.updatedTime}</p>
                <p className="text-4xl font-black text-slate-900 font-mono tracking-tighter">
                  {currentTime.toLocaleTimeString(settings.language === 'pt' ? 'pt-BR' : settings.language)}
                </p>
                <p className="text-xs font-bold text-indigo-600 uppercase tracking-widest">
                  {currentTime.toLocaleDateString(settings.language === 'pt' ? 'pt-BR' : settings.language, { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}
                </p>
              </div>
              
              <div className="p-4 bg-indigo-50 rounded-2xl border border-indigo-100 flex gap-3 items-start">
                <Globe size={18} className="text-indigo-600 shrink-0 mt-0.5" />
                <p className="text-[10px] text-indigo-800 font-medium leading-relaxed italic">
                  {t.timezoneInfo}
                </p>
              </div>

              <button 
                onClick={() => setCurrentTime(new Date())}
                className="w-full py-4 bg-white border border-slate-200 rounded-2xl text-[10px] font-black uppercase tracking-widest text-slate-600 hover:bg-slate-50 transition-all flex items-center justify-center gap-2"
              >
                <RefreshCw size={14} /> {t.syncNow}
              </button>
           </div>
        </section>

        <section className="bg-slate-900 p-10 rounded-[2.5rem] shadow-2xl text-white space-y-8">
           <div className="flex items-center gap-4">
              <div className="w-12 h-12 bg-amber-500 text-slate-950 rounded-2xl flex items-center justify-center"><Shield size={24} /></div>
              <h3 className="text-lg font-black uppercase tracking-tight">{t.restoreCenter}</h3>
           </div>
           <div className="space-y-6">
              <p className="text-xs text-slate-400 leading-relaxed">
                {t.restoreDesc}
              </p>
              <div className="flex flex-col gap-4">
                <button 
                  onClick={handleExportBackup}
                  className="w-full bg-amber-500 text-slate-950 py-4 rounded-2xl font-black text-xs uppercase tracking-widest hover:bg-amber-400 transition-all shadow-xl flex items-center justify-center gap-2"
                >
                  <Download size={14} /> {backupProgress > 0 ? `${t.savingSnapshot} ${backupProgress}%` : t.createSnapshot}
                </button>
                <button 
                  onClick={() => fileInputRef.current?.click()}
                  className="w-full bg-slate-800 text-white border border-slate-700 py-4 rounded-2xl font-black text-xs uppercase tracking-widest hover:bg-slate-700 transition-all flex items-center justify-center gap-2"
                >
                  <Upload size={14} /> {t.loadSnapshot}
                </button>
                <input 
                    type="file" 
                    ref={fileInputRef} 
                    onChange={handleImportBackup} 
                    accept=".nso" 
                    className="hidden" 
                 />
              </div>
           </div>
        </section>

        <section className="bg-white p-10 rounded-[2.5rem] shadow-sm border border-slate-100 space-y-8 lg:col-span-2">
           <div className="flex items-center gap-4">
              <div className="w-12 h-12 bg-purple-100 text-purple-600 rounded-2xl flex items-center justify-center"><Share2 size={24} /></div>
              <h3 className="text-lg font-black uppercase tracking-tight">{t.interoperability}</h3>
           </div>
           <div className="space-y-6">
              <p className="text-xs text-slate-500 leading-relaxed font-medium">
                {t.interopDesc}
              </p>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                <button 
                  onClick={exportToGit}
                  className="p-6 bg-slate-50 border border-slate-100 rounded-[2rem] hover:bg-slate-100 transition-all group text-left space-y-3"
                >
                  <div className="w-10 h-10 bg-slate-900 text-white rounded-xl flex items-center justify-center group-hover:scale-110 transition-transform"><GitBranch size={20} /></div>
                  <div>
                    <p className="text-[10px] font-black uppercase tracking-widest text-slate-400">Git / GitHub</p>
                    <p className="text-xs font-bold text-slate-700">{t.exportGit}</p>
                  </div>
                </button>

                <button 
                  onClick={exportToGlide}
                  className="p-6 bg-slate-50 border border-slate-100 rounded-[2rem] hover:bg-slate-100 transition-all group text-left space-y-3"
                >
                  <div className="w-10 h-10 bg-blue-600 text-white rounded-xl flex items-center justify-center group-hover:scale-110 transition-transform"><Layout size={20} /></div>
                  <div>
                    <p className="text-[10px] font-black uppercase tracking-widest text-slate-400">Glide Apps</p>
                    <p className="text-xs font-bold text-slate-700">{t.exportGlide}</p>
                  </div>
                </button>

                <button 
                  onClick={exportToNetlify}
                  className="p-6 bg-slate-50 border border-slate-100 rounded-[2rem] hover:bg-slate-100 transition-all group text-left space-y-3"
                >
                  <div className="w-10 h-10 bg-teal-500 text-white rounded-xl flex items-center justify-center group-hover:scale-110 transition-transform"><Globe2 size={20} /></div>
                  <div>
                    <p className="text-[10px] font-black uppercase tracking-widest text-slate-400">Netlify / Web</p>
                    <p className="text-xs font-bold text-slate-700">{t.exportNetlify}</p>
                  </div>
                </button>

                <button 
                  onClick={exportToFlutter}
                  className="p-6 bg-slate-50 border border-slate-100 rounded-[2rem] hover:bg-slate-100 transition-all group text-left space-y-3"
                >
                  <div className="w-10 h-10 bg-sky-500 text-white rounded-xl flex items-center justify-center group-hover:scale-110 transition-transform"><Smartphone size={20} /></div>
                  <div>
                    <p className="text-[10px] font-black uppercase tracking-widest text-slate-400">Flutter / DartPad</p>
                    <p className="text-xs font-bold text-slate-700">{t.exportFlutter}</p>
                  </div>
                </button>
              </div>
           </div>
        </section>
      </div>

      <div className="flex justify-end pt-10">
         <button onClick={handleSave} className="bg-emerald-600 text-white px-12 py-5 rounded-3xl font-black shadow-2xl hover:bg-emerald-700 transition-all uppercase tracking-widest text-sm flex items-center gap-2">
           <Save size={18} /> {t.saveSettings}
         </button>
      </div>
    </div>
  );
};
