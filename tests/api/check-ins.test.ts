import { test, expect } from '@playwright/test'

test.describe('Check-ins API', () => {
  const baseURL = 'http://localhost:3000/api'
  let authToken: string
  let testBoardId: string

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

      // Create a test board for check-ins
      const boardResponse = await request.post(`${baseURL}/boards`, {
        headers: {
          'Authorization': `Bearer ${authToken}`
        },
        data: {
          name: 'Test Check-in Board'
        }
      })

      if (boardResponse.status() === 201) {
        const boardBody = await boardResponse.json()
        testBoardId = boardBody.id
      }
    }
  })

  test.describe('POST /boards/{board_id}/check-ins', () => {
    test('should create check-in for specific date and board', async ({ request }) => {
      const checkInData = {
        date: '2025-09-17',
        completed: true,
        notes: '30 minute workout completed'
      }

      const response = await request.post(`${baseURL}/boards/${testBoardId}/check-ins`, {
        headers: {
          'Authorization': `Bearer ${authToken}`
        },
        data: checkInData
      })

      expect(response.status()).toBe(201)

      const body = await response.json()
      expect(body).toHaveProperty('id')
      expect(body).toHaveProperty('board_id', testBoardId)
      expect(body).toHaveProperty('date', checkInData.date)
      expect(body).toHaveProperty('completed', checkInData.completed)
      expect(body).toHaveProperty('notes', checkInData.notes)
      expect(body).toHaveProperty('created_at')
      expect(body).toHaveProperty('updated_at')
    })

    test('should create check-in with minimal data', async ({ request }) => {
      const checkInData = {
        date: '2025-09-16',
        completed: false
      }

      const response = await request.post(`${baseURL}/boards/${testBoardId}/check-ins`, {
        headers: {
          'Authorization': `Bearer ${authToken}`
        },
        data: checkInData
      })

      expect(response.status()).toBe(201)

      const body = await response.json()
      expect(body).toHaveProperty('completed', false)
      expect(body).toHaveProperty('notes', null)
    })

    test('should reject check-in without required fields', async ({ request }) => {
      const response = await request.post(`${baseURL}/boards/${testBoardId}/check-ins`, {
        headers: {
          'Authorization': `Bearer ${authToken}`
        },
        data: {
          notes: 'Missing date and completed'
        }
      })

      expect(response.status()).toBe(400)

      const body = await response.json()
      expect(body).toHaveProperty('error')
    })

    test('should reject check-in with invalid date format', async ({ request }) => {
      const response = await request.post(`${baseURL}/boards/${testBoardId}/check-ins`, {
        headers: {
          'Authorization': `Bearer ${authToken}`
        },
        data: {
          date: 'invalid-date',
          completed: true
        }
      })

      expect(response.status()).toBe(400)

      const body = await response.json()
      expect(body).toHaveProperty('error')
    })

    test('should reject check-in for future date beyond limit', async ({ request }) => {
      const futureDate = new Date()
      futureDate.setDate(futureDate.getDate() + 2) // More than 1 day in future

      const response = await request.post(`${baseURL}/boards/${testBoardId}/check-ins`, {
        headers: {
          'Authorization': `Bearer ${authToken}`
        },
        data: {
          date: futureDate.toISOString().split('T')[0],
          completed: true
        }
      })

      expect(response.status()).toBe(400)

      const body = await response.json()
      expect(body).toHaveProperty('error')
    })

    test('should reject duplicate check-in for same board and date', async ({ request }) => {
      const checkInData = {
        date: '2025-09-15',
        completed: true
      }

      // Create first check-in
      const firstResponse = await request.post(`${baseURL}/boards/${testBoardId}/check-ins`, {
        headers: {
          'Authorization': `Bearer ${authToken}`
        },
        data: checkInData
      })

      expect(firstResponse.status()).toBe(201)

      // Attempt to create duplicate
      const duplicateResponse = await request.post(`${baseURL}/boards/${testBoardId}/check-ins`, {
        headers: {
          'Authorization': `Bearer ${authToken}`
        },
        data: checkInData
      })

      expect(duplicateResponse.status()).toBe(409) // Conflict

      const body = await duplicateResponse.json()
      expect(body).toHaveProperty('error')
      expect(body.error).toContain('already exists')
    })

    test('should reject check-in with notes too long', async ({ request }) => {
      const longNotes = 'x'.repeat(1001) // Over 1000 character limit

      const response = await request.post(`${baseURL}/boards/${testBoardId}/check-ins`, {
        headers: {
          'Authorization': `Bearer ${authToken}`
        },
        data: {
          date: '2025-09-14',
          completed: true,
          notes: longNotes
        }
      })

      expect(response.status()).toBe(400)

      const body = await response.json()
      expect(body).toHaveProperty('error')
    })

    test('should reject check-in for non-existent board', async ({ request }) => {
      const fakeId = '00000000-0000-0000-0000-000000000999'

      const response = await request.post(`${baseURL}/boards/${fakeId}/check-ins`, {
        headers: {
          'Authorization': `Bearer ${authToken}`
        },
        data: {
          date: '2025-09-13',
          completed: true
        }
      })

      expect(response.status()).toBe(404)
    })

    test('should reject unauthenticated check-in creation', async ({ request }) => {
      const response = await request.post(`${baseURL}/boards/${testBoardId}/check-ins`, {
        data: {
          date: '2025-09-12',
          completed: true
        }
      })

      expect(response.status()).toBe(401)
    })
  })

  test.describe('PUT /check-ins/{check_in_id}', () => {
    let testCheckInId: string

    test.beforeEach(async ({ request }) => {
      // Create a test check-in
      const createResponse = await request.post(`${baseURL}/boards/${testBoardId}/check-ins`, {
        headers: {
          'Authorization': `Bearer ${authToken}`
        },
        data: {
          date: '2025-09-11',
          completed: false,
          notes: 'Original notes'
        }
      })

      if (createResponse.status() === 201) {
        const createBody = await createResponse.json()
        testCheckInId = createBody.id
      }
    })

    test('should update check-in completion status and notes', async ({ request }) => {
      const updateData = {
        completed: true,
        notes: 'Updated notes - workout completed'
      }

      const response = await request.put(`${baseURL}/check-ins/${testCheckInId}`, {
        headers: {
          'Authorization': `Bearer ${authToken}`
        },
        data: updateData
      })

      expect(response.status()).toBe(200)

      const body = await response.json()
      expect(body).toHaveProperty('completed', true)
      expect(body).toHaveProperty('notes', updateData.notes)
      expect(body).toHaveProperty('updated_at')
    })

    test('should update partial check-in properties', async ({ request }) => {
      const response = await request.put(`${baseURL}/check-ins/${testCheckInId}`, {
        headers: {
          'Authorization': `Bearer ${authToken}`
        },
        data: {
          completed: true
        }
      })

      expect(response.status()).toBe(200)

      const body = await response.json()
      expect(body).toHaveProperty('completed', true)
      expect(body).toHaveProperty('notes', 'Original notes') // Should remain unchanged
    })

    test('should allow clearing notes', async ({ request }) => {
      const response = await request.put(`${baseURL}/check-ins/${testCheckInId}`, {
        headers: {
          'Authorization': `Bearer ${authToken}`
        },
        data: {
          notes: null
        }
      })

      expect(response.status()).toBe(200)

      const body = await response.json()
      expect(body).toHaveProperty('notes', null)
    })

    test('should reject update with invalid data', async ({ request }) => {
      const response = await request.put(`${baseURL}/check-ins/${testCheckInId}`, {
        headers: {
          'Authorization': `Bearer ${authToken}`
        },
        data: {
          completed: 'not-boolean',
          notes: 'x'.repeat(1001) // Too long
        }
      })

      expect(response.status()).toBe(400)

      const body = await response.json()
      expect(body).toHaveProperty('error')
    })

    test('should reject update for non-existent check-in', async ({ request }) => {
      const fakeId = '00000000-0000-0000-0000-000000000999'

      const response = await request.put(`${baseURL}/check-ins/${fakeId}`, {
        headers: {
          'Authorization': `Bearer ${authToken}`
        },
        data: {
          completed: true
        }
      })

      expect(response.status()).toBe(404)
    })

    test('should reject unauthenticated updates', async ({ request }) => {
      const response = await request.put(`${baseURL}/check-ins/${testCheckInId}`, {
        data: {
          completed: true
        }
      })

      expect(response.status()).toBe(401)
    })
  })

  test.describe('DELETE /check-ins/{check_in_id}', () => {
    let testCheckInId: string

    test.beforeEach(async ({ request }) => {
      // Create a test check-in
      const createResponse = await request.post(`${baseURL}/boards/${testBoardId}/check-ins`, {
        headers: {
          'Authorization': `Bearer ${authToken}`
        },
        data: {
          date: '2025-09-10',
          completed: true,
          notes: 'Check-in to delete'
        }
      })

      if (createResponse.status() === 201) {
        const createBody = await createResponse.json()
        testCheckInId = createBody.id
      }
    })

    test('should delete check-in successfully', async ({ request }) => {
      const response = await request.delete(`${baseURL}/check-ins/${testCheckInId}`, {
        headers: {
          'Authorization': `Bearer ${authToken}`
        }
      })

      expect(response.status()).toBe(200)

      const body = await response.json()
      expect(body).toHaveProperty('message')
      expect(body.message).toContain('deleted')

      // Verify check-in is actually deleted
      const getResponse = await request.get(`${baseURL}/check-ins/${testCheckInId}`, {
        headers: {
          'Authorization': `Bearer ${authToken}`
        }
      })

      expect(getResponse.status()).toBe(404)
    })

    test('should reject deletion for non-existent check-in', async ({ request }) => {
      const fakeId = '00000000-0000-0000-0000-000000000999'

      const response = await request.delete(`${baseURL}/check-ins/${fakeId}`, {
        headers: {
          'Authorization': `Bearer ${authToken}`
        }
      })

      expect(response.status()).toBe(404)
    })

    test('should reject unauthenticated deletion', async ({ request }) => {
      const response = await request.delete(`${baseURL}/check-ins/${testCheckInId}`)

      expect(response.status()).toBe(401)
    })
  })

  test.describe('GET /boards/{board_id}/check-ins', () => {
    test.beforeEach(async ({ request }) => {
      // Create some test check-ins
      const checkIns = [
        { date: '2025-09-09', completed: true, notes: 'Great workout' },
        { date: '2025-09-08', completed: false, notes: null },
        { date: '2025-09-07', completed: true, notes: 'Missed morning, did evening' }
      ]

      for (const checkIn of checkIns) {
        await request.post(`${baseURL}/boards/${testBoardId}/check-ins`, {
          headers: {
            'Authorization': `Bearer ${authToken}`
          },
          data: checkIn
        })
      }
    })

    test('should list check-ins for board', async ({ request }) => {
      const response = await request.get(`${baseURL}/boards/${testBoardId}/check-ins`, {
        headers: {
          'Authorization': `Bearer ${authToken}`
        }
      })

      expect(response.status()).toBe(200)

      const body = await response.json()
      expect(Array.isArray(body)).toBe(true)
      expect(body.length).toBeGreaterThan(0)

      // Check structure of check-in objects
      const checkIn = body[0]
      expect(checkIn).toHaveProperty('id')
      expect(checkIn).toHaveProperty('board_id', testBoardId)
      expect(checkIn).toHaveProperty('date')
      expect(checkIn).toHaveProperty('completed')
      expect(checkIn).toHaveProperty('notes')
      expect(checkIn).toHaveProperty('created_at')
    })

    test('should filter check-ins by date range', async ({ request }) => {
      const response = await request.get(`${baseURL}/boards/${testBoardId}/check-ins?start_date=2025-09-08&end_date=2025-09-09`, {
        headers: {
          'Authorization': `Bearer ${authToken}`
        }
      })

      expect(response.status()).toBe(200)

      const body = await response.json()
      expect(Array.isArray(body)).toBe(true)

      // Should only include check-ins from specified date range
      body.forEach((checkIn: any) => {
        expect(checkIn.date).toMatch(/2025-09-0[89]/)
      })
    })

    test('should reject unauthenticated requests', async ({ request }) => {
      const response = await request.get(`${baseURL}/boards/${testBoardId}/check-ins`)

      expect(response.status()).toBe(401)
    })
  })

  test.describe('Data Isolation', () => {
    test('should not allow access to other users check-ins', async ({ request }) => {
      // This test verifies Row Level Security is working
      // Using another user's token should not show any check-ins
      const otherUserToken = 'different-user-token'

      const response = await request.get(`${baseURL}/boards/${testBoardId}/check-ins`, {
        headers: {
          'Authorization': `Bearer ${otherUserToken}`
        }
      })

      // Should either return 401 (invalid token) or empty array (valid token, different user)
      expect([401, 200]).toContain(response.status())

      if (response.status() === 200) {
        const body = await response.json()
        expect(body).toEqual([]) // Should be empty due to RLS
      }
    })
  })
})