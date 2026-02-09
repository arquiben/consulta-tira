
import React, { useState, useEffect } from 'react';
import { PatientData } from '../types';

interface PatientIntakeProps {
  patientData: PatientData | null;
  setPatientData: (data: PatientData) => void;
  onAnalyzeNow?: (data: PatientData) => void;
}

export const PatientIntake: React.FC<PatientIntakeProps> = ({ patientData, setPatientData, onAnalyzeNow }) => {
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
      gender: 'Não Informado',
      bloodType: '',
      weight: '',
      height: '',
      bmi: '',
      bloodPressure: '',
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

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setPatientData(formData);
    alert('Ficha do paciente salva com sucesso! ID: ' + formData.id);
  };

  const handleAnalyzeNow = () => {
    if (!formData.name || !formData.complaints) {
      alert("Por favor, preencha pelo menos o nome e as queixas principais antes de gerar o diagnóstico.");
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
    <div className="space-y-6 animate-fadeIn pb-12">
      <header className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h2 className="text-2xl font-black text-slate-900 tracking-tight uppercase">Ficha Clínica Consulfision</h2>
          <p className="text-slate-500 font-medium">Anamnese detalhada para calibração da Inteligência Artificial.</p>
        </div>
        <div className="bg-emerald-900 text-white px-6 py-3 rounded-2xl shadow-xl flex flex-col items-end">
          <p className="text-[10px] font-black text-emerald-400 uppercase tracking-widest">CÓDIGO DE REGISTO</p>
          <p className="font-mono font-bold text-lg">{formData.id}</p>
        </div>
      </header>

      <form onSubmit={handleSubmit} className="bg-white rounded-[2rem] shadow-sm border border-slate-100 overflow-hidden">
        <div className="p-6 md:p-10 space-y-10">
          
          {/* 1. Informações Identificativas */}
          <section className="space-y-6">
            <h3 className="text-xs font-black text-emerald-700 uppercase tracking-widest flex items-center gap-3">
              <span className="w-4 h-4 bg-emerald-100 text-emerald-600 rounded-full flex items-center justify-center text-[10px]">1</span>
              Identificação & Contacto
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-6 gap-6">
              <div className="md:col-span-3 space-y-1">
                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Nome Completo</label>
                <input 
                  type="text" 
                  value={formData.name}
                  onChange={(e) => updateField('name', e.target.value)}
                  className="w-full p-4 bg-slate-50 rounded-2xl border border-slate-200 focus:ring-4 focus:ring-emerald-500/10 outline-none transition-all font-bold"
                  placeholder="Ex: João Silva"
                  required
                />
              </div>
              <div className="md:col-span-1 space-y-1">
                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Sexo</label>
                <select 
                  value={formData.gender}
                  onChange={(e) => updateField('gender', e.target.value)}
                  className="w-full p-4 bg-slate-50 rounded-2xl border border-slate-200 focus:ring-4 focus:ring-emerald-500/10 outline-none transition-all font-bold"
                >
                  <option value="Masculino">Masculino</option>
                  <option value="Feminino">Feminino</option>
                  <option value="Outro">Outro</option>
                  <option value="Não Informado">Não Informado</option>
                </select>
              </div>
              <div className="md:col-span-2 space-y-1">
                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Telemóvel / WhatsApp</label>
                <input 
                  type="tel" 
                  value={formData.phone}
                  onChange={(e) => updateField('phone', e.target.value)}
                  className="w-full p-4 bg-slate-50 rounded-2xl border border-slate-200 focus:ring-4 focus:ring-emerald-500/10 outline-none transition-all font-bold"
                  placeholder="+351 9xx xxx xxx"
                />
              </div>
              <div className="md:col-span-6 space-y-1">
                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Morada Completa</label>
                <input 
                  type="text" 
                  value={formData.address}
                  onChange={(e) => updateField('address', e.target.value)}
                  className="w-full p-4 bg-slate-50 rounded-2xl border border-slate-200 focus:ring-4 focus:ring-emerald-500/10 outline-none transition-all font-bold"
                  placeholder="Rua, Número, Código Postal, Cidade..."
                />
              </div>
            </div>
          </section>

          {/* 2. Biometria & Sinais Vitais */}
          <section className="space-y-6">
            <h3 className="text-xs font-black text-blue-700 uppercase tracking-widest flex items-center gap-3">
              <span className="w-4 h-4 bg-blue-100 text-blue-600 rounded-full flex items-center justify-center text-[10px]">2</span>
              Biometria & Parâmetros Fisiológicos
            </h3>
            <div className="grid grid-cols-2 md:grid-cols-6 gap-6">
              <div className="space-y-1">
                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Idade</label>
                <input type="number" value={formData.age} onChange={(e) => updateField('age', e.target.value)} className="w-full p-4 bg-slate-50 rounded-2xl border border-slate-200 focus:ring-4 font-bold" />
              </div>
              <div className="space-y-1">
                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Peso (kg)</label>
                <input type="number" step="0.1" value={formData.weight} onChange={(e) => updateField('weight', e.target.value)} className="w-full p-4 bg-slate-50 rounded-2xl border border-slate-200 focus:ring-4 font-bold" />
              </div>
              <div className="space-y-1">
                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Altura (cm/m)</label>
                <input type="number" step="0.01" value={formData.height} onChange={(e) => updateField('height', e.target.value)} className="w-full p-4 bg-slate-50 rounded-2xl border border-slate-200 focus:ring-4 font-bold" />
              </div>
              <div className="space-y-1">
                <label className="text-[10px] font-black text-emerald-600 uppercase tracking-widest">IMC (Auto)</label>
                <input type="text" value={formData.bmi} readOnly className="w-full p-4 bg-emerald-50 rounded-2xl border border-emerald-100 font-black text-emerald-700 outline-none cursor-default" />
              </div>
              <div className="space-y-1">
                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Sangue</label>
                <input type="text" value={formData.bloodType} onChange={(e) => updateField('bloodType', e.target.value)} className="w-full p-4 bg-slate-50 rounded-2xl border border-slate-200 focus:ring-4 font-bold" />
              </div>
              <div className="space-y-1">
                <label className="text-[10px] font-black text-red-500 uppercase tracking-widest">TA (P. Art.)</label>
                <input type="text" placeholder="120/80" value={formData.bloodPressure} onChange={(e) => updateField('bloodPressure', e.target.value)} className="w-full p-4 bg-slate-50 rounded-2xl border border-slate-200 focus:ring-4 font-bold text-red-600" />
              </div>
            </div>
          </section>

          {/* 3. Contexto Clínico */}
          <section className="space-y-6">
            <h3 className="text-xs font-black text-amber-700 uppercase tracking-widest flex items-center gap-3">
              <span className="w-4 h-4 bg-amber-100 text-amber-600 rounded-full flex items-center justify-center text-[10px]">3</span>
              Histórico & Queixas Atuais
            </h3>
            <div className="grid grid-cols-1 gap-8">
              <div className="space-y-2">
                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Histórico Médico, Oncológico & Alergias</label>
                <textarea 
                  value={formData.history}
                  onChange={(e) => updateField('history', e.target.value)}
                  rows={4}
                  className="w-full p-5 bg-slate-50 rounded-3xl border border-slate-200 focus:ring-4 focus:ring-emerald-500/10 outline-none transition-all resize-none font-medium text-slate-700"
                  placeholder="Detalhes sobre doenças passadas, tratamentos de oncologia, cirurgias e medicamentos de uso contínuo..."
                />
              </div>
              <div className="space-y-2">
                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Queixas Principais & Motivo da Consulta</label>
                <textarea 
                  value={formData.complaints}
                  onChange={(e) => updateField('complaints', e.target.value)}
                  rows={6}
                  className="w-full p-5 bg-slate-50 rounded-3xl border border-slate-200 focus:ring-4 focus:ring-emerald-500/10 outline-none transition-all resize-none font-bold text-slate-800 text-lg leading-relaxed"
                  placeholder="Descreva detalhadamente as dores, desconfortos ou desequilíbrios emocionais..."
                  required
                />
              </div>

              {/* Botão de Analisar / Consulta solicitado pelo usuário logo após a queixa */}
              <div className="flex justify-center pt-4">
                <button 
                  type="button"
                  onClick={handleAnalyzeNow}
                  className="w-full md:w-auto bg-gradient-to-r from-blue-600 to-emerald-600 text-white px-20 py-6 rounded-[2.5rem] font-black hover:from-blue-700 hover:to-emerald-700 transition-all shadow-2xl hover:shadow-emerald-200 uppercase tracking-widest text-lg flex items-center justify-center gap-4 group active:scale-95"
                >
                  <span className="text-2xl group-hover:rotate-12 transition-transform">🔮</span> 
                  ANALISAR CONSULTA AGORA
                </button>
              </div>
            </div>
          </section>
        </div>

        <div className="p-8 md:p-10 bg-slate-50 border-t border-slate-100 flex flex-col md:flex-row justify-between items-center gap-6">
          <button 
            type="button"
            onClick={() => setFormData({ id: generateId(), name: '', age: '', gender: 'Não Informado', bloodType: '', weight: '', height: '', bmi: '', bloodPressure: '', address: '', phone: '', history: '', complaints: '' })}
            className="px-8 py-4 rounded-2xl font-black text-slate-400 hover:text-slate-600 transition-all uppercase tracking-widest text-xs"
          >
            Limpar Dados
          </button>
          
          <div className="flex flex-col md:flex-row gap-4 w-full md:w-auto">
            <button 
              type="submit"
              className="bg-white text-emerald-600 border border-emerald-100 px-12 py-5 rounded-3xl font-black hover:bg-emerald-50 transition-all shadow-sm uppercase tracking-widest text-xs"
            >
              Salvar & Sincronizar Ficha
            </button>
          </div>
        </div>
      </form>
    </div>
  );
};
