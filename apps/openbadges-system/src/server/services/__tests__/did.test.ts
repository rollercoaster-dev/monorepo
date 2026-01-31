/**
 * DID Service Tests
 *
 * Tests for signing and key retrieval methods
 */

import { describe, test, expect, beforeAll } from 'vitest'
import { generateKeyPair } from 'crypto'
import { promisify } from 'util'
import { DIDService, encryptPrivateKey, getEncryptionSecret, type DIDDocument } from '../did'

const generateKeyPairAsync = promisify(generateKeyPair)

describe('DIDService', () => {
  let didService: DIDService
  let testKeyPair: { publicKey: string; privateKey: string }
  let testData: Uint8Array

  beforeAll(async () => {
    // Set up test encryption secret
    if (!process.env.DID_ENCRYPTION_SECRET) {
      process.env.DID_ENCRYPTION_SECRET =
        'test-secret-key-that-is-at-least-32-characters-long-for-testing'
    }

    didService = new DIDService()

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

    // Test data to sign
    testData = new Uint8Array([
      0x48, 0x65, 0x6c, 0x6c, 0x6f, 0x2c, 0x20, 0x57, 0x6f, 0x72, 0x6c, 0x64, 0x21,
    ]) // "Hello, World!"
  })

  describe('sign', () => {
    test('should sign data with Ed25519 private key', () => {
      const signature = didService.sign(testData, testKeyPair.privateKey)

      expect(signature).toBeInstanceOf(Uint8Array)
      expect(signature.length).toBe(64) // Ed25519 signatures are 64 bytes
    })

    test('should produce consistent signatures for same input', () => {
      const signature1 = didService.sign(testData, testKeyPair.privateKey)
      const signature2 = didService.sign(testData, testKeyPair.privateKey)

      // Ed25519 is deterministic
      expect(signature1).toEqual(signature2)
    })

    test('should produce different signatures for different data', () => {
      const data2 = new Uint8Array([0x48, 0x65, 0x6c, 0x6c, 0x6f])

      const signature1 = didService.sign(testData, testKeyPair.privateKey)
      const signature2 = didService.sign(data2, testKeyPair.privateKey)

      expect(signature1).not.toEqual(signature2)
    })
  })

  describe('getSigningKey', () => {
    test('should return decrypted private key and verification method', async () => {
      const encryptionSecret = getEncryptionSecret()
      const encryptedPrivateKey = encryptPrivateKey(testKeyPair.privateKey, encryptionSecret)

      const mockDidDocument: DIDDocument = {
        '@context': [
          'https://www.w3.org/ns/did/v1',
          'https://w3id.org/security/suites/jws-2020/v1',
        ],
        id: 'did:key:z6Mkf5rGMoatrSj1f4CyvuHBeXJELe9RPdzo2PKGNCKVtZxP',
        verificationMethod: [
          {
            id: 'did:key:z6Mkf5rGMoatrSj1f4CyvuHBeXJELe9RPdzo2PKGNCKVtZxP#z6Mkf5rGMoatrSj1f4CyvuHBeXJELe9RPdzo2PKGNCKVtZxP',
            type: 'JsonWebKey2020',
            controller: 'did:key:z6Mkf5rGMoatrSj1f4CyvuHBeXJELe9RPdzo2PKGNCKVtZxP',
            publicKeyJwk: {
              kty: 'OKP',
              crv: 'Ed25519',
              x: 'test',
            },
          },
        ],
        authentication: [
          'did:key:z6Mkf5rGMoatrSj1f4CyvuHBeXJELe9RPdzo2PKGNCKVtZxP#z6Mkf5rGMoatrSj1f4CyvuHBeXJELe9RPdzo2PKGNCKVtZxP',
        ],
        assertionMethod: [
          'did:key:z6Mkf5rGMoatrSj1f4CyvuHBeXJELe9RPdzo2PKGNCKVtZxP#z6Mkf5rGMoatrSj1f4CyvuHBeXJELe9RPdzo2PKGNCKVtZxP',
        ],
      }

      const mockGetUserById = async (userId: string) => {
        if (userId === 'test-user') {
          return {
            did: 'did:key:z6Mkf5rGMoatrSj1f4CyvuHBeXJELe9RPdzo2PKGNCKVtZxP',
            didMethod: 'key' as const,
            didPrivateKey: encryptedPrivateKey,
            didDocument: JSON.stringify(mockDidDocument),
          }
        }
        return null
      }

      const result = await didService.getSigningKey('test-user', mockGetUserById)

      expect(result.privateKey).toBe(testKeyPair.privateKey)
      expect(result.verificationMethod).toBe(
        'did:key:z6Mkf5rGMoatrSj1f4CyvuHBeXJELe9RPdzo2PKGNCKVtZxP#z6Mkf5rGMoatrSj1f4CyvuHBeXJELe9RPdzo2PKGNCKVtZxP'
      )
    })

    test('should throw error if user not found', async () => {
      const mockGetUserById = async (_userId: string) => null

      try {
        await didService.getSigningKey('nonexistent', mockGetUserById)
        throw new Error('Expected error to be thrown')
      } catch (error) {
        expect(error).toBeInstanceOf(Error)
        // userId is masked for PII protection: "nonexistent" -> "none...tent"
        expect((error as Error).message).toContain('User not found:')
        expect((error as Error).message).not.toContain('nonexistent')
      }
    })

    test('should throw error if user has no DID', async () => {
      const mockGetUserById = async (_userId: string) => ({
        did: undefined,
        didMethod: undefined,
        didPrivateKey: undefined,
        didDocument: undefined,
      })

      try {
        await didService.getSigningKey('no-did-user', mockGetUserById)
        throw new Error('Expected error to be thrown')
      } catch (error) {
        expect(error).toBeInstanceOf(Error)
        // userId is masked for PII protection: "no-did-user" -> "no-d...user"
        expect((error as Error).message).toContain('does not have a DID configured')
        expect((error as Error).message).not.toContain('no-did-user')
      }
    })

    test('should throw error if DID document is invalid JSON', async () => {
      const encryptionSecret = getEncryptionSecret()
      const encryptedPrivateKey = encryptPrivateKey(testKeyPair.privateKey, encryptionSecret)

      const mockGetUserById = async (_userId: string) => ({
        did: 'did:key:test',
        didMethod: 'key' as const,
        didPrivateKey: encryptedPrivateKey,
        didDocument: 'invalid json',
      })

      try {
        await didService.getSigningKey('invalid-doc', mockGetUserById)
        throw new Error('Expected error to be thrown')
      } catch (error) {
        expect(error).toBeInstanceOf(Error)
        expect((error as Error).message).toContain('Invalid DID Document JSON')
      }
    })

    test('should throw error if DID document has no verification methods', async () => {
      const mockDidDocument = {
        '@context': ['https://www.w3.org/ns/did/v1'],
        id: 'did:key:test',
        verificationMethod: [],
        authentication: [],
        assertionMethod: [],
      }

      const encryptionSecret = getEncryptionSecret()
      const encryptedPrivateKey = encryptPrivateKey(testKeyPair.privateKey, encryptionSecret)

      const mockGetUserById = async (_userId: string) => ({
        did: 'did:key:test',
        didMethod: 'key' as const,
        didPrivateKey: encryptedPrivateKey,
        didDocument: JSON.stringify(mockDidDocument),
      })

      try {
        await didService.getSigningKey('no-methods', mockGetUserById)
        throw new Error('Expected error to be thrown')
      } catch (error) {
        expect(error).toBeInstanceOf(Error)
        expect((error as Error).message).toContain('DID Document has no verification methods')
      }
    })
  })
})
