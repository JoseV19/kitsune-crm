'use client';

import { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { Organization } from '@/types/organization';
import { supabase } from '@/lib/services/supabase/client';

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
  initialOrganization 
}: { 
  children: ReactNode;
  initialOrganization?: Organization | null;
}) {
  const [organization, setOrganization] = useState<Organization | null>(initialOrganization || null);
  const [isLoading, setIsLoading] = useState(!initialOrganization);
  const [error, setError] = useState<string | null>(null);

  const refreshOrganization = async () => {
    try {
      setIsLoading(true);
      setError(null);

      const { data: { user } } = await supabase.auth.getUser();

      const hostname = window.location.hostname;
      const subdomain = hostname.split('.')[0];
      const isMainDomain = !subdomain || subdomain === 'localhost' || subdomain === 'www' || subdomain.includes(':');

      if (isMainDomain) {
        setOrganization(null);
        setIsLoading(false);
        return;
      }

      const { data: org, error: orgError } = await supabase
        .from('organizations')
        .select('*')
        .eq('slug', subdomain)
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
    const { data: { user } } = await supabase.auth.getUser();
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
      .map((entry) => entry.organization)
      .filter((org): org is Organization => !!org);
  };

  const switchOrganization = (slug: string) => {
    const protocol = window.location.protocol;
    const host = window.location.host;
    const isLocalhost = host.includes('localhost');
    const baseUrl = isLocalhost
      ? `${protocol}//${slug}.${host}`
      : `${protocol}//${slug}.${host.split('.').slice(1).join('.')}`;
    window.location.href = baseUrl;
  };

  useEffect(() => {
    if (!initialOrganization) {
      refreshOrganization();
    }
  }, [initialOrganization]);

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
  const { organization } = useOrganization();
  // This will need to check user role from user_profiles
  // For now, return false - will be implemented when we add role checking
  return false;
}
