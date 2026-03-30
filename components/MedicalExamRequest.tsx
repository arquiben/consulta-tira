
import React, { useState } from 'react';
import { PatientData, ExamRequest } from '../types';
import { motion, AnimatePresence } from 'motion/react';
import { 
  FileText, Search, CheckCircle2, Download, Printer, 
  Sparkles, Cloud, FileDown, RefreshCw, Share2, 
  History, Trash2, ExternalLink
} from 'lucide-react';
import { speakText } from '../services/tts';
import { useStore } from '../store/useStore';
import { generateExamPDF, generateExamWord } from '../services/documentService';
import { translations } from '../translations';

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
  const { savePatient, clinicSettings } = useStore();
  const language = clinicSettings.language;
  const t = translations[language];
  const [selectedExams, setSelectedExams] = useState<string[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [isGenerating, setIsGenerating] = useState(false);
  const [isSaving, setIsSaving] = useState<'pdf' | 'word' | 'cloud' | 'print' | 'send' | null>(null);
  const [showHistory, setShowHistory] = useState(false);

  const toggleExam = (exam: string) => {
    setSelectedExams(prev => 
      prev.includes(exam) ? prev.filter(e => e !== exam) : [...prev, exam]
    );
  };

  const handleAISuggestions = () => {
    if (!patientData) return;
    setIsGenerating(true);
    speakText(t.analyzingQueues, t.ttsInstruction);
    
    setTimeout(() => {
      const suggestions: string[] = [];
      const complaints = patientData.complaints.toLowerCase();
      
      if (complaints.includes('dor') || complaints.includes('inflamação')) {
        suggestions.push("PCR Ultrassensível", "Hemograma Completo");
      }
      if (complaints.includes('cansaço') || complaints.includes('fadiga') || complaints.includes('sono')) {
        suggestions.push("Vitamina D (25-OH)", "Ferritina e Ferro Sérico", "TSH e T4 Livre", "Vitamina B12 e Ácido Fólico");
      }
      if (complaints.includes('estômago') || complaints.includes('barriga') || complaints.includes('digestão')) {
        suggestions.push("Ultrassonografia de Abdome Total", "Parasitológico de Fezes", "Glicemia de Jejum");
      }
      if (complaints.includes('coração') || complaints.includes('peito') || complaints.includes('palpitação')) {
        suggestions.push("Eletrocardiograma (ECG)", "Ecocardiograma Transtorácico", "Perfil Lipídico (Colesterol Total, HDL, LDL, VLDL, Triglicerídeos)");
      }
      
      setSelectedExams(prev => Array.from(new Set([...prev, ...suggestions])));
      setIsGenerating(false);
      speakText(t.examSuggestionsGenerated, t.ttsInstruction);
    }, 1500);
  };

  const handleSaveToCloud = () => {
    if (!patientData || selectedExams.length === 0) return;
    
    setIsSaving('cloud');
    speakText(t.syncingRequest, t.ttsInstruction);

    const newRequest: ExamRequest = {
      id: crypto.randomUUID(),
      date: new Date().toISOString(),
      exams: [...selectedExams]
    };

    const updatedPatient: PatientData = {
      ...patientData,
      examRequests: [newRequest, ...(patientData.examRequests || [])]
    };

    setTimeout(() => {
      savePatient(updatedPatient);
      setIsSaving(null);
      speakText(t.requestSynced, t.ttsInstruction);
      setSelectedExams([]);
    }, 1500);
  };

  const handlePrint = () => {
    setIsSaving('print');
    speakText(t.preparingPrint, t.ttsInstruction);
    
    setTimeout(() => {
      window.print();
      setIsSaving(null);
    }, 1000);
  };

  const handleSend = async () => {
    if (selectedExams.length === 0) return;
    setIsSaving('send');
    speakText(t.startingSharing, t.ttsInstruction);

    const text = `${t.medicalExamRequestTitle} - ${t.patientInfo}: ${patientData?.name}\n\n${t.examsRequested}:\n${selectedExams.map(e => `- ${e}`).join('\n')}\n\nEmitido via CONSULFISION NSO.`;

    if (navigator.share) {
      try {
        await navigator.share({
          title: t.medicalExamRequestTitle,
          text: text,
        });
        speakText(t.sharingCompleted, t.ttsInstruction);
      } catch (err) {
        if ((err as any).name !== 'AbortError') {
          console.error('Error sharing:', err);
          // Fallback
          const url = `https://wa.me/?text=${encodeURIComponent(text)}`;
          window.open(url, '_blank');
        }
      }
    } else {
      // Fallback to WhatsApp
      const url = `https://wa.me/?text=${encodeURIComponent(text)}`;
      window.open(url, '_blank');
      speakText(t.redirectingWhatsApp, t.ttsInstruction);
    }
    
    setIsSaving(null);
  };

  const handleSaveLocal = async (type: 'pdf' | 'word') => {
    if (!patientData || selectedExams.length === 0) return;
    
    setIsSaving(type);
    const messages = {
      pdf: t.savePdf,
      word: t.saveWord
    };
    speakText(messages[type], t.ttsInstruction);
    
    try {
      if (type === 'pdf') {
        generateExamPDF(patientData, selectedExams);
      } else {
        await generateExamWord(patientData, selectedExams);
      }
      
      setIsSaving(null);
      speakText(`${type.toUpperCase()} ${t.examGenerated}`, t.ttsInstruction);
    } catch (error) {
      console.error(`Error generating ${type}:`, error);
      setIsSaving(null);
      speakText(`${t.examGenerationError} ${type.toUpperCase()}.`, t.ttsInstruction);
    }
  };

  const deleteRequest = (id: string) => {
    if (!patientData) return;
    const updatedPatient: PatientData = {
      ...patientData,
      examRequests: (patientData.examRequests || []).filter(r => r.id !== id)
    };
    savePatient(updatedPatient);
    speakText(t.requestRemoved, t.ttsInstruction);
  };

  const filteredLab = LABORATORY_EXAMS.filter(e => e.toLowerCase().includes(searchTerm.toLowerCase()));
  const filteredImg = IMAGING_EXAMS.filter(e => e.toLowerCase().includes(searchTerm.toLowerCase()));

  if (!patientData) {
    return (
      <div className="h-[60vh] flex flex-col items-center justify-center text-center p-10 bg-white rounded-[3rem] border border-slate-100 shadow-sm">
        <div className="text-6xl mb-6">📋</div>
        <h3 className="text-xl font-black text-slate-800 uppercase tracking-tight">{t.patientNotSelected}</h3>
        <p className="text-slate-500 max-w-xs mt-2">{t.selectPatientToEmit}</p>
      </div>
    );
  }

  return (
    <div className="space-y-8 animate-fadeIn pb-20">
      <header className="flex flex-col md:flex-row justify-between items-start md:items-end gap-6">
        <div>
          <h2 className="text-3xl font-black text-slate-900 tracking-tighter uppercase italic">{t.medicalExamRequestTitle}</h2>
          <p className="text-slate-500 font-medium italic">{t.medicalExamRequestSubtitle}</p>
        </div>
        <div className="flex gap-3">
          <button 
            onClick={() => setShowHistory(!showHistory)}
            className={`px-6 py-3 rounded-2xl font-black text-[10px] uppercase tracking-widest flex items-center gap-2 transition-all ${showHistory ? 'bg-slate-900 text-white' : 'bg-white text-slate-600 border border-slate-200 hover:bg-slate-50'}`}
          >
            <History size={14} />
            {showHistory ? t.newRequest : t.history}
          </button>
          <button 
            onClick={handleAISuggestions}
            disabled={isGenerating}
            className="bg-emerald-100 text-emerald-700 px-6 py-3 rounded-2xl font-black text-[10px] uppercase tracking-widest flex items-center gap-2 hover:bg-emerald-200 transition-all disabled:opacity-50"
          >
            <Sparkles size={14} className={isGenerating ? 'animate-spin' : ''} />
            {isGenerating ? t.analyzing : t.aiSuggestion}
          </button>
        </div>
      </header>

      <AnimatePresence mode="wait">
        {showHistory ? (
          <motion.div 
            key="history"
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -20 }}
            className="bg-white p-8 rounded-[3rem] shadow-sm border border-slate-100 space-y-6"
          >
            <div className="flex items-center gap-4 border-b pb-6">
              <div className="w-12 h-12 bg-slate-100 text-slate-600 rounded-2xl flex items-center justify-center text-xl">📜</div>
              <div>
                <h3 className="text-xl font-black uppercase tracking-tight">{t.examHistory}</h3>
                <p className="text-slate-400 text-[10px] font-bold uppercase tracking-widest">{patientData.name}</p>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {(!patientData.examRequests || patientData.examRequests.length === 0) ? (
                <div className="col-span-full py-20 text-center space-y-4 opacity-50">
                  <FileText size={48} className="mx-auto text-slate-300" />
                  <p className="text-xs font-black uppercase tracking-widest">{t.noPreviousRequests}</p>
                </div>
              ) : (
                patientData.examRequests.map(request => (
                  <div key={request.id} className="bg-slate-50 p-6 rounded-3xl border border-slate-100 space-y-4 hover:border-emerald-200 transition-all group">
                    <div className="flex justify-between items-start">
                      <div className="space-y-1">
                        <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">
                          {new Date(request.date).toLocaleDateString(language === 'pt' ? 'pt-BR' : 'en-US')} às {new Date(request.date).toLocaleTimeString(language === 'pt' ? 'pt-BR' : 'en-US', { hour: '2-digit', minute: '2-digit' })}
                        </p>
                        <p className="text-xs font-black text-slate-900 uppercase">{request.exams.length} {t.examsRequested}</p>
                      </div>
                      <button 
                        onClick={() => deleteRequest(request.id)}
                        className="p-2 text-slate-300 hover:text-red-500 transition-colors"
                      >
                        <Trash2 size={14} />
                      </button>
                    </div>
                    
                    <div className="space-y-1">
                      {request.exams.slice(0, 3).map(exam => (
                        <div key={exam} className="flex items-center gap-2 text-[9px] font-bold text-slate-500 uppercase">
                          <div className="w-1 h-1 bg-emerald-500 rounded-full"></div>
                          {exam}
                        </div>
                      ))}
                      {request.exams.length > 3 && (
                        <p className="text-[9px] font-black text-emerald-600 uppercase">+{request.exams.length - 3} outros</p>
                      )}
                    </div>

                    <div className="pt-4 flex gap-2">
                      <button 
                        onClick={() => { setSelectedExams(request.exams); setShowHistory(false); }}
                        className="flex-1 bg-white border border-slate-200 text-slate-600 py-2 rounded-xl text-[8px] font-black uppercase tracking-widest hover:bg-slate-50 transition-all flex items-center justify-center gap-2"
                      >
                        <RefreshCw size={10} /> {t.reuse}
                      </button>
                      <button 
                        onClick={() => generateExamPDF(patientData, request.exams)}
                        className="p-2 bg-emerald-600 text-white rounded-xl hover:bg-emerald-700 transition-all"
                        title={t.downloadPdf}
                      >
                        <Download size={12} />
                      </button>
                    </div>
                  </div>
                ))
              )}
            </div>
          </motion.div>
        ) : (
          <motion.div 
            key="new"
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: 20 }}
            className="grid grid-cols-1 lg:grid-cols-12 gap-8"
          >
            <div className="lg:col-span-8 space-y-6">
          <div className="bg-white p-6 rounded-[2.5rem] shadow-sm border border-slate-100 space-y-6">
            <div className="relative">
              <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
              <input 
                type="text" 
                placeholder={t.searchExam}
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-12 pr-6 py-4 bg-slate-50 rounded-2xl border border-slate-100 font-medium outline-none focus:ring-4 focus:ring-emerald-500/10 transition-all text-sm"
              />
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
              <div className="space-y-4">
                <h4 className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] border-b pb-2">{t.laboratoryExams}</h4>
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
                <h4 className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] border-b pb-2">{t.imagingExams}</h4>
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
                  <h4 className="font-black uppercase tracking-tight">{t.orderSummary}</h4>
                  <p className="text-emerald-400 text-[10px] font-bold uppercase tracking-widest">{patientData.name}</p>
                </div>
              </div>

              <div className="space-y-3 max-h-[300px] overflow-y-auto pr-2 custom-scrollbar mb-8">
                {selectedExams.length === 0 ? (
                  <p className="text-center py-10 text-[10px] font-black text-slate-500 uppercase tracking-widest">{t.noExamSelected}</p>
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
                  onClick={handlePrint}
                  disabled={selectedExams.length === 0 || !!isSaving}
                  className={`bg-white text-slate-900 py-4 rounded-2xl font-black text-[10px] uppercase tracking-widest flex items-center justify-center gap-2 disabled:opacity-30 transition-all ${isSaving === 'print' ? 'animate-pulse ring-2 ring-white' : ''}`}
                >
                  {isSaving === 'print' ? <RefreshCw size={14} className="animate-spin" /> : <Printer size={14} />} 
                  {isSaving === 'print' ? t.printing : t.print}
                </button>
                <button 
                  onClick={handleSend}
                  disabled={selectedExams.length === 0 || !!isSaving}
                  className={`bg-emerald-500 text-white py-4 rounded-2xl font-black text-[10px] uppercase tracking-widest flex items-center justify-center gap-2 disabled:opacity-30 transition-all ${isSaving === 'send' ? 'animate-pulse ring-2 ring-emerald-400' : ''}`}
                >
                  {isSaving === 'send' ? <RefreshCw size={14} className="animate-spin" /> : <Share2 size={14} />}
                  {isSaving === 'send' ? t.sending : t.send}
                </button>
              </div>

              {/* New Save Actions */}
              <div className="grid grid-cols-3 gap-2 mt-4 pt-4 border-t border-white/10">
                <button 
                  onClick={() => handleSaveLocal('pdf')}
                  disabled={selectedExams.length === 0 || !!isSaving}
                  className="bg-white/10 hover:bg-white/20 text-white py-3 rounded-xl flex flex-col items-center justify-center gap-1 transition-all disabled:opacity-20"
                >
                  {isSaving === 'pdf' ? <RefreshCw size={12} className="animate-spin" /> : <FileDown size={14} className="text-emerald-400" />}
                  <span className="text-[8px] font-black uppercase">PDF</span>
                </button>
                <button 
                  onClick={() => handleSaveLocal('word')}
                  disabled={selectedExams.length === 0 || !!isSaving}
                  className="bg-white/10 hover:bg-white/20 text-white py-3 rounded-xl flex flex-col items-center justify-center gap-1 transition-all disabled:opacity-20"
                >
                  {isSaving === 'word' ? <RefreshCw size={12} className="animate-spin" /> : <FileText size={14} className="text-blue-400" />}
                  <span className="text-[8px] font-black uppercase">Word</span>
                </button>
                <button 
                  onClick={handleSaveToCloud}
                  disabled={selectedExams.length === 0 || !!isSaving}
                  className="bg-white/10 hover:bg-white/20 text-white py-3 rounded-xl flex flex-col items-center justify-center gap-1 transition-all disabled:opacity-20"
                >
                  {isSaving === 'cloud' ? <RefreshCw size={12} className="animate-spin" /> : <Cloud size={14} className="text-amber-400" />}
                  <span className="text-[8px] font-black uppercase">{t.nsoCloud}</span>
                </button>
              </div>
            </div>
            <div className="absolute -right-4 -bottom-4 opacity-10 text-8xl">🏥</div>
          </div>

          <div className="bg-white p-6 rounded-[2.5rem] border border-slate-100 shadow-sm">
            <h5 className="text-[9px] font-black text-slate-400 uppercase tracking-widest mb-4">{t.patientInfo}</h5>
            <div className="space-y-3">
              <div className="flex justify-between text-xs">
                <span className="text-slate-400">{t.age}:</span>
                <span className="font-bold text-slate-700">{patientData.age} anos</span>
              </div>
              <div className="flex justify-between text-xs">
                <span className="text-slate-400">{t.mainComplaints}:</span>
                <span className="font-bold text-slate-700 text-right max-w-[150px] truncate">{patientData.complaints}</span>
              </div>
            </div>
          </div>
        </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};
