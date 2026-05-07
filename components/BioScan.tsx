
import React, { useState, useRef } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Camera, Upload, Trash2, Search, Leaf, Globe, Beaker, FileText, Download, Droplets, MapPin, ShieldCheck, ChevronRight, RefreshCw } from 'lucide-react';
import { ClinicSettings } from '../types';
import { translations } from '../translations';
import { analyzePlant } from '../services/gemini';
import { generateBioScanPDF } from '../services/documentGenerator';

interface BioScanProps {
  clinicSettings: ClinicSettings;
}

export const BioScan: React.FC<BioScanProps> = ({ clinicSettings }) => {
  const t = translations[clinicSettings.language || 'pt'] || translations.pt;
  const [image, setImage] = useState<string | null>(null);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [result, setResult] = useState<any>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const cameraInputRef = useRef<HTMLInputElement>(null);

  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        setImage(reader.result as string);
        setResult(null);
      };
      reader.readAsDataURL(file);
    }
  };

  const handleAnalyze = async () => {
    if (!image) return;
    setIsAnalyzing(true);
    try {
      const analysis = await analyzePlant(image);
      setResult(analysis);
    } catch (error) {
      console.error("BioScan Error:", error);
      alert(t.aiAnalysisError || "Erro na análise de IA.");
    } finally {
      setIsAnalyzing(false);
    }
  };

  const handleDownloadPDF = async () => {
    if (!result) return;
    await generateBioScanPDF(result, image);
  };

  const discardImage = () => {
    setImage(null);
    setResult(null);
  };

  return (
    <div className="space-y-6 animate-fadeIn max-w-4xl mx-auto">
      <header className="flex items-center gap-4">
        <div className="w-14 h-14 bg-emerald-600 rounded-2xl flex items-center justify-center text-white shadow-xl shadow-emerald-200">
          <Leaf size={32} />
        </div>
        <div>
          <h2 className="text-2xl font-black text-slate-900 tracking-tighter uppercase">{t.bioScanTitle || "BioScan Pro"}</h2>
          <p className="text-slate-500 text-xs font-medium uppercase tracking-widest">{t.bioScanSubtitle || "Catalogação e Análise Botânica"}</p>
        </div>
      </header>

      {!image ? (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <button 
            onClick={() => cameraInputRef.current?.click()}
            className="h-48 bg-white border-2 border-dashed border-emerald-200 rounded-3xl flex flex-col items-center justify-center gap-4 hover:border-emerald-500 hover:bg-emerald-50 transition-all group"
          >
            <div className="w-16 h-16 bg-emerald-100 text-emerald-600 rounded-full flex items-center justify-center group-hover:scale-110 transition-transform">
              <Camera size={32} />
            </div>
            <div className="text-center">
              <p className="font-black text-slate-900 uppercase tracking-tight">{t.captureCamera || "Capturar com Câmera"}</p>
              <p className="text-[10px] text-slate-500 font-bold uppercase tracking-widest mt-1">Usar Dispositivo</p>
            </div>
            <input type="file" accept="image/*" capture="environment" ref={cameraInputRef} onChange={handleImageUpload} className="hidden" />
          </button>

          <button 
            onClick={() => fileInputRef.current?.click()}
            className="h-48 bg-white border-2 border-dashed border-slate-200 rounded-3xl flex flex-col items-center justify-center gap-4 hover:border-emerald-500 hover:bg-emerald-50 transition-all group"
          >
            <div className="w-16 h-16 bg-slate-100 text-slate-600 rounded-full flex items-center justify-center group-hover:scale-110 transition-transform">
              <Upload size={32} />
            </div>
            <div className="text-center">
              <p className="font-black text-slate-900 uppercase tracking-tight">{t.selectGallery || "Selecionar da Galeria"}</p>
              <p className="text-[10px] text-slate-500 font-bold uppercase tracking-widest mt-1">Arquivos Locais</p>
            </div>
            <input type="file" accept="image/*" ref={fileInputRef} onChange={handleImageUpload} className="hidden" />
          </button>
        </div>
      ) : (
        <div className="space-y-6">
          <div className="bg-white p-4 rounded-3xl shadow-xl space-y-4">
            <div className="relative aspect-video rounded-2xl overflow-hidden bg-slate-100 border border-slate-200 shadow-inner">
              <img src={image} alt="Plant" className="w-full h-full object-cover" referrerPolicy="no-referrer" />
              <button 
                onClick={discardImage}
                className="absolute top-4 right-4 w-10 h-10 bg-red-500 text-white rounded-full flex items-center justify-center shadow-lg hover:bg-red-600"
              >
                <Trash2 size={20} />
              </button>
            </div>

            {!result && (
              <button 
                onClick={handleAnalyze}
                disabled={isAnalyzing}
                className={`w-full py-6 rounded-2xl font-black uppercase tracking-widest text-lg shadow-xl shadow-emerald-200 transition-all flex items-center justify-center gap-4 ${
                  isAnalyzing ? 'bg-slate-200 text-slate-400' : 'bg-emerald-600 text-white hover:bg-emerald-700 active:scale-95'
                }`}
              >
                {isAnalyzing ? (
                  <>
                    <RefreshCw size={24} className="animate-spin" />
                    {t.analyzing || "Analisando..."}
                  </>
                ) : (
                  <>
                    <Search size={24} />
                    {t.bioScanIdentify || "Analisar Planta Agora"}
                  </>
                )}
              </button>
            )}
          </div>

          <AnimatePresence>
            {result && (
              <motion.div 
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                className="space-y-6 pb-12"
              >
                {/* Header Information */}
                <div className="bg-slate-900 text-white p-8 rounded-[3rem] shadow-2xl relative overflow-hidden">
                  <div className="relative z-10 space-y-4">
                    <div className="flex items-center gap-3">
                      <div className={`px-4 py-1.5 rounded-full text-[10px] font-black uppercase tracking-[0.2em] ${result.isCataloged ? 'bg-emerald-500/20 text-emerald-400' : 'bg-red-500/20 text-red-400'}`}>
                        {result.isCataloged ? (t.cataloged || "Catalogada") : (t.newDiscovery || "Nova Descoberta")}
                      </div>
                      <span className="text-white/30 truncate">{result.globalDatabaseStatus}</span>
                    </div>

                    <div className="space-y-1">
                      <h1 className="text-4xl md:text-5xl font-black tracking-tighter uppercase italic">{result.scientificName}</h1>
                      <p className="text-xl text-emerald-400 font-bold uppercase tracking-widest">{result.popularNames.join(' • ')}</p>
                    </div>

                    <div className="flex gap-4 pt-4 border-t border-white/10">
                       <div className="flex items-center gap-2">
                         <Globe size={16} className="text-emerald-400" />
                         <span className="text-xs font-bold uppercase tracking-widest text-white/60">{result.geolocation.country}</span>
                       </div>
                       <div className="flex items-center gap-2">
                         <MapPin size={16} className="text-emerald-400" />
                         <span className="text-xs font-bold uppercase tracking-widest text-white/60">{result.geolocation.region}</span>
                       </div>
                    </div>
                  </div>
                  <Leaf className="absolute -right-8 -bottom-8 opacity-5 text-emerald-400 rotate-12" size={200} />
                </div>

                {/* Grid Analysis */}
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  {Object.entries(result.morphology).map(([key, data]: [string, any]) => {
                    if (!data?.properties) return null;
                    return (
                      <div key={key} className="bg-white p-6 rounded-[2rem] border border-slate-100 shadow-sm hover:shadow-md transition-shadow group">
                        <div className="flex items-center justify-between mb-4">
                          <h3 className="font-black text-slate-800 uppercase text-xs tracking-widest">{t[key] || key}</h3>
                          <div className="w-8 h-8 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center group-hover:scale-110 transition-transform">
                            <Beaker size={14} />
                          </div>
                        </div>
                        <div className="space-y-3">
                          <p className="text-sm text-slate-600 font-medium leading-relaxed">{data.properties}</p>
                          {data.chemicalFormulas && data.chemicalFormulas.length > 0 && (
                            <div className="pt-2 border-t border-slate-50">
                               <p className="text-[8px] font-black text-slate-400 uppercase tracking-widest mb-1">Fórmulas Químicas</p>
                               <div className="flex flex-wrap gap-1">
                                 {data.chemicalFormulas.map((f: string, idx: number) => (
                                   <span key={idx} className="bg-slate-100 text-slate-600 px-2 py-0.5 rounded-lg text-[9px] font-mono">{f}</span>
                                 ))}
                               </div>
                            </div>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>

                {/* Pharmacopoeia & Synergy */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div className="bg-emerald-950 text-white p-8 rounded-[3rem] shadow-xl relative overflow-hidden">
                    <div className="relative z-10 space-y-6">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 bg-emerald-400 rounded-2xl flex items-center justify-center text-emerald-950">
                          <Droplets size={20} />
                        </div>
                        <div>
                          <h3 className="font-black uppercase tracking-widest text-emerald-400 text-xs">{t.pharmacopoeia || "Farmacopeia"}</h3>
                          <p className="text-xl font-black italic">{result.pharmacopoeia.method}</p>
                        </div>
                      </div>
                      
                      <div className="space-y-4">
                        <p className="text-emerald-100/80 text-sm italic border-l-2 border-emerald-500/50 pl-4">{result.pharmacopoeia.instructions}</p>
                        <div className="grid grid-cols-2 gap-4 pt-4 border-t border-white/10">
                          <div>
                            <p className="text-[8px] font-black text-emerald-500 uppercase tracking-[0.2em] mb-1">{t.dosage || "Dosagem"}</p>
                            <p className="text-sm font-bold">{result.pharmacopoeia.dosagePerWeight}</p>
                          </div>
                          <div>
                            <p className="text-[8px] font-black text-emerald-500 uppercase tracking-[0.2em] mb-1">{t.bioScanFrequency || "Frequência"}</p>
                            <p className="text-sm font-bold">{result.pharmacopoeia.frequency}</p>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>

                  <div className="bg-white p-8 rounded-[3rem] border border-slate-100 shadow-xl space-y-6">
                    <div className="flex items-center gap-3">
                        <div className="w-10 h-10 bg-blue-100 rounded-2xl flex items-center justify-center text-blue-600">
                          <RefreshCw size={20} />
                        </div>
                        <div>
                          <h3 className="font-black uppercase tracking-widest text-slate-400 text-[10px]">{t.synergy || "Sinergia"}</h3>
                          <p className="text-lg font-black text-slate-900 leading-tight">Interações & Benefícios</p>
                        </div>
                    </div>
                    <p className="text-slate-600 font-medium leading-relaxed">{result.synergy}</p>
                    <div className="bg-slate-50 p-4 rounded-2xl flex items-center gap-3">
                      <ShieldCheck size={20} className="text-emerald-500 flex-shrink-0" />
                      <p className="text-[9px] font-bold text-slate-500 uppercase tracking-widest leading-normal">
                        Protocolo validado para formulações holísticas NSOFISION.
                      </p>
                    </div>
                  </div>
                </div>

                {/* Actions */}
                <div className="flex flex-col md:flex-row gap-4 pt-6">
                  <button 
                    onClick={handleDownloadPDF}
                    className="flex-1 bg-slate-900 text-white py-6 rounded-3xl font-black uppercase tracking-widest shadow-2xl flex items-center justify-center gap-4 hover:bg-emerald-600 transition-all group"
                  >
                    <div className="w-10 h-10 bg-white/10 rounded-2xl flex items-center justify-center group-hover:scale-110 transition-transform">
                      <Download size={24} />
                    </div>
                    {t.savePdf || "Baixar Laudo Técnico"}
                  </button>
                  
                  <div className="md:w-64 bg-white p-4 rounded-3xl border border-slate-100 shadow-sm flex flex-col items-center justify-center text-center">
                    <p className="text-[8px] font-black text-slate-400 uppercase tracking-widest mb-1">{t.investigator || "Assinatura Investigador"}</p>
                    <p className="font-black text-slate-900 italic tracking-tighter text-lg">{t.signature || "Quissambi Benvindo"}</p>
                    <div className="w-16 h-px bg-emerald-500 mt-2"></div>
                  </div>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      )}

      {/* Manual Setup Finder if search fails */}
      {!result && !isAnalyzing && (
        <div className="bg-slate-50 p-8 rounded-[3rem] border border-slate-200 border-dashed text-center">
          <p className="text-slate-400 text-xs font-bold uppercase tracking-widest mb-4">Módulo BioScan Pro v2026</p>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 opacity-30">
            <div className="flex flex-col items-center gap-2"><Beaker size={20} /><span className="text-[8px] uppercase tracking-widest font-black">Genoma</span></div>
            <div className="flex flex-col items-center gap-2"><Globe size={20} /><span className="text-[8px] uppercase tracking-widest font-black">Bioma</span></div>
            <div className="flex flex-col items-center gap-2"><FileText size={20} /><span className="text-[8px] uppercase tracking-widest font-black">Catalog</span></div>
            <div className="flex flex-col items-center gap-2"><ShieldCheck size={20} /><span className="text-[8px] uppercase tracking-widest font-black">Sinergy</span></div>
          </div>
        </div>
      )}
    </div>
  );
};

