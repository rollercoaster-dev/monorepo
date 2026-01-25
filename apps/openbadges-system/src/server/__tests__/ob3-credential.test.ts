import { describe, it, expect, vi, beforeEach } from 'vitest'
import type { ExecutionContext } from 'hono'

// JWT, fetch, and SQLite mocks are configured in test.setup.ts

describe('OB3 VerifiableCredential Issuance (integration)', () => {
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

  describe('VerifiableCredential Creation', () => {
    it('creates VC with validFrom/validUntil (OB3 validity fields)', async () => {
      const validCredential = {
        '@context': [
          'https://www.w3.org/ns/credentials/v2',
          'https://purl.imsglobal.org/spec/ob/v3p0/context.json',
        ],
        id: 'https://example.org/credentials/test-1',
        type: ['VerifiableCredential', 'OpenBadgeCredential'],
        issuer: 'https://example.org/issuers/1',
        validFrom: '2024-01-01T00:00:00.000Z',
        validUntil: '2025-01-01T00:00:00.000Z',
        credentialSubject: {
          id: 'did:example:recipient123',
          achievement: {
            id: 'https://example.org/achievements/1',
            name: 'Test Achievement',
            description: 'A test achievement',
            criteria: { narrative: 'Complete all tasks' },
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
      expect(data.validFrom).toBe('2024-01-01T00:00:00.000Z')
      expect(data.validUntil).toBe('2025-01-01T00:00:00.000Z')
      // OB3 uses validFrom/validUntil, not issuedOn/expires
      expect(data).not.toHaveProperty('issuedOn')
      expect(data).not.toHaveProperty('expires')
    })

    it('creates VC with DID-based issuer (string format)', async () => {
      const credential = {
        '@context': [
          'https://www.w3.org/ns/credentials/v2',
          'https://purl.imsglobal.org/spec/ob/v3p0/context.json',
        ],
        id: 'https://example.org/credentials/did-issuer',
        type: ['VerifiableCredential', 'OpenBadgeCredential'],
        issuer: 'did:web:example.org:issuers:1', // DID format
        validFrom: '2024-01-01T00:00:00.000Z',
        credentialSubject: {
          achievement: {
            id: 'https://example.org/achievements/1',
            name: 'DID Issuer Achievement',
            description: 'Issued by DID-based issuer',
            criteria: { narrative: 'Complete tasks' },
          },
        },
      }

      mockFetch.mockResolvedValueOnce({
        ok: true,
        headers: new Headers({ 'content-type': 'application/json' }),
        json: () => Promise.resolve({ ...credential }),
      })

      const req = new Request('http://localhost/api/badges/api/v3/credentials', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: 'Bearer platform-token' },
        body: JSON.stringify(credential),
      })

      const res = await app.fetch(req)
      const data = await res.json()

      expect(res.status).toBe(200)
      expect(typeof data.issuer).toBe('string')
      expect(data.issuer).toMatch(/^did:/)
    })

    it('creates VC with embedded issuer Profile object', async () => {
      const credential = {
        '@context': [
          'https://www.w3.org/ns/credentials/v2',
          'https://purl.imsglobal.org/spec/ob/v3p0/context.json',
        ],
        id: 'https://example.org/credentials/profile-issuer',
        type: ['VerifiableCredential', 'OpenBadgeCredential'],
        issuer: {
          id: 'https://example.org/issuers/1',
          type: 'Profile',
          name: 'Example Organization',
          url: 'https://example.org',
          email: 'contact@example.org',
        },
        validFrom: '2024-01-01T00:00:00.000Z',
        credentialSubject: {
          achievement: {
            id: 'https://example.org/achievements/1',
            name: 'Profile Issuer Achievement',
            description: 'Issued by embedded Profile',
            criteria: { narrative: 'Complete tasks' },
          },
        },
      }

      mockFetch.mockResolvedValueOnce({
        ok: true,
        headers: new Headers({ 'content-type': 'application/json' }),
        json: () => Promise.resolve({ ...credential }),
      })

      const req = new Request('http://localhost/api/badges/api/v3/credentials', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: 'Bearer platform-token' },
        body: JSON.stringify(credential),
      })

      const res = await app.fetch(req)
      const data = await res.json()

      expect(res.status).toBe(200)
      expect(typeof data.issuer).toBe('object')
      expect(data.issuer.name).toBe('Example Organization')
    })

    it('creates VC with cryptographic proof structure', async () => {
      const credentialWithProof = {
        '@context': [
          'https://www.w3.org/ns/credentials/v2',
          'https://purl.imsglobal.org/spec/ob/v3p0/context.json',
        ],
        id: 'https://example.org/credentials/with-proof',
        type: ['VerifiableCredential', 'OpenBadgeCredential'],
        issuer: 'https://example.org/issuers/1',
        validFrom: '2024-01-01T00:00:00.000Z',
        credentialSubject: {
          achievement: {
            id: 'https://example.org/achievements/1',
            name: 'Proof Achievement',
            description: 'Achievement with cryptographic proof',
            criteria: { narrative: 'Complete tasks' },
          },
        },
        proof: {
          type: 'DataIntegrityProof',
          created: '2024-01-01T00:00:00.000Z',
          verificationMethod: 'https://example.org/issuers/1#key-1',
          proofPurpose: 'assertionMethod',
          proofValue: 'z58DAdFfa9SkqZMVPxAQpic7ndTeel...',
        },
      }

      mockFetch.mockResolvedValueOnce({
        ok: true,
        headers: new Headers({ 'content-type': 'application/json' }),
        json: () => Promise.resolve({ ...credentialWithProof }),
      })

      const req = new Request('http://localhost/api/badges/api/v3/credentials', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: 'Bearer platform-token' },
        body: JSON.stringify(credentialWithProof),
      })

      const res = await app.fetch(req)
      const data = await res.json()

      expect(res.status).toBe(200)
      expect(data.proof).toBeDefined()
      expect(data.proof.type).toBe('DataIntegrityProof')
      expect(data.proof.proofPurpose).toBe('assertionMethod')
      expect(data.proof.proofValue).toBeDefined()
    })

    it('creates VC with JWS-based proof', async () => {
      const credentialWithJwsProof = {
        '@context': [
          'https://www.w3.org/ns/credentials/v2',
          'https://purl.imsglobal.org/spec/ob/v3p0/context.json',
        ],
        id: 'https://example.org/credentials/jws-proof',
        type: ['VerifiableCredential', 'OpenBadgeCredential'],
        issuer: 'https://example.org/issuers/1',
        validFrom: '2024-01-01T00:00:00.000Z',
        credentialSubject: {
          achievement: {
            id: 'https://example.org/achievements/1',
            name: 'JWS Proof Achievement',
            description: 'Achievement with JWS proof',
            criteria: { narrative: 'Complete tasks' },
          },
        },
        proof: {
          type: 'JsonWebSignature2020',
          created: '2024-01-01T00:00:00.000Z',
          verificationMethod: 'https://example.org/issuers/1#key-1',
          proofPurpose: 'assertionMethod',
          jws: 'eyJhbGciOiJFZERTQSIsImI2NCI6ZmFsc2UsImNyaXQiOlsiYjY0Il19...',
        },
      }

      mockFetch.mockResolvedValueOnce({
        ok: true,
        headers: new Headers({ 'content-type': 'application/json' }),
        json: () => Promise.resolve({ ...credentialWithJwsProof }),
      })

      const req = new Request('http://localhost/api/badges/api/v3/credentials', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: 'Bearer platform-token' },
        body: JSON.stringify(credentialWithJwsProof),
      })

      const res = await app.fetch(req)
      const data = await res.json()

      expect(res.status).toBe(200)
      expect(data.proof.type).toBe('JsonWebSignature2020')
      expect(data.proof.jws).toBeDefined()
    })

    it('creates VC with evidence', async () => {
      const credentialWithEvidence = {
        '@context': [
          'https://www.w3.org/ns/credentials/v2',
          'https://purl.imsglobal.org/spec/ob/v3p0/context.json',
        ],
        id: 'https://example.org/credentials/with-evidence',
        type: ['VerifiableCredential', 'OpenBadgeCredential'],
        issuer: 'https://example.org/issuers/1',
        validFrom: '2024-01-01T00:00:00.000Z',
        credentialSubject: {
          achievement: {
            id: 'https://example.org/achievements/1',
            name: 'Evidence Achievement',
            description: 'Achievement with supporting evidence',
            criteria: { narrative: 'Complete tasks' },
          },
        },
        evidence: [
          {
            id: 'https://example.org/evidence/1',
            type: 'Evidence',
            narrative: 'Completed all required coursework with distinction',
            name: 'Coursework Completion',
            description: 'Evidence of completing all course requirements',
          },
        ],
      }

      mockFetch.mockResolvedValueOnce({
        ok: true,
        headers: new Headers({ 'content-type': 'application/json' }),
        json: () => Promise.resolve({ ...credentialWithEvidence }),
      })

      const req = new Request('http://localhost/api/badges/api/v3/credentials', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: 'Bearer platform-token' },
        body: JSON.stringify(credentialWithEvidence),
      })

      const res = await app.fetch(req)
      const data = await res.json()

      expect(res.status).toBe(200)
      expect(data.evidence).toBeDefined()
      expect(Array.isArray(data.evidence)).toBe(true)
      expect(data.evidence[0].narrative).toBe('Completed all required coursework with distinction')
    })
  })

  describe('VerifiableCredential Type Validation', () => {
    it('requires type array to include VerifiableCredential', async () => {
      const invalidCredential = {
        '@context': [
          'https://www.w3.org/ns/credentials/v2',
          'https://purl.imsglobal.org/spec/ob/v3p0/context.json',
        ],
        id: 'https://example.org/credentials/missing-vc-type',
        type: ['OpenBadgeCredential'], // Missing 'VerifiableCredential'
        issuer: 'https://example.org/issuers/1',
        validFrom: '2024-01-01T00:00:00.000Z',
        credentialSubject: {
          achievement: {
            id: 'https://example.org/achievements/1',
            name: 'Test',
            description: 'Test',
            criteria: { narrative: 'Test' },
          },
        },
      }

      const req = new Request('http://localhost/api/badges/api/v3/credentials', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: 'Bearer platform-token' },
        body: JSON.stringify(invalidCredential),
      })

      const res = await app.fetch(req)
      const json = await res.json()

      expect(res.status).toBe(400)
      expect(json.error).toBe('Invalid OB3 VerifiableCredential payload')
      expect(json.report.valid).toBe(false)
    })

    it('requires type array to include OpenBadgeCredential', async () => {
      const invalidCredential = {
        '@context': [
          'https://www.w3.org/ns/credentials/v2',
          'https://purl.imsglobal.org/spec/ob/v3p0/context.json',
        ],
        id: 'https://example.org/credentials/missing-obc-type',
        type: ['VerifiableCredential'], // Missing 'OpenBadgeCredential'
        issuer: 'https://example.org/issuers/1',
        validFrom: '2024-01-01T00:00:00.000Z',
        credentialSubject: {
          achievement: {
            id: 'https://example.org/achievements/1',
            name: 'Test',
            description: 'Test',
            criteria: { narrative: 'Test' },
          },
        },
      }

      const req = new Request('http://localhost/api/badges/api/v3/credentials', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: 'Bearer platform-token' },
        body: JSON.stringify(invalidCredential),
      })

      const res = await app.fetch(req)
      const json = await res.json()

      expect(res.status).toBe(400)
      expect(json.error).toBe('Invalid OB3 VerifiableCredential payload')
      expect(json.report.valid).toBe(false)
    })

    it('accepts additional types in type array', async () => {
      const credential = {
        '@context': [
          'https://www.w3.org/ns/credentials/v2',
          'https://purl.imsglobal.org/spec/ob/v3p0/context.json',
        ],
        id: 'https://example.org/credentials/extra-types',
        type: ['VerifiableCredential', 'OpenBadgeCredential', 'CustomCredentialType'],
        issuer: 'https://example.org/issuers/1',
        validFrom: '2024-01-01T00:00:00.000Z',
        credentialSubject: {
          achievement: {
            id: 'https://example.org/achievements/1',
            name: 'Extra Types Achievement',
            description: 'Has additional types',
            criteria: { narrative: 'Complete tasks' },
          },
        },
      }

      mockFetch.mockResolvedValueOnce({
        ok: true,
        headers: new Headers({ 'content-type': 'application/json' }),
        json: () => Promise.resolve({ ...credential }),
      })

      const req = new Request('http://localhost/api/badges/api/v3/credentials', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: 'Bearer platform-token' },
        body: JSON.stringify(credential),
      })

      const res = await app.fetch(req)
      expect(res.status).toBe(200)
    })
  })

  describe('VerifiableCredential @context Validation', () => {
    it('requires W3C Verifiable Credentials context', async () => {
      const invalidCredential = {
        '@context': [
          // Missing W3C VC context
          'https://purl.imsglobal.org/spec/ob/v3p0/context.json',
        ],
        id: 'https://example.org/credentials/missing-vc-context',
        type: ['VerifiableCredential', 'OpenBadgeCredential'],
        issuer: 'https://example.org/issuers/1',
        validFrom: '2024-01-01T00:00:00.000Z',
        credentialSubject: {
          achievement: {
            id: 'https://example.org/achievements/1',
            name: 'Test',
            description: 'Test',
            criteria: { narrative: 'Test' },
          },
        },
      }

      const req = new Request('http://localhost/api/badges/api/v3/credentials', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: 'Bearer platform-token' },
        body: JSON.stringify(invalidCredential),
      })

      const res = await app.fetch(req)
      const json = await res.json()

      expect(res.status).toBe(400)
      expect(json.error).toBe('Invalid OB3 VerifiableCredential payload')
      expect(json.report.valid).toBe(false)
    })

    it('requires OB3 context', async () => {
      const invalidCredential = {
        '@context': [
          'https://www.w3.org/ns/credentials/v2',
          // Missing OB3 context
        ],
        id: 'https://example.org/credentials/missing-ob3-context',
        type: ['VerifiableCredential', 'OpenBadgeCredential'],
        issuer: 'https://example.org/issuers/1',
        validFrom: '2024-01-01T00:00:00.000Z',
        credentialSubject: {
          achievement: {
            id: 'https://example.org/achievements/1',
            name: 'Test',
            description: 'Test',
            criteria: { narrative: 'Test' },
          },
        },
      }

      const req = new Request('http://localhost/api/badges/api/v3/credentials', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: 'Bearer platform-token' },
        body: JSON.stringify(invalidCredential),
      })

      const res = await app.fetch(req)
      const json = await res.json()

      expect(res.status).toBe(400)
      expect(json.error).toBe('Invalid OB3 VerifiableCredential payload')
      expect(json.report.valid).toBe(false)
    })

    it('accepts W3C VC v1 context', async () => {
      const credential = {
        '@context': [
          'https://www.w3.org/2018/credentials/v1', // v1 context
          'https://purl.imsglobal.org/spec/ob/v3p0/context.json',
        ],
        id: 'https://example.org/credentials/v1-context',
        type: ['VerifiableCredential', 'OpenBadgeCredential'],
        issuer: 'https://example.org/issuers/1',
        validFrom: '2024-01-01T00:00:00.000Z',
        credentialSubject: {
          achievement: {
            id: 'https://example.org/achievements/1',
            name: 'V1 Context Achievement',
            description: 'Uses W3C VC v1 context',
            criteria: { narrative: 'Complete tasks' },
          },
        },
      }

      mockFetch.mockResolvedValueOnce({
        ok: true,
        headers: new Headers({ 'content-type': 'application/json' }),
        json: () => Promise.resolve({ ...credential }),
      })

      const req = new Request('http://localhost/api/badges/api/v3/credentials', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: 'Bearer platform-token' },
        body: JSON.stringify(credential),
      })

      const res = await app.fetch(req)
      expect(res.status).toBe(200)
    })

    it('accepts OB3 context 3.0.3 version', async () => {
      const credential = {
        '@context': [
          'https://www.w3.org/ns/credentials/v2',
          'https://purl.imsglobal.org/spec/ob/v3p0/context-3.0.3.json', // 3.0.3 context
        ],
        id: 'https://example.org/credentials/ob3-context-303',
        type: ['VerifiableCredential', 'OpenBadgeCredential'],
        issuer: 'https://example.org/issuers/1',
        validFrom: '2024-01-01T00:00:00.000Z',
        credentialSubject: {
          achievement: {
            id: 'https://example.org/achievements/1',
            name: 'OB3 3.0.3 Achievement',
            description: 'Uses OB3 3.0.3 context',
            criteria: { narrative: 'Complete tasks' },
          },
        },
      }

      mockFetch.mockResolvedValueOnce({
        ok: true,
        headers: new Headers({ 'content-type': 'application/json' }),
        json: () => Promise.resolve({ ...credential }),
      })

      const req = new Request('http://localhost/api/badges/api/v3/credentials', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: 'Bearer platform-token' },
        body: JSON.stringify(credential),
      })

      const res = await app.fetch(req)
      expect(res.status).toBe(200)
    })
  })

  describe('VerifiableCredential Required Fields Validation', () => {
    it('rejects VC missing validFrom field', async () => {
      const invalidCredential = {
        '@context': [
          'https://www.w3.org/ns/credentials/v2',
          'https://purl.imsglobal.org/spec/ob/v3p0/context.json',
        ],
        id: 'https://example.org/credentials/no-validfrom',
        type: ['VerifiableCredential', 'OpenBadgeCredential'],
        issuer: 'https://example.org/issuers/1',
        // Missing validFrom
        credentialSubject: {
          achievement: {
            id: 'https://example.org/achievements/1',
            name: 'Test',
            description: 'Test',
            criteria: { narrative: 'Test' },
          },
        },
      }

      const req = new Request('http://localhost/api/badges/api/v3/credentials', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: 'Bearer platform-token' },
        body: JSON.stringify(invalidCredential),
      })

      const res = await app.fetch(req)
      const json = await res.json()

      expect(res.status).toBe(400)
      expect(json.error).toBe('Invalid OB3 VerifiableCredential payload')
      expect(json.report.valid).toBe(false)
    })

    it('rejects VC missing credentialSubject', async () => {
      const invalidCredential = {
        '@context': [
          'https://www.w3.org/ns/credentials/v2',
          'https://purl.imsglobal.org/spec/ob/v3p0/context.json',
        ],
        id: 'https://example.org/credentials/no-subject',
        type: ['VerifiableCredential', 'OpenBadgeCredential'],
        issuer: 'https://example.org/issuers/1',
        validFrom: '2024-01-01T00:00:00.000Z',
        // Missing credentialSubject
      }

      const req = new Request('http://localhost/api/badges/api/v3/credentials', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: 'Bearer platform-token' },
        body: JSON.stringify(invalidCredential),
      })

      const res = await app.fetch(req)
      const json = await res.json()

      expect(res.status).toBe(400)
      expect(json.error).toBe('Invalid OB3 VerifiableCredential payload')
      expect(json.report.valid).toBe(false)
    })

    it('rejects VC missing issuer', async () => {
      const invalidCredential = {
        '@context': [
          'https://www.w3.org/ns/credentials/v2',
          'https://purl.imsglobal.org/spec/ob/v3p0/context.json',
        ],
        id: 'https://example.org/credentials/no-issuer',
        type: ['VerifiableCredential', 'OpenBadgeCredential'],
        // Missing issuer
        validFrom: '2024-01-01T00:00:00.000Z',
        credentialSubject: {
          achievement: {
            id: 'https://example.org/achievements/1',
            name: 'Test',
            description: 'Test',
            criteria: { narrative: 'Test' },
          },
        },
      }

      const req = new Request('http://localhost/api/badges/api/v3/credentials', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: 'Bearer platform-token' },
        body: JSON.stringify(invalidCredential),
      })

      const res = await app.fetch(req)
      const json = await res.json()

      expect(res.status).toBe(400)
      expect(json.error).toBe('Invalid OB3 VerifiableCredential payload')
      expect(json.report.valid).toBe(false)
    })

    it('rejects VC with invalid validFrom date format', async () => {
      const invalidCredential = {
        '@context': [
          'https://www.w3.org/ns/credentials/v2',
          'https://purl.imsglobal.org/spec/ob/v3p0/context.json',
        ],
        id: 'https://example.org/credentials/invalid-date',
        type: ['VerifiableCredential', 'OpenBadgeCredential'],
        issuer: 'https://example.org/issuers/1',
        validFrom: '2024-01-01', // Invalid - missing time component
        credentialSubject: {
          achievement: {
            id: 'https://example.org/achievements/1',
            name: 'Test',
            description: 'Test',
            criteria: { narrative: 'Test' },
          },
        },
      }

      const req = new Request('http://localhost/api/badges/api/v3/credentials', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: 'Bearer platform-token' },
        body: JSON.stringify(invalidCredential),
      })

      const res = await app.fetch(req)
      const json = await res.json()

      expect(res.status).toBe(400)
      expect(json.report.valid).toBe(false)
    })
  })

  describe('CredentialSubject Validation', () => {
    it('creates VC with credentialSubject containing multiple achievements', async () => {
      const credential = {
        '@context': [
          'https://www.w3.org/ns/credentials/v2',
          'https://purl.imsglobal.org/spec/ob/v3p0/context.json',
        ],
        id: 'https://example.org/credentials/multi-achievement',
        type: ['VerifiableCredential', 'OpenBadgeCredential'],
        issuer: 'https://example.org/issuers/1',
        validFrom: '2024-01-01T00:00:00.000Z',
        credentialSubject: {
          id: 'did:example:recipient',
          achievement: [
            {
              id: 'https://example.org/achievements/1',
              name: 'First Achievement',
              description: 'First of many',
              criteria: { narrative: 'Complete first task' },
            },
            {
              id: 'https://example.org/achievements/2',
              name: 'Second Achievement',
              description: 'Second of many',
              criteria: { narrative: 'Complete second task' },
            },
          ],
        },
      }

      mockFetch.mockResolvedValueOnce({
        ok: true,
        headers: new Headers({ 'content-type': 'application/json' }),
        json: () => Promise.resolve({ ...credential }),
      })

      const req = new Request('http://localhost/api/badges/api/v3/credentials', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: 'Bearer platform-token' },
        body: JSON.stringify(credential),
      })

      const res = await app.fetch(req)
      const data = await res.json()

      expect(res.status).toBe(200)
      expect(Array.isArray(data.credentialSubject.achievement)).toBe(true)
      expect(data.credentialSubject.achievement).toHaveLength(2)
    })

    it('creates VC with credentialSubject containing recipient identity', async () => {
      const credential = {
        '@context': [
          'https://www.w3.org/ns/credentials/v2',
          'https://purl.imsglobal.org/spec/ob/v3p0/context.json',
        ],
        id: 'https://example.org/credentials/with-identity',
        type: ['VerifiableCredential', 'OpenBadgeCredential'],
        issuer: 'https://example.org/issuers/1',
        validFrom: '2024-01-01T00:00:00.000Z',
        credentialSubject: {
          id: 'did:example:recipient123',
          type: 'AchievementSubject',
          name: 'Jane Doe',
          email: 'jane@example.org',
          achievement: {
            id: 'https://example.org/achievements/1',
            name: 'Achievement with Identity',
            description: 'Recipient has full identity',
            criteria: { narrative: 'Complete tasks' },
          },
        },
      }

      mockFetch.mockResolvedValueOnce({
        ok: true,
        headers: new Headers({ 'content-type': 'application/json' }),
        json: () => Promise.resolve({ ...credential }),
      })

      const req = new Request('http://localhost/api/badges/api/v3/credentials', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: 'Bearer platform-token' },
        body: JSON.stringify(credential),
      })

      const res = await app.fetch(req)
      const data = await res.json()

      expect(res.status).toBe(200)
      expect(data.credentialSubject.name).toBe('Jane Doe')
      expect(data.credentialSubject.email).toBe('jane@example.org')
    })
  })
})
