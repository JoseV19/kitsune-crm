'use client';

import { useEffect, useState } from 'react';
import { OrganizationProvider } from '@/lib/contexts/organization-context';
import { getOrganizationBySlug } from '@/lib/services/organization.service';
import { Organization } from '@/types/organization';
import { db } from '@/lib/services/supabase/database.service';
import { storage } from '@/lib/services/supabase/storage.service';

export function OrganizationProviderWrapper({ children }: { children: React.ReactNode }) {
  const [organization, setOrganization] = useState<Organization | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function loadOrganization() {
      try {
        // Extract subdomain from current URL
        const hostname = window.location.hostname;
        const subdomain = hostname.split('.')[0];

        // If no subdomain or it's localhost/main domain, don't set organization
        if (!subdomain || subdomain === 'localhost' || subdomain.includes(':')) {
          setLoading(false);
          return;
        }

        // Get organization by slug
        const org = await getOrganizationBySlug(subdomain);
        
        if (org) {
          setOrganization(org);
          // Set organization context in services
          db.setOrganizationId(org.id);
          storage.setOrganizationId(org.id);
        }
      } catch (error) {
        console.error('Error loading organization:', error);
      } finally {
        setLoading(false);
      }
    }

    loadOrganization();
  }, []);

  if (loading) {
    return (
      <div className="min-h-screen bg-[#0f172a] flex items-center justify-center">
        <div className="text-[#00D4BD] font-mono tracking-widest animate-pulse uppercase">
          Cargando organización...
        </div>
      </div>
    );
  }

  return (
    <OrganizationProvider initialOrganization={organization}>
      {children}
    </OrganizationProvider>
  );
}
