import { NextRequest, NextResponse } from 'next/server'
import { withAuth } from '@/lib/auth-middleware'
import { validateUUID, ValidationError } from '@/lib/validation'

// DELETE /api/api-keys/[key_id] - Revoke API key
export const DELETE = withAuth(async (context, request: NextRequest, { params }: { params: { key_id: string } }) => {
  try {
    const keyId = validateUUID(params.key_id)

    // Find the API key and verify ownership
    const { data: apiKey, error: findError } = await context.supabase
      .from('api_keys')
      .select('id, label, revoked_at')
      .eq('id', keyId)
      .eq('user_id', context.user.id)
      .single()

    if (findError || !apiKey) {
      return NextResponse.json(
        { error: 'API key not found' },
        { status: 404 }
      )
    }

    if (apiKey.revoked_at) {
      return NextResponse.json(
        { error: 'API key is already revoked' },
        { status: 409 }
      )
    }

    // Revoke the API key (soft delete)
    const { error: revokeError } = await context.supabase
      .from('api_keys')
      .update({ revoked_at: new Date().toISOString() })
      .eq('id', keyId)

    if (revokeError) {
      console.error('Error revoking API key:', revokeError)
      return NextResponse.json(
        { error: 'Failed to revoke API key' },
        { status: 500 }
      )
    }

    return NextResponse.json({
      message: `API key "${apiKey.label}" has been revoked`
    })

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

    console.error('API key revocation error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
})