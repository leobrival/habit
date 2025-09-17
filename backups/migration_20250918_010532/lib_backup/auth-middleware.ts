import { NextRequest } from 'next/server'
import { createServerSupabaseClient } from './supabase'
import { AuthenticatedUser } from './types/auth'
import crypto from 'crypto'

export interface AuthContext {
  user: AuthenticatedUser
  supabase: ReturnType<typeof createServerSupabaseClient>
  request: NextRequest
}

export class AuthError extends Error {
  constructor(message: string, public status: number = 401) {
    super(message)
    this.name = 'AuthError'
  }
}

export async function validateApiKey(request: NextRequest): Promise<AuthContext> {
  const authHeader = request.headers.get('authorization')

  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    throw new AuthError('Missing or invalid authorization header', 401)
  }

  const apiKey = authHeader.slice(7) // Remove 'Bearer ' prefix

  if (!apiKey || apiKey.length === 0) {
    throw new AuthError('Missing API key', 401)
  }

  // Hash the provided API key for comparison
  const keyHash = crypto.createHash('sha256').update(apiKey).digest('hex')

  const supabase = createServerSupabaseClient()

  // Find the API key and associated user
  const { data: apiKeyData, error: apiKeyError } = await supabase
    .from('api_keys')
    .select(`
      id,
      user_id,
      label,
      revoked_at,
      users (
        id,
        email
      )
    `)
    .eq('key_hash', keyHash)
.is('revoked_at', null)
    .single()

  if (apiKeyError || !apiKeyData) {
    throw new AuthError('Invalid API key', 401)
  }

  if (apiKeyData.revoked_at) {
    throw new AuthError('API key has been revoked', 401)
  }

  // Update last_used_at timestamp
  await supabase
    .from('api_keys')
    .update({ last_used_at: new Date().toISOString() })
    .eq('id', apiKeyData.id)

  const user = apiKeyData.users as any
  if (!user) {
    throw new AuthError('Associated user not found', 401)
  }

  return {
    user: {
      id: user.id,
      email: user.email
    },
    supabase,
    request
  }
}

export function withAuth<T extends any[]>(
  handler: (context: AuthContext, ...args: T) => Promise<Response>
) {
  return async (request: NextRequest, ...args: T): Promise<Response> => {
    try {
      const context = await validateApiKey(request)
      return await handler(context, ...args)
    } catch (error) {
      if (error instanceof AuthError) {
        return new Response(
          JSON.stringify({ error: error.message }),
          {
            status: error.status,
            headers: { 'Content-Type': 'application/json' }
          }
        )
      }

      console.error('Authentication error:', error)
      return new Response(
        JSON.stringify({ error: 'Internal server error' }),
        {
          status: 500,
          headers: { 'Content-Type': 'application/json' }
        }
      )
    }
  }
}

export async function generateApiKey(): Promise<string> {
  // Generate a 32-character random string
  return crypto.randomBytes(16).toString('hex')
}

export function hashApiKey(apiKey: string): string {
  return crypto.createHash('sha256').update(apiKey).digest('hex')
}

// Helper function to extract user context from request
export async function getUserFromRequest(request: NextRequest): Promise<AuthenticatedUser> {
  const context = await validateApiKey(request)
  return context.user
}