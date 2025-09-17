import { NextRequest, NextResponse } from "next/server";
import { createServerClient } from "@supabase/ssr";

/**
 * POST /api/auth/refresh
 * Renouvelle un access token via refresh token
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { refresh_token } = body;

    if (!refresh_token) {
      return NextResponse.json(
        { error: "refresh_token is required" },
        { status: 400 }
      );
    }

    // Créer un client Supabase pour le refresh
    const supabase = createServerClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
      {
        cookies: {
          get() {
            return undefined;
          },
          set() {},
          remove() {},
        },
      }
    );

    // Utiliser le refresh token pour obtenir un nouveau access token
    const { data, error } = await supabase.auth.refreshSession({
      refresh_token,
    });

    if (error || !data.session) {
      return NextResponse.json(
        {
          error: "Invalid or expired refresh token",
          code: "REFRESH_FAILED",
        },
        { status: 401 }
      );
    }

    const { session, user } = data;

    return NextResponse.json({
      access_token: session.access_token,
      refresh_token: session.refresh_token,
      expires_at: session.expires_at,
      expires_in: session.expires_in,
      user: {
        id: user?.id || '',
        email: user?.email || '',
        email_verified: user?.email_confirmed_at ? true : false,
      },
    });
  } catch (error) {
    console.error("Token refresh error:", error);
    return NextResponse.json(
      {
        error: "Token refresh failed",
        code: "REFRESH_ERROR",
      },
      { status: 500 }
    );
  }
}