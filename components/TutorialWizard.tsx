
import React, { useState } from 'react';

interface TutorialWizardProps {
  onClose: () => void;
}

const steps = [
  {
    title: "Bem-vindo ao Consulfision",
    description: "Este é o seu centro de inteligência clínica avançada. Aqui você integra medicina convencional e terapias holísticas com suporte de IA de última geração.",
    icon: "🚀",
    color: "bg-emerald-600"
  },
  {
    title: "1. Cadastro do Paciente",
    description: "Tudo começa na 'Ficha Clínica'. Preencha os dados do paciente e as queixas. O sistema calcula automaticamente o IMC para ajustar os protocolos de tratamento.",
    icon: "👤",
    color: "bg-blue-600"
  },
  {
    title: "2. Mapa Anatômico",
    description: "Use o 'Mapa Anatômico' para marcar pontos de dor ou desequilíbrio no corpo. A IA lerá essas marcações para sugerir pontos exatos de biomagnetismo ou acupuntura.",
    icon: "📍",
    color: "bg-amber-500"
  },
  {
    title: "3. Consulta por Voz",
    description: "Em 'Consulta & Voz', você pode conversar com a IA. Descreva sintomas ou peça explicações sobre doenças complexas. A IA transcreve e responde em tempo real.",
    icon: "🎙️",
    color: "bg-purple-600"
  },
  {
    title: "4. Análise de Exames",
    description: "Na 'Análise Digital', use a câmera para ler receitas e laudos, ou sincronize aparelhos de diagnóstico via Wi-Fi/Bluetooth para importação direta de dados.",
    icon: "📄",
    color: "bg-red-600"
  },
  {
    title: "5. Protocolos & Voz",
    description: "Os resultados aparecem em 'Protocolos IA'. Você verá o diagnóstico integrativo e poderá clicar no botão de som para que a IA leia o relatório em voz alta para o paciente.",
    icon: "🔊",
    color: "bg-emerald-500"
  },
  {
    title: "6. Histórico & Relatórios",
    description: "Todos os resultados são salvos. No 'Histórico Clínico' ou no botão de histórico do Dashboard, você recupera consultas passadas e acompanha a evolução.",
    icon: "📂",
    color: "bg-slate-900"
  }
];

export const TutorialWizard: React.FC<TutorialWizardProps> = ({ onClose }) => {
  const [currentStep, setCurrentStep] = useState(0);

  const next = () => currentStep < steps.length - 1 ? setCurrentStep(prev => prev + 1) : onClose();
  const prev = () => currentStep > 0 && setCurrentStep(prev => prev - 1);

  return (
    <div className="fixed inset-0 z-[1000] bg-slate-950/80 backdrop-blur-md flex items-center justify-center p-6">
      <div className="max-w-2xl w-full bg-white rounded-[3.5rem] shadow-2xl overflow-hidden animate-slideUp flex flex-col">
        
        {/* Header do Passo */}
        <div className={`${steps[currentStep].color} p-12 text-white text-center transition-colors duration-500 relative`}>
          <div className="absolute top-6 right-8 opacity-20 text-xs font-black uppercase tracking-widest">
            Passo {currentStep + 1} de {steps.length}
          </div>
          <div className="text-7xl mb-6 animate-bounce">{steps[currentStep].icon}</div>
          <h2 className="text-3xl font-black uppercase tracking-tighter leading-none">{steps[currentStep].title}</h2>
        </div>

        {/* Conteúdo */}
        <div className="p-10 md:p-14 space-y-8 flex-1">
          <p className="text-slate-600 text-lg font-medium leading-relaxed text-center">
            {steps[currentStep].description}
          </p>

          {/* Progress Bar */}
          <div className="flex gap-2 justify-center">
            {steps.map((_, i) => (
              <div 
                key={i} 
                className={`h-1.5 rounded-full transition-all duration-500 ${i === currentStep ? 'w-8 bg-emerald-600' : 'w-2 bg-slate-100'}`}
              ></div>
            ))}
          </div>
        </div>

        {/* Footer / Controles */}
        <div className="p-8 bg-slate-50 border-t border-slate-100 flex justify-between items-center">
          <button 
            onClick={prev}
            className={`px-8 py-4 rounded-2xl font-black text-[10px] uppercase tracking-widest transition-all ${currentStep === 0 ? 'opacity-0 pointer-events-none' : 'text-slate-400 hover:text-slate-600'}`}
          >
            Anterior
          </button>
          
          <button 
            onClick={next}
            className="bg-slate-900 text-white px-10 py-4 rounded-2xl font-black text-xs uppercase tracking-widest shadow-xl hover:bg-emerald-600 transition-all active:scale-95"
          >
            {currentStep === steps.length - 1 ? 'Começar a Usar ➔' : 'Próximo Passo'}
          </button>
        </div>
      </div>
    </div>
  );
};
