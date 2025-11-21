import { describe, it, expect, vi, beforeEach } from 'vitest'
import type { ExecutionContext } from 'hono'

// Mock the JWT service
vi.mock('../services/jwt', () => ({
  jwtService: {
    verifyToken: vi.fn(() => ({ sub: 'test-user' })),
  },
}))

global.fetch = vi.fn()

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

  it('returns 400 for invalid BadgeClass payload', async () => {
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
    expect(Array.isArray(json.details)).toBe(true)
  })

  it('returns 400 for invalid Assertion payload', async () => {
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
    expect(json.error).toBe('Invalid OB2 Assertion payload')
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
