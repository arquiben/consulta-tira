
import React, { useState, useRef, useEffect } from 'react';
import { useStore } from '../store/useStore';
import { PatientData, IridologyZone, IridologyAnalysis, Protocol, TherapyType } from '../types';
import { generateTherapyReport } from '../services/gemini';
import { speakText } from '../services/tts';
import { Camera, RefreshCw, Save, FileText, CheckCircle2, AlertCircle, Eye, Sparkles, Cloud, FileDown } from 'lucide-react';
import { translations } from '../translations';
import { generateConsultationPDF, generateConsultationWord } from '../services/documentGenerator';

export const IridologyModule: React.FC = () => {
  const { patientData, saveIridologyAnalysis, setView, clinicSettings } = useStore();
  const t = translations[clinicSettings.language || 'pt'] || translations.pt;

  const IRIDOLOGY_ZONES = [
    { id: 1, name: t.stomach },
    { id: 2, name: t.intestine },
    { id: 3, name: t.liver },
    { id: 4, name: t.gallbladder },
    { id: 5, name: t.pancreas },
    { id: 6, name: t.heart },
    { id: 7, name: t.lungs },
    { id: 8, name: t.kidneys },
    { id: 9, name: t.nervousSystem },
    { id: 10, name: t.spine },
  ];

  const [step, setStep] = useState<'capture' | 'mapping' | 'result'>('capture');
  const [isCameraActive, setIsCameraActive] = useState(false);
  const [capturedImage, setCapturedImage] = useState<string | null>(null);
  const [zones, setZones] = useState<IridologyZone[]>(
    IRIDOLOGY_ZONES.map(z => ({ ...z, status: 'normal' }))
  );
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [isSaving, setIsSaving] = useState<'pdf' | 'word' | 'cloud' | null>(null);
  const [analysisResult, setAnalysisResult] = useState<IridologyAnalysis | null>(null);

  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);

  const startCamera = async () => {
    setIsCameraActive(true);
    try {
      let stream: MediaStream;
      try {
        stream = await navigator.mediaDevices.getUserMedia({ 
          video: { facingMode: 'environment', width: { ideal: 1280 }, height: { ideal: 720 } } 
        });
      } catch (initialErr) {
        console.warn("Initial camera request failed, trying fallback:", initialErr);
        stream = await navigator.mediaDevices.getUserMedia({ video: true });
      }
      if (videoRef.current) videoRef.current.srcObject = stream;
    } catch (err) {
      console.error("Detailed Camera Error:", err);
      alert(t.cameraUnavailable || "Câmera indisponível ou permissão negada.");
      setIsCameraActive(false);
    }
  };

  const stopCamera = () => {
    if (videoRef.current?.srcObject) {
      (videoRef.current.srcObject as MediaStream).getTracks().forEach(track => track.stop());
      videoRef.current.pause();
      videoRef.current.srcObject = null;
    }
    setIsCameraActive(false);
  };

  const captureImage = () => {
    if (videoRef.current && canvasRef.current) {
      const context = canvasRef.current.getContext('2d');
      if (context) {
        // Capture a square area from the center
        const size = Math.min(videoRef.current.videoWidth, videoRef.current.videoHeight);
        const x = (videoRef.current.videoWidth - size) / 2;
        const y = (videoRef.current.videoHeight - size) / 2;
        
        canvasRef.current.width = 600;
        canvasRef.current.height = 600;
        context.drawImage(videoRef.current, x, y, size, size, 0, 0, 600, 600);
        
        const dataUrl = canvasRef.current.toDataURL('image/jpeg', 0.9);
        setCapturedImage(dataUrl);
        stopCamera();
        setStep('mapping');
      }
    }
  };

  const toggleZone = (id: number) => {
    setZones(prev => prev.map(z => 
      z.id === id 
        ? { ...z, status: z.status === 'normal' ? 'altered' : 'normal', severity: z.status === 'normal' ? 'moderate' : undefined } 
        : z
    ));
  };

  const updateSeverity = (id: number, severity: 'light' | 'moderate' | 'intense') => {
    setZones(prev => prev.map(z => z.id === id ? { ...z, severity } : z));
  };

  const runAIAnalysis = async () => {
    if (!patientData) {
      alert(t.noPatientSelected);
      return;
    }
    setIsAnalyzing(true);
    speakText(t.startingIridologyAnalysis || "Iniciando análise iridológica computacional. Processando zonas de biocampo ocular.");

    try {
      const alteredZones = zones.filter(z => z.status === 'altered');
      const zonesStr = alteredZones.map(z => `${z.name} (${z.severity})`).join(', ');
      
      const prompt = `Realize uma análise de iridologia para o paciente ${patientData.name}. 
      Zonas marcadas com alterações: ${zonesStr || 'Nenhuma zona marcada manualmente, realize detecção automática na imagem'}.
      Baseie-se na lógica: manchas escuras (sobrecarga), fibras abertas (fragilidade), anéis circulares (tensão nervosa), pigmentação amarelada (sobrecarga hepática).
      Gere um relatório detalhado e sugira protocolos de Fitoterapia, Reflexologia, Cromoterapia e Biomagnetismo.`;

      const report = await generateTherapyReport(prompt, capturedImage?.split(',')[1], patientData);
      
      const analysis: IridologyAnalysis = {
        id: `IRI-${Date.now()}`,
        patientId: patientData.id,
        date: new Date().toISOString(),
        imageUrl: capturedImage!,
        zones: zones,
        interpretation: report.summary,
        suggestedProtocol: report.suggestedProtocols[0] || {
          id: 'default',
          therapy: TherapyType.FITOTERAPIA,
          title: 'Protocolo Iridológico Base',
          instructions: 'Seguir orientações gerais de desintoxicação.',
          steps: [],
          sessions: 4,
          revaluationDays: 30
        }
      };

      setAnalysisResult(analysis);
      saveIridologyAnalysis(analysis);
      setStep('result');
      speakText(t.analysisCompleted || "Análise concluída. O mapa iridológico identificou áreas de interesse clínico. Relatório disponível.");
    } catch (err) {
      console.error(err);
      alert(t.aiAnalysisError || "Erro na análise de IA.");
    } finally {
      setIsAnalyzing(false);
    }
  };

  const handleSave = async (type: 'pdf' | 'word' | 'cloud') => {
    if (!patientData || !analysisResult) return;
    
    setIsSaving(type);
    const messages = {
      pdf: t.generatingPdf || "Gerando laudo iridológico em PDF...",
      word: t.exportingWord || "Exportando análise de íris para Word...",
      cloud: t.syncingCloud || "Sincronizando mapeamento com a nuvem NSO..."
    };
    
    speakText(messages[type]);
    
    // Convert IridologyAnalysis to a format compatible with generateConsultationPDF
    const mappedReport: any = {
      date: analysisResult.date,
      summary: analysisResult.interpretation,
      findings: analysisResult.zones
        .filter(z => z.status === 'altered')
        .map(z => `${z.name}: ${z.severity || 'alterado'}`),
      suggestedProtocols: [analysisResult.suggestedProtocol],
      disclaimer: "Análise iridológica baseada em reconhecimento de padrões via IA.",
      criticalAlert: false,
      emergencyLevel: 'low'
    };
    
    try {
      if (type === 'pdf') {
        await generateConsultationPDF(patientData, [], mappedReport, analysisResult.imageUrl);
      } else if (type === 'word') {
        await generateConsultationWord(patientData, [], mappedReport);
      } else {
        saveIridologyAnalysis(analysisResult);
        speakText(t.savedSuccess);
      }
      
      setIsSaving(null);
      if (type !== 'cloud') {
        speakText(`${type.toUpperCase()} ${t.savedSuccess}`);
      }
    } catch (error) {
      console.error(`Error in handleSave (${type}):`, error);
      setIsSaving(null);
      speakText(t.errorSaving);
    }
  };

  return (
    <div className="space-y-8 pb-24 animate-fadeIn">
      <header className="flex justify-between items-center">
        <div>
          <h2 className="text-3xl font-black text-slate-900 tracking-tighter uppercase italic">{t.iridologyTitle}</h2>
          <p className="text-slate-500 font-medium italic">{t.iridologySubtitle}</p>
        </div>
        <div className="bg-blue-600 text-white px-6 py-2 rounded-2xl font-black text-[10px] uppercase tracking-widest shadow-lg shadow-blue-200">
          {t.nsoVisionModule}
        </div>
      </header>

      <div className="bg-white rounded-[3.5rem] shadow-2xl border border-slate-100 overflow-hidden min-h-[600px] flex flex-col">
        {step === 'capture' && (
          <div className="flex-1 flex flex-col items-center justify-center p-10 space-y-8">
            {!isCameraActive ? (
              <div className="text-center space-y-8 animate-fadeIn">
                <div className="w-48 h-48 bg-blue-50 rounded-[4rem] flex items-center justify-center text-8xl shadow-inner mx-auto border-2 border-blue-100">👁️</div>
                <div className="space-y-2">
                  <h3 className="text-2xl font-black text-slate-900 uppercase">{t.irisCapture}</h3>
                  <p className="text-slate-400 text-xs font-black uppercase tracking-widest max-w-xs mx-auto">{t.irisCaptureInstruction}</p>
                </div>
                <button 
                  onClick={startCamera}
                  className="bg-blue-600 text-white px-12 py-5 rounded-[2rem] font-black text-xs uppercase tracking-widest shadow-xl hover:bg-blue-700 transition-all active:scale-95 flex items-center gap-3 mx-auto"
                >
                  <Camera size={18} /> {t.openScanner}
                </button>
              </div>
            ) : (
              <div className="relative w-full max-w-md aspect-square rounded-[3rem] overflow-hidden shadow-2xl border-8 border-white animate-fadeIn">
                <video ref={videoRef} autoPlay playsInline className="w-full h-full object-cover" />
                
                {/* Overlay Guide */}
                <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                  <div className="w-64 h-64 border-4 border-blue-500/50 rounded-full flex items-center justify-center">
                    <div className="w-4 h-4 bg-blue-500 rounded-full animate-ping"></div>
                  </div>
                </div>

                <div className="absolute bottom-8 left-0 right-0 flex justify-center gap-6 px-8">
                  <button 
                    onClick={stopCamera}
                    className="bg-white/10 backdrop-blur-md text-white px-6 py-3 rounded-2xl font-black text-[10px] uppercase border border-white/20"
                  >
                    {t.cancel}
                  </button>
                  <button 
                    onClick={captureImage}
                    className="w-20 h-20 bg-white rounded-full border-[8px] border-blue-200 shadow-2xl active:scale-90 transition-all"
                  ></button>
                  <div className="w-20"></div>
                </div>
              </div>
            )}
            <canvas ref={canvasRef} className="hidden" />
          </div>
        )}

        {step === 'mapping' && capturedImage && (
          <div className="flex-1 flex flex-col lg:flex-row p-8 gap-10 animate-fadeIn">
            <div className="lg:w-1/2 space-y-6">
              <div className="relative aspect-square rounded-[3rem] overflow-hidden shadow-2xl border-8 border-white group">
                <img src={capturedImage} className="w-full h-full object-cover" alt={t.irisCapture} />
                
                {/* Interactive Map Overlay */}
                <svg viewBox="0 0 100 100" className="absolute inset-0 w-full h-full pointer-events-none">
                  <circle cx="50" cy="50" r="48" fill="none" stroke="rgba(59, 130, 246, 0.2)" strokeWidth="0.5" />
                  <circle cx="50" cy="50" r="20" fill="none" stroke="rgba(59, 130, 246, 0.2)" strokeWidth="0.5" />
                  
                  {/* Zone Markers (Simplified) */}
                  {zones.map((z, i) => {
                    const angle = (i / zones.length) * 2 * Math.PI - Math.PI / 2;
                    const r = 35;
                    const x = 50 + r * Math.cos(angle);
                    const y = 50 + r * Math.sin(angle);
                    return (
                      <g key={z.id} className="pointer-events-auto cursor-pointer" onClick={() => toggleZone(z.id)}>
                        <circle 
                          cx={x} cy={y} r="4" 
                          fill={z.status === 'altered' ? '#ef4444' : '#3b82f6'} 
                          className="transition-all hover:r-6"
                        />
                        <text x={x} y={y + 8} fontSize="3" textAnchor="middle" fill="white" fontWeight="bold" className="drop-shadow-md">{z.id}</text>
                      </g>
                    );
                  })}
                </svg>
              </div>
              <div className="bg-blue-50 p-6 rounded-3xl border border-blue-100">
                <p className="text-[10px] font-black text-blue-800 uppercase tracking-widest mb-2 flex items-center gap-2">
                  <AlertCircle size={14} /> {t.mappingInstructionTitle}
                </p>
                <p className="text-xs text-blue-600 font-medium italic">{t.mappingInstructionDesc}</p>
              </div>
            </div>

            <div className="lg:w-1/2 flex flex-col space-y-6">
              <div className="flex-1 bg-slate-50 rounded-[2.5rem] p-8 border border-slate-100 overflow-y-auto custom-scrollbar">
                <h4 className="text-sm font-black text-slate-900 uppercase tracking-widest mb-6 border-b pb-4">{t.analysisZones}</h4>
                <div className="grid grid-cols-1 gap-3">
                  {zones.map(z => (
                    <div 
                      key={z.id} 
                      className={`p-4 rounded-2xl border transition-all flex items-center justify-between ${z.status === 'altered' ? 'bg-white border-red-200 shadow-sm' : 'bg-transparent border-slate-200 opacity-60'}`}
                    >
                      <div className="flex items-center gap-4">
                        <span className={`w-8 h-8 rounded-xl flex items-center justify-center font-black text-xs ${z.status === 'altered' ? 'bg-red-500 text-white' : 'bg-slate-200 text-slate-500'}`}>
                          {z.id}
                        </span>
                        <div>
                          <p className="font-black text-slate-900 text-sm">{z.name}</p>
                          {z.status === 'altered' && (
                            <div className="flex gap-2 mt-1">
                              {(['light', 'moderate', 'intense'] as const).map(s => (
                                <button 
                                  key={s}
                                  onClick={() => updateSeverity(z.id, s)}
                                  className={`text-[8px] font-black uppercase px-2 py-0.5 rounded-full border ${z.severity === s ? 'bg-red-100 border-red-300 text-red-700' : 'bg-white border-slate-200 text-slate-400'}`}
                                >
                                  {s === 'light' ? t.light : s === 'moderate' ? t.moderate : t.intense}
                                </button>
                              ))}
                            </div>
                          )}
                        </div>
                      </div>
                      <button 
                        onClick={() => toggleZone(z.id)}
                        className={`w-10 h-10 rounded-xl flex items-center justify-center transition-all ${z.status === 'altered' ? 'bg-red-50 text-red-500' : 'text-slate-300 hover:bg-slate-100'}`}
                      >
                        {z.status === 'altered' ? '×' : '+'}
                      </button>
                    </div>
                  ))}
                </div>
              </div>
              
              <div className="flex gap-4">
                <button 
                  onClick={() => setStep('capture')}
                  className="flex-1 bg-slate-100 text-slate-500 py-5 rounded-3xl font-black text-[10px] uppercase tracking-widest"
                >
                  {t.recapture}
                </button>
                <button 
                  onClick={runAIAnalysis}
                  disabled={isAnalyzing}
                  className="flex-[2] bg-blue-600 text-white py-5 rounded-3xl font-black text-[10px] uppercase tracking-widest shadow-xl flex items-center justify-center gap-3"
                >
                  {isAnalyzing ? <RefreshCw className="animate-spin" size={16} /> : <Sparkles size={16} />}
                  {isAnalyzing ? t.analyzing : t.processWithAI}
                </button>
              </div>
            </div>
          </div>
        )}

        {step === 'result' && analysisResult && (
          <div className="flex-1 flex flex-col p-8 md:p-12 space-y-10 animate-slideUp">
            <div className="flex flex-col md:flex-row gap-10">
              <div className="md:w-1/3">
                <div className="relative aspect-square rounded-[3rem] overflow-hidden shadow-2xl border-8 border-white">
                  <img src={analysisResult.imageUrl} className="w-full h-full object-cover" alt={t.iridologyConclusion} />
                  <div className="absolute inset-0 bg-blue-600/10 mix-blend-overlay"></div>
                </div>
              </div>
              <div className="md:w-2/3 space-y-6">
                <div className="flex items-center gap-4">
                  <div className="w-16 h-16 bg-blue-600 text-white rounded-[1.5rem] flex items-center justify-center text-3xl shadow-xl">🧠</div>
                  <div>
                    <h4 className="text-2xl font-black text-slate-900 uppercase tracking-tighter">{t.iridologyConclusion}</h4>
                    <p className="text-blue-600 text-[10px] font-black uppercase tracking-widest">{t.nsoVisionIntelligence}</p>
                  </div>
                </div>
                <div className="bg-blue-50 p-8 rounded-[2.5rem] border border-blue-100 relative">
                  <p className="text-blue-900 font-medium italic text-lg leading-relaxed">"{analysisResult.interpretation}"</p>
                  <div className="absolute -top-3 -left-3 text-4xl opacity-20">"</div>
                </div>
                <div className="flex flex-wrap gap-2">
                  {analysisResult.zones.filter(z => z.status === 'altered').map(z => (
                    <span key={z.id} className="bg-white border border-red-100 text-red-600 px-4 py-1.5 rounded-full text-[10px] font-black uppercase tracking-widest shadow-sm">
                      ⚠️ {z.name}: {z.severity === 'light' ? t.light : z.severity === 'moderate' ? t.moderate : t.intense}
                    </span>
                  ))}
                </div>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
              <div className="bg-slate-900 text-white p-10 rounded-[3rem] shadow-2xl space-y-6 relative overflow-hidden">
                <div className="relative z-10">
                  <h5 className="text-emerald-400 text-[10px] font-black uppercase tracking-widest mb-4">{t.suggestedProtocol}</h5>
                  <h6 className="text-2xl font-black uppercase tracking-tight mb-2">{analysisResult.suggestedProtocol.therapy}</h6>
                  <p className="text-slate-400 text-sm leading-relaxed mb-8">{analysisResult.suggestedProtocol.instructions}</p>
                  <div className="flex justify-between items-center border-t border-white/10 pt-6">
                    <div className="text-center">
                      <p className="text-[8px] font-black uppercase opacity-50">{t.sessions || 'Sessões'}</p>
                      <p className="text-xl font-black">{analysisResult.suggestedProtocol.sessions}</p>
                    </div>
                    <div className="text-center">
                      <p className="text-[8px] font-black uppercase opacity-50">{t.revaluation || 'Reavaliação'}</p>
                      <p className="text-xl font-black">{analysisResult.suggestedProtocol.revaluationDays}d</p>
                    </div>
                    <button 
                      onClick={() => setView('protocols')}
                      className="bg-white text-slate-900 px-6 py-3 rounded-2xl font-black text-[10px] uppercase tracking-widest hover:bg-emerald-400 transition-all"
                    >
                      {t.viewDetails}
                    </button>
                  </div>
                </div>
                <div className="absolute -right-10 -bottom-10 text-9xl opacity-5">📋</div>
              </div>

              <div className="bg-white p-10 rounded-[3rem] border border-slate-100 shadow-xl flex flex-col justify-between space-y-8">
                <div className="space-y-4">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 bg-blue-50 text-blue-600 rounded-xl flex items-center justify-center text-xl">📄</div>
                    <h5 className="text-sm font-black text-slate-900 uppercase tracking-widest">{t.clinicalReportPdf}</h5>
                  </div>
                  <p className="text-slate-500 text-xs font-medium leading-relaxed">{t.reportGeneratedDesc}</p>
                </div>
                <div className="flex flex-col gap-3">
                  <div className="flex gap-3">
                    <button 
                      onClick={() => handleSave('pdf')}
                      disabled={!!isSaving}
                      className="flex-1 bg-white border border-slate-200 text-slate-700 py-4 rounded-2xl font-black text-[9px] uppercase tracking-widest flex items-center justify-center gap-2 hover:bg-slate-50 transition-all"
                    >
                      {isSaving === 'pdf' ? <RefreshCw className="animate-spin" size={14} /> : <FileDown size={14} className="text-blue-600" />}
                      PDF
                    </button>
                    <button 
                      onClick={() => handleSave('word')}
                      disabled={!!isSaving}
                      className="flex-1 bg-white border border-slate-200 text-slate-700 py-4 rounded-2xl font-black text-[9px] uppercase tracking-widest flex items-center justify-center gap-2 hover:bg-slate-50 transition-all"
                    >
                      {isSaving === 'word' ? <RefreshCw className="animate-spin" size={14} /> : <FileText size={14} className="text-emerald-600" />}
                      Word
                    </button>
                    <button 
                      onClick={() => handleSave('cloud')}
                      disabled={!!isSaving}
                      className="flex-1 bg-slate-900 text-white py-4 rounded-2xl font-black text-[9px] uppercase tracking-widest flex items-center justify-center gap-2 hover:bg-slate-800 transition-all"
                    >
                      {isSaving === 'cloud' ? <RefreshCw className="animate-spin" size={14} /> : <Cloud size={14} className="text-blue-400" />}
                      Nuvem
                    </button>
                  </div>
                  <button 
                    onClick={() => setView('dashboard')}
                    className="w-full bg-blue-600 text-white py-5 rounded-3xl font-black text-[10px] uppercase tracking-widest shadow-lg flex items-center justify-center gap-2"
                  >
                    <CheckCircle2 size={16} /> {t.finishConsultation}
                  </button>
                </div>
              </div>
            </div>

            <div className="bg-amber-50 border border-amber-100 p-6 rounded-[2rem] text-center">
              <p className="text-amber-800 text-[10px] font-black uppercase tracking-widest">⚠️ {t.legalDisclaimerTitle}</p>
              <p className="text-amber-700 text-xs font-medium italic mt-1">{t.legalDisclaimerDesc}</p>
            </div>
          </div>
        )}
      </div>

      <style>{`
        @keyframes fadeIn { from { opacity: 0; } to { opacity: 1; } }
        @keyframes slideUp { from { transform: translateY(20px); opacity: 0; } to { transform: translateY(0); opacity: 1; } }
        .animate-fadeIn { animation: fadeIn 0.5s ease-out forwards; }
        .animate-slideUp { animation: slideUp 0.5s ease-out forwards; }
        .shadow-3xl { box-shadow: 0 30px 60px -12px rgba(0,0,0,0.25); }
      `}</style>
    </div>
  );
};
