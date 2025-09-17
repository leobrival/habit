import { NextRequest, NextResponse } from 'next/server'
import { createServerSupabaseClient } from '@/lib/supabase'

export async function GET(request: NextRequest) {
  try {
    const supabase = createServerSupabaseClient()

    // Get all check-ins using the fixed SDK
    const { data, error } = await supabase
      .from('check_ins')
      .select('*')
      .order('date', { ascending: false })

    if (error) {
      return NextResponse.json({
        status: 'ERROR',
        error: error.message,
        code: error.code
      }, { status: 500 })
    }

    return NextResponse.json({
      status: 'SUCCESS',
      message: 'Check-ins retrieved with Supabase SDK!',
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
    const { board_id, date, completed, notes } = body

    if (!board_id || !date || completed === undefined) {
      return NextResponse.json({
        error: 'board_id, date, and completed are required'
      }, { status: 400 })
    }

    const supabase = createServerSupabaseClient()

    // Create check-in using our test user ID
    const { data, error } = await supabase
      .from('check_ins')
      .insert({
        user_id: 'ece8f16f-9da2-430c-9908-6e4110791027',
        board_id,
        date,
        completed,
        notes: notes || null
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
      message: 'Check-in created with Supabase SDK!',
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