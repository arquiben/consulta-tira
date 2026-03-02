
import React, { useState, useRef, useEffect } from 'react';
import { ClinicSettings } from '../types';
import { translations } from '../translations';
import { OFFICIAL_NSO_LIBRARY } from '../services/libraryNSO';
import { getSupabase } from '../services/supabase';
import { Cloud, CheckCircle2, AlertCircle, RefreshCw } from 'lucide-react';

interface SettingsProps {
  settings: ClinicSettings;
  setSettings: (s: ClinicSettings) => void;
}

export const Settings: React.FC<SettingsProps> = ({ settings, setSettings }) => {
  const t = translations[settings.language || 'pt'] || translations.pt;
  
  const [tempTherapist, setTempTherapist] = useState(settings.therapistName);
  const [tempClinic, setTempClinic] = useState(settings.clinicName);
  const [tempLang, setTempLang] = useState(settings.language || 'pt');
  const [tempAccessPass, setTempAccessPass] = useState(settings.accessPassword || '');
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
            patients: JSON.parse(localStorage.getItem('consulfision_patients') || '[]'),
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
        if (data.author !== "NSOFISION") throw new Error("Formato inválido");
        
        if (window.confirm("Você está prestes a restaurar um ponto anterior. Isso irá sobrescrever todos os dados atuais por segurança. Continuar?")) {
          localStorage.setItem('consulfision_patients', JSON.stringify(data.patients));
          setSettings(data.settings);
          alert("Sistema Restaurado com Sucesso!");
          window.location.reload();
        }
      } catch (err) {
        alert("Erro ao ler arquivo de restauração. Certifique-se que é um arquivo .nso válido.");
      }
    };
    reader.readAsText(file);
  };

  return (
    <div className="space-y-8 animate-fadeIn pb-32">
      <header className="flex justify-between items-end">
        <div>
          <h2 className="text-2xl font-black text-slate-900 tracking-tight uppercase">{t.settings}</h2>
          <p className="text-slate-500 font-medium">Personalize seu ecossistema e gerencie a segurança de restauro.</p>
        </div>
      </header>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-10">
        <section className="bg-white p-10 rounded-[2.5rem] shadow-sm border border-slate-100 space-y-8">
           <div className="flex items-center gap-4">
              <div className="w-12 h-12 bg-emerald-100 text-emerald-600 rounded-2xl flex items-center justify-center text-xl">👤</div>
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
                 <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Nome do Centro</label>
                 <input 
                   type="text" 
                   value={tempClinic}
                   onChange={(e) => setTempClinic(e.target.value)}
                   className="w-full p-4 bg-slate-50 rounded-2xl border border-slate-200 font-bold outline-none"
                 />
              </div>
           </div>
        </section>

        <section className="bg-white p-10 rounded-[2.5rem] shadow-sm border border-slate-100 space-y-8">
           <div className="flex items-center gap-4">
              <div className="w-12 h-12 bg-blue-100 text-blue-600 rounded-2xl flex items-center justify-center text-xl">
                <Cloud size={24} />
              </div>
              <h3 className="text-lg font-black uppercase tracking-tight">Integração Supabase</h3>
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
                    Status: {supabaseStatus === 'connected' ? 'Conectado' : 'Aguardando Configuração'}
                  </span>
                </div>
              </div>
              
              <div className="p-4 bg-blue-50 rounded-2xl border border-blue-100">
                <p className="text-[10px] text-blue-800 font-medium leading-relaxed italic">
                  A integração com Supabase permite que seus dados sejam sincronizados na nuvem em tempo real, garantindo acesso multi-dispositivo e backup automático.
                </p>
              </div>

              <div className="space-y-4">
                <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Configuração Necessária</p>
                <div className="text-[10px] text-slate-500 space-y-2">
                  <p>1. Crie um projeto no Supabase.</p>
                  <p>2. Configure as variáveis de ambiente <code className="bg-slate-100 px-1 rounded text-slate-900">VITE_SUPABASE_URL</code> e <code className="bg-slate-100 px-1 rounded text-slate-900">VITE_SUPABASE_ANON_KEY</code>.</p>
                  <p>3. Crie as tabelas: <code className="bg-slate-100 px-1 rounded text-slate-900">patients</code>, <code className="bg-slate-100 px-1 rounded text-slate-900">frequency_protocols</code>, <code className="bg-slate-100 px-1 rounded text-slate-900">iridology_analysis</code> e <code className="bg-slate-100 px-1 rounded text-slate-900">custom_protocols</code>.</p>
                </div>
              </div>
           </div>
        </section>

        <section className="bg-slate-900 p-10 rounded-[2.5rem] shadow-2xl text-white space-y-8">
           <div className="flex items-center gap-4">
              <div className="w-12 h-12 bg-amber-500 text-slate-950 rounded-2xl flex items-center justify-center text-xl">🛡️</div>
              <h3 className="text-lg font-black uppercase tracking-tight">Centro de Restauro</h3>
           </div>
           <div className="space-y-6">
              <p className="text-xs text-slate-400 leading-relaxed">
                Crie um ponto de restauro frequente. Em caso de erros no futuro ou troca de dispositivo, você pode carregar o arquivo .nso para voltar exatamente a este momento.
              </p>
              <div className="flex flex-col gap-4">
                <button 
                  onClick={handleExportBackup}
                  className="w-full bg-amber-500 text-slate-950 py-4 rounded-2xl font-black text-xs uppercase tracking-widest hover:bg-amber-400 transition-all shadow-xl"
                >
                  {backupProgress > 0 ? `Salvando Ponto... ${backupProgress}%` : "Criar Ponto de Restauro (Snapshot)"}
                </button>
                <button 
                  onClick={() => fileInputRef.current?.click()}
                  className="w-full bg-slate-800 text-white border border-slate-700 py-4 rounded-2xl font-black text-xs uppercase tracking-widest hover:bg-slate-700 transition-all"
                >
                  Carregar Ponto de Restauro Anterior
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
      </div>

      <div className="flex justify-end pt-10">
         <button onClick={handleSave} className="bg-emerald-600 text-white px-12 py-5 rounded-3xl font-black shadow-2xl hover:bg-emerald-700 transition-all uppercase tracking-widest text-sm">
           {t.saveSettings}
         </button>
      </div>
    </div>
  );
};
