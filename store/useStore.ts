
import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { PatientData, AnalysisReport, ClinicSettings, UserRole, Protocol, LicenseType, FrequencyProtocol, IridologyAnalysis } from '../types';
import { syncToSupabase, deleteFromSupabase } from '../services/supabase';

export type View = 'dashboard' | 'patient' | 'consultation' | 'exams' | 'mapping' | 'generator' | 'protocols' | 'library' | 'history' | 'settings' | 'help' | 'recycle' | 'exam_request' | 'frequency' | 'iridology';

interface AppState {
  // UI State
  currentView: View;
  showIntro: boolean;
  showTutorial: boolean;
  
  // Auth State
  isAuthenticated: boolean;
  currentUserRole: UserRole | null;
  
  // Data State
  patientData: PatientData | null;
  allPatients: PatientData[];
  deletedPatients: PatientData[];
  lastExamAnalysis: AnalysisReport | null;
  iridologyHistory: IridologyAnalysis[];
  customProtocols: Protocol[];
  frequencyProtocols: FrequencyProtocol[];
  clinicSettings: ClinicSettings;
  recommendedFrequencies: string[];
  isAnalyzing: boolean;

  // Actions
  setView: (view: View) => void;
  setShowIntro: (show: boolean) => void;
  setShowTutorial: (show: boolean) => void;
  setAuthenticated: (auth: boolean, role: UserRole | null) => void;
  logout: () => void;
  
  setPatientData: (data: PatientData | null) => void;
  savePatient: (data: PatientData) => void;
  deletePatient: (id: string) => void;
  restorePatient: (id: string) => void;
  permanentDeletePatient: (id: string) => void;
  emptyBin: () => void;
  
  setLastExamAnalysis: (report: AnalysisReport | null) => void;
  setCustomProtocols: (protocols: Protocol[]) => void;
  saveFrequencyProtocol: (protocol: FrequencyProtocol) => void;
  deleteFrequencyProtocol: (id: string) => void;
  setClinicSettings: (settings: ClinicSettings) => void;
  saveIridologyAnalysis: (analysis: IridologyAnalysis) => void;
  
  // Supabase Actions
  syncFromSupabase: () => Promise<void>;
  
  // Complex Actions
  handleReportGenerated: (report: AnalysisReport) => void;
  handleAnalyzeNow: (data: PatientData) => void;
  selectReport: (report: AnalysisReport) => void;
  clearRecommendations: () => void;
}

export const useStore = create<AppState>()(
  persist(
    (set, get) => ({
      // Initial State
      currentView: 'dashboard',
      showIntro: true,
      showTutorial: false,
      isAuthenticated: false,
      currentUserRole: null,
      patientData: null,
      allPatients: [],
      deletedPatients: [],
      lastExamAnalysis: null,
      iridologyHistory: [],
      customProtocols: [],
      frequencyProtocols: [],
      recommendedFrequencies: [],
      isAnalyzing: false,
      clinicSettings: {
        therapistName: 'Dr. Terapeuta',
        clinicName: 'Centro Consulfision',
        isActivated: false,
        licenseType: LicenseType.FREE,
        activationDate: new Date().toISOString(),
        expiryDate: new Date(Date.now() + 5 * 24 * 3600 * 1000).toISOString(),
        language: 'pt',
        accessPassword: ''
      },

      // Actions
      setView: (view) => set({ currentView: view }),
      setShowIntro: (show) => set({ showIntro: show }),
      setShowTutorial: (show) => set({ showTutorial: show }),
      setAuthenticated: (auth, role) => set({ isAuthenticated: auth, currentUserRole: role }),
      logout: () => set({ isAuthenticated: false, currentUserRole: null, currentView: 'dashboard', patientData: null, lastExamAnalysis: null }),
      
      setPatientData: (data) => set({ patientData: data }),
      
      savePatient: (data) => set((state) => {
        const exists = state.allPatients.find(p => p.id === data.id);
        const updatedAll = exists 
          ? state.allPatients.map(p => p.id === data.id ? data : p)
          : [...state.allPatients, data];
        
        // Sync to Supabase
        syncToSupabase('patients', data);
        
        return { 
          allPatients: updatedAll,
          patientData: state.patientData?.id === data.id ? data : state.patientData
        };
      }),

      deletePatient: (id) => set((state) => {
        const patientToDelete = state.allPatients.find(p => p.id === id);
        if (!patientToDelete) return state;
        
        // Sync deletion to Supabase (we could use a 'deleted' flag instead if we want to keep it in DB)
        // For now, let's just keep it synced as is
        
        return {
          allPatients: state.allPatients.filter(p => p.id !== id),
          deletedPatients: [...state.deletedPatients, patientToDelete],
          patientData: state.patientData?.id === id ? null : state.patientData
        };
      }),

      restorePatient: (id) => set((state) => {
        const patientToRestore = state.deletedPatients.find(p => p.id === id);
        if (!patientToRestore) return state;
        
        // Sync restoration back to Supabase
        syncToSupabase('patients', patientToRestore);
        
        return {
          deletedPatients: state.deletedPatients.filter(p => p.id !== id),
          allPatients: [...state.allPatients, patientToRestore]
        };
      }),

      permanentDeletePatient: (id) => set((state) => {
        deleteFromSupabase('patients', id);
        return {
          deletedPatients: state.deletedPatients.filter(p => p.id !== id)
        };
      }),

      emptyBin: () => set({ deletedPatients: [] }),

      setLastExamAnalysis: (report) => set({ lastExamAnalysis: report }),
      setCustomProtocols: (protocols) => set((state) => {
        // Sync each protocol to Supabase
        protocols.forEach(p => syncToSupabase('custom_protocols', p));
        return { customProtocols: protocols };
      }),
      saveFrequencyProtocol: (protocol) => set((state) => {
        const updated = [protocol, ...state.frequencyProtocols];
        syncToSupabase('frequency_protocols', protocol);
        return { frequencyProtocols: updated };
      }),
      deleteFrequencyProtocol: (id) => set((state) => {
        deleteFromSupabase('frequency_protocols', id);
        return {
          frequencyProtocols: state.frequencyProtocols.filter(p => p.id !== id)
        };
      }),
      setClinicSettings: (settings) => set((state) => {
        syncToSupabase('clinic_settings', { ...settings, id: 'current_settings' });
        return { clinicSettings: settings };
      }),
      saveIridologyAnalysis: (analysis) => set((state) => {
        const updated = [analysis, ...state.iridologyHistory];
        syncToSupabase('iridology_analysis', analysis);
        return { iridologyHistory: updated };
      }),

      syncFromSupabase: async () => {
        const { fetchFromSupabase } = await import('../services/supabase');
        
        const [patients, frequencies, iridology, custom, settings] = await Promise.all([
          fetchFromSupabase('patients'),
          fetchFromSupabase('frequency_protocols'),
          fetchFromSupabase('iridology_analysis'),
          fetchFromSupabase('custom_protocols'),
          fetchFromSupabase('clinic_settings')
        ]);

        if (patients.length > 0) set({ allPatients: patients });
        if (frequencies.length > 0) set({ frequencyProtocols: frequencies });
        if (iridology.length > 0) set({ iridologyHistory: iridology });
        if (custom.length > 0) set({ customProtocols: custom });
        if (settings.length > 0) set({ clinicSettings: settings[0] });
      },

      handleReportGenerated: (report) => {
        const { patientData, savePatient } = get();
        
        // Extract frequencies from suggested protocols
        const frequencies = report.suggestedProtocols.reduce((acc: string[], protocol) => {
          if (protocol.frequencies) {
            return [...acc, ...protocol.frequencies];
          }
          return acc;
        }, []);
        
        set({ 
          lastExamAnalysis: report,
          recommendedFrequencies: Array.from(new Set(frequencies))
        });
        
        if (patientData) {
          const updatedPatient = {
            ...patientData,
            consultationHistory: [report, ...(patientData.consultationHistory || [])]
          };
          savePatient(updatedPatient);
        }
        set({ currentView: 'protocols' });
      },

      handleAnalyzeNow: async (data) => {
        const { savePatient, handleReportGenerated } = get();
        savePatient(data);
        set({ isAnalyzing: true, lastExamAnalysis: null, recommendedFrequencies: [] });
        
        try {
          const { generateTherapyReport } = await import('../services/gemini');
          const report = await generateTherapyReport(
            `Realize uma análise clínica completa para o paciente ${data.name}. 
             Queixas: ${data.complaints}. 
             Histórico: ${data.history}. 
             Sinais Vitais: TA ${data.bloodPressure}, IMC ${data.bmi}.`,
            undefined,
            data
          );
          handleReportGenerated(report);
        } catch (error) {
          console.error("Erro na análise automática:", error);
          alert("Erro ao processar análise automática. Tente novamente.");
        } finally {
          set({ isAnalyzing: false });
        }
      },

      selectReport: (report) => {
        const frequencies = report.suggestedProtocols.reduce((acc: string[], protocol) => {
          if (protocol.frequencies) {
            return [...acc, ...protocol.frequencies];
          }
          return acc;
        }, []);
        
        set({ 
          lastExamAnalysis: report,
          recommendedFrequencies: Array.from(new Set(frequencies)),
          currentView: 'protocols'
        });
      },

      clearRecommendations: () => set({ recommendedFrequencies: [], lastExamAnalysis: null })
    }),
    {
      name: 'consulfision-storage',
      partialize: (state) => ({
        allPatients: state.allPatients,
        deletedPatients: state.deletedPatients,
        customProtocols: state.customProtocols,
        frequencyProtocols: state.frequencyProtocols,
        clinicSettings: state.clinicSettings,
        showIntro: state.showIntro
      }),
    }
  )
);
