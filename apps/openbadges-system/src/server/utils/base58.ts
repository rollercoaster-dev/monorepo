/**
 * Base58 Encoding/Decoding Utilities
 *
 * Implements base58-btc encoding (Bitcoin alphabet) used in multibase format
 * for cryptographic signatures and DID identifiers.
 *
 * @see https://datatracker.ietf.org/doc/html/draft-msporny-base58-03
 */

const BASE58_ALPHABET = '123456789ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz'

/**
 * Encodes bytes to base58-btc format (Bitcoin alphabet)
 */
export function encodeBase58(bytes: Uint8Array): string {
  if (bytes.length === 0) return ''

  let num = BigInt(0)
  for (let i = 0; i < bytes.length; i++) {
    const byte = bytes[i]
    if (byte === undefined) break
    num = num * BigInt(256) + BigInt(byte)
  }

  let result = ''
  while (num > 0) {
    const remainder = num % BigInt(58)
    num = num / BigInt(58)
    result = BASE58_ALPHABET[Number(remainder)] + result
  }

  // Preserve leading zeros
  for (let i = 0; i < bytes.length; i++) {
    const byte = bytes[i]
    if (byte === undefined || byte !== 0) break
    result = BASE58_ALPHABET[0] + result
  }

  return result
}

/**
 * Decodes base58-btc string to bytes
 *
 * @throws Error if string contains invalid base58 characters
 */
export function decodeBase58(str: string): Uint8Array {
  let num = BigInt(0)
  for (let i = 0; i < str.length; i++) {
    const char = str[i]
    if (!char) break
    const digit = BASE58_ALPHABET.indexOf(char)
    if (digit === -1) {
      throw new Error(`Invalid base58 character '${char}' at position ${i}`)
    }
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

/**
 * Encodes bytes with multibase prefix 'z' (base58-btc)
 *
 * @see https://datatracker.ietf.org/doc/html/draft-multiformats-multibase-03
 */
export function encodeMultibase(bytes: Uint8Array): string {
  return 'z' + encodeBase58(bytes)
}

/**
 * Decodes multibase-encoded string (requires 'z' prefix for base58-btc)
 *
 * @throws Error if string doesn't start with 'z' prefix or contains invalid characters
 */
export function decodeMultibase(encoded: string): Uint8Array {
  if (!encoded.startsWith('z')) {
    throw new Error('Only base58-btc multibase encoding is supported (prefix: z)')
  }
  return decodeBase58(encoded.slice(1))
}
