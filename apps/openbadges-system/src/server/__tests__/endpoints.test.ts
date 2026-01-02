import { describe, it, expect, vi, beforeEach } from 'vitest'
import type { ExecutionContext } from 'hono'

// Mock JWT service before any imports that might load it
vi.mock('../services/jwt', () => ({
  jwtService: {
    verifyToken: vi.fn(() => ({
      sub: 'test-user',
      platformId: 'urn:uuid:a504d862-bd64-4e0d-acff-db7955955bc1',
      displayName: 'Test User',
      email: 'test@example.com',
      metadata: { isAdmin: true },
    })),
    generatePlatformToken: vi.fn(() => 'mock-platform-token'),
    createOpenBadgesApiClient: vi.fn(() => ({
      token: 'mock-jwt-token',
      headers: {
        Authorization: 'Bearer mock-jwt-token',
        'Content-Type': 'application/json',
      },
    })),
  },
  JWTService: vi.fn(),
}))

// SQLite and fetch mocks are configured in test.setup.ts

describe('Server Endpoints', () => {
  let app: {
    fetch: (
      request: Request,
      env?: unknown,
      executionCtx?: ExecutionContext | undefined
    ) => Response | Promise<Response>
  }
  let mockFetch: ReturnType<typeof vi.fn>

  beforeEach(async () => {
    vi.clearAllMocks()
    vi.resetModules()
    mockFetch = vi.mocked(fetch)

    // Import the server app dynamically to ensure mocks are applied
    const serverModule = await import('../index')
    app = { fetch: serverModule.default.fetch }
  })

  describe('Health endpoint', () => {
    it('should return health status', async () => {
      const req = new Request('http://localhost/api/health')
      const res = await app.fetch(req)

      expect(res.status).toBe(200)
      const data = await res.json()
      expect(data.status).toBe('ok')
      expect(data.timestamp).toBeTruthy()
    })
  })

  describe('Platform token endpoint', () => {
    it('should generate platform token for valid user', async () => {
      const mockUser = {
        id: 'test-user',
        username: 'testuser',
        email: 'test@example.com',
        firstName: 'Test',
        lastName: 'User',
        isAdmin: false,
      }

      const req = new Request('http://localhost/api/auth/platform-token', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: 'Bearer admin-token' },
        body: JSON.stringify({ user: mockUser }),
      })

      const res = await app.fetch(req)

      expect(res.status).toBe(200)
      const data = await res.json()
      expect(data.success).toBe(true)
      expect(data.token).toBe('mock-jwt-token')
      expect(data.platformId).toBe('urn:uuid:a504d862-bd64-4e0d-acff-db7955955bc1')
    })

    it('should return 400 for invalid user data', async () => {
      const req = new Request('http://localhost/api/auth/platform-token', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: 'Bearer admin-token' },
        body: JSON.stringify({ user: { id: null } }),
      })

      const res = await app.fetch(req)

      expect(res.status).toBe(400)
      const data = await res.json()
      expect(data.error).toBe('Invalid user data')
    })

    it('should return 400 for missing user data', async () => {
      const req = new Request('http://localhost/api/auth/platform-token', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: 'Bearer admin-token' },
        body: JSON.stringify({}),
      })

      const res = await app.fetch(req)

      expect(res.status).toBe(400)
      const data = await res.json()
      expect(data.error).toBe('Invalid user data')
    })
  })

  describe('OpenBadges proxy endpoint', () => {
    it('should proxy requests to OpenBadges server with authentication', async () => {
      const mockOpenBadgesResponse = {
        assertions: [{ id: 'assertion-1', badgeClass: 'badge-1', recipient: 'test@example.com' }],
        total: 1,
      }

      mockFetch.mockResolvedValueOnce({
        ok: true,
        headers: new Headers({ 'content-type': 'application/json' }),
        json: () => Promise.resolve(mockOpenBadgesResponse),
      })

      const req = new Request('http://localhost/api/badges/api/v1/assertions', {
        method: 'GET',
        headers: { Authorization: 'Bearer test-platform-token' },
      })

      const res = await app.fetch(req)

      expect(res.status).toBe(200)
      const data = await res.json()
      expect(data).toEqual(mockOpenBadgesResponse)

      expect(mockFetch).toHaveBeenCalledWith('http://localhost:3000/api/v1/assertions', {
        method: 'GET',
        headers: expect.objectContaining({
          Authorization: 'Bearer test-platform-token',
        }),
        body: undefined,
      })
    })

    it('should return 401 for requests without authentication', async () => {
      const req = new Request('http://localhost/api/badges/api/v1/assertions', {
        method: 'GET',
      })

      const res = await app.fetch(req)

      expect(res.status).toBe(401)
      const data = await res.json()
      expect(data.error).toBe('Platform token required')
    })

    it('should return 401 for requests with invalid authentication format', async () => {
      const req = new Request('http://localhost/api/badges/api/v1/assertions', {
        method: 'GET',
        headers: { Authorization: 'Invalid token-format' },
      })

      const res = await app.fetch(req)

      expect(res.status).toBe(401)
      const data = await res.json()
      expect(data.error).toBe('Platform token required')
    })

    it('should handle OpenBadges server errors', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: false,
        status: 500,
        headers: new Headers({ 'content-type': 'application/json' }),
        json: () => Promise.resolve({ error: 'Internal server error' }),
      })

      const req = new Request('http://localhost/api/badges/api/v1/assertions', {
        method: 'GET',
        headers: { Authorization: 'Bearer test-platform-token' },
      })

      const res = await app.fetch(req)

      expect(res.status).toBe(500)
    })

    it('should handle non-JSON responses from OpenBadges server', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        status: 200,
        headers: new Headers({ 'content-type': 'text/plain' }),
        text: () => Promise.resolve('Plain text response'),
      })

      const req = new Request('http://localhost/api/badges/api/v1/assertions', {
        method: 'GET',
        headers: { Authorization: 'Bearer test-platform-token' },
      })

      const res = await app.fetch(req)

      expect(res.status).toBe(200)
      const text = await res.text()
      expect(text).toBe('Plain text response')
    })

    it('should handle OpenBadges server connection errors', async () => {
      mockFetch.mockRejectedValueOnce(new Error('Connection failed'))

      const req = new Request('http://localhost/api/badges/api/v1/assertions', {
        method: 'GET',
        headers: { Authorization: 'Bearer test-platform-token' },
      })

      const res = await app.fetch(req)

      expect(res.status).toBe(500)
      const data = await res.json()
      expect(data.error).toBe('Failed to communicate with OpenBadges server')
    })

    it('should proxy POST requests with body', async () => {
      const requestBody = {
        badgeClass: 'badge-class-1',
        recipient: 'test@example.com',
        evidence: 'Test evidence',
        narrative: 'Test narrative',
      }

      const mockOpenBadgesResponse = {
        id: 'new-assertion-id',
        ...requestBody,
      }

      mockFetch.mockResolvedValueOnce({
        ok: true,
        headers: new Headers({ 'content-type': 'application/json' }),
        json: () => Promise.resolve(mockOpenBadgesResponse),
      })

      const req = new Request('http://localhost/api/badges/api/v1/assertions', {
        method: 'POST',
        headers: {
          Authorization: 'Bearer test-platform-token',
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(requestBody),
      })

      const res = await app.fetch(req)

      expect(res.status).toBe(200)
      const data = await res.json()
      expect(data).toEqual(mockOpenBadgesResponse)

      expect(mockFetch).toHaveBeenCalledWith('http://localhost:3000/api/v1/assertions', {
        method: 'POST',
        headers: expect.objectContaining({
          Authorization: 'Bearer test-platform-token',
        }),
        body: expect.any(ReadableStream),
      })
    })
  })

  describe('OpenBadges server proxy (legacy endpoint)', () => {
    it('should proxy requests to OpenBadges server with basic auth', async () => {
      const mockOpenBadgesResponse = {
        status: 'ok',
        timestamp: new Date().toISOString(),
      }

      mockFetch.mockResolvedValueOnce({
        ok: true,
        headers: new Headers({ 'content-type': 'application/json' }),
        json: () => Promise.resolve(mockOpenBadgesResponse),
      })

      const req = new Request('http://localhost/api/bs/health', {
        method: 'GET',
      })

      const res = await app.fetch(req)

      expect(res.status).toBe(200)
      const data = await res.json()
      expect(data).toEqual(mockOpenBadgesResponse)

      expect(mockFetch).toHaveBeenCalledWith(
        'http://localhost:3000/health',
        expect.objectContaining({
          method: 'GET',
          headers: expect.any(Headers),
        })
      )
    })

    it('should handle OpenBadges server errors in legacy endpoint', async () => {
      mockFetch.mockRejectedValueOnce(new Error('Connection failed'))

      const req = new Request('http://localhost/api/bs/health', {
        method: 'GET',
      })

      const res = await app.fetch(req)

      expect(res.status).toBe(500)
      const data = await res.json()
      expect(data.error).toBe('Failed to communicate with local OpenBadges server')
    })
  })

  describe('CORS handling', () => {
    it('should handle OPTIONS requests', async () => {
      const req = new Request('http://localhost/api/health', {
        method: 'OPTIONS',
      })

      const res = await app.fetch(req)

      expect(res.status).toBe(204)
    })
  })

  describe('Error scenarios', () => {
    it('should handle 404 for non-existent endpoints', async () => {
      const req = new Request('http://localhost/api/nonexistent', {
        method: 'GET',
      })

      const res = await app.fetch(req)

      expect(res.status).toBe(404)
    })

    it('should handle malformed JSON in platform token request', async () => {
      const req = new Request('http://localhost/api/auth/platform-token', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: 'invalid json',
      })

      const res = await app.fetch(req)

      // Without Authorization, route is protected by requireAdmin and returns 401
      // The JSON parse error would return 400/500 only after auth passes
      expect(res.status).toBe(401)
    })
  })

  describe('Badge Verification Endpoints', () => {
    describe('POST /api/badges/verify', () => {
      it('should forward verification request to OpenBadges server', async () => {
        const verificationRequest = {
          assertion: {
            id: 'https://example.org/assertions/12345',
            type: 'Assertion',
            recipient: { type: 'email', identity: 'test@example.com' },
            badge: 'https://example.org/badges/test-badge',
            verification: { type: 'hosted' },
            issuedOn: '2024-01-15T10:00:00Z',
          },
          badgeClass: {
            id: 'https://example.org/badges/test-badge',
            type: 'BadgeClass',
            name: 'Test Badge',
            description: 'A test badge',
            image: 'https://example.org/images/test-badge.png',
            criteria: 'https://example.org/criteria/test-badge',
            issuer: {
              id: 'https://example.org/issuers/test-issuer',
              type: 'Profile',
              name: 'Test Issuer',
            },
          },
        }

        const mockVerificationResponse = {
          valid: true,
          signatureValid: true,
          issuerVerified: true,
          errors: [],
          warnings: [],
        }

        mockFetch.mockResolvedValueOnce({
          ok: true,
          headers: new Headers({ 'content-type': 'application/json' }),
          json: vi.fn().mockResolvedValue(mockVerificationResponse),
        })

        const req = new Request('http://localhost/api/badges/verify', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(verificationRequest),
        })

        const res = await app.fetch(req)
        const data = await res.json()

        expect(res.status).toBe(200)
        expect(data).toEqual(mockVerificationResponse)
        expect(mockFetch).toHaveBeenCalledWith(
          'http://localhost:3000/api/v1/verify',
          expect.objectContaining({
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(verificationRequest),
          })
        )
      })

      it('should handle invalid verification request', async () => {
        mockFetch.mockResolvedValueOnce({
          ok: false,
          status: 400,
          headers: new Headers({ 'content-type': 'application/json' }),
          json: vi.fn().mockResolvedValue({ error: 'Invalid assertion data' }),
        })

        const req = new Request('http://localhost/api/badges/verify', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ invalid: 'data' }),
        })

        const res = await app.fetch(req)

        expect(res.status).toBe(400)
      })

      it('should handle malformed JSON in verification request', async () => {
        const req = new Request('http://localhost/api/badges/verify', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: 'invalid json',
        })

        const res = await app.fetch(req)
        const data = await res.json()

        expect(res.status).toBe(400)
        expect(data.error).toBe('Invalid JSON body')
      })

      it('should handle verification service failure', async () => {
        mockFetch.mockRejectedValueOnce(new Error('Service unavailable'))

        const req = new Request('http://localhost/api/badges/verify', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ test: 'data' }),
        })

        const res = await app.fetch(req)
        const data = await res.json()

        expect(res.status).toBe(500)
        expect(data.valid).toBe(false)
        expect(data.errors).toContain('Verification service temporarily unavailable')
      })
    })

    describe('GET /api/badges/assertions/:id', () => {
      it('should retrieve assertion by ID', async () => {
        const mockAssertion = {
          id: 'https://example.org/assertions/12345',
          type: 'Assertion',
          recipient: { type: 'email', identity: 'test@example.com' },
          badge: 'https://example.org/badges/test-badge',
          verification: { type: 'hosted' },
          issuedOn: '2024-01-15T10:00:00Z',
        }

        mockFetch.mockResolvedValueOnce({
          ok: true,
          headers: new Headers({ 'content-type': 'application/json' }),
          json: vi.fn().mockResolvedValue(mockAssertion),
        })

        const req = new Request('http://localhost/api/badges/assertions/12345')
        const res = await app.fetch(req)
        const data = await res.json()

        expect(res.status).toBe(200)
        expect(data).toEqual(mockAssertion)
        expect(mockFetch).toHaveBeenCalledWith(
          'http://localhost:3000/api/v1/assertions/12345',
          expect.objectContaining({
            method: 'GET',
            headers: { 'Content-Type': 'application/json' },
          })
        )
      })

      it('should handle assertion not found', async () => {
        mockFetch.mockResolvedValueOnce({
          ok: false,
          status: 404,
          headers: new Headers({ 'content-type': 'application/json' }),
          json: vi.fn().mockResolvedValue({ error: 'Assertion not found' }),
        })

        const req = new Request('http://localhost/api/badges/assertions/non-existent')
        const res = await app.fetch(req)
        const data = await res.json()

        expect(res.status).toBe(404)
        expect(data.error).toBe('Assertion not found')
      })

      it('should handle missing assertion ID', async () => {
        const req = new Request('http://localhost/api/badges/assertions/')
        const res = await app.fetch(req)

        expect(res.status).toBe(404)
      })
    })

    describe('GET /api/badges/badge-classes/:id', () => {
      it('should retrieve badge class by ID', async () => {
        const mockBadgeClass = {
          id: 'https://example.org/badges/test-badge',
          type: 'BadgeClass',
          name: 'Test Badge',
          description: 'A test badge',
          image: 'https://example.org/images/test-badge.png',
          criteria: 'https://example.org/criteria/test-badge',
          issuer: {
            id: 'https://example.org/issuers/test-issuer',
            type: 'Profile',
            name: 'Test Issuer',
          },
        }

        mockFetch.mockResolvedValueOnce({
          ok: true,
          headers: new Headers({ 'content-type': 'application/json' }),
          json: vi.fn().mockResolvedValue(mockBadgeClass),
        })

        const req = new Request('http://localhost/api/badges/badge-classes/test-badge')
        const res = await app.fetch(req)
        const data = await res.json()

        expect(res.status).toBe(200)
        expect(data).toEqual(mockBadgeClass)
        expect(mockFetch).toHaveBeenCalledWith(
          'http://localhost:3000/api/v2/badge-classes/test-badge',
          expect.objectContaining({
            method: 'GET',
            headers: { 'Content-Type': 'application/json' },
          })
        )
      })

      it('should handle badge class not found', async () => {
        mockFetch.mockResolvedValueOnce({
          ok: false,
          status: 404,
          headers: new Headers({ 'content-type': 'application/json' }),
          json: vi.fn().mockResolvedValue({ error: 'Badge class not found' }),
        })

        const req = new Request('http://localhost/api/badges/badge-classes/non-existent')
        const res = await app.fetch(req)
        const data = await res.json()

        expect(res.status).toBe(404)
        expect(data.error).toBe('Badge class not found')
      })
    })

    describe('GET /api/badges/revocation-list', () => {
      it('should retrieve revocation list', async () => {
        const mockRevocationList = [
          {
            id: 'https://example.org/assertions/revoked-1',
            reason: 'Fraudulent activity',
            revokedAt: '2024-01-20T15:30:00Z',
          },
          {
            id: 'https://example.org/assertions/revoked-2',
            reason: 'Issuer request',
            revokedAt: '2024-01-21T10:15:00Z',
          },
        ]

        mockFetch.mockResolvedValueOnce({
          ok: true,
          headers: new Headers({ 'content-type': 'application/json' }),
          json: vi.fn().mockResolvedValue(mockRevocationList),
        })

        const req = new Request('http://localhost/api/badges/revocation-list')
        const res = await app.fetch(req)
        const data = await res.json()

        expect(res.status).toBe(200)
        expect(data).toEqual(mockRevocationList)
        expect(mockFetch).toHaveBeenCalledWith(
          'http://localhost:3000/api/v1/revocation-list',
          expect.objectContaining({
            method: 'GET',
            headers: { 'Content-Type': 'application/json' },
          })
        )
      })

      it('should handle revocation service unavailable', async () => {
        mockFetch.mockResolvedValueOnce({
          ok: false,
          status: 503,
          headers: new Headers({ 'content-type': 'application/json' }),
        })

        const req = new Request('http://localhost/api/badges/revocation-list')
        const res = await app.fetch(req)
        const data = await res.json()

        expect(res.status).toBe(200)
        expect(data).toEqual([]) // Should return empty list when service is unavailable
      })

      it('should handle network errors gracefully', async () => {
        mockFetch.mockRejectedValueOnce(new Error('Network error'))

        const req = new Request('http://localhost/api/badges/revocation-list')
        const res = await app.fetch(req)
        const data = await res.json()

        expect(res.status).toBe(200)
        expect(data).toEqual([]) // Should return empty list on error (fail open)
      })
    })
  })

  describe('Badge Creation and Issuance Integration Flow', () => {
    it('should support complete badge lifecycle: create → issue → verify → retrieve', async () => {
      // Step 1: Create badge class
      const mockBadgeClass = {
        id: 'https://example.org/badges/new-badge',
        type: 'BadgeClass',
        name: 'Integration Test Badge',
        description: 'A badge for testing the complete flow',
        image: 'https://example.org/images/test-badge.png',
        criteria: {
          narrative: 'Complete the integration test successfully',
          id: 'https://example.org/criteria/integration-test',
        },
        issuer: {
          id: 'https://example.org/issuers/test-issuer',
          type: 'Profile',
          name: 'Test User',
          email: 'test@example.com',
        },
        alignment: [
          {
            targetName: 'Testing Standards',
            targetUrl: 'https://example.org/standards/testing',
            targetFramework: 'Open Badges',
          },
        ],
      }

      // Mock badge class creation
      mockFetch.mockResolvedValueOnce({
        ok: true,
        headers: new Headers({ 'content-type': 'application/json' }),
        json: vi.fn().mockResolvedValue(mockBadgeClass),
      })

      // Step 2: Issue badge (assertion)
      const mockAssertion = {
        id: 'https://example.org/assertions/new-assertion',
        type: 'Assertion',
        recipient: { type: 'email', identity: 'recipient@example.com', hashed: false },
        badge: mockBadgeClass.id,
        verification: { type: 'hosted' },
        issuedOn: '2024-01-15T10:00:00Z',
        evidence: 'https://example.org/evidence/test-evidence',
        narrative: 'Awarded for completing integration testing',
      }

      // Mock assertion creation
      mockFetch.mockResolvedValueOnce({
        ok: true,
        headers: new Headers({ 'content-type': 'application/json' }),
        json: vi.fn().mockResolvedValue(mockAssertion),
      })

      // Step 3: Mock verification response
      const mockVerificationResponse = {
        valid: true,
        signatureValid: true,
        issuerVerified: true,
        errors: [],
        warnings: [],
      }

      // Mock verification call
      mockFetch.mockResolvedValueOnce({
        ok: true,
        headers: new Headers({ 'content-type': 'application/json' }),
        json: vi.fn().mockResolvedValue(mockVerificationResponse),
      })

      // Step 4: Mock retrieval of assertion
      mockFetch.mockResolvedValueOnce({
        ok: true,
        headers: new Headers({ 'content-type': 'application/json' }),
        json: vi.fn().mockResolvedValue(mockAssertion),
      })

      // Step 5: Mock backpack retrieval showing the new assertion
      const mockBackpack = {
        assertions: [mockAssertion],
        total: 1,
      }

      mockFetch.mockResolvedValueOnce({
        ok: true,
        headers: new Headers({ 'content-type': 'application/json' }),
        json: vi.fn().mockResolvedValue(mockBackpack),
      })

      // Execute the flow

      // 1. Create badge class
      const createReq = new Request('http://localhost/api/badges/api/v2/badge-classes', {
        method: 'POST',
        headers: {
          Authorization: 'Bearer test-platform-token',
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(mockBadgeClass),
      })

      const createRes = await app.fetch(createReq)
      expect(createRes.status).toBe(200)
      const createdBadge = await createRes.json()
      expect(createdBadge.id).toBe(mockBadgeClass.id)

      // 2. Issue badge (create assertion)
      const issueReq = new Request('http://localhost/api/badges/api/v2/assertions', {
        method: 'POST',
        headers: {
          Authorization: 'Bearer test-platform-token',
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          badge: mockBadgeClass.id,
          recipient: { type: 'email', identity: 'recipient@example.com' },
          evidence: 'https://example.org/evidence/test-evidence',
          narrative: 'Awarded for completing integration testing',
        }),
      })

      const issueRes = await app.fetch(issueReq)
      expect(issueRes.status).toBe(200)
      const issuedAssertion = await issueRes.json()
      expect(issuedAssertion.id).toBe(mockAssertion.id)

      // 3. Verify the issued badge
      const verifyReq = new Request('http://localhost/api/badges/verify', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          assertion: mockAssertion,
          badgeClass: mockBadgeClass,
        }),
      })

      const verifyRes = await app.fetch(verifyReq)
      expect(verifyRes.status).toBe(200)
      const verificationResult = await verifyRes.json()
      expect(verificationResult.valid).toBe(true)
      expect(verificationResult.signatureValid).toBe(true)
      expect(verificationResult.issuerVerified).toBe(true)

      // 4. Retrieve assertion by ID
      const retrieveReq = new Request(
        `http://localhost/api/badges/assertions/${encodeURIComponent(mockAssertion.id)}`
      )
      const retrieveRes = await app.fetch(retrieveReq)
      expect(retrieveRes.status).toBe(200)
      const retrievedAssertion = await retrieveRes.json()
      expect(retrievedAssertion.id).toBe(mockAssertion.id)

      // 5. Check that assertion appears in backpack
      const backpackReq = new Request('http://localhost/api/badges/api/v1/assertions', {
        headers: { Authorization: 'Bearer test-platform-token' },
      })
      const backpackRes = await app.fetch(backpackReq)
      expect(backpackRes.status).toBe(200)
      const backpack = await backpackRes.json()
      expect(backpack.assertions).toHaveLength(1)
      expect(backpack.assertions[0].id).toBe(mockAssertion.id)

      // Verify all expected API calls were made
      expect(mockFetch).toHaveBeenCalledTimes(5)

      // Verify correct endpoints were called
      expect(mockFetch).toHaveBeenNthCalledWith(
        1,
        'http://localhost:3000/api/v2/badge-classes',
        expect.any(Object)
      )
      expect(mockFetch).toHaveBeenNthCalledWith(
        2,
        'http://localhost:3000/api/v2/assertions',
        expect.any(Object)
      )
      expect(mockFetch).toHaveBeenNthCalledWith(
        3,
        'http://localhost:3000/api/v1/verify',
        expect.any(Object)
      )
      expect(mockFetch).toHaveBeenNthCalledWith(
        4,
        `http://localhost:3000/api/v1/assertions/${encodeURIComponent(mockAssertion.id)}`,
        expect.any(Object)
      )
      expect(mockFetch).toHaveBeenNthCalledWith(
        5,
        'http://localhost:3000/api/v1/assertions',
        expect.any(Object)
      )
    })

    it('should handle verification failure for invalid badges', async () => {
      const mockInvalidAssertion = {
        id: 'https://example.org/assertions/invalid',
        type: 'Assertion',
        recipient: { type: 'email', identity: 'test@example.com' },
        badge: 'https://example.org/badges/invalid',
        verification: { type: 'hosted' },
        issuedOn: '2024-01-15T10:00:00Z',
      }

      const mockInvalidVerification = {
        valid: false,
        signatureValid: false,
        issuerVerified: false,
        errors: ['Invalid signature', 'Issuer not verified'],
        warnings: ['Badge may be expired'],
      }

      mockFetch.mockResolvedValueOnce({
        ok: true,
        headers: new Headers({ 'content-type': 'application/json' }),
        json: vi.fn().mockResolvedValue(mockInvalidVerification),
      })

      const verifyReq = new Request('http://localhost/api/badges/verify', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          assertion: mockInvalidAssertion,
          badgeClass: { id: 'invalid-badge' },
        }),
      })

      const verifyRes = await app.fetch(verifyReq)
      expect(verifyRes.status).toBe(200)
      const result = await verifyRes.json()

      expect(result.valid).toBe(false)
      expect(result.errors).toContain('Invalid signature')
      expect(result.errors).toContain('Issuer not verified')
      expect(result.warnings).toContain('Badge may be expired')
    })

    it('should handle verification after badge issuance with OB2 compliance', async () => {
      // Test OB2-compliant badge with criteria.id and alignment
      const ob2BadgeClass = {
        id: 'https://example.org/badges/ob2-compliant',
        type: 'BadgeClass',
        name: 'OB2 Compliant Badge',
        description: 'A fully OB2-compliant badge',
        image: 'https://example.org/images/ob2-badge.png',
        criteria: {
          narrative: 'Demonstrate OB2 compliance understanding',
          id: 'https://example.org/criteria/ob2-compliance',
        },
        issuer: {
          id: 'https://example.org/issuers/ob2-issuer',
          type: 'Profile',
          name: 'OB2 Test Issuer',
          email: 'issuer@example.com',
        },
        alignment: [
          {
            targetName: 'OpenBadges 2.0 Standard',
            targetUrl:
              'https://www.imsglobal.org/sites/default/files/Badges/OBv2p0Final/index.html',
            targetDescription: 'Official OB2 specification',
            targetFramework: 'IMS Global',
          },
        ],
      }

      const ob2Assertion = {
        id: 'https://example.org/assertions/ob2-assertion',
        type: 'Assertion',
        recipient: {
          type: 'email',
          identity: 'recipient@example.com',
          hashed: false,
        },
        badge: ob2BadgeClass.id,
        verification: { type: 'hosted' },
        issuedOn: '2024-01-15T10:00:00Z',
        evidence: 'https://example.org/evidence/ob2-evidence',
        narrative: 'Successfully demonstrated OB2 compliance',
      }

      const mockOB2Verification = {
        valid: true,
        signatureValid: true,
        issuerVerified: true,
        errors: [],
        warnings: [],
      }

      mockFetch.mockResolvedValueOnce({
        ok: true,
        headers: new Headers({ 'content-type': 'application/json' }),
        json: vi.fn().mockResolvedValue(mockOB2Verification),
      })

      const verifyReq = new Request('http://localhost/api/badges/verify', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          assertion: ob2Assertion,
          badgeClass: ob2BadgeClass,
        }),
      })

      const verifyRes = await app.fetch(verifyReq)
      expect(verifyRes.status).toBe(200)
      const result = await verifyRes.json()

      expect(result.valid).toBe(true)
      expect(result.signatureValid).toBe(true)
      expect(result.issuerVerified).toBe(true)
      expect(result.errors).toHaveLength(0)

      // Verify the request body contains OB2-compliant structures
      const verifyCall = mockFetch.mock.calls.find(
        call => call[0] === 'http://localhost:3000/api/v1/verify'
      )
      expect(verifyCall).toBeDefined()
      const requestBody = JSON.parse(verifyCall![1].body as string)

      // Check OB2 compliance
      expect(requestBody.badgeClass.criteria.id).toBe('https://example.org/criteria/ob2-compliance')
      expect(requestBody.badgeClass.alignment).toHaveLength(1)
      expect(requestBody.badgeClass.alignment[0].targetUrl).toBe(
        'https://www.imsglobal.org/sites/default/files/Badges/OBv2p0Final/index.html'
      )
      expect(requestBody.assertion.evidence).toBe('https://example.org/evidence/ob2-evidence')
      expect(requestBody.assertion.narrative).toBe('Successfully demonstrated OB2 compliance')
    })
  })

  // NOTE: Negative validation tests have been moved to badges.validation.integration.test.ts
  // which uses the 1EdTech-aligned ValidationReportContent format
})
