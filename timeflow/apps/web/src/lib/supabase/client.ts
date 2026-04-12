import { createBrowserClient } from '@supabase/ssr';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_DEFAULT_KEY;

/**
 * Browser Supabase client. Use for Supabase features (Realtime, Storage, etc.).
 * TimeFlow login remains Fastify + Google OAuth + JWT — this does not replace that.
 */
export function createClient() {
  if (!supabaseUrl || !supabaseKey) {
    throw new Error(
      'Missing NEXT_PUBLIC_SUPABASE_URL or NEXT_PUBLIC_SUPABASE_PUBLISHABLE_DEFAULT_KEY'
    );
  }
  return createBrowserClient(supabaseUrl, supabaseKey);
}
