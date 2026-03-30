
import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Usb, Cpu, RefreshCw, CheckCircle2, AlertCircle, Trash2, Zap, Activity, Info, Sparkles, Download, Search, ExternalLink } from 'lucide-react';
import { useStore } from '../store/useStore';
import { USBService } from '../services/usbService';
import { MedicalDevice } from '../types';
import { findHardwareSetup } from '../services/gemini';

export const HardwareManager: React.FC = () => {
  const { connectedDevices, addDevice, removeDevice, updateDeviceStatus, setView } = useStore();
  const [isScanning, setIsScanning] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isSupported, setIsSupported] = useState(true);
  const [setupInfo, setSetupInfo] = useState<{ text: string, links: { uri: string, title: string }[] } | null>(null);
  const [isSearchingSetup, setIsSearchingSetup] = useState(false);

  useEffect(() => {
    setIsSupported(USBService.isSupported());
    loadPairedDevices();
  }, []);

  const loadPairedDevices = async () => {
    const devices = await USBService.getPairedDevices();
    devices.forEach(d => {
      addDevice(USBService.mapUSBDeviceToMedicalDevice(d));
    });
  };

  const handlePairDevice = async () => {
    setIsScanning(true);
    setError(null);
    try {
      const device = await USBService.requestDevice();
      if (device) {
        const medicalDevice = USBService.mapUSBDeviceToMedicalDevice(device);
        addDevice(medicalDevice);
        
        // Attempt to connect
        updateDeviceStatus(medicalDevice.id, 'connecting');
        const success = await USBService.connect(device);
        updateDeviceStatus(medicalDevice.id, success ? 'connected' : 'available');
      }
    } catch (err) {
      setError('Falha ao parear dispositivo. Certifique-se de que ele está conectado e você deu permissão.');
    } finally {
      setIsScanning(false);
    }
  };

  const handleSearchSetup = async (deviceName: string) => {
    setIsSearchingSetup(true);
    try {
      const info = await findHardwareSetup(deviceName);
      setSetupInfo(info);
    } catch (err) {
      setError('Falha ao buscar informações de setup no Google.');
    } finally {
      setIsSearchingSetup(false);
    }
  };

  const handleRemove = (id: string) => {
    removeDevice(id);
  };

  if (!isSupported) {
    return (
      <div className="p-8 bg-red-50 rounded-[2.5rem] border border-red-100 text-center space-y-4">
        <AlertCircle className="mx-auto text-red-500" size={48} />
        <h3 className="text-xl font-black text-red-900 uppercase">WebUSB Não Suportado</h3>
        <p className="text-red-700 text-sm max-w-md mx-auto">
          Seu navegador não suporta a tecnologia necessária para comunicação direta com hardware via USB. 
          Recomendamos usar o Google Chrome ou Microsoft Edge.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-8">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-6">
        <div>
          <h2 className="text-4xl font-black text-slate-900 uppercase tracking-tighter leading-none">
            Hardware <span className="text-emerald-600">Inteligente</span>
          </h2>
          <p className="text-slate-500 mt-2 font-medium">Detecção e integração automática de dispositivos Consulfision NSO</p>
        </div>
        
        <button 
          onClick={handlePairDevice}
          disabled={isScanning}
          className="bg-slate-900 text-white px-8 py-4 rounded-2xl font-black text-xs uppercase tracking-widest shadow-xl hover:bg-slate-800 transition-all flex items-center gap-3 disabled:opacity-50"
        >
          {isScanning ? <RefreshCw className="animate-spin" size={18} /> : <Usb size={18} />}
          Detectar Novo Dispositivo
        </button>
      </div>

      {error && (
        <motion.div 
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          className="p-4 bg-amber-50 border border-amber-100 rounded-2xl flex items-center gap-3 text-amber-700 text-sm font-bold"
        >
          <AlertCircle size={18} />
          {error}
        </motion.div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        <AnimatePresence mode="popLayout">
          {connectedDevices.map((device) => (
            <motion.div
              key={device.id}
              layout
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.9 }}
              className="bg-white rounded-[2.5rem] border border-slate-100 shadow-sm overflow-hidden group hover:shadow-xl transition-all duration-300"
            >
              <div className="p-8 space-y-6">
                <div className="flex justify-between items-start">
                  <div className={`w-14 h-14 rounded-2xl flex items-center justify-center text-2xl shadow-inner ${
                    device.status === 'connected' ? 'bg-emerald-50 text-emerald-600' : 
                    device.status === 'connecting' ? 'bg-blue-50 text-blue-600' : 'bg-slate-50 text-slate-400'
                  }`}>
                    {device.type === 'usb' ? <Usb size={28} /> : <Cpu size={28} />}
                  </div>
                  <button 
                    onClick={() => handleRemove(device.id)}
                    className="p-2 text-slate-300 hover:text-red-500 transition-colors"
                  >
                    <Trash2 size={18} />
                  </button>
                </div>

                <div>
                  <div className="flex items-center gap-2 mb-1">
                    <span className={`w-2 h-2 rounded-full ${
                      device.status === 'connected' ? 'bg-emerald-500 animate-pulse' : 
                      device.status === 'connecting' ? 'bg-blue-500 animate-spin' : 'bg-slate-300'
                    }`}></span>
                    <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">
                      {device.status === 'connected' ? 'Ativo' : 
                       device.status === 'connecting' ? 'Conectando...' : 'Desconectado'}
                    </span>
                  </div>
                  <h4 className="text-xl font-black text-slate-900 uppercase tracking-tighter leading-tight">
                    {device.name}
                  </h4>
                  {device.isQuantum && (
                    <div className="mt-1 inline-flex items-center gap-1 px-2 py-0.5 bg-blue-50 text-blue-600 rounded-md border border-blue-100">
                      <Zap size={10} fill="currentColor" />
                      <span className="text-[8px] font-black uppercase tracking-widest">Bio-Ressonância</span>
                    </div>
                  )}
                  <p className="text-slate-400 text-[10px] font-bold uppercase tracking-widest mt-1">ID: {device.id.split('-')[0]}</p>
                </div>

                <div className="pt-4 border-t border-slate-50 flex items-center justify-between">
                  <div className="flex items-center gap-4">
                    <div className="flex flex-col">
                      <span className="text-[8px] font-black text-slate-400 uppercase">Sinal</span>
                      <div className="flex gap-0.5 mt-1">
                        {[1, 2, 3, 4].map(i => (
                          <div key={i} className={`w-1 h-3 rounded-full ${i <= 3 ? 'bg-emerald-500' : 'bg-slate-100'}`}></div>
                        ))}
                      </div>
                    </div>
                    <div className="flex flex-col">
                      <span className="text-[8px] font-black text-slate-400 uppercase">Latência</span>
                      <span className="text-[10px] font-bold text-slate-700">12ms</span>
                    </div>
                  </div>
                  
                  {device.status === 'connected' && (
                    <div className="flex items-center gap-1 text-emerald-600">
                      <Zap size={14} fill="currentColor" />
                      <span className="text-[10px] font-black uppercase tracking-tighter">Sincronizado</span>
                    </div>
                  )}
                </div>
              </div>
              
              <div className={`px-8 py-4 flex items-center justify-between ${
                device.status === 'connected' ? 'bg-emerald-600 text-white' : 'bg-slate-50 text-slate-400'
              }`}>
                <span className="text-[10px] font-black uppercase tracking-widest">
                  {device.status === 'connected' ? 'Recebendo Dados' : 'Aguardando'}
                </span>
                {device.status === 'connected' ? <Activity size={16} className="animate-pulse" /> : <Info size={16} />}
              </div>
              
              {device.isQuantum && device.status === 'connected' && (
                <button 
                  onClick={() => setView('quantum')}
                  className="w-full bg-blue-600 text-white py-4 font-black text-[10px] uppercase tracking-widest hover:bg-blue-700 transition-all flex items-center justify-center gap-2"
                >
                  <Sparkles size={14} /> Iniciar Bio-Ressonância
                </button>
              )}
            </motion.div>
          ))}
        </AnimatePresence>

        {connectedDevices.length === 0 && !isScanning && (
          <div className="col-span-full py-20 text-center space-y-6 bg-slate-50 rounded-[3rem] border-2 border-dashed border-slate-200">
            <div className="w-20 h-20 bg-white rounded-3xl shadow-sm flex items-center justify-center mx-auto text-slate-300">
              <Usb size={40} />
            </div>
            <div className="space-y-2">
              <h3 className="text-xl font-black text-slate-900 uppercase">Nenhum Dispositivo Pareado</h3>
              <p className="text-slate-500 text-sm max-w-xs mx-auto font-medium">
                Conecte seu dispositivo Consulfision na porta USB e clique em "Detectar Novo Dispositivo".
              </p>
            </div>
          </div>
        )}
      </div>

      <div className="bg-slate-900 rounded-[3rem] p-10 text-white relative overflow-hidden">
        <div className="relative z-10 grid grid-cols-1 md:grid-cols-2 gap-12 items-center">
          <div className="space-y-6">
            <div className="inline-flex items-center gap-2 px-4 py-2 bg-emerald-500/20 text-emerald-400 rounded-full text-[10px] font-black uppercase tracking-widest">
              <Zap size={14} /> Inteligência de Hardware
            </div>
            <h3 className="text-4xl font-black uppercase tracking-tighter leading-none">
              Sincronização <br /> em <span className="text-emerald-500">Tempo Real</span>
            </h3>
            <p className="text-slate-400 font-medium">
              Nossa tecnologia de detecção inteligente identifica automaticamente sensores de biofeedback, 
              iridoscópios digitais e geradores de frequência Consulfision.
            </p>
            <div className="flex flex-wrap gap-4">
              <div className="flex items-center gap-2 bg-white/5 px-4 py-2 rounded-xl border border-white/10">
                <CheckCircle2 size={14} className="text-emerald-500" />
                <span className="text-[10px] font-black uppercase tracking-widest">Plug & Play</span>
              </div>
              <div className="flex items-center gap-2 bg-white/5 px-4 py-2 rounded-xl border border-white/10">
                <CheckCircle2 size={14} className="text-emerald-500" />
                <span className="text-[10px] font-black uppercase tracking-widest">Criptografia Ponta-a-Ponta</span>
              </div>
            </div>
            
            <div className="pt-6 border-t border-white/10">
              <button 
                onClick={() => handleSearchSetup("Quantum Resonance Magnetic Analyzer NSO Setup")}
                disabled={isSearchingSetup}
                className="flex items-center gap-2 text-emerald-400 hover:text-emerald-300 transition-colors font-black text-[10px] uppercase tracking-widest"
              >
                {isSearchingSetup ? <RefreshCw className="animate-spin" size={14} /> : <Search size={14} />}
                Buscar Setup de Bioressonância no Google
              </button>
            </div>
          </div>
          <div className="relative">
            <div className="aspect-square bg-emerald-500/10 rounded-full blur-3xl absolute inset-0"></div>
            <div className="relative bg-white/5 border border-white/10 p-8 rounded-[2.5rem] backdrop-blur-xl">
              {setupInfo ? (
                <div className="space-y-4">
                  <div className="flex justify-between items-center pb-4 border-b border-white/10">
                    <span className="text-[10px] font-black uppercase tracking-widest text-emerald-500">Setup Localizado</span>
                    <button onClick={() => setSetupInfo(null)} className="text-slate-500 hover:text-white">×</button>
                  </div>
                  <div className="text-xs text-slate-300 leading-relaxed max-h-40 overflow-y-auto custom-scrollbar pr-2">
                    {setupInfo.text}
                  </div>
                  <div className="space-y-2">
                    {setupInfo.links.map((link, i) => (
                      <a 
                        key={i} 
                        href={link.uri} 
                        target="_blank" 
                        rel="noopener noreferrer"
                        className="flex items-center justify-between p-3 bg-white/5 hover:bg-white/10 rounded-xl border border-white/10 transition-all group"
                      >
                        <span className="text-[10px] font-bold truncate max-w-[200px]">{link.title}</span>
                        <ExternalLink size={12} className="text-emerald-500 group-hover:scale-110 transition-transform" />
                      </a>
                    ))}
                  </div>
                </div>
              ) : (
                <div className="space-y-4">
                  <div className="flex justify-between items-center pb-4 border-b border-white/10">
                    <span className="text-[10px] font-black uppercase tracking-widest text-slate-400">Status do Barramento</span>
                    <span className="text-[10px] font-black uppercase tracking-widest text-emerald-500">Otimizado</span>
                  </div>
                  <div className="space-y-2">
                    <div className="flex justify-between text-[10px] font-bold">
                      <span className="text-slate-400">Taxa de Transferência</span>
                      <span>480 Mbps</span>
                    </div>
                    <div className="h-1.5 bg-white/5 rounded-full overflow-hidden">
                      <motion.div 
                        initial={{ width: 0 }}
                        animate={{ width: '65%' }}
                        className="h-full bg-emerald-500"
                      ></motion.div>
                    </div>
                  </div>
                  <div className="space-y-2">
                    <div className="flex justify-between text-[10px] font-bold">
                      <span className="text-slate-400">Integridade de Dados</span>
                      <span>99.9%</span>
                    </div>
                    <div className="h-1.5 bg-white/5 rounded-full overflow-hidden">
                      <motion.div 
                        initial={{ width: 0 }}
                        animate={{ width: '99%' }}
                        className="h-full bg-emerald-500"
                      ></motion.div>
                    </div>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
        <div className="absolute top-0 right-0 p-12 text-white/5 text-9xl font-black select-none pointer-events-none">
          USB 3.0
        </div>
      </div>
    </div>
  );
};
