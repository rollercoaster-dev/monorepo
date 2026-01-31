/**
 * JSON Canonicalization Utilities
 *
 * Provides deterministic JSON serialization for cryptographic operations.
 * Uses simple key-sorting canonicalization, which is sufficient for
 * OB3 credentials without complex JSON-LD framing requirements.
 *
 * NOTE: This is NOT suitable for general JSON-LD documents requiring
 * RDF canonicalization (RDFC-2022). For OB3 credentials with standard
 * structure, simple key sorting provides byte-identical output.
 *
 * @see https://www.w3.org/TR/vc-data-model-2.0/#data-integrity-proofs
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
