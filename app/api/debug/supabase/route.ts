import { NextRequest, NextResponse } from 'next/server'
import { createServerSupabaseClient } from '@/lib/supabase'

export async function GET(request: NextRequest) {
  try {
    const supabase = createServerSupabaseClient()

    // Test basic database connection with a simple query
    const { data, error, status } = await supabase
      .rpc('version') // This should be available in PostgreSQL

    if (error) {
      return NextResponse.json({
        status: 'ERROR',
        error: error.message,
        code: error.code,
        details: error.details,
        hint: error.hint,
        status_code: status
      })
    }

    return NextResponse.json({
      status: 'SUCCESS',
      message: 'Supabase connection working!',
      postgres_version: data,
      project_ref: process.env.NEXT_PUBLIC_SUPABASE_URL?.match(/https:\/\/(.+)\.supabase\.co/)?.[1]
    })

  } catch (error) {
    return NextResponse.json({
      status: 'ERROR',
      error: 'Connection failed',
      message: (error as Error).message,
      stack: (error as Error).stack?.split('\n').slice(0, 3)
    })
  }
}