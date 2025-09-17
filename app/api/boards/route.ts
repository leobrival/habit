import { NextRequest, NextResponse } from 'next/server'
import { withAuth } from '@/lib/auth-middleware'
import { validateRequest, createBoardSchema, boardListQuerySchema, ValidationError } from '@/lib/validation'

// GET /api/boards - List user's boards
export const GET = withAuth(async (context) => {
  try {
    const url = new URL(context.request.url || '', `http://localhost:3000`)
    const include_archived = url.searchParams.get('include_archived') === 'true'

    let query = context.supabase
      .from('boards')
      .select('*')
      .eq('user_id', context.user.id)
      .order('created_at', { ascending: false })

    // Filter out archived boards by default
    if (!include_archived) {
      query = query.is('archived_at', null)
    }

    const { data: boards, error } = await query

    if (error) {
      console.error('Error fetching boards:', error)
      return NextResponse.json(
        { error: 'Failed to fetch boards' },
        { status: 500 }
      )
    }

    return NextResponse.json(boards)

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

    console.error('Boards list error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
})

// POST /api/boards - Create new board
export const POST = withAuth(async (context) => {
  try {
    const body = await context.request.json()
    const boardData = validateRequest(createBoardSchema, body)

    const { data: newBoard, error } = await context.supabase
      .from('boards')
      .insert({
        user_id: context.user.id,
        ...boardData
      })
      .select()
      .single()

    if (error) {
      console.error('Error creating board:', error)
      return NextResponse.json(
        { error: 'Failed to create board' },
        { status: 500 }
      )
    }

    return NextResponse.json(newBoard, { status: 201 })

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

    console.error('Board creation error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
})