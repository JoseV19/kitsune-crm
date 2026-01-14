'use client';

import { useState, useEffect } from 'react';
import { supabase } from '@/lib/services/supabase/client';

export function useIsOrgOwner(): boolean {
  const [isOwner, setIsOwner] = useState(false);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    async function checkRole() {
      try {
        const { data: { user } } = await supabase.auth.getUser();
        
        if (!user) {
          setIsOwner(false);
          setIsLoading(false);
          return;
        }

        const { data: profile } = await supabase
          .from('user_profiles')
          .select('role')
          .eq('id', user.id)
          .single();

        setIsOwner(profile?.role === 'owner' || false);
      } catch (error) {
        console.error('Error checking user role:', error);
        setIsOwner(false);
      } finally {
        setIsLoading(false);
      }
    }

    checkRole();
  }, []);

  return isOwner;
}
