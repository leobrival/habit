import { NextRequest, NextResponse } from 'next/server'
import { createServerSupabaseClient } from '@/lib/supabase'

export async function GET(request: NextRequest) {
  try {
    const supabase = createServerSupabaseClient()

    // Get all boards using the fixed SDK
    const { data, error } = await supabase
      .from('boards')
      .select('*')
      .order('created_at', { ascending: false })

    if (error) {
      return NextResponse.json({
        status: 'ERROR',
        error: error.message,
        code: error.code
      }, { status: 500 })
    }

    return NextResponse.json({
      status: 'SUCCESS',
      message: 'Boards retrieved with Supabase SDK!',
      data: data,
      count: data.length,
      sdk_working: true
    })

  } catch (error) {
    return NextResponse.json({
      status: 'ERROR',
      error: (error as Error).message,
      sdk_working: false
    }, { status: 500 })
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { name, description, color, icon } = body

    if (!name) {
      return NextResponse.json({ error: 'Name is required' }, { status: 400 })
    }

    const supabase = createServerSupabaseClient()

    // Create board using our test user ID
    const { data, error } = await supabase
      .from('boards')
      .insert({
        user_id: 'ece8f16f-9da2-430c-9908-6e4110791027',
        name,
        description: description || null,
        color: color || '#22c55e',
        icon: icon || null
      })
      .select()
      .single()

    if (error) {
      return NextResponse.json({
        status: 'ERROR',
        error: error.message,
        code: error.code
      }, { status: 500 })
    }

    return NextResponse.json({
      status: 'SUCCESS',
      message: 'Board created with Supabase SDK!',
      data: data,
      sdk_working: true
    }, { status: 201 })

  } catch (error) {
    return NextResponse.json({
      status: 'ERROR',
      error: (error as Error).message,
      sdk_working: false
    }, { status: 500 })
  }
}