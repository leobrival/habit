import { NextRequest, NextResponse } from 'next/server'
import { validateRequest, createBoardSchema, ValidationError } from '@/lib/validation'

// Simulate in-memory database
let mockBoards: any[] = [
  {
    id: '11111111-1111-1111-1111-111111111111',
    user_id: '12345678-1234-1234-1234-123456789abc',
    name: 'Morning Exercise',
    description: 'Daily workout routine',
    color: '#22c55e',
    icon: '🏃',
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
    archived_at: null
  }
]

// Simple API key validation for testing
function validateTestApiKey(request: NextRequest) {
  const authHeader = request.headers.get('authorization')
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    throw new Error('Missing authorization header')
  }

  const apiKey = authHeader.slice(7)
  if (!apiKey || apiKey.length < 10) {
    throw new Error('Invalid API key')
  }

  return {
    user: { id: '12345678-1234-1234-1234-123456789abc', email: 'leo.brival@gmail.com' }
  }
}

// GET /api/test/boards - List user's boards
export async function GET(request: NextRequest) {
  try {
    const user = validateTestApiKey(request)
    const { searchParams } = new URL(request.url)
    const include_archived = searchParams.get('include_archived') === 'true'

    let boards = mockBoards.filter(board => board.user_id === user.user.id)

    if (!include_archived) {
      boards = boards.filter(board => board.archived_at === null)
    }

    return NextResponse.json(boards)

  } catch (error) {
    return NextResponse.json(
      { error: (error as Error).message },
      { status: 401 }
    )
  }
}

// POST /api/test/boards - Create new board
export async function POST(request: NextRequest) {
  try {
    const user = validateTestApiKey(request)
    const body = await request.json()
    const boardData = validateRequest(createBoardSchema, body)

    const newBoard = {
      id: crypto.randomUUID(),
      user_id: user.user.id,
      ...boardData,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
      archived_at: null
    }

    mockBoards.push(newBoard)

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

    return NextResponse.json(
      { error: (error as Error).message },
      { status: error instanceof Error && error.message.includes('authorization') ? 401 : 500 }
    )
  }
}