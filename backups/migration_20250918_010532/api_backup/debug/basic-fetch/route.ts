import { NextRequest, NextResponse } from 'next/server'

export async function GET(request: NextRequest) {
  try {
    const url = process.env.NEXT_PUBLIC_SUPABASE_URL
    const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY

    if (!url || !anonKey) {
      return NextResponse.json({
        error: 'Missing environment variables',
        url_present: !!url,
        key_present: !!anonKey
      })
    }

    // Try basic fetch to Supabase API
    const response = await fetch(`${url}/rest/v1/`, {
      method: 'GET',
      headers: {
        'apikey': anonKey,
        'Authorization': `Bearer ${anonKey}`
      }
    })

    const responseText = await response.text()

    return NextResponse.json({
      status: response.status,
      statusText: response.statusText,
      headers: Object.fromEntries(response.headers.entries()),
      body: responseText ? responseText.substring(0, 500) : 'Empty response',
      url_tested: `${url}/rest/v1/`
    })

  } catch (error) {
    return NextResponse.json({
      error: 'Fetch failed',
      message: (error as Error).message,
      name: (error as Error).name
    })
  }
}