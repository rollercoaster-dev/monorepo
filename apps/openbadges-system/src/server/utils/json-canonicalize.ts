/**
 * JSON Canonicalization Utilities
 *
 * Provides deterministic JSON serialization for cryptographic operations.
 * Uses JCS-style key-sorting canonicalization (RFC 8785).
 *
 * Suitable for Ed25519Signature2020, eddsa-jcs-2022, and JsonWebSignature2020.
 * RDFC-1.0 canonicalization (for eddsa-rdfc-2022) is tracked in #661.
 *
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
