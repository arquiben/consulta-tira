
export enum LicenseType {
  FREE = 'free',
  GO = 'go',
  PREMIUM = 'premium',
  PROFESSIONAL = 'professional',
  CREATOR = 'creator'
}

export enum TherapyType {
  BIOMAGNETISMO = 'Biomagnetismo',
  ACUPUNTURA_SEM_AGULHA = 'Acupuntura sem Agulha',
  OZONIOTERAPIA = 'Ozonioterapia',
  VENTOSATERAPIA = 'Ventosaterapia',
  CROMOTERAPIA = 'Neurocromoterapia',
  REFLEXOLOGIA = 'Reflexologia',
  MASSAGEM = 'Massoterapia',
  FISIOTERAPIA = 'Fisioterapia Integrativa',
  EFT = 'EFT (Tapping)',
  HIDROTERAPIA = 'Hidroterapia',
  VITASYNTESE = 'Vitasyntese',
  FITOTERAPIA = 'Fitoterapia',
  NSOFISION = 'Nsofision Neuro',
  CONVERSOTERAPIA = 'Conversoterapia',
  BARRA_DE_ACCESS = 'Barras de Access',
  NOVA_MEDICINA_GERMANICA = 'Nova Medicina Germânica',
  EXERCICIOS_FISICOS = 'Exercícios Físicos',
  NUTRICAO = 'Protocolo de Nutrição Holística',
  ONCOLOGIA_HOLISTICA = 'Oncologia Holística',
  VITAMINAS_MINERAIS = 'Vitaminas & Minerais (Suplementação)',
  DIETA_ENERGETICA_EMOCIONAL = 'Dieta Energética & Emocional',
  ANALISE_FARMACOLOGICA = 'Análise de Receita & Fármacos',
  IRIDOLOGIA = 'Iridologia Computacional NSO'
}

export enum UserRole {
  DOCTOR = 'doctor',
  THERAPIST = 'therapist',
  STUDENT = 'student',
  PATIENT = 'patient'
}

export interface MedicalDevice {
  id: string;
  name: string;
  type: 'usb' | 'wifi' | 'bluetooth';
  status: 'available' | 'connecting' | 'connected';
  signalStrength?: number;
}

export interface AnatomicalMarker {
  id: string;
  viewId: string;
  x: number;
  y: number;
  label: string;
  description?: string;
  intensity: 'low' | 'medium' | 'high';
}

export interface PatientData {
  id: string;
  name: string;
  age: string;
  gender: string;
  bloodType: string;
  weight: string;
  height: string;
  bmi: string;
  bloodPressure: string;
  address: string;
  phone: string;
  history: string;
  complaints: string;
  lastConsultation?: string;
  anatomicalMarkers?: AnatomicalMarker[];
  consultationHistory?: AnalysisReport[];
}

export interface ClinicSettings {
  therapistName: string;
  clinicName: string;
  clinicPasswordHash?: string;
  licenseKey?: string;
  licenseType: LicenseType;
  isActivated?: boolean;
  activationDate?: string;
  expiryDate?: string;
  language?: string;
  accessPassword?: string;
}

export interface ProtocolStep {
  order: number;
  action: string;
  detail: string;
}

export interface HydroStep {
  day: number;
  action: string;
  amount: string;
}

export interface Protocol {
  id: string;
  therapy: TherapyType | string;
  title: string;
  instructions: string;
  steps: ProtocolStep[];
  neuroSteps?: string[];
  quantumSteps?: string[];
  hydroSteps?: HydroStep[];
  duration?: string;
  sessions: number;
  frequencies?: string[];
  phrases?: string[];
  exercises?: string[];
  conflictNMG?: string;
  revaluationDays: number;
  prescriptionItems?: string[];
  suggestedPharmaceuticals?: string[];
  suggestedPhytotherapeutics?: string[];
  suggestedSupplements?: string[];
  dietaryPlan?: string[];
  contraindications?: string[];
  criticalAlert?: boolean;
  emergencyLevel?: 'low' | 'medium' | 'high' | 'critical';
  isCustom?: boolean;
}

export interface AnalysisReport {
  date: string;
  summary: string;
  findings: string[];
  suggestedProtocols: Protocol[];
  suggestedExams: string[];
  deviceDataConclusion?: string;
  disclaimer: string;
  criticalAlert: boolean;
  emergencyLevel: 'low' | 'medium' | 'high' | 'critical';
}

export interface FrequencyProtocol {
  id: string;
  name: string;
  frequency: number;
  waveType: 'sine' | 'square' | 'sawtooth' | 'triangle';
  description: string;
  createdAt: string;
}

export interface IridologyZone {
  id: number;
  name: string;
  status: 'normal' | 'altered';
  observation?: string;
  severity?: 'light' | 'moderate' | 'intense';
}

export interface IridologyAnalysis {
  id: string;
  patientId: string;
  date: string;
  imageUrl: string;
  zones: IridologyZone[];
  interpretation: string;
  suggestedProtocol: Protocol;
  pdfUrl?: string;
}

export interface Message {
  role: 'user' | 'model';
  content: string;
  timestamp: Date;
}
