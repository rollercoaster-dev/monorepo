import { describe, it, expect, vi, beforeEach } from 'vitest'
import type { ExecutionContext } from 'hono'

// JWT, fetch, and SQLite mocks are configured in test.setup.ts

describe('OB3 Achievement CRUD (integration)', () => {
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

  describe('Achievement Creation', () => {
    it('creates Achievement with required OB3 fields', async () => {
      const validAchievement = {
        id: 'https://example.org/achievements/test-1',
        type: ['Achievement'],
        name: 'Test Achievement',
        description: 'A test achievement for OB3 compliance',
        criteria: { narrative: 'Complete all required tasks' },
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
      expect(data.id).toBe(validAchievement.id)
      expect(data.name).toBe(validAchievement.name)
      expect(data.description).toBe(validAchievement.description)
      expect(mockFetch).toHaveBeenCalledWith(
        'http://localhost:3000/api/v3/achievements',
        expect.objectContaining({ method: 'POST' })
      )
    })

    it('creates Achievement with type as string (not array)', async () => {
      const achievement = {
        id: 'https://example.org/achievements/string-type',
        type: 'Achievement', // String instead of array
        name: 'String Type Achievement',
        description: 'Achievement with string type field',
        criteria: { narrative: 'Complete tasks' },
      }

      mockFetch.mockResolvedValueOnce({
        ok: true,
        headers: new Headers({ 'content-type': 'application/json' }),
        json: () => Promise.resolve({ ...achievement }),
      })

      const req = new Request('http://localhost/api/badges/api/v3/achievements', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: 'Bearer platform-token' },
        body: JSON.stringify(achievement),
      })

      const res = await app.fetch(req)
      expect(res.status).toBe(200)
    })

    it('creates Achievement with all optional fields', async () => {
      const fullAchievement = {
        id: 'https://example.org/achievements/full',
        type: ['Achievement', 'CustomAchievementType'],
        name: 'Full Achievement',
        description: 'Achievement with all optional fields',
        criteria: {
          id: 'https://example.org/criteria/1',
          narrative: 'Complete all steps',
        },
        image: 'https://example.org/images/badge.png',
        creator: {
          id: 'https://example.org/issuers/1',
          type: 'Profile',
          name: 'Test Issuer',
          url: 'https://example.org',
        },
        alignments: [
          {
            targetName: 'Competency Framework',
            targetUrl: 'https://example.org/framework/1',
            targetDescription: 'A competency framework alignment',
          },
        ],
      }

      mockFetch.mockResolvedValueOnce({
        ok: true,
        headers: new Headers({ 'content-type': 'application/json' }),
        json: () => Promise.resolve({ ...fullAchievement }),
      })

      const req = new Request('http://localhost/api/badges/api/v3/achievements', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: 'Bearer platform-token' },
        body: JSON.stringify(fullAchievement),
      })

      const res = await app.fetch(req)
      const data = await res.json()

      expect(res.status).toBe(200)
      expect(data.image).toBe(fullAchievement.image)
      expect(data.creator).toEqual(fullAchievement.creator)
      expect(data.alignments).toEqual(fullAchievement.alignments)
    })

    it('creates Achievement with multi-language name and description', async () => {
      const multiLangAchievement = {
        id: 'https://example.org/achievements/multilang',
        type: ['Achievement'],
        name: { en: 'English Name', es: 'Nombre en Espanol' },
        description: { en: 'English description', es: 'Descripcion en espanol' },
        criteria: { narrative: 'Complete requirements' },
      }

      mockFetch.mockResolvedValueOnce({
        ok: true,
        headers: new Headers({ 'content-type': 'application/json' }),
        json: () => Promise.resolve({ ...multiLangAchievement }),
      })

      const req = new Request('http://localhost/api/badges/api/v3/achievements', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: 'Bearer platform-token' },
        body: JSON.stringify(multiLangAchievement),
      })

      const res = await app.fetch(req)
      const data = await res.json()

      expect(res.status).toBe(200)
      expect(data.name).toEqual(multiLangAchievement.name)
      expect(data.description).toEqual(multiLangAchievement.description)
    })

    it('creates Achievement with criteria having only id (no narrative)', async () => {
      const achievement = {
        id: 'https://example.org/achievements/criteria-id',
        type: ['Achievement'],
        name: 'Criteria ID Achievement',
        description: 'Achievement with criteria.id only',
        criteria: { id: 'https://example.org/criteria/external' },
      }

      mockFetch.mockResolvedValueOnce({
        ok: true,
        headers: new Headers({ 'content-type': 'application/json' }),
        json: () => Promise.resolve({ ...achievement }),
      })

      const req = new Request('http://localhost/api/badges/api/v3/achievements', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: 'Bearer platform-token' },
        body: JSON.stringify(achievement),
      })

      const res = await app.fetch(req)
      expect(res.status).toBe(200)
    })
  })

  describe('Achievement Validation Errors', () => {
    it('rejects Achievement missing required id field', async () => {
      const invalidAchievement = {
        // Missing 'id' field
        type: ['Achievement'],
        name: 'Missing ID',
        description: 'Achievement without id',
        criteria: { narrative: 'Complete tasks' },
      }

      const req = new Request('http://localhost/api/badges/api/v3/achievements', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: 'Bearer platform-token' },
        body: JSON.stringify(invalidAchievement),
      })

      const res = await app.fetch(req)
      const json = await res.json()

      expect(res.status).toBe(400)
      expect(json.error).toBe('Invalid OB3 Achievement payload')
      expect(json.report.valid).toBe(false)
      expect(json.report.openBadgesVersion).toBe('3.0')
    })

    it('rejects Achievement missing required name field', async () => {
      const invalidAchievement = {
        id: 'https://example.org/achievements/no-name',
        type: ['Achievement'],
        // Missing 'name' field
        description: 'Achievement without name',
        criteria: { narrative: 'Complete tasks' },
      }

      const req = new Request('http://localhost/api/badges/api/v3/achievements', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: 'Bearer platform-token' },
        body: JSON.stringify(invalidAchievement),
      })

      const res = await app.fetch(req)
      const json = await res.json()

      expect(res.status).toBe(400)
      expect(json.error).toBe('Invalid OB3 Achievement payload')
      expect(json.report.valid).toBe(false)
    })

    it('rejects Achievement missing required description field', async () => {
      const invalidAchievement = {
        id: 'https://example.org/achievements/no-desc',
        type: ['Achievement'],
        name: 'No Description',
        // Missing 'description' field
        criteria: { narrative: 'Complete tasks' },
      }

      const req = new Request('http://localhost/api/badges/api/v3/achievements', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: 'Bearer platform-token' },
        body: JSON.stringify(invalidAchievement),
      })

      const res = await app.fetch(req)
      const json = await res.json()

      expect(res.status).toBe(400)
      expect(json.error).toBe('Invalid OB3 Achievement payload')
      expect(json.report.valid).toBe(false)
    })

    it('rejects Achievement missing required criteria field', async () => {
      const invalidAchievement = {
        id: 'https://example.org/achievements/no-criteria',
        type: ['Achievement'],
        name: 'No Criteria',
        description: 'Achievement without criteria',
        // Missing 'criteria' field
      }

      const req = new Request('http://localhost/api/badges/api/v3/achievements', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: 'Bearer platform-token' },
        body: JSON.stringify(invalidAchievement),
      })

      const res = await app.fetch(req)
      const json = await res.json()

      expect(res.status).toBe(400)
      expect(json.error).toBe('Invalid OB3 Achievement payload')
      expect(json.report.valid).toBe(false)
    })

    it('rejects Achievement with criteria missing both id and narrative', async () => {
      const invalidAchievement = {
        id: 'https://example.org/achievements/empty-criteria',
        type: ['Achievement'],
        name: 'Empty Criteria',
        description: 'Achievement with empty criteria',
        criteria: {}, // Empty criteria - needs either id or narrative
      }

      const req = new Request('http://localhost/api/badges/api/v3/achievements', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: 'Bearer platform-token' },
        body: JSON.stringify(invalidAchievement),
      })

      const res = await app.fetch(req)
      const json = await res.json()

      expect(res.status).toBe(400)
      expect(json.error).toBe('Invalid OB3 Achievement payload')
      expect(json.report.valid).toBe(false)
      // Should indicate criteria validation error
      expect(
        json.report.messages.some((m: { result: string }) => m.result.includes('Criteria'))
      ).toBe(true)
    })

    it('rejects Achievement with invalid id format (not URL)', async () => {
      const invalidAchievement = {
        id: 'not-a-valid-url', // Invalid URL format
        type: ['Achievement'],
        name: 'Invalid ID',
        description: 'Achievement with invalid id',
        criteria: { narrative: 'Complete tasks' },
      }

      const req = new Request('http://localhost/api/badges/api/v3/achievements', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: 'Bearer platform-token' },
        body: JSON.stringify(invalidAchievement),
      })

      const res = await app.fetch(req)
      const json = await res.json()

      expect(res.status).toBe(400)
      expect(json.error).toBe('Invalid OB3 Achievement payload')
      expect(json.report.valid).toBe(false)
    })
  })

  describe('Achievement with Image Object', () => {
    it('creates Achievement with image as IRI string', async () => {
      const achievement = {
        id: 'https://example.org/achievements/image-iri',
        type: ['Achievement'],
        name: 'Image IRI Achievement',
        description: 'Achievement with image as IRI',
        criteria: { narrative: 'Complete tasks' },
        image: 'https://example.org/images/badge.png',
      }

      mockFetch.mockResolvedValueOnce({
        ok: true,
        headers: new Headers({ 'content-type': 'application/json' }),
        json: () => Promise.resolve({ ...achievement }),
      })

      const req = new Request('http://localhost/api/badges/api/v3/achievements', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: 'Bearer platform-token' },
        body: JSON.stringify(achievement),
      })

      const res = await app.fetch(req)
      expect(res.status).toBe(200)
    })

    it('creates Achievement with image as OB3 ImageObject', async () => {
      const achievement = {
        id: 'https://example.org/achievements/image-object',
        type: ['Achievement'],
        name: 'Image Object Achievement',
        description: 'Achievement with image as object',
        criteria: { narrative: 'Complete tasks' },
        image: {
          id: 'https://example.org/images/badge.png',
          type: 'Image',
        },
      }

      mockFetch.mockResolvedValueOnce({
        ok: true,
        headers: new Headers({ 'content-type': 'application/json' }),
        json: () => Promise.resolve({ ...achievement }),
      })

      const req = new Request('http://localhost/api/badges/api/v3/achievements', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: 'Bearer platform-token' },
        body: JSON.stringify(achievement),
      })

      const res = await app.fetch(req)
      expect(res.status).toBe(200)
    })
  })

  describe('Achievement with Creator/Issuer', () => {
    it('creates Achievement with creator as IRI string (DID)', async () => {
      const achievement = {
        id: 'https://example.org/achievements/did-creator',
        type: ['Achievement'],
        name: 'DID Creator Achievement',
        description: 'Achievement with DID-based creator',
        criteria: { narrative: 'Complete tasks' },
        creator: 'did:example:issuer123',
      }

      mockFetch.mockResolvedValueOnce({
        ok: true,
        headers: new Headers({ 'content-type': 'application/json' }),
        json: () => Promise.resolve({ ...achievement }),
      })

      const req = new Request('http://localhost/api/badges/api/v3/achievements', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: 'Bearer platform-token' },
        body: JSON.stringify(achievement),
      })

      const res = await app.fetch(req)
      const data = await res.json()

      expect(res.status).toBe(200)
      expect(data.creator).toBe('did:example:issuer123')
    })

    it('creates Achievement with creator as embedded Profile object', async () => {
      const achievement = {
        id: 'https://example.org/achievements/profile-creator',
        type: ['Achievement'],
        name: 'Profile Creator Achievement',
        description: 'Achievement with embedded Profile creator',
        criteria: { narrative: 'Complete tasks' },
        creator: {
          id: 'https://example.org/issuers/1',
          type: 'Profile',
          name: 'Example Organization',
          url: 'https://example.org',
          email: 'contact@example.org',
        },
      }

      mockFetch.mockResolvedValueOnce({
        ok: true,
        headers: new Headers({ 'content-type': 'application/json' }),
        json: () => Promise.resolve({ ...achievement }),
      })

      const req = new Request('http://localhost/api/badges/api/v3/achievements', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: 'Bearer platform-token' },
        body: JSON.stringify(achievement),
      })

      const res = await app.fetch(req)
      const data = await res.json()

      expect(res.status).toBe(200)
      expect(data.creator.name).toBe('Example Organization')
    })
  })
})
