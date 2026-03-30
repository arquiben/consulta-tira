
import React, { useState, useRef, useMemo } from 'react';
import { PatientData, AnalysisReport, Protocol, IridologyAnalysis, ExamRequest } from '../types';
import { useStore } from '../store/useStore';
import { speakText } from '../services/tts';
import { translations } from '../translations';
import { 
  LineChart, 
  Line, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  ResponsiveContainer,
  AreaChart,
  Area
} from 'recharts';
import { motion, AnimatePresence } from 'motion/react';
import { 
  Calendar, 
  Tag, 
  TrendingUp, 
  Activity, 
  ChevronRight, 
  Clock, 
  AlertCircle,
  Play,
  Square,
  History,
  Eye,
  FileText,
  Download,
  FileDown,
  RefreshCw
} from 'lucide-react';
import { generateConsultationPDF, generateConsultationWord } from '../services/documentGenerator';
import { generateExamPDF, generateExamWord } from '../services/documentService';

interface ClinicalHistoryProps {
  patientData: PatientData | null;
  language: string;
  onSelectReport?: (report: AnalysisReport) => void;
}

type GroupBy = 'date' | 'therapy';

export const ClinicalHistory: React.FC<ClinicalHistoryProps> = ({ patientData, language, onSelectReport }) => {
  const { iridologyHistory } = useStore();
  const t = translations[language] || translations.pt;
  const [isSpeaking, setIsSpeaking] = useState<number | string | null>(null);
  const [groupBy, setGroupBy] = useState<GroupBy>('date');
  const [isExporting, setIsExporting] = useState<string | null>(null);
  const audioRef = useRef<{ source: AudioBufferSourceNode, audioCtx: AudioContext } | null>(null);

  const handleExport = async (report: any, format: 'pdf' | 'word') => {
    if (!patientData) return;
    const exportId = `${report.date}-${format}`;
    setIsExporting(exportId);

    try {
      const isIridology = 'imageUrl' in report;
      const isExamRequest = 'exams' in report;

      if (isExamRequest) {
        if (format === 'pdf') {
          await generateExamPDF(patientData, report.exams);
        } else {
          await generateExamWord(patientData, report.exams);
        }
      } else {
        // Map Iridology or AnalysisReport to the format expected by documentGenerator
        const reportToExport: AnalysisReport = isIridology ? {
          id: report.id,
          date: report.date,
          summary: report.interpretation,
          findings: report.findings || [],
          suggestedProtocols: [report.suggestedProtocol],
          emergencyLevel: 'normal',
          criticalAlert: false
        } : report;

        if (format === 'pdf') {
          await generateConsultationPDF(patientData, [], reportToExport, isIridology ? report.imageUrl : null);
        } else {
          await generateConsultationWord(patientData, [], reportToExport);
        }
      }
    } catch (error) {
      console.error('Export error:', error);
    } finally {
      setIsExporting(null);
    }
  };

  const handleSpeak = async (text: string, id: number | string) => {
    if (isSpeaking === id) {
      audioRef.current?.source.stop();
      setIsSpeaking(null);
      return;
    }
    
    audioRef.current?.source.stop();
    
    const result = await speakText(text);
    if (result) {
      audioRef.current = result;
      result.source.start();
      setIsSpeaking(id);
      result.source.onended = () => setIsSpeaking(null);
    }
  };

  const chartData = useMemo(() => {
    if (!patientData?.consultationHistory) return [];
    return patientData.consultationHistory.map((report, idx) => ({
      name: new Date(report.date).toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit' }),
      protocols: report.suggestedProtocols.length,
      fullDate: new Date(report.date).toLocaleDateString(),
    })).reverse(); // Chronological order
  }, [patientData]);

  const patientIridology = useMemo(() => {
    return iridologyHistory.filter(h => h.patientId === patientData?.id);
  }, [iridologyHistory, patientData]);

  const groupedHistory = useMemo((): Record<string, (AnalysisReport | IridologyAnalysis | ExamRequest)[]> => {
    if (!patientData?.consultationHistory && patientIridology.length === 0 && (!patientData?.examRequests || patientData.examRequests.length === 0)) return {};

    const allHistory = [
      ...(patientData?.consultationHistory || []),
      ...(patientData?.examRequests || []),
      ...patientIridology
    ].sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());

    if (groupBy === 'date') {
      return allHistory.reduce((acc, report) => {
        const date = new Date(report.date).toLocaleDateString('pt-BR', { year: 'numeric', month: 'long' });
        if (!acc[date]) acc[date] = [];
        acc[date].push(report);
        return acc;
      }, {} as Record<string, (AnalysisReport | IridologyAnalysis | ExamRequest)[]>);
    } else {
      return allHistory.reduce((acc, report) => {
        if ('suggestedProtocols' in report) {
          report.suggestedProtocols.forEach(protocol => {
            const therapy = protocol.therapy;
            if (!acc[therapy]) acc[therapy] = [];
            if (!acc[therapy].find(r => r.date === report.date)) {
              acc[therapy].push(report);
            }
          });
        } else if ('suggestedProtocol' in report) {
          const therapy = report.suggestedProtocol.therapy;
          if (!acc[therapy]) acc[therapy] = [];
          acc[therapy].push(report);
        } else if ('exams' in report) {
          const therapy = 'Requisição de Exames';
          if (!acc[therapy]) acc[therapy] = [];
          acc[therapy].push(report);
        }
        return acc;
      }, {} as Record<string, (AnalysisReport | IridologyAnalysis | ExamRequest)[]>);
    }
  }, [patientData, patientIridology, groupBy]);

  if (!patientData) {
    return (
      <div className="h-[60vh] flex flex-col items-center justify-center text-center p-10 bg-white rounded-[3rem] border border-slate-100 shadow-sm">
        <div className="w-24 h-24 bg-slate-50 rounded-full flex items-center justify-center text-5xl shadow-inner mb-6">📂</div>
        <h3 className="text-xl font-black text-slate-800 uppercase tracking-tight">Paciente não Selecionado</h3>
        <p className="text-slate-500 max-w-xs mt-2">Ative um paciente para visualizar seu histórico clínico completo.</p>
      </div>
    );
  }

  return (
    <div className="space-y-10 animate-fadeIn pb-32 max-w-7xl mx-auto">
      <header className="flex flex-col md:flex-row justify-between items-start md:items-end gap-6">
        <div className="space-y-2">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-emerald-600 text-white rounded-xl flex items-center justify-center shadow-lg">
              <History size={20} />
            </div>
            <h2 className="text-4xl font-black text-slate-900 tracking-tighter uppercase">Histórico Clínico</h2>
          </div>
          <p className="text-slate-500 font-medium italic">Monitoramento da evolução de <strong className="text-slate-900 not-italic">{patientData.name}</strong>.</p>
        </div>

        <div className="flex bg-slate-100 p-1.5 rounded-2xl border border-slate-200">
          <button 
            onClick={() => setGroupBy('date')}
            className={`px-6 py-2.5 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all flex items-center gap-2 ${groupBy === 'date' ? 'bg-white text-emerald-600 shadow-sm' : 'text-slate-400 hover:text-slate-600'}`}
          >
            <Calendar size={14} /> Por Data
          </button>
          <button 
            onClick={() => setGroupBy('therapy')}
            className={`px-6 py-2.5 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all flex items-center gap-2 ${groupBy === 'therapy' ? 'bg-white text-emerald-600 shadow-sm' : 'text-slate-400 hover:text-slate-600'}`}
          >
            <Tag size={14} /> Por Terapia
          </button>
        </div>
      </header>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-10">
        {/* Sidebar Stats & Chart */}
        <div className="lg:col-span-4 space-y-8">
          <section className="bg-white p-8 rounded-[2.5rem] border border-slate-100 shadow-sm space-y-8">
            <div className="flex items-center justify-between border-b border-slate-50 pb-4">
              <h3 className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Evolução de Protocolos</h3>
              <TrendingUp size={14} className="text-emerald-500" />
            </div>
            
            <div className="h-48 w-full">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={chartData}>
                  <defs>
                    <linearGradient id="colorProt" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#10b981" stopOpacity={0.3}/>
                      <stop offset="95%" stopColor="#10b981" stopOpacity={0}/>
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                  <XAxis 
                    dataKey="name" 
                    axisLine={false} 
                    tickLine={false} 
                    tick={{ fontSize: 10, fontWeight: 700, fill: '#94a3b8' }}
                  />
                  <YAxis hide />
                  <Tooltip 
                    contentStyle={{ borderRadius: '16px', border: 'none', boxShadow: '0 10px 15px -3px rgb(0 0 0 / 0.1)', fontSize: '12px', fontWeight: 'bold' }}
                  />
                  <Area 
                    type="monotone" 
                    dataKey="protocols" 
                    stroke="#10b981" 
                    strokeWidth={3}
                    fillOpacity={1} 
                    fill="url(#colorProt)" 
                  />
                </AreaChart>
              </ResponsiveContainer>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="bg-slate-50 p-4 rounded-2xl border border-slate-100">
                <p className="text-[8px] font-black text-slate-400 uppercase mb-1">Total Consultas</p>
                <p className="text-2xl font-black text-slate-900">{patientData.consultationHistory?.length || 0}</p>
              </div>
              <div className="bg-emerald-50 p-4 rounded-2xl border border-emerald-100">
                <p className="text-[8px] font-black text-emerald-800 uppercase mb-1">Média Protocolos</p>
                <p className="text-2xl font-black text-emerald-600">
                  {chartData.length > 0 
                    ? (chartData.reduce((acc, curr) => acc + curr.protocols, 0) / chartData.length).toFixed(1)
                    : '0'}
                </p>
              </div>
            </div>
          </section>

          <section className="bg-slate-900 text-white p-8 rounded-[2.5rem] shadow-2xl space-y-6 relative overflow-hidden">
            <div className="relative z-10 space-y-4">
              <div className="flex items-center gap-2">
                <Activity size={16} className="text-emerald-400" />
                <h4 className="text-[10px] font-black uppercase tracking-widest text-emerald-400">Resumo Biométrico</h4>
              </div>
              <div className="space-y-3">
                <div className="flex justify-between items-center border-b border-white/10 pb-2">
                  <span className="text-xs font-medium opacity-60">IMC Atual</span>
                  <span className="font-black text-emerald-400">{patientData.bmi || 'N/A'}</span>
                </div>
                <div className="flex justify-between items-center border-b border-white/10 pb-2">
                  <span className="text-xs font-medium opacity-60">Pressão Arterial</span>
                  <span className="font-black">{patientData.bloodPressure || 'N/A'}</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-xs font-medium opacity-60">Peso</span>
                  <span className="font-black">{patientData.weight} kg</span>
                </div>
              </div>
            </div>
            <div className="absolute -right-10 -bottom-10 w-40 h-40 bg-emerald-500/10 rounded-full blur-3xl"></div>
          </section>
        </div>

        {/* History List */}
        <div className="lg:col-span-8 space-y-12">
          {Object.keys(groupedHistory).length === 0 ? (
            <div className="bg-white p-20 rounded-[3.5rem] text-center border-2 border-dashed border-slate-200 space-y-4">
              <div className="w-16 h-16 bg-slate-50 rounded-2xl flex items-center justify-center mx-auto text-slate-300">
                <Clock size={32} />
              </div>
              <div className="space-y-1">
                <p className="text-slate-900 font-black uppercase tracking-tight">Nenhum histórico encontrado</p>
                <p className="text-slate-400 text-xs font-medium">Os resultados das consultas aparecerão aqui após a geração.</p>
              </div>
            </div>
          ) : (
            (Object.entries(groupedHistory) as [string, (AnalysisReport | IridologyAnalysis | ExamRequest)[]][]).map(([groupName, reports], groupIdx) => (
              <div key={groupName} className="space-y-6">
                <div className="flex items-center gap-4">
                  <h3 className="text-xs font-black text-slate-400 uppercase tracking-[0.3em] whitespace-nowrap">{groupName}</h3>
                  <div className="h-px bg-slate-100 flex-1"></div>
                  <span className="bg-slate-100 text-slate-500 px-3 py-1 rounded-full text-[10px] font-black">{reports.length}</span>
                </div>

                <div className="space-y-6">
                  {reports.map((report, idx) => {
                    const isIridology = 'imageUrl' in report;
                    const isExamRequest = 'exams' in report;
                    
                    let summary = '';
                    if (isIridology) summary = (report as any).interpretation;
                    else if (isExamRequest) summary = (report as ExamRequest).exams.join(', ');
                    else summary = (report as AnalysisReport).summary;

                    const date = new Date(report.date).toLocaleDateString('pt-BR', { day: '2-digit', month: 'long', year: 'numeric' });
                    
                    let title = '';
                    if (isIridology) title = 'ANÁLISE IRIDOLÓGICA';
                    else if (isExamRequest) title = 'REQUISIÇÃO DE EXAMES';
                    else title = `${(report as AnalysisReport).emergencyLevel.toUpperCase()} PRIORIDADE`;

                    let icon = null;
                    if (isIridology) icon = <Eye size={28} />;
                    else if (isExamRequest) icon = <FileText size={28} />;
                    else icon = (report as AnalysisReport).criticalAlert ? <AlertCircle size={28} /> : <Activity size={28} />;

                    let colorClass = '';
                    if (isIridology) colorClass = 'bg-blue-50 text-blue-600';
                    else if (isExamRequest) colorClass = 'bg-amber-50 text-amber-600';
                    else colorClass = (report as AnalysisReport).criticalAlert ? 'bg-red-50 text-red-500' : 'bg-emerald-50 text-emerald-600';

                    return (
                      <motion.div
                        key={`${groupName}-${idx}`}
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: idx * 0.1 }}
                        className="bg-white rounded-[2.5rem] border border-slate-100 shadow-sm overflow-hidden hover:shadow-xl transition-all duration-300 group"
                      >
                        <div className="p-6 md:p-8 flex flex-col md:flex-row justify-between items-start md:items-center gap-6">
                          <div className="flex items-start gap-6">
                            <div className={`w-14 h-14 rounded-2xl flex items-center justify-center text-2xl shadow-inner shrink-0 ${colorClass}`}>
                              {icon}
                            </div>
                            <div className="space-y-1">
                              <div className="flex items-center gap-2">
                                <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">
                                  {date}
                                </span>
                                {!isIridology && !isExamRequest && (report as AnalysisReport).criticalAlert && (
                                  <span className="bg-red-500 text-white px-2 py-0.5 rounded-md text-[8px] font-black uppercase tracking-tighter">Crítico</span>
                                )}
                                {isIridology && (
                                  <span className="bg-blue-500 text-white px-2 py-0.5 rounded-md text-[8px] font-black uppercase tracking-tighter">NSO Vision</span>
                                )}
                                {isExamRequest && (
                                  <span className="bg-amber-500 text-white px-2 py-0.5 rounded-md text-[8px] font-black uppercase tracking-tighter">Laboratorial</span>
                                )}
                              </div>
                              <h4 className="text-xl font-black text-slate-900 uppercase tracking-tighter leading-tight">
                                {title}
                              </h4>
                              <p className="text-slate-500 text-xs font-medium line-clamp-1 italic">
                                "{summary}"
                              </p>
                            </div>
                          </div>

                          <div className="flex flex-wrap gap-3 w-full md:w-auto">
                            <button 
                              onClick={() => handleSpeak(summary, `${groupName}-${idx}`)}
                              className={`p-4 rounded-2xl transition-all shadow-lg flex items-center justify-center gap-2 flex-1 md:flex-none ${isSpeaking === `${groupName}-${idx}` ? 'bg-red-500 text-white animate-pulse' : 'bg-slate-100 text-slate-600 hover:bg-slate-200'}`}
                              title="Ouvir Resumo"
                            >
                              {isSpeaking === `${groupName}-${idx}` ? <Square size={18} fill="currentColor" /> : <Play size={18} fill="currentColor" />}
                            </button>
                            
                            <button 
                              onClick={() => handleExport(report, 'pdf')}
                              disabled={isExporting !== null}
                              className="p-4 bg-slate-100 text-slate-600 rounded-2xl hover:bg-emerald-50 hover:text-emerald-600 transition-all shadow-lg flex items-center justify-center gap-2 flex-1 md:flex-none disabled:opacity-50"
                              title="Exportar PDF"
                            >
                              {isExporting === `${report.date}-pdf` ? <RefreshCw className="animate-spin" size={18} /> : <Download size={18} />}
                            </button>

                            <button 
                              onClick={() => handleExport(report, 'word')}
                              disabled={isExporting !== null}
                              className="p-4 bg-slate-100 text-slate-600 rounded-2xl hover:bg-blue-50 hover:text-blue-600 transition-all shadow-lg flex items-center justify-center gap-2 flex-1 md:flex-none disabled:opacity-50"
                              title="Exportar Word"
                            >
                              {isExporting === `${report.date}-word` ? <RefreshCw className="animate-spin" size={18} /> : <FileDown size={18} />}
                            </button>

                            <button 
                              onClick={() => {
                                if (isIridology) {
                                  // Handle iridology selection if needed
                                } else if (isExamRequest) {
                                  // Handle exam request selection if needed
                                } else {
                                  onSelectReport?.(report as AnalysisReport);
                                }
                              }}
                              className={`${isIridology ? 'bg-blue-600' : isExamRequest ? 'bg-amber-600' : 'bg-emerald-600'} text-white px-8 py-4 rounded-2xl font-black text-[10px] uppercase tracking-widest shadow-xl hover:opacity-90 transition-all flex items-center justify-center gap-3 flex-[2] md:flex-none`}
                            >
                              <ChevronRight size={16} /> Ver Detalhes
                            </button>
                          </div>
                        </div>

                        <div className="px-8 pb-8 flex flex-wrap gap-2">
                          {isIridology ? (
                            <div className="bg-blue-50 border border-blue-100 px-4 py-2 rounded-xl flex items-center gap-2">
                              <div className="w-1.5 h-1.5 bg-blue-500 rounded-full"></div>
                              <span className="text-[9px] font-black text-blue-700 uppercase tracking-widest">{(report as any).suggestedProtocol.therapy}</span>
                            </div>
                          ) : isExamRequest ? (
                            (report as ExamRequest).exams.map((e, ei) => (
                              <div 
                                key={ei} 
                                className="bg-amber-50 border border-amber-100 px-4 py-2 rounded-xl flex items-center gap-2 group/tag hover:bg-amber-100 transition-colors"
                              >
                                <div className="w-1.5 h-1.5 bg-amber-500 rounded-full"></div>
                                <span className="text-[9px] font-black text-amber-700 uppercase tracking-widest">{e}</span>
                              </div>
                            ))
                          ) : (
                            (report as AnalysisReport).suggestedProtocols.map((p, pi) => (
                              <div 
                                key={pi} 
                                className="bg-slate-50 border border-slate-100 px-4 py-2 rounded-xl flex items-center gap-2 group/tag hover:bg-emerald-50 hover:border-emerald-100 transition-colors"
                              >
                                <div className="w-1.5 h-1.5 bg-emerald-500 rounded-full"></div>
                                <span className="text-[9px] font-black text-slate-600 uppercase tracking-widest group-hover/tag:text-emerald-700">{p.therapy}</span>
                              </div>
                            ))
                          )}
                        </div>
                      </motion.div>
                    );
                  })}
                </div>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
};

