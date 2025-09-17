import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { createServerSupabaseClient } from '@/lib/supabase'

export async function GET(request: NextRequest) {
  try {
    const url = process.env.NEXT_PUBLIC_SUPABASE_URL!
    const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!

    const results = {
      environment: {
        url_length: url.length,
        key_length: anonKey.length,
        url_format: url.startsWith('https://') && url.endsWith('.supabase.co'),
        key_format: anonKey.startsWith('eyJ') // JWT format
      },
      tests: {}
    }

    // Test 1: Direct HTTP
    try {
      const httpResponse = await fetch(`${url}/rest/v1/users?select=count`, {
        headers: {
          'apikey': anonKey,
          'Authorization': `Bearer ${anonKey}`
        }
      })
      results.tests.direct_http = {
        status: httpResponse.status,
        success: httpResponse.status === 200,
        headers: Object.fromEntries(httpResponse.headers.entries())
      }
    } catch (e) {
      results.tests.direct_http = {
        error: (e as Error).message,
        success: false
      }
    }

    // Test 2: SDK with minimal config
    try {
      const supabaseMinimal = createClient(url, anonKey)
      const { data, error } = await supabaseMinimal.from('users').select('count').limit(1)

      results.tests.sdk_minimal = {
        success: !error,
        error: error?.message,
        data: data
      }
    } catch (e) {
      results.tests.sdk_minimal = {
        error: (e as Error).message,
        success: false
      }
    }

    // Test 3: SDK with server config
    try {
      const supabaseServer = createClient(url, anonKey, {
        auth: { autoRefreshToken: false, persistSession: false }
      })
      const { data, error } = await supabaseServer.from('users').select('count').limit(1)

      results.tests.sdk_server_config = {
        success: !error,
        error: error?.message,
        data: data
      }
    } catch (e) {
      results.tests.sdk_server_config = {
        error: (e as Error).message,
        success: false
      }
    }

    // Test 4: Our current implementation
    try {
      const supabaseOurs = createServerSupabaseClient()
      const { data, error } = await supabaseOurs.from('users').select('count').limit(1)

      results.tests.our_implementation = {
        success: !error,
        error: error?.message,
        data: data
      }
    } catch (e) {
      results.tests.our_implementation = {
        error: (e as Error).message,
        success: false
      }
    }

    // Test 5: SDK with different global options
    try {
      const supabaseGlobal = createClient(url, anonKey, {
        global: {
          headers: {
            'User-Agent': 'habit-tracker-api/1.0'
          }
        }
      })
      const { data, error } = await supabaseGlobal.from('users').select('count').limit(1)

      results.tests.sdk_with_global = {
        success: !error,
        error: error?.message,
        data: data
      }
    } catch (e) {
      results.tests.sdk_with_global = {
        error: (e as Error).message,
        success: false
      }
    }

    return NextResponse.json(results)

  } catch (error) {
    return NextResponse.json({
      error: 'Test failed',
      message: (error as Error).message
    })
  }
}