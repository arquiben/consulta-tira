
import React, { useState, useEffect, useCallback } from 'react';
import { Sidebar } from './components/Sidebar';
import { Dashboard } from './components/Dashboard';
import { Consultation } from './components/Consultation';
import { ExamAnalysis } from './components/ExamAnalysis';
import { ProtocolGenerator } from './components/ProtocolGenerator';
import { PatientIntake } from './components/PatientIntake';
import { Settings } from './components/Settings';
import { HelpCenter } from './components/HelpCenter';
import { ActivationScreen } from './components/ActivationScreen';
import { LoginScreen } from './components/LoginScreen';
import { AnatomicalMapper } from './components/AnatomicalMapper';
import { WelcomeIntro } from './components/WelcomeIntro';
import { Library } from './components/Library';
import { ClinicalHistory } from './components/ClinicalHistory';
import { RecycleBin } from './components/RecycleBin';
import { TutorialWizard } from './components/TutorialWizard';
import { PatientData, AnalysisReport, ClinicSettings, UserRole, Protocol, LicenseType } from './types';
import { translations } from './translations';

type View = 'dashboard' | 'patient' | 'consultation' | 'exams' | 'mapping' | 'protocols' | 'library' | 'history' | 'settings' | 'help' | 'recycle';

const App: React.FC = () => {
  const [currentView, setCurrentView] = useState<View>('dashboard');
  const [patientData, setPatientData] = useState<PatientData | null>(null);
  const [allPatients, setAllPatients] = useState<PatientData[]>([]);
  const [deletedPatients, setDeletedPatients] = useState<PatientData[]>([]);
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [currentUserRole, setCurrentUserRole] = useState<UserRole | null>(null);
  const [isUpdating, setIsUpdating] = useState(true);
  const [showIntro, setShowIntro] = useState(false);
  const [showTutorial, setShowTutorial] = useState(false);
  const [clinicSettings, setClinicSettings] = useState<ClinicSettings>(() => {
    const saved = localStorage.getItem('consulfision_settings');
    if (saved) return JSON.parse(saved);
    return {
      therapistName: 'Dr. Terapêutico',
      clinicName: 'Centro Consulfision',
      isActivated: false,
      licenseType: LicenseType.FREE,
      activationDate: new Date().toISOString(),
      expiryDate: new Date(Date.now() + 5 * 24 * 3600 * 1000).toISOString(),
      language: 'pt',
      accessPassword: ''
    };
  });
  const [lastExamAnalysis, setLastExamAnalysis] = useState<AnalysisReport | null>(null);
  const [customProtocols, setCustomProtocols] = useState<Protocol[]>([]);

  const t = translations[clinicSettings.language || 'pt'] || translations.pt;
  const isCreator = clinicSettings.licenseType === LicenseType.CREATOR;

  // Lógica de expiração
  const isExpired = clinicSettings.expiryDate ? new Date(clinicSettings.expiryDate) < new Date() : false;

  useEffect(() => {
    const savedPatients = localStorage.getItem('consulfision_patients');
    if (savedPatients) setAllPatients(JSON.parse(savedPatients));

    const savedDeleted = localStorage.getItem('consulfision_deleted_patients');
    if (savedDeleted) setDeletedPatients(JSON.parse(savedDeleted));

    const savedCustom = localStorage.getItem('consulfision_custom_protocols');
    if (savedCustom) setCustomProtocols(JSON.parse(savedCustom));

    const introSeen = localStorage.getItem('consulfision_intro_seen');
    if (!introSeen) setShowIntro(true);

    const timer = setTimeout(() => setIsUpdating(false), 2500);
    return () => clearTimeout(timer);
  }, []);

  useEffect(() => {
    localStorage.setItem('consulfision_patients', JSON.stringify(allPatients));
  }, [allPatients]);

  useEffect(() => {
    localStorage.setItem('consulfision_deleted_patients', JSON.stringify(deletedPatients));
  }, [deletedPatients]);

  useEffect(() => {
    localStorage.setItem('consulfision_settings', JSON.stringify(clinicSettings));
  }, [clinicSettings]);

  useEffect(() => {
    localStorage.setItem('consulfision_custom_protocols', JSON.stringify(customProtocols));
  }, [customProtocols]);

  const handleLogin = (pass: string, role: UserRole) => {
    if (role === UserRole.PATIENT) {
      setCurrentUserRole(role);
      setIsAuthenticated(true);
      setCurrentView('dashboard');
      return;
    }
    if (pass === clinicSettings.accessPassword || !clinicSettings.accessPassword) {
      setCurrentUserRole(role);
      setIsAuthenticated(true);
    } else {
      alert(t.passwordPlaceholder);
    }
  };

  const handleLogout = () => {
    setIsAuthenticated(false);
    setCurrentUserRole(null);
  };

  const handleFinishIntro = () => {
    localStorage.setItem('consulfision_intro_seen', 'true');
    setShowIntro(false);
    setShowTutorial(true);
  };

  const savePatient = (data: PatientData) => {
    const exists = allPatients.find(p => p.id === data.id);
    if (exists) {
      setAllPatients(prev => prev.map(p => p.id === data.id ? { ...data, lastConsultation: new Date().toISOString() } : p));
    } else {
      setAllPatients(prev => [...prev, { ...data, lastConsultation: new Date().toISOString() }]);
    }
    setPatientData(data);
  };

  const deletePatient = (id: string) => {
    const pToDelete = allPatients.find(p => p.id === id);
    if (pToDelete) {
      if (patientData?.id === id) setPatientData(null);
      setAllPatients(prev => prev.filter(p => p.id !== id));
      setDeletedPatients(prev => [...prev, pToDelete]);
    }
  };

  const selectPatient = (id: string) => {
    const p = allPatients.find(p => p.id === id);
    if (p) {
      setPatientData(p);
      setCurrentView('dashboard');
    }
  };

  const handleAnalysisComplete = (report: AnalysisReport) => {
    setLastExamAnalysis(report);
    if (patientData) {
      const updatedReport = { ...report, date: new Date().toISOString() };
      const updatedPatient = {
        ...patientData,
        consultationHistory: [updatedReport, ...(patientData.consultationHistory || [])],
        lastConsultation: updatedReport.date
      };
      savePatient(updatedPatient);
    }
  };

  const handleViewReport = (report: AnalysisReport) => {
    setLastExamAnalysis(report);
    setCurrentView('protocols');
  };

  const handleActivate = (type: LicenseType, key?: string) => {
    const isProfessionalOrGo = type !== LicenseType.FREE;
    setClinicSettings(prev => ({
      ...prev,
      licenseKey: key || 'AUTO-ACTIVATED',
      licenseType: type,
      isActivated: isProfessionalOrGo,
      activationDate: new Date().toISOString(),
      expiryDate: isProfessionalOrGo 
        ? new Date(Date.now() + 365 * 24 * 3600 * 1000).toISOString() // 1 ano
        : new Date(Date.now() + 5 * 24 * 3600 * 1000).toISOString() // 5 dias
    }));
  };

  const addCustomProtocol = (p: Protocol) => {
    setCustomProtocols(prev => [...prev, p]);
  };

  const deleteCustomProtocol = (id: string) => {
    setCustomProtocols(prev => prev.filter(p => p.id !== id));
  };

  const renderView = () => {
    switch (currentView) {
      case 'dashboard': 
        return <Dashboard setView={setCurrentView} patientData={patientData} examData={lastExamAnalysis} clinicSettings={clinicSettings} allPatients={allPatients} onSelectPatient={selectPatient} onDeletePatient={deletePatient} onLogout={handleLogout} userRole={currentUserRole} />;
      case 'patient': 
        return <PatientIntake patientData={patientData} setPatientData={savePatient} onAnalyzeNow={(data) => { savePatient(data); setCurrentView('protocols'); }} />;
      case 'consultation': 
        return <Consultation patientData={patientData} onReopenReport={() => setCurrentView('protocols')} hasReport={!!lastExamAnalysis} />;
      case 'exams': 
        return <ExamAnalysis patientData={patientData} onAnalysisComplete={handleAnalysisComplete} />;
      case 'mapping':
        return <AnatomicalMapper patientData={patientData} setPatientData={savePatient} language={clinicSettings.language || 'pt'} />;
      case 'protocols': 
        return <ProtocolGenerator patientData={patientData} examData={lastExamAnalysis} />;
      case 'library':
        return <Library language={clinicSettings.language || 'pt'} isCreator={isCreator} customProtocols={customProtocols} onAddCustom={addCustomProtocol} onDeleteCustom={deleteCustomProtocol} />;
      case 'history':
        return <ClinicalHistory patientData={patientData} language={clinicSettings.language || 'pt'} onSelectReport={handleViewReport} />;
      case 'recycle':
        return <RecycleBin deletedPatients={deletedPatients} onRestore={(id) => {}} onPermanentDelete={(id) => {}} onEmptyBin={() => {}} language={clinicSettings.language || 'pt'} />;
      case 'settings':
        return <Settings settings={clinicSettings} setSettings={setClinicSettings} />;
      case 'help':
        return <HelpCenter />;
      default: 
        return <Dashboard setView={setCurrentView} patientData={patientData} examData={lastExamAnalysis} clinicSettings={clinicSettings} allPatients={allPatients} onSelectPatient={selectPatient} onDeletePatient={deletePatient} onLogout={handleLogout} userRole={currentUserRole} />;
    }
  };

  if (showIntro) return <WelcomeIntro onFinish={handleFinishIntro} />;
  
  // Bloqueio por expiração ou falta de ativação (exceto se ainda estiver no trial gratuito)
  if (isExpired || (!clinicSettings.isActivated && clinicSettings.licenseType === LicenseType.FREE && isExpired)) {
    return <ActivationScreen onActivate={handleActivate} expired={isExpired} currentType={clinicSettings.licenseType} />;
  }
  
  if (!isAuthenticated) return <LoginScreen onLogin={handleLogin} language={clinicSettings.language || 'pt'} />;

  return (
    <div className="flex h-screen bg-slate-50 overflow-hidden text-slate-900">
      {showTutorial && <TutorialWizard onClose={() => setShowTutorial(false)} />}
      
      <Sidebar 
        currentView={currentView} 
        setView={setCurrentView} 
        patientActive={!!patientData} 
        clinicSettings={clinicSettings}
        userRole={currentUserRole}
        onLogout={handleLogout}
        binCount={deletedPatients.length}
        onOpenTutorial={() => setShowTutorial(true)}
      />
      <main className="flex-1 overflow-y-auto p-4 md:p-8 relative">
        <div className="max-w-6xl mx-auto pb-24">
          {renderView()}
        </div>
      </main>
    </div>
  );
};

export default App;
