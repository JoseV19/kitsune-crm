'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { createClient } from '@/lib/services/supabase/client';
import { signupSchema, type SignupFormData } from '@/lib/validations/user.schema';
import { Mail, Lock, User, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form';
import Link from 'next/link';

export default function SignUpPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const form = useForm<SignupFormData>({
    resolver: zodResolver(signupSchema),
    defaultValues: {
      email: '',
      password: '',
      confirmPassword: '',
      name: '',
    },
  });

  const onSubmit = async (data: SignupFormData) => {
    setLoading(true);
    setError(null);

    try {
      const supabase = createClient();

      const { data: signUpData, error: signUpError } = await supabase.auth.signUp({
        email: data.email,
        password: data.password,
        options: {
          data: {
            full_name: data.name,
          },
          emailRedirectTo: `${window.location.origin}/auth/confirm`,
        },
      });

      if (signUpError) {
        throw new Error(signUpError.message);
      }

      if (!signUpData.user) {
        throw new Error('Error al crear la cuenta');
      }

      // Redirect to confirmation page or show success message
      router.push('/auth/confirm?email=' + encodeURIComponent(data.email));
    } catch (err: any) {
      setError(err.message || 'Error al crear la cuenta');
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
          <img
            src="/logo-kiriko.png"
            alt="Kitsune"
            className="w-48 mx-auto mb-6 drop-shadow-[0_0:15px_rgba(45,212,191,0.5)]"
          />
          <h2 className="text-xl font-bold text-white tracking-widest uppercase">
            Crear Cuenta
          </h2>
          <p className="text-slate-400 text-sm mt-2">
            Regístrate para comenzar a usar Kitsune CRM
          </p>
        </div>

        <div className="bg-slate-900/50 backdrop-blur-md border border-slate-800 p-8 rounded-2xl shadow-2xl">
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
              <FormField
                control={form.control}
                name="name"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel className="text-xs font-bold text-slate-400 uppercase ml-1">
                      Nombre Completo
                    </FormLabel>
                    <FormControl>
                      <div className="relative group">
                        <User className="absolute left-3 top-3.5 text-slate-500 group-focus-within:text-kiriko-teal transition-colors" size={18} />
                        <Input
                          {...field}
                          type="text"
                          className="w-full bg-black/50 border border-slate-700 rounded-xl py-3 pl-10 pr-4 text-white focus:border-kiriko-teal outline-none transition-all placeholder:text-slate-600"
                          placeholder="Juan Pérez"
                        />
                      </div>
                    </FormControl>
                    <FormMessage className="text-red-400 text-xs ml-1" />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="email"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel className="text-xs font-bold text-slate-400 uppercase ml-1">
                      Email
                    </FormLabel>
                    <FormControl>
                      <div className="relative group">
                        <Mail className="absolute left-3 top-3.5 text-slate-500 group-focus-within:text-kiriko-teal transition-colors" size={18} />
                        <Input
                          {...field}
                          type="email"
                          className="w-full bg-black/50 border border-slate-700 rounded-xl py-3 pl-10 pr-4 text-white focus:border-kiriko-teal outline-none transition-all placeholder:text-slate-600"
                          placeholder="usuario@ejemplo.com"
                        />
                      </div>
                    </FormControl>
                    <FormMessage className="text-red-400 text-xs ml-1" />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="password"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel className="text-xs font-bold text-slate-400 uppercase ml-1">
                      Contraseña
                    </FormLabel>
                    <FormControl>
                      <div className="relative group">
                        <Lock className="absolute left-3 top-3.5 text-slate-500 group-focus-within:text-kiriko-teal transition-colors" size={18} />
                        <Input
                          {...field}
                          type="password"
                          className="w-full bg-black/50 border border-slate-700 rounded-xl py-3 pl-10 pr-4 text-white focus:border-kiriko-teal outline-none transition-all placeholder:text-slate-600"
                          placeholder="••••••••"
                        />
                      </div>
                    </FormControl>
                    <FormMessage className="text-red-400 text-xs ml-1" />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="confirmPassword"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel className="text-xs font-bold text-slate-400 uppercase ml-1">
                      Confirmar Contraseña
                    </FormLabel>
                    <FormControl>
                      <div className="relative group">
                        <Lock className="absolute left-3 top-3.5 text-slate-500 group-focus-within:text-kiriko-teal transition-colors" size={18} />
                        <Input
                          {...field}
                          type="password"
                          className="w-full bg-black/50 border border-slate-700 rounded-xl py-3 pl-10 pr-4 text-white focus:border-kiriko-teal outline-none transition-all placeholder:text-slate-600"
                          placeholder="••••••••"
                        />
                      </div>
                    </FormControl>
                    <FormMessage className="text-red-400 text-xs ml-1" />
                  </FormItem>
                )}
              />

              {error && (
                <div className="p-3 bg-red-500/10 border border-red-500/50 rounded-lg text-red-400 text-xs text-center font-bold">
                  ⚠️ {error}
                </div>
              )}

              <Button
                type="submit"
                disabled={loading}
                className="w-full bg-kiriko-teal hover:bg-teal-400 text-black font-bold py-3 rounded-xl transition-all flex items-center justify-center gap-2 uppercase tracking-wide text-sm disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {loading ? (
                  <>
                    <Loader2 className="animate-spin" size={18} />
                    Creando cuenta...
                  </>
                ) : (
                  <>
                    <User size={18} />
                    Crear Cuenta
                  </>
                )}
              </Button>
            </form>
          </Form>

          <div className="mt-6 text-center">
            <p className="text-slate-500 text-sm">
              ¿Ya tienes una cuenta?{' '}
              <Link
                href="/sign-in"
                className="text-kiriko-teal hover:text-teal-400 underline transition-colors"
              >
                Inicia sesión
              </Link>
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
