
import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  FileText, 
  Sparkles, 
  Bot, 
  Save, 
  Download, 
  Share2, 
  CheckCircle2, 
  AlertCircle, 
  ChevronRight, 
  Activity,
  Heart,
  Stethoscope,
  Leaf,
  Plus,
  Trash2,
  Printer
} from 'lucide-react';
import { useStore } from '../store/useStore';
import { translations } from '../translations';
import { getGeminiAI, withRetry } from '../services/gemini';
import { speakText } from '../services/tts';
import { PatientData } from '../types';

interface PrescriptionSync {
  conventional: {
    medication: string;
    dosage: string;
    instructions: string;
  }[];
  holistic: {
    therapy: string;
    recommendation: string;
    instructions: string;
  }[];
  justification: string;
  warnings: string[];
}

export const PrescriptionSystem: React.FC = () => {
  const { patientData, clinicSettings, savePatient, lastExamAnalysis } = useStore();
  const t = translations[clinicSettings.language || 'pt'] || translations.pt;
  
  const [isGenerating, setIsGenerating] = useState(false);
  const [prescription, setPrescription] = useState<PrescriptionSync | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  const [showSuccess, setShowSuccess] = useState(false);

  useEffect(() => {
    if (showSuccess) {
      const timer = setTimeout(() => setShowSuccess(false), 3000);
      return () => clearTimeout(timer);
    }
  }, [showSuccess]);

  const handleGenerate = async () => {
    if (!patientData) return;
    
    setIsGenerating(true);
    setError(null);
    setPrescription(null);

    try {
      const ai = getGeminiAI();
      
      let examContext = "";
      if (lastExamAnalysis) {
        examContext = `
        RESULTADOS DE EXAMES/HARDWARE:
        - Resumo: ${lastExamAnalysis.summary}
        - Achados: ${lastExamAnalysis.findings.join(', ')}
        - Protocolos Sugeridos: ${lastExamAnalysis.suggestedProtocols.map(p => p.therapy).join(', ')}
        `;
      }

      const prompt = `
        Gere um RECEITUÁRIO SINCRONIZADO de um Investigador (Quissambi Benvindo) para o paciente ${patientData.name}.
        CONDIÇÕES DO PACIENTE:
        - Queixas: ${patientData.complaints}
        - Histórico: ${patientData.history}
        - Sinais Vitais: TA ${patientData.bloodPressure}, Glicemia ${patientData.glucose || 'Não informado'}, IMC ${patientData.bmi}
        ${examContext}
        
        Sua tarefa é criar duas listas integradas que trabalhem em conjunto:
        1. MEDICINA CONVENCIONAL: Medicamentos farmacológicos (se necessário) ou orientações clínicas padrão.
        2. MEDICINA HOLÍSTICA: Fitoterápicos, vitaminas, minerais, dieta e práticas integrativas (Biomagnetismo, etc).
        
        Garanta que não haja contraindicações entre as duas abordagens.
        Forneça uma justificativa clínica para a integração e avisos importantes.
        
        Responda estritamente em JSON com o seguinte formato:
        {
          "conventional": [{"medication": "string", "dosage": "string", "instructions": "string"}],
          "holistic": [{"therapy": "string", "recommendation": "string", "instructions": "string"}],
          "justification": "string",
          "warnings": ["string"]
        }
      `;

      const response = await withRetry(() => ai.models.generateContent({
        model: 'gemini-3-flash-preview',
        contents: [{ parts: [{ text: prompt }] }],
        config: {
          responseMimeType: "application/json"
        }
      }));

      const data = JSON.parse(response.text) as PrescriptionSync;
      setPrescription(data);
      
      speakText(`${t.integratedPrescription} ${t.completed}`, t.ttsInstruction);
      
      // Auto-save logic
      await handleSave(data);
    } catch (err: any) {
      console.error(err);
      setError(err.message || 'Erro ao gerar receita.');
    } finally {
      setIsGenerating(false);
    }
  };

  const handleSave = async (dataToSave?: PrescriptionSync) => {
    const data = dataToSave || prescription;
    if (!data || !patientData) return;

    setIsSaving(true);
    try {
      const { savePatient } = useStore.getState();
      
      // We'll store this in chatHistory or consultationHistory as a special item
      const summary = `RECEITUÁRIO INTEGRADO: ${data.justification.slice(0, 50)}...`;
      
      const newReport = {
        date: new Date().toISOString(),
        summary: summary,
        findings: [data.justification, ...data.warnings],
        suggestedProtocols: [
          {
            id: crypto.randomUUID(),
            therapy: 'Receituário Sincronizado',
            title: 'Medicina Convencional & Holística',
            instructions: data.justification,
            steps: data.conventional.map((c, i) => ({ 
              order: i + 1, 
              action: c.medication, 
              detail: `${c.dosage} - ${c.instructions}` 
            })),
            suggestedPhytotherapeutics: data.holistic.map(h => `${h.therapy}: ${h.recommendation}`),
            dietaryPlan: [data.justification],
            sessions: 1,
            revaluationDays: 30
          }
        ],
        suggestedExams: [],
        disclaimer: 'Receituário gerado por IA. Validar com profissional.',
        criticalAlert: false,
        emergencyLevel: 'low'
      };

      const updatedPatient = {
        ...patientData,
        consultationHistory: [newReport as any, ...(patientData.consultationHistory || [])]
      };

      savePatient(updatedPatient);
      setShowSuccess(true);
    } catch (err) {
      console.error("Erro ao salvar:", err);
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="space-y-6 pb-20">
      <header className="flex flex-col gap-1">
        <div className="flex items-center gap-2">
          <div className="p-2 bg-emerald-100 text-emerald-600 rounded-lg">
            <FileText size={20} />
          </div>
          <h1 className="text-xl font-black text-slate-900 uppercase tracking-tight">
            {t.integratedPrescription}
          </h1>
        </div>
        <p className="text-[10px] text-slate-500 font-medium uppercase tracking-widest leading-relaxed">
          {t.prescriptionSyncDesc}
        </p>
      </header>

      {!patientData ? (
        <div className="bg-slate-50 border-2 border-dashed border-slate-200 p-8 rounded-2xl text-center space-y-4">
          <div className="w-16 h-16 bg-white rounded-full flex items-center justify-center mx-auto shadow-sm">
            <AlertCircle size={32} className="text-slate-300" />
          </div>
          <p className="text-slate-500 font-black text-xs uppercase tracking-widest">
            {t.noPatientSelected}
          </p>
        </div>
      ) : (
        <div className="space-y-4">
          {/* Patient Context Card */}
          <div className="bg-white p-4 rounded-2xl border border-slate-100 shadow-sm flex items-center gap-4">
            <div className="w-12 h-12 bg-slate-900 rounded-xl flex items-center justify-center text-white">
              <img 
                src="https://images.unsplash.com/photo-1522529599102-193c0d76b5b6?auto=format&fit=crop&w=100&h=100" 
                alt={patientData.name}
                className="w-full h-full object-cover rounded-xl"
                referrerPolicy="no-referrer"
              />
            </div>
            <div className="flex-1">
              <h3 className="font-black text-slate-900 text-sm uppercase">{patientData.name}</h3>
              <p className="text-[8px] text-slate-400 font-black uppercase tracking-widest">
                {t.activeCare}
              </p>
            </div>
            <button 
              onClick={handleGenerate}
              disabled={isGenerating}
              className="bg-emerald-600 text-white px-4 py-2 rounded-xl font-black text-[10px] uppercase tracking-widest shadow-lg shadow-emerald-100 flex items-center gap-2 disabled:opacity-50 transition-all active:scale-95"
            >
              {isGenerating ? (
                <>
                  <RefreshCw size={14} className="animate-spin" />
                  {t.analyzing}
                </>
              ) : (
                <>
                  <Sparkles size={14} />
                  {t.generateIntegratedRecipe.split(' ')[0]}
                </>
              )}
            </button>
          </div>

          <AnimatePresence mode="wait">
            {prescription ? (
              <motion.div 
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
                className="space-y-4"
              >
                {/* Conventional Medicine Panel */}
                <div className="bg-blue-50 border border-blue-100 p-4 rounded-2xl space-y-3">
                  <div className="flex items-center gap-2 text-blue-700">
                    <Stethoscope size={16} />
                    <h3 className="font-black text-[10px] uppercase tracking-widest">
                      {t.conventionalMedicine}
                    </h3>
                  </div>
                  <div className="space-y-2">
                    {prescription.conventional.map((c, i) => (
                      <div key={i} className="bg-white p-3 rounded-xl border border-blue-100 shadow-sm">
                        <p className="font-black text-slate-900 text-xs">{c.medication}</p>
                        <p className="text-[9px] text-slate-500 font-medium">{c.dosage}</p>
                        <p className="text-[8px] text-slate-400 mt-1 italic">{c.instructions}</p>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Holistic Medicine Panel */}
                <div className="bg-emerald-50 border border-emerald-100 p-4 rounded-2xl space-y-3">
                  <div className="flex items-center gap-2 text-emerald-700">
                    <Leaf size={16} />
                    <h3 className="font-black text-[10px] uppercase tracking-widest">
                      {t.holisticMedicine}
                    </h3>
                  </div>
                  <div className="space-y-2">
                    {prescription.holistic.map((h, i) => (
                      <div key={i} className="bg-white p-3 rounded-xl border border-emerald-100 shadow-sm">
                        <p className="font-black text-slate-900 text-xs">{h.therapy}</p>
                        <p className="text-[9px] text-slate-500 font-medium">{h.recommendation}</p>
                        <p className="text-[8px] text-slate-400 mt-1 italic">{h.instructions}</p>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Justification & Warnings */}
                <div className="bg-slate-900 text-white p-5 rounded-3xl space-y-4 shadow-xl">
                  <div className="space-y-1">
                    <p className="text-[7px] font-black text-emerald-400 uppercase tracking-[0.2em]">Justificativa Clínica Integrada</p>
                    <p className="text-[11px] leading-relaxed text-slate-300">
                      {prescription.justification}
                    </p>
                  </div>
                  
                  {prescription.warnings.length > 0 && (
                    <div className="pt-4 border-t border-white/10 space-y-2">
                      <p className="text-[7px] font-black text-red-400 uppercase tracking-[0.2em]">Alertas e Observações</p>
                      <ul className="space-y-1">
                        {prescription.warnings.map((w, i) => (
                          <li key={i} className="flex items-start gap-2 text-[10px] text-slate-400">
                            <span className="w-1 h-1 bg-red-400 rounded-full mt-1.5 shrink-0"></span>
                            {w}
                          </li>
                        ))}
                      </ul>
                    </div>
                  )}

                  <div className="flex gap-2 pt-2">
                    <button 
                      onClick={() => handleSave()}
                      disabled={isSaving}
                      className="flex-1 bg-emerald-500 hover:bg-emerald-600 py-3 rounded-2xl flex items-center justify-center gap-2 transition-all active:scale-95"
                    >
                      <Save size={16} />
                      <span className="font-black text-[9px] uppercase tracking-widest">
                        {isSaving ? t.savingPrescription : t.saveSyncRecord.split(' ')[0]}
                      </span>
                    </button>
                    <button className="p-3 bg-white/10 rounded-2xl hover:bg-white/20 transition-all active:scale-95">
                      <Printer size={16} />
                    </button>
                  </div>

                  <div className="pt-4 flex justify-center border-t border-white/5">
                    <p className="text-[7px] font-black text-slate-500 uppercase tracking-[0.3em]">
                      Investigador: Quissambi Benvindo • Consulfision IA
                    </p>
                  </div>
                </div>
              </motion.div>
            ) : isGenerating ? (
              <div className="bg-white p-12 rounded-3xl border border-slate-100 flex flex-col items-center justify-center gap-4 text-center">
                <div className="relative">
                  <div className="w-16 h-16 border-4 border-slate-100 border-t-emerald-600 rounded-full animate-spin"></div>
                  <Bot size={24} className="absolute inset-0 m-auto text-emerald-600 animate-pulse" />
                </div>
                <div>
                  <p className="text-slate-900 font-black text-xs uppercase tracking-widest">
                    {t.analyzing}
                  </p>
                  <p className="text-[8px] text-slate-400 font-medium mt-1">
                    Sincronizando ficha clínica com base farmacológica e holística...
                  </p>
                </div>
              </div>
            ) : (
              <div className="bg-slate-50 p-10 rounded-3xl border-2 border-dashed border-slate-200 flex flex-col items-center justify-center gap-4 text-center opacity-60">
                <Sparkles size={40} className="text-slate-300" />
                <p className="text-slate-400 font-black text-xs uppercase tracking-widest">
                  Clique em Gerar para iniciar a sincronização
                </p>
              </div>
            )}
          </AnimatePresence>
        </div>
      )}

      {/* Success Notification */}
      <AnimatePresence>
        {showSuccess && (
          <motion.div
            initial={{ opacity: 0, scale: 0.9, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.9, y: 20 }}
            className="fixed bottom-6 left-6 right-6 z-50 bg-emerald-600 text-white p-4 rounded-2xl shadow-2xl flex items-center gap-3"
          >
            <div className="w-8 h-8 bg-white/20 rounded-lg flex items-center justify-center">
              <CheckCircle2 size={18} />
            </div>
            <p className="text-[10px] font-black uppercase tracking-widest">
              {t.integratedPrescription} {t.savedSuccess}
            </p>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

const RefreshCw = ({ size, className }: { size: number; className?: string }) => (
  <svg 
    width={size} 
    height={size} 
    viewBox="0 0 24 24" 
    fill="none" 
    stroke="currentColor" 
    strokeWidth="3" 
    strokeLinecap="round" 
    strokeLinejoin="round" 
    className={className}
  >
    <path d="M3 12a9 9 0 0 1 9-9 9.75 9.75 0 0 1 6.74 2.74L21 8" />
    <path d="M21 3v5h-5" />
    <path d="M21 12a9 9 0 0 1-9 9 9.75 9.75 0 0 1-6.74-2.74L3 16" />
    <path d="M3 21v-5h5" />
  </svg>
);
