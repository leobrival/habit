import { NextRequest, NextResponse } from 'next/server'
import { createServerSupabaseClient } from '@/lib/supabase'

// Test endpoint to check Supabase connection
export async function GET(request: NextRequest) {
  try {
    const supabase = createServerSupabaseClient()

    // Simple test - try to connect and get database info
    const { data, error } = await supabase
      .from('information_schema.tables') // This should exist in any PostgreSQL
      .select('*')
      .limit(1)

    if (error) {
      console.error('Supabase connection error:', error)
      return NextResponse.json(
        {
          error: 'Database connection failed',
          details: error.message,
          supabase_url: process.env.NEXT_PUBLIC_SUPABASE_URL?.substring(0, 20) + '...'
        },
        { status: 500 }
      )
    }

    return NextResponse.json({
      message: 'Supabase connection successful!',
      supabase_url: process.env.NEXT_PUBLIC_SUPABASE_URL?.substring(0, 20) + '...',
      connection_test: 'OK'
    })

  } catch (error) {
    console.error('Connection test error:', error)
    return NextResponse.json(
      {
        error: 'Failed to test connection',
        message: (error as Error).message
      },
      { status: 500 }
    )
  }
}