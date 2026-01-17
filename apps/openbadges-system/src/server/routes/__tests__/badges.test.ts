import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { Hono } from 'hono'

// Mock JWT service - must be before any imports that use it
vi.mock('../../services/jwt', () => ({
  JWTService: vi.fn().mockImplementation(() => ({
    generatePlatformToken: vi.fn(() => 'mock-platform-token'),
    verifyToken: vi.fn(() => ({
      sub: 'test-user',
      platformId: 'urn:uuid:a504d862-bd64-4e0d-acff-db7955955bc1',
      displayName: 'Test User',
      email: 'test@example.com',
      metadata: { isAdmin: true },
    })),
  })),
  jwtService: {
    generatePlatformToken: vi.fn(() => 'mock-platform-token'),
    verifyToken: vi.fn(() => ({
      sub: 'test-user',
      platformId: 'urn:uuid:a504d862-bd64-4e0d-acff-db7955955bc1',
      displayName: 'Test User',
      email: 'test@example.com',
      metadata: { isAdmin: true },
    })),
  },
}))

// Mock logger
vi.mock('../../utils/logger', () => ({
  logger: {
    debug: vi.fn(),
    info: vi.fn(),
    warn: vi.fn(),
    error: vi.fn(),
  },
}))

// Mock OB2 validation middleware
vi.mock('../../middleware/ob2Validation', () => ({
  validateBadgeClassPayload: vi.fn((data: unknown) => ({ valid: true, data })),
  validateAssertionPayload: vi.fn((data: unknown) => ({ valid: true, data })),
  validateAchievementPayload: vi.fn((data: unknown) => ({ valid: true, data })),
  validateVerifiableCredentialPayload: vi.fn((data: unknown) => ({ valid: true, data })),
}))

import { badgesRoutes } from '../badges'
import { jwtService } from '../../services/jwt'
import {
  validateBadgeClassPayload,
  validateAssertionPayload,
  validateAchievementPayload,
  validateVerifiableCredentialPayload,
} from '../../middleware/ob2Validation'

// Store original fetch
const originalFetch = globalThis.fetch

function createApp() {
  const app = new Hono()
  app.route('/api/badges', badgesRoutes)
  return app
}

function mockFetchResponse(data: unknown, status = 200, contentType = 'application/json') {
  const mockFn = vi.fn().mockResolvedValue({
    ok: status >= 200 && status < 300,
    status,
    headers: new Headers({ 'content-type': contentType }),
    json: () => Promise.resolve(data),
    text: () => Promise.resolve(typeof data === 'string' ? data : JSON.stringify(data)),
  })
  // Cast to satisfy Bun's fetch type which includes preconnect
  return mockFn as unknown as typeof fetch
}

function mockFetchRejection(error: Error) {
  const mockFn = vi.fn().mockRejectedValue(error)
  return mockFn as unknown as typeof fetch
}

function mockFetchCustom(response: Partial<Response>) {
  const mockFn = vi.fn().mockResolvedValue(response)
  return mockFn as unknown as typeof fetch
}

describe('Badge Routes', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    // Set environment variable for tests
    process.env.OPENBADGES_SERVER_URL = 'http://localhost:3000'
  })

  afterEach(() => {
    // Restore original fetch
    globalThis.fetch = originalFetch
  })

  describe('POST /api/badges/verify', () => {
    it('should forward verification request to OpenBadges server', async () => {
      const mockVerifyResponse = {
        valid: true,
        verifiedAt: '2024-01-01T00:00:00Z',
      }
      globalThis.fetch = mockFetchResponse(mockVerifyResponse)

      const app = createApp()
      const res = await app.request('/api/badges/verify', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ credential: 'test-credential' }),
      })

      expect(res.status).toBe(200)
      const data = await res.json()
      expect(data.valid).toBe(true)
      expect(globalThis.fetch).toHaveBeenCalledWith(
        'http://localhost:3000/api/v1/verify',
        expect.objectContaining({
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
        })
      )
    })

    it('should return 400 for invalid JSON body', async () => {
      const app = createApp()
      const res = await app.request('/api/badges/verify', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: 'invalid json',
      })

      expect(res.status).toBe(400)
      const data = await res.json()
      expect(data.error).toBe('Invalid JSON body')
    })

    it('should return 500 on fetch errors', async () => {
      globalThis.fetch = mockFetchRejection(new Error('Network error'))

      const app = createApp()
      const res = await app.request('/api/badges/verify', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ credential: 'test' }),
      })

      expect(res.status).toBe(500)
      const data = await res.json()
      expect(data.valid).toBe(false)
      expect(data.errors).toContain('Verification service temporarily unavailable')
    })

    it('should handle non-JSON response from server', async () => {
      globalThis.fetch = mockFetchCustom({
        ok: true,
        status: 200,
        headers: new Headers({ 'content-type': 'text/plain' }),
        text: () => Promise.resolve('Plain text response'),
      } as Partial<Response>)

      const app = createApp()
      const res = await app.request('/api/badges/verify', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ credential: 'test' }),
      })

      expect(res.status).toBe(200)
      const text = await res.text()
      expect(text).toBe('Plain text response')
    })
  })

  describe('GET /api/badges/assertions/:id', () => {
    it('should retrieve assertion by ID', async () => {
      const mockAssertion = {
        id: 'urn:uuid:test-assertion',
        type: 'Assertion',
        recipient: { type: 'email', identity: 'test@example.com' },
      }
      globalThis.fetch = mockFetchResponse(mockAssertion)

      const app = createApp()
      const res = await app.request('/api/badges/assertions/urn:uuid:test-assertion')

      expect(res.status).toBe(200)
      const data = await res.json()
      expect(data.id).toBe('urn:uuid:test-assertion')
    })

    it('should return 404 for non-existent assertion', async () => {
      globalThis.fetch = mockFetchResponse({ error: 'Not found' }, 404)

      const app = createApp()
      const res = await app.request('/api/badges/assertions/non-existent')

      expect(res.status).toBe(404)
      const data = await res.json()
      expect(data.error).toBe('Assertion not found')
    })

    it('should handle URL-encoded assertion IDs', async () => {
      const mockAssertion = { id: 'urn:uuid:test-assertion' }
      globalThis.fetch = mockFetchResponse(mockAssertion)

      const app = createApp()
      const res = await app.request('/api/badges/assertions/urn%3Auuid%3Atest-assertion')

      expect(res.status).toBe(200)
      expect(globalThis.fetch).toHaveBeenCalledWith(
        expect.stringContaining('assertions/urn%3Auuid%3Atest-assertion'),
        expect.any(Object)
      )
    })

    it('should return 500 on server errors', async () => {
      globalThis.fetch = mockFetchRejection(new Error('Connection failed'))

      const app = createApp()
      const res = await app.request('/api/badges/assertions/test-id')

      expect(res.status).toBe(500)
      const data = await res.json()
      expect(data.error).toBe('Failed to retrieve assertion')
    })
  })

  describe('GET /api/badges/assertions', () => {
    it('should return 404 for missing assertion ID', async () => {
      const app = createApp()
      const res = await app.request('/api/badges/assertions')

      expect(res.status).toBe(404)
      const data = await res.json()
      expect(data.error).toBe('Assertion not found')
    })

    it('should return 404 for trailing slash', async () => {
      const app = createApp()
      const res = await app.request('/api/badges/assertions/')

      expect(res.status).toBe(404)
      const data = await res.json()
      expect(data.error).toBe('Assertion not found')
    })
  })

  describe('GET /api/badges/badge-classes', () => {
    it('should list badge classes', async () => {
      const mockBadgeClasses = [
        { id: 'badge-1', name: 'Test Badge 1' },
        { id: 'badge-2', name: 'Test Badge 2' },
      ]
      globalThis.fetch = mockFetchResponse(mockBadgeClasses)

      const app = createApp()
      const res = await app.request('/api/badges/badge-classes')

      expect(res.status).toBe(200)
      const data = await res.json()
      expect(data).toHaveLength(2)
    })

    it('should return error on server failure', async () => {
      globalThis.fetch = mockFetchResponse({ error: 'Server error' }, 500)

      const app = createApp()
      const res = await app.request('/api/badges/badge-classes')

      expect(res.status).toBe(500)
    })

    it('should return 500 on fetch errors', async () => {
      globalThis.fetch = mockFetchRejection(new Error('Network error'))

      const app = createApp()
      const res = await app.request('/api/badges/badge-classes')

      expect(res.status).toBe(500)
      const data = await res.json()
      expect(data.error).toBe('Failed to retrieve badge classes')
    })
  })

  describe('GET /api/badges/badge-classes/:id', () => {
    it('should retrieve badge class by ID', async () => {
      const mockBadgeClass = {
        id: 'badge-123',
        name: 'Test Badge',
        description: 'A test badge',
      }
      globalThis.fetch = mockFetchResponse(mockBadgeClass)

      const app = createApp()
      const res = await app.request('/api/badges/badge-classes/badge-123')

      expect(res.status).toBe(200)
      const data = await res.json()
      expect(data.name).toBe('Test Badge')
    })

    it('should return 404 for non-existent badge class', async () => {
      globalThis.fetch = mockFetchResponse({ error: 'Not found' }, 404)

      const app = createApp()
      const res = await app.request('/api/badges/badge-classes/non-existent')

      expect(res.status).toBe(404)
      const data = await res.json()
      expect(data.error).toBe('Badge class not found')
    })

    it('should return 500 on server errors', async () => {
      globalThis.fetch = mockFetchRejection(new Error('Connection failed'))

      const app = createApp()
      const res = await app.request('/api/badges/badge-classes/badge-123')

      expect(res.status).toBe(500)
      const data = await res.json()
      expect(data.error).toBe('Failed to retrieve badge class')
    })
  })

  describe('GET /api/badges/revocation-list', () => {
    it('should retrieve revocation list', async () => {
      const mockRevocationList = [{ id: 'revoked-1' }, { id: 'revoked-2' }]
      globalThis.fetch = mockFetchResponse(mockRevocationList)

      const app = createApp()
      const res = await app.request('/api/badges/revocation-list')

      expect(res.status).toBe(200)
      const data = await res.json()
      expect(data).toHaveLength(2)
    })

    it('should return empty list on server failure (fail open)', async () => {
      globalThis.fetch = mockFetchResponse({ error: 'Server error' }, 500)

      const app = createApp()
      const res = await app.request('/api/badges/revocation-list')

      expect(res.status).toBe(200)
      const data = await res.json()
      expect(data).toEqual([])
    })

    it('should return empty list on fetch errors (fail open)', async () => {
      globalThis.fetch = mockFetchRejection(new Error('Network error'))

      const app = createApp()
      const res = await app.request('/api/badges/revocation-list')

      expect(res.status).toBe(200)
      const data = await res.json()
      expect(data).toEqual([])
    })

    it('should return empty list for non-JSON response', async () => {
      globalThis.fetch = mockFetchCustom({
        ok: true,
        status: 200,
        headers: new Headers({ 'content-type': 'text/plain' }),
        text: () => Promise.resolve('Not JSON'),
      } as Partial<Response>)

      const app = createApp()
      const res = await app.request('/api/badges/revocation-list')

      expect(res.status).toBe(200)
      const data = await res.json()
      expect(data).toEqual([])
    })
  })

  describe('Authenticated Proxy (ALL /*)', () => {
    it('should return 401 for missing Authorization header', async () => {
      const app = createApp()
      const res = await app.request('/api/badges/some-endpoint')

      expect(res.status).toBe(401)
      const data = await res.json()
      expect(data.error).toBe('Platform token required')
    })

    it('should return 401 for non-Bearer token', async () => {
      const app = createApp()
      const res = await app.request('/api/badges/some-endpoint', {
        headers: { Authorization: 'Basic credentials' },
      })

      expect(res.status).toBe(401)
      const data = await res.json()
      expect(data.error).toBe('Platform token required')
    })

    it('should return 401 for invalid token', async () => {
      vi.mocked(jwtService.verifyToken).mockReturnValue(null as any)

      const app = createApp()
      const res = await app.request('/api/badges/some-endpoint', {
        headers: { Authorization: 'Bearer invalid-token' },
      })

      expect(res.status).toBe(401)
      const data = await res.json()
      expect(data.error).toBe('Invalid platform token')
    })

    it('should proxy GET request with valid token', async () => {
      vi.mocked(jwtService.verifyToken).mockReturnValue({
        sub: 'user-123',
      } as any)
      globalThis.fetch = mockFetchResponse({ success: true })

      const app = createApp()
      const res = await app.request('/api/badges/api/v2/issuers', {
        headers: { Authorization: 'Bearer valid-token' },
      })

      expect(res.status).toBe(200)
      expect(globalThis.fetch).toHaveBeenCalledWith(
        'http://localhost:3000/api/v2/issuers',
        expect.objectContaining({ method: 'GET' })
      )
    })

    it('should proxy POST request with body', async () => {
      vi.mocked(jwtService.verifyToken).mockReturnValue({
        sub: 'user-123',
      } as any)
      globalThis.fetch = mockFetchResponse({ id: 'new-badge' }, 201)

      const app = createApp()
      const res = await app.request('/api/badges/api/v2/badge-classes', {
        method: 'POST',
        headers: {
          Authorization: 'Bearer valid-token',
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ name: 'New Badge' }),
      })

      expect(res.status).toBe(201)
      expect(validateBadgeClassPayload).toHaveBeenCalledWith({ name: 'New Badge' })
    })

    it('should return 400 for invalid OB2 BadgeClass payload', async () => {
      vi.mocked(jwtService.verifyToken).mockReturnValue({ sub: 'user-123' } as any)
      vi.mocked(validateBadgeClassPayload).mockReturnValue({
        valid: false,
        report: [{ message: 'Missing required field: name' }],
      } as any)

      const app = createApp()
      const res = await app.request('/api/badges/api/v2/badge-classes', {
        method: 'POST',
        headers: {
          Authorization: 'Bearer valid-token',
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ description: 'No name' }),
      })

      expect(res.status).toBe(400)
      const data = await res.json()
      expect(data.error).toBe('Invalid OB2 BadgeClass payload')
      expect(data.report).toBeDefined()
    })

    it('should validate OB2 Assertion payload', async () => {
      vi.mocked(jwtService.verifyToken).mockReturnValue({ sub: 'user-123' } as any)
      vi.mocked(validateAssertionPayload).mockReturnValue({
        valid: false,
        report: [{ message: 'Invalid recipient' }],
      } as any)

      const app = createApp()
      const res = await app.request('/api/badges/api/v2/assertions', {
        method: 'POST',
        headers: {
          Authorization: 'Bearer valid-token',
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ badge: 'badge-123' }),
      })

      expect(res.status).toBe(400)
      const data = await res.json()
      expect(data.error).toBe('Invalid OB2 Assertion payload')
    })

    it('should validate OB3 Achievement payload', async () => {
      vi.mocked(jwtService.verifyToken).mockReturnValue({ sub: 'user-123' } as any)
      vi.mocked(validateAchievementPayload).mockReturnValue({
        valid: false,
        report: [{ message: 'Invalid achievement' }],
      } as any)

      const app = createApp()
      const res = await app.request('/api/badges/api/v3/achievements', {
        method: 'POST',
        headers: {
          Authorization: 'Bearer valid-token',
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ name: 'Test' }),
      })

      expect(res.status).toBe(400)
      const data = await res.json()
      expect(data.error).toBe('Invalid OB3 Achievement payload')
    })

    it('should validate OB3 VerifiableCredential payload', async () => {
      vi.mocked(jwtService.verifyToken).mockReturnValue({ sub: 'user-123' } as any)
      vi.mocked(validateVerifiableCredentialPayload).mockReturnValue({
        valid: false,
        report: [{ message: 'Invalid credential' }],
      } as any)

      const app = createApp()
      const res = await app.request('/api/badges/api/v3/credentials', {
        method: 'POST',
        headers: {
          Authorization: 'Bearer valid-token',
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ '@context': [] }),
      })

      expect(res.status).toBe(400)
      const data = await res.json()
      expect(data.error).toBe('Invalid OB3 VerifiableCredential payload')
    })

    it('should return 400 for invalid JSON body on POST', async () => {
      vi.mocked(jwtService.verifyToken).mockReturnValue({ sub: 'user-123' } as any)

      const app = createApp()
      const res = await app.request('/api/badges/api/v2/badge-classes', {
        method: 'POST',
        headers: {
          Authorization: 'Bearer valid-token',
          'Content-Type': 'application/json',
        },
        body: 'not valid json',
      })

      expect(res.status).toBe(400)
      const data = await res.json()
      expect(data.error).toBe('Invalid JSON body')
    })

    it('should return 500 on proxy fetch errors', async () => {
      vi.mocked(jwtService.verifyToken).mockReturnValue({ sub: 'user-123' } as any)
      globalThis.fetch = mockFetchRejection(new Error('Connection refused'))

      const app = createApp()
      const res = await app.request('/api/badges/api/v2/issuers', {
        headers: { Authorization: 'Bearer valid-token' },
      })

      expect(res.status).toBe(500)
      const data = await res.json()
      expect(data.error).toBe('Failed to communicate with OpenBadges server')
    })

    it('should handle non-JSON proxy response', async () => {
      vi.mocked(jwtService.verifyToken).mockReturnValue({ sub: 'user-123' } as any)
      globalThis.fetch = mockFetchCustom({
        ok: true,
        status: 200,
        headers: new Headers({ 'content-type': 'text/html' }),
        text: () => Promise.resolve('<html>Response</html>'),
      } as Partial<Response>)

      const app = createApp()
      const res = await app.request('/api/badges/api/v2/issuers', {
        headers: { Authorization: 'Bearer valid-token' },
      })

      expect(res.status).toBe(200)
      const text = await res.text()
      expect(text).toBe('<html>Response</html>')
    })

    it('should forward DELETE requests', async () => {
      vi.mocked(jwtService.verifyToken).mockReturnValue({ sub: 'user-123' } as any)
      globalThis.fetch = mockFetchResponse({ deleted: true })

      const app = createApp()
      const res = await app.request('/api/badges/api/v2/badge-classes/badge-123', {
        method: 'DELETE',
        headers: { Authorization: 'Bearer valid-token' },
      })

      expect(res.status).toBe(200)
      expect(globalThis.fetch).toHaveBeenCalledWith(
        'http://localhost:3000/api/v2/badge-classes/badge-123',
        expect.objectContaining({ method: 'DELETE' })
      )
    })

    it('should forward PUT requests with body', async () => {
      vi.mocked(jwtService.verifyToken).mockReturnValue({ sub: 'user-123' } as any)
      globalThis.fetch = mockFetchResponse({ updated: true })

      const app = createApp()
      const res = await app.request('/api/badges/api/v2/badge-classes/badge-123', {
        method: 'PUT',
        headers: {
          Authorization: 'Bearer valid-token',
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ name: 'Updated Badge' }),
      })

      expect(res.status).toBe(200)
      expect(globalThis.fetch).toHaveBeenCalledWith(
        'http://localhost:3000/api/v2/badge-classes/badge-123',
        expect.objectContaining({ method: 'PUT' })
      )
    })
  })
})
