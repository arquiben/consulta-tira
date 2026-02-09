
import React, { useState, useRef, useEffect } from 'react';
import { generateTherapyReport } from '../services/gemini';
import { AnalysisReport, PatientData } from '../types';
import { translations } from '../translations';
import { speakText } from '../services/tts';

interface ExamAnalysisProps {
  patientData: PatientData | null;
  onAnalysisComplete?: (report: AnalysisReport) => void;
}

const UNIVERSAL_HARDWARE_CATALOG = [
  { id: 'QRMA-V4', name: 'Quantum Resonance Magnetic Analyzer (4)', series: 'Series 4.0 Gold', version: 'v4.7.2', manufacturer: 'NSOFISION Tech', type: 'usb', appIcon: '🌀', dataModel: 'Análise de Ressonância Bio-Magnética' },
  { id: 'NSO-Q-2026', name: 'Analisador Bio-Quântico NSO', series: 'Series X', version: 'v4.2 Gold', manufacturer: 'NSOFISION Industries', type: 'usb', appIcon: '🌌', dataModel: 'Telemetria de Frequências' },
  { id: 'BIOMAG-PRO-7', name: 'Biomagnetômetro Digital Pro', series: 'Elite 7', version: 'v7.0.1', manufacturer: 'Quantum Labs', type: 'usb', appIcon: '🧲', dataModel: 'Fluxo Magnético' },
  { id: 'IRIS-SCOPE-X', name: 'Iridoscópio Digital NSO-X', series: 'Vision Pro', version: 'v5.0', manufacturer: 'NSO Vision', type: 'usb', appIcon: '👁️', dataModel: 'Mapeamento de Íris' },
];

export const ExamAnalysis: React.FC<ExamAnalysisProps> = ({ patientData, onAnalysisComplete }) => {
  const [preview, setPreview] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [report, setReport] = useState<AnalysisReport | null>(null);
  const [isCameraActive, setIsCameraActive] = useState(false);
  const [activeTab, setActiveTab] = useState<'scan' | 'sync'>('sync');
  
  const [syncStatus, setSyncStatus] = useState<'idle' | 'installing' | 'ready' | 'scanning' | 'analyzing'>('idle');
  const [installationProgress, setInstallationProgress] = useState(0);
  const [scanProgress, setScanProgress] = useState(0);
  const [installationStep, setInstallationStep] = useState('');
  const [connectedDevice, setConnectedDevice] = useState<any | null>(null);
  const [telemetryValues, setTelemetryValues] = useState<number[]>([]);
  
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    let interval: any;
    if (syncStatus === 'scanning' || syncStatus === 'analyzing') {
      interval = setInterval(() => {
        setTelemetryValues(prev => {
          const next = [...prev, Math.random() * 100];
          return next.slice(-50);
        });
      }, 50);
    } else if (syncStatus === 'ready') {
      interval = setInterval(() => {
        setTelemetryValues(prev => {
          const next = [...prev, 10 + Math.random() * 20];
          return next.slice(-50);
        });
      }, 200);
    }
    return () => clearInterval(interval);
  }, [syncStatus]);

  const handleUSBPlugIn = (device: any) => {
    setSyncStatus('installing');
    setInstallationProgress(0);
    setInstallationStep(`Sincronizando ${device.name}...`);
    
    speakText(`Dispositivo ${device.name} detectado. Iniciando instalação do setup oficial.`);

    const steps = [
      "Identificando Hardware...",
      "Baixando Drivers NSO...",
      "Sincronizando Banco de Dados...",
      "Validando Protocolos...",
      "Ambiente de Ressonância Pronto."
    ];

    let currentStepIdx = 0;
    const interval = setInterval(() => {
      setInstallationProgress(prev => {
        if (prev >= 100) {
          clearInterval(interval);
          setConnectedDevice(device);
          setSyncStatus('ready');
          speakText(`Ambiente preparado. Clique no botão de escaneamento para o dispositivo começar a trabalhar.`);
          return 100;
        }
        const newProgress = prev + 4;
        const stepIdx = Math.floor((newProgress / 100) * steps.length);
        if (stepIdx !== currentStepIdx && stepIdx < steps.length) {
            currentStepIdx = stepIdx;
            setInstallationStep(steps[stepIdx]);
        }
        return newProgress;
      });
    }, 80);
  };

  const startScanningDevice = () => {
    if (!patientData) {
      alert("Selecione um paciente para o dispositivo começar a trabalhar.");
      return;
    }
    setSyncStatus('scanning');
    setScanProgress(0);
    speakText("O dispositivo começou a trabalhar. Iniciando varredura quântica de ressonância.");

    const interval = setInterval(() => {
      setScanProgress(prev => {
        if (prev >= 100) {
          clearInterval(interval);
          setSyncStatus('analyzing');
          runAnalysis();
          return 100;
        }
        return prev + 0.5;
      });
    }, 30);
  };

  const runAnalysis = async () => {
    setLoading(true);
    speakText("Varredura finalizada. O núcleo IA está processando os dados coletados.");
    
    try {
      const prompt = `Analise a telemetria do dispositivo ${connectedDevice?.name}. Paciente: ${patientData?.name}, Queixas: ${patientData?.complaints}. Forneça protocolos de Biomagnetismo e Acupuntura baseados nos dados de ressonância.`;
      const result = await generateTherapyReport(prompt, preview?.split(',')[1], patientData);
      setReport(result);
      if (onAnalysisComplete) onAnalysisComplete(result);
      setSyncStatus('ready');
      speakText("Análise concluída. Protocolos sugeridos já estão no relatório.");
    } catch (err) {
      console.error(err);
      setSyncStatus('ready');
      speakText("Erro na análise quântica. Verifique a conexão USB.");
    } finally {
      setLoading(false);
    }
  };

  const startCamera = async () => {
    setIsCameraActive(true);
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ 
        video: { facingMode: 'environment' } 
      });
      if (videoRef.current) videoRef.current.srcObject = stream;
    } catch (err) {
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
        if (videoRef.current.srcObject) (videoRef.current.srcObject as MediaStream).getTracks().forEach(t => t.stop());
        setIsCameraActive(false);
      }
    }
  };

  return (
    <div className="space-y-8 pb-32 animate-fadeIn">
      <header className="flex flex-col md:flex-row justify-between items-start md:items-end gap-6">
        <div>
          <h2 className="text-3xl font-black text-slate-900 tracking-tighter uppercase italic">Laboratório Digital Consulfision</h2>
          <p className="text-slate-500 font-medium italic">Ambiente de Hardware Bio-Integrativo.</p>
        </div>
        <div className="flex bg-slate-100 p-1.5 rounded-3xl shadow-inner shrink-0">
          <button onClick={() => setActiveTab('sync')} className={`px-8 py-3 rounded-2xl font-black text-[10px] uppercase tracking-widest transition-all ${activeTab === 'sync' ? 'bg-white text-blue-900 shadow-md' : 'text-slate-400'}`}>
            Dispositivos USB
          </button>
          <button onClick={() => setActiveTab('scan')} className={`px-8 py-3 rounded-2xl font-black text-[10px] uppercase tracking-widest transition-all ${activeTab === 'scan' ? 'bg-white text-slate-900 shadow-md' : 'text-slate-400'}`}>
            Scanner Óptico
          </button>
        </div>
      </header>

      <div className="bg-white p-2 rounded-[4rem] shadow-sm border border-slate-100 min-h-[650px] flex flex-col relative overflow-hidden group">
        {activeTab === 'sync' ? (
          <div className="flex-1 flex flex-col p-6 md:p-12">
            {syncStatus === 'idle' ? (
              <div className="flex-1 flex flex-col items-center justify-center space-y-12 animate-fadeIn">
                <div className="relative">
                   <div className="w-40 h-40 bg-slate-50 rounded-full flex items-center justify-center text-7xl animate-pulse">🔌</div>
                   <div className="absolute -top-4 -right-4 bg-blue-600 text-white px-4 py-2 rounded-2xl font-black text-[10px] shadow-2xl animate-bounce uppercase">Plug-in USB</div>
                </div>
                <div className="text-center max-w-lg space-y-4">
                  <h3 className="text-2xl font-black text-slate-900 uppercase tracking-tighter">Conectar Quantum Resonance</h3>
                  <p className="text-slate-400 text-xs font-black uppercase tracking-[0.3em] leading-relaxed">
                    Selecione o modelo do dispositivo para simular a detecção e o setup do ambiente de trabalho.
                  </p>
                </div>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4 w-full">
                  {UNIVERSAL_HARDWARE_CATALOG.map(device => (
                    <button key={device.id} onClick={() => handleUSBPlugIn(device)} className="p-6 bg-slate-50 rounded-[2.5rem] border border-slate-100 hover:border-blue-500 hover:bg-white hover:shadow-2xl transition-all group/card flex flex-col items-center text-center gap-3 active:scale-95">
                       <span className="text-4xl group-hover/card:scale-110 transition-transform">{device.appIcon}</span>
                       <span className="font-black text-[9px] uppercase leading-none text-slate-700">{device.name}</span>
                    </button>
                  ))}
                </div>
              </div>
            ) : syncStatus === 'installing' ? (
              <div className="flex-1 flex flex-col items-center justify-center space-y-12 py-20 animate-fadeIn">
                 <div className="w-24 h-24 bg-blue-600 text-white rounded-[2rem] flex items-center justify-center text-5xl shadow-3xl animate-spin-slow">📥</div>
                 <div className="w-full max-w-md space-y-6">
                    <div className="text-center">
                       <h4 className="text-xl font-black text-slate-900 uppercase tracking-tight">Preparando Dispositivo</h4>
                       <p className="text-slate-400 text-[10px] font-black uppercase tracking-widest mt-1">{installationStep}</p>
                    </div>
                    <div className="h-4 bg-slate-100 rounded-full overflow-hidden p-1 shadow-inner">
                       <div className="h-full bg-blue-600 rounded-full transition-all duration-300 relative" style={{ width: `${installationProgress}%` }}>
                          <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/40 to-transparent animate-shimmer"></div>
                       </div>
                    </div>
                 </div>
              </div>
            ) : (
              /* AMBIENTE DE TRABALHO APÓS SETUP */
              <div className="flex-1 flex flex-col animate-slideUp">
                 <div className="bg-slate-950 text-white p-10 md:p-14 rounded-[3.5rem] shadow-3xl flex flex-col md:flex-row items-center justify-between gap-10 border-b-[12px] border-emerald-500 relative overflow-hidden">
                    <div className="flex items-center gap-8 relative z-10">
                       <div className="w-24 h-24 bg-emerald-500 text-slate-950 rounded-[2.5rem] flex items-center justify-center text-5xl shadow-2xl relative">
                          {connectedDevice?.appIcon}
                          {syncStatus === 'scanning' && <div className="absolute inset-0 rounded-[2.5rem] border-4 border-white animate-ping opacity-30"></div>}
                       </div>
                       <div>
                          <div className="flex items-center gap-3 mb-2">
                             <span className="bg-emerald-500 text-slate-950 px-4 py-1 rounded-full text-[9px] font-black uppercase tracking-[0.2em] shadow-lg">AMB: PRONTO</span>
                             <span className={`px-3 py-1 rounded-full text-[8px] font-black uppercase border ${syncStatus === 'scanning' ? 'bg-red-500/20 text-red-400 border-red-500/30' : 'bg-white/10 text-white border-white/20'}`}>
                                STATUS: {syncStatus === 'scanning' ? 'TRABALHANDO...' : 'AGUARDANDO'}
                             </span>
                          </div>
                          <h4 className="text-3xl font-black uppercase tracking-tighter">{connectedDevice?.name}</h4>
                          <p className="text-slate-400 text-xs font-bold uppercase tracking-widest">{connectedDevice?.manufacturer} • PORTA USB 01</p>
                       </div>
                    </div>

                    <div className="flex flex-col gap-3 w-full md:w-auto relative z-10">
                       {/* BOTÃO PRINCIPAL DE TRABALHO / ESCANEAMENTO */}
                       <button 
                         onClick={startScanningDevice} 
                         disabled={syncStatus === 'scanning' || syncStatus === 'analyzing'} 
                         className={`bg-emerald-500 text-slate-950 px-24 py-10 rounded-[2.5rem] font-black text-xl uppercase tracking-[0.2em] shadow-[0_20px_60px_rgba(16,185,129,0.4)] hover:bg-emerald-400 transition-all active:scale-90 flex flex-col items-center justify-center gap-2 ${syncStatus === 'scanning' ? 'opacity-50 cursor-not-allowed' : 'hover:scale-105'}`}
                       >
                          {syncStatus === 'scanning' ? (
                             <>
                                <div className="w-8 h-8 border-4 border-slate-950/20 border-t-slate-950 rounded-full animate-spin mb-1"></div>
                                <span className="text-sm">ESCANER ATIVO</span>
                             </>
                          ) : (
                             <>
                                <span className="text-4xl mb-1">⚡</span>
                                ESCANEAR AGORA
                             </>
                          )}
                       </button>
                       <button onClick={() => setSyncStatus('idle')} className="text-[10px] font-black text-slate-500 uppercase tracking-widest text-center hover:text-white transition-colors">Encerrar Sessão</button>
                    </div>
                    
                    {/* Visual Waves Backdrop */}
                    <div className="absolute bottom-0 left-0 right-0 h-1/2 bg-gradient-to-t from-emerald-500/5 to-transparent pointer-events-none"></div>
                 </div>

                 <div className="mt-10 grid grid-cols-1 lg:grid-cols-12 gap-10 flex-1">
                    <div className="lg:col-span-8 bg-slate-50 rounded-[3rem] p-10 border border-slate-100 shadow-inner flex flex-col space-y-8">
                       <div className="flex justify-between items-center">
                          <h5 className="text-[10px] font-black text-slate-400 uppercase tracking-[0.3em]">Ambiente de Telemetria (Ressonância)</h5>
                          <div className="flex gap-4">
                             {syncStatus === 'scanning' && (
                                <div className="flex gap-2 items-center">
                                   <span className="w-2 h-2 bg-red-500 rounded-full animate-ping"></span>
                                   <span className="text-[9px] font-mono text-red-600 font-black">DISPOSITIVO_TRABALHANDO</span>
                                </div>
                             )}
                             <span className="text-[9px] font-mono text-emerald-600 font-black">FREQ_SYNC: 528Hz</span>
                          </div>
                       </div>
                       
                       <div className="flex-1 flex items-end gap-1 h-64 overflow-hidden py-4 bg-white/50 rounded-3xl border border-slate-100/50">
                          {telemetryValues.map((v, i) => (
                            <div 
                              key={i} 
                              className={`flex-1 rounded-t-lg transition-all duration-100 ${syncStatus === 'scanning' ? 'bg-emerald-500 shadow-[0_0_15px_rgba(16,185,129,0.3)]' : 'bg-slate-200'}`} 
                              style={{ 
                                height: `${v}%`, 
                                opacity: 0.2 + (i / telemetryValues.length) * 0.8,
                                transitionTimingFunction: 'cubic-bezier(0.4, 0, 0.2, 1)'
                              }}
                            ></div>
                          ))}
                          {telemetryValues.length === 0 && <div className="flex-1 h-full flex items-center justify-center text-slate-200 font-black text-2xl uppercase tracking-[0.4em] rotate-[-5deg]">O Escâner está ocioso</div>}
                       </div>

                       {syncStatus === 'scanning' && (
                          <div className="space-y-4 animate-fadeIn">
                             <div className="h-3 bg-slate-200 rounded-full overflow-hidden p-0.5 shadow-inner">
                                <div className="h-full bg-emerald-500 rounded-full transition-all duration-500 shadow-[0_0_20px_rgba(16,185,129,0.6)]" style={{ width: `${scanProgress}%` }}></div>
                             </div>
                             <div className="flex justify-between items-center px-2">
                                <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Varredura Quântica Integral...</p>
                                <span className="text-xl font-mono text-emerald-600 font-black">{Math.floor(scanProgress)}%</span>
                             </div>
                          </div>
                       )}
                    </div>

                    <div className="lg:col-span-4 space-y-6">
                       <div className="bg-white p-8 rounded-[2.5rem] border border-slate-100 shadow-sm space-y-6">
                          <h6 className="text-[9px] font-black text-slate-400 uppercase tracking-widest border-b pb-4">Parâmetros Bio-Digitais</h6>
                          <div className="space-y-4">
                             <div className="flex justify-between items-center bg-slate-50 p-4 rounded-2xl">
                                <span className="text-xs font-bold text-slate-600">Equipamento</span>
                                <span className="font-mono text-xs font-black text-emerald-600">QRMA v4.0 Gold</span>
                             </div>
                             <div className="flex justify-between items-center bg-slate-50 p-4 rounded-2xl">
                                <span className="text-xs font-bold text-slate-600">Conexão</span>
                                <span className="font-mono text-xs font-black text-blue-600">ESTÁVEL</span>
                             </div>
                             <div className="flex justify-between items-center bg-slate-50 p-4 rounded-2xl">
                                <span className="text-xs font-bold text-slate-600">Bateria/USB</span>
                                <span className="font-mono text-xs font-black text-emerald-600">ALIMENTADO</span>
                             </div>
                          </div>
                       </div>

                       <div className="bg-slate-900 text-white p-10 rounded-[3rem] shadow-2xl relative overflow-hidden group">
                          <div className="relative z-10 space-y-4">
                             <h6 className="text-[9px] font-black text-emerald-400 uppercase tracking-widest">Manual do Dispositivo</h6>
                             <p className="text-xs font-medium leading-relaxed italic opacity-80">
                               "O Quantum Resonance analisa as ondas eletromagnéticas fracas do corpo humano. Certifique-se de que o paciente segure o sensor corretamente e permaneça em silêncio."
                             </p>
                          </div>
                          <div className="absolute top-0 right-0 w-32 h-32 bg-emerald-500/5 rounded-full -mr-16 -mt-16 group-hover:scale-150 transition-transform duration-1000"></div>
                       </div>
                    </div>
                 </div>
              </div>
            )}
          </div>
        ) : (
          /* SCANNER ÓPTICO (ABA 2) */
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
                        <button onClick={() => setIsCameraActive(false)} className="bg-white/10 text-white px-12 py-6 rounded-3xl font-black text-[10px] uppercase backdrop-blur-xl border border-white/10">Cancelar</button>
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
          animation: spin 10s linear infinite;
        }
        @keyframes spin {
          from { transform: rotate(0deg); }
          to { transform: rotate(360deg); }
        }
      `}</style>
    </div>
  );
};
