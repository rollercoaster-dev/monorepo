import { describe, it, expect, vi, beforeEach } from 'vitest'
import type { ExecutionContext } from 'hono'

// Hoisted mock ensures JWTService singleton is mocked before module evaluation
const jwtMocks = vi.hoisted(() => ({
  jwtService: {
    verifyToken: vi.fn(() => ({ sub: 'test-user' })),
  },
}))

vi.mock('../services/jwt', () => jwtMocks)

// Cast to unknown first to avoid Bun's fetch.preconnect type requirement
global.fetch = vi.fn() as unknown as typeof fetch

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
    expect(json.error).toContain('Invalid badge definition payload')
    expect(json.error).toContain('2.0 spec')
    // Verify 1EdTech-format report structure
    expect(json.report).toBeDefined()
    expect(json.report.valid).toBe(false)
    expect(json.report.errorCount).toBeGreaterThan(0)
    expect(json.report.openBadgesVersion).toBe('2.0')
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
    expect(json.error).toContain('Invalid badge issuance payload')
    expect(json.error).toContain('2.0 spec')
    // Verify 1EdTech-format report structure
    expect(json.report).toBeDefined()
    expect(json.report.valid).toBe(false)
    expect(json.report.errorCount).toBeGreaterThan(0)
    expect(json.report.openBadgesVersion).toBe('2.0')
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
