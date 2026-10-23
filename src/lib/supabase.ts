import { createClient, SupabaseClient } from '@supabase/supabase-js';

let client: SupabaseClient | null | undefined;

/**
 * Server-only Supabase client using the service role key (bypasses RLS).
 * Never import this from client components - it must only run in API routes / scripts.
 * Returns null if env vars are missing so callers can fall back gracefully.
 */
export function getSupabase(): SupabaseClient | null {
  if (client !== undefined) return client;

  const url = process.env.SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!url || !key) {
    console.warn('[Supabase] SUPABASE_URL / SUPABASE_SERVICE_ROLE_KEY missing - falling back to in-memory storage');
    client = null;
    return client;
  }

  client = createClient(url, key, {
    auth: { persistSession: false, autoRefreshToken: false }
  });
  return client;
}
