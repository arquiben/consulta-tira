
import { create } from 'zustand';
import { persist, createJSONStorage, StateStorage } from 'zustand/middleware';
import { get, set, del } from 'idb-keyval';
import { PatientData, AnalysisReport, ClinicSettings, UserRole, Protocol, LicenseType, FrequencyProtocol, IridologyAnalysis, MedicalDevice } from '../types';
import { syncToSupabase, deleteFromSupabase } from '../services/supabase';

// Custom storage for IndexedDB with migration from localStorage
const storage: StateStorage = {
  getItem: async (name: string): Promise<string | null> => {
    const idbValue = await get(name);
    if (idbValue) return idbValue;

    // Fallback and migration from localStorage
    const localValue = localStorage.getItem(name);
    if (localValue) {
      console.log(`Migrating ${name} from localStorage to IndexedDB...`);
      try {
        await set(name, localValue);
        // We keep it in localStorage for one more session as a safety backup,
        // but the app will now prefer IndexedDB.
        return localValue;
      } catch (error) {
        console.error('Failed to migrate to IndexedDB:', error);
        return localValue;
      }
    }
    return null;
  },
  setItem: async (name: string, value: string): Promise<void> => {
    await set(name, value);
  },
  removeItem: async (name: string): Promise<void> => {
    await del(name);
  },
};

export type View = 'dashboard' | 'patient' | 'consultation' | 'exams' | 'mapping' | 'generator' | 'protocols' | 'library' | 'history' | 'settings' | 'help' | 'recycle' | 'exam_request' | 'frequency' | 'iridology' | 'hardware' | 'quantum' | 'nsofision' | 'physiotherapy' | 'massotherapy' | 'blood_pressure' | 'glucose' | 'energy_diet' | 'hydrotherapy' | 'biomagnetism_guide' | 'prescriptions' | 'bioscan';

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
  connectedDevices: MedicalDevice[];

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
  
  // Hardware Actions
  addDevice: (device: MedicalDevice) => void;
  removeDevice: (id: string) => void;
  updateDeviceStatus: (id: string, status: MedicalDevice['status']) => void;
  
  // Supabase Actions
  syncFromSupabase: () => Promise<void>;
  
  // Complex Actions
  handleReportGenerated: (report: AnalysisReport) => void;
  handleAnalyzeNow: (data: PatientData) => void;
  generateAutomaticProtocol: () => Promise<void>;
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
      connectedDevices: [],
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
      
      setPatientData: (data) => {
        if (data && data.consultationHistory && data.consultationHistory.length > 0) {
          const latestReport = data.consultationHistory[0];
          const frequencies = latestReport.suggestedProtocols.reduce((acc: string[], protocol) => {
            if (protocol.frequencies) {
              return [...acc, ...protocol.frequencies];
            }
            return acc;
          }, []);

          set({ 
            patientData: data,
            lastExamAnalysis: latestReport,
            recommendedFrequencies: Array.from(new Set(frequencies))
          });
        } else {
          set({ 
            patientData: data,
            lastExamAnalysis: null,
            recommendedFrequencies: []
          });
        }
      },
      
      savePatient: (data) => set((state) => {
        const exists = state.allPatients.find(p => p.id === data.id);
        const updatedAll = exists 
          ? state.allPatients.map(p => p.id === data.id ? data : p)
          : [...state.allPatients, data];
        
        // Background sync to Supabase
        syncToSupabase('patients', {
          id: data.id,
          name: data.name,
          age: data.age,
          gender: data.gender,
          blood_type: data.bloodType,
          weight: data.weight,
          height: data.height,
          bmi: data.bmi,
          blood_pressure: data.bloodPressure,
          address: data.address,
          phone: data.phone,
          history: data.history,
          complaints: data.complaints,
          consultation_history: data.consultationHistory,
          anatomical_markers: data.anatomicalMarkers,
          exam_requests: data.examRequests,
          updated_at: new Date().toISOString()
        });

        return { 
          allPatients: updatedAll,
          patientData: state.patientData?.id === data.id ? data : state.patientData
        };
      }),

      deletePatient: (id) => set((state) => {
        const patientToDelete = state.allPatients.find(p => p.id === id);
        if (!patientToDelete) return state;
        
        deleteFromSupabase('patients', id);

        return {
          allPatients: state.allPatients.filter(p => p.id !== id),
          deletedPatients: [...state.deletedPatients, patientToDelete],
          patientData: state.patientData?.id === id ? null : state.patientData
        };
      }),

      restorePatient: (id) => set((state) => {
        const patientToRestore = state.deletedPatients.find(p => p.id === id);
        if (!patientToRestore) return state;
        
        return {
          deletedPatients: state.deletedPatients.filter(p => p.id !== id),
          allPatients: [...state.allPatients, patientToRestore]
        };
      }),

      permanentDeletePatient: (id) => set((state) => {
        return {
          deletedPatients: state.deletedPatients.filter(p => p.id !== id)
        };
      }),

      emptyBin: () => set({ deletedPatients: [] }),

      setLastExamAnalysis: (report) => set({ lastExamAnalysis: report }),
      setCustomProtocols: (protocols) => set((state) => {
        return { customProtocols: protocols };
      }),
      saveFrequencyProtocol: (protocol) => set((state) => {
        const updated = [protocol, ...state.frequencyProtocols];
        return { frequencyProtocols: updated };
      }),
      deleteFrequencyProtocol: (id) => set((state) => {
        return {
          frequencyProtocols: state.frequencyProtocols.filter(p => p.id !== id)
        };
      }),
      setClinicSettings: (settings) => set((state) => {
        return { clinicSettings: settings };
      }),
      saveIridologyAnalysis: (analysis) => set((state) => {
        const updated = [analysis, ...state.iridologyHistory];
        return { iridologyHistory: updated };
      }),

      // Hardware Actions
      addDevice: (device) => set((state) => ({
        connectedDevices: [...state.connectedDevices.filter(d => d.id !== device.id), device]
      })),
      removeDevice: (id) => set((state) => ({
        connectedDevices: state.connectedDevices.filter(d => d.id !== id)
      })),
      updateDeviceStatus: (id, status) => set((state) => ({
        connectedDevices: state.connectedDevices.map(d => d.id === id ? { ...d, status } : d)
      })),

      syncFromSupabase: async () => {
        const { fetchFromSupabase } = await import('../services/supabase');
        try {
          const patientsInDB = await fetchFromSupabase('patients');
          if (patientsInDB && patientsInDB.length > 0) {
            const mappedPatients = patientsInDB.map((p: any) => ({
              id: p.id,
              name: p.name,
              age: p.age,
              gender: p.gender,
              bloodType: p.blood_type,
              weight: p.weight,
              height: p.height,
              bmi: p.bmi,
              bloodPressure: p.blood_pressure,
              address: p.address,
              phone: p.phone,
              history: p.history,
              complaints: p.complaints,
              consultationHistory: p.consultation_history || [],
              anatomicalMarkers: p.anatomical_markers || [],
              examRequests: p.exam_requests || []
            }));
            set({ allPatients: mappedPatients });
          }
        } catch (err) {
          console.error('Error restoring from Supabase:', err);
        }
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
        
        const updatedReport = { 
          ...report, 
          id: crypto.randomUUID(), 
          date: new Date().toISOString() 
        };

        set({ 
          lastExamAnalysis: updatedReport,
          recommendedFrequencies: Array.from(new Set(frequencies))
        });
        
        if (patientData) {
          const updatedPatient = {
            ...patientData,
            consultationHistory: [updatedReport, ...(patientData.consultationHistory || [])],
            lastConsultation: updatedReport.date
          };
          savePatient(updatedPatient);
          set({ patientData: updatedPatient });
          console.log(`Leitura de exame salva automaticamente para o paciente ${patientData.name}`);
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
             Sinais Vitais: TA ${data.bloodPressure}, Glicemia ${data.glucose || 'Não informada'}, IMC ${data.bmi}.
             Gere protocolos detalhados de Biomagnetismo, Acupuntura Integrativa, Fitoterapia, DIETA ENERGÉTICA NSO e HIDROTERAPIA NSO.`,
            undefined,
            data
          );
          handleReportGenerated(report);
        } catch (error: any) {
          console.error("Erro na análise automática:", error);
          const isApiKeyMissing = error.message?.includes('GEMINI_API_KEY is not defined');
          const isApiKeyInvalid = error.message?.includes('403') || error.message?.includes('API_KEY_INVALID');
          
          if (isApiKeyMissing) {
            alert("Erro: Chave da API (GEMINI_API_KEY) não configurada no Netlify. Adicione a variável de ambiente nas configurações do seu deploy.");
          } else if (isApiKeyInvalid) {
            alert("Erro: Chave da API inválida ou sem permissão. Verifique se a chave está correta e se tem saldo/permissões.");
          } else {
            alert(`Erro ao processar análise automática: ${error.message || 'Erro desconhecido'}. Verifique sua conexão e tente novamente.`);
          }
        } finally {
          set({ isAnalyzing: false });
        }
      },

      generateAutomaticProtocol: async () => {
        const { patientData, lastExamAnalysis, handleReportGenerated } = get();
        if (!patientData) {
          alert("Selecione um paciente primeiro.");
          return;
        }

        set({ isAnalyzing: true });
        try {
          const { generateTherapyReport } = await import('../services/gemini');
          
          let prompt = `Gere um protocolo de tratamento automático e abrangente para o paciente ${patientData.name}.
            Considere as queixas: ${patientData.complaints}
            E o histórico: ${patientData.history}.
            Sinais Vitais: TA ${patientData.bloodPressure}, Glicemia ${patientData.glucose || 'Não informada'}, IMC ${patientData.bmi}.`;

          if (lastExamAnalysis) {
            prompt += `\nConsidere também os achados do último relatório de exames: ${lastExamAnalysis.summary}. 
            Achados específicos: ${lastExamAnalysis.findings.join(', ')}.`;
          }

          prompt += `\nForneça protocolos detalhados de Biomagnetismo, Acupuntura Integrativa, Fitoterapia, Suplementação, DIETA ENERGÉTICA NSO e HIDROTERAPIA NSO.`;

          const report = await generateTherapyReport(prompt, undefined, patientData);
          handleReportGenerated(report);
        } catch (error: any) {
          console.error("Erro na geração automática de protocolo:", error);
          const isApiKeyMissing = error.message?.includes('GEMINI_API_KEY is not defined');
          const isApiKeyInvalid = error.message?.includes('403') || error.message?.includes('API_KEY_INVALID');
          
          if (isApiKeyMissing) {
            alert("Erro: Chave da API (GEMINI_API_KEY) não configurada no Netlify. Adicione a variável de ambiente nas configurações do seu deploy.");
          } else if (isApiKeyInvalid) {
            alert("Erro: Chave da API inválida ou sem permissão. Verifique se a chave está correta e se tem saldo/permissões.");
          } else {
            alert("Erro ao gerar protocolo automático. Verifique sua conexão e tente novamente.");
          }
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
      storage: createJSONStorage(() => storage),
      partialize: (state) => ({
        allPatients: state.allPatients,
        deletedPatients: state.deletedPatients,
        customProtocols: state.customProtocols,
        frequencyProtocols: state.frequencyProtocols,
        clinicSettings: state.clinicSettings,
        showIntro: state.showIntro,
        connectedDevices: state.connectedDevices
      }),
    }
  )
);
