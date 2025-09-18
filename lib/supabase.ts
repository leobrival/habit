import { createClient } from '@supabase/supabase-js'
import { createServerClient } from '@supabase/ssr'
import { Database } from './types/database'
import { authEnv } from './env'

// Client for browser-side operations
export const supabase = createClient<Database>(
  authEnv.supabaseUrl,
  authEnv.anonKey
)

// Server-side client with service role key for admin operations
export const createServerSupabaseClient = () => {
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