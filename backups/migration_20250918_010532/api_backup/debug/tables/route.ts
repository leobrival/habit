import { NextRequest, NextResponse } from 'next/server'
import { createServerSupabaseClient } from '@/lib/supabase'

export async function GET(request: NextRequest) {
  try {
    const supabase = createServerSupabaseClient()

    // Try to list existing tables in the public schema
    const { data, error } = await supabase
      .from('information_schema.tables')
      .select('table_name')
      .eq('table_schema', 'public')

    if (error) {
      return NextResponse.json({
        status: 'ERROR',
        error: error.message,
        code: error.code
      })
    }

    // Check if our custom tables exist
    const tableNames = data.map(row => row.table_name)
    const ourTables = ['users', 'api_keys', 'boards', 'check_ins']
    const existingTables = ourTables.filter(table => tableNames.includes(table))
    const missingTables = ourTables.filter(table => !tableNames.includes(table))

    return NextResponse.json({
      status: 'SUCCESS',
      all_tables: tableNames,
      our_tables: {
        existing: existingTables,
        missing: missingTables
      },
      ready_for_api: missingTables.length === 0
    })

  } catch (error) {
    return NextResponse.json({
      status: 'ERROR',
      error: (error as Error).message
    })
  }
}