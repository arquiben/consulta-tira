
import React, { useState, useRef } from 'react';
import { PatientData, AnalysisReport } from '../types';
import { speakText } from '../services/tts';
import { translations } from '../translations';

interface ClinicalHistoryProps {
  patientData: PatientData | null;
  language: string;
  onSelectReport?: (report: AnalysisReport) => void;
}

export const ClinicalHistory: React.FC<ClinicalHistoryProps> = ({ patientData, language, onSelectReport }) => {
  const t = translations[language] || translations.pt;
  const [isSpeaking, setIsSpeaking] = useState<number | null>(null);
  const audioRef = useRef<{ source: AudioBufferSourceNode, audioCtx: AudioContext } | null>(null);

  const handleSpeak = async (text: string, index: number) => {
    if (isSpeaking === index) {
      audioRef.current?.source.stop();
      setIsSpeaking(null);
      return;
    }
    
    audioRef.current?.source.stop();
    
    const result = await speakText(text);
    if (result) {
      audioRef.current = result;
      result.source.start();
      setIsSpeaking(index);
      result.source.onended = () => setIsSpeaking(null);
    }
  };

  if (!patientData) {
    return (
      <div className="h-[60vh] flex flex-col items-center justify-center text-center p-10 bg-white rounded-[3rem] border border-slate-100 shadow-sm">
        <div className="text-6xl mb-6">📂</div>
        <h3 className="text-xl font-black text-slate-800 uppercase tracking-tight">Paciente não Selecionado</h3>
        <p className="text-slate-500 max-w-xs mt-2">Ative um paciente para visualizar seu histórico.</p>
      </div>
    );
  }

  return (
    <div className="space-y-10 animate-fadeIn pb-32">
      <header className="flex flex-col md:flex-row justify-between items-start md:items-end gap-6">
        <div>
          <h2 className="text-4xl font-black text-slate-900 tracking-tighter uppercase">Histórico de Resultados</h2>
          <p className="text-slate-500 font-medium">Evolução clínica do paciente <strong className="text-slate-900">{patientData.name}</strong>.</p>
        </div>
      </header>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-10">
        <div className="lg:col-span-4 space-y-8">
          <section className="bg-white p-8 rounded-[2.5rem] border border-slate-100 shadow-sm space-y-6">
            <h3 className="text-[10px] font-black text-slate-400 uppercase tracking-widest border-b pb-4">Status Geral</h3>
            <div className="space-y-4">
              <div className="flex justify-between items-center"><span className="text-xs font-bold text-slate-500">Idade</span><span className="font-black text-slate-900">{patientData.age} anos</span></div>
              <div className="flex justify-between items-center"><span className="text-xs font-bold text-slate-500">TA Atual</span><span className="font-black text-slate-900">{patientData.bloodPressure}</span></div>
              <div className="flex justify-between items-center"><span className="text-xs font-bold text-slate-500">Consultas</span><span className="font-black text-emerald-600">{patientData.consultationHistory?.length || 0}</span></div>
            </div>
          </section>
        </div>

        <div className="lg:col-span-8 space-y-8">
          <h3 className="text-xs font-black text-emerald-800 uppercase tracking-[0.3em] flex items-center gap-4">
            <span className="h-px bg-emerald-200 flex-1"></span>
            Resultados Anteriores
            <span className="h-px bg-emerald-200 flex-1"></span>
          </h3>

          <div className="relative space-y-12">
            <div className="absolute left-6 top-4 bottom-4 w-px bg-slate-200"></div>

            {(!patientData.consultationHistory || patientData.consultationHistory.length === 0) ? (
              <div className="bg-slate-50 p-12 rounded-[2.5rem] text-center border-2 border-dashed border-slate-200">
                <p className="text-slate-400 font-bold uppercase text-[10px] tracking-widest">{t.noHistory}</p>
              </div>
            ) : (
              patientData.consultationHistory.map((report, idx) => (
                <div key={idx} className="relative pl-16 group">
                  <div className={`absolute left-4 top-0 w-4 h-4 rounded-full border-4 border-white shadow-md z-10 ${report.criticalAlert ? 'bg-red-600' : 'bg-emerald-600'}`}></div>
                  <div className="bg-white rounded-[2.5rem] border border-slate-100 shadow-sm overflow-hidden hover:shadow-2xl transition-all duration-500">
                    <div className="p-6 md:p-8 bg-slate-50 flex justify-between items-center border-b border-slate-100">
                      <div>
                        <p className="text-[10px] font-black text-emerald-600 uppercase tracking-widest">Consulta em {new Date(report.date).toLocaleDateString()}</p>
                        <p className="text-lg font-black text-slate-900 uppercase">{report.emergencyLevel.toUpperCase()} PRIORIDADE</p>
                      </div>
                      <div className="flex gap-2">
                        <button 
                          onClick={() => handleSpeak(report.summary, idx)}
                          className={`p-4 rounded-2xl transition-all shadow-lg flex items-center gap-2 ${isSpeaking === idx ? 'bg-red-500 text-white animate-pulse' : 'bg-blue-100 text-blue-600 hover:bg-blue-200'}`}
                          title="Ouvir este resultado"
                        >
                          <span className="text-xl">{isSpeaking === idx ? '⏹️' : '🔊'}</span>
                        </button>
                        <button 
                          onClick={() => onSelectReport?.(report)}
                          className="bg-emerald-600 text-white px-6 py-4 rounded-2xl font-black text-[10px] uppercase tracking-widest shadow-xl hover:bg-emerald-700 transition-all flex items-center gap-2 border-b-4 border-emerald-800"
                        >
                          <span>🔄</span> Reaver Protocolo
                        </button>
                      </div>
                    </div>
                    <div className="p-8 space-y-4">
                      <p className="text-slate-600 text-sm font-medium italic border-l-2 border-blue-500 pl-4 leading-relaxed">"{report.summary}"</p>
                      <div className="flex flex-wrap gap-2">
                        {report.suggestedProtocols.map((p, pi) => (
                          <span key={pi} className="bg-emerald-50 text-emerald-800 px-3 py-1 rounded-full text-[9px] font-black uppercase">{p.therapy}</span>
                        ))}
                      </div>
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
