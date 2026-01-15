'use client';

import { useEffect, useState } from 'react';
import { OrganizationProvider } from '@/lib/contexts/organization-context';
import { getOrganizationBySlug } from '@/lib/services/organization.service';
import { Organization } from '@/types/organization';
import { db } from '@/lib/services/supabase/database.service';
import { storage } from '@/lib/services/supabase/storage.service';
import { supabase } from '@/lib/services/supabase/client';
import { migrateSessionToCookies } from '@/lib/services/supabase/session-sync';
import { checkAndRestoreSessionFromURL } from '@/lib/services/supabase/session-transfer';
import { getBaseHost } from '@/lib/utils/url-helper';

export function OrganizationProviderWrapper({ children }: { children: React.ReactNode }) {
  const [organization, setOrganization] = useState<Organization | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let isMounted = true;
    let timeoutId: NodeJS.Timeout | null = null;
    
    // Set a maximum timeout to prevent infinite loading
    timeoutId = setTimeout(() => {
      if (isMounted && loading) {
        console.warn('[OrganizationProvider] Loading timeout - redirecting to main domain');
        const protocol = window.location.protocol;
        const host = window.location.host;
        const baseHost = getBaseHost(host);
        window.location.href = `${protocol}//${baseHost}`;
      }
    }, 10000); // 10 second timeout
    
    async function initialize() {
      try {
        // Migrate session from localStorage to cookies on mount
        migrateSessionToCookies();
        
        // Check for session transfer token in URL and restore session
        // Wait for this to complete before loading organization
        const sessionRestored = await checkAndRestoreSessionFromURL();
        
        if (!isMounted) return;
        
        if (sessionRestored) {
          console.log('[OrganizationProvider] Session restored from transfer token');
          // Wait longer if we just restored to ensure it's fully established
          await new Promise(resolve => setTimeout(resolve, 300));
        } else {
          // Check if we already have a valid session (might have been restored via cookies/storage)
          const { data: { user } } = await supabase.auth.getUser();
          if (user) {
            console.log('[OrganizationProvider] User session already exists');
          } else {
            console.log('[OrganizationProvider] No user session found');
          }
        }

        if (!isMounted) return;

        // Now load organization
        await loadOrganization();
      } catch (error) {
        console.error('[OrganizationProvider] Error in initialize:', error);
        if (isMounted) {
          const protocol = window.location.protocol;
          const host = window.location.host;
          const baseHost = getBaseHost(host);
          window.location.href = `${protocol}//${baseHost}`;
        }
      }
    }

    async function loadOrganization() {
      try {
        if (!isMounted) return;
        
        // Extract subdomain from current URL
        const hostname = window.location.hostname;
        const subdomain = hostname.split('.')[0];

        // If no subdomain or it's localhost/main domain, don't set organization
        if (!subdomain || subdomain === 'localhost' || subdomain.includes(':')) {
          if (isMounted) {
            setLoading(false);
          }
          return;
        }

        // Get organization by slug
        const org = await getOrganizationBySlug(subdomain);
        
        if (!isMounted) return;
        
        if (org) {
          // Check for user session (with retry if we just restored from transfer)
          let user = null;
          let userError = null;
          let retries = 0;
          
          while (retries < 5 && !user && isMounted) {
            const result = await supabase.auth.getUser();
            user = result.data.user;
            userError = result.error;
            
            if (!user && retries < 4) {
              // Wait a bit and retry (session might still be restoring)
              await new Promise(resolve => setTimeout(resolve, 150));
              retries++;
            } else {
              break;
            }
          }
          
          if (!isMounted) return;
          
          // If no user after retries, redirect to login
          if (!user || userError) {
            const hash = window.location.hash;
            const hasSessionToken = hash.includes('session_token');
            
            if (hasSessionToken) {
              console.error('[OrganizationProvider] Session token present but user not found after retries');
              console.error('[OrganizationProvider] Session restoration failed, redirecting to login');
            } else {
              console.warn('[OrganizationProvider] No user session found, redirecting to login');
            }
            
            // Redirect to main domain login
            const protocol = window.location.protocol;
            const host = window.location.host;
            const baseHost = getBaseHost(host);
            window.location.href = `${protocol}//${baseHost}`;
            return;
          }
          
          const { data: membership } = await supabase
            .from('user_organization_memberships')
            .select('is_active')
            .eq('user_id', user.id)
            .eq('organization_id', org.id)
            .single();

          if (!isMounted) return;

          if (!membership?.is_active) {
            const protocol = window.location.protocol;
            const host = window.location.host;
            const baseHost = getBaseHost(host);
            window.location.href = `${protocol}//${baseHost}/select-organization`;
            return;
          }

          if (isMounted) {
            setOrganization(org);
            // Set organization context in services
            db.setOrganizationId(org.id);
            storage.setOrganizationId(org.id);
          }
        } else {
          // No organization found for this subdomain, redirect to main domain
          const protocol = window.location.protocol;
          const host = window.location.host;
          const baseHost = getBaseHost(host);
          window.location.href = `${protocol}//${baseHost}`;
        }
      } catch (error) {
        console.error('Error loading organization:', error);
        if (isMounted) {
          // On error, redirect to main domain
          const protocol = window.location.protocol;
          const host = window.location.host;
          const baseHost = getBaseHost(host);
          window.location.href = `${protocol}//${baseHost}`;
        }
      } finally {
        if (isMounted) {
          setLoading(false);
        }
      }
    }

    initialize();
    
    return () => {
      isMounted = false;
      if (timeoutId) {
        clearTimeout(timeoutId);
      }
    };
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
