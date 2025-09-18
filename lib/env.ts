/**
 * Environment Variables Validation
 * Following T3 App patterns for type-safe environment validation
 */

import { z } from 'zod';

// Server-side environment schema
const serverEnvSchema = z.object({
  // Supabase Configuration
  NEXT_PUBLIC_SUPABASE_URL: z
    .string()
    .url('NEXT_PUBLIC_SUPABASE_URL must be a valid URL')
    .refine(
      (url) => url.includes('supabase.co') || url.includes('localhost') || process.env.NODE_ENV === 'test',
      'NEXT_PUBLIC_SUPABASE_URL must be a Supabase URL or localhost'
    ),

  NEXT_PUBLIC_SUPABASE_ANON_KEY: z
    .string()
    .min(1, 'NEXT_PUBLIC_SUPABASE_ANON_KEY is required')
    .refine(
      (key) => key.startsWith('eyJ') || process.env.NODE_ENV === 'test',
      'NEXT_PUBLIC_SUPABASE_ANON_KEY must be a valid JWT token (starts with eyJ)'
    ),

  SUPABASE_SERVICE_ROLE_KEY: z
    .string()
    .min(1, 'SUPABASE_SERVICE_ROLE_KEY is required for authentication')
    .refine(
      (key) => key.startsWith('eyJ') || process.env.NODE_ENV === 'test',
      'SUPABASE_SERVICE_ROLE_KEY must be a valid JWT token (starts with eyJ)'
    )
    .refine(
      (key) => !key.includes('placeholder') || process.env.NODE_ENV === 'test',
      'SUPABASE_SERVICE_ROLE_KEY cannot be a placeholder value'
    ),

  // Node environment
  NODE_ENV: z.enum(['development', 'production', 'test']).default('development'),
});

// Client-side environment schema (only NEXT_PUBLIC_ variables)
const clientEnvSchema = z.object({
  NEXT_PUBLIC_SUPABASE_URL: z
    .string()
    .url('NEXT_PUBLIC_SUPABASE_URL must be a valid URL'),

  NEXT_PUBLIC_SUPABASE_ANON_KEY: z
    .string()
    .min(1, 'NEXT_PUBLIC_SUPABASE_ANON_KEY is required'),
});

// Validate server environment
function validateServerEnv() {
  const result = serverEnvSchema.safeParse(process.env);

  if (!result.success) {
    console.error('❌ Invalid environment variables:');
    console.error(result.error.flatten().fieldErrors);

    // In production, fail hard
    if (process.env.NODE_ENV === 'production') {
      throw new Error('Invalid environment variables');
    }

    // In development, show warnings but allow startup
    console.warn('⚠️  Development mode: continuing with invalid env vars');
    return null;
  }

  return result.data;
}

// Validate client environment
function validateClientEnv() {
  const clientEnv = {
    NEXT_PUBLIC_SUPABASE_URL: process.env.NEXT_PUBLIC_SUPABASE_URL,
    NEXT_PUBLIC_SUPABASE_ANON_KEY: process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
  };

  const result = clientEnvSchema.safeParse(clientEnv);

  if (!result.success) {
    console.error('❌ Invalid client environment variables:');
    console.error(result.error.flatten().fieldErrors);
    throw new Error('Invalid client environment variables');
  }

  return result.data;
}

// Export validated environment variables
export const env = validateServerEnv();
export const clientEnv = validateClientEnv();

// Type-safe environment access
export type ServerEnv = z.infer<typeof serverEnvSchema>;
export type ClientEnv = z.infer<typeof clientEnvSchema>;

// Helper functions
export function isProduction(): boolean {
  return process.env.NODE_ENV === 'production';
}

export function isDevelopment(): boolean {
  return process.env.NODE_ENV === 'development';
}

export function isTest(): boolean {
  return process.env.NODE_ENV === 'test';
}

// Validate specific environment variables for auth middleware
export function validateAuthEnvironment(): {
  supabaseUrl: string;
  anonKey: string;
  serviceRoleKey: string | null;
} {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!supabaseUrl) {
    throw new Error('NEXT_PUBLIC_SUPABASE_URL is required');
  }

  if (!anonKey) {
    throw new Error('NEXT_PUBLIC_SUPABASE_ANON_KEY is required');
  }

  // Service role key is optional in development but recommended
  if (!serviceRoleKey || serviceRoleKey.startsWith('placeholder')) {
    if (isProduction()) {
      throw new Error('SUPABASE_SERVICE_ROLE_KEY is required in production');
    }

    console.warn('⚠️  SUPABASE_SERVICE_ROLE_KEY not configured - using anon key');
    return {
      supabaseUrl,
      anonKey,
      serviceRoleKey: null,
    };
  }

  return {
    supabaseUrl,
    anonKey,
    serviceRoleKey,
  };
}

// Export for use in middleware
export const authEnv = validateAuthEnvironment();