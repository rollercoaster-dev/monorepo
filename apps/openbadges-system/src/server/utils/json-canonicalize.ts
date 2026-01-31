/**
 * JSON Canonicalization Utilities
 *
 * Provides deterministic JSON serialization for cryptographic operations.
 * Uses simple key-sorting canonicalization (JSON Canonicalization Scheme).
 *
 * IMPORTANT COMPLIANCE NOTE:
 * This implementation uses JCS (RFC 8785) style key-sorting canonicalization,
 * NOT the W3C RDF Dataset Canonicalization (RDFC-1.0) required by the
 * eddsa-rdfc-2022 cryptosuite. Signatures created with this implementation
 * will NOT interoperate with external W3C Data Integrity verifiers that
 * expect RDFC-1.0 canonicalization.
 *
 * Current limitation: This canonicalization is suitable for:
 * - Internal verification within this system
 * - Ed25519Signature2020 without strict RDFC compliance
 * - JsonWebSignature2020 (uses JCS canonicalization)
 *
 * For full W3C compliance with eddsa-rdfc-2022, implement proper RDF
 * canonicalization using a library like rdf-canonize.
 *
 * @see https://www.w3.org/TR/vc-data-model-2.0/#data-integrity-proofs
 * @see https://www.w3.org/TR/rdf-canon/ (RDFC-1.0 specification)
 * @see https://www.rfc-editor.org/rfc/rfc8785 (JCS specification)
 */

/**
 * Recursively sorts object keys for deterministic serialization
 */
function sortKeys(obj: unknown): unknown {
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

/**
 * Canonicalize a document for cryptographic signing/verification
 *
 * Removes the `proof` field (if present) and returns a deterministic
 * JSON string with recursively sorted keys.
 *
 * @param document - The document to canonicalize
 * @returns Deterministic JSON string
 */
export function canonicalizeDocument(document: Record<string, unknown>): string {
  // Remove proof field if present (proof is computed over document without proof)
  const { proof: _proof, ...docWithoutProof } = document

  return JSON.stringify(sortKeys(docWithoutProof))
}
