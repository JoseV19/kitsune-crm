'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { createOrganizationSchema, type CreateOrganizationFormData } from '@/lib/validations/organization.schema';
import { createOrganization } from '@/lib/services/organization.service';
import { generateSlug, checkSlugAvailability } from '@/lib/utils/slug-generator';
import { supabase } from '@/lib/services/supabase/client';
import { storage } from '@/lib/services/supabase/storage.service';
import { Loader2, Upload, Image as ImageIcon, Building2, Globe } from 'lucide-react';
import Image from 'next/image';

export default function OnboardingPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [logoFile, setLogoFile] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [logoBackground, setLogoBackground] = useState<'white' | 'black'>('white');
  const [slug, setSlug] = useState('');
  const [slugAvailable, setSlugAvailable] = useState<boolean | null>(null);
  const [checkingSlug, setCheckingSlug] = useState(false);

  const {
    register,
    handleSubmit,
    watch,
    formState: { errors },
  } = useForm<CreateOrganizationFormData>({
    resolver: zodResolver(createOrganizationSchema),
    defaultValues: {
      logo_background_color: 'white',
    },
  });

  const organizationName = watch('name');

  // Auto-generate slug when name changes
  const handleNameChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const name = e.target.value;
    const generatedSlug = generateSlug(name);
    setSlug(generatedSlug);
    if (generatedSlug.length >= 3) {
      checkSlug(generatedSlug);
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
    setSlug(newSlug);
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

  const onSubmit = async (data: CreateOrganizationFormData) => {
    setLoading(true);
    setError(null);

    try {
      // Get current user
      const { data: { user }, error: userError } = await supabase.auth.getUser();
      if (userError || !user) {
        throw new Error('Debes estar autenticado para crear una organización');
      }

      // Validate slug
      if (!slug || slug.length < 3) {
        throw new Error('El slug debe tener al menos 3 caracteres');
      }

      const available = await checkSlugAvailability(slug);
      if (!available) {
        throw new Error('El slug ya está en uso. Por favor, elige otro.');
      }

      // Upload logo if provided
      let logoUrl: string | null = null;
      if (logoFile) {
        // Temporarily set organization context (will be set after creation)
        // For now, upload to a temp location and move after org creation
        const fileExt = logoFile.name.split('.').pop();
        const tempFileName = `temp/${user.id}.${fileExt}`;
        
        const { error: uploadError } = await supabase.storage
          .from('organization-logos')
          .upload(tempFileName, logoFile);

        if (uploadError) throw uploadError;

        const { data: { publicUrl } } = supabase.storage
          .from('organization-logos')
          .getPublicUrl(tempFileName);
        
        logoUrl = publicUrl;
      }

      // Create organization
      const organization = await createOrganization(
        {
          name: data.name,
          slug,
          logo_url: logoUrl,
          logo_background_color: logoBackground,
        },
        user.id
      );

      // Move logo to final location if uploaded
      if (logoFile && logoUrl) {
        const fileExt = logoFile.name.split('.').pop();
        const finalFileName = `${organization.id}/logo.${fileExt}`;
        const tempFileName = `temp/${user.id}.${fileExt}`;
        
        // Copy to final location
        const { data: fileData } = await supabase.storage
          .from('organization-logos')
          .list('temp');
        
        if (fileData) {
          // Download from temp
          const { data: fileContent } = await supabase.storage
            .from('organization-logos')
            .download(tempFileName);
          
          if (fileContent) {
            // Upload to final location
            await supabase.storage
              .from('organization-logos')
              .upload(finalFileName, fileContent, { upsert: true });
            
            // Delete temp file
            await supabase.storage
              .from('organization-logos')
              .remove([tempFileName]);
          }
        }
      }

      // Redirect to organization subdomain
      const protocol = window.location.protocol;
      const host = window.location.host;
      const isLocalhost = host.includes('localhost');
      const baseUrl = isLocalhost 
        ? `${protocol}//${slug}.${host}`
        : `${protocol}//${slug}.${host.split('.').slice(1).join('.')}`;
      
      window.location.href = baseUrl;
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error al crear la organización');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#0f172a] flex items-center justify-center p-4">
      <div className="w-full max-w-2xl">
        <div className="bg-[#1e293b] border border-slate-700 rounded-2xl p-8 shadow-2xl">
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
                  {typeof window !== 'undefined' && window.location.host.includes('localhost')
                    ? `${slug || 'tu-organizacion'}.localhost:3000`
                    : `${slug || 'tu-organizacion'}.kitsunecrm.com`}
                </span>
              </div>
              <input
                type="text"
                value={slug}
                onChange={handleSlugChange}
                className="w-full bg-slate-900 border border-slate-700 text-white p-3 rounded-lg focus:border-[#00D4BD] focus:ring-1 focus:ring-[#00D4BD] outline-none transition-all mt-2 font-mono text-sm"
                placeholder="mi-empresa"
                minLength={3}
                maxLength={50}
              />
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
                    className={`w-32 h-32 rounded-lg flex items-center justify-center border-2 border-dashed transition-all overflow-hidden ${
                      previewUrl
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
                        onClick={() => setLogoBackground('white')}
                        className={`px-4 py-2 rounded-lg border-2 transition-all ${
                          logoBackground === 'white'
                            ? 'border-[#00D4BD] bg-[#00D4BD]/10'
                            : 'border-slate-700 bg-slate-900'
                        }`}
                      >
                        <div className="w-8 h-8 bg-white rounded border border-slate-700"></div>
                        <span className="text-xs text-slate-400 mt-1 block">Blanco</span>
                      </button>
                      <button
                        type="button"
                        onClick={() => setLogoBackground('black')}
                        className={`px-4 py-2 rounded-lg border-2 transition-all ${
                          logoBackground === 'black'
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
