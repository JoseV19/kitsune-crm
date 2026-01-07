'use client';

import { useState } from 'react';
import { ArrowRight, Lock } from 'lucide-react';
import { motion } from 'framer-motion';

interface LoginProps {
  onLogin: (name: string, role: string) => void;
}

export function LoginPage({ onLogin }: LoginProps) {
  const [username, setUsername] = useState('');
  const [role, setRole] = useState('Senior Operative');
  const [loading, setLoading] = useState(false);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!username) return;

    setLoading(true);
    setTimeout(() => {
        onLogin(username, role);
    }, 1500);
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-black relative overflow-hidden">
      
      {/* Fondo ambiental */}
      <div className="absolute inset-0 opacity-30 bg-[radial-gradient(ellipse_at_center,_var(--tw-gradient-stops))] from-kiriko-teal/20 via-black to-black"></div>

      <motion.div 
         initial={{ opacity: 0, scale: 0.9, y: 20 }}
         animate={{ opacity: 1, scale: 1, y: 0 }}
         transition={{ duration: 0.5 }}
         className="w-full max-w-md p-8 relative z-10"
      >
        {/* --- LOGO PRINCIPAL --- */}
        <div className="flex flex-col items-center mb-8">
            <div className="w-full max-w-[320px] mb-4 drop-shadow-[0_0_25px_rgba(45,212,191,0.3)]">
                {/* Ajustamos la imagen para que se mezcle bien */}
                <img src="/logo-kiriko.png" alt="Kitsune CRM" className="w-full h-auto object-contain" />
            </div>
            <p className="text-slate-500 text-xs tracking-[0.3em] uppercase animate-pulse">Sistema de Acceso Seguro</p>
        </div>

        <div className="bg-slate-900/60 backdrop-blur-md border border-slate-800 p-8 rounded-sm shadow-2xl relative overflow-hidden">
            {/* Pequeña decoración de luz arriba del form */}
            <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-transparent via-kiriko-teal to-transparent opacity-50"></div>
            
            <form onSubmit={handleSubmit} className="space-y-6">
                <div>
                    <label className="text-xs text-slate-400 uppercase tracking-wider font-bold mb-2 block">Agente / Usuario</label>
                    <input 
                        type="text" 
                        autoFocus
                        placeholder="Nombre clave..."
                        className="w-full bg-black/50 border border-slate-700 text-white p-3 rounded-sm focus:border-kiriko-teal focus:ring-1 focus:ring-kiriko-teal outline-none transition-all placeholder:text-slate-600"
                        value={username}
                        onChange={(e) => setUsername(e.target.value)}
                    />
                </div>

                <div>
                    <label className="text-xs text-slate-400 uppercase tracking-wider font-bold mb-2 block">Nivel de Acceso</label>
                    <div className="relative">
                        <Lock className="absolute left-3 top-3.5 text-slate-600" size={16} />
                        <select 
                            className="w-full bg-black/50 border border-slate-700 text-white p-3 pl-10 rounded-sm focus:border-kiriko-teal outline-none appearance-none cursor-pointer"
                            value={role}
                            onChange={(e) => setRole(e.target.value)}
                        >
                            <option>Senior Operative</option>
                            <option>Team Lead</option>
                            <option>Administrator</option>
                        </select>
                    </div>
                </div>

                <button 
                    disabled={loading}
                    className="w-full bg-kiriko-teal hover:bg-teal-400 text-black font-bold py-3.5 rounded-sm shadow-[0_0_20px_rgba(45,212,191,0.3)] hover:shadow-[0_0_30px_rgba(45,212,191,0.5)] transition-all flex items-center justify-center gap-2 group disabled:opacity-70 disabled:cursor-not-allowed"
                >
                    {loading ? (
                        <span className="animate-pulse">Verificando Credenciales...</span>
                    ) : (
                        <>
                            ENTRAR AL SISTEMA <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
                        </>
                    )}
                </button>
            </form>
        </div>

        <p className="text-center text-[10px] text-slate-700 mt-8 font-mono">
            © 2026 Zionak Studios. All rights reserved.
        </p>

      </motion.div>
    </div>
  );
}