
import React, { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { useStore } from '../store/useStore';
import { generateQuantumAnalysisReport, findHardwareSetup } from '../services/gemini';
import { speakText } from '../services/tts';
import { Activity, Zap, RefreshCw, CheckCircle2, AlertCircle, Sparkles, Hand, Waves, ExternalLink, Search, Download, Loader2, FileText, FileDown, Cloud } from 'lucide-react';
import { translations } from '../translations';
import { generateConsultationPDF, generateConsultationWord } from '../services/documentGenerator';

const QUANTUM_INDICATORS = [
  { id: 'cardio', name: 'Cardiovascular e Cerebrovascular', category: 'Sistemas' },
  { id: 'gastro', name: 'Função Gastrointestinal', category: 'Sistemas' },
  { id: 'liver', name: 'Função Hepática', category: 'Órgãos' },
  { id: 'kidney', name: 'Função Renal', category: 'Órgãos' },
  { id: 'lung', name: 'Função Pulmonar', category: 'Órgãos' },
  { id: 'nerve', name: 'Sistema Nervoso', category: 'Sistemas' },
  { id: 'bone', name: 'Doença Óssea', category: 'Estrutura' },
  { id: 'sugar', name: 'Açúcar no Sangue', category: 'Metabolismo' },
  { id: 'trace', name: 'Oligoelementos', category: 'Nutrição' },
  { id: 'vitamin', name: 'Vitaminas', category: 'Nutrição' },
  { id: 'amino', name: 'Aminoácidos', category: 'Nutrição' },
  { id: 'immune', name: 'Sistema Imunológico', category: 'Sistemas' },
  { id: 'toxin', name: 'Toxina Humana', category: 'Toxicidade' },
  { id: 'heavy', name: 'Metais Pesados', category: 'Toxicidade' },
];

export const QuantumResonanceModule: React.FC = () => {
  const { patientData, connectedDevices, setView, clinicSettings } = useStore();
  const language = clinicSettings.language;
  const t = translations[language];
  const [step, setStep] = useState<'setup' | 'scanning' | 'result'>('setup');
  const [isScanning, setIsScanning] = useState(false);
  const [scanProgress, setScanProgress] = useState(0);
  const [currentIndicator, setCurrentIndicator] = useState('');
  const [results, setResults] = useState<any[]>([]);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [analysisReport, setAnalysisReport] = useState<(any & { searchLinks: { uri: string, title: string }[] }) | null>(null);
  const [isFindingSetup, setIsFindingSetup] = useState(false);
  const [setupInfo, setSetupInfo] = useState<{ text: string, links: { uri: string, title: string }[] } | null>(null);
  const [isSaving, setIsSaving] = useState<'pdf' | 'word' | 'cloud' | null>(null);

  const isDeviceConnected = connectedDevices.some(d => d.isQuantum && d.status === 'connected');

  const handleSaveLocal = async (type: 'pdf' | 'word') => {
    if (!patientData || !analysisReport) return;
    
    setIsSaving(type);
    const messages = {
      pdf: t.savePdf,
      word: t.saveWord
    };
    speakText(messages[type], t.ttsInstruction);
    
    try {
      if (type === 'pdf') {
        await generateConsultationPDF(patientData, [], analysisReport, null);
      } else {
        await generateConsultationWord(patientData, [], analysisReport);
      }
      
      setIsSaving(null);
      speakText(`${type.toUpperCase()} ${t.examGenerated}`, t.ttsInstruction);
    } catch (error) {
      console.error(`Error generating ${type}:`, error);
      setIsSaving(null);
      speakText(`${t.examGenerationError} ${type.toUpperCase()}.`, t.ttsInstruction);
    }
  };

  const handleSaveToCloud = () => {
    if (!patientData || !analysisReport) return;
    
    setIsSaving('cloud');
    speakText(t.syncingAnalysis, t.ttsInstruction);
    
    const { handleReportGenerated } = useStore.getState();
    handleReportGenerated(analysisReport);
    
    setTimeout(() => {
      setIsSaving(null);
      speakText(t.analysisSynced, t.ttsInstruction);
    }, 1500);
  };

  const handleFindSetup = async () => {
    setIsFindingSetup(true);
    try {
      const info = await findHardwareSetup("Quantum Resonance Magnetic Analyzer");
      setSetupInfo(info);
    } catch (err) {
      console.error(err);
    } finally {
      setIsFindingSetup(false);
    }
  };

  const startScan = async () => {
    if (!patientData) {
      alert(t.selectPatientToEmit);
      return;
    }
    setStep('scanning');
    setIsScanning(true);
    setScanProgress(0);
    setResults([]);
    speakText(t.startingQuantum, t.ttsInstruction);

    // Simulate scanning process
    for (let i = 0; i < QUANTUM_INDICATORS.length; i++) {
      const indicator = QUANTUM_INDICATORS[i];
      setCurrentIndicator(indicator.name);
      
      // Simulate data acquisition
      await new Promise(resolve => setTimeout(resolve, 800));
      
      const quantumValue = (Math.random() * 2 - 1).toFixed(4); // -1.0000 to 1.0000
      setResults(prev => [...prev, { ...indicator, value: parseFloat(quantumValue) }]);
      setScanProgress(((i + 1) / QUANTUM_INDICATORS.length) * 100);
    }

    setIsScanning(false);
    setStep('result');
    runAIInterpretation();
  };

  const runAIInterpretation = async () => {
    setIsAnalyzing(true);
    speakText(t.processingResonance, t.ttsInstruction);

    try {
      const report = await generateQuantumAnalysisReport(results, patientData!);
      setAnalysisReport(report);
      speakText(t.quantumAnalysisCompleted, t.ttsInstruction);
    } catch (err) {
      console.error(err);
    } finally {
      setIsAnalyzing(false);
    }
  };

  return (
    <div className="space-y-8 pb-20">
      <header className="flex flex-col md:flex-row justify-between items-start md:items-center gap-6">
        <div>
          <h2 className="text-4xl font-black text-slate-900 uppercase tracking-tighter leading-none">
            {t.quantumAnalysis.split(' ')[0]} <span className="text-blue-600">{t.quantumAnalysis.split(' ')[1]}</span>
          </h2>
          <p className="text-slate-500 mt-2 font-medium">{t.quantumSubtitle}</p>
        </div>
        
        <div className={`px-4 py-2 rounded-full flex items-center gap-2 text-[10px] font-black uppercase tracking-widest ${
          isDeviceConnected ? 'bg-emerald-50 text-emerald-600' : 'bg-amber-50 text-amber-600'
        }`}>
          {isDeviceConnected ? <CheckCircle2 size={14} /> : <AlertCircle size={14} />}
          {isDeviceConnected ? t.analyzerConnected : t.waitingHardware}
        </div>
      </header>

      <AnimatePresence mode="wait">
        {step === 'setup' && (
          <motion.div 
            key="setup"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            className="bg-white rounded-[3rem] p-12 border border-slate-100 shadow-xl text-center space-y-8"
          >
            <div className="w-32 h-32 bg-blue-50 rounded-[2.5rem] flex items-center justify-center mx-auto text-blue-600 shadow-inner">
              <Waves size={64} className="animate-pulse" />
            </div>
            
            <div className="max-w-xl mx-auto space-y-4">
              <h3 className="text-3xl font-black text-slate-900 uppercase tracking-tighter">{t.prepareScan}</h3>
              <p className="text-slate-500 font-medium">
                {t.prepareScanDesc}
              </p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 max-w-2xl mx-auto">
              <div className="p-6 bg-slate-50 rounded-3xl border border-slate-100 space-y-2">
                <Hand className="mx-auto text-blue-500" size={24} />
                <p className="text-[10px] font-black uppercase text-slate-400">{t.physicalContact}</p>
                <p className="text-xs font-bold text-slate-700">{t.holdSensor}</p>
              </div>
              <div className="p-6 bg-slate-50 rounded-3xl border border-slate-100 space-y-2">
                <Zap className="mx-auto text-blue-500" size={24} />
                <p className="text-[10px] font-black uppercase text-slate-400">{t.frequencyLabel}</p>
                <p className="text-xs font-bold text-slate-700">Nano-Gauss</p>
              </div>
              <div className="p-6 bg-slate-50 rounded-3xl border border-slate-100 space-y-2">
                <Activity className="mx-auto text-blue-500" size={24} />
                <p className="text-[10px] font-black uppercase text-slate-400">{t.time}</p>
                <p className="text-xs font-bold text-slate-700">~60 Segundos</p>
              </div>
            </div>

            <div className="flex flex-col gap-4 max-w-2xl mx-auto">
              <button 
                onClick={startScan}
                disabled={!isDeviceConnected}
                className="bg-blue-600 text-white px-12 py-6 rounded-3xl font-black text-sm uppercase tracking-widest shadow-2xl hover:bg-blue-700 transition-all flex items-center gap-4 mx-auto disabled:opacity-50"
              >
                <Sparkles size={20} />
                {t.startBioResonance}
              </button>

              <button 
                onClick={handleFindSetup}
                disabled={isFindingSetup}
                className="text-blue-600 font-black text-[10px] uppercase tracking-widest flex items-center justify-center gap-2 hover:underline"
              >
                {isFindingSetup ? <Loader2 size={12} className="animate-spin" /> : <Search size={12} />}
                {t.cannotConnect}
              </button>
            </div>
            
            {setupInfo && (
              <motion.div 
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: 'auto' }}
                className="max-w-xl mx-auto p-6 bg-blue-50 rounded-3xl border border-blue-100 text-left space-y-4"
              >
                <div className="flex items-center gap-2 text-blue-700 font-black text-[10px] uppercase tracking-widest">
                  <Download size={14} /> {t.installationInstructions}
                </div>
                <p className="text-xs text-slate-600 leading-relaxed">{setupInfo.text}</p>
                <div className="flex flex-wrap gap-2">
                  {setupInfo.links.map((link, i) => (
                    <a 
                      key={i} 
                      href={link.uri} 
                      target="_blank" 
                      rel="noopener noreferrer"
                      className="text-[10px] font-bold text-blue-600 bg-white px-3 py-1 rounded-full border border-blue-200 flex items-center gap-1 hover:bg-blue-50"
                    >
                      {link.title} <ExternalLink size={10} />
                    </a>
                  ))}
                </div>
              </motion.div>
            )}
            
            {!isDeviceConnected && (
              <p className="text-amber-600 text-[10px] font-black uppercase tracking-widest">
                {t.hardwareNotDetected}
              </p>
            )}
          </motion.div>
        )}

        {step === 'scanning' && (
          <motion.div 
            key="scanning"
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            className="bg-slate-900 rounded-[3rem] p-12 text-white text-center space-y-12 relative overflow-hidden"
          >
            <div className="absolute inset-0 opacity-20">
              <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-transparent via-blue-500 to-transparent animate-scan"></div>
            </div>

            <div className="relative z-10 space-y-6">
              <div className="w-48 h-48 border-4 border-blue-500/30 rounded-full flex items-center justify-center mx-auto relative">
                <div className="absolute inset-0 border-4 border-blue-500 border-t-transparent rounded-full animate-spin"></div>
                <Waves size={64} className="text-blue-500 animate-pulse" />
              </div>
              
              <div className="space-y-2">
                <h3 className="text-4xl font-black uppercase tracking-tighter">{t.scanningStatus}</h3>
                <p className="text-blue-400 font-black uppercase tracking-widest text-sm">{currentIndicator}</p>
              </div>

              <div className="max-w-md mx-auto space-y-4">
                <div className="h-4 bg-white/10 rounded-full overflow-hidden">
                  <motion.div 
                    className="h-full bg-blue-500"
                    initial={{ width: 0 }}
                    animate={{ width: `${scanProgress}%` }}
                  ></motion.div>
                </div>
                <p className="text-slate-400 text-xs font-bold uppercase tracking-widest">{Math.round(scanProgress)}% {t.completed}</p>
              </div>
            </div>

            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 relative z-10">
              {results.slice(-4).map((r, i) => (
                <motion.div 
                  key={i}
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="p-4 bg-white/5 border border-white/10 rounded-2xl text-left"
                >
                  <p className="text-[8px] font-black text-slate-500 uppercase truncate">{r.name}</p>
                  <p className="text-lg font-black text-blue-400">{r.value > 0 ? '+' : ''}{r.value}</p>
                </motion.div>
              ))}
            </div>
          </motion.div>
        )}

        {step === 'result' && (
          <motion.div 
            key="result"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="space-y-8"
          >
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
              <div className="lg:col-span-2 space-y-6">
                <div className="bg-white rounded-[2.5rem] p-8 border border-slate-100 shadow-sm">
                  <h3 className="text-xl font-black text-slate-900 uppercase tracking-tighter mb-6 flex items-center gap-3">
                    <Activity className="text-blue-600" /> {t.resonanceSpectrum}
                  </h3>
                  
                  <div className="space-y-4">
                    {results.map((r, i) => (
                      <div key={i} className="flex items-center gap-4">
                        <div className="w-48 text-xs font-bold text-slate-600 truncate">{r.name}</div>
                        <div className="flex-1 h-8 bg-slate-50 rounded-xl relative overflow-hidden flex items-center px-1">
                          <div className="absolute left-1/2 top-0 bottom-0 w-px bg-slate-300 z-10"></div>
                          <motion.div 
                            initial={{ width: 0 }}
                            animate={{ 
                              width: `${Math.abs(r.value) * 50}%`,
                              left: r.value < 0 ? `${50 - Math.abs(r.value) * 50}%` : '50%'
                            }}
                            className={`h-6 rounded-lg absolute ${
                              Math.abs(r.value) > 0.6 ? 'bg-red-500' : 
                              Math.abs(r.value) > 0.3 ? 'bg-amber-500' : 'bg-emerald-500'
                            }`}
                          ></motion.div>
                        </div>
                        <div className="w-16 text-right text-[10px] font-black text-slate-400 uppercase">
                          {r.value > 0 ? '+' : ''}{r.value}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>

              <div className="space-y-6">
                <div className="bg-slate-900 rounded-[2.5rem] p-8 text-white shadow-xl">
                  <h3 className="text-xl font-black uppercase tracking-tighter mb-6 flex items-center gap-3">
                    <Sparkles className="text-blue-400" /> {t.aiDiagnosis}
                  </h3>
                  
                  {isAnalyzing ? (
                    <div className="py-12 text-center space-y-4">
                      <RefreshCw className="animate-spin mx-auto text-blue-400" size={32} />
                      <p className="text-xs font-black uppercase tracking-widest text-slate-400">{t.interpretingWaves}</p>
                    </div>
                  ) : analysisReport ? (
                    <div className="space-y-6">
                      <div className="p-4 bg-white/5 rounded-2xl border border-white/10">
                        <p className="text-[10px] font-black text-blue-400 uppercase tracking-widest mb-2">{t.conclusion}</p>
                        <p className="text-sm text-slate-300 leading-relaxed italic">"{analysisReport.summary}"</p>
                      </div>
                      
                      <div className="space-y-3">
                        <p className="text-[10px] font-black text-slate-500 uppercase tracking-widest">{t.mainFindings}</p>
                        {analysisReport.findings.slice(0, 3).map((f: string, i: number) => (
                          <div key={i} className="flex items-start gap-3">
                            <div className="w-5 h-5 bg-blue-500/20 rounded-lg flex items-center justify-center text-blue-400 shrink-0">
                              <CheckCircle2 size={12} />
                            </div>
                            <p className="text-xs text-slate-300">{f}</p>
                          </div>
                        ))}
                      </div>

                      {analysisReport.searchLinks && analysisReport.searchLinks.length > 0 && (
                        <div className="space-y-3 pt-4 border-t border-white/10">
                          <p className="text-[10px] font-black text-emerald-400 uppercase tracking-widest flex items-center gap-2">
                            <Search size={12} /> {t.scientificBasis}
                          </p>
                          <div className="space-y-2">
                            {analysisReport.searchLinks.slice(0, 3).map((link: any, i: number) => (
                              <a 
                                key={i} 
                                href={link.uri} 
                                target="_blank" 
                                rel="noopener noreferrer"
                                className="flex items-center justify-between p-3 bg-white/5 hover:bg-white/10 rounded-xl border border-white/10 transition-all group"
                              >
                                <span className="text-[10px] font-bold text-slate-300 truncate max-w-[180px]">{link.title}</span>
                                <ExternalLink size={12} className="text-emerald-500 group-hover:scale-110 transition-transform" />
                              </a>
                            ))}
                          </div>
                        </div>
                      )}

                      <div className="grid grid-cols-1 gap-3">
                        <div className="grid grid-cols-2 gap-3">
                          <button 
                            onClick={() => handleSaveLocal('pdf')}
                            disabled={!!isSaving}
                            className="bg-white/10 hover:bg-white/20 text-white py-4 rounded-2xl font-black text-[10px] uppercase tracking-widest flex flex-col items-center justify-center gap-1 transition-all disabled:opacity-20"
                          >
                            {isSaving === 'pdf' ? <RefreshCw size={14} className="animate-spin" /> : <FileDown size={14} className="text-emerald-400" />}
                            PDF
                          </button>
                          <button 
                            onClick={() => handleSaveLocal('word')}
                            disabled={!!isSaving}
                            className="bg-white/10 hover:bg-white/20 text-white py-4 rounded-2xl font-black text-[10px] uppercase tracking-widest flex flex-col items-center justify-center gap-1 transition-all disabled:opacity-20"
                          >
                            {isSaving === 'word' ? <RefreshCw size={14} className="animate-spin" /> : <FileText size={14} className="text-blue-400" />}
                            Word
                          </button>
                        </div>
                        
                        <button 
                          onClick={handleSaveToCloud}
                          disabled={!!isSaving}
                          className="bg-emerald-600 py-4 rounded-2xl font-black text-[10px] uppercase tracking-widest hover:bg-emerald-700 transition-all flex items-center justify-center gap-2 disabled:opacity-50"
                        >
                          {isSaving === 'cloud' ? <RefreshCw size={14} className="animate-spin" /> : <Cloud size={14} />}
                          {isSaving === 'cloud' ? t.syncing : t.saveAnalysis}
                        </button>

                        <button 
                          onClick={() => setView('protocols')}
                          className="bg-blue-600 py-4 rounded-2xl font-black text-[10px] uppercase tracking-widest hover:bg-blue-700 transition-all flex items-center justify-center gap-2"
                        >
                          <FileText size={14} /> {t.viewSuggestedProtocols}
                        </button>
                      </div>
                    </div>
                  ) : (
                    <div className="text-center py-8">
                      <button onClick={runAIInterpretation} className="text-blue-400 text-xs font-black uppercase underline">{t.tryAgain}</button>
                    </div>
                  )}
                </div>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};
