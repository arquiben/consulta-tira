
import React, { useState } from 'react';
import { translations } from '../translations';
import { UserRole } from '../types';
import { getGeminiAI, withRetry } from '../services/gemini';
import { ShieldCheck } from 'lucide-react';

interface LoginScreenProps {
  onLogin: (pass: string, role: UserRole) => void;
  language: string;
}

export const LoginScreen: React.FC<LoginScreenProps> = ({ onLogin, language }) => {
  const [password, setPassword] = useState('');
  const [selectedRole, setSelectedRole] = useState<UserRole | null>(null);
  const [regNumber, setRegNumber] = useState('');
  const [organization, setOrganization] = useState('');
  const [isValidating, setIsValidating] = useState(false);
  const [validationError, setValidationError] = useState('');
  const t = translations[language] || translations.pt;

  const roles = [
    { id: UserRole.DOCTOR, label: t.role_doctor, icon: 'https://images.unsplash.com/photo-1612349317150-e413f6a5b16d?auto=format&fit=crop&w=400&h=400' },
    { id: UserRole.THERAPIST, label: t.role_therapist, icon: 'https://images.unsplash.com/photo-1551836022-d5d88e9218df?auto=format&fit=crop&w=400&h=400' },
    { id: UserRole.STUDENT, label: t.role_student, icon: 'https://images.unsplash.com/photo-1494790108377-be9c29b29330?auto=format&fit=crop&w=400&h=400' },
    { id: UserRole.PATIENT, label: t.role_patient, icon: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?auto=format&fit=crop&w=400&h=400' },
  ];

  const validateProfessional = async () => {
    if (!regNumber) {
      setValidationError("Por favor, insira o número de registro.");
      return false;
    }

    if (selectedRole === UserRole.THERAPIST && !organization) {
      setValidationError("Por favor, selecione ou insira a organização.");
      return false;
    }

    setIsValidating(true);
    setValidationError('');

    try {
      const ai = getGeminiAI();
      const prompt = `Valide se as seguintes credenciais profissionais parecem autênticas para um ${selectedRole}. 
      Número de Registro/Ordem: ${regNumber}
      Organização/País: ${organization || 'Ordem dos Médicos'}
      
      Responda APENAS com um JSON no formato: {"valid": boolean, "reason": "string"}. 
      Considere formatos comuns de Angola (Fometra, Cometa, Meva, Câmara) e outros países. 
      Se o número for muito curto ou parecer aleatório, marque como inválido.`;

      const response = await withRetry(() => ai.models.generateContent({
        model: 'gemini-3-flash-preview',
        contents: [{ text: prompt }],
        config: { responseMimeType: 'application/json' }
      }));

      const result = JSON.parse(response.text || '{"valid": false}');
      if (result.valid) {
        return true;
      } else {
        setValidationError(result.reason || "Credenciais não reconhecidas pelo sistema de verificação.");
        return false;
      }
    } catch (err) {
      console.error(err);
      // Fallback for demo purposes if AI fails
      if (regNumber.length >= 4) return true;
      setValidationError("Erro na verificação. Tente novamente.");
      return false;
    } finally {
      setIsValidating(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedRole) return;

    if (selectedRole === UserRole.DOCTOR || selectedRole === UserRole.THERAPIST) {
      const isValid = await validateProfessional();
      if (!isValid) return;
    }

    onLogin(password, selectedRole);
  };

  return (
    <div className="fixed inset-0 z-[300] bg-slate-900 flex flex-col items-center justify-center p-4 overflow-y-auto">
      <div className="max-w-md w-full bg-white rounded-3xl shadow-2xl overflow-hidden p-5 md:p-8 space-y-4 animate-slideUp my-auto">
        <div className="text-center space-y-1">
          <div className="w-10 h-10 bg-emerald-600 text-white rounded-xl mx-auto flex items-center justify-center shadow-lg">
            <ShieldCheck size={20} />
          </div>
          <h2 className="text-lg font-black text-slate-900 uppercase tracking-tighter">{t.selectProfile}</h2>
          <p className="text-slate-400 text-[7px] font-black uppercase tracking-widest">{t.authAuthor}</p>
        </div>

        <div className="grid grid-cols-2 gap-2">
          {roles.map((role) => (
            <button
              key={role.id}
              onClick={() => setSelectedRole(role.id)}
              className={`p-2 rounded-xl border-2 transition-all flex flex-col items-center gap-1 text-center ${
                selectedRole === role.id 
                  ? 'border-emerald-500 bg-emerald-50 shadow-md scale-105' 
                  : 'border-slate-100 bg-slate-50 hover:bg-white hover:border-emerald-200'
              }`}
            >
              <div className="w-10 h-10 rounded-lg overflow-hidden shadow-sm border-2 border-white">
                <img 
                  src={role.icon} 
                  alt={role.label} 
                  className="w-full h-full object-cover"
                  referrerPolicy="no-referrer"
                />
              </div>
              <span className="font-black text-[7px] uppercase tracking-tight text-slate-700">{role.label}</span>
            </button>
          ))}
        </div>

        {selectedRole && (
          <form onSubmit={handleSubmit} className="space-y-3 animate-fadeIn">
            {(selectedRole === UserRole.DOCTOR || selectedRole === UserRole.THERAPIST) && (
              <div className="space-y-2 p-3 bg-slate-50 rounded-xl border border-slate-100">
                <div className="space-y-1">
                  <label className="text-[7px] font-black text-slate-400 uppercase tracking-widest block">
                    {selectedRole === UserRole.DOCTOR ? 'Número de Ordem dos Médicos' : 'Organização (Fometra, Cometa, Meva, etc.)'}
                  </label>
                  {selectedRole === UserRole.THERAPIST ? (
                    <select 
                      value={organization}
                      onChange={(e) => setOrganization(e.target.value)}
                      className="w-full p-2 bg-white rounded-lg border border-slate-200 font-bold outline-none focus:ring-2 focus:ring-emerald-500/10 transition-all text-[9px]"
                    >
                      <option value="">Selecione a Organização</option>
                      <option value="Fometra">FOMETRA</option>
                      <option value="Cometa">COMETA</option>
                      <option value="Meva">MEVA</option>
                      <option value="Camara">Câmara de Terapeutas</option>
                      <option value="Outra">Outra Organização</option>
                    </select>
                  ) : null}
                  <input 
                    type="text" 
                    placeholder={selectedRole === UserRole.DOCTOR ? "Ex: OM-12345" : "Número de Registro"}
                    value={regNumber}
                    onChange={(e) => setRegNumber(e.target.value)}
                    className="w-full p-2 bg-white rounded-lg border border-slate-200 font-bold outline-none focus:ring-2 focus:ring-emerald-500/10 transition-all text-[9px]"
                  />
                </div>
              </div>
            )}

            <div className="space-y-1">
              <label className="text-[7px] font-black text-slate-400 uppercase tracking-widest block text-center">
                {selectedRole === UserRole.PATIENT ? 'Identificação do Paciente (Opcional)' : t.accessPassword}
              </label>
              <input 
                type="password" 
                placeholder={t.passwordPlaceholder}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full p-2.5 bg-slate-50 rounded-xl border-2 border-slate-100 focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500/10 transition-all text-center font-bold outline-none text-xs"
              />
            </div>

            {validationError && (
              <p className="text-red-500 text-[7px] font-black uppercase text-center animate-pulse">
                ⚠️ {validationError}
              </p>
            )}

            <button 
              type="submit"
              disabled={isValidating}
              className="w-full bg-emerald-600 text-white py-2.5 rounded-xl font-black text-[9px] uppercase tracking-widest shadow-lg hover:bg-emerald-700 transition-all active:scale-95 disabled:opacity-50 flex items-center justify-center gap-2"
            >
              {isValidating ? (
                <>
                  <span className="w-3 h-3 border-2 border-white border-t-transparent rounded-full animate-spin"></span>
                  Verificando...
                </>
              ) : t.login}
            </button>
          </form>
        )}
      </div>
    </div>
  );
};
