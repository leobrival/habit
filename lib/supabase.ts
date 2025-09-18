import { createClient } from '@supabase/supabase-js'
import { createServerClient } from '@supabase/ssr'
import { Database } from './types/database'
import { getAuthEnv } from './env'

// Client for browser-side operations - lazy initialization
let _supabase: ReturnType<typeof createClient<Database>> | null = null

export function getSupabaseClient() {
  if (!_supabase) {
    const authEnv = getAuthEnv()
    _supabase = createClient<Database>(
      authEnv.supabaseUrl,
      authEnv.anonKey
    )
  }
  return _supabase
}

// Legacy export for backward compatibility - use getter to avoid build-time evaluation
export function getSupabase() {
  return getSupabaseClient()
}

// Server-side client with service role key for admin operations
export const createServerSupabaseClient = () => {
  const authEnv = getAuthEnv()
  // Use validated service role key or fall back to anon key
  const keyToUse = authEnv.serviceRoleKey || authEnv.anonKey

  return createClient<Database>(
    authEnv.supabaseUrl,
    keyToUse,
    {
      auth: {
        autoRefreshToken: false,
        persistSession: false
      }
    }
  )
}

// Nouveau: Client côté serveur avec contexte utilisateur (pour JWT auth)
export const createUserContextSupabaseClient = (accessToken: string) => {
  const authEnv = getAuthEnv()

  return createServerClient<Database>(
    authEnv.supabaseUrl,
    authEnv.anonKey,
    {
      cookies: {
        get() {
          return undefined;
        },
        set() {},
        remove() {},
      },
      global: {
        headers: {
          Authorization: `Bearer ${accessToken}`,
        },
      },
    }
  );
};