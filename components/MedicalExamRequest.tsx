
import React, { useState } from 'react';
import { PatientData } from '../types';
import { motion } from 'motion/react';
import { FileText, Search, CheckCircle2, Download, Printer, Send, Sparkles, Cloud, FileDown, RefreshCw } from 'lucide-react';
import { speakText } from '../services/tts';

interface MedicalExamRequestProps {
  patientData: PatientData | null;
}

const LABORATORY_EXAMS = [
  "Hemograma Completo", "Glicemia de Jejum", "Hemoglobina Glicada", "Perfil Lipídico (Colesterol Total, HDL, LDL, VLDL, Triglicerídeos)",
  "Função Renal (Ureia e Creatinina)", "Função Hepática (TGO, TGP, GGT, Bilirrubinas, Fosfatase Alcalina)", "Eletrólitos (Sódio, Potássio, Cálcio, Magnésio)",
  "TSH e T4 Livre", "Vitamina D (25-OH)", "Vitamina B12 e Ácido Fólico", "Ferritina e Ferro Sérico", "PCR Ultrassensível",
  "Sumário de Urina (EAS)", "Urocultura com Antibiograma", "Parasitológico de Fezes", "Coagulograma"
];

const IMAGING_EXAMS = [
  "Radiografia de Tórax (PA e Perfil)", "Radiografia de Coluna (Cervical, Torácica, Lombar)", "Ultrassonografia de Abdome Total",
  "Ultrassonografia de Vias Urinárias", "Ultrassonografia de Tireoide", "Ecocardiograma Transtorácico", "Eletrocardiograma (ECG)",
  "Tomografia Computadorizada de Crânio", "Tomografia Computadorizada de Tórax", "Ressonância Magnética de Encéfalo",
  "Ressonância Magnética de Coluna", "Densitometria Óssea", "Mamografia Digital"
];

export const MedicalExamRequest: React.FC<MedicalExamRequestProps> = ({ patientData }) => {
  const [selectedExams, setSelectedExams] = useState<string[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [isGenerating, setIsGenerating] = useState(false);
  const [isSaving, setIsSaving] = useState<'pdf' | 'word' | 'cloud' | null>(null);

  const toggleExam = (exam: string) => {
    setSelectedExams(prev => 
      prev.includes(exam) ? prev.filter(e => e !== exam) : [...prev, exam]
    );
  };

  const handleAISuggestions = () => {
    if (!patientData) return;
    setIsGenerating(true);
    // Simulating AI logic for exam suggestion based on complaints
    setTimeout(() => {
      const suggestions: string[] = [];
      if (patientData.complaints.toLowerCase().includes('dor') || patientData.complaints.toLowerCase().includes('inflamação')) {
        suggestions.push("PCR Ultrassensível", "Hemograma Completo");
      }
      if (patientData.complaints.toLowerCase().includes('cansaço') || patientData.complaints.toLowerCase().includes('fadiga')) {
        suggestions.push("Vitamina D (25-OH)", "Ferritina e Ferro Sérico", "TSH e T4 Livre");
      }
      if (patientData.complaints.toLowerCase().includes('estômago') || patientData.complaints.toLowerCase().includes('barriga')) {
        suggestions.push("Ultrassonografia de Abdome Total", "Parasitológico de Fezes");
      }
      
      setSelectedExams(prev => Array.from(new Set([...prev, ...suggestions])));
      setIsGenerating(false);
    }, 1500);
  };

  const handleSave = (type: 'pdf' | 'word' | 'cloud') => {
    setIsSaving(type);
    const messages = {
      pdf: "Gerando guia de requisição em PDF...",
      word: "Exportando pedido de exames para Word...",
      cloud: "Sincronizando requisição com a nuvem NSO..."
    };
    speakText(messages[type]);
    setTimeout(() => {
      setIsSaving(null);
      speakText(`${type.toUpperCase()} salvo com sucesso.`);
    }, 2000);
  };

  const filteredLab = LABORATORY_EXAMS.filter(e => e.toLowerCase().includes(searchTerm.toLowerCase()));
  const filteredImg = IMAGING_EXAMS.filter(e => e.toLowerCase().includes(searchTerm.toLowerCase()));

  if (!patientData) {
    return (
      <div className="h-[60vh] flex flex-col items-center justify-center text-center p-10 bg-white rounded-[3rem] border border-slate-100 shadow-sm">
        <div className="text-6xl mb-6">📋</div>
        <h3 className="text-xl font-black text-slate-800 uppercase tracking-tight">Paciente não selecionado</h3>
        <p className="text-slate-500 max-w-xs mt-2">Selecione um paciente para emitir pedidos de exames.</p>
      </div>
    );
  }

  return (
    <div className="space-y-8 animate-fadeIn pb-20">
      <header className="flex flex-col md:flex-row justify-between items-start md:items-end gap-6">
        <div>
          <h2 className="text-3xl font-black text-slate-900 tracking-tighter uppercase italic">Requisição de Exames</h2>
          <p className="text-slate-500 font-medium italic">Emissão de pedidos laboratoriais e de imagem com suporte de IA.</p>
        </div>
        <div className="flex gap-3">
          <button 
            onClick={handleAISuggestions}
            disabled={isGenerating}
            className="bg-emerald-100 text-emerald-700 px-6 py-3 rounded-2xl font-black text-[10px] uppercase tracking-widest flex items-center gap-2 hover:bg-emerald-200 transition-all disabled:opacity-50"
          >
            <Sparkles size={14} className={isGenerating ? 'animate-spin' : ''} />
            {isGenerating ? 'Analisando...' : 'Sugestão IA'}
          </button>
        </div>
      </header>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
        <div className="lg:col-span-8 space-y-6">
          <div className="bg-white p-6 rounded-[2.5rem] shadow-sm border border-slate-100 space-y-6">
            <div className="relative">
              <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
              <input 
                type="text" 
                placeholder="Buscar exame..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-12 pr-6 py-4 bg-slate-50 rounded-2xl border border-slate-100 font-medium outline-none focus:ring-4 focus:ring-emerald-500/10 transition-all text-sm"
              />
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
              <div className="space-y-4">
                <h4 className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] border-b pb-2">Exames Laboratoriais</h4>
                <div className="space-y-2 max-h-[400px] overflow-y-auto pr-2 custom-scrollbar">
                  {filteredLab.map(exam => (
                    <button 
                      key={exam}
                      onClick={() => toggleExam(exam)}
                      className={`w-full text-left p-4 rounded-xl text-xs font-bold transition-all flex justify-between items-center ${selectedExams.includes(exam) ? 'bg-emerald-600 text-white shadow-lg' : 'bg-slate-50 text-slate-600 hover:bg-slate-100'}`}
                    >
                      {exam}
                      {selectedExams.includes(exam) && <CheckCircle2 size={14} />}
                    </button>
                  ))}
                </div>
              </div>

              <div className="space-y-4">
                <h4 className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] border-b pb-2">Exames de Imagem</h4>
                <div className="space-y-2 max-h-[400px] overflow-y-auto pr-2 custom-scrollbar">
                  {filteredImg.map(exam => (
                    <button 
                      key={exam}
                      onClick={() => toggleExam(exam)}
                      className={`w-full text-left p-4 rounded-xl text-xs font-bold transition-all flex justify-between items-center ${selectedExams.includes(exam) ? 'bg-blue-600 text-white shadow-lg' : 'bg-slate-50 text-slate-600 hover:bg-slate-100'}`}
                    >
                      {exam}
                      {selectedExams.includes(exam) && <CheckCircle2 size={14} />}
                    </button>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </div>

        <div className="lg:col-span-4 space-y-6">
          <div className="bg-slate-900 text-white p-8 rounded-[3rem] shadow-2xl space-y-6 relative overflow-hidden">
            <div className="relative z-10">
              <div className="flex items-center gap-4 mb-6">
                <div className="w-12 h-12 bg-emerald-500 text-slate-900 rounded-2xl flex items-center justify-center text-xl">📄</div>
                <div>
                  <h4 className="font-black uppercase tracking-tight">Resumo do Pedido</h4>
                  <p className="text-emerald-400 text-[10px] font-bold uppercase tracking-widest">{patientData.name}</p>
                </div>
              </div>

              <div className="space-y-3 max-h-[300px] overflow-y-auto pr-2 custom-scrollbar mb-8">
                {selectedExams.length === 0 ? (
                  <p className="text-center py-10 text-[10px] font-black text-slate-500 uppercase tracking-widest">Nenhum exame selecionado</p>
                ) : (
                  selectedExams.map(exam => (
                    <div key={exam} className="flex items-center justify-between bg-white/5 p-3 rounded-xl border border-white/10">
                      <span className="text-[10px] font-bold uppercase">{exam}</span>
                      <button onClick={() => toggleExam(exam)} className="text-red-400 hover:text-red-300">✕</button>
                    </div>
                  ))
                )}
              </div>

              <div className="grid grid-cols-2 gap-3">
                <button 
                  disabled={selectedExams.length === 0}
                  className="bg-white text-slate-900 py-4 rounded-2xl font-black text-[10px] uppercase tracking-widest flex items-center justify-center gap-2 disabled:opacity-30"
                >
                  <Printer size={14} /> Imprimir
                </button>
                <button 
                  disabled={selectedExams.length === 0}
                  className="bg-emerald-500 text-white py-4 rounded-2xl font-black text-[10px] uppercase tracking-widest flex items-center justify-center gap-2 disabled:opacity-30"
                >
                  <Send size={14} /> Enviar
                </button>
              </div>

              {/* New Save Actions */}
              <div className="grid grid-cols-3 gap-2 mt-4 pt-4 border-t border-white/10">
                <button 
                  onClick={() => handleSave('pdf')}
                  disabled={selectedExams.length === 0 || !!isSaving}
                  className="bg-white/10 hover:bg-white/20 text-white py-3 rounded-xl flex flex-col items-center justify-center gap-1 transition-all disabled:opacity-20"
                >
                  {isSaving === 'pdf' ? <RefreshCw size={12} className="animate-spin" /> : <FileDown size={14} className="text-emerald-400" />}
                  <span className="text-[8px] font-black uppercase">PDF</span>
                </button>
                <button 
                  onClick={() => handleSave('word')}
                  disabled={selectedExams.length === 0 || !!isSaving}
                  className="bg-white/10 hover:bg-white/20 text-white py-3 rounded-xl flex flex-col items-center justify-center gap-1 transition-all disabled:opacity-20"
                >
                  {isSaving === 'word' ? <RefreshCw size={12} className="animate-spin" /> : <FileText size={14} className="text-blue-400" />}
                  <span className="text-[8px] font-black uppercase">Word</span>
                </button>
                <button 
                  onClick={() => handleSave('cloud')}
                  disabled={selectedExams.length === 0 || !!isSaving}
                  className="bg-white/10 hover:bg-white/20 text-white py-3 rounded-xl flex flex-col items-center justify-center gap-1 transition-all disabled:opacity-20"
                >
                  {isSaving === 'cloud' ? <RefreshCw size={12} className="animate-spin" /> : <Cloud size={14} className="text-amber-400" />}
                  <span className="text-[8px] font-black uppercase">Nuvem</span>
                </button>
              </div>
            </div>
            <div className="absolute -right-4 -bottom-4 opacity-10 text-8xl">🏥</div>
          </div>

          <div className="bg-white p-6 rounded-[2.5rem] border border-slate-100 shadow-sm">
            <h5 className="text-[9px] font-black text-slate-400 uppercase tracking-widest mb-4">Informações do Paciente</h5>
            <div className="space-y-3">
              <div className="flex justify-between text-xs">
                <span className="text-slate-400">Idade:</span>
                <span className="font-bold text-slate-700">{patientData.age} anos</span>
              </div>
              <div className="flex justify-between text-xs">
                <span className="text-slate-400">Queixa:</span>
                <span className="font-bold text-slate-700 text-right max-w-[150px] truncate">{patientData.complaints}</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
