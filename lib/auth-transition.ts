import { NextRequest } from "next/server";
import { withAuth, AuthContext } from "./auth-middleware"; // Ancien système
import { withJWTAuth, JWTAuthContext } from "./jwt-auth-middleware"; // Nouveau système

/**
 * Middleware de transition qui supporte les deux systèmes d'auth
 * Permet une migration progressive sans casser l'existant
 */
export function withDualAuth<T extends any[]>(
  handler: (
    context: AuthContext | JWTAuthContext,
    ...args: T
  ) => Promise<Response>
) {
  return async (request: NextRequest, ...args: T): Promise<Response> => {
    const authHeader = request.headers.get("authorization");

    if (!authHeader) {
      return Response.json(
        { error: "Missing authorization header" },
        { status: 401 }
      );
    }

    // Détecter le type d'authentification
    if (authHeader.includes("Bearer ey")) {
      // JWT token (commence par 'ey' comme tous les JWT)
      console.log("🔑 Using JWT auth");
      return withJWTAuth(handler)(request, ...args);
    } else if (authHeader.includes("Bearer ")) {
      // API key (ancien système)
      console.log("🗝️  Using API key auth (legacy)");
      return withAuth(handler as any)(request, ...args);
    }

    return Response.json(
      { error: "Invalid authorization format" },
      { status: 401 }
    );
  };
}

/**
 * Type guard pour vérifier si le contexte est JWT
 */
export function isJWTContext(context: AuthContext | JWTAuthContext): context is JWTAuthContext {
  return 'session' in context && 'access_token' in (context as JWTAuthContext).session;
}

/**
 * Type guard pour vérifier si le contexte est API key
 */
export function isAPIKeyContext(context: AuthContext | JWTAuthContext): context is AuthContext {
  return 'apiKey' in context;
}

/**
 * Fonction utilitaire pour extraire l'ID utilisateur indépendamment du type d'auth
 */
export function getUserId(context: AuthContext | JWTAuthContext): string {
  if (isJWTContext(context)) {
    return context.user.id;
  } else {
    return context.user.id;
  }
}

/**
 * Fonction utilitaire pour obtenir le client Supabase approprié
 */
export function getSupabaseClient(context: AuthContext | JWTAuthContext) {
  if (isJWTContext(context)) {
    return context.supabase; // Client avec contexte JWT pour RLS
  } else {
    return context.supabase; // Client avec service role (ancien système)
  }
}