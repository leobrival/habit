# 🔄 Migration Guide: API Keys → JWT + Supabase Auth + RLS

## 📋 Table des matières

- [Vue d'ensemble](#vue-densemble)
- [Prérequis](#prérequis)
- [Phase 1: Préparation](#phase-1-préparation)
- [Phase 2: Implémentation JWT](#phase-2-implémentation-jwt)
- [Phase 3: Configuration RLS](#phase-3-configuration-rls)
- [Phase 4: Migration des endpoints](#phase-4-migration-des-endpoints)
- [Phase 5: Tests](#phase-5-tests)
- [Phase 6: Déploiement](#phase-6-déploiement)
- [Phase 7: Migration des clients](#phase-7-migration-des-clients)
- [Phase 8: Nettoyage](#phase-8-nettoyage)
- [Rollback Plan](#rollback-plan)
- [FAQ](#faq)

## 🎯 Vue d'ensemble

### Objectifs de la migration

- **Sécurité moderne** : Remplacer API keys par JWT standard
- **RLS natif** : Activer Row Level Security avec `auth.uid()`
- **Architecture simplifiée** : Moins de code custom à maintenir
- **Standards OAuth** : Compatibilité avec clients modernes (Raycast, MCP)

### Architecture actuelle vs cible

```
AVANT (API Keys)                      APRÈS (JWT + RLS)
┌─────────────┐                      ┌─────────────┐
│   Client    │ ─── API Key ───────→ │   Client    │ ─── JWT ─────────→
└─────────────┘                      └─────────────┘
       │                                     │
       ▼                                     ▼
┌─────────────┐                      ┌─────────────┐
│ API Server  │                      │ API Server  │
│ - Custom    │                      │ - Standard  │
│   auth      │                      │   JWT       │
│ - Manual    │                      │ - Auto RLS  │
│   filtering │                      │             │
└─────────────┘                      └─────────────┘
       │                                     │
       ▼                                     ▼
┌─────────────┐                      ┌─────────────┐
│  Supabase   │                      │  Supabase   │
│ - Service   │                      │ - User      │
│   role      │                      │   context   │
│ - No RLS    │                      │ - RLS ON    │
└─────────────┘                      └─────────────┘
```

### Bénéfices attendus

- ✅ **Sécurité renforcée** : RLS + JWT expirable
- ✅ **Code simplifié** : -50% de code d'auth custom
- ✅ **Standards modernes** : OAuth 2.0 / OpenID Connect
- ✅ **Multi-device** : Session management natif
- ✅ **Performance** : Moins de requêtes de validation

## 🔧 Prérequis

### Outils nécessaires

- [x] Node.js 18+
- [x] pnpm
- [x] Accès Supabase Dashboard
- [x] Environnement de développement fonctionnel

### Vérifications préalables

```bash
# 1. Tester l'API actuelle
curl -X GET http://localhost:3000/api/boards \
  -H "Authorization: Bearer bc529961369183feb7eff2c5e3699ba7"

# 2. Vérifier la base de données
curl -X GET http://localhost:3000/api/debug/rls-test

# 3. Backup des données critiques
# Exporter via Supabase Dashboard > SQL Editor:
```

```sql
-- Backup script à exécuter AVANT migration
COPY (SELECT * FROM users) TO '/tmp/users_backup.csv' CSV HEADER;
COPY (SELECT * FROM api_keys) TO '/tmp/api_keys_backup.csv' CSV HEADER;
COPY (SELECT * FROM boards) TO '/tmp/boards_backup.csv' CSV HEADER;
COPY (SELECT * FROM check_ins) TO '/tmp/check_ins_backup.csv' CSV HEADER;
```

### État des lieux détaillé

#### 📁 Fichiers impactés par la migration

```
lib/
├── auth-middleware.ts          # 🔄 À remplacer par jwt-auth-middleware.ts
├── validation.ts               # ✅ À conserver (minimal changes)
└── supabase.ts                # 🔄 À modifier (client creation)

app/api/
├── auth/
│   ├── magic-link/route.ts    # ✅ À conserver (fonctionne déjà)
│   ├── verify/route.ts        # 🔄 À remplacer par session/route.ts
│   └── refresh/route.ts       # ➕ Nouveau endpoint
├── boards/route.ts            # 🔄 À migrer (withAuth → withJWTAuth)
├── check-ins/route.ts         # 🔄 À migrer (withAuth → withJWTAuth)
└── debug/                     # 🔄 À adapter pour JWT

Database:
├── users table               # ✅ Compatible (UUID IDs)
├── api_keys table            # 🗑️  À supprimer (après migration)
├── boards table              # ✅ Compatible (user_id text)
└── check_ins table           # ✅ Compatible (user_id text)
```

## 📅 Phase 1: Préparation

### 1.1 Backup et validation

#### Créer les backups

```bash
# Script de backup automatique
cat > backup.sh << 'EOF'
#!/bin/bash
echo "🔄 Creating backup..."
timestamp=$(date +%Y%m%d_%H%M%S)
backup_dir="./backups/migration_$timestamp"
mkdir -p "$backup_dir"

# Code backup
cp -r lib/ "$backup_dir/lib_backup/"
cp -r app/api/ "$backup_dir/api_backup/"
cp package.json "$backup_dir/"
cp .env.local "$backup_dir/.env.local.backup"

echo "✅ Backup créé dans $backup_dir"
EOF

chmod +x backup.sh
./backup.sh
```

#### Documenter l'état actuel

```bash
# Capturer l'état de l'API
curl -s http://localhost:3000/api/boards \
  -H "Authorization: Bearer bc529961369183feb7eff2c5e3699ba7" \
  | jq '.' > backups/api_state_before.json

# Test complet de l'API actuelle
npm run test:api
```

### 1.2 Validation des données

#### Vérifier la cohérence des UUIDs

```sql
-- À exécuter dans Supabase SQL Editor
-- Vérifier que tous les user_id sont des UUIDs valides
SELECT
  table_name,
  column_name,
  count(*) as total_rows,
  count(CASE WHEN user_id ~ '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$' THEN 1 END) as valid_uuids
FROM (
  SELECT 'boards' as table_name, 'user_id' as column_name, user_id FROM boards
  UNION ALL
  SELECT 'check_ins' as table_name, 'user_id' as column_name, user_id FROM check_ins
  UNION ALL
  SELECT 'api_keys' as table_name, 'user_id' as column_name, user_id FROM api_keys
) t
GROUP BY table_name, column_name;
```

## 🔐 Phase 2: Implémentation JWT

### 2.1 Nouveau middleware JWT

#### Créer le middleware JWT

```typescript
// lib/jwt-auth-middleware.ts
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
      expires_at: user.exp,
    },
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
      (context as any).request = request;

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
      global: {
        headers: {
          Authorization: `Bearer ${accessToken}`,
        },
      },
    }
  );
}
```

### 2.2 Nouveaux endpoints d'authentification

#### Endpoint de session

```typescript
// app/api/auth/session/route.ts
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
```

#### Endpoint de refresh

```typescript
// app/api/auth/refresh/route.ts
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
        id: user.id,
        email: user.email,
        email_verified: user.email_confirmed_at ? true : false,
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
```

### 2.3 Modification du client Supabase

#### Mise à jour de lib/supabase.ts

```typescript
// lib/supabase.ts
import { createClient } from "@supabase/supabase-js";
import { createServerClient } from "@supabase/ssr";
import { Database } from "./types/database";

if (!process.env.NEXT_PUBLIC_SUPABASE_URL) {
  throw new Error("Missing env.NEXT_PUBLIC_SUPABASE_URL");
}

if (!process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY) {
  throw new Error("Missing env.NEXT_PUBLIC_SUPABASE_ANON_KEY");
}

// Client pour les opérations côté navigateur
export const supabase = createClient<Database>(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
);

// Client côté serveur avec service role (pour migrations et admin)
export const createServerSupabaseClient = () => {
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  // Vérifier si on a une clé de service role valide
  if (
    !serviceRoleKey ||
    serviceRoleKey.startsWith("placeholder") ||
    !serviceRoleKey.startsWith("eyJ")
  ) {
    // Fallback vers la clé anon pour le développement
    return createClient<Database>(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
      {
        auth: {
          autoRefreshToken: false,
          persistSession: false,
        },
      }
    );
  }

  return createClient<Database>(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    serviceRoleKey,
    {
      auth: {
        autoRefreshToken: false,
        persistSession: false,
      },
    }
  );
};

// Nouveau: Client côté serveur avec contexte utilisateur (pour JWT auth)
export const createUserContextSupabaseClient = (accessToken: string) => {
  return createServerClient<Database>(
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
};
```

## 🔒 Phase 3: Configuration RLS

### 3.1 Activation progressive du RLS

#### Script SQL de migration RLS

```sql
-- migration_rls_jwt.sql
-- ⚠️  À exécuter dans Supabase SQL Editor

-- ÉTAPE 1: Préparer les données
-- Vérifier que tous les user_id sont des UUIDs valides
DO $$
DECLARE
    invalid_count INTEGER;
BEGIN
    -- Compter les user_id non-UUID dans boards
    SELECT COUNT(*) INTO invalid_count
    FROM boards
    WHERE user_id !~ '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$';

    IF invalid_count > 0 THEN
        RAISE EXCEPTION 'Found % invalid UUIDs in boards table. Please fix before migration.', invalid_count;
    END IF;

    -- Compter les user_id non-UUID dans check_ins
    SELECT COUNT(*) INTO invalid_count
    FROM check_ins
    WHERE user_id !~ '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$';

    IF invalid_count > 0 THEN
        RAISE EXCEPTION 'Found % invalid UUIDs in check_ins table. Please fix before migration.', invalid_count;
    END IF;

    RAISE NOTICE 'Data validation passed. All user_id are valid UUIDs.';
END $$;

-- ÉTAPE 2: Activer RLS sur toutes les tables
ALTER TABLE users ENABLE ROW LEVEL SECURITY;
ALTER TABLE boards ENABLE ROW LEVEL SECURITY;
ALTER TABLE check_ins ENABLE ROW LEVEL SECURITY;
-- Note: api_keys reste sans RLS pour la période de transition

-- ÉTAPE 3: Nettoyer les anciennes policies (si elles existent)
DROP POLICY IF EXISTS "Allow service role full access" ON users;
DROP POLICY IF EXISTS "Allow service role full access" ON boards;
DROP POLICY IF EXISTS "Allow service role full access" ON check_ins;
DROP POLICY IF EXISTS "Users can view own profile" ON users;
DROP POLICY IF EXISTS "Users can update own profile" ON users;
DROP POLICY IF EXISTS "Users can manage own boards" ON boards;
DROP POLICY IF EXISTS "Users can manage own check-ins" ON check_ins;

-- ÉTAPE 4: Créer les nouvelles policies JWT-compatible

-- Policies pour users
CREATE POLICY "Users can view own profile" ON users
  FOR SELECT
  USING (auth.uid()::text = id OR auth.role() = 'service_role');

CREATE POLICY "Users can update own profile" ON users
  FOR UPDATE
  USING (auth.uid()::text = id OR auth.role() = 'service_role')
  WITH CHECK (auth.uid()::text = id OR auth.role() = 'service_role');

CREATE POLICY "Service role can manage users" ON users
  FOR ALL
  USING (auth.role() = 'service_role')
  WITH CHECK (auth.role() = 'service_role');

-- Policies pour boards
CREATE POLICY "Users can view own boards" ON boards
  FOR SELECT
  USING (auth.uid()::text = user_id OR auth.role() = 'service_role');

CREATE POLICY "Users can create own boards" ON boards
  FOR INSERT
  WITH CHECK (auth.uid()::text = user_id OR auth.role() = 'service_role');

CREATE POLICY "Users can update own boards" ON boards
  FOR UPDATE
  USING (auth.uid()::text = user_id OR auth.role() = 'service_role')
  WITH CHECK (auth.uid()::text = user_id OR auth.role() = 'service_role');

CREATE POLICY "Users can delete own boards" ON boards
  FOR DELETE
  USING (auth.uid()::text = user_id OR auth.role() = 'service_role');

-- Policies pour check_ins
CREATE POLICY "Users can view own check-ins" ON check_ins
  FOR SELECT
  USING (auth.uid()::text = user_id OR auth.role() = 'service_role');

CREATE POLICY "Users can create own check-ins" ON check_ins
  FOR INSERT
  WITH CHECK (auth.uid()::text = user_id OR auth.role() = 'service_role');

CREATE POLICY "Users can update own check-ins" ON check_ins
  FOR UPDATE
  USING (auth.uid()::text = user_id OR auth.role() = 'service_role')
  WITH CHECK (auth.uid()::text = user_id OR auth.role() = 'service_role');

CREATE POLICY "Users can delete own check-ins" ON check_ins
  FOR DELETE
  USING (auth.uid()::text = user_id OR auth.role() = 'service_role');

-- ÉTAPE 5: Vérifier les policies créées
SELECT schemaname, tablename, policyname, permissive, roles, cmd, qual
FROM pg_policies
WHERE schemaname = 'public'
  AND tablename IN ('users', 'boards', 'check_ins')
ORDER BY tablename, policyname;

-- ÉTAPE 6: Test rapide des policies
-- (Ces requêtes doivent retourner 0 lignes car pas d'utilisateur authentifié)
SELECT COUNT(*) as should_be_zero_boards FROM boards;
SELECT COUNT(*) as should_be_zero_checkins FROM check_ins;

-- Message de succès
SELECT 'RLS migration completed successfully! 🎉' as status;
```

### 3.2 Vérification du RLS

#### Script de test RLS

```typescript
// scripts/test-rls.ts
import {
  createServerSupabaseClient,
  createUserContextSupabaseClient,
} from "../lib/supabase";

async function testRLS() {
  console.log("🔍 Testing RLS configuration...");

  // 1. Test avec service role (doit voir toutes les données)
  const adminClient = createServerSupabaseClient();
  const { data: adminBoards, error: adminError } = await adminClient
    .from("boards")
    .select("count");

  console.log("📊 Admin access (service role):", {
    count: adminBoards?.[0]?.count || 0,
    error: adminError?.message,
  });

  // 2. Test avec client anonyme (doit voir 0 lignes à cause du RLS)
  const anonClient = createUserContextSupabaseClient("fake-token");
  const { data: anonBoards, error: anonError } = await anonClient
    .from("boards")
    .select("count");

  console.log("🚫 Anonymous access (should fail):", {
    count: anonBoards?.length || 0,
    error: anonError?.message,
  });

  // 3. Test avec un vrai token JWT (nécessite un token valide)
  // const realToken = 'eyJ...' // Token d'un vrai utilisateur
  // const userClient = createUserContextSupabaseClient(realToken)
  // const { data: userBoards } = await userClient.from('boards').select('*')
  // console.log('✅ User access:', userBoards?.length)

  console.log("✅ RLS test completed");
}

// Exécuter: npx tsx scripts/test-rls.ts
testRLS().catch(console.error);
```

## 🔄 Phase 4: Migration des endpoints

### 4.1 Migration progressive des routes

#### Nouveau fichier de transition

```typescript
// lib/auth-transition.ts
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
```

#### Migration des boards

```typescript
// app/api/boards/route.ts
import { NextRequest, NextResponse } from "next/server";
import { withJWTAuth } from "@/lib/jwt-auth-middleware";
// import { withDualAuth } from '@/lib/auth-transition' // Pour migration progressive
import {
  validateRequest,
  createBoardSchema,
  ValidationError,
} from "@/lib/validation";

// GET /api/boards - Liste des boards de l'utilisateur
export const GET = withJWTAuth(async (context) => {
  try {
    const url = new URL(context.request?.url || "", `http://localhost:3000`);
    const include_archived =
      url.searchParams.get("include_archived") === "true";

    // 🎉 Plus besoin de filtrer par user_id - RLS le fait automatiquement !
    let query = context.supabase
      .from("boards")
      .select("*")
      .order("created_at", { ascending: false });

    // Filtrer les boards archivés si demandé
    if (!include_archived) {
      query = query.is("archived_at", null);
    }

    const { data: boards, error } = await query;

    if (error) {
      console.error("Boards list error:", error);
      return NextResponse.json(
        { error: "Failed to fetch boards" },
        { status: 500 }
      );
    }

    return NextResponse.json(boards);
  } catch (error) {
    console.error("Boards list error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
});

// POST /api/boards - Créer un nouveau board
export const POST = withJWTAuth(async (context) => {
  try {
    const body = await context.request!.json();
    const boardData = validateRequest(createBoardSchema, body);

    // 🎉 user_id automatiquement défini par RLS avec auth.uid()
    const { data: newBoard, error } = await context.supabase
      .from("boards")
      .insert({
        user_id: context.user.id, // Explicite pour la clarté, mais RLS le vérifie
        ...boardData,
      })
      .select()
      .single();

    if (error) {
      console.error("Board creation error:", error);
      return NextResponse.json(
        { error: "Failed to create board" },
        { status: 500 }
      );
    }

    return NextResponse.json(newBoard, { status: 201 });
  } catch (error) {
    if (error instanceof ValidationError) {
      return NextResponse.json(
        {
          error: "Validation failed",
          details: error.errors,
        },
        { status: 400 }
      );
    }

    console.error("Board creation error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
});
```

#### Migration des check-ins

```typescript
// app/api/check-ins/route.ts
import { NextRequest, NextResponse } from "next/server";
import { withJWTAuth } from "@/lib/jwt-auth-middleware";
import {
  validateRequest,
  createCheckInSchema,
  ValidationError,
} from "@/lib/validation";

// GET /api/check-ins - Liste des check-ins de l'utilisateur
export const GET = withJWTAuth(async (context) => {
  try {
    const url = new URL(context.request?.url || "", `http://localhost:3000`);
    const board_id = url.searchParams.get("board_id");
    const date_from = url.searchParams.get("date_from");
    const date_to = url.searchParams.get("date_to");

    // 🎉 Plus besoin de .eq('user_id', context.user.id) - RLS le fait !
    let query = context.supabase
      .from("check_ins")
      .select("*")
      .order("date", { ascending: false });

    // Filtres optionnels
    if (board_id) {
      query = query.eq("board_id", board_id);
    }
    if (date_from) {
      query = query.gte("date", date_from);
    }
    if (date_to) {
      query = query.lte("date", date_to);
    }

    const { data: checkIns, error } = await query;

    if (error) {
      console.error("Check-ins list error:", error);
      return NextResponse.json(
        { error: "Failed to fetch check-ins" },
        { status: 500 }
      );
    }

    return NextResponse.json(checkIns);
  } catch (error) {
    console.error("Check-ins list error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
});

// POST /api/check-ins - Créer un nouveau check-in
export const POST = withJWTAuth(async (context) => {
  try {
    const body = await context.request!.json();
    const checkInData = validateRequest(createCheckInSchema, body);

    const { data: newCheckIn, error } = await context.supabase
      .from("check_ins")
      .insert({
        user_id: context.user.id,
        ...checkInData,
      })
      .select()
      .single();

    if (error) {
      console.error("Check-in creation error:", error);
      return NextResponse.json(
        { error: "Failed to create check-in" },
        { status: 500 }
      );
    }

    return NextResponse.json(newCheckIn, { status: 201 });
  } catch (error) {
    if (error instanceof ValidationError) {
      return NextResponse.json(
        {
          error: "Validation failed",
          details: error.errors,
        },
        { status: 400 }
      );
    }

    console.error("Check-in creation error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
});
```

## 🧪 Phase 5: Tests

### 5.1 Tests d'intégration JWT

#### Test suite complète

```typescript
// tests/jwt-migration.test.ts
import { describe, test, expect, beforeAll, afterAll } from "@jest/globals";
import { createServerSupabaseClient } from "../lib/supabase";
import { validateJWT } from "../lib/jwt-auth-middleware";

describe("JWT Migration Tests", () => {
  let testUserId: string;
  let validAccessToken: string;
  let adminClient: any;

  beforeAll(async () => {
    adminClient = createServerSupabaseClient();

    // Créer un utilisateur de test
    const { data: authUser, error } = await adminClient.auth.admin.createUser({
      email: "test-migration@example.com",
      password: "test-password-123",
      email_confirm: true,
    });

    expect(error).toBeNull();
    testUserId = authUser.user.id;

    // Générer un token valide
    const { data: session } = await adminClient.auth.signInWithPassword({
      email: "test-migration@example.com",
      password: "test-password-123",
    });

    validAccessToken = session.session.access_token;
  });

  afterAll(async () => {
    // Nettoyer l'utilisateur de test
    await adminClient.auth.admin.deleteUser(testUserId);
  });

  describe("JWT Validation", () => {
    test("should validate valid JWT token", async () => {
      const mockRequest = new Request("http://localhost:3000/api/test", {
        headers: {
          Authorization: `Bearer ${validAccessToken}`,
        },
      });

      const context = await validateJWT(mockRequest as any);

      expect(context.user.id).toBe(testUserId);
      expect(context.user.email).toBe("test-migration@example.com");
      expect(context.session.access_token).toBe(validAccessToken);
    });

    test("should reject invalid JWT token", async () => {
      const mockRequest = new Request("http://localhost:3000/api/test", {
        headers: {
          Authorization: "Bearer invalid-token",
        },
      });

      await expect(validateJWT(mockRequest as any)).rejects.toThrow(
        "Invalid JWT token format"
      );
    });

    test("should reject missing authorization header", async () => {
      const mockRequest = new Request("http://localhost:3000/api/test");

      await expect(validateJWT(mockRequest as any)).rejects.toThrow(
        "Missing or invalid authorization header"
      );
    });
  });

  describe("RLS Integration", () => {
    test("should isolate user data with RLS", async () => {
      // Créer des données pour l'utilisateur de test
      const { error: boardError } = await adminClient.from("boards").insert({
        user_id: testUserId,
        name: "Test Board",
        description: "Test board for migration",
        color: "#22c55e",
      });

      expect(boardError).toBeNull();

      // Tester l'accès via JWT
      const mockRequest = new Request("http://localhost:3000/api/boards", {
        headers: {
          Authorization: `Bearer ${validAccessToken}`,
        },
      });

      const context = await validateJWT(mockRequest as any);

      // RLS doit permettre l'accès uniquement aux boards de cet utilisateur
      const { data: userBoards, error } = await context.supabase
        .from("boards")
        .select("*");

      expect(error).toBeNull();
      expect(userBoards).toHaveLength(1);
      expect(userBoards[0].user_id).toBe(testUserId);
    });
  });

  describe("API Endpoints", () => {
    test("GET /api/boards should work with JWT", async () => {
      const response = await fetch("http://localhost:3000/api/boards", {
        headers: {
          Authorization: `Bearer ${validAccessToken}`,
        },
      });

      expect(response.status).toBe(200);
      const boards = await response.json();
      expect(Array.isArray(boards)).toBe(true);
    });

    test("POST /api/boards should work with JWT", async () => {
      const response = await fetch("http://localhost:3000/api/boards", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${validAccessToken}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          name: "JWT Test Board",
          description: "Created via JWT auth",
          color: "#3b82f6",
        }),
      });

      expect(response.status).toBe(201);
      const board = await response.json();
      expect(board.name).toBe("JWT Test Board");
      expect(board.user_id).toBe(testUserId);
    });
  });

  describe("Session Management", () => {
    test("POST /api/auth/session should validate token", async () => {
      const response = await fetch("http://localhost:3000/api/auth/session", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          access_token: validAccessToken,
        }),
      });

      expect(response.status).toBe(200);
      const session = await response.json();
      expect(session.user.id).toBe(testUserId);
      expect(session.message).toBe("Session valid");
    });
  });
});
```

### 5.2 Script de test manuel

#### Tests d'acceptation

```bash
#!/bin/bash
# test-migration.sh - Script de test manuel

echo "🧪 Testing JWT Migration..."

# Configuration
API_BASE="http://localhost:3000"
TEST_EMAIL="migration-test@example.com"

# Couleurs pour output
GREEN='\033[0;32m'
RED='\033[0;31m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Fonction de test
test_endpoint() {
    local name="$1"
    local method="$2"
    local endpoint="$3"
    local headers="$4"
    local data="$5"
    local expected_status="$6"

    echo -n "Testing $name... "

    if [ "$method" = "GET" ]; then
        response=$(curl -s -w "HTTPSTATUS:%{http_code}" $headers "$API_BASE$endpoint")
    else
        response=$(curl -s -w "HTTPSTATUS:%{http_code}" -X $method $headers -d "$data" "$API_BASE$endpoint")
    fi

    http_status=$(echo $response | grep -o "HTTPSTATUS:[0-9]*" | cut -d: -f2)
    body=$(echo $response | sed 's/HTTPSTATUS:[0-9]*$//')

    if [ "$http_status" = "$expected_status" ]; then
        echo -e "${GREEN}✅ PASS${NC} (Status: $http_status)"
        return 0
    else
        echo -e "${RED}❌ FAIL${NC} (Expected: $expected_status, Got: $http_status)"
        echo "Response: $body"
        return 1
    fi
}

echo "📧 Step 1: Request magic link"
test_endpoint "Magic Link Request" "POST" "/api/auth/magic-link" \
    "-H 'Content-Type: application/json'" \
    "{\"email\":\"$TEST_EMAIL\"}" \
    "200"

echo ""
echo "⚠️  Please check your email and click the magic link, then provide the access token:"
read -p "Access Token: " ACCESS_TOKEN

if [ -z "$ACCESS_TOKEN" ]; then
    echo -e "${RED}❌ No access token provided. Exiting.${NC}"
    exit 1
fi

echo ""
echo "🔑 Step 2: Test JWT authentication"
AUTH_HEADER="-H 'Authorization: Bearer $ACCESS_TOKEN'"

test_endpoint "Session Validation" "POST" "/api/auth/session" \
    "-H 'Content-Type: application/json' $AUTH_HEADER" \
    "{\"access_token\":\"$ACCESS_TOKEN\"}" \
    "200"

echo ""
echo "📋 Step 3: Test API endpoints with JWT"

test_endpoint "Get Boards" "GET" "/api/boards" \
    "$AUTH_HEADER" \
    "" \
    "200"

test_endpoint "Create Board" "POST" "/api/boards" \
    "-H 'Content-Type: application/json' $AUTH_HEADER" \
    "{\"name\":\"Migration Test Board\",\"description\":\"Created during migration test\",\"color\":\"#22c55e\",\"icon\":\"🧪\"}" \
    "201"

test_endpoint "Get Check-ins" "GET" "/api/check-ins" \
    "$AUTH_HEADER" \
    "" \
    "200"

echo ""
echo "🔒 Step 4: Test security"

test_endpoint "No Auth Header" "GET" "/api/boards" \
    "" \
    "" \
    "401"

test_endpoint "Invalid Token" "GET" "/api/boards" \
    "-H 'Authorization: Bearer invalid-token'" \
    "" \
    "401"

echo ""
echo "✅ Migration tests completed!"
```

## 🚀 Phase 6: Déploiement

### 6.1 Stratégie de déploiement

#### Déploiement progressif

```bash
# deployment-checklist.sh
#!/bin/bash

echo "🚀 JWT Migration Deployment Checklist"

# 1. Pre-deployment checks
echo "□ 1. Database backup created"
echo "□ 2. RLS policies tested in staging"
echo "□ 3. JWT endpoints tested"
echo "□ 4. Migration tests passing"
echo "□ 5. Rollback plan documented"

# 2. Deployment steps
echo ""
echo "Deployment Steps:"
echo "1. Deploy code with dual auth support"
echo "2. Run RLS migration in production"
echo "3. Test both auth methods work"
echo "4. Monitor error rates"
echo "5. Gradually migrate clients"

# 3. Post-deployment monitoring
echo ""
echo "Monitoring Commands:"
echo "# Check error rates"
echo "curl -s $API_BASE/api/debug/health | jq '.auth_methods'"

echo "# Test both auth methods"
echo "curl -s -H 'Authorization: Bearer OLD_API_KEY' $API_BASE/api/boards"
echo "curl -s -H 'Authorization: Bearer JWT_TOKEN' $API_BASE/api/boards"
```

### 6.2 Configuration production

#### Variables d'environnement

```bash
# .env.production
NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJ...your-anon-key
SUPABASE_SERVICE_ROLE_KEY=eyJ...your-service-role-key

# Nouveau: Configuration JWT
JWT_ALGORITHM=HS256
JWT_ISSUER=https://your-project.supabase.co/auth/v1
JWT_AUDIENCE=authenticated

# Monitoring
ENABLE_AUTH_METRICS=true
AUTH_ERROR_WEBHOOK=https://your-monitoring.com/webhook
```

#### Monitoring et alertes

```typescript
// lib/monitoring.ts
export class AuthMetrics {
  static async logAuthAttempt(
    method: "jwt" | "api_key",
    success: boolean,
    userId?: string
  ) {
    if (!process.env.ENABLE_AUTH_METRICS) return;

    const metrics = {
      timestamp: new Date().toISOString(),
      auth_method: method,
      success,
      user_id: userId,
      environment: process.env.NODE_ENV,
    };

    // Log vers votre système de monitoring
    console.log("AUTH_METRIC:", JSON.stringify(metrics));

    // Webhook optionnel pour alertes
    if (!success && process.env.AUTH_ERROR_WEBHOOK) {
      fetch(process.env.AUTH_ERROR_WEBHOOK, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(metrics),
      }).catch(console.error);
    }
  }
}
```

## 👥 Phase 7: Migration des clients

### 7.1 Guide pour extensions Raycast

#### Documentation Raycast

````markdown
# Migration Guide: Raycast Extension

## Nouvelle authentification JWT

### 1. Installation des dépendances

Aucune nouvelle dépendance requise - JWT supporté nativement.

### 2. Nouvelle configuration

```typescript
// src/config.ts
export const API_CONFIG = {
  baseUrl: "https://your-habit-api.com",
  auth: {
    type: "jwt", // Changé de 'api-key' à 'jwt'
    tokenEndpoint: "/api/auth/session",
    refreshEndpoint: "/api/auth/refresh",
  },
};
```
````

### 3. Nouveau flow d'authentification

```typescript
// src/auth.ts
import { getPreferenceValues, showToast, Toast, open } from "@raycast/api";

interface Preferences {
  email: string;
  accessToken?: string;
  refreshToken?: string;
}

export async function authenticate() {
  const { email } = getPreferenceValues<Preferences>();

  if (!email) {
    throw new Error("Email requis dans les préférences");
  }

  // 1. Demander magic link
  const response = await fetch(`${API_CONFIG.baseUrl}/api/auth/magic-link`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ email }),
  });

  if (!response.ok) {
    throw new Error("Erreur lors de l'envoi du magic link");
  }

  // 2. Guider l'utilisateur
  await showToast({
    style: Toast.Style.Success,
    title: "Magic link envoyé!",
    message: "Vérifiez votre email et revenez ici.",
  });

  // 3. Attendre le token (interface simplifiée)
  const accessToken = await promptForToken();

  // 4. Valider et sauvegarder
  await validateAndSaveToken(accessToken);
}

export async function makeAuthenticatedRequest(
  endpoint: string,
  options: RequestInit = {}
) {
  let { accessToken, refreshToken } = getPreferenceValues<Preferences>();

  const makeRequest = async (token: string) => {
    return fetch(`${API_CONFIG.baseUrl}${endpoint}`, {
      ...options,
      headers: {
        Authorization: `Bearer ${token}`,
        "Content-Type": "application/json",
        ...options.headers,
      },
    });
  };

  let response = await makeRequest(accessToken!);

  // Auto-refresh si token expiré
  if (response.status === 401 && refreshToken) {
    const newToken = await refreshAccessToken(refreshToken);
    if (newToken) {
      response = await makeRequest(newToken);
    }
  }

  return response;
}
```

### 4. Migration des commandes existantes

```typescript
// Avant (API key)
const response = await fetch(`${API_BASE}/api/boards`, {
  headers: {
    Authorization: `Bearer ${apiKey}`,
  },
});

// Après (JWT)
const response = await makeAuthenticatedRequest("/api/boards");
```

### 5. Gestion des erreurs

```typescript
export async function handleAuthError(error: Error) {
  if (error.message.includes("Invalid or expired")) {
    await showToast({
      style: Toast.Style.Failure,
      title: "Session expirée",
      message: "Veuillez vous reconnecter",
    });
    await authenticate();
  } else {
    await showToast({
      style: Toast.Style.Failure,
      title: "Erreur d'authentification",
      message: error.message,
    });
  }
}
```

````

### 7.2 Guide pour serveurs MCP

#### Documentation MCP
```markdown
# Migration Guide: MCP Server

## Configuration JWT pour MCP

### 1. Nouvelle structure de configuration

```json
{
  "mcpServers": {
    "habit-tracker": {
      "command": "node",
      "args": ["path/to/habit-tracker-mcp"],
      "env": {
        "HABIT_API_URL": "https://your-habit-api.com",
        "AUTH_METHOD": "jwt",
        "USER_EMAIL": "your-email@domain.com"
      }
    }
  }
}
````

### 2. Nouveau client d'authentification

```typescript
// src/auth-client.ts
interface AuthConfig {
  apiUrl: string;
  email: string;
  tokenStorage: string; // Chemin vers fichier de tokens
}

export class JWTAuthClient {
  private accessToken?: string;
  private refreshToken?: string;

  constructor(private config: AuthConfig) {
    this.loadTokens();
  }

  async authenticate(): Promise<void> {
    // 1. Magic link request
    const response = await fetch(`${this.config.apiUrl}/api/auth/magic-link`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email: this.config.email }),
    });

    if (!response.ok) {
      throw new Error("Failed to request magic link");
    }

    // 2. Instructions pour l'utilisateur
    console.log("🔗 Magic link sent to your email");
    console.log("📧 Please check your email and click the link");
    console.log("🔄 The authentication will complete automatically");

    // 3. Polling ou callback URL handling
    await this.waitForAuthentication();
  }

  async makeRequest(
    endpoint: string,
    options: RequestInit = {}
  ): Promise<Response> {
    if (!this.accessToken) {
      await this.authenticate();
    }

    const response = await fetch(`${this.config.apiUrl}${endpoint}`, {
      ...options,
      headers: {
        Authorization: `Bearer ${this.accessToken}`,
        "Content-Type": "application/json",
        ...options.headers,
      },
    });

    // Auto-refresh sur 401
    if (response.status === 401) {
      await this.refreshTokens();
      return this.makeRequest(endpoint, options);
    }

    return response;
  }

  private async refreshTokens(): Promise<void> {
    if (!this.refreshToken) {
      throw new Error("No refresh token available");
    }

    const response = await fetch(`${this.config.apiUrl}/api/auth/refresh`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ refresh_token: this.refreshToken }),
    });

    if (!response.ok) {
      throw new Error("Token refresh failed");
    }

    const tokens = await response.json();
    this.accessToken = tokens.access_token;
    this.refreshToken = tokens.refresh_token;

    this.saveTokens();
  }

  private loadTokens(): void {
    try {
      const data = JSON.parse(
        fs.readFileSync(this.config.tokenStorage, "utf8")
      );
      this.accessToken = data.access_token;
      this.refreshToken = data.refresh_token;
    } catch {
      // Pas de tokens sauvegardés
    }
  }

  private saveTokens(): void {
    const data = {
      access_token: this.accessToken,
      refresh_token: this.refreshToken,
      updated_at: new Date().toISOString(),
    };

    fs.writeFileSync(this.config.tokenStorage, JSON.stringify(data, null, 2));
  }
}
```

### 3. Intégration dans le serveur MCP

```typescript
// src/index.ts
import { JWTAuthClient } from "./auth-client";

const authClient = new JWTAuthClient({
  apiUrl: process.env.HABIT_API_URL!,
  email: process.env.USER_EMAIL!,
  tokenStorage: path.join(__dirname, ".tokens.json"),
});

// Wrapper pour toutes les requêtes API
async function apiRequest(endpoint: string, options?: RequestInit) {
  try {
    return await authClient.makeRequest(endpoint, options);
  } catch (error) {
    if (error.message.includes("authentication")) {
      console.log("🔄 Re-authenticating...");
      await authClient.authenticate();
      return await authClient.makeRequest(endpoint, options);
    }
    throw error;
  }
}

// Utilisation dans les handlers MCP
server.setRequestHandler(ListResourcesRequestSchema, async () => {
  const response = await apiRequest("/api/boards");
  const boards = await response.json();

  return {
    resources: boards.map((board) => ({
      uri: `habit://board/${board.id}`,
      name: board.name,
      description: board.description,
    })),
  };
});
```

````

## 🗑️ Phase 8: Nettoyage

### 8.1 Suppression du code legacy

#### Script de nettoyage progressif
```bash
#!/bin/bash
# cleanup-legacy.sh

echo "🧹 Cleaning up legacy API key system..."

# 1. Vérifier que tous les clients sont migrés
echo "📊 Checking API usage patterns..."

# Analyser les logs pour vérifier l'utilisation des API keys
# (Commande adaptée selon votre système de logs)
echo "Recent API key usage:"
grep "API key auth" logs/*.log | tail -10

echo ""
read -p "Are you sure all clients have migrated to JWT? (y/N): " confirm

if [ "$confirm" != "y" ]; then
    echo "❌ Cleanup cancelled. Please ensure all clients are migrated first."
    exit 1
fi

# 2. Backup avant suppression
echo "💾 Creating final backup..."
timestamp=$(date +%Y%m%d_%H%M%S)
backup_dir="./backups/final_cleanup_$timestamp"
mkdir -p "$backup_dir"

# Backup de la table api_keys
echo "Backing up api_keys table..."
# Via Supabase CLI ou SQL export

# 3. Supprimer les fichiers de code legacy
echo "🗑️  Removing legacy files..."

# Renommer au lieu de supprimer (sécurité)
if [ -f "lib/auth-middleware.ts" ]; then
    mv lib/auth-middleware.ts "$backup_dir/auth-middleware.ts.bak"
    echo "✅ Moved lib/auth-middleware.ts to backup"
fi

if [ -f "app/api/auth/verify/route.ts" ]; then
    mv app/api/auth/verify/route.ts "$backup_dir/verify-route.ts.bak"
    echo "✅ Moved verify route to backup"
fi

# 4. Nettoyer les types
echo "🔧 Updating type definitions..."
# Supprimer les types liés aux API keys de validation.ts

echo "✅ Legacy code cleanup completed!"
echo "📁 Backups saved in: $backup_dir"
````

### 8.2 Suppression de la table api_keys

#### Script SQL de nettoyage final

```sql
-- cleanup_api_keys.sql
-- ⚠️  À exécuter SEULEMENT après migration complète de tous les clients

-- ÉTAPE 1: Vérification finale
DO $$
DECLARE
    api_key_count INTEGER;
    recent_usage_count INTEGER;
BEGIN
    -- Compter les API keys existantes
    SELECT COUNT(*) INTO api_key_count FROM api_keys;

    -- Vérifier l'usage récent (si vous avez des logs)
    -- SELECT COUNT(*) INTO recent_usage_count FROM api_usage_logs
    -- WHERE created_at > NOW() - INTERVAL '7 days' AND auth_method = 'api_key';

    RAISE NOTICE 'Found % API keys in database', api_key_count;
    -- RAISE NOTICE 'Found % recent API key usages', recent_usage_count;

    IF api_key_count > 0 THEN
        RAISE NOTICE 'API keys still exist. Ensure all clients are migrated before cleanup.';
    END IF;
END $$;

-- ÉTAPE 2: Backup final de la table
-- Créer une table de backup
CREATE TABLE api_keys_backup AS SELECT * FROM api_keys;

-- Ajouter metadata du backup
ALTER TABLE api_keys_backup ADD COLUMN backup_created_at TIMESTAMP DEFAULT NOW();

-- ÉTAPE 3: Supprimer la table api_keys (décommenter quand prêt)
-- DROP TABLE IF EXISTS api_keys;

-- ÉTAPE 4: Nettoyer les policies
DROP POLICY IF EXISTS "Service role can manage api_keys" ON api_keys;

-- ÉTAPE 5: Vérification finale
SELECT 'Cleanup completed successfully! 🎉' as status;

-- ÉTAPE 6: Optimisation post-nettoyage
VACUUM ANALYZE;
```

## 🔄 Rollback Plan

### En cas de problème critique

#### Rollback automatique

```bash
#!/bin/bash
# rollback.sh - Plan de rollback d'urgence

echo "🚨 EMERGENCY ROLLBACK: JWT Migration"

# 1. Désactiver RLS immédiatement
echo "⚡ Disabling RLS..."
psql "$DATABASE_URL" << 'EOF'
ALTER TABLE users DISABLE ROW LEVEL SECURITY;
ALTER TABLE boards DISABLE ROW LEVEL SECURITY;
ALTER TABLE check_ins DISABLE ROW LEVEL SECURITY;
EOF

# 2. Restaurer les fichiers de code
echo "📁 Restoring legacy code..."
if [ -f "backups/auth-middleware.ts.bak" ]; then
    cp backups/auth-middleware.ts.bak lib/auth-middleware.ts
fi

# 3. Redéployer la version précédente
echo "🚀 Redeploying previous version..."
git checkout HEAD~1 -- lib/ app/api/
npm run build
npm run deploy

# 4. Vérifier que l'API fonctionne
echo "✅ Testing API with legacy auth..."
curl -f -H "Authorization: Bearer $LEGACY_API_KEY" "$API_URL/api/boards"

if [ $? -eq 0 ]; then
    echo "✅ Rollback successful!"
else
    echo "❌ Rollback failed! Manual intervention required."
fi
```

#### Checklist de rollback

```markdown
## 🚨 Rollback Checklist

### Immediate Actions (< 5 minutes)

- [ ] Disable RLS in database
- [ ] Revert to previous deployment
- [ ] Restore API key authentication
- [ ] Verify API functionality

### Communication

- [ ] Notify stakeholders
- [ ] Update status page
- [ ] Document incident

### Investigation

- [ ] Identify root cause
- [ ] Review logs and metrics
- [ ] Plan fix or retry strategy
```

## ❓ FAQ

### Questions fréquentes sur la migration

#### Q: Pourquoi migrer des API keys vers JWT ?

**R:** Les API keys sont statiques et difficiles à gérer (pas d'expiration, pas de scopes). JWT offre:

- ✅ Expiration automatique
- ✅ Standards OAuth
- ✅ RLS natif Supabase
- ✅ Meilleure sécurité

#### Q: Les clients existants continueront-ils à fonctionner ?

**R:** Oui, pendant la période de transition (dual auth). Planifiez 2-4 semaines pour migrer tous les clients.

#### Q: Que se passe-t-il si un token JWT expire ?

**R:** Le client reçoit une 401, utilise son refresh token pour obtenir un nouveau access token automatiquement.

#### Q: RLS va-t-il impacter les performances ?

**R:** Impact minimal. RLS est optimisé par PostgreSQL et simplifie votre code applicatif.

#### Q: Comment gérer les tokens dans Raycast ?

**R:** Raycast supporte nativement OAuth/JWT. Utilisez les préférences pour stocker les tokens de manière sécurisée.

#### Q: Peut-on rollback en cas de problème ?

**R:** Oui, plan de rollback complet fourni. Désactivation RLS + restauration code legacy en < 5 minutes.

#### Q: Comment monitorer la migration ?

**R:** Logs d'authentification, métriques par méthode (JWT vs API key), alertes sur échecs d'auth.

#### Q: Les données existantes sont-elles compatibles ?

**R:** Oui, aucune modification de schéma requise. Seule l'authentification change.

---

## 📞 Support et assistance

### Contacts en cas de problème

- **Développeur principal** : [Votre contact]
- **Infrastructure** : [Contact DevOps]
- **Documentation** : Ce guide + `/docs/api`

### Ressources utiles

- [Supabase Auth Documentation](https://supabase.com/docs/guides/auth)
- [JWT.io Debugger](https://jwt.io/)
- [Raycast Extensions Guide](https://developers.raycast.com/)

---

**Date de création** : [Date]
**Version** : 1.0
**Prochaine révision** : Post-migration

🎉 **Bonne migration !**
