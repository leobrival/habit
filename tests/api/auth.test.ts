import { test, expect } from '@playwright/test'

test.describe('Authentication API', () => {
  const baseURL = 'http://localhost:3000/api'

  test.describe('POST /auth/magic-link', () => {
    test('should send magic link with valid email', async ({ request }) => {
      const response = await request.post(`${baseURL}/auth/magic-link`, {
        data: {
          email: 'test@example.com'
        }
      })

      expect(response.status()).toBe(200)

      const body = await response.json()
      expect(body).toHaveProperty('message')
      expect(body.message).toContain('Magic link sent')
    })

    test('should reject invalid email format', async ({ request }) => {
      const response = await request.post(`${baseURL}/auth/magic-link`, {
        data: {
          email: 'invalid-email'
        }
      })

      expect(response.status()).toBe(400)

      const body = await response.json()
      expect(body).toHaveProperty('error')
    })

    test('should reject missing email', async ({ request }) => {
      const response = await request.post(`${baseURL}/auth/magic-link`, {
        data: {}
      })

      expect(response.status()).toBe(400)

      const body = await response.json()
      expect(body).toHaveProperty('error')
    })

    test('should handle empty email', async ({ request }) => {
      const response = await request.post(`${baseURL}/auth/magic-link`, {
        data: {
          email: ''
        }
      })

      expect(response.status()).toBe(400)

      const body = await response.json()
      expect(body).toHaveProperty('error')
    })
  })

  test.describe('POST /auth/verify', () => {
    test('should verify valid token and return user + API key', async ({ request }) => {
      // First, request a magic link
      await request.post(`${baseURL}/auth/magic-link`, {
        data: {
          email: 'test@example.com'
        }
      })

      // Note: In a real test, you'd extract the token from email
      // For now, we test with a mock token format
      const response = await request.post(`${baseURL}/auth/verify`, {
        data: {
          token: 'valid-test-token'
        }
      })

      expect(response.status()).toBe(200)

      const body = await response.json()
      expect(body).toHaveProperty('user')
      expect(body).toHaveProperty('api_key')
      expect(body.user).toHaveProperty('id')
      expect(body.user).toHaveProperty('email')
      expect(typeof body.api_key).toBe('string')
      expect(body.api_key.length).toBeGreaterThan(0)
    })

    test('should reject invalid token', async ({ request }) => {
      const response = await request.post(`${baseURL}/auth/verify`, {
        data: {
          token: 'invalid-token'
        }
      })

      expect(response.status()).toBe(401)

      const body = await response.json()
      expect(body).toHaveProperty('error')
    })

    test('should reject missing token', async ({ request }) => {
      const response = await request.post(`${baseURL}/auth/verify`, {
        data: {}
      })

      expect(response.status()).toBe(400)

      const body = await response.json()
      expect(body).toHaveProperty('error')
    })

    test('should reject empty token', async ({ request }) => {
      const response = await request.post(`${baseURL}/auth/verify`, {
        data: {
          token: ''
        }
      })

      expect(response.status()).toBe(400)

      const body = await response.json()
      expect(body).toHaveProperty('error')
    })

    test('should generate unique API keys for each verification', async ({ request }) => {
      // Mock two different verification requests
      const response1 = await request.post(`${baseURL}/auth/verify`, {
        data: {
          token: 'valid-test-token-1'
        }
      })

      const response2 = await request.post(`${baseURL}/auth/verify`, {
        data: {
          token: 'valid-test-token-2'
        }
      })

      if (response1.status() === 200 && response2.status() === 200) {
        const body1 = await response1.json()
        const body2 = await response2.json()

        // API keys should be different
        expect(body1.api_key).not.toBe(body2.api_key)
      }
    })
  })

  test.describe('Error Handling', () => {
    test('should return proper Content-Type for all responses', async ({ request }) => {
      const response = await request.post(`${baseURL}/auth/magic-link`, {
        data: {
          email: 'test@example.com'
        }
      })

      expect(response.headers()['content-type']).toContain('application/json')
    })

    test('should handle malformed JSON gracefully', async ({ request }) => {
      const response = await request.post(`${baseURL}/auth/magic-link`, {
        data: 'invalid-json'
      })

      expect(response.status()).toBe(400)
    })
  })
})