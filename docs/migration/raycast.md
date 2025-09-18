# Raycast Extension Migration Guide

Guide complet pour migrer les extensions Raycast vers l'authentification JWT.

## Vue d'ensemble de la migration

### Ancien système (API Keys)
```typescript
// Configuration actuelle
const API_KEY = "bc529961369183feb7eff2c5e3699ba7";
const headers = {
  "Authorization": `Bearer ${API_KEY}`,
  "Content-Type": "application/json"
};
```

### Nouveau système (JWT)
```typescript
// Nouvelle configuration
const JWT_TOKEN = await getStoredJWTToken();
const headers = {
  "Authorization": `Bearer ${JWT_TOKEN}`,
  "Content-Type": "application/json"
};
```

## Migration step-by-step

### Étape 1: Installation des dépendances

```bash
npm install @raycast/utils
```

### Étape 2: Configuration de l'authentification

Créez un nouveau fichier `src/lib/auth.ts`:

```typescript
import { LocalStorage, showToast, Toast } from "@raycast/api";
import { useMemo } from "react";

const API_BASE_URL = "https://your-api.vercel.app";

export interface AuthTokens {
  access_token: string;
  refresh_token: string;
  expires_at: number;
}

// Stockage sécurisé des tokens
export async function storeTokens(tokens: AuthTokens): Promise<void> {
  await LocalStorage.setItem("auth_tokens", JSON.stringify(tokens));
}

export async function getStoredTokens(): Promise<AuthTokens | null> {
  try {
    const stored = await LocalStorage.getItem("auth_tokens");
    if (typeof stored === "string") {
      const tokens = JSON.parse(stored);

      // Vérifier si le token n'est pas expiré
      if (tokens.expires_at && Date.now() < tokens.expires_at * 1000) {
        return tokens;
      }

      // Token expiré, tenter le refresh
      return await refreshTokens(tokens.refresh_token);
    }
  } catch (error) {
    console.error("Error getting stored tokens:", error);
  }
  return null;
}

export async function refreshTokens(refreshToken: string): Promise<AuthTokens | null> {
  try {
    const response = await fetch(`${API_BASE_URL}/api/auth/refresh`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        refresh_token: refreshToken,
      }),
    });

    if (response.ok) {
      const tokens = await response.json();
      await storeTokens(tokens);
      return tokens;
    }
  } catch (error) {
    console.error("Error refreshing tokens:", error);
  }

  // Échec du refresh, supprimer les tokens invalides
  await LocalStorage.removeItem("auth_tokens");
  return null;
}

export async function clearTokens(): Promise<void> {
  await LocalStorage.removeItem("auth_tokens");
}

// Hook pour l'authentification
export function useAuth() {
  return useMemo(async () => {
    const tokens = await getStoredTokens();
    return {
      isAuthenticated: !!tokens,
      tokens,
    };
  }, []);
}
```

### Étape 3: Configuration du magic link

Créez `src/lib/magic-link.ts`:

```typescript
import { showToast, Toast, open } from "@raycast/api";

const API_BASE_URL = "https://your-api.vercel.app";

export async function requestMagicLink(email: string): Promise<boolean> {
  try {
    showToast({
      style: Toast.Style.Animated,
      title: "Sending magic link...",
    });

    const response = await fetch(`${API_BASE_URL}/api/auth/magic-link`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ email }),
    });

    if (response.ok) {
      showToast({
        style: Toast.Style.Success,
        title: "Magic link sent!",
        message: "Check your email and click the link to authenticate.",
      });

      // Ouvrir l'email par défaut
      await open("mailto:");

      return true;
    } else {
      const error = await response.json();
      throw new Error(error.error || "Failed to send magic link");
    }
  } catch (error) {
    showToast({
      style: Toast.Style.Failure,
      title: "Failed to send magic link",
      message: error instanceof Error ? error.message : "Unknown error",
    });
    return false;
  }
}

// Fonction pour gérer la réponse du magic link
export async function handleMagicLinkCallback(callbackUrl: string): Promise<boolean> {
  try {
    // Extraire les tokens de l'URL de callback
    const url = new URL(callbackUrl);
    const accessToken = url.searchParams.get("access_token");
    const refreshToken = url.searchParams.get("refresh_token");
    const expiresAt = url.searchParams.get("expires_at");

    if (accessToken && refreshToken && expiresAt) {
      const tokens = {
        access_token: accessToken,
        refresh_token: refreshToken,
        expires_at: parseInt(expiresAt, 10),
      };

      await storeTokens(tokens);

      showToast({
        style: Toast.Style.Success,
        title: "Authentication successful!",
      });

      return true;
    } else {
      throw new Error("Invalid callback URL");
    }
  } catch (error) {
    showToast({
      style: Toast.Style.Failure,
      title: "Authentication failed",
      message: error instanceof Error ? error.message : "Unknown error",
    });
    return false;
  }
}
```

### Étape 4: Client API avec authentification automatique

Créez `src/lib/api-client.ts`:

```typescript
import { showToast, Toast } from "@raycast/api";
import { getStoredTokens, refreshTokens } from "./auth";

const API_BASE_URL = "https://your-api.vercel.app";

export class APIClient {
  private async getAuthHeaders(): Promise<Record<string, string>> {
    const tokens = await getStoredTokens();

    if (!tokens) {
      throw new Error("Not authenticated");
    }

    return {
      "Authorization": `Bearer ${tokens.access_token}`,
      "Content-Type": "application/json",
    };
  }

  private async makeRequest<T>(
    endpoint: string,
    options: RequestInit = {}
  ): Promise<T> {
    try {
      const headers = await this.getAuthHeaders();

      const response = await fetch(`${API_BASE_URL}${endpoint}`, {
        ...options,
        headers: {
          ...headers,
          ...options.headers,
        },
      });

      if (response.status === 401) {
        // Token expiré, essayer de le rafraîchir
        const tokens = await getStoredTokens();
        if (tokens?.refresh_token) {
          const newTokens = await refreshTokens(tokens.refresh_token);
          if (newTokens) {
            // Réessayer avec le nouveau token
            const newHeaders = {
              "Authorization": `Bearer ${newTokens.access_token}`,
              "Content-Type": "application/json",
            };

            const retryResponse = await fetch(`${API_BASE_URL}${endpoint}`, {
              ...options,
              headers: {
                ...newHeaders,
                ...options.headers,
              },
            });

            if (retryResponse.ok) {
              return await retryResponse.json();
            }
          }
        }

        throw new Error("Authentication failed");
      }

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || `HTTP ${response.status}`);
      }

      return await response.json();
    } catch (error) {
      if (error instanceof Error && error.message === "Not authenticated") {
        showToast({
          style: Toast.Style.Failure,
          title: "Not authenticated",
          message: "Please authenticate first",
        });
      }
      throw error;
    }
  }

  // API methods
  async getBoards() {
    return this.makeRequest<Board[]>("/api/boards");
  }

  async createBoard(board: CreateBoardData) {
    return this.makeRequest<Board>("/api/boards", {
      method: "POST",
      body: JSON.stringify(board),
    });
  }

  async createCheckIn(checkIn: CreateCheckInData) {
    return this.makeRequest<CheckIn>("/api/check-ins", {
      method: "POST",
      body: JSON.stringify(checkIn),
    });
  }

  async getCheckIns(boardId?: string) {
    const params = boardId ? `?board_id=${boardId}` : "";
    return this.makeRequest<CheckIn[]>(`/api/check-ins${params}`);
  }
}

// Instance singleton
export const apiClient = new APIClient();

// Types
export interface Board {
  id: string;
  name: string;
  description: string;
  color: string;
  icon: string;
  created_at: string;
  updated_at: string;
  archived_at: string | null;
}

export interface CheckIn {
  id: string;
  board_id: string;
  user_id: string;
  date: string;
  completed: boolean;
  notes: string;
  created_at: string;
  updated_at: string;
}

export interface CreateBoardData {
  name: string;
  description?: string;
  color?: string;
  icon?: string;
}

export interface CreateCheckInData {
  board_id: string;
  date: string;
  completed: boolean;
  notes?: string;
}
```

### Étape 5: Commande d'authentification

Créez `src/authenticate.tsx`:

```typescript
import { Action, ActionPanel, Form, showToast, Toast } from "@raycast/api";
import { useState } from "react";
import { requestMagicLink } from "./lib/magic-link";

export default function Authenticate() {
  const [email, setEmail] = useState("");
  const [isLoading, setIsLoading] = useState(false);

  async function handleSubmit() {
    if (!email) {
      showToast({
        style: Toast.Style.Failure,
        title: "Email required",
      });
      return;
    }

    setIsLoading(true);
    const success = await requestMagicLink(email);
    setIsLoading(false);

    if (success) {
      // L'utilisateur doit maintenant cliquer sur le lien dans son email
      showToast({
        style: Toast.Style.Success,
        title: "Next step",
        message: "Click the link in your email to complete authentication",
      });
    }
  }

  return (
    <Form
      isLoading={isLoading}
      actions={
        <ActionPanel>
          <Action.SubmitForm
            title="Send Magic Link"
            onSubmit={handleSubmit}
          />
        </ActionPanel>
      }
    >
      <Form.TextField
        id="email"
        title="Email"
        placeholder="Enter your email address"
        value={email}
        onChange={setEmail}
      />
      <Form.Description text="We'll send you a magic link to authenticate with your Habit Tracker account." />
    </Form>
  );
}
```

### Étape 6: Migration des commandes existantes

Modifiez vos commandes existantes pour utiliser le nouveau client:

```typescript
// Avant (API Key)
import { getPreferenceValues } from "@raycast/api";

const preferences = getPreferenceValues<{ apiKey: string }>();
const headers = {
  "Authorization": `Bearer ${preferences.apiKey}`,
  "Content-Type": "application/json",
};

// Après (JWT)
import { apiClient } from "./lib/api-client";
import { useAuth } from "./lib/auth";

export default function CreateHabit() {
  const { isAuthenticated } = useAuth();

  if (!isAuthenticated) {
    return <AuthenticationRequired />;
  }

  // Utiliser apiClient au lieu de fetch direct
  const boards = await apiClient.getBoards();

  // ... rest of component
}
```

### Étape 7: Gestion des erreurs d'authentification

Créez un composant pour les cas non authentifiés:

```typescript
// src/components/AuthenticationRequired.tsx
import { Action, ActionPanel, Detail } from "@raycast/api";

export function AuthenticationRequired() {
  return (
    <Detail
      markdown="# Authentication Required\n\nYou need to authenticate with your Habit Tracker account to use this extension."
      actions={
        <ActionPanel>
          <Action.Open
            title="Authenticate"
            target="raycast://extensions/your-extension/authenticate"
          />
        </ActionPanel>
      }
    />
  );
}
```

## Migration des préférences

### Supprimer les préférences API Key

Dans `package.json`, supprimez les préférences API key:

```json
{
  "preferences": [
    // Supprimer cette section
    // {
    //   "name": "apiKey",
    //   "type": "password",
    //   "required": true,
    //   "title": "API Key",
    //   "description": "Your Habit Tracker API key"
    // }
  ]
}
```

## Tests de migration

### Script de test

```typescript
// src/test-migration.ts
import { apiClient } from "./lib/api-client";
import { getStoredTokens } from "./lib/auth";

export async function testMigration() {
  try {
    // Vérifier l'authentification
    const tokens = await getStoredTokens();
    console.log("Authentication:", tokens ? "✅ Valid" : "❌ Missing");

    // Tester les endpoints
    const boards = await apiClient.getBoards();
    console.log("Boards API:", boards.length > 0 ? "✅ Working" : "⚠️ Empty");

    const checkIns = await apiClient.getCheckIns();
    console.log("Check-ins API:", checkIns.length >= 0 ? "✅ Working" : "❌ Failed");

    return true;
  } catch (error) {
    console.error("Migration test failed:", error);
    return false;
  }
}
```

## Déploiement

### Checklist de migration

- [ ] Nouveau système d'auth implémenté
- [ ] Commandes migrées vers JWT
- [ ] Tests passent avec JWT
- [ ] Documentation utilisateur mise à jour
- [ ] Préférences API key supprimées
- [ ] Version publiée sur Raycast Store

### Communication utilisateurs

Préparez un message pour les utilisateurs:

```markdown
## 🔐 Nouvelle authentification pour Habit Tracker

Nous avons migré vers un système d'authentification plus sécurisé avec des liens magiques.

**Que faire:**
1. Mettre à jour l'extension Raycast
2. Utiliser la commande "Authenticate"
3. Cliquer sur le lien reçu par email

**Plus besoin de:**
- Gérer les clés API
- Copier/coller des tokens
- Se souvenir des mots de passe

L'authentification est maintenant automatique et sécurisée!
```

## Rollback

En cas de problème, gardez une version compatible API key:

```typescript
// Version de fallback avec double support
const API_KEY_FALLBACK = "bc529961369183feb7eff2c5e3699ba7";

async function makeAuthenticatedRequest(endpoint: string, options: RequestInit = {}) {
  try {
    // Essayer JWT d'abord
    return await apiClient.makeRequest(endpoint, options);
  } catch (error) {
    // Fallback sur API key
    console.warn("JWT failed, falling back to API key");
    return await fetch(`${API_BASE_URL}${endpoint}`, {
      ...options,
      headers: {
        "Authorization": `Bearer ${API_KEY_FALLBACK}`,
        "Content-Type": "application/json",
        ...options.headers,
      },
    });
  }
}
```

## Support et dépannage

### Problèmes courants

1. **Token expiré**: Le refresh automatique devrait gérer cela
2. **Email non reçu**: Vérifier les spams, réessayer
3. **Callback invalide**: Vérifier l'URL de redirection

### Debug

Activez les logs de débogage:

```typescript
if (process.env.NODE_ENV === "development") {
  console.log("Auth tokens:", await getStoredTokens());
  console.log("API request:", endpoint, options);
}
```

Cette migration garantit une expérience utilisateur fluide avec une sécurité renforcée.