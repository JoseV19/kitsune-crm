'use client';

import { useState } from 'react';
import { supabase } from '@/lib/SupabaseClient';
import { Loader2, ShieldCheck, Mail, Lock, UserPlus, LogIn } from 'lucide-react';


interface LoginPageProps {
  onLogin: (name: string, role: string) => void;
}

export function LoginPage({ onLogin }: LoginPageProps) { 
  const [loading, setLoading] = useState(false);
  const [isRegistering, setIsRegistering] = useState(false);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [errorMsg, setErrorMsg] = useState('');

  const handleAuth = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setErrorMsg('');

    try {
        if (isRegistering) {
            const { error } = await supabase.auth.signUp({ email, password });
            if (error) throw error;
            alert("¡Usuario creado! Ya puedes iniciar sesión.");
        } else {
            // --- LOGIN ---
            const { data, error } = await supabase.auth.signInWithPassword({ email, password });
            if (error) throw error;

            
            const name = data.user?.email?.split('@')[0] || 'Agente';
            onLogin(name, 'Senior Operative'); 
        }
    } catch (error: any) {
        setErrorMsg(error.message === 'Invalid login credentials' 
            ? 'Correo o contraseña incorrectos' 
            : error.message);
    } finally {
        setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-black flex flex-col items-center justify-center relative overflow-hidden">
        {/* Fondo Decorativo */}
        <div className="absolute inset-0 z-0">
             <div className="absolute inset-0 bg-[linear-gradient(rgba(45,212,191,0.05)_1px,transparent_1px),linear-gradient(90deg,rgba(45,212,191,0.05)_1px,transparent_1px)] bg-[size:40px_40px]"></div>
             <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] bg-kiriko-teal/5 blur-[120px] rounded-full"></div>
        </div>

        <div className="relative z-10 w-full max-w-md p-8">
            <div className="text-center mb-10">
                <img src="/logo-kiriko.png" alt="Kitsune" className="w-48 mx-auto mb-6 drop-shadow-[0_0:15px_rgba(45,212,191,0.5)]" />
                <h2 className="text-xl font-bold text-white tracking-widest uppercase flex items-center justify-center gap-2">
                    <ShieldCheck className="text-kiriko-teal" /> Acceso Seguro
                </h2>
            </div>

            <div className="bg-slate-900/50 backdrop-blur-md border border-slate-800 p-8 rounded-2xl shadow-2xl">
                <form onSubmit={handleAuth} className="space-y-6">
                    <div className="space-y-2">
                        <label className="text-xs font-bold text-slate-400 uppercase ml-1">Correo Corporativo</label>
                        <div className="relative group">
                            <Mail className="absolute left-3 top-3.5 text-slate-500 group-focus-within:text-kiriko-teal transition-colors" size={18} />
                            <input 
                                type="email" required value={email}
                                onChange={(e) => setEmail(e.target.value)}
                                className="w-full bg-black/50 border border-slate-700 rounded-xl py-3 pl-10 pr-4 text-white focus:border-kiriko-teal outline-none transition-all"
                                placeholder="agente@zionak.com"
                            />
                        </div>
                    </div>

                    <div className="space-y-2">
                        <label className="text-xs font-bold text-slate-400 uppercase ml-1">Contraseña</label>
                        <div className="relative group">
                            <Lock className="absolute left-3 top-3.5 text-slate-500 group-focus-within:text-kiriko-teal transition-colors" size={18} />
                            <input 
                                type="password" required value={password}
                                onChange={(e) => setPassword(e.target.value)}
                                className="w-full bg-black/50 border border-slate-700 rounded-xl py-3 pl-10 pr-4 text-white focus:border-kiriko-teal outline-none transition-all"
                                placeholder="••••••••"
                            />
                        </div>
                    </div>

                    {errorMsg && <div className="p-3 bg-red-500/10 border border-red-500/50 rounded-lg text-red-400 text-xs text-center font-bold">⚠️ {errorMsg}</div>}

                    <button 
                        type="submit" disabled={loading}
                        className="w-full bg-kiriko-teal hover:bg-teal-400 text-black font-bold py-3 rounded-xl transition-all flex items-center justify-center gap-2 uppercase tracking-wide text-sm"
                    >
                        {loading ? <Loader2 className="animate-spin" /> : (isRegistering ? <UserPlus size={18}/> : <LogIn size={18}/>)}
                        {isRegistering ? 'Crear Cuenta' : 'Iniciar Sesión'}
                    </button>
                </form>

                <div className="mt-6 text-center">
                    <button 
                        onClick={() => { setIsRegistering(!isRegistering); setErrorMsg(''); }}
                        className="text-slate-500 hover:text-white text-xs underline transition-colors"
                    >
                        {isRegistering ? '¿Ya tienes cuenta? Inicia sesión' : '¿No tienes acceso? Crea una cuenta'}
                    </button>
                </div>
            </div>
        </div>
    </div>
  );
}