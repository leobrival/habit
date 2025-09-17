import { NextRequest, NextResponse } from 'next/server'

export async function GET(request: NextRequest) {
  try {
    const url = process.env.NEXT_PUBLIC_SUPABASE_URL
    const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY

    if (!url || !anonKey) {
      return NextResponse.json({ error: 'Missing environment variables' })
    }

    // Test access to our users table via direct HTTP
    const response = await fetch(`${url}/rest/v1/users?select=*`, {
      method: 'GET',
      headers: {
        'apikey': anonKey,
        'Authorization': `Bearer ${anonKey}`,
        'Content-Type': 'application/json'
      }
    })

    const data = await response.json()

    return NextResponse.json({
      status: response.status,
      statusText: response.statusText,
      data: data,
      message: response.status === 200 ? 'Users table accessible!' : 'Error accessing users table'
    })

  } catch (error) {
    return NextResponse.json({
      error: 'Fetch failed',
      message: (error as Error).message
    })
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { email } = body

    if (!email) {
      return NextResponse.json({ error: 'Email required' }, { status: 400 })
    }

    const url = process.env.NEXT_PUBLIC_SUPABASE_URL
    const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY

    // Create a test user via direct HTTP
    const response = await fetch(`${url}/rest/v1/users`, {
      method: 'POST',
      headers: {
        'apikey': anonKey,
        'Authorization': `Bearer ${anonKey}`,
        'Content-Type': 'application/json',
        'Prefer': 'return=representation'
      },
      body: JSON.stringify({ email })
    })

    const data = await response.json()

    return NextResponse.json({
      status: response.status,
      data: data,
      message: response.status === 201 ? 'User created successfully!' : 'Error creating user'
    })

  } catch (error) {
    return NextResponse.json({
      error: 'Failed to create user',
      message: (error as Error).message
    })
  }
}