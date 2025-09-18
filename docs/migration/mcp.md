# MCP Server Migration Guide

Guide complet pour migrer les serveurs MCP (Model Context Protocol) vers l'authentification JWT.

## Vue d'ensemble de la migration

### Ancien système (API Keys)
```typescript
// Configuration actuelle
const API_KEY = process.env.HABIT_API_KEY;
const headers = {
  "Authorization": `Bearer ${API_KEY}`,
  "Content-Type": "application/json"
};
```

### Nouveau système (JWT)
```typescript
// Nouvelle configuration
const tokens = await mcpAuthClient.getValidTokens();
const headers = {
  "Authorization": `Bearer ${tokens.access_token}`,
  "Content-Type": "application/json"
};
```

## Migration step-by-step

### Étape 1: Installation du client d'authentification

Créez `src/auth/jwt-auth-client.ts`:

```typescript
import fs from 'fs/promises';
import path from 'path';
import { homedir } from 'os';

export interface JWTTokens {
  access_token: string;
  refresh_token: string;
  expires_at: number;
  user: {
    id: string;
    email: string;
  };
}

export class MCPJWTAuthClient {
  private tokensPath: string;
  private readonly apiBaseUrl: string;

  constructor(apiBaseUrl = 'https://your-api.vercel.app') {
    this.apiBaseUrl = apiBaseUrl;
    this.tokensPath = path.join(homedir(), '.config', 'habit-tracker', 'tokens.json');
  }

  // Initialiser le client avec les tokens stockés
  async initialize(): Promise<boolean> {
    try {
      const tokens = await this.loadTokens();
      return !!tokens;
    } catch (error) {
      console.error('Failed to initialize JWT client:', error);
      return false;
    }
  }

  // Charger les tokens depuis le stockage local
  private async loadTokens(): Promise<JWTTokens | null> {
    try {
      const data = await fs.readFile(this.tokensPath, 'utf-8');
      const tokens = JSON.parse(data) as JWTTokens;

      // Vérifier si le token est encore valide
      if (tokens.expires_at && Date.now() < tokens.expires_at * 1000) {
        return tokens;
      }

      // Token expiré, essayer de le rafraîchir
      return await this.refreshTokens(tokens.refresh_token);
    } catch (error) {
      // Fichier non trouvé ou invalide
      return null;
    }
  }

  // Sauvegarder les tokens
  private async saveTokens(tokens: JWTTokens): Promise<void> {
    try {
      // Créer le répertoire si nécessaire
      await fs.mkdir(path.dirname(this.tokensPath), { recursive: true });
      await fs.writeFile(this.tokensPath, JSON.stringify(tokens, null, 2));

      // Sécuriser le fichier (lecture/écriture propriétaire uniquement)
      await fs.chmod(this.tokensPath, 0o600);
    } catch (error) {
      console.error('Failed to save tokens:', error);
      throw error;
    }
  }

  // Rafraîchir les tokens
  async refreshTokens(refreshToken: string): Promise<JWTTokens | null> {
    try {
      const response = await fetch(`${this.apiBaseUrl}/api/auth/refresh`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          refresh_token: refreshToken,
        }),
      });

      if (response.ok) {
        const tokens = await response.json() as JWTTokens;
        await this.saveTokens(tokens);
        return tokens;
      } else {
        console.error('Token refresh failed:', response.status, response.statusText);
        // Supprimer les tokens invalides
        await this.clearTokens();
        return null;
      }
    } catch (error) {
      console.error('Error refreshing tokens:', error);
      return null;
    }
  }

  // Obtenir des tokens valides (avec refresh automatique)
  async getValidTokens(): Promise<JWTTokens | null> {
    return await this.loadTokens();
  }

  // Authentification initiale avec magic link
  async authenticateWithMagicLink(email: string): Promise<boolean> {
    try {
      const response = await fetch(`${this.apiBaseUrl}/api/auth/magic-link`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ email }),
      });

      if (response.ok) {
        console.log('Magic link sent to:', email);
        console.log('Please check your email and run the token setup command');
        return true;
      } else {
        const error = await response.json();
        console.error('Failed to send magic link:', error.error);
        return false;
      }
    } catch (error) {
      console.error('Error sending magic link:', error);
      return false;
    }
  }

  // Enregistrer les tokens depuis un callback URL
  async handleAuthCallback(callbackUrl: string): Promise<boolean> {
    try {
      const url = new URL(callbackUrl);
      const accessToken = url.searchParams.get('access_token');
      const refreshToken = url.searchParams.get('refresh_token');
      const expiresAt = url.searchParams.get('expires_at');

      if (!accessToken || !refreshToken || !expiresAt) {
        throw new Error('Invalid callback URL - missing required parameters');
      }

      // Valider le token en récupérant les informations utilisateur
      const response = await fetch(`${this.apiBaseUrl}/api/auth/session`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          access_token: accessToken,
        }),
      });

      if (response.ok) {
        const sessionData = await response.json();

        const tokens: JWTTokens = {
          access_token: accessToken,
          refresh_token: refreshToken,
          expires_at: parseInt(expiresAt, 10),
          user: sessionData.user,
        };

        await this.saveTokens(tokens);
        console.log('Authentication successful for user:', sessionData.user.email);
        return true;
      } else {
        throw new Error('Token validation failed');
      }
    } catch (error) {
      console.error('Error handling auth callback:', error);
      return false;
    }
  }

  // Supprimer les tokens (déconnexion)
  async clearTokens(): Promise<void> {
    try {
      await fs.unlink(this.tokensPath);
    } catch (error) {
      // Fichier déjà supprimé ou inexistant
    }
  }

  // Vérifier le statut d'authentification
  async isAuthenticated(): Promise<boolean> {
    const tokens = await this.getValidTokens();
    return !!tokens;
  }

  // Obtenir les informations utilisateur
  async getUserInfo(): Promise<{ id: string; email: string } | null> {
    const tokens = await this.getValidTokens();
    return tokens?.user || null;
  }
}

// Instance singleton
export const mcpAuthClient = new MCPJWTAuthClient();
```

### Étape 2: Client API avec gestion JWT

Créez `src/api/habit-client.ts`:

```typescript
import { mcpAuthClient } from '../auth/jwt-auth-client.js';

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

export class HabitAPIClient {
  private readonly baseUrl: string;

  constructor(baseUrl = 'https://your-api.vercel.app') {
    this.baseUrl = baseUrl;
  }

  // Faire une requête authentifiée
  private async makeAuthenticatedRequest<T>(
    endpoint: string,
    options: RequestInit = {}
  ): Promise<T> {
    const tokens = await mcpAuthClient.getValidTokens();

    if (!tokens) {
      throw new Error('Not authenticated. Run the setup command first.');
    }

    const response = await fetch(`${this.baseUrl}${endpoint}`, {
      ...options,
      headers: {
        'Authorization': `Bearer ${tokens.access_token}`,
        'Content-Type': 'application/json',
        ...options.headers,
      },
    });

    if (response.status === 401) {
      // Token possiblement expiré, essayer de rafraîchir
      const refreshedTokens = await mcpAuthClient.refreshTokens(tokens.refresh_token);

      if (refreshedTokens) {
        // Réessayer avec le nouveau token
        const retryResponse = await fetch(`${this.baseUrl}${endpoint}`, {
          ...options,
          headers: {
            'Authorization': `Bearer ${refreshedTokens.access_token}`,
            'Content-Type': 'application/json',
            ...options.headers,
          },
        });

        if (retryResponse.ok) {
          return await retryResponse.json();
        }
      }

      throw new Error('Authentication failed. Please re-authenticate.');
    }

    if (!response.ok) {
      const error = await response.json().catch(() => ({}));
      throw new Error(error.error || `HTTP ${response.status}: ${response.statusText}`);
    }

    return await response.json();
  }

  // API Methods
  async getBoards(): Promise<Board[]> {
    return this.makeAuthenticatedRequest<Board[]>('/api/boards');
  }

  async createBoard(data: {
    name: string;
    description?: string;
    color?: string;
    icon?: string;
  }): Promise<Board> {
    return this.makeAuthenticatedRequest<Board>('/api/boards', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  }

  async updateBoard(id: string, data: Partial<Board>): Promise<Board> {
    return this.makeAuthenticatedRequest<Board>(`/api/boards/${id}`, {
      method: 'PUT',
      body: JSON.stringify(data),
    });
  }

  async deleteBoard(id: string): Promise<void> {
    await this.makeAuthenticatedRequest<void>(`/api/boards/${id}`, {
      method: 'DELETE',
    });
  }

  async getCheckIns(boardId?: string): Promise<CheckIn[]> {
    const params = boardId ? `?board_id=${boardId}` : '';
    return this.makeAuthenticatedRequest<CheckIn[]>(`/api/check-ins${params}`);
  }

  async createCheckIn(data: {
    board_id: string;
    date: string;
    completed: boolean;
    notes?: string;
  }): Promise<CheckIn> {
    return this.makeAuthenticatedRequest<CheckIn>('/api/check-ins', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  }

  async updateCheckIn(id: string, data: Partial<CheckIn>): Promise<CheckIn> {
    return this.makeAuthenticatedRequest<CheckIn>(`/api/check-ins/${id}`, {
      method: 'PUT',
      body: JSON.stringify(data),
    });
  }

  async deleteCheckIn(id: string): Promise<void> {
    await this.makeAuthenticatedRequest<void>(`/api/check-ins/${id}`, {
      method: 'DELETE',
    });
  }
}

// Instance singleton
export const habitClient = new HabitAPIClient();
```

### Étape 3: Configuration CLI pour l'authentification

Créez `src/cli/auth-setup.ts`:

```typescript
import { mcpAuthClient } from '../auth/jwt-auth-client.js';
import readline from 'readline';

const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout,
});

function question(prompt: string): Promise<string> {
  return new Promise((resolve) => {
    rl.question(prompt, resolve);
  });
}

export async function setupAuthentication(): Promise<boolean> {
  try {
    console.log('🔐 Habit Tracker MCP Authentication Setup');
    console.log('========================================\n');

    // Vérifier si déjà authentifié
    if (await mcpAuthClient.isAuthenticated()) {
      const userInfo = await mcpAuthClient.getUserInfo();
      console.log(`✅ Already authenticated as: ${userInfo?.email}`);

      const reauth = await question('Do you want to re-authenticate? (y/N): ');
      if (!reauth.toLowerCase().startsWith('y')) {
        rl.close();
        return true;
      }

      await mcpAuthClient.clearTokens();
    }

    // Demander l'email
    const email = await question('Enter your email address: ');

    if (!email) {
      console.log('❌ Email is required');
      rl.close();
      return false;
    }

    // Envoyer le magic link
    console.log('\n📧 Sending magic link...');
    const sent = await mcpAuthClient.authenticateWithMagicLink(email);

    if (!sent) {
      console.log('❌ Failed to send magic link');
      rl.close();
      return false;
    }

    console.log('✅ Magic link sent to your email');
    console.log('\n🔗 Next steps:');
    console.log('1. Check your email for the magic link');
    console.log('2. Copy the callback URL from the link');
    console.log('3. Paste it below when prompted\n');

    // Attendre le callback URL
    const callbackUrl = await question('Paste the callback URL here: ');

    if (!callbackUrl) {
      console.log('❌ Callback URL is required');
      rl.close();
      return false;
    }

    // Traiter le callback
    console.log('\n🔄 Processing authentication...');
    const success = await mcpAuthClient.handleAuthCallback(callbackUrl);

    if (success) {
      const userInfo = await mcpAuthClient.getUserInfo();
      console.log(`🎉 Authentication successful!`);
      console.log(`👤 Logged in as: ${userInfo?.email}`);
      console.log('\n✅ MCP server is now ready to use');
    } else {
      console.log('❌ Authentication failed');
    }

    rl.close();
    return success;

  } catch (error) {
    console.error('❌ Setup failed:', error);
    rl.close();
    return false;
  }
}

export async function checkAuthStatus(): Promise<void> {
  try {
    if (await mcpAuthClient.isAuthenticated()) {
      const userInfo = await mcpAuthClient.getUserInfo();
      console.log(`✅ Authenticated as: ${userInfo?.email}`);
    } else {
      console.log('❌ Not authenticated');
      console.log('Run the setup command to authenticate');
    }
  } catch (error) {
    console.error('❌ Error checking auth status:', error);
  }
}

export async function logoutUser(): Promise<void> {
  try {
    await mcpAuthClient.clearTokens();
    console.log('✅ Logged out successfully');
  } catch (error) {
    console.error('❌ Error logging out:', error);
  }
}
```

### Étape 4: Migration des outils MCP

Modifiez vos outils existants pour utiliser le nouveau client:

```typescript
// src/tools/habit-tools.ts
import { habitClient } from '../api/habit-client.js';
import { mcpAuthClient } from '../auth/jwt-auth-client.js';

export const habitTools = [
  {
    name: 'list_habits',
    description: 'List all habit tracking boards',
    inputSchema: {
      type: 'object',
      properties: {},
    },
  },
  {
    name: 'create_habit',
    description: 'Create a new habit tracking board',
    inputSchema: {
      type: 'object',
      properties: {
        name: { type: 'string', description: 'Name of the habit' },
        description: { type: 'string', description: 'Description of the habit' },
        color: { type: 'string', description: 'Color for the habit (hex)' },
        icon: { type: 'string', description: 'Emoji icon for the habit' },
      },
      required: ['name'],
    },
  },
  {
    name: 'check_in_habit',
    description: 'Record a check-in for a habit',
    inputSchema: {
      type: 'object',
      properties: {
        board_id: { type: 'string', description: 'ID of the habit board' },
        date: { type: 'string', description: 'Date in YYYY-MM-DD format' },
        completed: { type: 'boolean', description: 'Whether the habit was completed' },
        notes: { type: 'string', description: 'Optional notes about the check-in' },
      },
      required: ['board_id', 'date', 'completed'],
    },
  },
];

export async function handleToolCall(name: string, args: any): Promise<any> {
  // Vérifier l'authentification pour tous les outils
  if (!(await mcpAuthClient.isAuthenticated())) {
    throw new Error('Not authenticated. Please run the setup command first.');
  }

  switch (name) {
    case 'list_habits':
      return await habitClient.getBoards();

    case 'create_habit':
      return await habitClient.createBoard(args);

    case 'check_in_habit':
      return await habitClient.createCheckIn(args);

    default:
      throw new Error(`Unknown tool: ${name}`);
  }
}
```

### Étape 5: Server MCP principal

Modifiez votre serveur principal:

```typescript
// src/server.ts
import { Server } from '@modelcontextprotocol/sdk/server/index.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import { mcpAuthClient } from './auth/jwt-auth-client.js';
import { habitTools, handleToolCall } from './tools/habit-tools.js';

const server = new Server(
  {
    name: 'habit-tracker',
    version: '2.0.0',
  },
  {
    capabilities: {
      tools: {},
    },
  }
);

// Initialiser l'authentification au démarrage
server.setRequestHandler('initialize', async () => {
  await mcpAuthClient.initialize();

  // Vérifier le statut d'authentification
  const isAuth = await mcpAuthClient.isAuthenticated();
  if (!isAuth) {
    console.error('⚠️  Not authenticated. Run the setup command first.');
  }

  return {
    protocolVersion: '2024-11-05',
    capabilities: {
      tools: {},
    },
    serverInfo: {
      name: 'habit-tracker',
      version: '2.0.0',
    },
  };
});

// Lister les outils disponibles
server.setRequestHandler('tools/list', async () => {
  return { tools: habitTools };
});

// Exécuter les outils
server.setRequestHandler('tools/call', async (request) => {
  try {
    const result = await handleToolCall(request.params.name, request.params.arguments);
    return {
      content: [
        {
          type: 'text',
          text: JSON.stringify(result, null, 2),
        },
      ],
    };
  } catch (error) {
    throw new Error(`Tool execution failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
  }
});

// Gérer les erreurs
server.onerror = (error) => {
  console.error('[MCP Error]', error);
};

process.on('SIGINT', async () => {
  await server.close();
  process.exit(0);
});

// Démarrer le serveur
async function main() {
  const transport = new StdioServerTransport();
  await server.connect(transport);
  console.error('Habit Tracker MCP server running on stdio');
}

main().catch((error) => {
  console.error('Failed to start server:', error);
  process.exit(1);
});
```

### Étape 6: Scripts CLI

Ajoutez des scripts CLI dans `package.json`:

```json
{
  "scripts": {
    "auth:setup": "node -r esbuild-register src/cli/auth-setup.ts setup",
    "auth:status": "node -r esbuild-register src/cli/auth-setup.ts status",
    "auth:logout": "node -r esbuild-register src/cli/auth-setup.ts logout",
    "start": "node dist/server.js",
    "dev": "tsx src/server.ts",
    "build": "esbuild src/server.ts --bundle --platform=node --outfile=dist/server.js"
  }
}
```

### Étape 7: Documentation d'installation

Créez `README.md` mis à jour:

```markdown
# Habit Tracker MCP Server

A Model Context Protocol server for interacting with the Habit Tracker API using JWT authentication.

## Installation

```bash
npm install
npm run build
```

## Authentication Setup

Before using the MCP server, you need to authenticate:

```bash
npm run auth:setup
```

This will:
1. Ask for your email address
2. Send you a magic link
3. Prompt you to paste the callback URL
4. Save your authentication tokens securely

## Usage

### With Claude Desktop

Add to your `claude_desktop_config.json`:

```json
{
  "mcpServers": {
    "habit-tracker": {
      "command": "node",
      "args": ["/path/to/habit-tracker-mcp/dist/server.js"]
    }
  }
}
```

### Available Tools

- `list_habits` - List all your habit tracking boards
- `create_habit` - Create a new habit
- `check_in_habit` - Record a habit check-in

## Authentication Management

```bash
# Check authentication status
npm run auth:status

# Logout (clear stored tokens)
npm run auth:logout

# Re-authenticate
npm run auth:setup
```

## Security

- Tokens are stored securely in `~/.config/habit-tracker/tokens.json`
- File permissions are set to 600 (owner read/write only)
- Automatic token refresh when expired
- Secure JWT-based authentication

## Migration from API Keys

If you were using API keys before:

1. Remove any `HABIT_API_KEY` environment variables
2. Run `npm run auth:setup` to configure JWT authentication
3. The server will automatically use JWT tokens

## Troubleshooting

- If authentication fails, try `npm run auth:logout` then `npm run auth:setup`
- Check your email (including spam) for the magic link
- Ensure you copy the entire callback URL from the email
```

### Étape 8: Tests de migration

Créez `tests/migration.test.ts`:

```typescript
import { mcpAuthClient, MCPJWTAuthClient } from '../src/auth/jwt-auth-client.js';
import { habitClient } from '../src/api/habit-client.js';

async function testMigration() {
  console.log('🧪 Testing MCP JWT Migration');
  console.log('============================\n');

  // Test 1: Authentication status
  const isAuth = await mcpAuthClient.isAuthenticated();
  console.log(`1. Authentication status: ${isAuth ? '✅ Authenticated' : '❌ Not authenticated'}`);

  if (!isAuth) {
    console.log('⚠️  Run "npm run auth:setup" first');
    return false;
  }

  // Test 2: User info
  const userInfo = await mcpAuthClient.getUserInfo();
  console.log(`2. User info: ✅ ${userInfo?.email}`);

  // Test 3: API calls
  try {
    const boards = await habitClient.getBoards();
    console.log(`3. List boards: ✅ ${boards.length} boards found`);

    const checkIns = await habitClient.getCheckIns();
    console.log(`4. List check-ins: ✅ ${checkIns.length} check-ins found`);

    console.log('\n🎉 Migration test successful!');
    return true;
  } catch (error) {
    console.log(`❌ API calls failed: ${error}`);
    return false;
  }
}

if (require.main === module) {
  testMigration();
}
```

## Rollback

En cas de problème, gardez une version de fallback:

```typescript
// Fallback client avec support API key
export class LegacyAPIClient {
  private apiKey: string;

  constructor(apiKey: string) {
    this.apiKey = apiKey;
  }

  async makeRequest<T>(endpoint: string, options: RequestInit = {}): Promise<T> {
    const response = await fetch(`${API_BASE_URL}${endpoint}`, {
      ...options,
      headers: {
        'Authorization': `Bearer ${this.apiKey}`,
        'Content-Type': 'application/json',
        ...options.headers,
      },
    });

    if (!response.ok) {
      throw new Error(`HTTP ${response.status}`);
    }

    return response.json();
  }
}

// Utilisation avec fallback
const apiKey = process.env.HABIT_API_KEY;
const client = apiKey ? new LegacyAPIClient(apiKey) : habitClient;
```

Cette migration garantit une transition fluide vers JWT tout en maintenant la sécurité et la facilité d'utilisation.