'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { useUser, useSession, useClerk } from '@clerk/nextjs';
import { createOrganizationSchema, type CreateOrganizationFormData } from '@/lib/validations/organization.schema';
import { checkSlugAvailability } from '@/lib/services/organization.service';
import { generateSlug } from '@/lib/utils/slug-generator';
import { buildSubdomainUrl } from '@/lib/utils/url-helper';
import { Loader2, Upload, Building2, Globe, LogOut } from 'lucide-react';
import Image from 'next/image';
import { useSupabaseClient } from '@/lib/services/supabase/client';

export default function OnboardingPage() {
  const router = useRouter();
  const { user, isLoaded } = useUser();
  const { session } = useSession();
  const { signOut } = useClerk();
  const supabase = useSupabaseClient();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [logoFile, setLogoFile] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [slugAvailable, setSlugAvailable] = useState<boolean | null>(null);
  const [checkingSlug, setCheckingSlug] = useState(false);
  const [isLocalhost, setIsLocalhost] = useState(false);

  const {
    register,
    handleSubmit,
    watch,
    setValue,
    formState: { errors },
  } = useForm<CreateOrganizationFormData>({
    resolver: zodResolver(createOrganizationSchema),
    defaultValues: {
      name: '',
      slug: '',
      logo_url: null,
      logo_background_color: 'white',
    },
  });

  // Redirect if not authenticated
  useEffect(() => {
    if (isLoaded && !user) {
      router.push('/');
    }
  }, [isLoaded, user, router]);

  // Set localhost detection after mount to avoid hydration mismatch
  useEffect(() => {
    setIsLocalhost(window.location.host.includes('localhost'));
  }, []);

  const organizationName = watch('name');
  const slug = watch('slug');
  const logoBackground = watch('logo_background_color');

  // Auto-generate slug when name changes
  const handleNameChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const name = e.target.value;
    const generatedSlug = generateSlug(name);
    setValue('slug', generatedSlug, { shouldValidate: false });
    if (generatedSlug.length >= 3) {
      checkSlug(generatedSlug);
    } else {
      setSlugAvailable(null);
    }
  };

  const checkSlug = async (slugToCheck: string) => {
    if (slugToCheck.length < 3) {
      setSlugAvailable(null);
      return;
    }
    setCheckingSlug(true);
    const available = await checkSlugAvailability(slugToCheck);
    setSlugAvailable(available);
    setCheckingSlug(false);
  };

  const handleSlugChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newSlug = e.target.value.toLowerCase().replace(/[^a-z0-9-]/g, '');
    setValue('slug', newSlug, { shouldValidate: true });
    if (newSlug.length >= 3) {
      checkSlug(newSlug);
    } else {
      setSlugAvailable(null);
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const file = e.target.files[0];
      setLogoFile(file);
      setPreviewUrl(URL.createObjectURL(file));
    }
  };

  const handleSignOut = async () => {
    await signOut();
    router.push('/');
  };

  const onSubmit = async (data: CreateOrganizationFormData) => {
    setLoading(true);
    setError(null);

    try {
      if (!user) {
        throw new Error('Debes estar autenticado para crear una organización');
      }

      // Validate slug
      if (!data.slug || data.slug.length < 3) {
        throw new Error('El slug debe tener al menos 3 caracteres');
      }

      const available = await checkSlugAvailability(data.slug);
      if (!available) {
        throw new Error('Ese nombre de empresa ya está en uso. Por favor, elige otro.');
      }

      // Get auth token for API request
      const token = await session?.getToken({ template: 'supabase' }); // Wait, plan said no template? No, I decided no template.
      // But server.ts uses getToken() without template? No, I used no template in server.ts.
      // Let's use `getToken()` without template to match server.ts and supabase client.
      const accessToken = await session?.getToken();

      if (!accessToken) {
        throw new Error('No se pudo obtener la sesión');
      }

      // Create FormData to send organization data and logo file
      const formData = new FormData();
      formData.append('name', data.name);
      formData.append('slug', data.slug);
      formData.append('logo_background_color', data.logo_background_color);
      if (logoFile) {
        formData.append('logo', logoFile);
      }

      // Create organization via API route (uses service role to bypass RLS)
      // Logo upload is also handled in the API route
      const createResponse = await fetch('/api/organizations', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${accessToken}`,
        },
        body: formData,
      });

      if (!createResponse.ok) {
        const errorData = await createResponse.json();
        throw new Error(errorData.error || 'Error al crear la organización');
      }

      const { organization } = await createResponse.json();

      // Store as last accessed organization
      localStorage.setItem('last_organization_slug', data.slug);

      // Redirect to organization subdomain
      const protocol = window.location.protocol;
      const host = window.location.host;
      const baseUrl = buildSubdomainUrl(data.slug, host, protocol);

      router.push(baseUrl);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error al crear la organización');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#0f172a] flex items-center justify-center p-4">
      <div className="w-full max-w-2xl">
        <div className="bg-[#1e293b] border border-slate-700 rounded-2xl p-8 shadow-2xl relative">
          <button
            onClick={handleSignOut}
            className="absolute top-6 right-6 p-2 text-slate-400 hover:text-red-400 hover:bg-red-500/10 rounded-lg transition-all"
            title="Cerrar sesión"
          >
            <LogOut size={20} />
          </button>
          <div className="text-center mb-8">
            <Building2 className="w-16 h-16 text-[#00D4BD] mx-auto mb-4" />
            <h1 className="text-3xl font-bold text-white mb-2">
              Crear tu Organización
            </h1>
            <p className="text-slate-400">
              Configura tu organización para comenzar a usar Kitsune CRM
            </p>
          </div>

          <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
            {/* Organization Name */}
            <div>
              <label className="block text-sm font-bold text-[#00D4BD] uppercase tracking-wider mb-2">
                Nombre de la Organización <span className="text-red-500">*</span>
              </label>
              <input
                {...register('name')}
                onChange={(e) => {
                  register('name').onChange(e);
                  handleNameChange(e);
                }}
                className="w-full bg-slate-900 border border-slate-700 text-white p-3 rounded-lg focus:border-[#00D4BD] focus:ring-1 focus:ring-[#00D4BD] outline-none transition-all"
                placeholder="Mi Empresa S.A."
              />
              {errors.name && (
                <p className="text-red-400 text-sm mt-1">{errors.name.message}</p>
              )}
            </div>

            {/* Slug */}
            <div>
              <label className="block text-sm font-bold text-slate-400 uppercase tracking-wider mb-2">
                URL de tu Organización <span className="text-red-500">*</span>
              </label>
              <div className="flex items-center gap-2">
                <span className="text-slate-500 text-sm">
                  {isLocalhost
                    ? `${slug || 'tu-organizacion'}.localhost:3000`
                    : `${slug || 'tu-organizacion'}.kitsunecrm.com`}
                </span>
              </div>
              <input
                {...register('slug')}
                onChange={(e) => {
                  register('slug').onChange(e);
                  handleSlugChange(e);
                }}
                className="w-full bg-slate-900 border border-slate-700 text-white p-3 rounded-lg focus:border-[#00D4BD] focus:ring-1 focus:ring-[#00D4BD] outline-none transition-all mt-2 font-mono text-sm"
                placeholder="mi-empresa"
                minLength={3}
                maxLength={50}
              />
              {errors.slug && (
                <p className="text-red-400 text-sm mt-1">{errors.slug.message}</p>
              )}
              <div className="flex items-center gap-2 mt-2">
                {checkingSlug && (
                  <Loader2 className="w-4 h-4 animate-spin text-slate-400" />
                )}
                {slugAvailable === true && !checkingSlug && slug.length >= 3 && (
                  <span className="text-green-400 text-sm">✓ Disponible</span>
                )}
                {slugAvailable === false && !checkingSlug && (
                  <span className="text-red-400 text-sm">✗ Ya está en uso</span>
                )}
              </div>
              {slug.length > 0 && slug.length < 3 && (
                <p className="text-yellow-400 text-sm mt-1">
                  El slug debe tener al menos 3 caracteres
                </p>
              )}
            </div>

            {/* Logo Upload */}
            <div>
              <label className="block text-sm font-bold text-slate-400 uppercase tracking-wider mb-2">
                Logo de la Organización (Opcional)
              </label>
              <div className="flex items-center gap-6">
                <div className="relative">
                  <input
                    type="file"
                    accept="image/*"
                    onChange={handleFileChange}
                    className="absolute inset-0 w-full h-full opacity-0 cursor-pointer z-20"
                  />
                  <div
                    className={`w-32 h-32 rounded-lg flex items-center justify-center border-2 border-dashed transition-all overflow-hidden ${previewUrl
                      ? 'border-[#00D4BD]'
                      : 'border-slate-700 hover:border-[#00D4BD]/50 bg-slate-900'
                      }`}
                    style={{
                      backgroundColor: previewUrl ? logoBackground : undefined,
                    }}
                  >
                    {previewUrl ? (
                      <Image
                        src={previewUrl}
                        alt="Logo Preview"
                        className="w-full h-full object-contain"
                        width={128}
                        height={128}
                      />
                    ) : (
                      <div className="text-center">
                        <Upload
                          size={24}
                          className="mx-auto text-slate-500 mb-2"
                        />
                        <span className="text-xs text-slate-500 uppercase font-bold">
                          Subir Logo
                        </span>
                      </div>
                    )}
                  </div>
                </div>

                {previewUrl && (
                  <div className="flex-1">
                    <label className="block text-sm font-bold text-slate-400 uppercase tracking-wider mb-2">
                      Color de Fondo (para logos transparentes)
                    </label>
                    <div className="flex gap-4">
                      <button
                        type="button"
                        onClick={() => setValue('logo_background_color', 'white')}
                        className={`px-4 py-2 rounded-lg border-2 transition-all ${logoBackground === 'white'
                          ? 'border-[#00D4BD] bg-[#00D4BD]/10'
                          : 'border-slate-700 bg-slate-900'
                          }`}
                      >
                        <div className="w-8 h-8 bg-white rounded border border-slate-700"></div>
                        <span className="text-xs text-slate-400 mt-1 block">Blanco</span>
                      </button>
                      <button
                        type="button"
                        onClick={() => setValue('logo_background_color', 'black')}
                        className={`px-4 py-2 rounded-lg border-2 transition-all ${logoBackground === 'black'
                          ? 'border-[#00D4BD] bg-[#00D4BD]/10'
                          : 'border-slate-700 bg-slate-900'
                          }`}
                      >
                        <div className="w-8 h-8 bg-black rounded border border-slate-700"></div>
                        <span className="text-xs text-slate-400 mt-1 block">Negro</span>
                      </button>
                    </div>
                  </div>
                )}
              </div>
            </div>

            {error && (
              <div className="p-4 bg-red-500/10 border border-red-500/50 rounded-lg text-red-400 text-sm">
                {error}
              </div>
            )}

            <button
              type="submit"
              disabled={loading || !slug || slug.length < 3 || slugAvailable === false}
              className="w-full bg-[#00D4BD] hover:bg-teal-400 text-black font-bold py-3 rounded-lg shadow-[0_0_20px_rgba(0,212,189,0.3)] transition-all flex items-center justify-center gap-2 uppercase tracking-widest text-sm disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {loading ? (
                <>
                  <Loader2 className="w-5 h-5 animate-spin" />
                  Creando...
                </>
              ) : (
                <>
                  <Globe className="w-5 h-5" />
                  Crear Organización
                </>
              )}
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}
