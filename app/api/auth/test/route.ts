import { NextRequest, NextResponse } from 'next/server'
import { generateApiKey, hashApiKey } from '@/lib/auth-middleware'

// Test endpoint that simulates successful authentication without Supabase
export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { email } = body

    if (!email || !email.includes('@')) {
      return NextResponse.json(
        { error: 'Valid email is required' },
        { status: 400 }
      )
    }

    // Generate a test API key
    const apiKey = await generateApiKey()

    // Simulate a successful authentication response
    const testUser = {
      id: '12345678-1234-1234-1234-123456789abc',
      email: email
    }

    return NextResponse.json({
      user: testUser,
      api_key: apiKey,
      message: 'Test authentication successful (no real Supabase connection)'
    })

  } catch (error) {
    console.error('Test auth error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}