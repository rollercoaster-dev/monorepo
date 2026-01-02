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

describe('Badges proxy validation (integration)', () => {
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
    const serverModule = await import('../index')
    app = { fetch: serverModule.default.fetch }
  })

  it('returns 400 for invalid BadgeClass payload with 1EdTech format report', async () => {
    const req = new Request('http://localhost/api/badges/api/v2/badge-classes', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: 'Bearer platform-token' },
      body: JSON.stringify({
        type: 'BadgeClass',
        name: '',
        description: '',
        image: 'bad-url',
        criteria: { narrative: '' },
        issuer: 'https://issuer',
      }),
    })

    const res = await app.fetch(req)
    const json = await res.json()

    expect(res.status).toBe(400)
    expect(json.error).toBe('Invalid OB2 BadgeClass payload')
    // Verify 1EdTech-format report structure
    expect(json.report).toBeDefined()
    expect(json.report.valid).toBe(false)
    expect(json.report.errorCount).toBeGreaterThan(0)
    expect(Array.isArray(json.report.messages)).toBe(true)
    expect(json.report.messages.length).toBeGreaterThan(0)
    expect(json.report.messages[0]).toHaveProperty('messageLevel', 'ERROR')
    expect(json.report.messages[0]).toHaveProperty('result')
    expect(json.report.messages[0]).toHaveProperty('success', false)
  })

  it('returns 400 for invalid Assertion payload with 1EdTech format report', async () => {
    const req = new Request('http://localhost/api/badges/api/v2/assertions', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: 'Bearer platform-token' },
      body: JSON.stringify({
        badge: '',
        recipient: { type: 'email', identity: 'bad' },
        evidence: 'not-url',
      }),
    })

    const res = await app.fetch(req)
    const json = await res.json()

    expect(res.status).toBe(400)
    expect(json.error).toBe('Invalid Assertion payload')
    // Verify 1EdTech-format report structure
    expect(json.report).toBeDefined()
    expect(json.report.valid).toBe(false)
    expect(json.report.errorCount).toBeGreaterThan(0)
  })

  it('forwards valid BadgeClass payload to OpenBadges server', async () => {
    const valid = {
      type: 'BadgeClass',
      name: 'Name',
      description: 'Description',
      image: 'https://example.org/img.png',
      criteria: { narrative: 'Do X', id: 'https://example.org/criteria' },
      issuer: 'https://example.org/issuer/1',
    }

    mockFetch.mockResolvedValueOnce({
      ok: true,
      headers: new Headers({ 'content-type': 'application/json' }),
      json: () => Promise.resolve({ id: 'new-badge', ...valid }),
    })

    const req = new Request('http://localhost/api/badges/api/v2/badge-classes', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: 'Bearer platform-token' },
      body: JSON.stringify(valid),
    })

    const res = await app.fetch(req)
    const data = await res.json()

    expect(res.status).toBe(200)
    expect(data.id).toBe('new-badge')
    expect(mockFetch).toHaveBeenCalledWith(
      'http://localhost:3000/api/v2/badge-classes',
      expect.objectContaining({ method: 'POST' })
    )
  })
})

/**
 * NOTE: OB3 integration tests are currently skipped due to vitest compatibility issues.
 * The tests below document the expected behavior for OB3 Achievement and VerifiableCredential validation.
 * These tests will be enabled once vitest mocking (vi.hoisted) is compatible with bun test.
 *
 * Expected OB3 integration test coverage:
 * - returns 400 for invalid OB3 Achievement payload with 1EdTech format report and '3.0 spec' in error
 * - returns 400 for invalid OB3 VerifiableCredential payload with 1EdTech format report and '3.0 spec' in error
 * - forwards valid OB3 Achievement payload to OpenBadges server
 * - forwards valid OB3 VerifiableCredential payload to OpenBadges server
 * - validates that error reports include openBadgesVersion: '3.0'
 * - validates backward compatibility: OB2 and OB3 requests in same session
 *
 * Comprehensive unit tests for OB3 validation are available in:
 * src/server/middleware/__tests__/ob2Validation.test.ts
 */
