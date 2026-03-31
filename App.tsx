
import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Sidebar } from './components/Sidebar';
import { BottomNav } from './components/BottomNav';
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
import { AnatomicalGenerator } from './components/AnatomicalGenerator';
import { MedicalExamRequest } from './components/MedicalExamRequest';
import { FrequencyGenerator } from './components/FrequencyGenerator';
import { IridologyModule } from './components/IridologyModule';
import { WelcomeIntro } from './components/WelcomeIntro';
import { Library } from './components/Library';
import { ClinicalHistory } from './components/ClinicalHistory';
import { RecycleBin } from './components/RecycleBin';
import { TutorialWizard } from './components/TutorialWizard';
import { HardwareManager } from './components/HardwareManager';
import { QuantumResonanceModule } from './components/QuantumResonanceModule';
import { NsofisionNero } from './components/NsofisionNero';
import { Physiotherapy } from './components/Physiotherapy';
import { Massotherapy } from './components/Massotherapy';
import { BloodPressureMonitor } from './components/BloodPressureMonitor';
import { GlucoseMonitor } from './components/GlucoseMonitor';
import { PatientData, AnalysisReport, ClinicSettings, UserRole, Protocol, LicenseType } from './types';
import { translations } from './translations';

import { stopAllAudio } from './services/tts';
import { useStore, View } from './store/useStore';

const App: React.FC = () => {
  const {
    currentView, setView,
    isAuthenticated, setAuthenticated,
    currentUserRole,
    showIntro, setShowIntro,
    showTutorial, setShowTutorial,
    clinicSettings, setClinicSettings,
    patientData, setPatientData,
    allPatients, savePatient,
    deletedPatients,
    lastExamAnalysis, setLastExamAnalysis,
    customProtocols, setCustomProtocols,
    handleReportGenerated,
    handleAnalyzeNow,
    generateAutomaticProtocol,
    selectReport,
    clearRecommendations,
    recommendedFrequencies,
    logout,
    syncFromSupabase,
    connectedDevices,
    addDevice,
    updateDeviceStatus,
    isAnalyzing
  } = useStore();

  useEffect(() => {
    stopAllAudio();
  }, [currentView]);

  /* 
  useEffect(() => {
    syncFromSupabase();
  }, []);
  */

  const handleDetectDevice = async () => {
    // USB detection disabled to repair app
    /*
    const { USBService } = await import('./services/usbService');
    try {
      const device = await USBService.requestDevice();
      if (device) {
        const medicalDevice = USBService.mapUSBDeviceToMedicalDevice(device);
        addDevice(medicalDevice);
        
        updateDeviceStatus(medicalDevice.id, 'connecting');
        const success = await USBService.connect(device);
        updateDeviceStatus(medicalDevice.id, success ? 'connected' : 'available');
      }
    } catch (err) {
      console.error('USB Detection failed:', err);
    }
    */
  };

  const handleLogin = (pass: string, role: UserRole) => {
    if (role === UserRole.PATIENT) {
      setAuthenticated(true, role);
      setView('dashboard');
      return;
    }
    if (pass === clinicSettings.accessPassword || !clinicSettings.accessPassword) {
      setAuthenticated(true, role);
    } else {
      alert("Senha incorreta");
    }
  };

  const renderView = () => {
    switch (currentView) {
      case 'dashboard': return (
        <Dashboard 
          setView={setView} 
          patientData={patientData} 
          examData={lastExamAnalysis} 
          clinicSettings={clinicSettings} 
          allPatients={allPatients} 
          onSelectPatient={(id) => { setPatientData(allPatients.find(p => p.id === id) || null); }} 
          onLogout={logout} 
          userRole={currentUserRole} 
          recommendedCount={recommendedFrequencies.length} 
          connectedDevices={connectedDevices}
          onDetectDevice={handleDetectDevice}
          onGenerateAutoProtocol={generateAutomaticProtocol}
          isAnalyzing={isAnalyzing}
        />
      );
      case 'patient': return <PatientIntake patientData={patientData} setPatientData={savePatient} onAnalyzeNow={handleAnalyzeNow} />;
      case 'consultation': return <Consultation patientData={patientData} onReportGenerated={handleReportGenerated} onReopenReport={() => setView('protocols')} hasReport={!!lastExamAnalysis} examData={lastExamAnalysis} clinicSettings={clinicSettings} />;
      case 'exams': return <ExamAnalysis patientData={patientData} onAnalysisComplete={handleReportGenerated} />;
      case 'mapping': return <AnatomicalMapper patientData={patientData} setPatientData={savePatient} language={clinicSettings.language || 'pt'} examData={lastExamAnalysis} />;
      case 'generator': return <AnatomicalGenerator patientData={patientData} examData={lastExamAnalysis} />;
      case 'frequency': return <FrequencyGenerator />;
      case 'exam_request': return <MedicalExamRequest patientData={patientData} />;
      case 'protocols': return <ProtocolGenerator patientData={patientData} examData={lastExamAnalysis} onReportGenerated={handleReportGenerated} />;
      case 'library': return (
        <Library 
          language={clinicSettings.language || 'pt'} 
          isCreator={clinicSettings.licenseType === LicenseType.CREATOR} 
          customProtocols={customProtocols} 
          onAddCustom={(p) => setCustomProtocols([...customProtocols, p])}
          onDeleteCustom={(id) => setCustomProtocols(customProtocols.filter(p => p.id !== id))}
        />
      );
      case 'history': return <ClinicalHistory patientData={patientData} language={clinicSettings.language || 'pt'} onSelectReport={selectReport} />;
      case 'settings': return <Settings settings={clinicSettings} setSettings={setClinicSettings} />;
      case 'iridology': return <IridologyModule />;
      case 'hardware': return <HardwareManager />;
      case 'quantum': return <QuantumResonanceModule />;
      case 'nsofision': return <NsofisionNero />;
      case 'physiotherapy': return <Physiotherapy />;
      case 'massotherapy': return <Massotherapy />;
      case 'blood_pressure': return (
        <BloodPressureMonitor 
          onSave={(data) => {
            if (patientData) {
              const updatedPatient = {
                ...patientData,
                bloodPressure: `${data.systolic}/${data.diastolic}`
              };
              savePatient(updatedPatient);
              setPatientData(updatedPatient);
            }
          }} 
        />
      );
      case 'glucose': return (
        <GlucoseMonitor 
          onSave={(data) => {
            if (patientData) {
              const updatedPatient = {
                ...patientData,
                glucose: `${data.glucose} ${data.unit}`
              };
              savePatient(updatedPatient);
              setPatientData(updatedPatient);
            }
          }} 
        />
      );
      case 'help': return <HelpCenter />;
      case 'recycle': return <RecycleBin deletedPatients={deletedPatients} onRestore={() => {}} onPermanentDelete={() => {}} onEmptyBin={() => {}} language={clinicSettings.language || 'pt'} />;
      default: return <Dashboard setView={setView} patientData={patientData} clinicSettings={clinicSettings} allPatients={allPatients} onSelectPatient={() => {}} onLogout={logout} userRole={currentUserRole} />;
    }
  };

  if (showIntro) return <WelcomeIntro onFinish={() => setShowIntro(false)} />;
  if (!isAuthenticated) return <LoginScreen onLogin={handleLogin} language={clinicSettings.language || 'pt'} />;

  return (
    <div className="flex h-screen bg-slate-50 overflow-hidden text-slate-900 flex-col md:flex-row">
      {showTutorial && <TutorialWizard onClose={() => setShowTutorial(false)} />}
      
      {/* Mobile Header */}
      <header className="md:hidden bg-white border-b border-slate-200 p-4 flex justify-between items-center z-40">
        <h1 className="font-black text-emerald-600 tracking-tighter uppercase text-sm">Consulfision Mobile</h1>
        <div className="w-8 h-8 bg-slate-100 rounded-full flex items-center justify-center text-xs">👤</div>
      </header>

      <div className="hidden md:block">
        <Sidebar 
          currentView={currentView} 
          setView={setView} 
          patientActive={!!patientData} 
          clinicSettings={clinicSettings}
          userRole={currentUserRole}
          onLogout={logout}
          binCount={deletedPatients.length}
        />
      </div>

      <main className="flex-1 overflow-y-auto p-4 md:p-8">
        <div className="max-w-6xl mx-auto pb-32 md:pb-24">
          <AnimatePresence mode="wait">
            <motion.div
              key={currentView}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              transition={{ duration: 0.2 }}
            >
              {renderView()}
            </motion.div>
          </AnimatePresence>
        </div>
      </main>

      <BottomNav currentView={currentView} setView={setView} userRole={currentUserRole} />
    </div>
  );
};

export default App;
