import { NextRequest, NextResponse } from "next/server";
import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";

export interface JWTAuthContext {
  user: {
    id: string;
    email: string;
    email_verified?: boolean;
  };
  supabase: any; // Client Supabase avec contexte utilisateur
  session: {
    access_token: string;
    refresh_token?: string;
    expires_at?: number;
  };
  request?: NextRequest; // Pour compatibilité avec l'ancien système
}

export class AuthError extends Error {
  constructor(message: string, public status: number = 401) {
    super(message);
    this.name = "AuthError";
  }
}

/**
 * Valide un token JWT Supabase et retourne le contexte utilisateur
 */
export async function validateJWT(
  request: NextRequest
): Promise<JWTAuthContext> {
  // 1. Extraire le token JWT du header Authorization
  const authHeader = request.headers.get("authorization");
  if (!authHeader || !authHeader.startsWith("Bearer ")) {
    throw new AuthError("Missing or invalid authorization header", 401);
  }

  const accessToken = authHeader.slice(7); // Enlever "Bearer "

  // 2. Validation basique du format JWT
  if (!accessToken.includes(".") || accessToken.split(".").length !== 3) {
    throw new AuthError("Invalid JWT token format", 401);
  }

  // 3. Créer un client Supabase avec le token utilisateur
  const cookieStore = cookies();
  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        get(name: string) {
          return cookieStore.get(name)?.value;
        },
      },
      global: {
        headers: {
          Authorization: `Bearer ${accessToken}`,
        },
      },
    }
  );

  // 4. Valider le token et récupérer l'utilisateur
  const {
    data: { user },
    error: userError,
  } = await supabase.auth.getUser(accessToken);

  if (userError || !user) {
    console.error("JWT validation error:", userError);
    throw new AuthError("Invalid or expired JWT token", 401);
  }

  // 5. Vérifier que l'utilisateur existe dans notre table users
  const { data: dbUser, error: dbError } = await supabase
    .from("users")
    .select("id, email")
    .eq("id", user.id)
    .single();

  if (dbError || !dbUser) {
    // L'utilisateur n'existe pas dans notre DB, on le crée
    const { error: insertError } = await supabase.from("users").insert({
      id: user.id,
      email: user.email!,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    });

    if (insertError) {
      console.error("Error creating user:", insertError);
      throw new AuthError("Failed to create user account", 500);
    }
  }

  return {
    user: {
      id: user.id,
      email: user.email!,
      email_verified: user.email_confirmed_at ? true : false,
    },
    supabase, // Ce client aura automatiquement le contexte utilisateur pour RLS
    session: {
      access_token: accessToken,
      expires_at: (user as any).exp,
    },
    request, // Pour compatibilité
  };
}

/**
 * Higher-order function pour protéger les routes avec JWT
 */
export function withJWTAuth<T extends any[]>(
  handler: (context: JWTAuthContext, ...args: T) => Promise<Response>
) {
  return async (request: NextRequest, ...args: T): Promise<Response> => {
    try {
      // Valider le JWT et obtenir le contexte
      const context = await validateJWT(request);

      // Ajouter le request au contexte pour compatibilité
      context.request = request;

      // Exécuter le handler avec le contexte
      return await handler(context, ...args);
    } catch (error) {
      if (error instanceof AuthError) {
        return NextResponse.json(
          { error: error.message },
          { status: error.status }
        );
      }

      console.error("JWT Authentication error:", error);
      return NextResponse.json(
        { error: "Authentication failed" },
        { status: 500 }
      );
    }
  };
}

/**
 * Fonction utilitaire pour créer un client Supabase avec contexte utilisateur
 */
export function createUserSupabaseClient(accessToken: string) {
  return createServerClient(
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
      global: {
        headers: {
          Authorization: `Bearer ${accessToken}`,
        },
      },
    }
  );
}