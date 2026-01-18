'use client';

import { useEffect, useState, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { useUser } from '@clerk/nextjs';
import { getActiveUserOrganizations } from '@/lib/services/organization.service';
import OrganizationSelector from '@/components/organization-selector';
import { UserOrganizationMembership } from '@/types/organization';
import { buildLastOrganizationCookie, buildTenantPath, getLastOrganizationCookieFromDocument } from '@/lib/utils/url-helper';
import Image from 'next/image';

export default function SelectOrganizationPage() {
  const router = useRouter();
  const { user, isLoaded } = useUser();
  const [memberships, setMemberships] = useState<UserOrganizationMembership[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isRedirecting, setIsRedirecting] = useState(false);

  const handleSelectOrganization = useCallback((membership: UserOrganizationMembership) => {
    const slug = membership.organization?.slug;
    if (!slug) {
      setError('No se pudo identificar la organización');
      return;
    }

    // Store as last accessed organization
    localStorage.setItem('last_organization_slug', slug);
    document.cookie = buildLastOrganizationCookie(slug, window.location.host);

    router.push(buildTenantPath(slug, '/dashboard'));
  }, [router]);

  const redirectToOrganization = useCallback((slug: string) => {
    setIsRedirecting(true);
    localStorage.setItem('last_organization_slug', slug);
    if (typeof window !== 'undefined') {
      document.cookie = buildLastOrganizationCookie(slug, window.location.host);
    }
    router.push(buildTenantPath(slug, '/dashboard'));
  }, [router]);

  useEffect(() => {
    const loadOrganizations = async () => {
      if (!isLoaded) return;

      try {
        setLoading(true);
        setError(null);

        if (!user) {
          setIsRedirecting(true);
          router.push('/');
          return;
        }

        // First, check if there's a last visited organization
        const lastOrgSlug = typeof window !== 'undefined' 
          ? (getLastOrganizationCookieFromDocument() || localStorage.getItem('last_organization_slug'))
          : null;

        const activeMemberships = await getActiveUserOrganizations(user.id);

        if (activeMemberships.length === 0) {
          setIsRedirecting(true);
          router.push('/onboarding');
          return;
        }

        // If there's a last visited organization, check if it's still valid
        if (lastOrgSlug) {
          const lastOrgMembership = activeMemberships.find(
            (m) => m.organization?.slug === lastOrgSlug
          );
          if (lastOrgMembership?.organization?.slug) {
            redirectToOrganization(lastOrgMembership.organization.slug);
            return;
          }
        }

        // If only one organization, redirect to it immediately
        if (activeMemberships.length === 1 && activeMemberships[0].organization?.slug) {
          redirectToOrganization(activeMemberships[0].organization.slug);
          return;
        }

        // Only set memberships if we have 2+ organizations to show
        if (activeMemberships.length >= 2) {
          setMemberships(activeMemberships);
          setLoading(false);
        }
      } catch (err) {
        const errorMessage = err instanceof Error ? err.message : 'Error al cargar organizaciones';
        setError(errorMessage);
        setLoading(false);
      }
    };

    loadOrganizations();
  }, [router, user, isLoaded, redirectToOrganization]);

  // Don't render content if we're redirecting or still loading and have no memberships
  if (isRedirecting || (loading && memberships.length === 0)) {
    return (
      <div className="min-h-screen bg-black flex flex-col items-center justify-center relative overflow-hidden">
        <div className="absolute inset-0 z-0">
          <div className="absolute inset-0 bg-[linear-gradient(rgba(45,212,191,0.05)_1px,transparent_1px),linear-gradient(90deg,rgba(45,212,191,0.05)_1px,transparent_1px)] bg-[size:40px_40px]"></div>
          <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] bg-kiriko-teal/5 blur-[120px] rounded-full"></div>
        </div>
        <div className="relative z-10 text-kiriko-teal font-mono tracking-widest animate-pulse uppercase text-sm">
          Redirigiendo...
        </div>
      </div>
    );
  }

  // Only render the selector if we have 2+ organizations
  if (memberships.length < 2) {
    return null;
  }

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
