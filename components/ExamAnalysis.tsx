
import React, { useState, useRef, useEffect } from 'react';
import { generateTherapyReport } from '../services/gemini';
import { AnalysisReport, PatientData } from '../types';
import { speakText } from '../services/tts';
import { FileText, Download, Cloud, Share2, CheckCircle2, FileDown, Globe, RefreshCw, Usb, Search, Zap, AlertCircle, Activity, ChevronRight, Volume2, Trash2, Sparkles, FolderArchive } from 'lucide-react';
import { useStore } from '../store/useStore';
import { translations } from '../translations';
import { generateConsultationPDF, generateConsultationWord, generatePatientFolderZIP } from '../services/documentGenerator';

interface ExamAnalysisProps {
  patientData: PatientData | null;
  onAnalysisComplete?: (report: AnalysisReport) => void;
}

export const ExamAnalysis: React.FC<ExamAnalysisProps> = ({ patientData, onAnalysisComplete }) => {
  const { clinicSettings } = useStore();
  const t = translations[clinicSettings.language || 'pt'] || translations.pt;

  const UNIVERSAL_HARDWARE_CATALOG = [
    { id: 'QRMA-V4', name: 'Quantum Resonance Magnetic Analyzer (4)', series: 'Series 4.0 Gold', version: 'v4.7.2', manufacturer: 'NSOFISION Tech', type: 'usb', appIcon: '🌀', dataModel: t.analyticalConclusion },
    { id: 'NSO-Q-2026', name: 'Analisador Bio-Quântico NSO', series: 'Series X', version: 'v4.2 Gold', manufacturer: 'NSOFISION Industries', type: 'usb', appIcon: '🌌', dataModel: t.telemetryMonitor },
    { id: 'BIOMAG-PRO-7', name: 'Biomagnetômetro Digital Pro', series: 'Elite 7', version: 'v7.0.1', manufacturer: 'Quantum Labs', type: 'usb', appIcon: '🧲', dataModel: t.resonanceResults },
    { id: 'IRIS-SCOPE-X', name: 'Iridoscópio Digital NSO-X', series: 'Vision Pro', version: 'v5.0', manufacturer: 'NSO Vision', type: 'usb', appIcon: '👁️', dataModel: t.iridologyTitle },
  ];
  const [preview, setPreview] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [report, setReport] = useState<AnalysisReport | null>(null);
  const [activeTab, setActiveTab] = useState<'scan' | 'sync' | 'docs'>('docs');
  const [docType, setDocType] = useState<'exam' | 'prescription'>('exam');
  
  const [syncStatus, setSyncStatus] = useState<'idle' | 'searching' | 'installing' | 'ready' | 'scanning' | 'analyzing'>('idle');
  const [installationProgress, setInstallationProgress] = useState(0);
  const [scanProgress, setScanProgress] = useState(0);
  const [installationStep, setInstallationStep] = useState('');
  const [connectedDevice, setConnectedDevice] = useState<any | null>(null);
  const [telemetryValues, setTelemetryValues] = useState<number[]>([]);
  const [isCameraActive, setIsCameraActive] = useState(false);
  const [isSaving, setIsSaving] = useState<'pdf' | 'word' | 'cloud' | 'zip' | null>(null);
  
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    let interval: any;
    if (syncStatus === 'scanning' || syncStatus === 'analyzing' || syncStatus === 'ready') {
      interval = setInterval(() => {
        setTelemetryValues(prev => {
          const factor = syncStatus === 'ready' ? 10 : 100;
          const next = [...prev, Math.random() * factor];
          return next.slice(-50);
        });
      }, syncStatus === 'ready' ? 200 : 50);
    }
    return () => clearInterval(interval);
  }, [syncStatus]);

  const startAutoDiscovery = () => {
    setSyncStatus('searching');
    speakText(t.startingHardwareSearch || "Iniciando busca automática por hardware NSOFISION via protocolo USB Quântico.", t.ttsInstruction);
    
    setTimeout(() => {
      const randomDevice = UNIVERSAL_HARDWARE_CATALOG[Math.floor(Math.random() * UNIVERSAL_HARDWARE_CATALOG.length)];
      handleUSBPlugIn(randomDevice);
    }, 4000);
  };

  const handleUSBPlugIn = (device: any) => {
    setSyncStatus('installing');
    setInstallationProgress(0);
    setInstallationStep(`${t.syncingSystem || 'Sincronizando'} ${device.name}...`);
    
    speakText(`${t.hardwareDetected || 'Hardware detectado'}: ${device.name}. ${t.connectionEstablished || 'Estabelecendo ponte de dados segura.'}`, t.ttsInstruction);

    const steps = [
      t.usbScanActive || "Mapeando Portas USB...",
      t.syncingSystem || "Sincronizando Frequências NSO...",
      t.sistemaPronto || "Validando Criptografia de Dados...",
      t.collectingSamples || "Calibrando Sensores Bio-Magnéticos...",
      t.sistemaPronto || "Sistema Pronto para Operação."
    ];

    let currentStepIdx = 0;
    const interval = setInterval(() => {
      setInstallationProgress(prev => {
        if (prev >= 100) {
          clearInterval(interval);
          setConnectedDevice(device);
          setSyncStatus('ready');
          speakText(`Conexão estabelecida com sucesso. Dispositivo ${device.name} online.`);
          return 100;
        }
        const newProgress = prev + 5;
        const stepIdx = Math.floor((newProgress / 100) * steps.length);
        if (stepIdx !== currentStepIdx && stepIdx < steps.length) {
            currentStepIdx = stepIdx;
            setInstallationStep(steps[stepIdx]);
        }
        return newProgress;
      });
    }, 100);
  };

  const startScanningDevice = () => {
    if (!patientData) {
      alert(t.noPatientSelected || "Por favor, selecione um paciente no Dashboard antes de iniciar a varredura.");
      return;
    }
    setSyncStatus('scanning');
    setScanProgress(0);
    speakText(t.deviceInOperation || "Aparelho em funcionamento. Iniciando varredura de biocampo e ressonância celular.", t.ttsInstruction);

    const interval = setInterval(() => {
      setScanProgress(prev => {
        if (prev >= 100) {
          clearInterval(interval);
          setSyncStatus('analyzing');
          runAnalysis();
          return 100;
        }
        return prev + 1;
      });
    }, 40);
  };

  const runAnalysis = async () => {
    setLoading(true);
    const contextStr = activeTab === 'docs' 
      ? `Analise este documento (${docType === 'exam' ? t.exam : t.prescription}).`
      : activeTab === 'scan'
      ? `Analise esta imagem capturada pelo scanner óptico (possível iridologia ou atlas).`
      : `Analise os dados de telemetria e ressonância do dispositivo ${connectedDevice?.name}.`;

    speakText(t.startingClinicalProcessing || "Iniciando processamento inteligente de dados clínicos.", t.ttsInstruction);
    
    try {
      const prompt = `${contextStr} Paciente: ${patientData?.name}, Queixas: ${patientData?.complaints}. Gere protocolos detalhados de Biomagnetismo, Acupuntura Integrativa, Fitoterapia, DIETA ENERGÉTICA NSO e HIDROTERAPIA NSO baseados nos achados deste documento.`;
      const result = await generateTherapyReport(prompt, preview?.split(',')[1], patientData);
      setReport(result);
      if (onAnalysisComplete) onAnalysisComplete(result);
      setSyncStatus('ready');
      speakText(t.analysisFinished || "Análise finalizada. O relatório de biomagnetismo e acupuntura está pronto para visualização.", t.ttsInstruction);
    } catch (err) {
      console.error(err);
      setSyncStatus('ready');
      speakText(t.aiServerError || "Erro na comunicação com o servidor de IA. Tente novamente.", t.ttsInstruction);
    } finally {
      setLoading(false);
    }
  };

  const startCamera = async () => {
    setIsCameraActive(true);
    try {
      let stream: MediaStream;
      try {
        stream = await navigator.mediaDevices.getUserMedia({ 
          video: { facingMode: 'environment' } 
        });
      } catch (initialErr) {
        console.warn("Initial camera request failed, trying fallback:", initialErr);
        stream = await navigator.mediaDevices.getUserMedia({ video: true });
      }
      if (videoRef.current) videoRef.current.srcObject = stream;
    } catch (err) {
      console.error("Detailed Camera Error:", err);
      alert("Câmera indisponível.");
      setIsCameraActive(false);
    }
  };

  const takePhoto = () => {
    if (videoRef.current && canvasRef.current) {
      const context = canvasRef.current.getContext('2d');
      if (context) {
        canvasRef.current.width = videoRef.current.videoWidth;
        canvasRef.current.height = videoRef.current.videoHeight;
        context.drawImage(videoRef.current, 0, 0);
        const dataUrl = canvasRef.current.toDataURL('image/jpeg');
        setPreview(dataUrl);
        if (videoRef.current.srcObject) {
          (videoRef.current.srcObject as MediaStream).getTracks().forEach(t => t.stop());
          videoRef.current.pause();
          videoRef.current.srcObject = null;
        }
        setIsCameraActive(false);
      }
    }
  };

  const handleSave = async (type: 'pdf' | 'word' | 'cloud' | 'zip') => {
    if (!patientData || !report) return;
    
    setIsSaving(type);
    const messages = {
      pdf: t.savePdf,
      word: t.saveWord,
      cloud: t.syncingSystem,
      zip: "Gerando pasta ZIP do paciente..."
    };
    
    speakText(messages[type]);
    
    try {
      if (type === 'pdf') {
        await generateConsultationPDF(patientData, [], report, preview);
      } else if (type === 'word') {
        await generateConsultationWord(patientData, [], report);
      } else if (type === 'zip') {
        await generatePatientFolderZIP(patientData, [], report, preview);
      } else {
        // Cloud save logic
        const { savePatient } = useStore.getState();
        const updatedPatient: PatientData = {
          ...patientData,
          consultationHistory: [report, ...(patientData.consultationHistory || [])]
        };
        savePatient(updatedPatient);
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
    <div className="space-y-10 pb-32 animate-fadeIn">
      <header className="flex flex-col md:flex-row justify-between items-start md:items-end gap-6">
        <div>
          <h2 className="text-4xl font-black text-slate-900 tracking-tighter uppercase italic">{t.hardwareLabTitle}</h2>
          <p className="text-slate-500 font-medium italic">{t.hardwareLabSubtitle}</p>
        </div>
        <div className="flex bg-slate-200/50 p-1.5 rounded-3xl shadow-inner shrink-0 overflow-x-auto max-w-full">
          <button onClick={() => setActiveTab('docs')} className={`px-6 py-3 rounded-2xl font-black text-[10px] uppercase tracking-widest transition-all whitespace-nowrap ${activeTab === 'docs' ? 'bg-white text-emerald-600 shadow-xl' : 'text-slate-400'}`}>
            {t.examsPrescriptions}
          </button>
          <button onClick={() => setActiveTab('sync')} className={`px-6 py-3 rounded-2xl font-black text-[10px] uppercase tracking-widest transition-all whitespace-nowrap ${activeTab === 'sync' ? 'bg-white text-blue-900 shadow-xl' : 'text-slate-400'}`}>
            {t.hardwareUsb}
          </button>
          <button onClick={() => setActiveTab('scan')} className={`px-6 py-3 rounded-2xl font-black text-[10px] uppercase tracking-widest transition-all whitespace-nowrap ${activeTab === 'scan' ? 'bg-white text-slate-900 shadow-xl' : 'text-slate-400'}`}>
            {t.opticalScanner}
          </button>
        </div>
      </header>

      <div className="bg-white p-4 rounded-[4.5rem] shadow-2xl border border-slate-100 min-h-[700px] flex flex-col relative overflow-hidden">
        {activeTab === 'docs' ? (
          <div className="flex-1 flex flex-col items-center justify-center p-6 md:p-12 animate-fadeIn">
            {!preview ? (
              <div className="text-center space-y-8 w-full max-w-md">
                <div className="w-40 h-40 bg-emerald-50 rounded-[3rem] flex items-center justify-center text-6xl shadow-inner mx-auto border-2 border-emerald-100">📄</div>
                <div className="space-y-4">
                  <h3 className="text-2xl font-black text-slate-900 uppercase tracking-tighter">{t.docAnalysisTitle}</h3>
                  <p className="text-slate-400 text-[10px] font-black uppercase tracking-[0.3em]">{t.docAnalysisDesc}</p>
                </div>
                
                <div className="grid grid-cols-2 gap-4">
                  <button 
                    onClick={() => setDocType('exam')} 
                    className={`p-4 rounded-2xl border-2 transition-all font-black text-[10px] uppercase tracking-widest ${docType === 'exam' ? 'border-emerald-500 bg-emerald-50 text-emerald-700' : 'border-slate-100 text-slate-400'}`}
                  >
                    🧪 {t.exam}
                  </button>
                  <button 
                    onClick={() => setDocType('prescription')} 
                    className={`p-4 rounded-2xl border-2 transition-all font-black text-[10px] uppercase tracking-widest ${docType === 'prescription' ? 'border-emerald-500 bg-emerald-50 text-emerald-700' : 'border-slate-100 text-slate-400'}`}
                  >
                    💊 {t.prescription}
                  </button>
                </div>

                <div className="space-y-4 pt-4">
                  <button onClick={startCamera} className="w-full bg-slate-950 text-white py-6 rounded-[2rem] font-black text-xs uppercase tracking-widest shadow-xl hover:bg-emerald-600 transition-all">{t.captureCamera}</button>
                  <label className="block w-full bg-white border-2 border-slate-100 text-slate-600 py-6 rounded-[2rem] font-black text-xs uppercase tracking-widest cursor-pointer hover:bg-slate-50 transition-all text-center">
                    {t.selectGallery}
                    <input 
                      type="file" 
                      accept="image/*" 
                      className="hidden" 
                      onChange={(e) => {
                        const file = e.target.files?.[0];
                        if (file) {
                          const reader = new FileReader();
                          reader.onloadend = () => setPreview(reader.result as string);
                          reader.readAsDataURL(file);
                        }
                      }}
                    />
                  </label>
                </div>
              </div>
            ) : (
              <div className="w-full max-w-md space-y-8 animate-slideUp">
                <div className="relative">
                  <img src={preview} className="w-full rounded-[3rem] shadow-2xl border-8 border-white" alt="Documento" />
                  <div className="absolute top-6 right-6 bg-emerald-500 text-white px-4 py-1 rounded-full font-black text-[8px] uppercase">{docType === 'exam' ? t.exam : t.prescription}</div>
                </div>
                <div className="flex gap-4">
                  <button onClick={() => setPreview(null)} className="flex-1 bg-slate-100 text-slate-500 py-5 rounded-3xl font-black text-[10px] uppercase tracking-widest">{t.discard}</button>
                  <button 
                    onClick={runAnalysis} 
                    disabled={loading}
                    className="flex-[2] bg-emerald-600 text-white py-5 rounded-3xl font-black text-[10px] uppercase tracking-widest shadow-lg flex items-center justify-center gap-2"
                  >
                    {loading ? <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin"></div> : t.analyzeAI}
                  </button>
                </div>
              </div>
            )}
          </div>
        ) : activeTab === 'sync' ? (
          <div className="flex-1 flex flex-col p-6 md:p-12">
            {syncStatus === 'idle' ? (
              <div className="flex-1 flex flex-col items-center justify-center space-y-12 animate-fadeIn">
                <div className="relative group cursor-pointer" onClick={startAutoDiscovery}>
                   <div className="w-56 h-56 bg-slate-50 rounded-full flex items-center justify-center text-8xl shadow-inner border-2 border-dashed border-slate-200 group-hover:border-blue-500 transition-all">🔌</div>
                   <div className="absolute inset-0 rounded-full border-4 border-blue-500/0 group-hover:border-blue-500/20 animate-ping"></div>
                   <div className="absolute -top-4 -right-4 bg-emerald-600 text-white px-6 py-2 rounded-2xl font-black text-[10px] shadow-2xl uppercase">Auto-Detect</div>
                </div>
                <div className="text-center max-w-lg space-y-6">
                  <h3 className="text-3xl font-black text-slate-900 uppercase tracking-tighter">{t.autoDetection}</h3>
                  <p className="text-slate-400 text-[10px] font-black uppercase tracking-[0.4em] leading-relaxed">
                    {t.autoDetectionDesc}
                  </p>
                  <button 
                    onClick={startAutoDiscovery}
                    className="bg-slate-950 text-white px-16 py-6 rounded-[2.5rem] font-black text-xs uppercase tracking-[0.2em] shadow-2xl hover:bg-emerald-600 transition-all active:scale-95"
                  >
                    {t.searchConnectedDevices}
                  </button>
                </div>
              </div>
            ) : syncStatus === 'searching' ? (
              <div className="flex-1 flex flex-col items-center justify-center space-y-10 animate-fadeIn">
                 <div className="relative w-80 h-80 flex items-center justify-center">
                    <div className="absolute inset-0 border-4 border-blue-500/20 rounded-full animate-ping"></div>
                    <div className="absolute inset-10 border-4 border-blue-500/10 rounded-full animate-ping [animation-delay:0.5s]"></div>
                    <div className="absolute inset-20 border-4 border-blue-500/5 rounded-full animate-ping [animation-delay:1s]"></div>
                    <div className="w-32 h-32 bg-blue-600 text-white rounded-full flex items-center justify-center text-4xl shadow-3xl animate-pulse">📡</div>
                 </div>
                 <div className="text-center space-y-2">
                    <h4 className="text-2xl font-black text-slate-900 uppercase tracking-tighter">{t.searchingHardware}</h4>
                    <p className="text-blue-600 text-[10px] font-black uppercase tracking-widest animate-pulse">{t.usbScanActive}</p>
                 </div>
              </div>
            ) : syncStatus === 'installing' ? (
              <div className="flex-1 flex flex-col items-center justify-center space-y-12 py-20 animate-fadeIn">
                 <div className="w-24 h-24 bg-emerald-600 text-white rounded-[2.5rem] flex items-center justify-center text-5xl shadow-3xl animate-spin-slow">📥</div>
                 <div className="w-full max-w-md space-y-6">
                    <div className="text-center">
                       <h4 className="text-xl font-black text-slate-900 uppercase tracking-tight">{t.syncingSystem}</h4>
                       <p className="text-slate-400 text-[10px] font-black uppercase tracking-widest mt-1">{installationStep}</p>
                    </div>
                    <div className="h-4 bg-slate-100 rounded-full overflow-hidden p-1 shadow-inner">
                       <div className="h-full bg-emerald-600 rounded-full transition-all duration-300 relative shadow-[0_0_15px_rgba(16,185,129,0.5)]" style={{ width: `${installationProgress}%` }}>
                          <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/40 to-transparent animate-shimmer"></div>
                       </div>
                    </div>
                 </div>
              </div>
            ) : (
              <div className="flex-1 flex flex-col animate-slideUp">
                 <div className="bg-slate-950 text-white p-10 md:p-14 rounded-[3.5rem] shadow-3xl flex flex-col md:flex-row items-center justify-between gap-10 border-b-[12px] border-blue-600 relative overflow-hidden">
                    <div className="flex items-center gap-8 relative z-10">
                       <div className="w-24 h-24 bg-blue-500 text-slate-950 rounded-[2.5rem] flex items-center justify-center text-5xl shadow-2xl relative">
                          {connectedDevice?.appIcon}
                          {syncStatus === 'scanning' && <div className="absolute inset-0 rounded-[2.5rem] border-4 border-white animate-ping opacity-30"></div>}
                       </div>
                       <div>
                          <div className="flex items-center gap-3 mb-2">
                             <span className="bg-blue-500 text-slate-950 px-4 py-1 rounded-full text-[9px] font-black uppercase tracking-[0.2em] shadow-lg">{t.hardwareOnline}</span>
                             <span className={`px-3 py-1 rounded-full text-[8px] font-black uppercase border ${syncStatus === 'scanning' ? 'bg-red-500/20 text-red-400 border-red-500/30' : 'bg-white/10 text-white border-white/20'}`}>
                                {syncStatus === 'scanning' ? t.varreduraEmCurso : t.sistemaPronto}
                             </span>
                          </div>
                          <h4 className="text-3xl font-black uppercase tracking-tighter">{connectedDevice?.name}</h4>
                          <p className="text-slate-400 text-xs font-bold uppercase tracking-widest">{connectedDevice?.manufacturer} • V.{connectedDevice?.version}</p>
                       </div>
                    </div>

                    <div className="flex flex-col gap-3 w-full md:w-auto relative z-10">
                       <button 
                         onClick={startScanningDevice} 
                         disabled={syncStatus === 'scanning' || syncStatus === 'analyzing'} 
                         className={`bg-emerald-500 text-slate-950 px-24 py-10 rounded-[2.5rem] font-black text-xl uppercase tracking-[0.2em] shadow-[0_20px_60px_rgba(16,185,129,0.4)] hover:bg-emerald-400 transition-all active:scale-90 flex flex-col items-center justify-center gap-2 ${syncStatus === 'scanning' ? 'opacity-50 cursor-not-allowed' : 'hover:scale-105 animate-pulse'}`}
                       >
                          {syncStatus === 'scanning' ? (
                             <>
                                <div className="w-8 h-8 border-4 border-slate-950/20 border-t-slate-950 rounded-full animate-spin mb-1"></div>
                                <span className="text-sm uppercase">{t.processing}</span>
                             </>
                          ) : (
                             <>
                                <span className="text-4xl mb-1">⚡</span>
                                {t.startScanner}
                             </>
                          )}
                       </button>
                       <button onClick={() => setSyncStatus('idle')} className="text-[10px] font-black text-slate-500 uppercase tracking-widest text-center hover:text-white transition-colors">{t.disconnectDevice}</button>
                    </div>
                    
                    <div className="absolute bottom-0 left-0 right-0 h-1/2 bg-gradient-to-t from-blue-500/5 to-transparent pointer-events-none"></div>
                 </div>

                 <div className="mt-10 grid grid-cols-1 lg:grid-cols-12 gap-10 flex-1">
                    <div className="lg:col-span-8 bg-slate-50 rounded-[3rem] p-10 border border-slate-100 shadow-inner flex flex-col space-y-8">
                       <div className="flex justify-between items-center">
                          <h5 className="text-[10px] font-black text-slate-400 uppercase tracking-[0.3em]">Monitor de Telemetria Quântica</h5>
                          <div className="flex gap-4">
                             {syncStatus === 'scanning' && (
                                <div className="flex gap-2 items-center">
                                   <span className="w-2 h-2 bg-red-500 rounded-full animate-ping"></span>
                                   <span className="text-[9px] font-mono text-red-600 font-black">TRANSMISSÃO_ATIVA</span>
                                </div>
                             )}
                             <span className="text-[9px] font-mono text-emerald-600 font-black">SYNC_LEVEL: 100%</span>
                          </div>
                       </div>
                       
                       <div className="flex-1 flex items-end gap-1 h-64 overflow-hidden py-4 bg-white rounded-3xl border border-slate-100 shadow-inner">
                          {telemetryValues.map((v, i) => (
                            <div 
                              key={i} 
                              className={`flex-1 rounded-t-lg transition-all duration-100 ${syncStatus === 'scanning' ? 'bg-emerald-500 shadow-[0_0_15px_rgba(16,185,129,0.3)]' : 'bg-blue-100'}`} 
                              style={{ 
                                height: `${v}%`, 
                                opacity: 0.3 + (i / telemetryValues.length) * 0.7,
                              }}
                            ></div>
                          ))}
                          {telemetryValues.length === 0 && <div className="flex-1 h-full flex items-center justify-center text-slate-200 font-black text-xl uppercase tracking-[0.5em]">Aguardando Início do Scanner</div>}
                       </div>

                       {syncStatus === 'scanning' && (
                          <div className="space-y-4 animate-fadeIn">
                             <div className="h-4 bg-slate-200 rounded-full overflow-hidden p-0.5 shadow-inner">
                                <div className="h-full bg-emerald-500 rounded-full transition-all duration-500 shadow-[0_0_20px_rgba(16,185,129,0.6)]" style={{ width: `${scanProgress}%` }}></div>
                             </div>
                             <div className="flex justify-between items-center px-2">
                                <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Coletando amostras de ressonância...</p>
                                <span className="text-xl font-mono text-emerald-600 font-black">{Math.floor(scanProgress)}%</span>
                             </div>
                          </div>
                       )}
                    </div>

                    <div className="lg:col-span-4 space-y-6">
                       <div className="bg-white p-8 rounded-[2.5rem] border border-slate-100 shadow-sm space-y-6">
                          <h6 className="text-[9px] font-black text-slate-400 uppercase tracking-widest border-b pb-4">Parâmetros de Conexão</h6>
                          <div className="space-y-4">
                             <div className="flex justify-between items-center bg-slate-50 p-4 rounded-2xl">
                                <span className="text-xs font-bold text-slate-600">Protocolo</span>
                                <span className="font-mono text-[10px] font-black text-blue-600 uppercase">NSO-LINK V2</span>
                             </div>
                             <div className="flex justify-between items-center bg-slate-50 p-4 rounded-2xl">
                                <span className="text-xs font-bold text-slate-600">Latência</span>
                                <span className="font-mono text-[10px] font-black text-emerald-600">0.2ms</span>
                             </div>
                             <div className="flex justify-between items-center bg-slate-50 p-4 rounded-2xl">
                                <span className="text-xs font-bold text-slate-600">Frequência</span>
                                <span className="font-mono text-[10px] font-black text-amber-600">528 Hz BASE</span>
                             </div>
                          </div>
                       </div>

                       <div className="bg-slate-900 text-white p-8 rounded-[3rem] shadow-2xl relative overflow-hidden">
                          <div className="relative z-10 space-y-4">
                             <h6 className="text-[9px] font-black text-emerald-400 uppercase tracking-widest">Dica de Operação</h6>
                             <p className="text-[11px] font-medium leading-relaxed italic opacity-80">
                               "Para maior precisão na detecção de patógenos, assegure-se de que o paciente esteja relaxado e sem metais no corpo durante a varredura magnética."
                             </p>
                          </div>
                       </div>
                    </div>
                 </div>
              </div>
            )}
          </div>
        ) : (
          <div className="flex-1 flex flex-col items-center justify-center p-10 animate-fadeIn">
            {!preview ? (
              <div className="text-center space-y-10">
                 <div className="w-44 h-44 bg-slate-50 rounded-[4rem] flex items-center justify-center text-7xl shadow-inner mx-auto border-2 border-slate-100">👁️</div>
                 <div className="space-y-4">
                    <h3 className="text-3xl font-black text-slate-900 uppercase tracking-tighter">Scanner Óptico & Iridologia</h3>
                    <p className="text-slate-400 text-xs font-black uppercase tracking-[0.3em] max-w-sm mx-auto">Captura assistida para diagnóstico clínico via IA NSOFISION.</p>
                 </div>
                 <button onClick={startCamera} className="bg-slate-950 text-white px-24 py-7 rounded-[2.5rem] font-black text-xs uppercase tracking-widest shadow-2xl hover:bg-emerald-600 transition-all active:scale-95">Abrir Câmera do Sistema</button>
                 
                 {isCameraActive && (
                   <div className="fixed inset-0 z-[1000] bg-black flex flex-col items-center justify-center">
                     <video ref={videoRef} autoPlay playsInline className="w-full h-full object-cover" />
                     <div className="absolute inset-0 border-[80px] border-black/60 pointer-events-none flex items-center justify-center">
                        <div className="w-80 h-80 border-2 border-emerald-500/30 rounded-full flex items-center justify-center">
                           <div className="w-6 h-6 bg-emerald-500 rounded-full animate-ping"></div>
                        </div>
                     </div>
                     <div className="absolute bottom-20 flex items-center gap-12">
                        <button onClick={() => {
                          if (videoRef.current?.srcObject) {
                            (videoRef.current.srcObject as MediaStream).getTracks().forEach(t => t.stop());
                            videoRef.current.pause();
                            videoRef.current.srcObject = null;
                          }
                          setIsCameraActive(false);
                        }} className="bg-white/10 text-white px-12 py-6 rounded-3xl font-black text-[10px] uppercase backdrop-blur-xl border border-white/10">Cancelar</button>
                        <button onClick={takePhoto} className="w-28 h-28 bg-white rounded-full border-[12px] border-slate-400 shadow-[0_0_80px_rgba(255,255,255,0.4)] active:scale-90 transition-all"></button>
                        <div className="w-28"></div>
                     </div>
                   </div>
                 )}
              </div>
            ) : (
              <div className="w-full max-w-2xl space-y-10 py-10 animate-slideUp">
                <div className="relative group">
                   <img src={preview} className="w-full rounded-[4rem] shadow-3xl border-[16px] border-white group-hover:brightness-105 transition-all" alt="Exame" />
                   <div className="absolute top-10 right-10 bg-emerald-500 text-slate-950 px-6 py-2 rounded-full font-black text-[10px] uppercase shadow-2xl">Capture Ready</div>
                </div>
                <div className="flex gap-6">
                   <button onClick={() => setPreview(null)} className="flex-1 bg-slate-100 text-slate-500 py-7 rounded-[2.5rem] font-black text-xs uppercase tracking-widest hover:bg-slate-200 transition-all">Descartar</button>
                   <button onClick={runAnalysis} className="flex-[2] bg-slate-950 text-white py-7 rounded-[2.5rem] font-black text-sm uppercase tracking-widest shadow-2xl hover:bg-emerald-700 transition-all">Processar Dados com IA</button>
                </div>
              </div>
            )}
          </div>
        )}
      </div>

      {report && (
        <div className="bg-emerald-50 p-14 rounded-[4rem] border border-emerald-100 animate-slideUp shadow-xl space-y-12 relative overflow-hidden">
          <div className="flex items-center gap-6 relative z-10">
             <div className="w-20 h-20 bg-emerald-600 text-white rounded-[2rem] flex items-center justify-center text-4xl shadow-xl">🧠</div>
             <div>
                <h3 className="text-3xl font-black text-emerald-900 uppercase tracking-tighter leading-none">Resultados de Ressonância</h3>
                <p className="text-emerald-700/60 text-xs font-black uppercase tracking-widest mt-1">Conclusão Analítica NSOFISION Intelligence</p>
             </div>
          </div>
          <div className="bg-white/70 backdrop-blur-md p-10 rounded-[3rem] border border-white shadow-inner relative z-10">
             <p className="text-emerald-900 leading-relaxed font-medium italic text-xl text-center px-4">"{report.summary}"</p>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-8 relative z-10">
             {report.suggestedProtocols.map((p, i) => (
               <div key={i} className="bg-white p-12 rounded-[4rem] shadow-sm border border-emerald-100 hover:shadow-2xl transition-all group active:scale-95 cursor-pointer">
                  <div className="flex items-center gap-4 mb-6">
                     <span className="text-3xl group-hover:rotate-12 transition-transform">📜</span>
                     <div>
                        <h4 className="font-black text-emerald-600 uppercase text-[10px] tracking-widest">{p.therapy}</h4>
                        <p className="text-slate-900 font-black text-xl tracking-tight leading-none mt-1">Protocolo Ativo</p>
                     </div>
                  </div>
                  <p className="text-slate-600 font-medium text-sm leading-relaxed">{p.instructions}</p>
                  <div className="mt-8 pt-6 border-t border-slate-50 flex justify-between items-center opacity-40 group-hover:opacity-100 transition-opacity">
                     <span className="text-[10px] font-black uppercase tracking-widest">Eficácia Garantida</span>
                     <span className="text-emerald-600 text-lg">➔</span>
                  </div>
               </div>
             ))}
          </div>

          {/* Save Actions */}
          <div className="pt-10 border-t border-emerald-200/50 flex flex-wrap gap-4 justify-center relative z-10">
            <button 
              onClick={() => handleSave('pdf')}
              disabled={!!isSaving}
              className="bg-white text-slate-900 px-8 py-4 rounded-2xl font-black text-[10px] uppercase tracking-widest shadow-xl hover:bg-emerald-50 transition-all flex items-center gap-3 border border-emerald-100"
            >
              {isSaving === 'pdf' ? <RefreshCw size={18} className="animate-spin" /> : <FileDown size={18} className="text-emerald-600" />}
              Salvar PDF
            </button>
            <button 
              onClick={() => handleSave('word')}
              disabled={!!isSaving}
              className="bg-white text-slate-900 px-8 py-4 rounded-2xl font-black text-[10px] uppercase tracking-widest shadow-xl hover:bg-blue-50 transition-all flex items-center gap-3 border border-blue-100"
            >
              {isSaving === 'word' ? <RefreshCw size={18} className="animate-spin" /> : <FileText size={18} className="text-blue-600" />}
              Salvar Word
            </button>
            <button 
              onClick={() => handleSave('zip')}
              disabled={!!isSaving}
              className="bg-purple-50 text-purple-700 px-8 py-4 rounded-2xl font-black text-[10px] uppercase tracking-widest shadow-xl hover:bg-purple-100 transition-all flex items-center gap-3 border border-purple-200"
            >
              {isSaving === 'zip' ? <RefreshCw size={18} className="animate-spin" /> : <FolderArchive size={18} className="text-purple-600" />}
              Baixar Pasta
            </button>
            <button 
              onClick={() => handleSave('cloud')}
              disabled={!!isSaving}
              className="bg-slate-900 text-white px-8 py-4 rounded-2xl font-black text-[10px] uppercase tracking-widest shadow-xl hover:bg-slate-800 transition-all flex items-center gap-3"
            >
              {isSaving === 'cloud' ? <RefreshCw size={18} className="animate-spin" /> : <Cloud size={18} className="text-emerald-400" />}
              Nuvem NSO
            </button>
          </div>

          <div className="absolute -bottom-20 -right-20 w-96 h-96 bg-emerald-500/10 rounded-full blur-[120px] pointer-events-none"></div>
        </div>
      )}

      <style>{`
        @keyframes shimmer {
          0% { transform: translateX(-100%); }
          100% { transform: translateX(100%); }
        }
        .animate-shimmer {
          animation: shimmer 1.5s infinite;
        }
        .animate-spin-slow {
          animation: spin 8s linear infinite;
        }
        @keyframes spin {
          from { transform: rotate(0deg); }
          to { transform: rotate(360deg); }
        }
      `}</style>
    </div>
  );
};
