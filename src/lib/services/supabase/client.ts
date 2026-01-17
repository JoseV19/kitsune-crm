import { createClient as createSupabaseClient } from '@supabase/supabase-js'
import { useSession } from '@clerk/nextjs'
import { useMemo } from 'react'

export function useSupabaseClient() {
  const { session } = useSession()

  return useMemo(() => {
    return createSupabaseClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY!,
      {
        global: {
          fetch: async (url, options = {}) => {
            const token = await session?.getToken()
            const headers = new Headers(options.headers)
            if (token) {
              headers.set('Authorization', `Bearer ${token}`)
            }
            return fetch(url, {
              ...options,
              headers,
            })
          },
        },
        auth: {
          persistSession: false,
          autoRefreshToken: false,
        },
      }
    )
  }, [session])
}

export function createClient(accessToken?: string | null) {
  return createSupabaseClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY!,
    {
      global: {
        headers: accessToken
          ? {
              Authorization: `Bearer ${accessToken}`,
            }
          : {},
      },
      auth: {
        persistSession: false,
        autoRefreshToken: false,
      },
    }
  )
}
