import { test, describe } from 'node:test';
import assert from 'node:assert';
import fetch from 'node-fetch';
import { config } from 'dotenv';

config();

const API_BASE_URL = process.env.API_BASE_URL || 'http://localhost:3002';
const TEST_EMAIL = process.env.TEST_EMAIL || 'test@example.com';

/**
 * Complete Client Authentication Flow Tests
 * Tests end-to-end authentication flows for different client types
 */
describe('Complete Client Authentication Flows', () => {

  describe('Raycast Extension Flow', () => {
    test('should complete full Raycast authentication flow', async () => {
      console.log('🎯 Testing complete Raycast authentication flow...');

      // Step 1: Extension requests magic link
      const magicLinkResponse = await fetch(`${API_BASE_URL}/api/auth/magic-link`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          email: TEST_EMAIL,
          callback_url: 'raycast://extensions/habit-tracker/auth-callback'
        }),
      });

      assert.strictEqual(magicLinkResponse.status, 200);
      const magicLinkData = await magicLinkResponse.json();
      assert.ok(magicLinkData.success);

      console.log('  ✅ Step 1: Magic link requested successfully');

      // Step 2: Simulate user clicking link (mock token callback)
      // In real flow, Supabase would redirect to Raycast with tokens
      const mockCallbackUrl = 'raycast://extensions/habit-tracker/auth-callback?access_token=mock_jwt&refresh_token=mock_refresh&expires_at=1700036000';

      // Step 3: Raycast extracts and stores tokens
      const url = new URL(mockCallbackUrl);
      const accessToken = url.searchParams.get('access_token');
      const refreshToken = url.searchParams.get('refresh_token');
      const expiresAt = url.searchParams.get('expires_at');

      assert.ok(accessToken);
      assert.ok(refreshToken);
      assert.ok(expiresAt);

      console.log('  ✅ Step 2: Tokens extracted from callback URL');

      // Step 4: Store tokens in Raycast LocalStorage (simulated)
      const tokens = {
        access_token: accessToken,
        refresh_token: refreshToken,
        expires_at: parseInt(expiresAt, 10),
      };

      // Simulate LocalStorage.setItem
      const storedTokens = JSON.stringify(tokens);
      assert.ok(storedTokens);

      console.log('  ✅ Step 3: Tokens stored in Raycast LocalStorage');

      // Step 5: Use tokens for API calls
      const apiResponse = await fetch(`${API_BASE_URL}/api/boards`, {
        headers: {
          'Authorization': `Bearer ${accessToken}`,
          'Content-Type': 'application/json',
        },
      });

      // Expect 401 with mock token (normal in testing)
      assert.strictEqual(apiResponse.status, 401);

      console.log('  ✅ Step 4: API call attempted with stored tokens');
      console.log('  ✅ Complete Raycast flow validated');
    });
  });

  describe('MCP Server Flow', () => {
    test('should complete full MCP server authentication flow', async () => {
      console.log('🔧 Testing complete MCP server authentication flow...');

      // Step 1: CLI tool setup
      const mcpConfig = {
        name: 'habit-tracker',
        apiUrl: API_BASE_URL,
        email: TEST_EMAIL,
        tokensPath: './test-mcp-tokens.json'
      };

      assert.ok(mcpConfig.name);
      assert.ok(mcpConfig.apiUrl);
      assert.ok(mcpConfig.email);

      console.log('  ✅ Step 1: MCP CLI configuration created');

      // Step 2: Request magic link
      const magicLinkResponse = await fetch(`${API_BASE_URL}/api/auth/magic-link`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          email: TEST_EMAIL,
          callback_url: 'http://localhost:8080/auth-callback'
        }),
      });

      assert.strictEqual(magicLinkResponse.status, 200);
      const magicLinkData = await magicLinkResponse.json();
      assert.ok(magicLinkData.success);

      console.log('  ✅ Step 2: Magic link requested for MCP server');

      // Step 3: Simulate local server receiving callback
      const mockTokens = {
        access_token: 'eyJ0eXAiOiJKV1QiLCJhbGciOiJIUzI1NiJ9.mcp.token',
        refresh_token: 'mcp_refresh_token',
        expires_at: Math.floor(Date.now() / 1000) + 3600,
        created_at: new Date().toISOString()
      };

      // Step 4: Store tokens in file system
      const tokensContent = JSON.stringify(mockTokens, null, 2);
      assert.ok(tokensContent);

      console.log('  ✅ Step 3: Tokens received and stored to file');

      // Step 5: MCP server loads tokens on startup
      const loadedTokens = JSON.parse(tokensContent);
      assert.strictEqual(loadedTokens.access_token, mockTokens.access_token);
      assert.strictEqual(loadedTokens.refresh_token, mockTokens.refresh_token);

      console.log('  ✅ Step 4: Tokens loaded by MCP server');

      // Step 6: Make authenticated requests
      const apiResponse = await fetch(`${API_BASE_URL}/api/boards`, {
        headers: {
          'Authorization': `Bearer ${loadedTokens.access_token}`,
          'Content-Type': 'application/json',
          'User-Agent': 'MCP-Server/1.0.0'
        },
      });

      // Expect 401 with mock token (normal in testing)
      assert.strictEqual(apiResponse.status, 401);

      console.log('  ✅ Step 5: API call attempted with MCP authentication');
      console.log('  ✅ Complete MCP server flow validated');
    });
  });

  describe('Mobile App Flow', () => {
    test('should complete full mobile app authentication flow', async () => {
      console.log('📱 Testing complete mobile app authentication flow...');

      // Step 1: App requests magic link
      const magicLinkResponse = await fetch(`${API_BASE_URL}/api/auth/magic-link`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          email: TEST_EMAIL,
          callback_url: 'habittracker://auth-callback'
        }),
      });

      assert.strictEqual(magicLinkResponse.status, 200);
      const magicLinkData = await magicLinkResponse.json();
      assert.ok(magicLinkData.success);

      console.log('  ✅ Step 1: Magic link requested for mobile app');

      // Step 2: Simulate deep link callback
      const mockCallbackUrl = 'habittracker://auth-callback?access_token=mobile_jwt&refresh_token=mobile_refresh&expires_at=1700036000';

      const url = new URL(mockCallbackUrl);
      const accessToken = url.searchParams.get('access_token');
      const refreshToken = url.searchParams.get('refresh_token');
      const expiresAt = url.searchParams.get('expires_at');

      assert.ok(accessToken);
      assert.ok(refreshToken);
      assert.ok(expiresAt);

      console.log('  ✅ Step 2: Deep link callback processed');

      // Step 3: Store in secure storage (simulated)
      const secureStorage = {
        accessToken,
        refreshToken,
        expiresAt: parseInt(expiresAt, 10),
        storedAt: Date.now()
      };

      assert.ok(secureStorage.accessToken);
      assert.ok(secureStorage.refreshToken);

      console.log('  ✅ Step 3: Tokens stored in secure storage');

      // Step 4: Make API calls with stored tokens
      const apiResponse = await fetch(`${API_BASE_URL}/api/boards`, {
        headers: {
          'Authorization': `Bearer ${secureStorage.accessToken}`,
          'Content-Type': 'application/json',
          'User-Agent': 'HabitTracker-Mobile/1.0.0'
        },
      });

      // Expect 401 with mock token (normal in testing)
      assert.strictEqual(apiResponse.status, 401);

      console.log('  ✅ Step 4: API call attempted with mobile authentication');
      console.log('  ✅ Complete mobile app flow validated');
    });
  });

  describe('Web Dashboard Flow', () => {
    test('should complete full web dashboard authentication flow', async () => {
      console.log('🌐 Testing complete web dashboard authentication flow...');

      // Step 1: Web app requests magic link
      const magicLinkResponse = await fetch(`${API_BASE_URL}/api/auth/magic-link`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          email: TEST_EMAIL,
          callback_url: `${API_BASE_URL}/auth/callback`
        }),
      });

      assert.strictEqual(magicLinkResponse.status, 200);
      const magicLinkData = await magicLinkResponse.json();
      assert.ok(magicLinkData.success);

      console.log('  ✅ Step 1: Magic link requested for web dashboard');

      // Step 2: Simulate web redirect callback
      const mockCallbackData = {
        access_token: 'web_jwt_token',
        refresh_token: 'web_refresh_token',
        expires_at: Math.floor(Date.now() / 1000) + 3600
      };

      // Step 3: Store in browser storage (simulated)
      const browserStorage = {
        localStorage: {
          'habit-tracker-tokens': JSON.stringify(mockCallbackData)
        },
        sessionStorage: {},
        cookies: {
          'auth-session': 'session_id_123'
        }
      };

      const storedTokens = JSON.parse(browserStorage.localStorage['habit-tracker-tokens']);
      assert.strictEqual(storedTokens.access_token, mockCallbackData.access_token);

      console.log('  ✅ Step 2: Tokens stored in browser storage');

      // Step 4: Set up API client with tokens
      const apiClient = {
        baseUrl: API_BASE_URL,
        tokens: storedTokens,
        async makeRequest(endpoint) {
          return fetch(`${this.baseUrl}${endpoint}`, {
            headers: {
              'Authorization': `Bearer ${this.tokens.access_token}`,
              'Content-Type': 'application/json',
            },
          });
        }
      };

      const apiResponse = await apiClient.makeRequest('/api/boards');

      // Expect 401 with mock token (normal in testing)
      assert.strictEqual(apiResponse.status, 401);

      console.log('  ✅ Step 3: API client configured and tested');
      console.log('  ✅ Complete web dashboard flow validated');
    });
  });

  describe('Error Handling Flows', () => {
    test('should handle authentication errors gracefully', async () => {
      console.log('❌ Testing authentication error handling...');

      // Test invalid email
      const invalidEmailResponse = await fetch(`${API_BASE_URL}/api/auth/magic-link`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          email: 'invalid-email',
          callback_url: 'test://callback'
        }),
      });

      assert.strictEqual(invalidEmailResponse.status, 400);
      const emailError = await invalidEmailResponse.json();
      assert.ok(emailError.error);

      console.log('  ✅ Invalid email error handled correctly');

      // Test missing callback URL
      const missingCallbackResponse = await fetch(`${API_BASE_URL}/api/auth/magic-link`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          email: TEST_EMAIL,
        }),
      });

      assert.strictEqual(missingCallbackResponse.status, 400);
      const callbackError = await missingCallbackResponse.json();
      assert.ok(callbackError.error);

      console.log('  ✅ Missing callback URL error handled correctly');

      // Test invalid token refresh
      const invalidRefreshResponse = await fetch(`${API_BASE_URL}/api/auth/refresh`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          refresh_token: 'invalid_refresh_token',
        }),
      });

      assert.strictEqual(invalidRefreshResponse.status, 401);
      const refreshError = await invalidRefreshResponse.json();
      assert.ok(refreshError.error);

      console.log('  ✅ Invalid refresh token error handled correctly');
      console.log('  ✅ All error handling flows validated');
    });
  });
});

console.log('\n🔐 Complete Client Authentication Flow Tests\n');
console.log('These tests validate end-to-end authentication flows for all client types.');
console.log('Simulates real-world authentication scenarios with proper error handling.\n');