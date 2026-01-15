import { createClient } from '@supabase/supabase-js';
import { crossSubdomainStorage } from './storage-adapter';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;

export const supabase = createClient(supabaseUrl, supabaseKey, {
  auth: {
    storage: crossSubdomainStorage,
    autoRefreshToken: true,
    persistSession: true,
  },
});
