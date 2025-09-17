import { test, expect } from '@playwright/test'

test.describe('API Keys Management', () => {
  const baseURL = 'http://localhost:3000/api'
  let authToken: string

  test.beforeEach(async ({ request }) => {
    // Get authentication token for tests
    const authResponse = await request.post(`${baseURL}/auth/verify`, {
      data: {
        token: 'valid-test-token'
      }
    })

    if (authResponse.status() === 200) {
      const authBody = await authResponse.json()
      authToken = authBody.api_key
    }
  })

  test.describe('GET /api-keys', () => {
    test('should list user API keys with authentication', async ({ request }) => {
      const response = await request.get(`${baseURL}/api-keys`, {
        headers: {
          'Authorization': `Bearer ${authToken}`
        }
      })

      expect(response.status()).toBe(200)

      const body = await response.json()
      expect(Array.isArray(body)).toBe(true)

      // Check structure of API key objects
      if (body.length > 0) {
        const apiKey = body[0]
        expect(apiKey).toHaveProperty('id')
        expect(apiKey).toHaveProperty('label')
        expect(apiKey).toHaveProperty('created_at')
        expect(apiKey).toHaveProperty('last_used_at')
        // Should not expose the actual key hash
        expect(apiKey).not.toHaveProperty('key_hash')
      }
    })

    test('should reject requests without authorization', async ({ request }) => {
      const response = await request.get(`${baseURL}/api-keys`)

      expect(response.status()).toBe(401)

      const body = await response.json()
      expect(body).toHaveProperty('error')
    })

    test('should reject requests with invalid authorization', async ({ request }) => {
      const response = await request.get(`${baseURL}/api-keys`, {
        headers: {
          'Authorization': 'Bearer invalid-token'
        }
      })

      expect(response.status()).toBe(401)

      const body = await response.json()
      expect(body).toHaveProperty('error')
    })

    test('should only return keys for authenticated user', async ({ request }) => {
      const response = await request.get(`${baseURL}/api-keys`, {
        headers: {
          'Authorization': `Bearer ${authToken}`
        }
      })

      expect(response.status()).toBe(200)

      const body = await response.json()
      // All keys should belong to the same user (implicitly tested by RLS)
      expect(Array.isArray(body)).toBe(true)
    })
  })

  test.describe('POST /api-keys', () => {
    test('should generate new API key with custom label', async ({ request }) => {
      const response = await request.post(`${baseURL}/api-keys`, {
        headers: {
          'Authorization': `Bearer ${authToken}`
        },
        data: {
          label: 'Test Raycast Extension'
        }
      })

      expect(response.status()).toBe(201)

      const body = await response.json()
      expect(body).toHaveProperty('id')
      expect(body).toHaveProperty('label', 'Test Raycast Extension')
      expect(body).toHaveProperty('api_key')
      expect(body).toHaveProperty('created_at')

      // API key should be a string with proper length
      expect(typeof body.api_key).toBe('string')
      expect(body.api_key.length).toBeGreaterThan(20)
    })

    test('should reject API key creation without label', async ({ request }) => {
      const response = await request.post(`${baseURL}/api-keys`, {
        headers: {
          'Authorization': `Bearer ${authToken}`
        },
        data: {}
      })

      expect(response.status()).toBe(400)

      const body = await response.json()
      expect(body).toHaveProperty('error')
    })

    test('should reject API key creation with empty label', async ({ request }) => {
      const response = await request.post(`${baseURL}/api-keys`, {
        headers: {
          'Authorization': `Bearer ${authToken}`
        },
        data: {
          label: ''
        }
      })

      expect(response.status()).toBe(400)

      const body = await response.json()
      expect(body).toHaveProperty('error')
    })

    test('should reject API key creation with label too long', async ({ request }) => {
      const longLabel = 'x'.repeat(51) // Over 50 character limit
      const response = await request.post(`${baseURL}/api-keys`, {
        headers: {
          'Authorization': `Bearer ${authToken}`
        },
        data: {
          label: longLabel
        }
      })

      expect(response.status()).toBe(400)

      const body = await response.json()
      expect(body).toHaveProperty('error')
    })

    test('should generate unique API keys', async ({ request }) => {
      const response1 = await request.post(`${baseURL}/api-keys`, {
        headers: {
          'Authorization': `Bearer ${authToken}`
        },
        data: {
          label: 'Test Key 1'
        }
      })

      const response2 = await request.post(`${baseURL}/api-keys`, {
        headers: {
          'Authorization': `Bearer ${authToken}`
        },
        data: {
          label: 'Test Key 2'
        }
      })

      if (response1.status() === 201 && response2.status() === 201) {
        const body1 = await response1.json()
        const body2 = await response2.json()

        expect(body1.api_key).not.toBe(body2.api_key)
        expect(body1.id).not.toBe(body2.id)
      }
    })

    test('should reject unauthenticated API key creation', async ({ request }) => {
      const response = await request.post(`${baseURL}/api-keys`, {
        data: {
          label: 'Test Key'
        }
      })

      expect(response.status()).toBe(401)
    })
  })

  test.describe('DELETE /api-keys/{key_id}', () => {
    let testKeyId: string

    test.beforeEach(async ({ request }) => {
      // Create a test API key to delete
      const createResponse = await request.post(`${baseURL}/api-keys`, {
        headers: {
          'Authorization': `Bearer ${authToken}`
        },
        data: {
          label: 'Key to Delete'
        }
      })

      if (createResponse.status() === 201) {
        const createBody = await createResponse.json()
        testKeyId = createBody.id
      }
    })

    test('should revoke API key successfully', async ({ request }) => {
      const response = await request.delete(`${baseURL}/api-keys/${testKeyId}`, {
        headers: {
          'Authorization': `Bearer ${authToken}`
        }
      })

      expect(response.status()).toBe(200)

      const body = await response.json()
      expect(body).toHaveProperty('message')
      expect(body.message).toContain('revoked')

      // Verify key is no longer in active list
      const listResponse = await request.get(`${baseURL}/api-keys`, {
        headers: {
          'Authorization': `Bearer ${authToken}`
        }
      })

      const listBody = await listResponse.json()
      const revokedKey = listBody.find((key: any) => key.id === testKeyId)
      expect(revokedKey).toBeDefined()
      expect(revokedKey.revoked_at).toBeDefined()
    })

    test('should reject revoking non-existent key', async ({ request }) => {
      const fakeKeyId = '00000000-0000-0000-0000-000000000999'
      const response = await request.delete(`${baseURL}/api-keys/${fakeKeyId}`, {
        headers: {
          'Authorization': `Bearer ${authToken}`
        }
      })

      expect(response.status()).toBe(404)

      const body = await response.json()
      expect(body).toHaveProperty('error')
    })

    test('should reject revoking key without authentication', async ({ request }) => {
      const response = await request.delete(`${baseURL}/api-keys/${testKeyId}`)

      expect(response.status()).toBe(401)
    })

    test('should not allow revoking other users keys', async ({ request }) => {
      // This test assumes another user's key ID
      const otherUserKeyId = '00000000-0000-0000-0000-000000000888'
      const response = await request.delete(`${baseURL}/api-keys/${otherUserKeyId}`, {
        headers: {
          'Authorization': `Bearer ${authToken}`
        }
      })

      expect(response.status()).toBe(404) // Should not find due to RLS
    })
  })

  test.describe('API Key Authentication', () => {
    let newApiKey: string

    test.beforeEach(async ({ request }) => {
      // Create a new API key for authentication tests
      const createResponse = await request.post(`${baseURL}/api-keys`, {
        headers: {
          'Authorization': `Bearer ${authToken}`
        },
        data: {
          label: 'Auth Test Key'
        }
      })

      if (createResponse.status() === 201) {
        const createBody = await createResponse.json()
        newApiKey = createBody.api_key
      }
    })

    test('should authenticate API requests with new key', async ({ request }) => {
      const response = await request.get(`${baseURL}/api-keys`, {
        headers: {
          'Authorization': `Bearer ${newApiKey}`
        }
      })

      expect(response.status()).toBe(200)
    })

    test('should update last_used_at when key is used', async ({ request }) => {
      // Use the key
      await request.get(`${baseURL}/api-keys`, {
        headers: {
          'Authorization': `Bearer ${newApiKey}`
        }
      })

      // Check that last_used_at was updated
      const listResponse = await request.get(`${baseURL}/api-keys`, {
        headers: {
          'Authorization': `Bearer ${authToken}`
        }
      })

      const listBody = await listResponse.json()
      const usedKey = listBody.find((key: any) => key.label === 'Auth Test Key')
      expect(usedKey).toBeDefined()
      expect(usedKey.last_used_at).toBeDefined()
    })
  })
})