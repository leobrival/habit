import { NextRequest, NextResponse } from 'next/server'

export async function GET(request: NextRequest) {
  return NextResponse.json({
    environment: {
      supabase_url: process.env.NEXT_PUBLIC_SUPABASE_URL ? 'SET' : 'NOT SET',
      supabase_anon_key: process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ? 'SET' : 'NOT SET',
      supabase_service_key: process.env.SUPABASE_SERVICE_ROLE_KEY ? 'SET' : 'NOT SET',
      node_env: process.env.NODE_ENV,
    },
    config: {
      supabase_url_preview: process.env.NEXT_PUBLIC_SUPABASE_URL?.substring(0, 30) + '...',
      anon_key_preview: process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY?.substring(0, 30) + '...'
    },
    help: {
      message: "Check if your Supabase project is configured correctly",
      steps: [
        "1. Verify URL format: https://[project-ref].supabase.co",
        "2. Verify anon key is valid JWT token",
        "3. Check if project exists and is active",
        "4. Ensure authentication is enabled in Supabase dashboard"
      ]
    }
  })
}