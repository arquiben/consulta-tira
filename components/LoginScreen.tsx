
import React, { useState } from 'react';
import { translations } from '../translations';
import { UserRole } from '../types';

interface LoginScreenProps {
  onLogin: (pass: string, role: UserRole) => void;
  language: string;
}

export const LoginScreen: React.FC<LoginScreenProps> = ({ onLogin, language }) => {
  const [password, setPassword] = useState('');
  const [selectedRole, setSelectedRole] = useState<UserRole | null>(null);
  const t = translations[language] || translations.pt;

  const roles = [
    { id: UserRole.DOCTOR, label: t.role_doctor, icon: '👨‍⚕️' },
    { id: UserRole.THERAPIST, label: t.role_therapist, icon: '🧑‍⚕️' },
    { id: UserRole.STUDENT, label: t.role_student, icon: '🧑‍💼' },
    { id: UserRole.PATIENT, label: t.role_patient, icon: '🧑‍🦱' },
  ];

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (selectedRole) {
      onLogin(password, selectedRole);
    }
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
              className={`p-6 rounded-[2rem] border-2 transition-all flex flex-col items-center gap-3 text-center ${
                selectedRole === role.id 
                  ? 'border-emerald-500 bg-emerald-50 shadow-lg scale-105' 
                  : 'border-slate-100 bg-slate-50 hover:bg-white hover:border-emerald-200'
              }`}
            >
              <span className="text-4xl">{role.icon}</span>
              <span className="font-black text-xs uppercase tracking-tight text-slate-700">{role.label}</span>
            </button>
          ))}
        </div>

        {selectedRole && (
          <form onSubmit={handleSubmit} className="space-y-6 animate-fadeIn">
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
                autoFocus
              />
            </div>

            <button 
              type="submit"
              className="w-full bg-emerald-600 text-white py-6 rounded-3xl font-black text-sm uppercase tracking-widest shadow-xl hover:bg-emerald-700 transition-all active:scale-95"
            >
              {t.login}
            </button>
          </form>
        )}
      </div>
    </div>
  );
};
