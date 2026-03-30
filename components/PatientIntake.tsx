
import React, { useState, useEffect } from 'react';
import { PatientData } from '../types';
import { useStore } from '../store/useStore';
import { translations } from '../translations';

interface PatientIntakeProps {
  patientData: PatientData | null;
  setPatientData: (data: PatientData) => void;
  onAnalyzeNow?: (data: PatientData) => void;
}

export const PatientIntake: React.FC<PatientIntakeProps> = ({ patientData, setPatientData, onAnalyzeNow }) => {
  const { isAnalyzing, clinicSettings } = useStore();
  const t = translations[clinicSettings.language || 'pt'] || translations.pt;

  const generateId = () => {
    const now = new Date();
    const month = String(now.getMonth() + 1).padStart(2, '0');
    const year = now.getFullYear();
    const random = Math.floor(1000 + Math.random() * 9000);
    return `${month}-${year}-${random}`;
  };

  const [formData, setFormData] = useState<PatientData>(
    patientData || {
      id: generateId(),
      name: '',
      age: '',
      gender: t.notInformed,
      bloodType: '',
      weight: '',
      height: '',
      bmi: '',
      bloodPressure: '',
      glucose: '',
      address: '',
      phone: '',
      history: '',
      complaints: ''
    }
  );

  // Auto-calculate BMI
  useEffect(() => {
    const w = parseFloat(formData.weight);
    const h = parseFloat(formData.height);
    if (w > 0 && h > 0) {
      const heightInMeters = h > 3 ? h / 100 : h; 
      const calculatedBmi = (w / (heightInMeters * heightInMeters)).toFixed(1);
      setFormData(prev => ({ ...prev, bmi: calculatedBmi }));
    }
  }, [formData.weight, formData.height]);

  // Sync with store patientData when it changes (e.g. from camera measurements)
  useEffect(() => {
    if (patientData) {
      setFormData(prev => ({
        ...prev,
        bloodPressure: patientData.bloodPressure || prev.bloodPressure,
        glucose: patientData.glucose || prev.glucose,
        // Sync other fields if they were updated elsewhere
        weight: patientData.weight || prev.weight,
        height: patientData.height || prev.height,
        bmi: patientData.bmi || prev.bmi
      }));
    }
  }, [patientData?.bloodPressure, patientData?.glucose, patientData?.weight, patientData?.height, patientData?.bmi]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setPatientData(formData);
    alert(t.patientSavedSuccess + formData.id);
  };

  const handleAnalyzeNow = () => {
    if (!formData.name || !formData.complaints) {
      alert(t.fillRequiredFields);
      return;
    }
    setPatientData(formData);
    if (onAnalyzeNow) {
      onAnalyzeNow(formData);
    }
  };

  const updateField = (field: keyof PatientData, value: string) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  return (
    <div className="space-y-6 animate-fadeIn pb-12 relative">
      {isAnalyzing && (
        <div className="fixed inset-0 z-[500] bg-slate-900/80 backdrop-blur-sm flex items-center justify-center p-6">
          <div className="bg-white p-8 rounded-3xl shadow-2xl text-center space-y-6 max-w-md animate-slideUp">
            <div className="relative w-20 h-20 mx-auto">
              <div className="absolute inset-0 border-4 border-emerald-100 rounded-full"></div>
              <div className="absolute inset-0 border-4 border-emerald-600 rounded-full border-t-transparent animate-spin"></div>
              <div className="absolute inset-0 flex items-center justify-center text-3xl">🧠</div>
            </div>
            <div className="space-y-1">
              <h3 className="text-xl font-black text-slate-900 uppercase tracking-tighter">{t.analysisInProgress}</h3>
              <p className="text-slate-500 text-sm font-medium italic">{t.processingData}</p>
            </div>
            <div className="flex gap-2 justify-center">
              <div className="w-1.5 h-1.5 bg-emerald-600 rounded-full animate-bounce"></div>
              <div className="w-1.5 h-1.5 bg-emerald-600 rounded-full animate-bounce [animation-delay:0.2s]"></div>
              <div className="w-1.5 h-1.5 bg-emerald-600 rounded-full animate-bounce [animation-delay:0.4s]"></div>
            </div>
          </div>
        </div>
      )}
      <header className="flex flex-col md:flex-row justify-between items-start md:items-center gap-3">
        <div>
          <h2 className="text-xl font-black text-slate-900 tracking-tight uppercase">{t.clinicalRecordTitle}</h2>
          <p className="text-slate-500 text-xs font-medium">{t.anamnesisSubtitle}</p>
        </div>
        <div className="bg-emerald-900 text-white px-4 py-2 rounded-xl shadow-xl flex flex-col items-end">
          <p className="text-[9px] font-black text-emerald-400 uppercase tracking-widest">{t.registrationCode}</p>
          <p className="font-mono font-bold text-base">{formData.id}</p>
        </div>
      </header>

      <form onSubmit={handleSubmit} className="bg-white rounded-3xl shadow-sm border border-slate-100 overflow-hidden">
        <div className="p-4 md:p-6 space-y-6">
          
          {/* 1. Informações Identificativas */}
          <section className="space-y-4">
            <h3 className="text-[10px] font-black text-emerald-700 uppercase tracking-widest flex items-center gap-2">
              <span className="w-3.5 h-3.5 bg-emerald-100 text-emerald-600 rounded-full flex items-center justify-center text-[9px]">1</span>
              {t.identificationContact}
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-6 gap-6">
              <div className="md:col-span-3 space-y-2">
                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">{t.fullName}</label>
                <input 
                  type="text" 
                  value={formData.name}
                  onChange={(e) => updateField('name', e.target.value)}
                  className="w-full p-4 bg-slate-50 rounded-2xl border-2 border-transparent focus:border-emerald-500 focus:bg-white outline-none transition-all font-bold text-base"
                  placeholder="Ex: João Silva"
                  required
                />
              </div>
              <div className="md:col-span-1 space-y-2">
                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">{t.gender}</label>
                <select 
                  value={formData.gender}
                  onChange={(e) => updateField('gender', e.target.value)}
                  className="w-full p-4 bg-slate-50 rounded-2xl border-2 border-transparent focus:border-emerald-500 focus:bg-white outline-none transition-all font-bold text-base"
                >
                  <option value={t.male}>{t.male}</option>
                  <option value={t.female}>{t.female}</option>
                  <option value={t.other}>{t.other}</option>
                  <option value={t.notInformed}>{t.notInformed}</option>
                </select>
              </div>
              <div className="md:col-span-2 space-y-2">
                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">{t.phoneWhatsApp}</label>
                <input 
                  type="tel" 
                  value={formData.phone}
                  onChange={(e) => updateField('phone', e.target.value)}
                  className="w-full p-4 bg-slate-50 rounded-2xl border-2 border-transparent focus:border-emerald-500 focus:bg-white outline-none transition-all font-bold text-base"
                  placeholder="+351 9xx xxx xxx"
                />
              </div>
              <div className="md:col-span-6 space-y-2">
                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">{t.fullAddress}</label>
                <input 
                  type="text" 
                  value={formData.address}
                  onChange={(e) => updateField('address', e.target.value)}
                  className="w-full p-4 bg-slate-50 rounded-2xl border-2 border-transparent focus:border-emerald-500 focus:bg-white outline-none transition-all font-bold text-base"
                  placeholder="Rua, Número, Código Postal, Cidade..."
                />
              </div>
            </div>
          </section>

          {/* 2. Biometria & Sinais Vitais */}
          <section className="space-y-4">
            <h3 className="text-[10px] font-black text-blue-700 uppercase tracking-widest flex items-center gap-2">
              <span className="w-3.5 h-3.5 bg-blue-100 text-blue-600 rounded-full flex items-center justify-center text-[9px]">2</span>
              {t.biometryPhysiology}
            </h3>
            <div className="grid grid-cols-2 md:grid-cols-6 gap-6">
              <div className="space-y-2">
                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">{t.age}</label>
                <input 
                  type="number" 
                  value={formData.age} 
                  onChange={(e) => updateField('age', e.target.value)} 
                  className="w-full p-5 bg-slate-50 rounded-2xl border-2 border-transparent focus:border-emerald-500 focus:bg-white outline-none transition-all font-bold text-base" 
                />
              </div>
              <div className="space-y-2">
                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">{t.weightKg}</label>
                <input 
                  type="number" 
                  step="0.1" 
                  value={formData.weight} 
                  onChange={(e) => updateField('weight', e.target.value)} 
                  className="w-full p-5 bg-slate-50 rounded-2xl border-2 border-transparent focus:border-emerald-500 focus:bg-white outline-none transition-all font-bold text-base" 
                />
              </div>
              <div className="space-y-2">
                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">{t.heightCm}</label>
                <input 
                  type="number" 
                  step="0.01" 
                  value={formData.height} 
                  onChange={(e) => updateField('height', e.target.value)} 
                  className="w-full p-5 bg-slate-50 rounded-2xl border-2 border-transparent focus:border-emerald-500 focus:bg-white outline-none transition-all font-bold text-base" 
                />
              </div>
              <div className="space-y-2">
                <label className="text-[10px] font-black text-emerald-600 uppercase tracking-widest">{t.bmiAuto} (Auto)</label>
                <input type="text" value={formData.bmi} readOnly className="w-full p-5 bg-emerald-50 rounded-2xl border-2 border-emerald-100 font-black text-emerald-700 outline-none cursor-default text-base" />
              </div>
              <div className="space-y-2">
                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">{t.blood}</label>
                <input type="text" value={formData.bloodType} onChange={(e) => updateField('bloodType', e.target.value)} className="w-full p-5 bg-slate-50 rounded-2xl border-2 border-transparent focus:border-emerald-500 focus:bg-white outline-none transition-all font-bold text-base" />
              </div>
              <div className="space-y-2">
                <label className="text-[10px] font-black text-red-500 uppercase tracking-widest">{t.bloodPressure}</label>
                <input type="text" placeholder="120/80" value={formData.bloodPressure} onChange={(e) => updateField('bloodPressure', e.target.value)} className="w-full p-5 bg-slate-50 rounded-2xl border-2 border-transparent focus:border-emerald-500 focus:bg-white outline-none transition-all font-bold text-red-600 text-base" />
              </div>
              <div className="space-y-2">
                <label className="text-[10px] font-black text-blue-500 uppercase tracking-widest">Glicemia</label>
                <input type="text" placeholder="90 mg/dL" value={formData.glucose || ''} onChange={(e) => updateField('glucose', e.target.value)} className="w-full p-5 bg-slate-50 rounded-2xl border-2 border-transparent focus:border-emerald-500 focus:bg-white outline-none transition-all font-bold text-blue-600 text-base" />
              </div>
            </div>
          </section>

          {/* 3. Contexto Clínico */}
          <section className="space-y-4">
            <h3 className="text-[10px] font-black text-amber-700 uppercase tracking-widest flex items-center gap-2">
              <span className="w-3.5 h-3.5 bg-amber-100 text-amber-600 rounded-full flex items-center justify-center text-[9px]">3</span>
              {t.historyComplaints}
            </h3>
            <div className="grid grid-cols-1 gap-8">
              <div className="space-y-2">
                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">{t.medicalHistory}</label>
                <textarea 
                  value={formData.history}
                  onChange={(e) => updateField('history', e.target.value)}
                  rows={4}
                  className="w-full p-5 bg-slate-50 rounded-2xl border-2 border-transparent focus:border-emerald-500 focus:bg-white outline-none transition-all resize-none font-bold text-slate-700 text-base"
                  placeholder="Detalhes sobre doenças passadas, tratamentos de oncologia, cirurgias e medicamentos de uso contínuo..."
                />
              </div>
              <div className="space-y-2">
                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">{t.mainComplaints}</label>
                <textarea 
                  value={formData.complaints}
                  onChange={(e) => updateField('complaints', e.target.value)}
                  rows={6}
                  className="w-full p-5 bg-slate-50 rounded-2xl border-2 border-transparent focus:border-emerald-500 focus:bg-white outline-none transition-all resize-none font-bold text-slate-800 text-lg leading-relaxed"
                  placeholder="Descreva detalhadamente as dores, desconfortos ou desequilíbrios emocionais..."
                  required
                />
              </div>

              {/* Botão de Analisar / Consulta solicitado pelo usuário logo após a queixa */}
              <div className="flex justify-center pt-2">
                <button 
                  type="button"
                  onClick={handleAnalyzeNow}
                  className="w-full md:w-auto bg-gradient-to-r from-blue-600 to-emerald-600 text-white px-12 py-4 rounded-2xl font-black hover:from-blue-700 hover:to-emerald-700 transition-all shadow-2xl hover:shadow-emerald-200 uppercase tracking-widest text-base flex items-center justify-center gap-3 group active:scale-95"
                >
                  <span className="text-xl group-hover:rotate-12 transition-transform">🔮</span> 
                  {t.analyzeNow}
                </button>
              </div>
            </div>
          </section>
        </div>

        <div className="p-4 md:p-6 bg-slate-50 border-t border-slate-100 flex flex-col md:flex-row justify-between items-center gap-4">
          <button 
            type="button"
            onClick={() => setFormData({ id: generateId(), name: '', age: '', gender: t.notInformed, bloodType: '', weight: '', height: '', bmi: '', bloodPressure: '', glucose: '', address: '', phone: '', history: '', complaints: '' })}
            className="px-6 py-3 rounded-xl font-black text-slate-400 hover:text-slate-600 transition-all uppercase tracking-widest text-[10px]"
          >
            {t.clearData}
          </button>
          
          <div className="flex flex-col md:flex-row gap-3 w-full md:w-auto">
            <button 
              type="submit"
              className="bg-white text-emerald-600 border border-emerald-100 px-8 py-3.5 rounded-2xl font-black hover:bg-emerald-50 transition-all shadow-sm uppercase tracking-widest text-[10px]"
            >
              {t.saveSyncRecord}
            </button>
          </div>
        </div>
      </form>
    </div>
  );
};
