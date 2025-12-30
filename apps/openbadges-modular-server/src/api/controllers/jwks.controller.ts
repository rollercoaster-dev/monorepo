/**
 * JWKS (JSON Web Key Set) Controller
 *
 * This controller handles the JWKS endpoint for serving public keys
 * in JSON Web Key format as specified in RFC 7517, and the DID:web
 * document endpoint for DID resolution.
 */

import type {
  JsonWebKeySet,
  DidDocument,
  DidVerificationMethod,
} from "../../core/key.service";
import { KeyService } from "../../core/key.service";
import { config } from "../../config/config";
import { logger } from "../../utils/logging/logger.service";

/**
 * Controller for JWKS endpoints
 */
export class JwksController {
  /**
   * Gets the JSON Web Key Set (JWKS) containing all active public keys
   * @returns The JWKS response
   */
  async getJwks(): Promise<{
    status: number;
    body: JsonWebKeySet | { error: string };
  }> {
    try {
      logger.debug("Retrieving JWKS");

      // Get the JWKS from the key service
      const jwks = await KeyService.getJwkSet();

      // Log the number of keys returned (without exposing key details)
      logger.info("JWKS retrieved successfully", {
        keyCount: jwks.keys.length,
        keyIds: jwks.keys.map((key) => key.kid).filter(Boolean),
      });

      return {
        status: 200,
        body: jwks,
      };
    } catch (error) {
      logger.error("Failed to retrieve JWKS", {
        error: error instanceof Error ? error.message : "Unknown error",
      });

      return {
        status: 500,
        body: {
          error: "Internal server error while retrieving JWKS",
        },
      };
    }
  }

  /**
   * Gets information about key status (for administrative purposes)
   * @returns Key status information
   */
  async getKeyStatus(): Promise<{
    status: number;
    body: Record<string, unknown>;
  }> {
    try {
      logger.debug("Retrieving key status information");

      const statusInfo = KeyService.getKeyStatusInfo();
      const statusData: Record<string, unknown> = {};

      for (const [keyId, info] of statusInfo.entries()) {
        statusData[keyId] = {
          status: info.status,
          created: info.metadata?.created,
          rotatedAt: info.metadata?.rotatedAt,
          keyType: info.metadata?.keyType,
          cryptosuite: info.metadata?.cryptosuite,
        };
      }

      logger.info("Key status retrieved successfully", {
        keyCount: statusInfo.size,
      });

      return {
        status: 200,
        body: {
          keys: statusData,
          totalKeys: statusInfo.size,
        },
      };
    } catch (error) {
      logger.error("Failed to retrieve key status", {
        error: error instanceof Error ? error.message : "Unknown error",
      });

      return {
        status: 500,
        body: {
          error: "Internal server error while retrieving key status",
        },
      };
    }
  }

  /**
   * Gets the DID document for DID:web resolution
   *
   * Generates a DID document containing verification methods derived from
   * the JWKS keys. The DID identifier is constructed from the configured
   * base URL using the DID:web method specification.
   *
   * @see https://w3c-ccg.github.io/did-method-web/
   * @returns The DID document response
   */
  async getDidDocument(): Promise<{
    status: number;
    body: DidDocument | { error: string };
  }> {
    try {
      logger.debug("Generating DID document");

      // Extract hostname from base URL for DID identifier
      const baseUrl = config.openBadges.baseUrl;
      const hostname = new URL(baseUrl).host;

      // Construct DID using did:web method
      // Note: Colons in hostname (e.g., localhost:3000) must be percent-encoded
      const encodedHostname = hostname.replace(/:/g, "%3A");
      const did = `did:web:${encodedHostname}`;

      // Get JWKS to extract public keys
      const jwks = await KeyService.getJwkSet();

      // Build verification methods from JWKs
      const verificationMethod: DidVerificationMethod[] = jwks.keys.map(
        (key, index) => ({
          id: `${did}#key-${index}`,
          type: "JsonWebKey2020",
          controller: did,
          publicKeyJwk: key,
        }),
      );

      // Build references for authentication and assertionMethod
      const verificationMethodIds = verificationMethod.map((vm) => vm.id);

      const didDocument: DidDocument = {
        "@context": [
          "https://www.w3.org/ns/did/v1",
          "https://w3id.org/security/suites/jws-2020/v1",
        ],
        id: did,
        verificationMethod,
        authentication: verificationMethodIds,
        assertionMethod: verificationMethodIds,
      };

      logger.info("DID document generated successfully", {
        did,
        verificationMethodCount: verificationMethod.length,
      });

      return {
        status: 200,
        body: didDocument,
      };
    } catch (error) {
      logger.error("Failed to generate DID document", {
        error: error instanceof Error ? error.message : "Unknown error",
      });

      return {
        status: 500,
        body: {
          error: "Internal server error while generating DID document",
        },
      };
    }
  }
}
