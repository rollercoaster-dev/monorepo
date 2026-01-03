/**
 * Issuer Verification Service
 *
 * Handles verification of badge issuers including DID resolution
 * and JWKS fetching for Open Badges 3.0 verification.
 *
 * @see https://www.imsglobal.org/spec/ob/v3p0
 * @see https://www.w3.org/TR/did-core/
 */

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
 * Verify issuer and return verification checks
 *
 * This performs DID resolution and returns structured verification results.
 *
 * @param issuerDID - Issuer DID to verify
 * @returns Array of verification checks
 */
export async function verifyIssuerDID(
  issuerDID: Shared.IRI,
): Promise<VerificationCheck> {
  const didDocument = await resolveIssuerDID(issuerDID);

  if (!didDocument) {
    return {
      check: "issuer-did-resolution",
      description: "Resolve issuer DID to DID document",
      passed: false,
      error: `Failed to resolve DID: ${issuerDID}`,
    };
  }

  return {
    check: "issuer-did-resolution",
    description: "Resolve issuer DID to DID document",
    passed: true,
    details: {
      didMethod: issuerDID.split(":")[1],
      verificationMethodCount: didDocument.verificationMethod?.length ?? 0,
    },
  };
}
