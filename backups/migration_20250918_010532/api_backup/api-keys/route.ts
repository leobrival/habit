import { NextRequest, NextResponse } from 'next/server'
import { withAuth } from '@/lib/auth-middleware'
import { validateRequest, createApiKeySchema, ValidationError } from '@/lib/validation'
import { generateApiKey, hashApiKey } from '@/lib/auth-middleware'

// GET /api/api-keys - List user's API keys
export const GET = withAuth(async (context) => {
  try {
    const { data: apiKeys, error } = await context.supabase
      .from('api_keys')
      .select('id, label, created_at, last_used_at, revoked_at')
      .eq('user_id', context.user.id)
      .order('created_at', { ascending: false })

    if (error) {
      console.error('Error fetching API keys:', error)
      return NextResponse.json(
        { error: 'Failed to fetch API keys' },
        { status: 500 }
      )
    }

    return NextResponse.json(apiKeys)

  } catch (error) {
    console.error('API keys list error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
})

// POST /api/api-keys - Generate new API key
export const POST = withAuth(async (context, request: NextRequest) => {
  try {
    const body = await request.json()
    const { label } = validateRequest(createApiKeySchema, body)

    // Check if label is unique for this user
    const { data: existingKey } = await context.supabase
      .from('api_keys')
      .select('id')
      .eq('user_id', context.user.id)
      .eq('label', label)
.is('revoked_at', null)
      .single()

    if (existingKey) {
      return NextResponse.json(
        { error: 'An API key with this label already exists' },
        { status: 409 }
      )
    }

    // Generate new API key
    const apiKey = await generateApiKey()
    const keyHash = hashApiKey(apiKey)

    const { data: newApiKey, error } = await context.supabase
      .from('api_keys')
      .insert({
        user_id: context.user.id,
        key_hash: keyHash,
        label
      })
      .select('id, label, created_at')
      .single()

    if (error) {
      console.error('Error creating API key:', error)
      return NextResponse.json(
        { error: 'Failed to create API key' },
        { status: 500 }
      )
    }

    return NextResponse.json(
      {
        id: newApiKey.id,
        label: newApiKey.label,
        api_key: apiKey,
        created_at: newApiKey.created_at
      },
      { status: 201 }
    )

  } catch (error) {
    if (error instanceof ValidationError) {
      return NextResponse.json(
        {
          error: 'Validation failed',
          details: error.errors
        },
        { status: 400 }
      )
    }

    console.error('API key creation error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
})