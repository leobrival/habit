import { NextRequest, NextResponse } from 'next/server'
import { createServerSupabaseClient } from '@/lib/supabase'

export async function GET(request: NextRequest) {
  try {
    const supabase = createServerSupabaseClient()

    // Test si on peut accéder aux API keys
    const { data: apiKeysData, error: apiKeysError } = await supabase
      .from('api_keys')
      .select('id, user_id, label')
      .limit(1)

    // Test si on peut accéder aux users
    const { data: usersData, error: usersError } = await supabase
      .from('users')
      .select('id, email')
      .limit(1)

    return NextResponse.json({
      service_role: {
        api_keys: {
          success: !apiKeysError,
          error: apiKeysError?.message,
          count: apiKeysData?.length || 0
        },
        users: {
          success: !usersError,
          error: usersError?.message,
          count: usersData?.length || 0
        }
      },
      auth_info: {
        // Essayons de voir quel rôle on a
        current_role: 'checking...'
      }
    })

  } catch (error) {
    return NextResponse.json({
      error: 'Test failed',
      message: (error as Error).message
    }, { status: 500 })
  }
}