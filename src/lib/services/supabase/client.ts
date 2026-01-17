import { createBrowserClient } from '@supabase/ssr'
import { useSession } from '@clerk/nextjs'
import { useMemo } from 'react'

export function useSupabaseClient() {
  const { session } = useSession()

  return useMemo(() => {
    return createBrowserClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY!,
      {
        accessToken: async () => {
          return await session?.getToken() ?? null
        },
      }
    )
  }, [session])
}

export function createClient(accessToken?: string | null) {
  return createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY!,
    {
      accessToken: async () => accessToken ?? null,
    }
  )
}
