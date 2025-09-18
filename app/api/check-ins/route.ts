import { NextRequest, NextResponse } from 'next/server'
import { withDualAuth } from '@/lib/auth-transition'
import { validateRequest, createCheckInSchema, checkInListQuerySchema, ValidationError } from '@/lib/validation'

// GET /api/check-ins - List user's check-ins
export const GET = withDualAuth(async (context, request) => {
  try {
    const url = new URL(request.url)
    const board_id = url.searchParams.get('board_id')
    const date_from = url.searchParams.get('date_from')
    const date_to = url.searchParams.get('date_to')

    // 🎉 Plus besoin de .eq('user_id', context.user.id) - RLS le fait pour JWT !
    let query = context.supabase
      .from('check_ins')
      .select('*')
      .order('date', { ascending: false })

    // Pour les API keys, on garde le filtrage manuel
    if ('apiKey' in context) {
      query = query.eq('user_id', context.user.id)
    }

    // Filter by board_id if provided
    if (board_id) {
      query = query.eq('board_id', board_id)
    }

    // Filter by date range if provided
    if (date_from) {
      query = query.gte('date', date_from)
    }
    if (date_to) {
      query = query.lte('date', date_to)
    }

    const { data: checkIns, error } = await query

    if (error) {
      console.error('Check-ins list error:', error)
      return NextResponse.json(
        { error: 'Failed to fetch check-ins' },
        { status: 500 }
      )
    }

    return NextResponse.json(checkIns)

  } catch (error) {
    console.error('Check-ins list error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
})

// POST /api/check-ins - Create new check-in
export const POST = withDualAuth(async (context, request) => {
  try {
    const body = await request.json()
    const checkInData = validateRequest(createCheckInSchema, body)

    const { data: newCheckIn, error } = await context.supabase
      .from('check_ins')
      .insert({
        user_id: context.user.id,
        ...checkInData
      })
      .select()
      .single()

    if (error) {
      console.error('Check-in creation error:', error)
      return NextResponse.json(
        { error: 'Failed to create check-in' },
        { status: 500 }
      )
    }

    return NextResponse.json(newCheckIn, { status: 201 })

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

    console.error('Check-in creation error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
})