import { NextRequest, NextResponse } from 'next/server'

export async function GET(request: NextRequest) {
  try {
    const url = process.env.NEXT_PUBLIC_SUPABASE_URL
    const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY

    // Get check-ins for our test user
    const response = await fetch(`${url}/rest/v1/check_ins?select=*&user_id=eq.ece8f16f-9da2-430c-9908-6e4110791027&order=date.desc`, {
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
      message: response.status === 200 ? 'Check-ins retrieved successfully!' : 'Error retrieving check-ins'
    })

  } catch (error) {
    return NextResponse.json({
      error: 'Failed to get check-ins',
      message: (error as Error).message
    })
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { board_id, date, completed, notes } = body

    if (!board_id || !date || completed === undefined) {
      return NextResponse.json({
        error: 'board_id, date, and completed are required'
      }, { status: 400 })
    }

    const url = process.env.NEXT_PUBLIC_SUPABASE_URL
    const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY

    // Create a check-in for our test user
    const checkInData = {
      board_id,
      user_id: 'ece8f16f-9da2-430c-9908-6e4110791027',
      date,
      completed,
      notes: notes || null
    }

    const response = await fetch(`${url}/rest/v1/check_ins`, {
      method: 'POST',
      headers: {
        'apikey': anonKey,
        'Authorization': `Bearer ${anonKey}`,
        'Content-Type': 'application/json',
        'Prefer': 'return=representation'
      },
      body: JSON.stringify(checkInData)
    })

    const data = await response.json()

    return NextResponse.json({
      status: response.status,
      data: data,
      message: response.status === 201 ? 'Check-in created successfully!' : 'Error creating check-in'
    })

  } catch (error) {
    return NextResponse.json({
      error: 'Failed to create check-in',
      message: (error as Error).message
    })
  }
}