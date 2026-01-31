/**
 * Verification Routes
 *
 * API endpoints for verifying Open Badges 3.0 credentials with cryptographic proofs
 */

import { Hono } from 'hono'
import { createPublicKey, verify as cryptoVerify } from 'crypto'
import type { OB3 } from 'openbadges-types'
import { logger } from '../utils/logger'
import { decodeMultibase } from '../utils/base58'
import { canonicalizeDocument } from '../utils/json-canonicalize'

const verificationRoutes = new Hono()

/**
 * POST /api/verification/verify-proof
 *
 * Verifies a cryptographic proof on an OB3 credential
 */
verificationRoutes.post('/verify-proof', async c => {
  try {
    // Parse and validate request body
    let body: unknown
    try {
      body = await c.req.json()
    } catch {
      return c.json({ valid: false, error: 'Invalid JSON body' }, 400)
    }

    const credential = (body as Record<string, unknown>).credential as
      | Record<string, unknown>
      | undefined
    const publicKeyPem = (body as Record<string, unknown>).publicKeyPem as string | undefined

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

    // Validate proof structure - type and verificationMethod are always required
    if (!proof.type || !proof.verificationMethod) {
      return c.json({ valid: false, error: 'Invalid proof structure' }, 400)
    }

    // Support Ed25519Signature2020, DataIntegrityProof, and JsonWebSignature2020
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

    // Validate signature field based on proof type
    // JsonWebSignature2020 can use either 'jws' or 'proofValue' field
    let jwsValue: string | undefined
    if (proof.type === 'JsonWebSignature2020') {
      jwsValue = proof.proofValue ?? proof.jws
      if (!jwsValue) {
        return c.json(
          { valid: false, error: 'Invalid proof structure: missing jws or proofValue' },
          400
        )
      }
    } else if (!proof.proofValue) {
      return c.json({ valid: false, error: 'Invalid proof structure: missing proofValue' }, 400)
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
      let signatureBytes: Uint8Array
      try {
        signatureBytes = decodeMultibase(proof.proofValue!)
      } catch {
        return c.json({ valid: false, error: 'Invalid proofValue encoding' }, 400)
      }

      // Verify signature
      try {
        const publicKey = createPublicKey(publicKeyPem)
        signatureValid = cryptoVerify(null, documentBytes, publicKey, Buffer.from(signatureBytes))
      } catch (error) {
        logger.debug('Signature verification failed', { error })
        signatureValid = false
      }
    } else if (proof.type === 'JsonWebSignature2020') {
      // JWS verification with detached payload (b64: false)
      const jose = await import('jose')

      // Extract header and signature from detached JWS (format: header..signature)
      // jwsValue is guaranteed non-null here due to earlier validation
      const [header, signature] = jwsValue!.split('..')
      if (!header || !signature) {
        return c.json({ valid: false, error: 'Invalid JWS format' }, 400)
      }

      // Import public key
      let publicKey: Awaited<ReturnType<typeof jose.importSPKI>>
      try {
        publicKey = await jose.importSPKI(publicKeyPem, 'EdDSA')
      } catch {
        return c.json({ valid: false, error: 'Invalid public key format' }, 400)
      }

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
