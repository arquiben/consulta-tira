
import React, { useState } from 'react';
import { LicenseType } from '../types';

interface ActivationScreenProps {
  onActivate: (type: LicenseType, key?: string) => void;
  expired?: boolean;
  currentType?: LicenseType;
}

export const ActivationScreen: React.FC<ActivationScreenProps> = ({ onActivate, expired, currentType }) => {
  const [key, setKey] = useState('');
  const [error, setError] = useState('');
  const [view, setView] = useState<'plans' | 'key'>('plans');
  const [loadingPlan, setLoadingPlan] = useState<LicenseType | null>(null);

  const handleManualActivate = (e: React.FormEvent) => {
    e.preventDefault();
    const isCreatorKey = key === '16091965';
    const isAdminKey = key.toUpperCase() === 'NSOFISION-ADMIN';
    const isValidKey = /^NSO-[A-Z0-9]{4}-[A-Z0-9]{4}$/.test(key.toUpperCase());
    
    if (isCreatorKey) {
      onActivate(LicenseType.CREATOR, key);
    } else if (isAdminKey || isValidKey) {
      onActivate(LicenseType.PROFESSIONAL, key.toUpperCase());
    } else {
      setError('Chave de ativação inválida ou expirada.');
    }
  };

  const simulatePayment = (type: LicenseType) => {
    setLoadingPlan(type);
    // Simula a ativação automática após o "pagamento"
    setTimeout(() => {
      onActivate(type);
      setLoadingPlan(null);
    }, 2000);
  };

  const plans = [
    {
      type: LicenseType.GO,
      name: "Plano GO",
      price: "99€",
      period: "/ano",
      color: "from-amber-400 to-amber-600",
      features: ["Análise de Voz Básica", "Protocolos Sugeridos", "1 Ano de Acesso", "Suporte Email"],
      icon: "⚡"
    },
    {
      type: LicenseType.PREMIUM,
      name: "Plano PREMIUM",
      price: "199€",
      period: "/ano",
      color: "from-blue-500 to-blue-700",
      features: ["Análise IA Profunda", "Mapeamento 3D Ilimitado", "Hardware USB Hub", "1 Ano de Acesso", "Suporte VIP"],
      icon: "💎",
      popular: true
    },
    {
      type: LicenseType.PROFESSIONAL,
      name: "Plano PROFISSIONAL",
      price: "349€",
      period: "/ano",
      color: "from-slate-800 to-black",
      features: ["Tudo do Premium", "White Label (Sua Logo)", "Multi-Dispositivos", "Backup NSO Ilimitado", "Certificado de Autoria"],
      icon: "🏆"
    }
  ];

  return (
    <div className="fixed inset-0 z-[1000] bg-emerald-950 flex items-center justify-center p-6 overflow-y-auto">
      <div className="max-w-5xl w-full bg-white rounded-[4rem] shadow-[0_50px_150px_rgba(0,0,0,0.6)] overflow-hidden animate-slideUp">
        
        {/* Header de Alerta */}
        <div className={`p-10 text-center space-y-2 ${expired ? 'bg-red-600' : 'bg-slate-900'}`}>
          <h1 className="text-3xl font-black text-white uppercase tracking-tighter">
            {expired ? 'Sua Licença Expirou' : 'Seu Período de Teste Acabou'}
          </h1>
          <p className="text-white/60 text-xs font-bold uppercase tracking-[0.3em]">Escolha um plano para continuar sua jornada clínica</p>
        </div>

        <div className="p-10 md:p-16">
          {view === 'plans' ? (
            <div className="space-y-12">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
                {plans.map((plan) => (
                  <div 
                    key={plan.type}
                    className={`relative flex flex-col p-8 rounded-[3rem] border transition-all hover:scale-105 ${plan.popular ? 'border-blue-500 bg-blue-50/30 ring-4 ring-blue-500/10' : 'border-slate-100 bg-slate-50'}`}
                  >
                    {plan.popular && (
                      <div className="absolute -top-4 left-1/2 -translate-x-1/2 bg-blue-600 text-white px-4 py-1 rounded-full text-[10px] font-black uppercase tracking-widest shadow-lg">Mais Popular</div>
                    )}
                    
                    <div className="mb-6 flex justify-between items-start">
                       <span className="text-4xl">{plan.icon}</span>
                       <div className="text-right">
                          <p className="text-2xl font-black text-slate-900 leading-none">{plan.price}</p>
                          <p className="text-[10px] text-slate-400 font-bold uppercase tracking-widest">{plan.period}</p>
                       </div>
                    </div>

                    <h3 className="text-xl font-black text-slate-900 uppercase tracking-tight mb-6">{plan.name}</h3>
                    
                    <ul className="flex-1 space-y-4 mb-10">
                      {plan.features.map((f, i) => (
                        <li key={i} className="flex items-center gap-3 text-xs font-bold text-slate-600">
                          <span className="text-emerald-500">✓</span> {f}
                        </li>
                      ))}
                    </ul>

                    <button 
                      onClick={() => simulatePayment(plan.type)}
                      disabled={!!loadingPlan}
                      className={`w-full py-5 rounded-2xl font-black text-[10px] uppercase tracking-widest transition-all shadow-xl active:scale-95 text-white bg-gradient-to-r ${plan.color} ${loadingPlan === plan.type ? 'opacity-70 animate-pulse' : 'hover:shadow-2xl hover:brightness-110'}`}
                    >
                      {loadingPlan === plan.type ? 'Processando...' : 'Ativar Agora'}
                    </button>
                  </div>
                ))}
              </div>

              {/* Nota sobre Conectividade */}
              <div className="bg-amber-50 p-6 rounded-3xl border border-amber-100 flex items-center gap-4">
                 <span className="text-2xl">📶</span>
                 <p className="text-[10px] font-black uppercase text-amber-700 tracking-widest leading-relaxed">
                   Nota: O ecossistema Consulfision utiliza Inteligência Artificial em Nuvem de alto desempenho. É necessário Wi-Fi ou Dados Móveis ativos para o funcionamento pleno.
                 </p>
              </div>

              <div className="flex flex-col items-center gap-4">
                <button 
                  onClick={() => setView('key')}
                  className="text-slate-400 font-black text-[10px] uppercase tracking-widest hover:text-emerald-600 transition-colors"
                >
                  Já possui uma matrícula NSO? Clique aqui
                </button>
                <div className="flex items-center gap-3 opacity-30 grayscale">
                  <div className="h-12 w-20 bg-slate-200 rounded-lg"></div>
                  <div className="h-12 w-20 bg-slate-200 rounded-lg"></div>
                  <div className="h-12 w-20 bg-slate-200 rounded-lg"></div>
                </div>
              </div>
            </div>
          ) : (
            <div className="max-w-md mx-auto space-y-8 animate-fadeIn">
               <div className="text-center">
                  <h3 className="text-2xl font-black text-slate-900 uppercase tracking-tighter">Ativação por Matrícula</h3>
                  <p className="text-slate-500 text-sm mt-1">Insira seu código serial recebido após o pagamento manual.</p>
               </div>

               <form onSubmit={handleManualActivate} className="space-y-6">
                 <input 
                   type="text" 
                   value={key}
                   onChange={(e) => { setKey(e.target.value); setError(''); }}
                   placeholder="NSO-XXXX-XXXX"
                   className="w-full p-6 bg-slate-50 rounded-3xl border-2 border-slate-100 font-mono text-center text-xl font-bold uppercase focus:border-emerald-500 outline-none transition-all"
                 />
                 {error && <p className="text-red-500 text-[10px] font-black uppercase text-center">{error}</p>}
                 
                 <button className="w-full bg-emerald-600 text-white py-6 rounded-3xl font-black text-xs uppercase tracking-widest shadow-2xl">Validar Ativação</button>
                 <button type="button" onClick={() => setView('plans')} className="w-full text-slate-400 font-black text-[10px] uppercase tracking-widest">Voltar para Planos</button>
               </form>
            </div>
          )}
        </div>

        <div className="bg-slate-50 p-6 text-center border-t border-slate-100 flex justify-center gap-10">
           <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest">Suporte: clinicansofisionnsofision@gmail.com</p>
           <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest">Autoria: Quissambi Benvindo</p>
        </div>
      </div>
    </div>
  );
};
