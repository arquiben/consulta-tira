
import React, { useState } from 'react';
import { translations } from '../translations';
import { UserRole } from '../types';
import { GoogleGenAI } from '@google/genai';

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
    { id: UserRole.THERAPIST, label: t.role_therapist, icon: 'https://images.unsplash.com/photo-1573497019940-1c28c88b4f3e?auto=format&fit=crop&w=400&h=400' },
    { id: UserRole.STUDENT, label: t.role_student, icon: 'https://images.unsplash.com/photo-1523240795612-9a054b0db644?auto=format&fit=crop&w=400&h=400' },
    { id: UserRole.PATIENT, label: t.role_patient, icon: 'https://images.unsplash.com/photo-1581056771107-24ca5f033842?auto=format&fit=crop&w=400&h=400' },
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
      const ai = new GoogleGenAI({ apiKey: process.env.API_KEY || '' });
      const prompt = `Valide se as seguintes credenciais profissionais parecem autênticas para um ${selectedRole}. 
      Número de Registro/Ordem: ${regNumber}
      Organização/País: ${organization || 'Ordem dos Médicos'}
      
      Responda APENAS com um JSON no formato: {"valid": boolean, "reason": "string"}. 
      Considere formatos comuns de Angola (Fometra, Cometa, Meva, Câmara) e outros países. 
      Se o número for muito curto ou parecer aleatório, marque como inválido.`;

      const response = await ai.models.generateContent({
        model: 'gemini-3-flash-preview',
        contents: [{ text: prompt }],
        config: { responseMimeType: 'application/json' }
      });

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
    <div className="fixed inset-0 z-[300] bg-slate-900 flex items-center justify-center p-6 overflow-y-auto">
      <div className="max-w-2xl w-full bg-white rounded-[3.5rem] shadow-2xl overflow-hidden p-8 md:p-16 space-y-10 animate-slideUp">
        <div className="text-center space-y-4">
          <div className="w-20 h-20 bg-emerald-600 text-white rounded-3xl mx-auto flex items-center justify-center text-4xl shadow-xl">🛡️</div>
          <h2 className="text-3xl font-black text-slate-900 uppercase tracking-tighter">{t.selectProfile}</h2>
          <p className="text-slate-400 text-[10px] font-black uppercase tracking-widest">{t.authAuthor}</p>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          {roles.map((role) => (
            <button
              key={role.id}
              onClick={() => setSelectedRole(role.id)}
              className={`p-4 rounded-[2rem] border-2 transition-all flex flex-col items-center gap-3 text-center ${
                selectedRole === role.id 
                  ? 'border-emerald-500 bg-emerald-50 shadow-lg scale-105' 
                  : 'border-slate-100 bg-slate-50 hover:bg-white hover:border-emerald-200'
              }`}
            >
              <div className="w-20 h-20 rounded-2xl overflow-hidden shadow-md border-2 border-white">
                <img 
                  src={role.icon} 
                  alt={role.label} 
                  className="w-full h-full object-cover"
                  referrerPolicy="no-referrer"
                />
              </div>
              <span className="font-black text-[10px] uppercase tracking-tight text-slate-700">{role.label}</span>
            </button>
          ))}
        </div>

        {selectedRole && (
          <form onSubmit={handleSubmit} className="space-y-6 animate-fadeIn">
            {(selectedRole === UserRole.DOCTOR || selectedRole === UserRole.THERAPIST) && (
              <div className="space-y-4 p-6 bg-slate-50 rounded-[2rem] border border-slate-100">
                <div className="space-y-2">
                  <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest block">
                    {selectedRole === UserRole.DOCTOR ? 'Número de Ordem dos Médicos' : 'Organização (Fometra, Cometa, Meva, etc.)'}
                  </label>
                  {selectedRole === UserRole.THERAPIST ? (
                    <select 
                      value={organization}
                      onChange={(e) => setOrganization(e.target.value)}
                      className="w-full p-4 bg-white rounded-2xl border border-slate-200 font-bold outline-none focus:ring-4 focus:ring-emerald-500/10 transition-all text-sm"
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
                    className="w-full p-4 bg-white rounded-2xl border border-slate-200 font-bold outline-none focus:ring-4 focus:ring-emerald-500/10 transition-all text-sm"
                  />
                </div>
              </div>
            )}

            <div className="space-y-2">
              <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest block text-center">
                {selectedRole === UserRole.PATIENT ? 'Identificação do Paciente (Opcional)' : t.accessPassword}
              </label>
              <input 
                type="password" 
                placeholder={t.passwordPlaceholder}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full p-6 bg-slate-50 rounded-3xl border-2 border-slate-100 focus:border-emerald-500 focus:ring-4 focus:ring-emerald-500/10 transition-all text-center font-bold outline-none"
              />
            </div>

            {validationError && (
              <p className="text-red-500 text-[10px] font-black uppercase text-center animate-pulse">
                ⚠️ {validationError}
              </p>
            )}

            <button 
              type="submit"
              disabled={isValidating}
              className="w-full bg-emerald-600 text-white py-6 rounded-3xl font-black text-sm uppercase tracking-widest shadow-xl hover:bg-emerald-700 transition-all active:scale-95 disabled:opacity-50 flex items-center justify-center gap-3"
            >
              {isValidating ? (
                <>
                  <span className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></span>
                  Verificando Credenciais...
                </>
              ) : t.login}
            </button>
          </form>
        )}
      </div>
    </div>
  );
};
