/**
 * JWT Migration Integration Tests
 * Tests the new JWT authentication system alongside the old API key system
 */

// Jest globals are available automatically in Jest environment
import { validateJWT } from '../lib/jwt-auth-middleware';
import { createServerSupabaseClient } from '../lib/supabase';

// Mock NextRequest for testing
class MockNextRequest {
  public headers: Map<string, string>;
  public url: string;

  constructor(url: string, init?: { headers?: Record<string, string> }) {
    this.url = url;
    this.headers = new Map();

    if (init?.headers) {
      Object.entries(init.headers).forEach(([key, value]) => {
        this.headers.set(key.toLowerCase(), value);
      });
    }
  }

  get(name: string): string | null {
    return this.headers.get(name.toLowerCase()) || null;
  }
}

describe('JWT Migration Tests', () => {
  let adminClient: any;
  let testUserId: string;
  let validAccessToken: string;
  const testEmail = 'jwt-test@example.com';

  beforeAll(async () => {
    // Setup admin client
    adminClient = createServerSupabaseClient();

    // Verify we can connect to Supabase
    const { data, error } = await adminClient.from('users').select('count').limit(1);
    if (error) {
      console.error('Cannot connect to Supabase for testing:', error);
      throw new Error('Supabase connection failed');
    }
  });

  describe('JWT Authentication Middleware', () => {
    test('should reject missing authorization header', async () => {
      const mockRequest = new MockNextRequest('http://localhost:3000/api/test');

      await expect(validateJWT(mockRequest as any)).rejects.toThrow(
        'Missing or invalid authorization header'
      );
    });

    test('should reject invalid JWT token format', async () => {
      const mockRequest = new MockNextRequest('http://localhost:3000/api/test', {
        headers: {
          Authorization: 'Bearer invalid-token',
        },
      });

      await expect(validateJWT(mockRequest as any)).rejects.toThrow(
        'Invalid JWT token format'
      );
    });

    test('should reject malformed JWT tokens', async () => {
      const mockRequest = new MockNextRequest('http://localhost:3000/api/test', {
        headers: {
          Authorization: 'Bearer eyJ.malformed',
        },
      });

      await expect(validateJWT(mockRequest as any)).rejects.toThrow(
        'Invalid JWT token format'
      );
    });

    test('should reject expired/invalid JWT tokens', async () => {
      // Create a fake but properly formatted JWT
      const fakeJWT = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiIxMjM0NTY3ODkwIiwibmFtZSI6IkpvaG4gRG9lIiwiaWF0IjoxNTE2MjM5MDIyfQ.SflKxwRJSMeKKF2QT4fwpMeJf36POk6yJV_adQssw5c';

      const mockRequest = new MockNextRequest('http://localhost:3000/api/test', {
        headers: {
          Authorization: `Bearer ${fakeJWT}`,
        },
      });

      await expect(validateJWT(mockRequest as any)).rejects.toThrow(
        'Invalid or expired JWT token'
      );
    });
  });

  describe('Session Management Endpoints', () => {
    test('POST /api/auth/session should validate token format', async () => {
      const response = await fetch('http://localhost:3000/api/auth/session', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          access_token: 'invalid-token',
        }),
      });

      expect(response.status).toBe(401);
      const result = await response.json();
      expect(result.error).toContain('Invalid JWT token format');
    });

    test('POST /api/auth/session should require access_token', async () => {
      const response = await fetch('http://localhost:3000/api/auth/session', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({}),
      });

      expect(response.status).toBe(400);
      const result = await response.json();
      expect(result.error).toBe('access_token is required');
    });

    test('GET /api/auth/session should require authorization header', async () => {
      const response = await fetch('http://localhost:3000/api/auth/session');

      expect(response.status).toBe(401);
      const result = await response.json();
      expect(result.error).toContain('Missing or invalid authorization header');
    });
  });

  describe('Dual Authentication Support', () => {
    test('API key authentication should still work', async () => {
      const response = await fetch('http://localhost:3000/api/boards', {
        headers: {
          Authorization: 'Bearer bc529961369183feb7eff2c5e3699ba7',
        },
      });

      // Should work with existing API key system
      expect(response.status).toBe(200);
      const boards = await response.json();
      expect(Array.isArray(boards)).toBe(true);
    });

    test('Invalid authorization format should be rejected', async () => {
      const response = await fetch('http://localhost:3000/api/boards', {
        headers: {
          Authorization: 'Basic invalid',
        },
      });

      expect(response.status).toBe(401);
      const result = await response.json();
      expect(result.error).toBe('Invalid authorization format');
    });

    test('Missing authorization should be rejected', async () => {
      const response = await fetch('http://localhost:3000/api/boards');

      expect(response.status).toBe(401);
      const result = await response.json();
      expect(result.error).toBe('Missing authorization header');
    });
  });

  describe('API Endpoints with Dual Auth', () => {
    test('GET /api/boards should work with API keys', async () => {
      const response = await fetch('http://localhost:3000/api/boards', {
        headers: {
          Authorization: 'Bearer bc529961369183feb7eff2c5e3699ba7',
        },
      });

      expect(response.status).toBe(200);
      const boards = await response.json();
      expect(Array.isArray(boards)).toBe(true);
    });

    test('POST /api/boards should work with API keys', async () => {
      const response = await fetch('http://localhost:3000/api/boards', {
        method: 'POST',
        headers: {
          Authorization: 'Bearer bc529961369183feb7eff2c5e3699ba7',
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          name: 'JWT Migration Test Board',
          description: 'Created during JWT migration testing',
          color: '#22c55e',
          icon: '🧪',
        }),
      });

      expect(response.status).toBe(201);
      const board = await response.json();
      expect(board.name).toBe('JWT Migration Test Board');
    });

    test('GET /api/check-ins should work with API keys', async () => {
      const response = await fetch('http://localhost:3000/api/check-ins', {
        headers: {
          Authorization: 'Bearer bc529961369183feb7eff2c5e3699ba7',
        },
      });

      expect(response.status).toBe(200);
      const checkIns = await response.json();
      expect(Array.isArray(checkIns)).toBe(true);
    });
  });

  describe('Error Handling', () => {
    test('Should handle malformed request bodies gracefully', async () => {
      const response = await fetch('http://localhost:3000/api/auth/session', {
        method: 'POST',
        headers: {
          Authorization: 'Bearer bc529961369183feb7eff2c5e3699ba7',
          'Content-Type': 'application/json',
        },
        body: 'invalid json',
      });

      expect(response.status).toBe(400);
    });

    test('Should handle database connection issues gracefully', async () => {
      // This test would require mocking Supabase to simulate connection failure
      // For now, we just verify the API is responsive
      const response = await fetch('http://localhost:3000/api/boards', {
        headers: {
          Authorization: 'Bearer bc529961369183feb7eff2c5e3699ba7',
        },
      });

      expect(response.status).toBeLessThan(500);
    });
  });
});

// Additional test for JWT token refresh
describe('Token Refresh', () => {
  test('POST /api/auth/refresh should require refresh_token', async () => {
    const response = await fetch('http://localhost:3000/api/auth/refresh', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({}),
    });

    expect(response.status).toBe(400);
    const result = await response.json();
    expect(result.error).toBe('refresh_token is required');
  });

  test('POST /api/auth/refresh should reject invalid refresh tokens', async () => {
    const response = await fetch('http://localhost:3000/api/auth/refresh', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        refresh_token: 'invalid-refresh-token',
      }),
    });

    expect(response.status).toBe(401);
    const result = await response.json();
    expect(result.code).toBe('REFRESH_FAILED');
  });
});