'use client';

import { useEffect, useState, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { useUser } from '@clerk/nextjs';
import { getActiveUserOrganizations } from '@/lib/services/organization.service';
import OrganizationSelector from '@/components/organization-selector';
import { UserOrganizationMembership } from '@/types/organization';
import { buildLastOrganizationCookie, buildTenantPath } from '@/lib/utils/url-helper';
import Image from 'next/image';

export default function SelectOrganizationPage() {
  const router = useRouter();
  const { user, isLoaded } = useUser();
  const [memberships, setMemberships] = useState<UserOrganizationMembership[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const handleSelectOrganization = useCallback((membership: UserOrganizationMembership) => {
    const slug = membership.organization?.slug;
    if (!slug) {
      setError('No se pudo identificar la organización');
      return;
    }

    // Store as last accessed organization
    localStorage.setItem('last_organization_slug', slug);
    document.cookie = buildLastOrganizationCookie(slug, window.location.host);

    const protocol = window.location.protocol;
    const host = window.location.host;
    void protocol;
    void host;
    router.push(buildTenantPath(slug, '/dashboard'));
  }, [router]);

  useEffect(() => {
    const loadOrganizations = async () => {
      if (!isLoaded) return;

      try {
        setLoading(true);
        setError(null);

        if (!user) {
          router.push('/');
          return;
        }

        const activeMemberships = await getActiveUserOrganizations(user.id);

        if (activeMemberships.length === 0) {
          router.push('/onboarding');
          return;
        }

        if (activeMemberships.length === 1 && activeMemberships[0].organization?.slug) {
          const slug = activeMemberships[0].organization.slug;
          localStorage.setItem('last_organization_slug', slug);
          document.cookie = buildLastOrganizationCookie(slug, window.location.host);
          router.push(buildTenantPath(slug, '/dashboard'));
          return;
        }

        setMemberships(activeMemberships);
      } catch (err) {
        const errorMessage = err instanceof Error ? err.message : 'Error al cargar organizaciones';
        setError(errorMessage);
      } finally {
        setLoading(false);
      }
    };

    loadOrganizations();
  }, [router, user, isLoaded, handleSelectOrganization]);

  return (
    <div className="min-h-screen bg-black flex flex-col items-center justify-center relative overflow-hidden">
      <div className="absolute inset-0 z-0">
        <div className="absolute inset-0 bg-[linear-gradient(rgba(45,212,191,0.05)_1px,transparent_1px),linear-gradient(90deg,rgba(45,212,191,0.05)_1px,transparent_1px)] bg-[size:40px_40px]"></div>
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] bg-kiriko-teal/5 blur-[120px] rounded-full"></div>
      </div>

      <div className="relative z-10 w-full max-w-xl p-8">
        <div className="text-center mb-8">
          <Image
            src="/logo-kiriko.png"
            alt="Kitsune"
            width={160}
            height={160}
            className="w-40 mx-auto mb-4 drop-shadow-[0_0:15px_rgba(45,212,191,0.5)]"
          />
          <h2 className="text-xl font-bold text-white tracking-widest uppercase">
            Selecciona tu organización
          </h2>
          <p className="text-slate-400 text-sm mt-2">
            Elige el espacio de trabajo al que deseas acceder
          </p>
        </div>

        <div className="bg-slate-900/50 backdrop-blur-md border border-slate-800 p-6 rounded-2xl shadow-2xl">
          {error && (
            <div className="p-3 bg-red-500/10 border border-red-500/50 rounded-lg text-red-400 text-xs text-center font-bold mb-4">
              ⚠️ {error}
            </div>
          )}

          <OrganizationSelector
            memberships={memberships}
            onSelect={handleSelectOrganization}
            isLoading={loading}
          />

          <div className="mt-6 text-center">
            <button
              onClick={() => router.push('/onboarding')}
              className="text-slate-500 hover:text-white text-xs underline transition-colors"
            >
              Crear una nueva organización
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
