import { NextRequest, NextResponse } from 'next/server'
import { createServerSupabaseClient } from '@/lib/supabase'
import { validateRequest, magicLinkRequestSchema, ValidationError } from '@/lib/validation'

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { email } = validateRequest(magicLinkRequestSchema, body)

    const supabase = createServerSupabaseClient()

    // Send magic link using Supabase Auth
    const { error } = await supabase.auth.signInWithOtp({
      email,
      options: {
        emailRedirectTo: `${process.env.NEXT_PUBLIC_SITE_URL || 'http://localhost:3000'}/auth/callback`
      }
    })

    if (error) {
      console.error('Supabase auth error:', error)
      return NextResponse.json(
        { error: 'Failed to send magic link' },
        { status: 500 }
      )
    }

    return NextResponse.json({
      message: 'Magic link sent to your email'
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

    console.error('Magic link error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}