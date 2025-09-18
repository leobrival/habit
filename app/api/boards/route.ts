import { NextRequest, NextResponse } from 'next/server'
import { withDualAuth } from '@/lib/auth-transition'
import { validateRequest, createBoardSchema, boardListQuerySchema, ValidationError } from '@/lib/validation'

// GET /api/boards - List user's boards
export const GET = withDualAuth(async (context, request) => {
  try {
    const url = new URL(request.url)
    const include_archived = url.searchParams.get('include_archived') === 'true'

    // 🎉 Plus besoin de filtrer par user_id avec JWT - RLS le fait automatiquement !
    // Pour API keys, le filtrage manuel est conservé dans withDualAuth
    let query = context.supabase
      .from('boards')
      .select('*')
      .order('created_at', { ascending: false })

    // Pour les API keys, on garde le filtrage manuel
    if ('apiKey' in context) {
      query = query.eq('user_id', context.user.id)
    }

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
export const POST = withDualAuth(async (context, request) => {
  try {
    const body = await request.json()
    const boardData = validateRequest(createBoardSchema, body)

    // 🎉 user_id automatiquement défini par RLS avec auth.uid() pour JWT
    // Pour API keys, on continue à définir explicitement user_id
    const { data: newBoard, error } = await context.supabase
      .from('boards')
      .insert({
        user_id: context.user.id, // Explicite pour la clarté, mais RLS le vérifie pour JWT
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