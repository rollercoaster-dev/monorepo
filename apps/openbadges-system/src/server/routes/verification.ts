/**
 * Verification Routes
 *
 * API endpoints for verifying Open Badges 3.0 credentials with cryptographic proofs
 */

import { Hono } from 'hono'
import { createPublicKey, verify as cryptoVerify } from 'crypto'
import type { OB3 } from 'openbadges-types'
import { logger } from '../utils/logger'

const verificationRoutes = new Hono()

// Base58 decoding for multibase
const BASE58_ALPHABET = '123456789ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz'

function decodeBase58(str: string): Uint8Array {
  let num = BigInt(0)
  for (let i = 0; i < str.length; i++) {
    const char = str[i]
    if (!char) break
    const digit = BASE58_ALPHABET.indexOf(char)
    if (digit === -1) throw new Error('Invalid base58 character')
    num = num * BigInt(58) + BigInt(digit)
  }

  const bytes: number[] = []
  while (num > 0) {
    bytes.unshift(Number(num % BigInt(256)))
    num = num / BigInt(256)
  }

  // Preserve leading zeros
  for (let i = 0; i < str.length; i++) {
    const char = str[i]
    if (char !== BASE58_ALPHABET[0]) break
    bytes.unshift(0)
  }

  return new Uint8Array(bytes)
}

function decodeMultibase(encoded: string): Uint8Array {
  if (!encoded.startsWith('z')) {
    throw new Error('Only base58-btc multibase encoding is supported (prefix: z)')
  }
  return decodeBase58(encoded.slice(1))
}

// JSON canonicalization (simple key sorting)
function canonicalizeDocument(document: Record<string, unknown>): string {
  const { proof: _proof, ...docWithoutProof } = document

  const sortKeys = (obj: unknown): unknown => {
    if (Array.isArray(obj)) {
      return obj.map(sortKeys)
    }
    if (obj !== null && typeof obj === 'object') {
      return Object.keys(obj)
        .sort()
        .reduce(
          (result, key) => {
            result[key] = sortKeys((obj as Record<string, unknown>)[key])
            return result
          },
          {} as Record<string, unknown>
        )
    }
    return obj
  }

  return JSON.stringify(sortKeys(docWithoutProof))
}

/**
 * POST /api/verification/verify-proof
 *
 * Verifies a cryptographic proof on an OB3 credential
 */
verificationRoutes.post('/verify-proof', async c => {
  try {
    // Parse and validate request body
    const body = await c.req.json()
    const credential = body.credential as Record<string, unknown> | undefined
    const publicKeyPem = body.publicKeyPem as string | undefined

    if (!credential || typeof credential !== 'object') {
      return c.json({ valid: false, error: 'Invalid or missing credential' }, 400)
    }

    if (!credential['@context'] || !credential['proof']) {
      return c.json({ valid: false, error: 'Credential missing @context or proof' }, 400)
    }

    // Extract proof
    const proof = credential.proof as OB3.Proof | undefined
    if (!proof) {
      return c.json({ valid: false, error: 'Credential has no proof' }, 400)
    }

    // Validate proof structure
    if (!proof.type || !proof.proofValue || !proof.verificationMethod) {
      return c.json({ valid: false, error: 'Invalid proof structure' }, 400)
    }

    // Support Ed25519Signature2020 and DataIntegrityProof
    if (
      proof.type !== 'Ed25519Signature2020' &&
      proof.type !== 'DataIntegrityProof' &&
      proof.type !== 'JsonWebSignature2020'
    ) {
      return c.json(
        {
          valid: false,
          error: `Unsupported proof type: ${proof.type}`,
        },
        400
      )
    }

    // If publicKeyPem not provided, return error
    // In a real system, we would resolve the verificationMethod DID to get the public key
    if (!publicKeyPem) {
      return c.json(
        {
          valid: false,
          error: 'Public key PEM required for verification (DID resolution not yet implemented)',
        },
        400
      )
    }

    // Canonicalize credential (remove proof)
    const canonicalDocument = canonicalizeDocument(credential as Record<string, unknown>)
    const documentBytes = Buffer.from(canonicalDocument, 'utf8')

    // Verify signature based on proof type
    let signatureValid = false

    if (proof.type === 'Ed25519Signature2020' || proof.type === 'DataIntegrityProof') {
      // Decode multibase signature
      const signatureBytes = decodeMultibase(proof.proofValue)

      // Verify signature
      const publicKey = createPublicKey(publicKeyPem)
      signatureValid = cryptoVerify(null, documentBytes, publicKey, Buffer.from(signatureBytes))
    } else if (proof.type === 'JsonWebSignature2020') {
      // JWS verification with detached payload (b64: false)
      const jose = await import('jose')

      // Extract header and signature from detached JWS (format: header..signature)
      const [header, signature] = proof.proofValue.split('..')
      if (!header || !signature) {
        return c.json({ valid: false, error: 'Invalid JWS format' }, 400)
      }

      // Import public key
      const publicKey = await jose.importSPKI(publicKeyPem, 'EdDSA')

      // Verify with flattenedVerify - providing payload separately for b64:false JWS
      // The signature was created with b64:false, so payload wasn't base64url encoded
      try {
        await jose.flattenedVerify(
          {
            protected: header,
            signature: signature,
            payload: canonicalDocument, // Raw string payload, not base64url encoded
          },
          publicKey
        )
        signatureValid = true
      } catch (error) {
        logger.debug('JWS verification failed', { error })
        signatureValid = false
      }
    }

    if (signatureValid) {
      return c.json({
        valid: true,
        proof: {
          type: proof.type,
          verificationMethod: proof.verificationMethod,
          created: proof.created,
          proofPurpose: proof.proofPurpose,
        },
      })
    } else {
      return c.json({
        valid: false,
        error: 'Signature verification failed',
      })
    }
  } catch (error) {
    logger.error('Error verifying proof', { error })
    return c.json(
      {
        valid: false,
        error: error instanceof Error ? error.message : 'Verification failed',
      },
      500
    )
  }
})

export { verificationRoutes }
