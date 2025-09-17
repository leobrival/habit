import { test, expect } from '@playwright/test'

test.describe('Boards API', () => {
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

  test.describe('GET /boards', () => {
    test('should list user boards with authentication', async ({ request }) => {
      const response = await request.get(`${baseURL}/boards`, {
        headers: {
          'Authorization': `Bearer ${authToken}`
        }
      })

      expect(response.status()).toBe(200)

      const body = await response.json()
      expect(Array.isArray(body)).toBe(true)

      // Check structure of board objects
      if (body.length > 0) {
        const board = body[0]
        expect(board).toHaveProperty('id')
        expect(board).toHaveProperty('name')
        expect(board).toHaveProperty('description')
        expect(board).toHaveProperty('color')
        expect(board).toHaveProperty('icon')
        expect(board).toHaveProperty('created_at')
        expect(board).toHaveProperty('updated_at')
        expect(board).toHaveProperty('archived_at')
      }
    })

    test('should only return active boards by default', async ({ request }) => {
      const response = await request.get(`${baseURL}/boards`, {
        headers: {
          'Authorization': `Bearer ${authToken}`
        }
      })

      expect(response.status()).toBe(200)

      const body = await response.json()
      // All returned boards should have null archived_at
      body.forEach((board: any) => {
        expect(board.archived_at).toBeNull()
      })
    })

    test('should include archived boards when requested', async ({ request }) => {
      const response = await request.get(`${baseURL}/boards?include_archived=true`, {
        headers: {
          'Authorization': `Bearer ${authToken}`
        }
      })

      expect(response.status()).toBe(200)

      const body = await response.json()
      expect(Array.isArray(body)).toBe(true)
      // Should include boards with and without archived_at
    })

    test('should reject unauthenticated requests', async ({ request }) => {
      const response = await request.get(`${baseURL}/boards`)

      expect(response.status()).toBe(401)

      const body = await response.json()
      expect(body).toHaveProperty('error')
    })
  })

  test.describe('POST /boards', () => {
    test('should create board with required name only', async ({ request }) => {
      const response = await request.post(`${baseURL}/boards`, {
        headers: {
          'Authorization': `Bearer ${authToken}`
        },
        data: {
          name: 'Morning Exercise'
        }
      })

      expect(response.status()).toBe(201)

      const body = await response.json()
      expect(body).toHaveProperty('id')
      expect(body).toHaveProperty('name', 'Morning Exercise')
      expect(body).toHaveProperty('description')
      expect(body).toHaveProperty('color', '#22c55e') // Default color
      expect(body).toHaveProperty('icon')
      expect(body).toHaveProperty('created_at')
      expect(body).toHaveProperty('updated_at')
      expect(body.archived_at).toBeNull()
    })

    test('should create board with all fields', async ({ request }) => {
      const boardData = {
        name: 'Read Books',
        description: '30 minutes of daily reading',
        color: '#3b82f6',
        icon: '📚'
      }

      const response = await request.post(`${baseURL}/boards`, {
        headers: {
          'Authorization': `Bearer ${authToken}`
        },
        data: boardData
      })

      expect(response.status()).toBe(201)

      const body = await response.json()
      expect(body).toHaveProperty('name', boardData.name)
      expect(body).toHaveProperty('description', boardData.description)
      expect(body).toHaveProperty('color', boardData.color)
      expect(body).toHaveProperty('icon', boardData.icon)
    })

    test('should reject board creation without name', async ({ request }) => {
      const response = await request.post(`${baseURL}/boards`, {
        headers: {
          'Authorization': `Bearer ${authToken}`
        },
        data: {
          description: 'A board without a name'
        }
      })

      expect(response.status()).toBe(400)

      const body = await response.json()
      expect(body).toHaveProperty('error')
    })

    test('should reject board with empty name', async ({ request }) => {
      const response = await request.post(`${baseURL}/boards`, {
        headers: {
          'Authorization': `Bearer ${authToken}`
        },
        data: {
          name: ''
        }
      })

      expect(response.status()).toBe(400)

      const body = await response.json()
      expect(body).toHaveProperty('error')
    })

    test('should reject board with name too long', async ({ request }) => {
      const longName = 'x'.repeat(101) // Over 100 character limit
      const response = await request.post(`${baseURL}/boards`, {
        headers: {
          'Authorization': `Bearer ${authToken}`
        },
        data: {
          name: longName
        }
      })

      expect(response.status()).toBe(400)

      const body = await response.json()
      expect(body).toHaveProperty('error')
    })

    test('should reject board with invalid color format', async ({ request }) => {
      const response = await request.post(`${baseURL}/boards`, {
        headers: {
          'Authorization': `Bearer ${authToken}`
        },
        data: {
          name: 'Test Board',
          color: 'invalid-color'
        }
      })

      expect(response.status()).toBe(400)

      const body = await response.json()
      expect(body).toHaveProperty('error')
    })

    test('should reject board with description too long', async ({ request }) => {
      const longDescription = 'x'.repeat(501) // Over 500 character limit
      const response = await request.post(`${baseURL}/boards`, {
        headers: {
          'Authorization': `Bearer ${authToken}`
        },
        data: {
          name: 'Test Board',
          description: longDescription
        }
      })

      expect(response.status()).toBe(400)

      const body = await response.json()
      expect(body).toHaveProperty('error')
    })

    test('should reject unauthenticated board creation', async ({ request }) => {
      const response = await request.post(`${baseURL}/boards`, {
        data: {
          name: 'Unauthorized Board'
        }
      })

      expect(response.status()).toBe(401)
    })
  })

  test.describe('GET /boards/{board_id}', () => {
    let testBoardId: string

    test.beforeEach(async ({ request }) => {
      // Create a test board
      const createResponse = await request.post(`${baseURL}/boards`, {
        headers: {
          'Authorization': `Bearer ${authToken}`
        },
        data: {
          name: 'Test Board for Details',
          description: 'A board for testing details endpoint'
        }
      })

      if (createResponse.status() === 201) {
        const createBody = await createResponse.json()
        testBoardId = createBody.id
      }
    })

    test('should get board details successfully', async ({ request }) => {
      const response = await request.get(`${baseURL}/boards/${testBoardId}`, {
        headers: {
          'Authorization': `Bearer ${authToken}`
        }
      })

      expect(response.status()).toBe(200)

      const body = await response.json()
      expect(body).toHaveProperty('id', testBoardId)
      expect(body).toHaveProperty('name', 'Test Board for Details')
      expect(body).toHaveProperty('description', 'A board for testing details endpoint')
      expect(body).toHaveProperty('color')
      expect(body).toHaveProperty('created_at')
    })

    test('should reject request for non-existent board', async ({ request }) => {
      const fakeId = '00000000-0000-0000-0000-000000000999'
      const response = await request.get(`${baseURL}/boards/${fakeId}`, {
        headers: {
          'Authorization': `Bearer ${authToken}`
        }
      })

      expect(response.status()).toBe(404)

      const body = await response.json()
      expect(body).toHaveProperty('error')
    })

    test('should reject unauthenticated requests', async ({ request }) => {
      const response = await request.get(`${baseURL}/boards/${testBoardId}`)

      expect(response.status()).toBe(401)
    })
  })

  test.describe('PUT /boards/{board_id}', () => {
    let testBoardId: string

    test.beforeEach(async ({ request }) => {
      // Create a test board
      const createResponse = await request.post(`${baseURL}/boards`, {
        headers: {
          'Authorization': `Bearer ${authToken}`
        },
        data: {
          name: 'Board to Update',
          description: 'Original description'
        }
      })

      if (createResponse.status() === 201) {
        const createBody = await createResponse.json()
        testBoardId = createBody.id
      }
    })

    test('should update board properties successfully', async ({ request }) => {
      const updateData = {
        name: 'Updated Board Name',
        description: 'Updated description',
        color: '#ef4444'
      }

      const response = await request.put(`${baseURL}/boards/${testBoardId}`, {
        headers: {
          'Authorization': `Bearer ${authToken}`
        },
        data: updateData
      })

      expect(response.status()).toBe(200)

      const body = await response.json()
      expect(body).toHaveProperty('name', updateData.name)
      expect(body).toHaveProperty('description', updateData.description)
      expect(body).toHaveProperty('color', updateData.color)
      expect(body).toHaveProperty('updated_at')
    })

    test('should update partial board properties', async ({ request }) => {
      const response = await request.put(`${baseURL}/boards/${testBoardId}`, {
        headers: {
          'Authorization': `Bearer ${authToken}`
        },
        data: {
          name: 'Partially Updated'
        }
      })

      expect(response.status()).toBe(200)

      const body = await response.json()
      expect(body).toHaveProperty('name', 'Partially Updated')
      expect(body).toHaveProperty('description', 'Original description') // Should remain unchanged
    })

    test('should reject update with invalid data', async ({ request }) => {
      const response = await request.put(`${baseURL}/boards/${testBoardId}`, {
        headers: {
          'Authorization': `Bearer ${authToken}`
        },
        data: {
          name: '', // Empty name should be rejected
          color: 'invalid-color'
        }
      })

      expect(response.status()).toBe(400)

      const body = await response.json()
      expect(body).toHaveProperty('error')
    })

    test('should reject update for non-existent board', async ({ request }) => {
      const fakeId = '00000000-0000-0000-0000-000000000999'
      const response = await request.put(`${baseURL}/boards/${fakeId}`, {
        headers: {
          'Authorization': `Bearer ${authToken}`
        },
        data: {
          name: 'Updated Name'
        }
      })

      expect(response.status()).toBe(404)
    })

    test('should reject unauthenticated updates', async ({ request }) => {
      const response = await request.put(`${baseURL}/boards/${testBoardId}`, {
        data: {
          name: 'Unauthorized Update'
        }
      })

      expect(response.status()).toBe(401)
    })
  })

  test.describe('DELETE /boards/{board_id}', () => {
    let testBoardId: string

    test.beforeEach(async ({ request }) => {
      // Create a test board
      const createResponse = await request.post(`${baseURL}/boards`, {
        headers: {
          'Authorization': `Bearer ${authToken}`
        },
        data: {
          name: 'Board to Archive'
        }
      })

      if (createResponse.status() === 201) {
        const createBody = await createResponse.json()
        testBoardId = createBody.id
      }
    })

    test('should archive board successfully (soft delete)', async ({ request }) => {
      const response = await request.delete(`${baseURL}/boards/${testBoardId}`, {
        headers: {
          'Authorization': `Bearer ${authToken}`
        }
      })

      expect(response.status()).toBe(200)

      const body = await response.json()
      expect(body).toHaveProperty('message')
      expect(body.message).toContain('archived')

      // Verify board is not in active list
      const listResponse = await request.get(`${baseURL}/boards`, {
        headers: {
          'Authorization': `Bearer ${authToken}`
        }
      })

      const listBody = await listResponse.json()
      const archivedBoard = listBody.find((board: any) => board.id === testBoardId)
      expect(archivedBoard).toBeUndefined()

      // Verify board still exists when including archived
      const allBoardsResponse = await request.get(`${baseURL}/boards?include_archived=true`, {
        headers: {
          'Authorization': `Bearer ${authToken}`
        }
      })

      const allBoardsBody = await allBoardsResponse.json()
      const foundBoard = allBoardsBody.find((board: any) => board.id === testBoardId)
      expect(foundBoard).toBeDefined()
      expect(foundBoard.archived_at).toBeDefined()
    })

    test('should reject archive for non-existent board', async ({ request }) => {
      const fakeId = '00000000-0000-0000-0000-000000000999'
      const response = await request.delete(`${baseURL}/boards/${fakeId}`, {
        headers: {
          'Authorization': `Bearer ${authToken}`
        }
      })

      expect(response.status()).toBe(404)
    })

    test('should reject unauthenticated archive attempts', async ({ request }) => {
      const response = await request.delete(`${baseURL}/boards/${testBoardId}`)

      expect(response.status()).toBe(401)
    })
  })
})