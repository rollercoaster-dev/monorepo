/**
 * Issuer Verification Service
 *
 * Handles verification of badge issuers including DID resolution
 * and JWKS fetching for Open Badges 3.0 verification.
 *
 * @see https://www.imsglobal.org/spec/ob/v3p0
 * @see https://www.w3.org/TR/did-core/
 */

import type * as jose from "jose";
import type { Shared } from "openbadges-types";
import type { VerificationCheck } from "./types.js";

/**
 * DID Document structure (simplified)
 * Based on W3C DID Core specification
 */
interface DIDDocument {
  id: string;
  verificationMethod?: Array<{
    id: string;
    type: string;
    controller: string;
    publicKeyJwk?: Record<string, unknown>;
  }>;
  assertionMethod?: string[];
  [key: string]: unknown;
}

/**
 * Resolve did:web DID by fetching DID document via HTTPS
 *
 * Conversion rules:
 * - did:web:example.com -> https://example.com/.well-known/did.json
 * - did:web:example.com:user:alice -> https://example.com/user/alice/did.json
 *
 * @param didWeb - did:web URI
 * @returns DID Document
 */
async function resolveDIDWeb(didWeb: string): Promise<DIDDocument | null> {
  try {
    // Parse did:web identifier
    // Format: did:web:domain[:path][:segments]
    const didParts = didWeb.split(":");
    if (didParts.length < 3) {
      return null;
    }

    const domain = didParts[2];
    const pathSegments = didParts.slice(3);

    // Construct HTTPS URL
    let url: string;
    if (pathSegments.length === 0) {
      url = `https://${domain}/.well-known/did.json`;
    } else {
      const path = pathSegments.join("/");
      url = `https://${domain}/${path}/did.json`;
    }

    // Fetch DID document
    const response = await fetch(url);
    if (!response.ok) {
      return null;
    }

    const didDocument = (await response.json()) as DIDDocument;

    // Basic validation
    if (!didDocument.id || didDocument.id !== didWeb) {
      return null;
    }

    return didDocument;
  } catch (error) {
    console.error("did:web resolution failed:", error);
    return null;
  }
}

/**
 * Resolve did:key DID (no network required)
 *
 * did:key is a self-contained DID method where the public key
 * is encoded directly in the DID string.
 *
 * Note: Full did:key parsing requires multicodec/multibase libraries.
 * This is a minimal implementation for testing.
 *
 * @param didKey - did:key URI
 * @returns DID Document
 */
function resolveDIDKey(didKey: string): DIDDocument | null {
  try {
    // did:key format: did:key:multibase-encoded-public-key
    const didParts = didKey.split(":");
    if (didParts.length !== 3 || !didParts[2]) {
      return null;
    }

    // For now, return a minimal DID document
    // Full implementation would decode the multibase key
    return {
      id: didKey,
      verificationMethod: [
        {
          id: `${didKey}#key-1`,
          type: "JsonWebKey2020",
          controller: didKey,
          publicKeyJwk: {}, // Would contain decoded key
        },
      ],
      assertionMethod: [`${didKey}#key-1`],
    };
  } catch (error) {
    console.error("did:key resolution failed:", error);
    return null;
  }
}

/**
 * Resolve a DID to its DID Document
 *
 * Supports:
 * - did:web - Resolve via HTTPS
 * - did:key - Parse from DID string
 *
 * @param issuerDID - DID URI to resolve
 * @returns DID Document or null if resolution fails
 */
export async function resolveIssuerDID(
  issuerDID: Shared.IRI,
): Promise<DIDDocument | null> {
  try {
    // Validate DID format
    if (!issuerDID.startsWith("did:")) {
      return null;
    }

    const [, method] = issuerDID.split(":");

    switch (method) {
      case "web":
        return await resolveDIDWeb(issuerDID);
      case "key":
        return resolveDIDKey(issuerDID);
      default:
        // Unsupported DID method
        return null;
    }
  } catch (error) {
    // Log error but return null for graceful handling
    console.error("DID resolution failed:", error);
    return null;
  }
}

/**
 * Fetch and parse JWKS from a given URI
 *
 * Uses jose library to fetch and validate JWKS structure.
 *
 * @param jwksUri - URI of the JWKS endpoint
 * @returns Parsed JWKS or null if fetch/parse fails
 */
async function fetchJWKSFromURI(
  jwksUri: string,
): Promise<jose.JSONWebKeySet | null> {
  try {
    const response = await fetch(jwksUri);
    if (!response.ok) {
      return null;
    }

    const jwks = (await response.json()) as jose.JSONWebKeySet;

    // Validate JWKS structure
    if (!jwks.keys || !Array.isArray(jwks.keys) || jwks.keys.length === 0) {
      return null;
    }

    return jwks;
  } catch (error) {
    console.error("JWKS fetch failed:", error);
    return null;
  }
}

/**
 * Fetch issuer JWKS and return verification check
 *
 * Extracts JWKS URI from DID document and fetches the key set.
 *
 * @param didDocument - DID document containing JWKS reference
 * @returns Verification check result
 */
export async function fetchIssuerJWKS(
  didDocument: DIDDocument,
): Promise<{ check: VerificationCheck; jwks: jose.JSONWebKeySet | null }> {
  // Look for JWKS URI in verification methods
  // Common patterns:
  // 1. service endpoint with type "JsonWebKey2020"
  // 2. verificationMethod with publicKeyJwk
  let jwksUri: string | null = null;

  // Check for service endpoints
  if (Array.isArray(didDocument.service)) {
    const jwksService = didDocument.service.find(
      (s: { type: string }) => s.type === "JwksEndpoint",
    );
    if (jwksService && "serviceEndpoint" in jwksService) {
      jwksUri = jwksService.serviceEndpoint as string;
    }
  }

  // If no JWKS URI found, try to construct from verification methods
  if (!jwksUri && didDocument.verificationMethod?.[0]?.publicKeyJwk) {
    // For did:key or embedded keys, we can create an inline JWKS
    const jwks: jose.JSONWebKeySet = {
      keys: didDocument.verificationMethod
        .filter((vm) => vm.publicKeyJwk)
        .map((vm) => ({
          ...(vm.publicKeyJwk as jose.JWK),
          kid: vm.id,
        })),
    };

    return {
      check: {
        check: "issuer-jwks-fetch",
        description: "Fetch issuer JWKS for verification",
        passed: true,
        details: {
          keyCount: jwks.keys.length,
          source: "embedded",
        },
      },
      jwks,
    };
  }

  // If we have a JWKS URI, fetch it
  if (jwksUri) {
    const jwks = await fetchJWKSFromURI(jwksUri);

    if (!jwks) {
      return {
        check: {
          check: "issuer-jwks-fetch",
          description: "Fetch issuer JWKS for verification",
          passed: false,
          error: `Failed to fetch JWKS from ${jwksUri}`,
        },
        jwks: null,
      };
    }

    return {
      check: {
        check: "issuer-jwks-fetch",
        description: "Fetch issuer JWKS for verification",
        passed: true,
        details: {
          keyCount: jwks.keys.length,
          source: "remote",
          jwksUri,
        },
      },
      jwks,
    };
  }

  // No JWKS found
  return {
    check: {
      check: "issuer-jwks-fetch",
      description: "Fetch issuer JWKS for verification",
      passed: false,
      error: "No JWKS URI or embedded keys found in DID document",
    },
    jwks: null,
  };
}

/**
 * Verify issuer DID and fetch JWKS
 *
 * Complete issuer verification workflow that:
 * 1. Resolves the issuer DID to a DID document
 * 2. Fetches the issuer's JWKS for key verification
 *
 * @param issuerDID - Issuer DID to verify
 * @returns Array of verification checks
 */
export async function verifyIssuer(
  issuerDID: Shared.IRI,
): Promise<VerificationCheck[]> {
  const checks: VerificationCheck[] = [];

  // Step 1: Resolve DID
  const didDocument = await resolveIssuerDID(issuerDID);

  if (!didDocument) {
    checks.push({
      check: "issuer-did-resolution",
      description: "Resolve issuer DID to DID document",
      passed: false,
      error: `Failed to resolve DID: ${issuerDID}`,
    });
    return checks;
  }

  checks.push({
    check: "issuer-did-resolution",
    description: "Resolve issuer DID to DID document",
    passed: true,
    details: {
      didMethod: issuerDID.split(":")[1],
      verificationMethodCount: didDocument.verificationMethod?.length ?? 0,
    },
  });

  // Step 2: Fetch JWKS
  const { check: jwksCheck } = await fetchIssuerJWKS(didDocument);
  checks.push(jwksCheck);

  return checks;
}
