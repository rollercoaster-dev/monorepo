/**
 * Proof Verification Service
 *
 * Implements cryptographic proof verification for Open Badges 3.0 credentials
 * supporting both JWT (VC-JWT) and Linked Data (Data Integrity) proof formats.
 *
 * @see https://www.w3.org/TR/vc-data-model-2.0/#proofs-signatures
 * @see https://www.w3.org/TR/vc-jose-cose/
 * @see https://www.w3.org/TR/vc-data-integrity/
 */

import * as jose from "jose";
import type {
  VerificationCheck,
  VerificationOptions,
  VerificationMethodResolver,
} from "./types.js";
import type { Shared } from "openbadges-types";

// =============================================================================
// Helper Functions (defined first to avoid no-use-before-define)
// =============================================================================

/**
 * Multicodec prefixes for different key types
 *
 * @see https://github.com/multiformats/multicodec/blob/master/table.csv
 */
const MULTICODEC_ED25519_PUB = 0xed; // Ed25519 public key
const MULTICODEC_P256_PUB = 0x1200; // P-256 (secp256r1) public key

/**
 * Decode base58btc string
 *
 * Minimal base58 decoder for Bitcoin-style encoding.
 *
 * @param encoded - Base58-encoded string
 * @returns Decoded bytes
 */
function decodeBase58(encoded: string): Uint8Array {
  const ALPHABET = "123456789ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz";
  const BASE = BigInt(58);

  // Count leading zeros
  let leadingZeros = 0;
  for (let i = 0; i < encoded.length; i++) {
    if (encoded[i] === "1") {
      leadingZeros++;
    } else {
      break;
    }
  }

  let result = BigInt(0);
  for (let i = 0; i < encoded.length; i++) {
    const char = encoded[i];
    const value = ALPHABET.indexOf(char);
    if (value === -1) {
      throw new Error(`Invalid base58 character: ${char}`);
    }
    result = result * BASE + BigInt(value);
  }

  // Convert BigInt to bytes
  const hex = result.toString(16).padStart(2, "0");
  // Ensure even length for proper byte conversion
  const paddedHex = hex.length % 2 === 0 ? hex : "0" + hex;
  const bytes = new Uint8Array(leadingZeros + paddedHex.length / 2);

  // Add leading zeros
  for (let i = 0; i < leadingZeros; i++) {
    bytes[i] = 0;
  }

  // Add the rest of the bytes
  for (let i = 0; i < paddedHex.length / 2; i++) {
    bytes[leadingZeros + i] = Number.parseInt(
      paddedHex.slice(i * 2, i * 2 + 2),
      16,
    );
  }

  return bytes;
}

/**
 * Read a varint from bytes
 *
 * Varints are unsigned integers encoded with variable length.
 * Each byte uses 7 bits for data and 1 bit to indicate continuation.
 *
 * @param bytes - Byte array to read from
 * @returns Object with the decoded value and number of bytes read
 */
function readVarint(bytes: Uint8Array): { value: number; bytesRead: number } {
  let value = 0;
  let shift = 0;
  let bytesRead = 0;

  for (let i = 0; i < bytes.length; i++) {
    const byte = bytes[i];
    value |= (byte & 0x7f) << shift;
    bytesRead++;

    if ((byte & 0x80) === 0) {
      break;
    }
    shift += 7;
  }

  return { value, bytesRead };
}

/**
 * Modular exponentiation: (base^exp) mod mod
 *
 * Uses square-and-multiply algorithm for efficiency.
 */
function modPow(base: bigint, exp: bigint, mod: bigint): bigint {
  let result = BigInt(1);
  base = base % mod;

  while (exp > 0) {
    if (exp % BigInt(2) === BigInt(1)) {
      result = (result * base) % mod;
    }
    exp = exp / BigInt(2);
    base = (base * base) % mod;
  }

  return result;
}

/**
 * Decompress a compressed P-256 public key
 *
 * Compressed P-256 keys are 33 bytes: 1 byte prefix (0x02 or 0x03) + 32 bytes X coordinate.
 * The Y coordinate is calculated from the X coordinate and the prefix indicates the sign.
 *
 * @param compressed - Compressed public key bytes (33 bytes)
 * @returns Uncompressed public key bytes (65 bytes) or null on error
 */
async function decompressP256PublicKey(
  compressed: Uint8Array,
): Promise<Uint8Array | null> {
  try {
    if (compressed.length !== 33) {
      return null;
    }

    const prefix = compressed[0];
    if (prefix !== 0x02 && prefix !== 0x03) {
      return null;
    }

    // Extract X coordinate
    const x = compressed.slice(1);

    // P-256 curve parameters
    // p = 2^256 - 2^224 + 2^192 + 2^96 - 1
    const p = BigInt(
      "0xffffffff00000001000000000000000000000000ffffffffffffffffffffffff",
    );
    // a = -3 mod p
    const a = BigInt(
      "0xffffffff00000001000000000000000000000000fffffffffffffffffffffffc",
    );
    // b
    const b = BigInt(
      "0x5ac635d8aa3a93e7b3ebbd55769886bc651d06b0cc53b0f63bce3c3e27d2604b",
    );

    // Convert X to BigInt
    let xBigInt = BigInt(0);
    for (const byte of x) {
      xBigInt = (xBigInt << BigInt(8)) | BigInt(byte);
    }

    // Calculate y^2 = x^3 + ax + b (mod p)
    const x3 = modPow(xBigInt, BigInt(3), p);
    const ax = (a * xBigInt) % p;
    let y2 = (x3 + ax + b) % p;
    if (y2 < 0) y2 += p;

    // Calculate y = sqrt(y^2) mod p using Tonelli-Shanks
    // For P-256, p ≡ 3 (mod 4), so y = y2^((p+1)/4) mod p
    const y = modPow(y2, (p + BigInt(1)) / BigInt(4), p);

    // Check sign and adjust if needed
    const isOdd = y % BigInt(2) === BigInt(1);
    const wantOdd = prefix === 0x03;
    const finalY = isOdd === wantOdd ? y : p - y;

    // Convert Y to bytes
    const yBytes = new Uint8Array(32);
    let tempY = finalY;
    for (let i = 31; i >= 0; i--) {
      yBytes[i] = Number(tempY & BigInt(0xff));
      tempY = tempY >> BigInt(8);
    }

    // Create uncompressed key: 0x04 + X (32 bytes) + Y (32 bytes)
    const uncompressed = new Uint8Array(65);
    uncompressed[0] = 0x04;
    uncompressed.set(x, 1);
    uncompressed.set(yBytes, 33);

    return uncompressed;
  } catch (error) {
    console.error(
      `Failed to decompress P-256 key: ${error instanceof Error ? error.message : "Unknown error"}`,
    );
    return null;
  }
}

/**
 * Decode multibase-encoded value
 *
 * Supports base58btc (z prefix) and base64url (u prefix).
 *
 * @param encoded - Multibase-encoded string
 * @returns Decoded bytes
 */
function decodeMultibase(encoded: string): Uint8Array {
  if (!encoded || encoded.length === 0) {
    throw new Error("Empty multibase string");
  }

  const prefix = encoded[0];
  const data = encoded.slice(1);

  switch (prefix) {
    case "z": // base58btc
      return decodeBase58(data);
    case "u": // base64url
      return jose.base64url.decode(data);
    default:
      throw new Error(`Unsupported multibase prefix: ${prefix}`);
  }
}

/**
 * Resolve a did:key identifier to a public key
 *
 * Implements did:key resolution according to RFC 9278.
 * Extracts the multibase-encoded public key from the DID.
 *
 * Supported key types:
 * - Ed25519 (multicodec 0xed)
 * - P-256/secp256r1 (multicodec 0x1200)
 *
 * @param didKey - The did:key identifier (e.g., "did:key:z6Mkf5rGMoatrSj1f4CyvuHBeXJELe9RPdzo2PKGNCKVtZxP")
 * @returns Public key as CryptoKey or null
 *
 * @see https://w3c-ccg.github.io/did-method-key/
 */
async function resolveDidKey(didKey: string): Promise<CryptoKey | null> {
  try {
    // Extract the multibase-encoded key from the DID
    // Format: did:key:<multibase-encoded-public-key>[#<fragment>]
    const keyPart = didKey.replace(/^did:key:/, "").split("#")[0];

    if (!keyPart) {
      console.error("Invalid did:key format: missing key part");
      return null;
    }

    // Decode multibase (z prefix = base58btc)
    const keyBytes = decodeMultibase(keyPart);

    // Read multicodec prefix (varint encoded)
    const { value: codecValue, bytesRead } = readVarint(keyBytes);

    // Extract raw public key bytes (after multicodec prefix)
    const publicKeyBytes = keyBytes.slice(bytesRead);

    // Import as CryptoKey based on key type
    if (codecValue === MULTICODEC_ED25519_PUB) {
      // Ed25519 public key (32 bytes)
      if (publicKeyBytes.length !== 32) {
        console.error(
          `Invalid Ed25519 public key length: expected 32, got ${publicKeyBytes.length}`,
        );
        return null;
      }

      return await globalThis.crypto.subtle.importKey(
        "raw",
        publicKeyBytes,
        { name: "Ed25519" },
        true,
        ["verify"],
      );
    }

    if (codecValue === MULTICODEC_P256_PUB) {
      // P-256 public key (compressed: 33 bytes, uncompressed: 65 bytes)
      // Web Crypto only supports uncompressed format (0x04 prefix + 64 bytes)
      if (publicKeyBytes.length === 33) {
        // Compressed format - need to decompress
        const uncompressedKey = await decompressP256PublicKey(publicKeyBytes);
        if (!uncompressedKey) {
          console.error("Failed to decompress P-256 public key");
          return null;
        }

        return await globalThis.crypto.subtle.importKey(
          "raw",
          uncompressedKey.buffer as ArrayBuffer,
          { name: "ECDSA", namedCurve: "P-256" },
          true,
          ["verify"],
        );
      }

      if (publicKeyBytes.length === 65) {
        // Uncompressed format
        return await globalThis.crypto.subtle.importKey(
          "raw",
          publicKeyBytes.buffer as ArrayBuffer,
          { name: "ECDSA", namedCurve: "P-256" },
          true,
          ["verify"],
        );
      }

      console.error(
        `Invalid P-256 public key length: expected 33 or 65, got ${publicKeyBytes.length}`,
      );
      return null;
    }

    console.error(
      `Unsupported multicodec prefix: 0x${codecValue.toString(16)}`,
    );
    return null;
  } catch (error) {
    console.error(
      `Failed to resolve did:key: ${error instanceof Error ? error.message : "Unknown error"}`,
    );
    return null;
  }
}

/**
 * DID Document structure (simplified for verification method extraction)
 */
interface DIDDocument {
  id: string;
  verificationMethod?: Array<{
    id: string;
    type: string;
    controller: string;
    publicKeyJwk?: jose.JWK;
    publicKeyMultibase?: string;
  }>;
  assertionMethod?: Array<string | { id: string }>;
  authentication?: Array<string | { id: string }>;
}

/**
 * Find the default verification method from a DID document
 *
 * Looks for the first assertionMethod or authentication reference.
 */
function findDefaultVerificationMethod(
  didDocument: DIDDocument,
): string | null {
  // Try assertionMethod first (preferred for credentials)
  if (didDocument.assertionMethod && didDocument.assertionMethod.length > 0) {
    const am = didDocument.assertionMethod[0];
    return typeof am === "string" ? am : am.id;
  }

  // Fall back to authentication
  if (didDocument.authentication && didDocument.authentication.length > 0) {
    const auth = didDocument.authentication[0];
    return typeof auth === "string" ? auth : auth.id;
  }

  // Fall back to first verification method
  if (
    didDocument.verificationMethod &&
    didDocument.verificationMethod.length > 0
  ) {
    return didDocument.verificationMethod[0].id;
  }

  return null;
}

/**
 * Extract a CryptoKey from a verification method object
 */
async function extractPublicKeyFromVerificationMethod(
  vm: NonNullable<DIDDocument["verificationMethod"]>[number],
): Promise<CryptoKey | null> {
  try {
    // Handle publicKeyJwk
    if (vm.publicKeyJwk) {
      const imported = await jose.importJWK(vm.publicKeyJwk);
      if (imported instanceof Uint8Array) {
        console.error("Expected CryptoKey but got Uint8Array from importJWK");
        return null;
      }
      return imported;
    }

    // Handle publicKeyMultibase (used with Ed25519VerificationKey2020)
    if (vm.publicKeyMultibase) {
      const keyBytes = decodeMultibase(vm.publicKeyMultibase);

      // Check for multicodec prefix
      const { value: codecValue, bytesRead } = readVarint(keyBytes);
      const publicKeyBytes = keyBytes.slice(bytesRead);

      // Determine key type from verification method type or multicodec
      if (
        vm.type === "Ed25519VerificationKey2020" ||
        vm.type === "Ed25519VerificationKey2018" ||
        codecValue === MULTICODEC_ED25519_PUB
      ) {
        const keyData =
          publicKeyBytes.length === 32 ? publicKeyBytes : keyBytes;
        return await globalThis.crypto.subtle.importKey(
          "raw",
          keyData.buffer as ArrayBuffer,
          { name: "Ed25519" },
          true,
          ["verify"],
        );
      }

      if (
        vm.type === "EcdsaSecp256r1VerificationKey2019" ||
        vm.type === "JsonWebKey2020" ||
        codecValue === MULTICODEC_P256_PUB
      ) {
        // Handle P-256 key
        const keyToUse =
          publicKeyBytes.length === 33 || publicKeyBytes.length === 65
            ? publicKeyBytes
            : keyBytes;

        if (keyToUse.length === 33) {
          const uncompressed = await decompressP256PublicKey(keyToUse);
          if (!uncompressed) {
            return null;
          }
          return await globalThis.crypto.subtle.importKey(
            "raw",
            uncompressed.buffer as ArrayBuffer,
            { name: "ECDSA", namedCurve: "P-256" },
            true,
            ["verify"],
          );
        }

        return await globalThis.crypto.subtle.importKey(
          "raw",
          keyToUse.buffer as ArrayBuffer,
          { name: "ECDSA", namedCurve: "P-256" },
          true,
          ["verify"],
        );
      }

      console.error(`Unsupported verification method type: ${vm.type}`);
      return null;
    }

    console.error(
      "Verification method has no publicKeyJwk or publicKeyMultibase",
    );
    return null;
  } catch (error) {
    console.error(
      `Failed to extract public key: ${error instanceof Error ? error.message : "Unknown error"}`,
    );
    return null;
  }
}

/**
 * Resolve a did:web identifier to a public key
 *
 * Implements did:web resolution by fetching the DID document from
 * the web domain specified in the DID.
 *
 * Conversion rules:
 * - did:web:example.com -> https://example.com/.well-known/did.json
 * - did:web:example.com:user:alice -> https://example.com/user/alice/did.json
 * - did:web:example.com%3A8080 -> https://example.com:8080/.well-known/did.json
 *
 * @param didWeb - The did:web identifier (e.g., "did:web:example.com" or "did:web:example.com:user:alice#key-1")
 * @returns Public key as CryptoKey or null
 *
 * @see https://w3c-ccg.github.io/did-method-web/
 */
async function resolveDidWeb(didWeb: string): Promise<CryptoKey | null> {
  try {
    // Parse the did:web identifier
    // Format: did:web:<domain>[:<path>...]#<fragment>
    const [didPart, fragment] = didWeb.split("#");
    const parts = didPart.replace(/^did:web:/, "").split(":");

    if (parts.length === 0 || !parts[0]) {
      console.error("Invalid did:web format: missing domain");
      return null;
    }

    // First part is the domain (URL-decoded, may contain port as %3A)
    const domain = decodeURIComponent(parts[0]);

    // Remaining parts form the path
    const pathParts = parts.slice(1).map(decodeURIComponent);

    // Construct the URL
    let url: string;
    if (pathParts.length === 0) {
      // No path - use .well-known
      url = `https://${domain}/.well-known/did.json`;
    } else {
      // Path specified - append did.json
      url = `https://${domain}/${pathParts.join("/")}/did.json`;
    }

    // Fetch the DID document
    const response = await fetch(url, {
      headers: {
        Accept: "application/did+json, application/json",
      },
    });

    if (!response.ok) {
      console.error(
        `Failed to fetch DID document from ${url}: ${response.status} ${response.statusText}`,
      );
      return null;
    }

    const didDocument = (await response.json()) as DIDDocument;

    // Validate DID document
    if (!didDocument.id) {
      console.error("Invalid DID document: missing 'id' field");
      return null;
    }

    // Find the verification method
    const verificationMethodId = fragment
      ? `${didPart}#${fragment}`
      : findDefaultVerificationMethod(didDocument);

    if (!verificationMethodId) {
      console.error("No verification method found in DID document");
      return null;
    }

    // Look up the verification method
    const verificationMethod = didDocument.verificationMethod?.find(
      (vm) => vm.id === verificationMethodId || vm.id === `#${fragment}`,
    );

    if (!verificationMethod) {
      console.error(`Verification method not found: ${verificationMethodId}`);
      return null;
    }

    // Extract public key from verification method
    return await extractPublicKeyFromVerificationMethod(verificationMethod);
  } catch (error) {
    console.error(
      `Failed to resolve did:web: ${error instanceof Error ? error.message : "Unknown error"}`,
    );
    return null;
  }
}

/**
 * Resolve a JWKS endpoint to a public key
 *
 * Fetches the JWKS from the specified URL and extracts the appropriate key.
 *
 * @param jwksUrl - URL of the JWKS endpoint
 * @returns Public key as CryptoKey or null
 */
async function resolveJWKS(_jwksUrl: string): Promise<CryptoKey | null> {
  try {
    // Create remote JWKS - returns a function for jose.jwtVerify
    // However, we can't use it directly here without a key ID
    // This needs to be refactored when we implement full JWKS support
    console.warn(`JWKS resolution requires key ID: ${_jwksUrl}`);
    return null;
  } catch (error) {
    console.error(
      `Failed to create remote JWKS: ${error instanceof Error ? error.message : "Unknown error"}`,
    );
    return null;
  }
}

/**
 * Resolve a verification method IRI to a public key
 *
 * Supports multiple resolution strategies:
 * - Custom resolver function (if provided in options)
 * - DID resolution (did:key, did:web)
 * - JWKS endpoint resolution
 *
 * @param verificationMethod - IRI of the verification method
 * @param customResolver - Optional custom resolver function
 * @returns Public key material (CryptoKey or JWK string) or null if resolution fails
 */
export async function resolveVerificationMethod(
  verificationMethod: Shared.IRI,
  customResolver?: VerificationMethodResolver,
): Promise<CryptoKey | string | null> {
  // Use custom resolver if provided
  if (customResolver) {
    try {
      return await customResolver(verificationMethod);
    } catch (error) {
      console.error(
        `Custom verification method resolver failed: ${error instanceof Error ? error.message : "Unknown error"}`,
      );
      return null;
    }
  }

  // Parse the verification method IRI
  const vmString = String(verificationMethod);

  // Handle did:key resolution (RFC 9278)
  if (vmString.startsWith("did:key:")) {
    try {
      return await resolveDidKey(vmString);
    } catch (error) {
      console.error(
        `DID key resolution failed: ${error instanceof Error ? error.message : "Unknown error"}`,
      );
      return null;
    }
  }

  // Handle did:web resolution
  if (vmString.startsWith("did:web:")) {
    try {
      return await resolveDidWeb(vmString);
    } catch (error) {
      console.error(
        `DID web resolution failed: ${error instanceof Error ? error.message : "Unknown error"}`,
      );
      return null;
    }
  }

  // Handle JWKS endpoint resolution
  if (vmString.startsWith("http://") || vmString.startsWith("https://")) {
    try {
      return await resolveJWKS(vmString);
    } catch (error) {
      console.error(
        `JWKS resolution failed: ${error instanceof Error ? error.message : "Unknown error"}`,
      );
      return null;
    }
  }

  // Unsupported verification method format
  console.error(`Unsupported verification method format: ${vmString}`);
  return null;
}

// =============================================================================
// Exported Functions
// =============================================================================

/**
 * Verify a JWT-based proof (VC-JWT format)
 *
 * Verifies the cryptographic signature of a JWT credential using the
 * verification method specified in the credential.
 *
 * @param jwtString - The JWT credential as a compact serialized string
 * @param verificationMethod - IRI of the verification method to use
 * @param options - Verification options
 * @returns Verification check result
 *
 * @see https://www.w3.org/TR/vc-jose-cose/#securing-with-jose
 */
export async function verifyJWTProof(
  jwtString: string,
  verificationMethod: Shared.IRI,
  options?: VerificationOptions,
): Promise<VerificationCheck> {
  try {
    // Decode JWT header to inspect algorithm and key ID
    const protectedHeader = jose.decodeProtectedHeader(jwtString);

    // Validate required header fields
    if (!protectedHeader.alg) {
      return {
        check: "proof.jwt.algorithm",
        description: "JWT proof algorithm validation",
        passed: false,
        error: "JWT missing 'alg' header parameter",
      };
    }

    // Validate typ header for VC-JWT
    if (protectedHeader.typ && protectedHeader.typ !== "JWT") {
      // W3C VC-JWT spec allows "JWT" or omission
      if (
        protectedHeader.typ !== "vc+jwt" &&
        protectedHeader.typ !== "vc+ld+jwt"
      ) {
        return {
          check: "proof.jwt.type",
          description: "JWT type header validation",
          passed: false,
          error: `Unexpected JWT typ header: ${protectedHeader.typ}`,
          details: { typ: protectedHeader.typ },
        };
      }
    }

    // Resolve verification method to public key
    const publicKeyOrString = await resolveVerificationMethod(
      verificationMethod,
      options?.verificationMethodResolver,
    );

    if (!publicKeyOrString) {
      return {
        check: "proof.jwt.verification-method",
        description: "JWT verification method resolution",
        passed: false,
        error: `Failed to resolve verification method: ${verificationMethod}`,
        details: { verificationMethod },
      };
    }

    // Convert string keys to JWK if needed
    const publicKey =
      typeof publicKeyOrString === "string"
        ? (JSON.parse(publicKeyOrString) as jose.JWK)
        : publicKeyOrString;

    // Verify JWT signature
    const { payload } = await jose.jwtVerify(jwtString, publicKey, {
      algorithms: [protectedHeader.alg],
    });

    // Check proof creation time if maxProofAge is specified
    if (options?.maxProofAge !== undefined) {
      const now = Math.floor(Date.now() / 1000);
      const iat = payload.iat;

      if (typeof iat === "number") {
        const proofAge = now - iat;
        if (proofAge > options.maxProofAge) {
          return {
            check: "proof.jwt.age",
            description: "JWT proof age validation",
            passed: false,
            error: `Proof age ${proofAge}s exceeds maximum ${options.maxProofAge}s`,
            details: {
              proofAge,
              maxProofAge: options.maxProofAge,
              issuedAt: iat,
            },
          };
        }
      }
    }

    return {
      check: "proof.jwt.signature",
      description: "JWT proof signature verification",
      passed: true,
      details: {
        algorithm: protectedHeader.alg,
        keyId: protectedHeader.kid,
        verificationMethod,
      },
    };
  } catch (error) {
    const errorMessage =
      error instanceof Error ? error.message : "Unknown error";

    return {
      check: "proof.jwt.signature",
      description: "JWT proof signature verification",
      passed: false,
      error: `JWT verification failed: ${errorMessage}`,
      details: {
        verificationMethod,
        errorType: error instanceof Error ? error.constructor.name : "Unknown",
      },
    };
  }
}

/**
 * Validate proof structure has required fields
 *
 * Checks that the proof object contains all required fields per W3C spec.
 *
 * @param proof - The proof object to validate
 * @returns Validation check result
 */
function validateProofStructure(
  proof: Record<string, unknown>,
): VerificationCheck | null {
  // Required fields for all proof types
  const requiredFields = [
    "type",
    "proofPurpose",
    "verificationMethod",
    "proofValue",
  ];

  for (const field of requiredFields) {
    if (!(field in proof) || typeof proof[field] !== "string") {
      return {
        check: "proof.linked-data.structure",
        description: "Linked Data proof structure validation",
        passed: false,
        error: `Proof missing required field: ${field}`,
        details: { missingField: field, proof },
      };
    }
  }

  // Validate proofPurpose (should be assertionMethod for credentials)
  if (
    proof.proofPurpose !== "assertionMethod" &&
    proof.proofPurpose !== "authentication"
  ) {
    return {
      check: "proof.linked-data.purpose",
      description: "Proof purpose validation",
      passed: false,
      error: `Invalid proof purpose: ${proof.proofPurpose}`,
      details: {
        proofPurpose: proof.proofPurpose,
        expected: ["assertionMethod", "authentication"],
      },
    };
  }

  return null; // Structure is valid
}

/**
 * Canonicalize JSON-LD document
 *
 * Performs simple JSON canonicalization (not full JSON-LD normalization).
 * This is a minimal implementation that works for simple credentials.
 * Full JSON-LD canonicalization with URDNA2015 should be used in production.
 *
 * @param document - The document to canonicalize (with proof removed)
 * @returns Canonicalized string
 */
function canonicalizeDocument(document: Record<string, unknown>): string {
  // Remove proof field if present
  const { proof: _proof, ...docWithoutProof } = document;

  // Simple JSON stringify with sorted keys
  // Note: This is NOT full JSON-LD canonicalization (URDNA2015)
  // but works for simple cases without expanded JSON-LD context
  const sortKeys = (obj: unknown): unknown => {
    if (Array.isArray(obj)) {
      return obj.map(sortKeys);
    }
    if (obj !== null && typeof obj === "object") {
      return Object.keys(obj)
        .sort()
        .reduce(
          (result, key) => {
            result[key] = sortKeys((obj as Record<string, unknown>)[key]);
            return result;
          },
          {} as Record<string, unknown>,
        );
    }
    return obj;
  };

  return JSON.stringify(sortKeys(docWithoutProof));
}

/**
 * Verify Ed25519Signature2020 proof
 *
 * Ed25519 is a EdDSA signature over Curve25519.
 *
 * @param document - Canonicalized document
 * @param proofValue - Multibase-encoded signature
 * @param publicKey - Public key material
 * @returns True if valid
 */
async function verifyEd25519Signature2020(
  document: string,
  proofValue: string,
  publicKey: CryptoKey | string,
): Promise<boolean> {
  try {
    // Decode multibase signature (z prefix = base58btc)
    const signatureBytes = decodeMultibase(proofValue);

    // Convert document to bytes
    const documentBytes = new TextEncoder().encode(document);

    // If publicKey is a string, parse as JWK
    let cryptoKey: CryptoKey;
    if (typeof publicKey === "string") {
      const imported = await jose.importJWK(JSON.parse(publicKey));
      if (imported instanceof Uint8Array) {
        throw new Error("Expected CryptoKey but got Uint8Array from importJWK");
      }
      cryptoKey = imported;
    } else {
      cryptoKey = publicKey;
    }

    // Verify signature using Web Crypto API
    const isValid = await globalThis.crypto.subtle.verify(
      "Ed25519",
      cryptoKey,
      new Uint8Array(signatureBytes),
      documentBytes,
    );

    return isValid;
  } catch (error) {
    console.error(
      `Ed25519 verification error: ${error instanceof Error ? error.message : "Unknown"}`,
    );
    return false;
  }
}

/**
 * Verify DataIntegrityProof signature
 *
 * Supports eddsa-rdfc-2022 and other cryptosuites.
 *
 * @param document - Canonicalized document
 * @param proofValue - Multibase-encoded signature
 * @param publicKey - Public key material
 * @param proof - Full proof object
 * @returns True if valid
 */
async function verifyDataIntegrityProof(
  document: string,
  proofValue: string,
  publicKey: CryptoKey | string,
  proof: Record<string, unknown>,
): Promise<boolean> {
  const cryptosuite = proof.cryptosuite as string | undefined;

  // For eddsa-rdfc-2022, use Ed25519 verification
  if (cryptosuite === "eddsa-rdfc-2022") {
    return verifyEd25519Signature2020(document, proofValue, publicKey);
  }

  // For other cryptosuites, we don't have implementations yet
  throw new Error(`Unsupported cryptosuite: ${cryptosuite || "none"}`);
}

/**
 * Verify EcdsaSecp256k1Signature2019 proof
 *
 * ECDSA signature over secp256k1 curve (Bitcoin/Ethereum curve).
 *
 * @param document - Canonicalized document
 * @param proofValue - JWS-encoded signature
 * @param publicKey - Public key material
 * @returns True if valid
 */
async function verifyEcdsaSecp256k1Signature2019(
  document: string,
  proofValue: string,
  publicKey: CryptoKey | string,
): Promise<boolean> {
  try {
    // EcdsaSecp256k1Signature2019 uses JWS-style encoding
    // Decode JWS (base64url without padding)
    const signatureBytes = jose.base64url.decode(proofValue);

    const documentBytes = new TextEncoder().encode(document);

    // If publicKey is a string, parse as JWK
    let cryptoKey: CryptoKey;
    if (typeof publicKey === "string") {
      const imported = await jose.importJWK(JSON.parse(publicKey));
      if (imported instanceof Uint8Array) {
        throw new Error("Expected CryptoKey but got Uint8Array from importJWK");
      }
      cryptoKey = imported;
    } else {
      cryptoKey = publicKey;
    }

    // Verify using ECDSA with P-256 (secp256k1 not widely supported in Web Crypto)
    // Note: This is a limitation - full secp256k1 support requires additional libraries
    const isValid = await globalThis.crypto.subtle.verify(
      {
        name: "ECDSA",
        hash: "SHA-256",
      },
      cryptoKey,
      new Uint8Array(signatureBytes),
      documentBytes,
    );

    return isValid;
  } catch (error) {
    console.error(
      `ECDSA secp256k1 verification error: ${error instanceof Error ? error.message : "Unknown"}`,
    );
    return false;
  }
}

/**
 * Verify JsonWebSignature2020 proof
 *
 * JWS-based linked data signature.
 *
 * @param document - Canonicalized document
 * @param proofValue - JWS detached signature
 * @param publicKey - Public key material
 * @returns True if valid
 */
async function verifyJsonWebSignature2020(
  document: string,
  proofValue: string,
  publicKey: CryptoKey | string,
): Promise<boolean> {
  try {
    // JsonWebSignature2020 uses detached JWS
    // proofValue is in format: <header>..<signature>
    const parts = proofValue.split("..");
    if (parts.length !== 2) {
      throw new Error("Invalid JWS format: expected header..signature");
    }

    const [header, signature] = parts;

    // Reconstruct JWS with document as payload
    const payload = jose.base64url.encode(new TextEncoder().encode(document));
    const jws = `${header}.${payload}.${signature}`;

    // Parse public key if needed
    let cryptoKey: CryptoKey;
    if (typeof publicKey === "string") {
      const imported = await jose.importJWK(JSON.parse(publicKey));
      if (imported instanceof Uint8Array) {
        throw new Error("Expected CryptoKey but got Uint8Array from importJWK");
      }
      cryptoKey = imported;
    } else {
      cryptoKey = publicKey;
    }

    // Verify JWS
    await jose.jwtVerify(jws, cryptoKey);

    return true;
  } catch (error) {
    console.error(
      `JsonWebSignature2020 verification error: ${error instanceof Error ? error.message : "Unknown"}`,
    );
    return false;
  }
}

/**
 * Verify proof signature based on proof type
 *
 * Dispatches to appropriate verification method based on proof type.
 *
 * @param proofType - Type of proof (DataIntegrityProof, Ed25519Signature2020, etc.)
 * @param canonicalDocument - Canonicalized document string
 * @param proofValue - Base64url-encoded signature
 * @param publicKey - Public key (CryptoKey or JWK string)
 * @param proof - Full proof object for additional fields
 * @returns True if signature is valid
 */
async function verifyProofSignature(
  proofType: string,
  canonicalDocument: string,
  proofValue: string,
  publicKey: CryptoKey | string,
  proof: Record<string, unknown>,
): Promise<boolean> {
  switch (proofType) {
    case "DataIntegrityProof":
      return verifyDataIntegrityProof(
        canonicalDocument,
        proofValue,
        publicKey,
        proof,
      );

    case "Ed25519Signature2020":
      return verifyEd25519Signature2020(
        canonicalDocument,
        proofValue,
        publicKey,
      );

    case "EcdsaSecp256k1Signature2019":
      return verifyEcdsaSecp256k1Signature2019(
        canonicalDocument,
        proofValue,
        publicKey,
      );

    case "JsonWebSignature2020":
      return verifyJsonWebSignature2020(
        canonicalDocument,
        proofValue,
        publicKey,
      );

    default:
      throw new Error(`Unsupported proof type: ${proofType}`);
  }
}

/**
 * Verify a Linked Data proof (Data Integrity format)
 *
 * Verifies a W3C Data Integrity proof using the specified cryptosuite.
 * Supports DataIntegrityProof, JsonWebSignature2020, Ed25519Signature2020,
 * and EcdsaSecp256k1Signature2019.
 *
 * @param credential - The credential object with embedded proof
 * @param proof - The proof object to verify
 * @param options - Verification options
 * @returns Verification check result
 *
 * @see https://www.w3.org/TR/vc-data-integrity/
 */
export async function verifyLinkedDataProof(
  credential: Record<string, unknown>,
  proof: Record<string, unknown>,
  options?: VerificationOptions,
): Promise<VerificationCheck> {
  try {
    // Step 1: Validate proof structure
    const structureError = validateProofStructure(proof);
    if (structureError) {
      return structureError;
    }

    const proofType = proof.type as string;
    const verificationMethod = proof.verificationMethod as Shared.IRI;
    const proofValue = proof.proofValue as string;

    // Step 2: Resolve verification method to public key
    const publicKeyOrString = await resolveVerificationMethod(
      verificationMethod,
      options?.verificationMethodResolver,
    );

    if (!publicKeyOrString) {
      return {
        check: "proof.linked-data.verification-method",
        description: "Linked Data verification method resolution",
        passed: false,
        error: `Failed to resolve verification method: ${verificationMethod}`,
        details: { verificationMethod, proofType },
      };
    }

    // Step 3: Canonicalize credential (remove proof)
    const canonicalDocument = canonicalizeDocument(credential);

    // Step 4: Verify signature based on proof type
    const isValid = await verifyProofSignature(
      proofType,
      canonicalDocument,
      proofValue,
      publicKeyOrString,
      proof,
    );

    if (!isValid) {
      return {
        check: "proof.linked-data.signature",
        description: "Linked Data proof signature verification",
        passed: false,
        error: `Signature verification failed for ${proofType}`,
        details: {
          proofType,
          verificationMethod,
          cryptosuite: proof.cryptosuite,
        },
      };
    }

    // Verification successful
    return {
      check: "proof.linked-data.signature",
      description: "Linked Data proof signature verification",
      passed: true,
      details: {
        proofType,
        verificationMethod,
        cryptosuite: proof.cryptosuite,
        proofPurpose: proof.proofPurpose,
      },
    };
  } catch (error) {
    const errorMessage =
      error instanceof Error ? error.message : "Unknown error";

    return {
      check: "proof.linked-data.signature",
      description: "Linked Data proof signature verification",
      passed: false,
      error: `Linked Data proof verification failed: ${errorMessage}`,
      details: {
        proofType: proof.type,
        errorType: error instanceof Error ? error.constructor.name : "Unknown",
      },
    };
  }
}
