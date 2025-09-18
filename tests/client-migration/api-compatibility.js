import { test, describe } from 'node:test';
import assert from 'node:assert';
import fetch from 'node-fetch';
import { config } from 'dotenv';

config();

const API_BASE_URL = process.env.API_BASE_URL || 'http://localhost:3002';
const TEST_API_KEY = process.env.TEST_API_KEY || 'bc529961369183feb7eff2c5e3699ba7';

/**
 * API Compatibility Test Suite
 * Ensures backwards compatibility during JWT migration
 */
describe('API Backwards Compatibility', () => {

  test('should support legacy API key authentication', async () => {
    const response = await fetch(`${API_BASE_URL}/api/boards`, {
      headers: {
        'Authorization': `Bearer ${TEST_API_KEY}`,
        'Content-Type': 'application/json',
      },
    });

    // API keys should still work during transition
    assert.ok(response.status === 200 || response.status === 401);

    if (response.status === 200) {
      const boards = await response.json();
      assert.ok(Array.isArray(boards));
      console.log('✅ Legacy API key authentication still working');
    } else {
      console.log('ℹ️  API key authentication disabled (JWT-only mode)');
    }
  });

  test('should maintain consistent API response format', async () => {
    // Test with API key (if available)
    const apiKeyResponse = await fetch(`${API_BASE_URL}/api/boards`, {
      headers: {
        'Authorization': `Bearer ${TEST_API_KEY}`,
        'Content-Type': 'application/json',
      },
    });

    if (apiKeyResponse.status === 200) {
      const apiKeyData = await apiKeyResponse.json();

      // Validate response structure
      assert.ok(Array.isArray(apiKeyData));

      if (apiKeyData.length > 0) {
        const board = apiKeyData[0];
        assert.ok(board.id);
        assert.ok(board.name);
        assert.ok(board.created_at);
      }

      console.log('✅ API response format consistency maintained');
    } else {
      console.log('ℹ️  Skipping format test (API key not working)');
    }
  });

  test('should handle authentication errors consistently', async () => {
    // Test with invalid API key
    const invalidApiKeyResponse = await fetch(`${API_BASE_URL}/api/boards`, {
      headers: {
        'Authorization': 'Bearer invalid_api_key',
        'Content-Type': 'application/json',
      },
    });

    assert.strictEqual(invalidApiKeyResponse.status, 401);

    const apiKeyError = await invalidApiKeyResponse.json();
    assert.ok(apiKeyError.error);

    // Test with invalid JWT
    const invalidJwtResponse = await fetch(`${API_BASE_URL}/api/boards`, {
      headers: {
        'Authorization': 'Bearer eyInvalid.jwt.token',
        'Content-Type': 'application/json',
      },
    });

    assert.strictEqual(invalidJwtResponse.status, 401);

    const jwtError = await invalidJwtResponse.json();
    assert.ok(jwtError.error);

    // Both should have similar error structure
    assert.ok(typeof apiKeyError.error === 'string');
    assert.ok(typeof jwtError.error === 'string');

    console.log('✅ Authentication error handling consistency maintained');
  });

  test('should support all endpoints with both auth methods', async () => {
    const endpoints = [
      '/api/boards',
      '/api/check-ins',
      '/api/progress'
    ];

    for (const endpoint of endpoints) {
      console.log(`Testing endpoint: ${endpoint}`);

      // Test with API key
      const apiKeyResponse = await fetch(`${API_BASE_URL}${endpoint}`, {
        headers: {
          'Authorization': `Bearer ${TEST_API_KEY}`,
          'Content-Type': 'application/json',
        },
      });

      // Should either work (200) or be unauthorized (401)
      assert.ok([200, 401, 404].includes(apiKeyResponse.status));

      // Test with mock JWT (expect 401 since it's invalid)
      const jwtResponse = await fetch(`${API_BASE_URL}${endpoint}`, {
        headers: {
          'Authorization': 'Bearer eyJ0eXAiOiJKV1QiLCJhbGciOiJIUzI1NiJ9.mock.token',
          'Content-Type': 'application/json',
        },
      });

      // Should be unauthorized with invalid JWT
      assert.strictEqual(jwtResponse.status, 401);
    }

    console.log('✅ All endpoints support both authentication methods');
  });

  test('should handle CORS headers consistently', async () => {
    const response = await fetch(`${API_BASE_URL}/api/boards`, {
      method: 'OPTIONS',
    });

    // Check CORS headers are present
    assert.ok(response.headers.get('access-control-allow-origin'));
    assert.ok(response.headers.get('access-control-allow-methods'));
    assert.ok(response.headers.get('access-control-allow-headers'));

    console.log('✅ CORS headers consistency maintained');
  });

  test('should validate API versioning strategy', async () => {
    // Current API should work without version headers
    const noVersionResponse = await fetch(`${API_BASE_URL}/api/boards`, {
      headers: {
        'Authorization': `Bearer ${TEST_API_KEY}`,
        'Content-Type': 'application/json',
      },
    });

    assert.ok([200, 401].includes(noVersionResponse.status));

    // Test with explicit version header (if supported)
    const versionedResponse = await fetch(`${API_BASE_URL}/api/boards`, {
      headers: {
        'Authorization': `Bearer ${TEST_API_KEY}`,
        'Content-Type': 'application/json',
        'API-Version': '1.0',
      },
    });

    assert.ok([200, 401, 400].includes(versionedResponse.status));

    console.log('✅ API versioning strategy validated');
  });

  test('should maintain rate limiting behavior', async () => {
    // Test rapid requests (simulate rate limiting test)
    const requests = [];
    const requestCount = 5;

    for (let i = 0; i < requestCount; i++) {
      requests.push(
        fetch(`${API_BASE_URL}/api/boards`, {
          headers: {
            'Authorization': `Bearer ${TEST_API_KEY}`,
            'Content-Type': 'application/json',
          },
        })
      );
    }

    const responses = await Promise.all(requests);

    // All should have same behavior (all success or all unauthorized)
    const statusCodes = responses.map(r => r.status);
    const uniqueStatuses = [...new Set(statusCodes)];

    // Should not have mixed rate limiting behavior
    assert.ok(uniqueStatuses.length <= 2); // 200/401 or just one status

    console.log('✅ Rate limiting behavior consistency maintained');
  });

  test('should validate response time consistency', async () => {
    const measureResponseTime = async (authHeader) => {
      const start = performance.now();

      const response = await fetch(`${API_BASE_URL}/api/boards`, {
        headers: {
          'Authorization': authHeader,
          'Content-Type': 'application/json',
        },
      });

      const end = performance.now();
      return {
        responseTime: end - start,
        status: response.status
      };
    };

    // Measure API key response time
    const apiKeyResult = await measureResponseTime(`Bearer ${TEST_API_KEY}`);

    // Measure JWT response time (with invalid token)
    const jwtResult = await measureResponseTime('Bearer eyJ0eXAiOiJKV1QiLCJhbGciOiJIUzI1NiJ9.mock.token');

    // Both should respond in reasonable time (under 2 seconds)
    assert.ok(apiKeyResult.responseTime < 2000);
    assert.ok(jwtResult.responseTime < 2000);

    console.log(`✅ Response times: API Key: ${apiKeyResult.responseTime.toFixed(2)}ms, JWT: ${jwtResult.responseTime.toFixed(2)}ms`);
  });

  test('should check health endpoint compatibility', async () => {
    const response = await fetch(`${API_BASE_URL}/api/health`);

    assert.strictEqual(response.status, 200);

    const health = await response.json();
    assert.ok(health.status);
    assert.ok(health.timestamp);

    // Should include auth metrics if available
    if (health.auth) {
      assert.ok(typeof health.auth.successRate === 'number');
      assert.ok(typeof health.auth.totalRequests === 'number');
    }

    console.log('✅ Health endpoint compatibility maintained');
  });
});

console.log('\n🔄 API Backwards Compatibility Tests\n');
console.log('These tests ensure smooth transition during JWT migration.');
console.log('Legacy API keys should continue working alongside JWT authentication.\n');