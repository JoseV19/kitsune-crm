'use client';

import { useState, useEffect } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { supabase } from '@/lib/services/supabase/client';
import { getActiveUserOrganizations } from '@/lib/services/organization.service';
import { setPasswordSchema, type SetPasswordFormData } from '@/lib/validations/user-management.schema';
import { Loader2, Lock, ShieldCheck, Mail } from 'lucide-react';

export default function SetPasswordPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [email, setEmail] = useState<string>('');

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<SetPasswordFormData>({
    resolver: zodResolver(setPasswordSchema),
  });

  useEffect(() => {
    // Get email from query params or try to get from current session
    const emailParam = searchParams.get('email');
    if (emailParam) {
      setEmail(emailParam);
    } else {
      // Try to get email from current session
      supabase.auth.getUser().then(({ data: { user } }) => {
        if (user?.email) {
          setEmail(user.email);
        }
      });
    }
  }, [searchParams]);

  const onSubmit = async (data: SetPasswordFormData) => {
    setLoading(true);
    setError(null);

    try {
      if (!email) {
        throw new Error('Email no proporcionado');
      }

      // Use API route to set password (works for users without passwords)
      const response = await fetch('/api/set-password', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          email,
          password: data.password,
        }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Error al establecer contraseña');
      }

      // Password set successfully, now try to sign in
      const { data: signInData, error: signInError } = await supabase.auth.signInWithPassword({
        email,
        password: data.password,
      });

      if (signInError || !signInData.user) {
        // Password was set but sign in failed, redirect to login
        router.push('/');
        return;
      }

      const activeMemberships = await getActiveUserOrganizations(signInData.user.id);

      if (activeMemberships.length === 1 && activeMemberships[0].organization?.slug) {
        const host = window.location.host;
        const isLocalhost = host.includes('localhost');
        const protocol = window.location.protocol;
        const slug = activeMemberships[0].organization?.slug;

        if (isLocalhost) {
          window.location.href = `${protocol}//${slug}.${host}`;
        } else {
          const baseDomain = host.split('.').slice(1).join('.');
          window.location.href = `${protocol}//${slug}.${baseDomain}`;
        }
        return;
      }

      if (activeMemberships.length > 1) {
        router.push('/select-organization');
        return;
      }

      // Fallback: redirect to login
      router.push('/');
    } catch (err: any) {
      setError(err.message || 'Error al establecer contraseña');
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
            <ShieldCheck className="text-kiriko-teal" /> Configurar Contraseña
          </h2>
          <p className="text-slate-400 text-sm mt-2">Establece tu contraseña para acceder al sistema</p>
        </div>

        <div className="bg-slate-900/50 backdrop-blur-md border border-slate-800 p-8 rounded-2xl shadow-2xl">
          {email && (
            <div className="mb-6 p-3 bg-slate-800/50 border border-slate-700 rounded-lg">
              <div className="flex items-center gap-2 text-slate-300 text-sm">
                <Mail className="text-kiriko-teal" size={16} />
                <span>{email}</span>
              </div>
            </div>
          )}

          <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
            <div className="space-y-2">
              <label className="text-xs font-bold text-slate-400 uppercase ml-1">Nueva Contraseña</label>
              <div className="relative group">
                <Lock className="absolute left-3 top-3.5 text-slate-500 group-focus-within:text-kiriko-teal transition-colors" size={18} />
                <input
                  type="password"
                  {...register('password')}
                  className="w-full bg-black/50 border border-slate-700 rounded-xl py-3 pl-10 pr-4 text-white focus:border-kiriko-teal outline-none transition-all"
                  placeholder="••••••••"
                />
              </div>
              {errors.password && (
                <p className="text-red-400 text-xs ml-1">{errors.password.message}</p>
              )}
            </div>

            <div className="space-y-2">
              <label className="text-xs font-bold text-slate-400 uppercase ml-1">Confirmar Contraseña</label>
              <div className="relative group">
                <Lock className="absolute left-3 top-3.5 text-slate-500 group-focus-within:text-kiriko-teal transition-colors" size={18} />
                <input
                  type="password"
                  {...register('confirmPassword')}
                  className="w-full bg-black/50 border border-slate-700 rounded-xl py-3 pl-10 pr-4 text-white focus:border-kiriko-teal outline-none transition-all"
                  placeholder="••••••••"
                />
              </div>
              {errors.confirmPassword && (
                <p className="text-red-400 text-xs ml-1">{errors.confirmPassword.message}</p>
              )}
            </div>

            {error && (
              <div className="p-3 bg-red-500/10 border border-red-500/50 rounded-lg text-red-400 text-xs text-center font-bold">
                ⚠️ {error}
              </div>
            )}

            <button
              type="submit"
              disabled={loading}
              className="w-full bg-kiriko-teal hover:bg-teal-400 text-black font-bold py-3 rounded-xl transition-all flex items-center justify-center gap-2 uppercase tracking-wide text-sm disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {loading ? (
                <>
                  <Loader2 className="animate-spin" />
                  Estableciendo...
                </>
              ) : (
                <>
                  <Lock size={18} />
                  Establecer Contraseña
                </>
              )}
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}
