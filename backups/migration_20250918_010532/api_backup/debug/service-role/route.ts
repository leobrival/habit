import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

export async function GET(request: NextRequest) {
  try {
    // Try with service role key if available
    const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY
    const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
    const url = process.env.NEXT_PUBLIC_SUPABASE_URL

    if (!url) {
      return NextResponse.json({ error: 'Missing SUPABASE_URL' })
    }

    // Test with anon key first
    if (anonKey && anonKey !== 'placeholder-service-role-key') {
      try {
        const supabaseAnon = createClient(url, anonKey)
        const { data, error } = await supabaseAnon.from('information_schema.tables').select('*').limit(1)

        if (!error) {
          return NextResponse.json({
            status: 'SUCCESS',
            key_type: 'anon',
            message: 'Anon key works!',
            tables_accessible: data ? data.length : 0
          })
        }
      } catch (e) {
        // Continue to service role key test
      }
    }

    // Test with service role key
    if (serviceRoleKey && serviceRoleKey !== 'placeholder-service-role-key') {
      try {
        const supabaseService = createClient(url, serviceRoleKey, {
          auth: { autoRefreshToken: false, persistSession: false }
        })

        const { data, error } = await supabaseService.from('information_schema.tables').select('*').limit(1)

        if (!error) {
          return NextResponse.json({
            status: 'SUCCESS',
            key_type: 'service_role',
            message: 'Service role key works!',
            tables_accessible: data ? data.length : 0
          })
        } else {
          return NextResponse.json({
            status: 'ERROR',
            key_type: 'service_role',
            error: error.message,
            code: error.code
          })
        }
      } catch (e) {
        return NextResponse.json({
          status: 'ERROR',
          key_type: 'service_role',
          error: (e as Error).message
        })
      }
    }

    return NextResponse.json({
      status: 'ERROR',
      message: 'No valid keys found',
      available_keys: {
        anon: anonKey ? 'present' : 'missing',
        service_role: serviceRoleKey ? 'present' : 'missing'
      }
    })

  } catch (error) {
    return NextResponse.json({
      status: 'ERROR',
      error: (error as Error).message
    })
  }
}