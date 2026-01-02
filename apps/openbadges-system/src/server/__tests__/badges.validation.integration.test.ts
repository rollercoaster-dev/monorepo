import { describe, it, expect, vi, beforeEach } from 'vitest'
import type { ExecutionContext } from 'hono'

// JWT, fetch, and SQLite mocks are configured in test.setup.ts

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
    expect(json.error).toBe('Invalid OB2 Assertion payload')
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

describe('OB3 Achievement validation (integration)', () => {
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

  it('returns 400 for invalid OB3 Achievement payload with 1EdTech format report', async () => {
    const req = new Request('http://localhost/api/badges/api/v3/achievements', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: 'Bearer platform-token' },
      body: JSON.stringify({
        // Missing required 'id' field
        name: 'Test Achievement',
        description: 'A test achievement',
        criteria: { narrative: 'Complete tasks' },
      }),
    })

    const res = await app.fetch(req)
    const json = await res.json()

    expect(res.status).toBe(400)
    expect(json.error).toBe('Invalid OB3 Achievement payload')
    // Verify 1EdTech-format report structure
    expect(json.report).toBeDefined()
    expect(json.report.valid).toBe(false)
    expect(json.report.errorCount).toBeGreaterThan(0)
    expect(json.report.openBadgesVersion).toBe('3.0')
    expect(Array.isArray(json.report.messages)).toBe(true)
    expect(json.report.messages.length).toBeGreaterThan(0)
    expect(json.report.messages[0]).toHaveProperty('messageLevel', 'ERROR')
    expect(json.report.messages[0]).toHaveProperty('result')
    expect(json.report.messages[0]).toHaveProperty('success', false)
  })

  it('forwards valid OB3 Achievement payload to OpenBadges server', async () => {
    const validAchievement = {
      id: 'https://example.org/achievement/1',
      type: ['Achievement'],
      name: 'Test Achievement',
      description: 'A test achievement',
      criteria: { narrative: 'Complete all tasks' },
    }

    mockFetch.mockResolvedValueOnce({
      ok: true,
      headers: new Headers({ 'content-type': 'application/json' }),
      json: () => Promise.resolve({ ...validAchievement }),
    })

    const req = new Request('http://localhost/api/badges/api/v3/achievements', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: 'Bearer platform-token' },
      body: JSON.stringify(validAchievement),
    })

    const res = await app.fetch(req)
    const data = await res.json()

    expect(res.status).toBe(200)
    expect(data.id).toBe('https://example.org/achievement/1')
    expect(mockFetch).toHaveBeenCalledWith(
      'http://localhost:3000/api/v3/achievements',
      expect.objectContaining({ method: 'POST' })
    )
  })
})

describe('OB3 VerifiableCredential validation (integration)', () => {
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

  it('returns 400 for invalid OB3 VerifiableCredential payload with 1EdTech format report', async () => {
    const req = new Request('http://localhost/api/badges/api/v3/credentials', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: 'Bearer platform-token' },
      body: JSON.stringify({
        '@context': [
          'https://www.w3.org/ns/credentials/v2',
          'https://purl.imsglobal.org/spec/ob/v3p0/context.json',
        ],
        id: 'https://example.org/credential/1',
        type: ['VerifiableCredential', 'OpenBadgeCredential'],
        issuer: 'https://example.org/issuer/1',
        // Missing required 'validFrom' field
        credentialSubject: {
          achievement: {
            id: 'https://example.org/achievement/1',
            name: 'Achievement',
            description: 'Desc',
            criteria: { narrative: 'Complete' },
          },
        },
      }),
    })

    const res = await app.fetch(req)
    const json = await res.json()

    expect(res.status).toBe(400)
    expect(json.error).toBe('Invalid OB3 VerifiableCredential payload')
    expect(json.report).toBeDefined()
    expect(json.report.valid).toBe(false)
    expect(json.report.errorCount).toBeGreaterThan(0)
    expect(json.report.openBadgesVersion).toBe('3.0')
  })

  it('forwards valid OB3 VerifiableCredential payload to OpenBadges server', async () => {
    const validCredential = {
      '@context': [
        'https://www.w3.org/ns/credentials/v2',
        'https://purl.imsglobal.org/spec/ob/v3p0/context.json',
      ],
      id: 'https://example.org/credential/1',
      type: ['VerifiableCredential', 'OpenBadgeCredential'],
      issuer: 'https://example.org/issuer/1',
      validFrom: '2024-01-01T00:00:00.000Z',
      credentialSubject: {
        achievement: {
          id: 'https://example.org/achievement/1',
          name: 'Achievement',
          description: 'Desc',
          criteria: { narrative: 'Complete' },
        },
      },
    }

    mockFetch.mockResolvedValueOnce({
      ok: true,
      headers: new Headers({ 'content-type': 'application/json' }),
      json: () => Promise.resolve({ ...validCredential }),
    })

    const req = new Request('http://localhost/api/badges/api/v3/credentials', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: 'Bearer platform-token' },
      body: JSON.stringify(validCredential),
    })

    const res = await app.fetch(req)
    const data = await res.json()

    expect(res.status).toBe(200)
    expect(data.id).toBe('https://example.org/credential/1')
    expect(mockFetch).toHaveBeenCalledWith(
      'http://localhost:3000/api/v3/credentials',
      expect.objectContaining({ method: 'POST' })
    )
  })
})

describe('OB3 error report validation (integration)', () => {
  let app: {
    fetch: (
      request: Request,
      env?: unknown,
      executionCtx?: ExecutionContext | undefined
    ) => Response | Promise<Response>
  }

  beforeEach(async () => {
    vi.clearAllMocks()
    const serverModule = await import('../index')
    app = { fetch: serverModule.default.fetch }
  })

  it("validates that OB3 error reports include openBadgesVersion: '3.0'", async () => {
    // Test invalid Achievement
    const invalidAchievement = new Request('http://localhost/api/badges/api/v3/achievements', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: 'Bearer platform-token' },
      body: JSON.stringify({ name: 'Test' }), // Missing required fields
    })

    const achievementRes = await app.fetch(invalidAchievement)
    const achievementJson = await achievementRes.json()
    expect(achievementJson.report.openBadgesVersion).toBe('3.0')

    // Test invalid VerifiableCredential
    const invalidVC = new Request('http://localhost/api/badges/api/v3/credentials', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: 'Bearer platform-token' },
      body: JSON.stringify({ '@context': [], type: [] }), // Missing required fields
    })

    const vcRes = await app.fetch(invalidVC)
    const vcJson = await vcRes.json()
    expect(vcJson.report.openBadgesVersion).toBe('3.0')
  })
})

describe('OB2/OB3 backward compatibility (integration)', () => {
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

  it('validates backward compatibility: OB2 and OB3 requests in same session', async () => {
    // Mock responses for all requests
    mockFetch
      .mockResolvedValueOnce({
        ok: true,
        headers: new Headers({ 'content-type': 'application/json' }),
        json: () => Promise.resolve({ id: 'badge-1', type: 'BadgeClass' }),
      })
      .mockResolvedValueOnce({
        ok: true,
        headers: new Headers({ 'content-type': 'application/json' }),
        json: () => Promise.resolve({ id: 'https://achievement-1', type: ['Achievement'] }),
      })

    // OB2 BadgeClass
    const ob2Badge = await app.fetch(
      new Request('http://localhost/api/badges/api/v2/badge-classes', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: 'Bearer platform-token' },
        body: JSON.stringify({
          type: 'BadgeClass',
          name: 'OB2 Badge',
          description: 'Desc',
          image: 'https://example.org/img.png',
          criteria: 'https://example.org/criteria',
          issuer: 'https://example.org/issuer',
        }),
      })
    )
    expect(ob2Badge.status).toBe(200)
    const ob2BadgeData = await ob2Badge.json()
    expect(ob2BadgeData.type).toBe('BadgeClass')

    // OB3 Achievement
    const ob3Achievement = await app.fetch(
      new Request('http://localhost/api/badges/api/v3/achievements', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: 'Bearer platform-token' },
        body: JSON.stringify({
          id: 'https://example.org/achievement/1',
          type: ['Achievement'],
          name: 'OB3 Achievement',
          description: 'Desc',
          criteria: { narrative: 'Complete' },
        }),
      })
    )
    expect(ob3Achievement.status).toBe(200)
    const ob3AchievementData = await ob3Achievement.json()
    expect(ob3AchievementData.type).toEqual(['Achievement'])

    // Verify both requests were made
    expect(mockFetch).toHaveBeenCalledTimes(2)
  })
})
