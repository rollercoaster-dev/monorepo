/**
 * Proof Service Tests
 */

import { describe, test, expect, beforeAll } from 'vitest'
import { generateKeyPair } from 'crypto'
import { promisify } from 'util'
import { ProofService } from '../proof'
import type { OB3, Shared } from 'openbadges-types'

const generateKeyPairAsync = promisify(generateKeyPair)

describe('ProofService', () => {
  let proofService: ProofService
  let testKeyPair: { publicKey: string; privateKey: string }
  let testCredential: OB3.VerifiableCredential

  beforeAll(async () => {
    proofService = new ProofService()

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
      id: 'https://example.com/credentials/123' as Shared.IRI,
      type: ['VerifiableCredential', 'OpenBadgeCredential'],
      issuer: 'did:key:z6Mkf5rGMoatrSj1f4CyvuHBeXJELe9RPdzo2PKGNCKVtZxP' as Shared.IRI,
      validFrom: '2024-01-01T00:00:00Z' as Shared.DateTime,
      credentialSubject: {
        id: 'did:key:z6MkrHKzgsahxBLyNAbLQyB1pcWNYC9GmywiWPgkrvntAZcj' as Shared.IRI,
        achievement: {
          id: 'https://example.com/achievements/123' as Shared.IRI,
          type: ['Achievement'],
          name: 'Test Badge',
          description: 'A test badge for unit testing',
          criteria: {
            narrative: 'Complete the test',
          },
        },
      },
    }
  })

  describe('signCredential', () => {
    test('should sign credential with Ed25519Signature2020', async () => {
      const verificationMethod =
        'did:key:z6Mkf5rGMoatrSj1f4CyvuHBeXJELe9RPdzo2PKGNCKVtZxP#z6Mkf5rGMoatrSj1f4CyvuHBeXJELe9RPdzo2PKGNCKVtZxP'

      const signedCredential = await proofService.signCredential(
        testCredential,
        testKeyPair.privateKey,
        verificationMethod
      )

      expect(signedCredential.proof).toBeDefined()
      expect(signedCredential.proof?.type).toBe('Ed25519Signature2020')
      expect(signedCredential.proof?.verificationMethod).toBe(verificationMethod)
      expect(signedCredential.proof?.proofPurpose).toBe('assertionMethod')
      expect(signedCredential.proof?.proofValue).toMatch(/^z/)
      expect(signedCredential.proof?.created).toBeDefined()
    })

    test('should sign credential with DataIntegrityProof', async () => {
      const verificationMethod =
        'did:key:z6Mkf5rGMoatrSj1f4CyvuHBeXJELe9RPdzo2PKGNCKVtZxP#z6Mkf5rGMoatrSj1f4CyvuHBeXJELe9RPdzo2PKGNCKVtZxP'

      const signedCredential = await proofService.signCredential(
        testCredential,
        testKeyPair.privateKey,
        verificationMethod,
        {
          proofType: 'DataIntegrityProof',
          cryptosuite: 'eddsa-rdfc-2022',
        }
      )

      expect(signedCredential.proof).toBeDefined()
      expect(signedCredential.proof?.type).toBe('DataIntegrityProof')
      expect(signedCredential.proof?.cryptosuite).toBe('eddsa-rdfc-2022')
      expect(signedCredential.proof?.verificationMethod).toBe(verificationMethod)
      expect(signedCredential.proof?.proofValue).toMatch(/^z/)
    })

    test('should use authentication proofPurpose when specified', async () => {
      const verificationMethod =
        'did:key:z6Mkf5rGMoatrSj1f4CyvuHBeXJELe9RPdzo2PKGNCKVtZxP#z6Mkf5rGMoatrSj1f4CyvuHBeXJELe9RPdzo2PKGNCKVtZxP'

      const signedCredential = await proofService.signCredential(
        testCredential,
        testKeyPair.privateKey,
        verificationMethod,
        { proofPurpose: 'authentication' }
      )

      expect(signedCredential.proof?.proofPurpose).toBe('authentication')
    })

    test('should produce deterministic signature for same input', async () => {
      const verificationMethod =
        'did:key:z6Mkf5rGMoatrSj1f4CyvuHBeXJELe9RPdzo2PKGNCKVtZxP#z6Mkf5rGMoatrSj1f4CyvuHBeXJELe9RPdzo2PKGNCKVtZxP'

      // Sign the same credential twice
      const signed1 = await proofService.signCredential(
        testCredential,
        testKeyPair.privateKey,
        verificationMethod
      )

      // Wait a moment to ensure different timestamp
      await new Promise(resolve => setTimeout(resolve, 10))

      const signed2 = await proofService.signCredential(
        testCredential,
        testKeyPair.privateKey,
        verificationMethod
      )

      // Proofs should have same verification method and purpose
      expect(signed1.proof?.verificationMethod).toBe(signed2.proof?.verificationMethod)
      expect(signed1.proof?.proofPurpose).toBe(signed2.proof?.proofPurpose)

      // But different timestamps and signatures (since created time affects signature)
      expect(signed1.proof?.created).not.toBe(signed2.proof?.created)
    })
  })

  describe('signCredentialWithJWS', () => {
    test('should sign credential with JsonWebSignature2020', async () => {
      const verificationMethod =
        'did:key:z6Mkf5rGMoatrSj1f4CyvuHBeXJELe9RPdzo2PKGNCKVtZxP#z6Mkf5rGMoatrSj1f4CyvuHBeXJELe9RPdzo2PKGNCKVtZxP'

      const signedCredential = await proofService.signCredentialWithJWS(
        testCredential,
        testKeyPair.privateKey,
        verificationMethod
      )

      expect(signedCredential.proof).toBeDefined()
      expect(signedCredential.proof?.type).toBe('JsonWebSignature2020')
      expect(signedCredential.proof?.verificationMethod).toBe(verificationMethod)
      expect(signedCredential.proof?.proofPurpose).toBe('assertionMethod')

      // JWS detached format: header..signature
      expect(signedCredential.proof?.proofValue).toMatch(/^[A-Za-z0-9_-]+\.\.[A-Za-z0-9_-]+$/)
      expect(signedCredential.proof?.created).toBeDefined()
    })

    test('should support authentication proofPurpose', async () => {
      const verificationMethod =
        'did:key:z6Mkf5rGMoatrSj1f4CyvuHBeXJELe9RPdzo2PKGNCKVtZxP#z6Mkf5rGMoatrSj1f4CyvuHBeXJELe9RPdzo2PKGNCKVtZxP'

      const signedCredential = await proofService.signCredentialWithJWS(
        testCredential,
        testKeyPair.privateKey,
        verificationMethod,
        { proofPurpose: 'authentication' }
      )

      expect(signedCredential.proof?.proofPurpose).toBe('authentication')
    })

    test('should produce valid JWS format', async () => {
      const verificationMethod =
        'did:key:z6Mkf5rGMoatrSj1f4CyvuHBeXJELe9RPdzo2PKGNCKVtZxP#z6Mkf5rGMoatrSj1f4CyvuHBeXJELe9RPdzo2PKGNCKVtZxP'

      const signedCredential = await proofService.signCredentialWithJWS(
        testCredential,
        testKeyPair.privateKey,
        verificationMethod
      )

      const proofValue = signedCredential.proof?.proofValue
      expect(proofValue).toBeDefined()

      const parts = proofValue?.split('..')
      expect(parts).toHaveLength(2)
      expect(parts?.[0]).toBeTruthy() // header
      expect(parts?.[1]).toBeTruthy() // signature
    })
  })
})
