'use client';

import { useState, useEffect } from 'react';
import { useUser } from '@clerk/nextjs';
import { useSupabaseClient } from '@/lib/services/supabase/client';
import { useOrganizationId } from '@/lib/contexts/organization-context';

export function useIsOrgOwner(): boolean {
  const [isOwner, setIsOwner] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const { user, isLoaded } = useUser();
  const supabase = useSupabaseClient();
  const organizationId = useOrganizationId();

  useEffect(() => {
    async function checkRole() {
      if (!isLoaded) return;

      try {
        if (!user) {
          setIsOwner(false);
          setIsLoading(false);
          return;
        }

        if (!organizationId) {
          setIsOwner(false);
          setIsLoading(false);
          return;
        }

        const { data: membership } = await supabase
          .from('user_organization_memberships')
          .select('role, is_active')
          .eq('user_id', user.id)
          .eq('organization_id', organizationId)
          .single();

        setIsOwner(!!membership?.is_active && membership.role === 'owner');
      } catch (error) {
        console.error('Error checking user role:', error);
        setIsOwner(false);
      } finally {
        setIsLoading(false);
      }
    }

    checkRole();
  }, [organizationId, user, isLoaded]); // Added user and isLoaded

  return isOwner;
}
