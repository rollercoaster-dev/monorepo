import { describe, it, expect, vi, beforeEach } from 'vitest'
import type { ExecutionContext } from 'hono'
import { postVerify } from './helpers/verify'

// Hoisted mock ensures JWTService singleton is mocked before module evaluation
const jwtMocks = vi.hoisted(() => ({
  jwtService: {
    createOpenBadgesApiClient: vi.fn(() => ({
      token: 'mock-jwt-token',
      headers: {
        Authorization: 'Bearer mock-jwt-token',
        'Content-Type': 'application/json',
      },
    })),
    verifyToken: vi.fn(() => ({
      sub: 'test-user',
      platformId: 'urn:uuid:a504d862-bd64-4e0d-acff-db7955955bc1',
      displayName: 'Test User',
      email: 'issuer@example.org',
      metadata: { isAdmin: true },
    })),
  },
}))

vi.mock('../services/jwt', () => jwtMocks)

// Mock fetch for OpenBadges server requests
// Cast to unknown first to avoid Bun's fetch.preconnect type requirement
globalThis.fetch = vi.fn() as unknown as typeof fetch

// Mock SQLite database to avoid native binding issues
vi.mock('sqlite3', () => ({
  Database: vi.fn().mockImplementation(() => ({
    prepare: vi.fn().mockReturnValue({
      get: vi.fn(),
      all: vi.fn(),
      run: vi.fn(),
      finalize: vi.fn(),
    }),
    exec: vi.fn(),
    close: vi.fn(),
  })),
}))

describe('Issue → Verify → Retrieve flow (proxy)', () => {
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

  it('issues an assertion and verifies it', async () => {
    // 1) Downstream mock for issuance request
    const createdAssertion = {
      id: 'https://example.org/assertions/abc',
      type: 'Assertion',
      badge: 'https://example.org/badges/1',
      recipient: { type: 'email', identity: 'recipient@example.org' },
      verification: { type: 'hosted' },
      issuedOn: '2025-01-01T00:00:00Z',
    }
    mockFetch.mockResolvedValueOnce({
      ok: true,
      headers: new Headers({ 'content-type': 'application/json' }),
      json: () => Promise.resolve(createdAssertion),
    })

    // 2) Issue through platform proxy
    const issueReqBody = {
      badge: 'https://example.org/badges/1',
      recipient: { type: 'email', identity: 'recipient@example.org' },
      issuedOn: '2025-01-01T00:00:00Z',
      narrative: 'Completed requirements',
    }
    const issueReq = new Request('http://localhost/api/badges/api/v2/assertions', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: 'Bearer platform-token' },
      body: JSON.stringify(issueReqBody),
    })
    const issueRes = await app.fetch(issueReq)
    expect(issueRes.status).toBe(200)
    const issued = await issueRes.json()
    expect(issued.id).toBe(createdAssertion.id)

    // 3) Downstream mock for verify
    const verifyResp = {
      valid: true,
      issuerVerified: true,
      signatureValid: true,
      errors: [],
      warnings: [],
    }
    mockFetch.mockResolvedValueOnce({
      ok: true,
      headers: new Headers({ 'content-type': 'application/json' }),
      json: () => Promise.resolve(verifyResp),
    })

    const verifyRes = await postVerify(app, {
      assertion: createdAssertion,
      badgeClass: { id: 'https://example.org/badges/1', type: 'BadgeClass' },
    })
    expect(verifyRes.status).toBe(200)
    const verification = await verifyRes.json()
    expect(verification.valid).toBe(true)
  })

  it('retrieves issued assertions via backpack endpoint', async () => {
    // 1) Mock issuance
    const createdAssertion = {
      id: 'https://example.org/assertions/def',
      type: 'Assertion',
      badge: 'https://example.org/badges/1',
      recipient: { type: 'email', identity: 'recipient@example.org' },
      verification: { type: 'hosted' },
      issuedOn: '2025-01-01T00:00:00Z',
    }
    mockFetch.mockResolvedValueOnce({
      ok: true,
      headers: new Headers({ 'content-type': 'application/json' }),
      json: () => Promise.resolve(createdAssertion),
    })

    const issueReq = new Request('http://localhost/api/badges/api/v2/assertions', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: 'Bearer platform-token' },
      body: JSON.stringify({
        badge: 'https://example.org/badges/1',
        recipient: { type: 'email', identity: 'recipient@example.org' },
        issuedOn: '2025-01-01T00:00:00Z',
      }),
    })
    const issueRes = await app.fetch(issueReq)
    expect(issueRes.status).toBe(200)

    // 2) Mock retrieval
    const backpack = { assertions: [createdAssertion], total: 1 }
    mockFetch.mockResolvedValueOnce({
      ok: true,
      headers: new Headers({ 'content-type': 'application/json' }),
      json: () => Promise.resolve(backpack),
    })

    const getBackpackReq = new Request('http://localhost/api/badges/api/v1/assertions', {
      method: 'GET',
      headers: { Authorization: 'Bearer platform-token' },
    })
    const getBackpackRes = await app.fetch(getBackpackReq)
    expect(getBackpackRes.status).toBe(200)
    const data = await getBackpackRes.json()
    expect(data.assertions?.[0]?.id).toBe(createdAssertion.id)
  })
})
