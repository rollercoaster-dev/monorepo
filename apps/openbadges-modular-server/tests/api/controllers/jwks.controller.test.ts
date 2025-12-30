/**
 * Unit tests for JWKS Controller
 *
 * Tests the JWKS endpoint functionality including response format,
 * content validation, error handling, and caching behavior.
 * Also tests DID:web document generation.
 */

import { describe, it, expect, beforeEach, afterEach } from "bun:test";
import { JwksController } from "../../../src/api/controllers/jwks.controller";
import type {
  JsonWebKeySet,
  JsonWebKey,
  DidDocument,
} from "../../../src/core/key.service";
import { KeyService, KeyStatus } from "../../../src/core/key.service";
import { KeyType } from "../../../src/utils/crypto/signature";
import * as fs from "fs";
import * as path from "path";

// Type definitions for test responses
interface JwksResponse {
  status: number;
  body: JsonWebKeySet | { error: string };
}

interface DidResponse {
  status: number;
  body: DidDocument | { error: string };
}

interface TestJwk extends JsonWebKey {
  kty: string;
  use?: string;
  key_ops?: string[];
  kid?: string;
  alg?: string;
  n?: string;
  e?: string;
  crv?: string;
  x?: string;
}

describe("JwksController", () => {
  const testKeysDir = path.join(process.cwd(), "test-keys-jwks-controller");
  let jwksController: JwksController;

  beforeEach(async () => {
    // Create test keys directory
    if (!fs.existsSync(testKeysDir)) {
      fs.mkdirSync(testKeysDir, { recursive: true });
    }

    // Set up test environment
    process.env.KEYS_DIR = testKeysDir;

    // Initialize KeyService with test directory
    await KeyService.initialize();

    // Create controller instance
    jwksController = new JwksController();
  });

  afterEach(async () => {
    // Clean up test keys directory
    if (fs.existsSync(testKeysDir)) {
      const files = fs.readdirSync(testKeysDir);
      for (const file of files) {
        fs.unlinkSync(path.join(testKeysDir, file));
      }
      fs.rmdirSync(testKeysDir);
    }
  });

  describe("getJwks", () => {
    it("should return valid JWKS format", async () => {
      const result: JwksResponse = await jwksController.getJwks();

      expect(result.status).toBe(200);
      expect(result.body).toHaveProperty("keys");

      const jwks = result.body as JsonWebKeySet;
      expect(Array.isArray(jwks.keys)).toBe(true);
      expect(jwks.keys.length).toBeGreaterThanOrEqual(1);

      // Verify each key has required JWK properties
      for (const key of jwks.keys as TestJwk[]) {
        expect(key).toHaveProperty("kty");
        expect(key).toHaveProperty("use");
        expect(key).toHaveProperty("key_ops");
        expect(key).toHaveProperty("kid");
        expect(key.use).toBe("sig");
        expect(key.key_ops).toEqual(["verify"]);
      }
    });

    it("should return RSA keys in correct JWK format", async () => {
      // Generate an RSA key
      await KeyService.generateKeyPair("test-rsa", KeyType.RSA);

      const result: JwksResponse = await jwksController.getJwks();
      const jwks = result.body as JsonWebKeySet;

      // Find the RSA key
      const rsaKey = (jwks.keys as TestJwk[]).find(
        (k: TestJwk) => k.kty === "RSA",
      );
      expect(rsaKey).toBeDefined();
      expect(rsaKey?.alg).toBe("RS256");
      expect(rsaKey?.n).toBeDefined();
      expect(rsaKey?.e).toBeDefined();
      expect(typeof rsaKey?.n).toBe("string");
      expect(typeof rsaKey?.e).toBe("string");
    });

    it("should only return active keys", async () => {
      // Generate multiple keys
      await KeyService.generateKeyPair("active-key", KeyType.RSA);
      await KeyService.generateKeyPair("inactive-key", KeyType.RSA);

      // Mark one as inactive
      await KeyService.setKeyStatus("inactive-key", KeyStatus.INACTIVE);

      const result: JwksResponse = await jwksController.getJwks();
      const jwks = result.body as JsonWebKeySet;

      // Should not include inactive key
      const keyIds = (jwks.keys as TestJwk[]).map((k: TestJwk) => k.kid);
      expect(keyIds).toContain("active-key");
      expect(keyIds).not.toContain("inactive-key");
    });

    it("should handle errors gracefully", async () => {
      // Mock KeyService to throw an error
      const originalGetJwkSet = KeyService.getJwkSet;
      KeyService.getJwkSet = async () => {
        throw new Error("Test error");
      };

      const result: JwksResponse = await jwksController.getJwks();

      expect(result.status).toBe(500);
      expect(result.body).toHaveProperty("error");
      expect((result.body as { error: string }).error).toBe(
        "Internal server error while retrieving JWKS",
      );

      // Restore original method
      KeyService.getJwkSet = originalGetJwkSet;
    });
  });

  describe("Response Format Validation", () => {
    it("should return proper JSON structure for JWKS", async () => {
      const result: JwksResponse = await jwksController.getJwks();
      const jwks = result.body as JsonWebKeySet;

      // Validate JWKS structure according to RFC 7517
      expect(jwks).toHaveProperty("keys");
      expect(Array.isArray(jwks.keys)).toBe(true);

      // Each key should be a valid JWK
      for (const key of jwks.keys as TestJwk[]) {
        // Required properties
        expect(key).toHaveProperty("kty");
        expect(["RSA", "OKP"].includes(key.kty)).toBe(true);

        // Optional but expected properties
        expect(key).toHaveProperty("use");
        expect(key).toHaveProperty("key_ops");
        expect(key).toHaveProperty("alg");
        expect(key).toHaveProperty("kid");

        // Key-specific properties
        if (key.kty === "RSA") {
          expect(key).toHaveProperty("n");
          expect(key).toHaveProperty("e");
        } else if (key.kty === "OKP") {
          expect(key).toHaveProperty("crv");
          expect(key).toHaveProperty("x");
        }
      }
    });

    it("should not expose private key material", async () => {
      const result: JwksResponse = await jwksController.getJwks();
      const jwks = result.body as JsonWebKeySet;

      // Ensure no private key parameters are exposed
      for (const key of jwks.keys as TestJwk[]) {
        // RSA private parameters
        expect(key).not.toHaveProperty("d");
        expect(key).not.toHaveProperty("p");
        expect(key).not.toHaveProperty("q");
        expect(key).not.toHaveProperty("dp");
        expect(key).not.toHaveProperty("dq");
        expect(key).not.toHaveProperty("qi");

        // Ed25519 private parameter
        expect(key).not.toHaveProperty("d");
      }
    });
  });

  describe("getDidDocument", () => {
    it("should return valid DID document format", async () => {
      const result: DidResponse = await jwksController.getDidDocument();

      expect(result.status).toBe(200);
      expect(result.body).toHaveProperty("@context");
      expect(result.body).toHaveProperty("id");
      expect(result.body).toHaveProperty("verificationMethod");
      expect(result.body).toHaveProperty("authentication");
      expect(result.body).toHaveProperty("assertionMethod");

      const didDoc = result.body as DidDocument;

      // Validate @context includes required contexts
      expect(Array.isArray(didDoc["@context"])).toBe(true);
      expect(didDoc["@context"]).toContain("https://www.w3.org/ns/did/v1");
      expect(didDoc["@context"]).toContain(
        "https://w3id.org/security/suites/jws-2020/v1",
      );

      // Validate DID format (did:web:...)
      expect(didDoc.id).toMatch(/^did:web:/);
    });

    it("should include verification methods for all active keys", async () => {
      // Generate additional test keys
      await KeyService.generateKeyPair("test-rsa-did", KeyType.RSA);

      const result: DidResponse = await jwksController.getDidDocument();
      const didDoc = result.body as DidDocument;

      expect(didDoc.verificationMethod.length).toBeGreaterThanOrEqual(1);

      // Verify structure of each verification method
      for (const vm of didDoc.verificationMethod) {
        expect(vm).toHaveProperty("id");
        expect(vm).toHaveProperty("type");
        expect(vm).toHaveProperty("controller");
        expect(vm).toHaveProperty("publicKeyJwk");

        // Verify type is JsonWebKey2020
        expect(vm.type).toBe("JsonWebKey2020");

        // Verify controller matches DID
        expect(vm.controller).toBe(didDoc.id);

        // Verify id starts with DID and has fragment identifier
        expect(vm.id).toMatch(new RegExp(`^${didDoc.id}#.+$`));

        // Verify publicKeyJwk has required properties
        expect(vm.publicKeyJwk).toHaveProperty("kty");
      }
    });

    it("should use JWK kid for verification method ID when available", async () => {
      // Generate a key with a known kid
      await KeyService.generateKeyPair("my-custom-key", KeyType.RSA);

      const result: DidResponse = await jwksController.getDidDocument();
      const didDoc = result.body as DidDocument;

      // Find the verification method for our custom key
      const customKeyVm = didDoc.verificationMethod.find(
        (vm) => vm.publicKeyJwk.kid === "my-custom-key",
      );

      expect(customKeyVm).toBeDefined();
      // The verification method ID should use the kid
      expect(customKeyVm?.id).toContain("#my-custom-key");
    });

    it("should reference all verification methods in authentication and assertionMethod", async () => {
      const result: DidResponse = await jwksController.getDidDocument();
      const didDoc = result.body as DidDocument;

      const vmIds = didDoc.verificationMethod.map((vm) => vm.id);

      // Both arrays should contain all verification method IDs
      expect(didDoc.authentication).toEqual(vmIds);
      expect(didDoc.assertionMethod).toEqual(vmIds);
    });

    it("should match JWKS keys with DID verification methods", async () => {
      const jwksResult: JwksResponse = await jwksController.getJwks();
      const didResult: DidResponse = await jwksController.getDidDocument();

      const jwks = jwksResult.body as JsonWebKeySet;
      const didDoc = didResult.body as DidDocument;

      // Should have same number of keys
      expect(didDoc.verificationMethod.length).toBe(jwks.keys.length);

      // Each verification method should have a matching JWK
      didDoc.verificationMethod.forEach((vm, index) => {
        expect(vm.publicKeyJwk).toEqual(jwks.keys[index]);
      });
    });

    it("should handle errors gracefully", async () => {
      // Mock KeyService to throw an error
      const originalGetJwkSet = KeyService.getJwkSet;
      KeyService.getJwkSet = async () => {
        throw new Error("Test error");
      };

      const result: DidResponse = await jwksController.getDidDocument();

      expect(result.status).toBe(500);
      expect(result.body).toHaveProperty("error");
      expect((result.body as { error: string }).error).toBe(
        "Internal server error while generating DID document",
      );

      // Restore original method
      KeyService.getJwkSet = originalGetJwkSet;
    });

    it("should only include active keys in DID document", async () => {
      // Generate multiple keys
      await KeyService.generateKeyPair("active-did-key", KeyType.RSA);
      await KeyService.generateKeyPair("inactive-did-key", KeyType.RSA);

      // Mark one as inactive
      await KeyService.setKeyStatus("inactive-did-key", KeyStatus.INACTIVE);

      const result: DidResponse = await jwksController.getDidDocument();
      const didDoc = result.body as DidDocument;

      // Get key IDs from verification methods
      const vmKeyIds = didDoc.verificationMethod.map(
        (vm) => vm.publicKeyJwk.kid,
      );

      // Should include active key but not inactive key
      expect(vmKeyIds).toContain("active-did-key");
      expect(vmKeyIds).not.toContain("inactive-did-key");
    });

    it("should return valid DID document with empty verification methods when no keys exist", async () => {
      // Mock KeyService to return empty keys
      const originalGetJwkSet = KeyService.getJwkSet;
      KeyService.getJwkSet = async () => ({ keys: [] });

      const result: DidResponse = await jwksController.getDidDocument();

      expect(result.status).toBe(200);
      const didDoc = result.body as DidDocument;
      expect(didDoc.verificationMethod).toEqual([]);
      expect(didDoc.authentication).toEqual([]);
      expect(didDoc.assertionMethod).toEqual([]);

      // Restore original method
      KeyService.getJwkSet = originalGetJwkSet;
    });

    it("should handle invalid BASE_URL configuration gracefully", async () => {
      // Save original config value
      const { config: appConfig } = await import("../../../src/config/config");
      const originalBaseUrl = appConfig.openBadges.baseUrl;

      // Set invalid URL
      appConfig.openBadges.baseUrl = "not-a-valid-url";

      const result: DidResponse = await jwksController.getDidDocument();

      expect(result.status).toBe(500);
      expect(result.body).toHaveProperty("error");
      expect((result.body as { error: string }).error).toBe(
        "Server configuration error: Invalid BASE_URL format",
      );

      // Restore original config
      appConfig.openBadges.baseUrl = originalBaseUrl;
    });

    it("should handle empty BASE_URL configuration gracefully", async () => {
      // Save original config value
      const { config: appConfig } = await import("../../../src/config/config");
      const originalBaseUrl = appConfig.openBadges.baseUrl;

      // Set empty URL
      appConfig.openBadges.baseUrl = "";

      const result: DidResponse = await jwksController.getDidDocument();

      expect(result.status).toBe(500);
      expect(result.body).toHaveProperty("error");
      expect((result.body as { error: string }).error).toBe(
        "Server configuration error: BASE_URL not configured",
      );

      // Restore original config
      appConfig.openBadges.baseUrl = originalBaseUrl;
    });
  });
});
