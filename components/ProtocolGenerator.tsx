
import React, { useState, useEffect, useRef } from 'react';
import { PatientData, AnalysisReport, Protocol } from '../types';
import { generateTherapyReport } from '../services/gemini';
import { speakText, narrateProtocol } from '../services/tts';
import { useStore } from '../store/useStore';
import { generateConsultationPDF, generateConsultationWord, generatePrescriptionPDF, generatePatientFolderZIP } from '../services/documentGenerator';
import { FileDown, FileText, Cloud, Printer, CheckCircle2, Play, Share2, FolderArchive } from 'lucide-react';

interface ProtocolGeneratorProps {
  patientData: PatientData | null;
  examData?: AnalysisReport | null;
  onReportGenerated?: (report: AnalysisReport) => void;
}

export const ProtocolGenerator: React.FC<ProtocolGeneratorProps> = ({ patientData, examData, onReportGenerated }) => {
  const [loading, setLoading] = useState(false);
  const [analyzingExams, setAnalyzingExams] = useState(false);
  const [report, setReport] = useState<AnalysisReport | null>(examData || null);
  const [isSpeaking, setIsSpeaking] = useState(false);
  const [isSaving, setIsSaving] = useState<'pdf' | 'word' | 'cloud' | 'zip' | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [showToast, setShowToast] = useState(false);
  const [toastMessage, setToastMessage] = useState('');
  const audioRef = useRef<{ source: AudioBufferSourceNode, audioCtx: AudioContext } | null>(null);
  
  const handleGenerate = async () => {
    if (!patientData) {
        setError("Nenhum paciente selecionado para análise.");
        return;
    }
    setLoading(true);
    setError(null);
    try {
      const prompt = "Gere uma análise de fusão Neuro-Quantum completa baseada nas queixas e marcadores anatômicos do paciente. Inclua protocolos detalhados de Biomagnetismo, Acupuntura, Fitoterapia, DIETA ENERGÉTICA NSO e HIDROTERAPIA NSO.";
      const response = await generateTherapyReport(prompt, undefined, patientData);
      setReport(response);
      if (onReportGenerated) onReportGenerated(response);
      console.log("Protocolo gerado e enviado para processamento central.");
    } catch (err: any) {
      console.error(err);
      const errorMessage = err instanceof Error ? err.message : String(err);
      if (errorMessage.includes('GEMINI_API_KEY')) {
        setError(errorMessage);
      } else if (errorMessage.includes('403') || errorMessage.includes('API_KEY_INVALID')) {
        setError("Erro: Chave da API inválida ou sem permissão.");
      } else {
        setError(`Não foi possível gerar a inteligência clínica automática: ${errorMessage || 'Verifique a conexão.'}`);
      }
    } finally {
      setLoading(false);
    }
  };

  const handleAnalyzeExams = async () => {
    if (!patientData || !report) return;
    if ((!report.images || report.images.length === 0) && (!report.examResults || report.examResults.length === 0)) {
      setError("Anexe imagens de exames ou insira resultados para analisar.");
      return;
    }

    setAnalyzingExams(true);
    setError(null);
    try {
      const examResultsStr = report.examResults?.map(e => `${e.examName}: ${e.result} (${e.date})`).join(', ') || 'Nenhum resultado textual.';
      const prompt = `Realize uma reavaliação clínica profunda baseada nos NOVOS resultados de exames anexados. 
        Resultados textuais: ${examResultsStr}. 
        Analise as imagens de exames fornecidas para identificar patologias, confirmar diagnósticos e ajustar a conduta terapêutica.
        Gere um novo laudo completo, atualizando diagnósticos, protocolos de Biomagnetismo, Acupuntura, Fitoterapia, Receituário e Dieta. 
        Sincronize as recomendações com o estado evolutivo do paciente.`;
      
      const response = await generateTherapyReport(prompt, report.images || [], patientData);
      
      // Merge with existing images and results if IA didn't return them
      const finalReport = {
        ...response,
        images: report.images,
        examResults: report.examResults
      };
      
      setReport(finalReport);
      if (onReportGenerated) onReportGenerated(finalReport);
      speakText("Análise de exames concluída. Novos protocolos gerados.");
    } catch (err: any) {
      console.error(err);
      const errorMessage = err instanceof Error ? err.message : String(err);
      if (errorMessage.includes('GEMINI_API_KEY')) {
        setError("Erro: Chave da API (GEMINI_API_KEY) não configurada. Se estiver no Netlify, adicione a variável de ambiente nas configurações do site (Site Configuration > Environment Variables).");
      } else if (errorMessage.includes('403') || errorMessage.includes('API_KEY_INVALID')) {
        setError("Erro: Chave da API inválida ou sem permissão. Verifique se a chave está correta no painel do Netlify.");
      } else if (errorMessage.includes('429') || errorMessage.includes('QUOTA_EXCEEDED')) {
        setError("Limite de uso atingido (Erro 429). No plano gratuito, o limite é baixo. Para resolver, aguarde alguns minutos ou configure uma chave de API própria no painel do Netlify.");
      } else {
        setError(`Erro ao analisar exames: ${errorMessage || 'Verifique a conexão.'}`);
      }
    } finally {
      setAnalyzingExams(false);
    }
  };

  const handleSpeak = async () => {
    if (isSpeaking) {
      audioRef.current?.source.stop();
      setIsSpeaking(false);
      return;
    }
    if (report?.summary) {
      const textToSpeak = `Relatório Consulfision para o paciente ${patientData?.name}. ${report.summary}. Foram identificados ${report.suggestedProtocols.length} protocolos de tratamento imediato.`;
      const result = await speakText(textToSpeak);
      if (result) {
        audioRef.current = result;
        setIsSpeaking(true);
        result.source.onended = () => setIsSpeaking(false);
      }
    }
  };

  const handleSave = async (type: 'pdf' | 'word' | 'cloud' | 'zip') => {
    if (!patientData || !report) return;
    
    setIsSaving(type);
    
    try {
      if (type === 'pdf') {
        await generateConsultationPDF(patientData, [], report);
        setToastMessage("PDF gerado com sucesso.");
      } else if (type === 'word') {
        await generateConsultationWord(patientData, [], report);
        setToastMessage("Documento Word gerado com sucesso.");
      } else if (type === 'zip') {
        await generatePatientFolderZIP(patientData, [], report);
        setToastMessage("Pasta do paciente gerada com sucesso.");
      } else {
        // Cloud save logic
        const { savePatient } = useStore.getState();
        
        // Remove existing report from history if it's an update
        const cleanHistory = (patientData.consultationHistory || []).filter(h => h.date !== report.date);
        
        const updatedPatient = {
          ...patientData,
          consultationHistory: [report, ...cleanHistory],
          nextRevaluation: report.revaluationDate || patientData.nextRevaluation
        };
        savePatient(updatedPatient);
        
        // Simulate delay for sync feedback
        await new Promise(resolve => setTimeout(resolve, 1000));
        setToastMessage("Consulta sincronizada com as nuvens.");
      }
      
      setShowToast(true);
      setTimeout(() => setShowToast(false), 3000);
      speakText(`${type.toUpperCase()} concluído.`);
    } catch (err) {
      console.error("Error saving document:", err);
      setToastMessage("Erro ao processar salvamento.");
      setShowToast(true);
      setTimeout(() => setShowToast(false), 3000);
    } finally {
      setIsSaving(null);
    }
  };

  const handlePrint = () => {
    window.print();
  };

  const handleShare = async () => {
    if (!patientData || !report) return;
    
    const { clinicSettings } = useStore.getState();
    const doctorName = clinicSettings.therapistName || 'Dr. Terapeuta';
    
    let shareText = `*CONSULFISION - RELATÓRIO CLÍNICO*\n\n`;
    if (patientData) {
      shareText += `*Paciente:* ${patientData?.name || 'Paciente'}\n`;
    }
    shareText += `*Profissional:* ${doctorName}\n`;
    shareText += `*Data:* ${new Date().toLocaleDateString('pt-BR')}\n\n`;
    
    shareText += `*RESUMO DA ANÁLISE:*\n${report.summary}\n\n`;
    
    if (report.suggestedProtocols && report.suggestedProtocols.length > 0) {
      shareText += `*PROTOCOLOS SUGERIDOS:*\n`;
      report.suggestedProtocols.forEach((p, i) => {
        shareText += `\n*${i + 1}. ${p.title.toUpperCase()}*\n`;
        if (p.prescriptions && p.prescriptions.length > 0) {
          shareText += `_Receituário (Planilha):_\n`;
          shareText += `\`\`\`\n`;
          shareText += `ITEM            | QTD | DOSAGEM\n`;
          shareText += `----------------|-----|---------\n`;
          p.prescriptions.forEach(item => {
            const name = item.name.padEnd(15).substring(0, 15);
            const qty = item.quantity.toString().padEnd(3).substring(0, 3);
            const dosage = item.dosage.padEnd(9).substring(0, 9);
            shareText += `${name} | ${qty} | ${dosage}\n`;
          });
          shareText += `\`\`\`\n`;
        }
        shareText += `\n`;
      });
    }
    
    if (report.revaluationDate) {
      shareText += `*PRÓXIMA REAVALIAÇÃO:* ${new Date(report.revaluationDate).toLocaleDateString('pt-BR')}\n`;
    }

    if (navigator.share) {
      try {
        await navigator.share({
          title: `Relatório Consulfision - ${patientData?.name || 'Paciente'}`,
          text: shareText,
        });
      } catch (err) {
        console.error('Error sharing:', err);
        // Fallback to WhatsApp if sharing fails or is cancelled
        const encodedText = encodeURIComponent(shareText);
        window.open(`https://wa.me/?text=${encodedText}`, '_blank');
      }
    } else {
      // Fallback to WhatsApp
      const encodedText = encodeURIComponent(shareText);
      window.open(`https://wa.me/?text=${encodedText}`, '_blank');
    }
  };

  const [newExam, setNewExam] = useState({ examName: '', result: '', date: new Date().toISOString().split('T')[0] });

  const handleImageUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onloadend = () => {
      const base64String = reader.result as string;
      const updatedReport: AnalysisReport = {
        ...report!,
        images: [...(report!.images || []), base64String]
      };
      setReport(updatedReport);
      if (onReportGenerated) onReportGenerated(updatedReport);
    };
    reader.readAsDataURL(file);
  };

  const handleRemoveImage = (index: number) => {
    const updatedImages = [...(report!.images || [])];
    updatedImages.splice(index, 1);
    const updatedReport = { ...report!, images: updatedImages };
    setReport(updatedReport);
    if (onReportGenerated) onReportGenerated(updatedReport);
  };

  const handleAddExam = () => {
    if (!newExam.examName || !newExam.result) return;
    const updatedReport: AnalysisReport = {
      ...report!,
      examResults: [...(report!.examResults || []), { ...newExam }]
    };
    setReport(updatedReport);
    setNewExam({ examName: '', result: '', date: new Date().toISOString().split('T')[0] });
    if (onReportGenerated) onReportGenerated(updatedReport);
  };

  const handleUpdateRevaluation = (date: string) => {
    const updatedReport = {
      ...report!,
      revaluationDate: date
    };
    setReport(updatedReport);
    if (onReportGenerated) onReportGenerated(updatedReport);
  };

  useEffect(() => {
    if (examData) {
      setReport(examData);
    }
  }, [examData]);

  // Automatic revaluation date calculation
  useEffect(() => {
    if (report && !report.revaluationDate && report.suggestedProtocols?.length > 0) {
      const maxDays = Math.max(...report.suggestedProtocols.map(p => p.revaluationDays || 0));
      if (maxDays > 0) {
        const date = new Date();
        date.setDate(date.getDate() + maxDays);
        const dateString = date.toISOString().split('T')[0];
        setReport({ ...report, revaluationDate: dateString });
      }
    }
  }, [report?.suggestedProtocols]);

  // Gatilho automático apenas se houver queixas e nenhum relatório atual
  useEffect(() => {
    if (patientData?.complaints && !report && !loading && !error) {
      handleGenerate();
    }
  }, [patientData]);

  if (loading) {
    return (
      <div className="h-[60vh] flex flex-col items-center justify-center space-y-12 animate-fadeIn">
        <div className="relative">
          <div className="w-40 h-40 border-[16px] border-slate-100 border-t-emerald-600 rounded-full animate-spin shadow-2xl"></div>
          <div className="absolute inset-0 flex items-center justify-center text-5xl">🧠</div>
        </div>
        <div className="text-center space-y-4">
          <h2 className="text-4xl font-black text-slate-900 uppercase tracking-tighter italic animate-pulse">Processando Bio-Ressonância</h2>
          <p className="text-slate-400 font-black uppercase tracking-[0.4em] text-[10px]">A IA NSOFISION está gerando protocolos personalizados agora...</p>
        </div>
      </div>
    );
  }

  if (!report) {
    return (
      <div className="h-[60vh] flex flex-col items-center justify-center text-center p-10 space-y-8 animate-fadeIn bg-white rounded-[3rem] border border-slate-100">
        <div className="w-24 h-24 bg-slate-50 rounded-full flex items-center justify-center text-5xl shadow-inner">📋</div>
        <div className="max-w-md space-y-4">
          <h3 className="text-2xl font-black text-slate-900 uppercase tracking-tight">Pronto para Análise</h3>
          <p className="text-slate-500 font-medium leading-relaxed">
            {patientData 
                ? `O paciente ${patientData?.name || 'selecionado'} está ativo, mas o protocolo ainda não foi gerado.` 
                : "Selecione um paciente ou preencha a ficha clínica para gerar o protocolo."}
          </p>
          {error && <p className="text-red-500 font-black text-[10px] uppercase tracking-widest bg-red-50 p-3 rounded-xl">{error}</p>}
        </div>
        {patientData && (
            <button 
                onClick={handleGenerate}
                className="bg-emerald-600 text-white px-12 py-5 rounded-2xl font-black uppercase tracking-widest shadow-2xl hover:bg-emerald-700 transition-all flex items-center gap-4"
            >
                <span>⚡</span> Gerar Protocolo Agora
            </button>
        )}
      </div>
    );
  }

  return (
    <div className="space-y-10 pb-32 animate-fadeIn max-w-6xl mx-auto">
      <header className="flex flex-col md:flex-row justify-between items-center gap-6 print:hidden">
        <div className="flex bg-emerald-50 p-3 rounded-[2rem] shadow-inner border border-emerald-100">
           <div className="px-8 py-3 bg-white text-emerald-900 rounded-2xl shadow-sm font-black text-xs uppercase tracking-widest border border-emerald-100 flex items-center gap-3">
             <span className="w-2 h-2 bg-emerald-500 rounded-full animate-ping"></span>
             Resultados Gerados com Precisão
           </div>
        </div>
        <div className="flex gap-4">
          <button 
            onClick={handleSpeak} 
            className={`px-10 py-5 rounded-[2rem] font-black text-xs uppercase tracking-widest shadow-2xl transition-all flex items-center gap-4 ${isSpeaking ? 'bg-red-500 text-white animate-pulse' : 'bg-blue-600 text-white hover:bg-blue-700'}`}
          >
            {isSpeaking ? '⏹️ Parar Voz' : '🔊 Ouvir Relatório'}
          </button>
          <button 
            onClick={() => window.print()} 
            className="bg-slate-950 text-white px-10 py-5 rounded-[2rem] font-black text-xs uppercase tracking-widest shadow-2xl hover:bg-emerald-600 transition-all flex items-center gap-3"
          >
             🖨️ Imprimir Laudo
          </button>
          <button 
            onClick={() => {
              // Simple way to print just the prescription: add a class to body, print, then remove
              const style = document.createElement('style');
              style.innerHTML = `@media print { body * { visibility: hidden; } .prescription-print-only, .prescription-print-only * { visibility: visible; } .prescription-print-only { position: absolute; left: 0; top: 0; width: 100%; } }`;
              document.head.appendChild(style);
              window.print();
              document.head.removeChild(style);
            }} 
            className="bg-rose-600 text-white px-10 py-5 rounded-[2rem] font-black text-xs uppercase tracking-widest shadow-2xl hover:bg-rose-700 transition-all flex items-center gap-3"
          >
             💊 Imprimir Receita
          </button>
        </div>
      </header>

      {/* Save Actions Bar */}
      <div className="flex flex-wrap gap-4 justify-center animate-fadeIn print:hidden">
        <button 
          onClick={() => handleSave('pdf')}
          disabled={!!isSaving}
          className="bg-white text-slate-900 px-8 py-4 rounded-2xl font-black text-[10px] uppercase tracking-widest shadow-xl hover:bg-emerald-50 transition-all flex items-center gap-3 border border-emerald-100"
        >
          {isSaving === 'pdf' ? <div className="w-4 h-4 border-2 border-emerald-600 border-t-transparent rounded-full animate-spin"></div> : <FileDown size={18} className="text-emerald-600" />}
          Salvar PDF
        </button>
        <button 
          onClick={() => handleSave('word')}
          disabled={!!isSaving}
          className="bg-white text-slate-900 px-8 py-4 rounded-2xl font-black text-[10px] uppercase tracking-widest shadow-xl hover:bg-blue-50 transition-all flex items-center gap-3 border border-blue-100"
        >
          {isSaving === 'word' ? <div className="w-4 h-4 border-2 border-blue-600 border-t-transparent rounded-full animate-spin"></div> : <FileText size={18} className="text-blue-600" />}
          Salvar Word
        </button>
        <button 
          onClick={() => handleSave('zip')}
          disabled={!!isSaving}
          className="bg-white text-slate-900 px-8 py-4 rounded-2xl font-black text-[10px] uppercase tracking-widest shadow-xl hover:bg-purple-50 transition-all flex items-center gap-3 border border-purple-100"
        >
          {isSaving === 'zip' ? <div className="w-4 h-4 border-2 border-purple-600 border-t-transparent rounded-full animate-spin"></div> : <FolderArchive size={18} className="text-purple-600" />}
          Baixar Pasta
        </button>
        <button 
          onClick={() => handleSave('cloud')}
          disabled={!!isSaving}
          className="bg-slate-900 text-white px-8 py-4 rounded-2xl font-black text-[10px] uppercase tracking-widest shadow-xl hover:bg-slate-800 transition-all flex items-center gap-3"
        >
          {isSaving === 'cloud' ? <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div> : <Cloud size={18} className="text-emerald-400" />}
          Nuvem NSO
        </button>
      </div>

      <div className="bg-white rounded-[4.5rem] shadow-2xl border border-slate-100 overflow-hidden print:shadow-none print:border-none print:m-0 print:p-0">
        <div className="bg-slate-950 p-14 text-white relative overflow-hidden print:bg-white print:text-slate-950 print:p-6 print:border-b-4 print:border-slate-100">
           <div className="relative z-10 flex flex-col md:flex-row justify-between items-start md:items-center gap-10">
              <div className="flex items-center gap-8">
                 <div className="w-24 h-24 bg-emerald-500 text-slate-950 rounded-[2.5rem] flex items-center justify-center text-5xl shadow-3xl print:shadow-none print:w-16 print:h-16 print:text-3xl">🧬</div>
                 <div>
                    <h1 className="text-4xl font-black tracking-tighter uppercase leading-none mb-2 print:text-2xl">Laudo Clínico Integrativo</h1>
                    <p className="text-emerald-400 text-xs font-black uppercase tracking-[0.4em] print:text-slate-500">NSOFISION AI • Quissambi Benvindo • Relatório Digital</p>
                 </div>
              </div>
              <div className="bg-white/5 p-6 rounded-[2rem] border border-white/10 text-center print:border-slate-200 print:text-slate-950">
                 <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">Nível de Atenção</p>
                 <p className={`text-xl font-black uppercase ${report.emergencyLevel === 'critical' ? 'text-red-500' : 'text-emerald-500'}`}>
                   {report.emergencyLevel?.toUpperCase() || 'NORMAL'}
                 </p>
              </div>
           </div>
           <div className="absolute top-0 right-0 w-96 h-96 bg-emerald-500/10 rounded-full blur-[120px] -mr-48 -mt-48 print:hidden"></div>
        </div>

        <div className="p-14 space-y-16 print:p-6">
           {/* Patient Info Card */}
           <div className="bg-slate-50 p-10 rounded-[3rem] border border-slate-100 grid grid-cols-1 md:grid-cols-4 gap-8 print:hidden">
              <div className="space-y-1">
                 <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Paciente</p>
                 <p className="text-xl font-black text-slate-900">{patientData?.name}</p>
              </div>
              <div className="space-y-1">
                 <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Idade / Gênero</p>
                 <p className="text-xl font-black text-slate-900">{patientData?.age} • {patientData?.gender}</p>
              </div>
              <div className="space-y-1">
                 <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Peso / Altura</p>
                 <p className="text-xl font-black text-slate-900">{patientData?.weight}kg • {patientData?.height}m</p>
              </div>
              <div className="space-y-1">
                 <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Sinais Vitais</p>
                 <p className="text-xl font-black text-emerald-600">{patientData?.bloodPressure} • {patientData?.glucose || '--'} mg/dL</p>
              </div>
           </div>

           {/* Patient Info for Print */}
           <div className="hidden print:block mb-10 border-b pb-8">
              <h3 className="text-xs font-black text-slate-400 uppercase tracking-widest mb-4">Informações do Registro</h3>
              <div className="grid grid-cols-3 gap-8">
                 <div><p className="text-[9px] font-bold text-slate-400 uppercase">Paciente</p><p className="font-black text-lg">{patientData?.name}</p></div>
                 <div><p className="text-[9px] font-bold text-slate-400 uppercase">Identificador</p><p className="font-mono font-bold">{patientData?.id}</p></div>
                 <div><p className="text-[9px] font-bold text-slate-400 uppercase">Data de Emissão</p><p className="font-black">{new Date().toLocaleDateString('pt-BR')}</p></div>
              </div>
           </div>

           <section className="relative">
              <div className="flex items-center gap-4 mb-8">
                 <h3 className="text-xs font-black text-slate-400 uppercase tracking-[0.3em]">01. Parecer da Inteligência Artificial</h3>
                 <div className="h-px bg-slate-100 flex-1"></div>
              </div>
              <div className="bg-slate-50 p-12 rounded-[3.5rem] relative border border-slate-100 print:bg-white print:border-none print:p-4">
                 <p className="text-slate-900 text-2xl font-medium leading-relaxed italic text-center px-10 print:text-lg print:px-0">
                   "{report.summary}"
                 </p>
              </div>
           </section>

           {report.diagnosedPathologies && report.diagnosedPathologies.length > 0 && (
             <section className="relative animate-slideUp">
               <div className="flex items-center gap-4 mb-8">
                 <h3 className="text-xs font-black text-red-800 uppercase tracking-[0.3em]">02. Diagnósticos Patológicos Identificados</h3>
                 <div className="h-px bg-red-50 flex-1"></div>
               </div>
               <div className="flex flex-wrap gap-3">
                 {report.diagnosedPathologies.map((pathology, idx) => (
                   <div key={idx} className="bg-red-50 text-red-700 px-6 py-3 rounded-2xl border border-red-100 font-black text-sm uppercase tracking-tight shadow-sm">
                     ⚠️ {pathology}
                   </div>
                 ))}
               </div>
             </section>
           )}

           <div className="space-y-12">
              {report.suggestedExams && report.suggestedExams.length > 0 && (
                <section className="relative animate-slideUp">
                  <div className="flex items-center gap-4 mb-8">
                    <h3 className="text-xs font-black text-amber-800 uppercase tracking-[0.3em]">02. Exames Recomendados</h3>
                    <div className="h-px bg-amber-50 flex-1"></div>
                  </div>
                  <div className="bg-amber-50 p-10 rounded-[3.5rem] border border-amber-100 space-y-6">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      {report.suggestedExams.map((exam, idx) => (
                        <div key={idx} className="bg-white p-5 rounded-2xl border border-amber-200 flex items-center gap-4 shadow-sm">
                          <div className="w-10 h-10 bg-amber-100 text-amber-600 rounded-xl flex items-center justify-center text-xl">📝</div>
                          <p className="font-black text-xs text-slate-900 uppercase tracking-tight">{exam}</p>
                        </div>
                      ))}
                    </div>
                    <div className="flex justify-end">
                      <button 
                        onClick={() => {
                          const { setView } = useStore.getState();
                          setView('exam_request');
                        }}
                        className="bg-amber-600 text-white px-8 py-4 rounded-2xl font-black text-[10px] uppercase tracking-widest shadow-xl hover:bg-amber-700 transition-all flex items-center gap-3"
                      >
                        <span>📋</span> Formalizar Pedido de Exames
                      </button>
                    </div>
                  </div>
                </section>
              )}
              {report.comparisonWithPrevious && (
                <section className="relative animate-slideUp">
                  <div className="flex items-center gap-4 mb-8">
                    <h3 className="text-xs font-black text-blue-800 uppercase tracking-[0.3em]">02. Análise de Evolução Clínica</h3>
                    <div className="h-px bg-blue-50 flex-1"></div>
                  </div>
                  <div className="bg-blue-50 p-10 rounded-[3.5rem] border border-blue-100 italic text-blue-900 text-xl font-medium leading-relaxed">
                    "{report.comparisonWithPrevious}"
                  </div>
                </section>
              )}

             <div className="flex items-center gap-4">
                <h3 className="text-xs font-black text-emerald-800 uppercase tracking-[0.3em]">03. Protocolos de Intervenção</h3>
                <div className="h-px bg-emerald-50 flex-1"></div>
             </div>
             
             {report.suggestedProtocols.map((p: Protocol, i: number) => (
               <section key={i} className="space-y-6 break-inside-avoid border-b border-slate-50 pb-12 last:border-0">
                  <div className="flex flex-col md:flex-row gap-6 md:items-center justify-between">
                     <div className="flex items-center gap-4">
                        <div className="w-12 h-12 bg-emerald-600 text-white rounded-2xl flex items-center justify-center font-black text-xl">{i + 1}</div>
                        <div>
                           <div className="flex items-center gap-3">
                              <h4 className="text-2xl font-black text-slate-950 uppercase tracking-tighter">{p.title}</h4>
                              <button 
                                onClick={() => narrateProtocol(p)}
                                className="w-8 h-8 bg-emerald-100 text-emerald-600 rounded-full flex items-center justify-center hover:bg-emerald-200 transition-all print:hidden"
                                title="Narrar Protocolo"
                              >
                                <Play size={14} fill="currentColor" />
                              </button>
                           </div>
                           <span className="bg-emerald-100 text-emerald-800 px-3 py-1 rounded-full text-[9px] font-black uppercase tracking-widest">{p.therapy}</span>
                        </div>
                     </div>
                     <div className="flex gap-4 text-center">
                        <div className="bg-slate-50 px-6 py-2 rounded-2xl border border-slate-100">
                           <p className="text-[8px] font-black text-slate-400 uppercase">Sessões</p>
                           <p className="font-black text-slate-900">{p.sessions}</p>
                        </div>
                        <div className="bg-slate-50 px-6 py-2 rounded-2xl border border-slate-100">
                           <p className="text-[8px] font-black text-slate-400 uppercase">Retorno</p>
                           <p className="font-black text-slate-900">{p.revaluationDays}d</p>
                        </div>
                     </div>
                  </div>

                  <div className="bg-white p-10 rounded-[3rem] border border-slate-100 shadow-sm print:p-4 print:border-none">
                     <p className="text-slate-600 mb-8 font-medium leading-relaxed italic text-lg">{p.instructions}</p>
                     
                     <div className="grid grid-cols-1 md:grid-cols-2 gap-10">
                        {p.steps && p.steps.length > 0 && (
                          <div className="space-y-4">
                             <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest flex items-center gap-2">
                                <span className="w-1.5 h-1.5 bg-emerald-500 rounded-full"></span>
                                Guia de Execução Clínica
                             </p>
                             <div className="space-y-3">
                                {p.steps.map((step, idx) => (
                                  <div key={idx} className="flex gap-4 items-start bg-slate-50 p-5 rounded-2xl border border-slate-100 transition-all hover:bg-white hover:shadow-md">
                                     <span className="w-6 h-6 bg-slate-950 text-white rounded-lg flex items-center justify-center text-[10px] font-black shrink-0">{idx+1}</span>
                                     <div className="space-y-1">
                                        <p className="font-black text-xs text-slate-900 uppercase tracking-tight">{step.action}</p>
                                        <p className="text-[10px] text-slate-500 leading-tight">{step.detail}</p>
                                     </div>
                                  </div>
                                ))}
                             </div>
                          </div>
                        )}

                        <div className="space-y-6">
                           {p.suggestedPhytotherapeutics && p.suggestedPhytotherapeutics.length > 0 && (
                             <div className="bg-emerald-50 p-8 rounded-[2.5rem] border border-emerald-100">
                                <p className="text-[9px] font-black text-emerald-800 uppercase tracking-widest mb-4">Apoio Fitoterápico</p>
                                <div className="flex flex-wrap gap-2">
                                   {p.suggestedPhytotherapeutics.map((item, idx) => (
                                      <span key={idx} className="bg-white px-4 py-2 rounded-xl text-[10px] font-black text-emerald-700 border border-emerald-100 uppercase shadow-sm">{item}</span>
                                   ))}
                                </div>
                             </div>
                           )}

                           {p.suggestedSupplements && p.suggestedSupplements.length > 0 && (
                             <div className="bg-amber-50 p-8 rounded-[2.5rem] border border-amber-100">
                                <p className="text-[9px] font-black text-amber-800 uppercase tracking-widest mb-4">Suplementação (Vitaminas & Minerais)</p>
                                <div className="flex flex-wrap gap-2">
                                   {p.suggestedSupplements.map((item, idx) => (
                                      <span key={idx} className="bg-white px-4 py-2 rounded-xl text-[10px] font-black text-amber-700 border border-amber-100 uppercase shadow-sm">{item}</span>
                                   ))}
                                </div>
                             </div>
                           )}

                           {p.dietaryPlan && p.dietaryPlan.length > 0 && (
                             <div className="bg-indigo-50 p-8 rounded-[2.5rem] border border-indigo-100">
                                <p className="text-[9px] font-black text-indigo-800 uppercase tracking-widest mb-4">Plano Alimentar (Oncológico/Energético)</p>
                                <div className="space-y-2">
                                   {p.dietaryPlan.map((item, idx) => (
                                      <div key={idx} className="bg-white p-3 rounded-xl text-[10px] font-bold text-indigo-900 border border-indigo-100 flex items-center gap-3">
                                         <span className="w-1.5 h-1.5 bg-indigo-500 rounded-full"></span>
                                         {item}
                                      </div>
                                   ))}
                                </div>
                             </div>
                           )}

                           {p.prescriptions && p.prescriptions.length > 0 && (
                             <div className="bg-rose-50 p-8 rounded-[2.5rem] border border-rose-100 prescription-print-only">
                                <div className="hidden print:block mb-6 border-b-2 border-rose-200 pb-4">
                                   <h2 className="text-2xl font-black text-rose-900 uppercase">Receituário Clínico</h2>
                                   <div className="flex justify-between text-[10px] font-bold text-slate-500 mt-2">
                                      <span>Paciente: {patientData?.name}</span>
                                      <span>Data: {new Date().toLocaleDateString('pt-BR')}</span>
                                   </div>
                                </div>
                                <div className="flex justify-between items-center mb-4 print:hidden">
                                   <p className="text-[9px] font-black text-rose-800 uppercase tracking-widest">Receituário Detalhado</p>
                                   <button 
                                     onClick={() => {
                              if (patientData) {
                                generatePrescriptionPDF(patientData, p);
                              }
                            }}
                                     className="bg-rose-600 text-white px-3 py-1.5 rounded-lg font-black text-[8px] uppercase tracking-widest flex items-center gap-2 hover:bg-rose-700 transition-all shadow-md"
                                   >
                                     <FileDown size={12} />
                                     Gerar Receituário PDF
                                   </button>
                                </div>
                                <div className="space-y-3">
                                   {p.prescriptions.map((item, idx) => (
                                      <div key={idx} className="bg-white p-4 rounded-xl border border-rose-100 shadow-sm">
                                         <div className="flex justify-between items-start mb-2">
                                            <p className="font-black text-sm text-rose-900 uppercase">{item.name}</p>
                                            <span className="bg-rose-100 text-rose-700 px-2 py-0.5 rounded text-[8px] font-black uppercase">{item.days} Dias</span>
                                         </div>
                                         <div className="grid grid-cols-2 gap-4 text-[10px]">
                                            <div>
                                               <p className="text-slate-400 font-bold uppercase">Quantidade</p>
                                               <p className="font-black text-slate-700">{item.quantity}</p>
                                            </div>
                                            <div>
                                               <p className="text-slate-400 font-bold uppercase">Posologia</p>
                                               <p className="font-black text-slate-700">{item.dosage}</p>
                                            </div>
                                         </div>
                                      </div>
                                   ))}
                                </div>
                             </div>
                           )}

                           {p.suggestedPharmaceuticals && p.suggestedPharmaceuticals.length > 0 && !p.prescriptions && (
                             <div className="bg-rose-50 p-8 rounded-[2.5rem] border border-rose-100">
                                <p className="text-[9px] font-black text-rose-800 uppercase tracking-widest mb-4">Orientação Farmacológica (Receita)</p>
                                <div className="flex flex-wrap gap-2">
                                   {p.suggestedPharmaceuticals.map((item, idx) => (
                                      <span key={idx} className="bg-white px-4 py-2 rounded-xl text-[10px] font-black text-rose-700 border border-rose-100 uppercase shadow-sm">{item}</span>
                                   ))}
                                </div>
                             </div>
                           )}

                           {p.frequencies && p.frequencies.length > 0 && (
                             <div className="bg-blue-50 p-8 rounded-[2.5rem] border border-blue-100">
                                <p className="text-[9px] font-black text-blue-800 uppercase tracking-widest mb-4">Frequências Vibracionais (Hz)</p>
                                <div className="flex flex-wrap gap-2">
                                   {p.frequencies.map((f, idx) => (
                                      <span key={idx} className="bg-white px-4 py-2 rounded-xl text-[10px] font-black text-blue-700 border border-blue-100 uppercase shadow-sm">{f}</span>
                                   ))}
                                </div>
                             </div>
                           )}
                        </div>
                     </div>
                  </div>
               </section>
             ))}
           </div>

            {/* Clinical Follow-up Section */}
            <section className="relative animate-slideUp print:hidden">
              <div className="flex items-center gap-4 mb-8">
                <h3 className="text-xs font-black text-slate-400 uppercase tracking-[0.3em]">04. Acompanhamento & Reavaliação</h3>
                <div className="h-px bg-slate-100 flex-1"></div>
              </div>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-10">
                {/* Exam Results Input */}
                <div className="bg-white p-10 rounded-[3rem] border border-slate-100 shadow-sm space-y-6">
                  <h4 className="text-lg font-black text-slate-900 uppercase tracking-tight flex items-center gap-3">
                    <span>🧪</span> Inserir Resultados de Exames
                  </h4>
                  
                  <div className="space-y-4">
                    <div className="grid grid-cols-2 gap-4">
                      <input 
                        type="text" 
                        placeholder="Nome do Exame"
                        value={newExam.examName}
                        onChange={(e) => setNewExam({...newExam, examName: e.target.value})}
                        className="bg-slate-50 p-4 rounded-xl border border-slate-100 text-xs font-bold"
                      />
                      <input 
                        type="text" 
                        placeholder="Valor/Resultado"
                        value={newExam.result}
                        onChange={(e) => setNewExam({...newExam, result: e.target.value})}
                        className="bg-slate-50 p-4 rounded-xl border border-slate-100 text-xs font-bold"
                      />
                    </div>
                    <div className="flex gap-4">
                      <input 
                        type="date" 
                        value={newExam.date}
                        onChange={(e) => setNewExam({...newExam, date: e.target.value})}
                        className="bg-slate-50 p-4 rounded-xl border border-slate-100 text-xs font-bold flex-1"
                      />
                      <button 
                        onClick={handleAddExam}
                        className="bg-emerald-600 text-white px-6 py-4 rounded-xl font-black text-[10px] uppercase tracking-widest shadow-lg hover:bg-emerald-700 transition-all"
                      >
                        Adicionar
                      </button>
                    </div>

                    <div className="pt-4 border-t border-slate-50 space-y-4">
                      <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-3">Anexar Imagem (Galeria ou Foto)</p>
                      <div className="flex flex-wrap gap-3">
                        <label className="w-20 h-20 bg-slate-50 border-2 border-dashed border-slate-200 rounded-2xl flex flex-col items-center justify-center cursor-pointer hover:bg-emerald-50 hover:border-emerald-200 transition-all">
                          <span className="text-2xl">📸</span>
                          <span className="text-[8px] font-black uppercase text-slate-400">Upload</span>
                          <input type="file" accept="image/*" className="hidden" onChange={handleImageUpload} />
                        </label>
                        
                        {report.images?.map((img, idx) => (
                          <div key={idx} className="relative w-20 h-20 group">
                            <img src={img} alt={`Anexo ${idx}`} className="w-full h-full object-cover rounded-2xl border border-slate-100 shadow-sm" />
                            <button 
                              onClick={() => handleRemoveImage(idx)}
                              className="absolute -top-2 -right-2 bg-red-500 text-white w-6 h-6 rounded-full flex items-center justify-center text-xs opacity-0 group-hover:opacity-100 transition-opacity shadow-lg"
                            >
                              ✕
                            </button>
                          </div>
                        ))}
                      </div>

                      <button 
                        onClick={handleAnalyzeExams}
                        disabled={analyzingExams}
                        className="w-full bg-emerald-600 text-white py-4 rounded-2xl font-black text-xs uppercase tracking-widest shadow-xl hover:bg-emerald-700 transition-all flex items-center justify-center gap-3 disabled:opacity-50"
                      >
                        {analyzingExams ? (
                          <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                        ) : (
                          <><span>🔍</span> Analisar Resultados e Gerar Novo Laudo</>
                        )}
                      </button>
                    </div>
                  </div>

                  {report.examResults && report.examResults.length > 0 && (
                    <div className="space-y-3 mt-6">
                      {report.examResults.map((e, idx) => (
                        <div key={idx} className="flex justify-between items-center p-4 bg-slate-50 rounded-xl border border-slate-100">
                          <div>
                            <p className="font-black text-xs text-slate-900 uppercase">{e.examName}</p>
                            <p className="text-[10px] text-slate-500">{e.date}</p>
                          </div>
                          <span className="bg-emerald-100 text-emerald-800 px-3 py-1 rounded-lg font-black text-xs">{e.result}</span>
                        </div>
                      ))}
                    </div>
                  )}
                </div>

                {/* Revaluation Date & Next Steps */}
                <div className="bg-white p-10 rounded-[3rem] border border-slate-100 shadow-sm space-y-6">
                  <h4 className="text-lg font-black text-slate-900 uppercase tracking-tight flex items-center gap-3">
                    <span>📅</span> Agendar Próxima Reavaliação
                  </h4>
                  
                  <div className="space-y-6">
                    <div>
                      <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-3">Data Recomendada</p>
                      <input 
                        type="date" 
                        value={report.revaluationDate || ''}
                        onChange={(e) => handleUpdateRevaluation(e.target.value)}
                        className="w-full bg-slate-50 p-5 rounded-2xl border border-slate-100 text-xl font-black text-emerald-600"
                      />
                    </div>

                    <div>
                      <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-3">Notas de Reavaliação / Ajustes de Receita</p>
                      <textarea 
                        value={report.revaluationNotes || ''}
                        onChange={(e) => {
                          const updatedReport = { ...report!, revaluationNotes: e.target.value };
                          setReport(updatedReport);
                          if (onReportGenerated) onReportGenerated(updatedReport);
                        }}
                        placeholder="Descreva melhorias, reações às receitas ou ajustes necessários..."
                        className="w-full bg-slate-50 p-5 rounded-2xl border border-slate-100 text-xs font-medium min-h-[100px]"
                      />
                    </div>

                    <div className="bg-emerald-50 p-6 rounded-2xl border border-emerald-100">
                      <p className="text-[10px] font-black text-emerald-800 uppercase tracking-widest mb-2">Sugestão IA</p>
                      <p className="text-xs font-medium text-emerald-900 italic">
                        Com base no nível de atenção {report.emergencyLevel}, recomenda-se reavaliação em {report.suggestedProtocols[0]?.revaluationDays || 15} dias.
                      </p>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                      <button 
                        onClick={() => handleSave('pdf')}
                        disabled={isSaving !== null}
                        className="w-full bg-white border-2 border-slate-950 text-slate-950 py-5 rounded-2xl font-black uppercase tracking-widest shadow-xl hover:bg-slate-50 transition-all flex items-center justify-center gap-4 disabled:opacity-50"
                      >
                        {isSaving === 'pdf' ? (
                          <div className="w-5 h-5 border-2 border-slate-950 border-t-transparent rounded-full animate-spin"></div>
                        ) : (
                          <>
                            <FileDown size={20} className="text-emerald-600" />
                            Salvar PDF
                          </>
                        )}
                      </button>

                      <button 
                        onClick={handlePrint}
                        className="w-full bg-white border-2 border-emerald-600 text-emerald-600 py-5 rounded-2xl font-black uppercase tracking-widest shadow-xl hover:bg-emerald-50 transition-all flex items-center justify-center gap-4"
                      >
                        <Printer size={20} />
                        Imprimir
                      </button>

                      <button 
                        onClick={handleShare}
                        className="w-full bg-white border-2 border-blue-600 text-blue-600 py-5 rounded-2xl font-black uppercase tracking-widest shadow-xl hover:bg-blue-50 transition-all flex items-center justify-center gap-4"
                      >
                        <Share2 size={20} />
                        Compartilhar
                      </button>

                      <button 
                        onClick={() => handleSave('cloud')}
                        disabled={isSaving !== null}
                        className="w-full bg-slate-950 text-white py-5 rounded-2xl font-black uppercase tracking-widest shadow-2xl hover:bg-emerald-600 transition-all flex items-center justify-center gap-4 disabled:opacity-50"
                      >
                        {isSaving === 'cloud' ? (
                          <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                        ) : (
                          <>
                            <Cloud size={20} className="text-emerald-400" />
                            Salvar nas Nuvens
                          </>
                        )}
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            </section>

            {/* Print Only Exam Results */}
            {report.examResults && report.examResults.length > 0 && (
              <section className="hidden print:block space-y-6">
                 <div className="flex items-center gap-4 mb-8">
                  <h3 className="text-xs font-black text-slate-400 uppercase tracking-[0.3em]">Resultados de Exames Anexados</h3>
                  <div className="h-px bg-slate-100 flex-1"></div>
                </div>
                <table className="w-full text-left border-collapse">
                  <thead>
                    <tr className="border-b-2 border-slate-100">
                      <th className="py-4 text-[10px] font-black uppercase text-slate-400">Exame</th>
                      <th className="py-4 text-[10px] font-black uppercase text-slate-400">Data</th>
                      <th className="py-4 text-[10px] font-black uppercase text-slate-400 text-right">Resultado</th>
                    </tr>
                  </thead>
                  <tbody>
                    {report.examResults.map((e, idx) => (
                      <tr key={idx} className="border-b border-slate-50">
                        <td className="py-4 font-black text-xs uppercase">{e.examName}</td>
                        <td className="py-4 text-xs text-slate-500">{e.date}</td>
                        <td className="py-4 font-black text-xs text-right">{e.result}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </section>
            )}

           <footer className="pt-20 border-t border-slate-100 flex flex-col md:flex-row justify-between items-center gap-10 opacity-60 print:pt-10 print:opacity-100 print:text-slate-400 print:border-slate-100">
              <div className="text-center md:text-left">
                 <p className="text-[10px] font-black uppercase tracking-[0.5em] mb-2">Autenticação Consulfision 2026</p>
                 <p className="text-xs font-bold text-slate-900">Documento gerado por IA Clínica NSOFISION • Quissambi Benvindo</p>
              </div>
              <div className="w-24 h-24 bg-slate-50 rounded-3xl flex items-center justify-center text-4xl grayscale print:w-16 print:h-16 print:text-2xl">🛡️</div>
           </footer>
        </div>
      </div>
    </div>
  );
};
