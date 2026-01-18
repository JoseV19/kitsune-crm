'use client';

import { createContext, useContext, useEffect, useState, ReactNode } from 'react';
import { useUser } from '@clerk/nextjs';
import { useRouter } from 'next/navigation';
import { Organization } from '@/types/organization';
import { useSupabaseClient } from '@/lib/services/supabase/client';
import { buildSubdomainUrl } from '@/lib/utils/url-helper';

interface OrganizationContextType {
  organization: Organization | null;
  organizationId: string | null;
  isLoading: boolean;
  error: string | null;
  refreshOrganization: () => Promise<void>;
  getUserOrganizations: () => Promise<Organization[]>;
  switchOrganization: (slug: string) => void;
}

const OrganizationContext = createContext<OrganizationContextType | undefined>(undefined);

export function OrganizationProvider({
  children,
  initialOrganization,
  slug,
}: {
  children: ReactNode;
  initialOrganization?: Organization | null;
  slug?: string | null;
}) {
  const router = useRouter();
  const { user, isLoaded } = useUser();
  const supabase = useSupabaseClient();
  const [organization, setOrganization] = useState<Organization | null>(initialOrganization || null);
  const [isLoading, setIsLoading] = useState(!initialOrganization);
  const [error, setError] = useState<string | null>(null);

  const getCurrentSlug = () => slug ?? null;

  const refreshOrganization = async () => {
    if (!isLoaded) return;

    try {
      setIsLoading(true);
      setError(null);

      const currentSlug = getCurrentSlug();
      if (!currentSlug) {
        setOrganization(null);
        setIsLoading(false);
        return;
      }

      const { data: org, error: orgError } = await supabase
        .from('organizations')
        .select('*')
        .eq('slug', currentSlug)
        .single();

      if (orgError || !org) {
        setError(orgError?.message || 'Organización no encontrada');
        setOrganization(null);
        setIsLoading(false);
        return;
      }

      if (!user) {
        setOrganization(org);
        setIsLoading(false);
        return;
      }

      const { data: membership, error: membershipError } = await supabase
        .from('user_organization_memberships')
        .select('is_active')
        .eq('user_id', user.id)
        .eq('organization_id', org.id)
        .single();

      if (membershipError || !membership?.is_active) {
        setOrganization(null);
        setIsLoading(false);
        return;
      }

      setOrganization(org);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error loading organization');
      setOrganization(null);
    } finally {
      setIsLoading(false);
    }
  };

  const getUserOrganizations = async (): Promise<Organization[]> => {
    if (!user) {
      return [];
    }

    const { data, error } = await supabase
      .from('user_organization_memberships')
      .select('organization:organizations(*)')
      .eq('user_id', user.id)
      .eq('is_active', true);

    if (error) {
      throw new Error(error.message);
    }

    return (data || [])
      .map((entry) => {
        const org = Array.isArray(entry.organization) ? entry.organization[0] : entry.organization;
        return org;
      })
      .filter((org): org is Organization => !!org);
  };

  const switchOrganization = (targetSlug: string) => {
    if (typeof window === 'undefined') return;
    const protocol = window.location.protocol;
    const host = window.location.host;
    const baseUrl = buildSubdomainUrl(targetSlug, host, protocol);
    router.push(baseUrl);
  };

  useEffect(() => {
    if (!initialOrganization && isLoaded) {
      refreshOrganization();
    }
    // Only depend on user ID, not the entire user object to avoid reloads on profile updates
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [initialOrganization, isLoaded, user?.id, slug]);

  return (
    <OrganizationContext.Provider
      value={{
        organization,
        organizationId: organization?.id || null,
        isLoading,
        error,
        refreshOrganization,
        getUserOrganizations,
        switchOrganization,
      }}
    >
      {children}
    </OrganizationContext.Provider>
  );
}

export function useOrganization() {
  const context = useContext(OrganizationContext);
  if (context === undefined) {
    throw new Error('useOrganization must be used within an OrganizationProvider');
  }
  return context;
}

export function useOrganizationId() {
  const { organizationId } = useOrganization();
  return organizationId;
}

export function useIsOrgAdmin() {
  // const { organization } = useOrganization(); // Unused for now
  // This will need to check user role from user_profiles
  // For now, return false - will be implemented when we add role checking
  return false;
}
