import { NextRequest, NextResponse } from 'next/server'
import { createServerSupabaseClient } from '@/lib/supabase'
import { validateRequest, magicLinkVerifySchema, ValidationError } from '@/lib/validation'
import { generateApiKey, hashApiKey } from '@/lib/auth-middleware'

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { key_name } = body

    // Get access token from Authorization header
    const authHeader = request.headers.get('authorization')
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return NextResponse.json(
        { error: 'Missing or invalid authorization header' },
        { status: 401 }
      )
    }

    const accessToken = authHeader.slice(7)
    const supabase = createServerSupabaseClient()

    // Verify the JWT access token with Supabase
    const { data: authData, error: authError } = await supabase.auth.getUser(accessToken)

    if (authError || !authData.user) {
      return NextResponse.json(
        { error: 'Invalid or expired token' },
        { status: 401 }
      )
    }

    const user = authData.user

    // Check if user exists in our users table
    let { data: existingUser, error: userError } = await supabase
      .from('users')
      .select('*')
      .eq('email', user.email!)
      .single()

    // Create user if doesn't exist
    if (!existingUser) {
      const { data: newUser, error: createError } = await supabase
        .from('users')
        .insert({
          id: user.id,
          email: user.email!
        })
        .select()
        .single()

      if (createError) {
        console.error('Error creating user:', createError)
        return NextResponse.json(
          { error: 'Failed to create user account' },
          { status: 500 }
        )
      }

      existingUser = newUser
    }

    // Generate a new API key for this authentication
    const apiKey = await generateApiKey()
    const keyHash = hashApiKey(apiKey)

    const { data: apiKeyData, error: apiKeyError } = await supabase
      .from('api_keys')
      .insert({
        user_id: existingUser.id,
        key_hash: keyHash,
        label: key_name || 'Magic Link Authentication'
      })
      .select()
      .single()

    if (apiKeyError) {
      console.error('Error creating API key:', apiKeyError)
      return NextResponse.json(
        { error: 'Failed to generate API key' },
        { status: 500 }
      )
    }

    return NextResponse.json({
      user: {
        id: existingUser.id,
        email: existingUser.email
      },
      api_key: apiKey
    })

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

    console.error('Verification error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}