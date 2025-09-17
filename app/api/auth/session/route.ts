import { NextRequest, NextResponse } from "next/server";
import { validateJWT } from "@/lib/jwt-auth-middleware";

/**
 * POST /api/auth/session
 * Valide un token JWT et retourne les informations de session
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { access_token } = body;

    if (!access_token) {
      return NextResponse.json(
        { error: "access_token is required" },
        { status: 400 }
      );
    }

    // Créer une requête temporaire avec le token pour validation
    const tempRequest = new NextRequest(request.url, {
      headers: {
        authorization: `Bearer ${access_token}`,
        "content-type": "application/json",
      },
    });

    // Valider le token
    const context = await validateJWT(tempRequest);

    return NextResponse.json({
      user: context.user,
      session: context.session,
      message: "Session valid",
    });
  } catch (error: any) {
    return NextResponse.json(
      {
        error: error.message || "Session validation failed",
        code: "INVALID_SESSION",
      },
      { status: 401 }
    );
  }
}

/**
 * GET /api/auth/session
 * Alternative pour valider via header Authorization
 */
export async function GET(request: NextRequest) {
  try {
    const context = await validateJWT(request);

    return NextResponse.json({
      user: context.user,
      session: {
        expires_at: context.session.expires_at,
        // Ne pas exposer le token complet
        token_preview: context.session.access_token.slice(0, 20) + "...",
      },
      message: "Session valid",
    });
  } catch (error: any) {
    return NextResponse.json(
      {
        error: error.message || "Session validation failed",
        code: "INVALID_SESSION",
      },
      { status: 401 }
    );
  }
}