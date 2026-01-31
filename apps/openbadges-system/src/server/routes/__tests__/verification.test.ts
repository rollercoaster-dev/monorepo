/**
 * Verification Routes Tests
 */

import { describe, test, expect, beforeAll } from 'vitest'
import { Hono } from 'hono'
import { generateKeyPair } from 'crypto'
import { promisify } from 'util'
import { verificationRoutes } from '../verification'
import { proofService } from '../../services/proof'
import type { OB3, Shared } from 'openbadges-types'

const generateKeyPairAsync = promisify(generateKeyPair)

describe('Verification Routes', () => {
  let app: Hono
  let testKeyPair: { publicKey: string; privateKey: string }
  let testCredential: OB3.VerifiableCredential

  beforeAll(async () => {
    // Create test app
    app = new Hono()
    app.route('/api/verification', verificationRoutes)

    // Generate Ed25519 test keypair
    const { publicKey, privateKey } = await generateKeyPairAsync('ed25519', {
      publicKeyEncoding: {
        type: 'spki',
        format: 'pem',
      },
      privateKeyEncoding: {
        type: 'pkcs8',
        format: 'pem',
      },
    })

    testKeyPair = { publicKey, privateKey }

    // Create test credential
    testCredential = {
      '@context': [
        'https://www.w3.org/2018/credentials/v1',
        'https://purl.imsglobal.org/spec/ob/v3p0/context-3.0.3.json',
      ],
      id: 'https://example.com/credentials/test' as Shared.IRI,
      type: ['VerifiableCredential', 'OpenBadgeCredential'],
      issuer: 'did:key:z6Mkf5rGMoatrSj1f4CyvuHBeXJELe9RPdzo2PKGNCKVtZxP' as Shared.IRI,
      validFrom: '2024-01-01T00:00:00Z' as Shared.DateTime,
      credentialSubject: {
        id: 'did:key:z6MkrHKzgsahxBLyNAbLQyB1pcWNYC9GmywiWPgkrvntAZcj' as Shared.IRI,
        achievement: {
          id: 'https://example.com/achievements/test' as Shared.IRI,
          type: ['Achievement'],
          name: 'Test Achievement',
          description: 'A test achievement for verification',
          criteria: {
            narrative: 'Complete the test',
          },
        },
      },
    }
  })

  describe('POST /api/verification/verify-proof', () => {
    test('should verify valid Ed25519Signature2020 proof', async () => {
      const verificationMethod =
        'did:key:z6Mkf5rGMoatrSj1f4CyvuHBeXJELe9RPdzo2PKGNCKVtZxP#z6Mkf5rGMoatrSj1f4CyvuHBeXJELe9RPdzo2PKGNCKVtZxP'

      // Sign the credential
      const signedCredential = await proofService.signCredential(
        testCredential,
        testKeyPair.privateKey,
        verificationMethod
      )

      // Verify it
      const req = new Request('http://localhost/api/verification/verify-proof', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          credential: signedCredential,
          publicKeyPem: testKeyPair.publicKey,
        }),
      })

      const res = await app.fetch(req)
      const data = await res.json()

      expect(res.status).toBe(200)
      expect(data.valid).toBe(true)
      expect(data.proof.type).toBe('Ed25519Signature2020')
      expect(data.proof.verificationMethod).toBe(verificationMethod)
    })

    test('should verify valid DataIntegrityProof', async () => {
      const verificationMethod =
        'did:key:z6Mkf5rGMoatrSj1f4CyvuHBeXJELe9RPdzo2PKGNCKVtZxP#z6Mkf5rGMoatrSj1f4CyvuHBeXJELe9RPdzo2PKGNCKVtZxP'

      // Sign the credential with DataIntegrityProof
      const signedCredential = await proofService.signCredential(
        testCredential,
        testKeyPair.privateKey,
        verificationMethod,
        {
          proofType: 'DataIntegrityProof',
          cryptosuite: 'eddsa-jcs-2022',
        }
      )

      // Verify it
      const req = new Request('http://localhost/api/verification/verify-proof', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          credential: signedCredential,
          publicKeyPem: testKeyPair.publicKey,
        }),
      })

      const res = await app.fetch(req)
      const data = await res.json()

      expect(res.status).toBe(200)
      expect(data.valid).toBe(true)
      expect(data.proof.type).toBe('DataIntegrityProof')
    })

    test('should verify valid JsonWebSignature2020 proof', async () => {
      const verificationMethod =
        'did:key:z6Mkf5rGMoatrSj1f4CyvuHBeXJELe9RPdzo2PKGNCKVtZxP#z6Mkf5rGMoatrSj1f4CyvuHBeXJELe9RPdzo2PKGNCKVtZxP'

      // Sign the credential with JWS
      const signedCredential = await proofService.signCredentialWithJWS(
        testCredential,
        testKeyPair.privateKey,
        verificationMethod
      )

      // Verify it
      const req = new Request('http://localhost/api/verification/verify-proof', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          credential: signedCredential,
          publicKeyPem: testKeyPair.publicKey,
        }),
      })

      const res = await app.fetch(req)
      const data = await res.json()

      expect(res.status).toBe(200)
      expect(data.valid).toBe(true)
      expect(data.proof.type).toBe('JsonWebSignature2020')
    })

    test('should reject credential with invalid signature', async () => {
      const verificationMethod =
        'did:key:z6Mkf5rGMoatrSj1f4CyvuHBeXJELe9RPdzo2PKGNCKVtZxP#z6Mkf5rGMoatrSj1f4CyvuHBeXJELe9RPdzo2PKGNCKVtZxP'

      // Sign the credential
      const signedCredential = await proofService.signCredential(
        testCredential,
        testKeyPair.privateKey,
        verificationMethod
      )

      // Tamper with the proof
      if (signedCredential.proof?.proofValue) {
        signedCredential.proof.proofValue = 'z' + signedCredential.proof.proofValue.slice(2)
      }

      // Try to verify it
      const req = new Request('http://localhost/api/verification/verify-proof', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          credential: signedCredential,
          publicKeyPem: testKeyPair.publicKey,
        }),
      })

      const res = await app.fetch(req)
      const data = await res.json()

      expect(res.status).toBe(200)
      expect(data.valid).toBe(false)
      expect(data.error).toContain('Signature verification failed')
    })

    test('should reject credential with no proof', async () => {
      const req = new Request('http://localhost/api/verification/verify-proof', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          credential: testCredential,
          publicKeyPem: testKeyPair.publicKey,
        }),
      })

      const res = await app.fetch(req)
      const data = await res.json()

      expect(res.status).toBe(400)
      expect(data.valid).toBe(false)
      expect(data.error).toContain('missing @context or proof')
    })

    test('should reject credential with unsupported proof type', async () => {
      const credentialWithInvalidProof = {
        ...testCredential,
        proof: {
          type: 'UnsupportedProofType',
          created: '2024-01-01T00:00:00Z',
          verificationMethod: 'did:key:test#key-1',
          proofPurpose: 'assertionMethod',
          proofValue: 'invalid',
        },
      }

      const req = new Request('http://localhost/api/verification/verify-proof', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          credential: credentialWithInvalidProof,
          publicKeyPem: testKeyPair.publicKey,
        }),
      })

      const res = await app.fetch(req)
      const data = await res.json()

      expect(res.status).toBe(400)
      expect(data.valid).toBe(false)
      expect(data.error).toContain('Unsupported proof type')
    })

    test('should require public key for verification', async () => {
      const verificationMethod =
        'did:key:z6Mkf5rGMoatrSj1f4CyvuHBeXJELe9RPdzo2PKGNCKVtZxP#z6Mkf5rGMoatrSj1f4CyvuHBeXJELe9RPdzo2PKGNCKVtZxP'

      const signedCredential = await proofService.signCredential(
        testCredential,
        testKeyPair.privateKey,
        verificationMethod
      )

      const req = new Request('http://localhost/api/verification/verify-proof', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          credential: signedCredential,
          // No publicKeyPem provided
        }),
      })

      const res = await app.fetch(req)
      const data = await res.json()

      expect(res.status).toBe(400)
      expect(data.valid).toBe(false)
      expect(data.error).toContain('Public key PEM required')
    })
  })
})
