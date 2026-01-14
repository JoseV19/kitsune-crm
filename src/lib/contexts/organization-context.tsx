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
      if (!user) {
        setOrganization(null);
        setIsLoading(false);
        return;
      }

      // Get user's organization from user_profiles
      const { data: profile, error: profileError } = await supabase
        .from('user_profiles')
        .select('organization_id')
        .eq('id', user.id)
        .single();

      if (profileError || !profile?.organization_id) {
        setOrganization(null);
        setIsLoading(false);
        return;
      }

      // Get organization details
      const { data: org, error: orgError } = await supabase
        .from('organizations')
        .select('*')
        .eq('id', profile.organization_id)
        .single();

      if (orgError) {
        setError(orgError.message);
        setOrganization(null);
      } else {
        setOrganization(org);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error loading organization');
      setOrganization(null);
    } finally {
      setIsLoading(false);
    }
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
