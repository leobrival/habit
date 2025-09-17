import { NextRequest, NextResponse } from 'next/server'

export async function GET(request: NextRequest) {
  try {
    const url = process.env.NEXT_PUBLIC_SUPABASE_URL
    const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY

    // Get boards for our test user
    const response = await fetch(`${url}/rest/v1/boards?select=*&user_id=eq.ece8f16f-9da2-430c-9908-6e4110791027`, {
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
      data: data,
      count: Array.isArray(data) ? data.length : 0,
      message: response.status === 200 ? 'Boards retrieved successfully!' : 'Error retrieving boards'
    })

  } catch (error) {
    return NextResponse.json({
      error: 'Failed to get boards',
      message: (error as Error).message
    })
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { name, description, color, icon } = body

    if (!name) {
      return NextResponse.json({ error: 'Name is required' }, { status: 400 })
    }

    const url = process.env.NEXT_PUBLIC_SUPABASE_URL
    const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY

    // Create a board for our test user
    const boardData = {
      user_id: 'ece8f16f-9da2-430c-9908-6e4110791027',
      name,
      description: description || null,
      color: color || '#22c55e',
      icon: icon || null
    }

    const response = await fetch(`${url}/rest/v1/boards`, {
      method: 'POST',
      headers: {
        'apikey': anonKey,
        'Authorization': `Bearer ${anonKey}`,
        'Content-Type': 'application/json',
        'Prefer': 'return=representation'
      },
      body: JSON.stringify(boardData)
    })

    const data = await response.json()

    return NextResponse.json({
      status: response.status,
      data: data,
      message: response.status === 201 ? 'Board created successfully!' : 'Error creating board'
    })

  } catch (error) {
    return NextResponse.json({
      error: 'Failed to create board',
      message: (error as Error).message
    })
  }
}