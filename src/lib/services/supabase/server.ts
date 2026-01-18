import { createClient as createSupabaseClient } from '@supabase/supabase-js'
import { auth } from '@clerk/nextjs/server'

export async function createClient() {
  const { getToken } = await auth()
  const token = await getToken()

  return createSupabaseClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY!,
    {
      global: {
        headers: token
          ? {
              Authorization: `Bearer ${token}`,
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
