/**
 * Well-Known Endpoints E2E Tests
 *
 * Tests for /.well-known/jwks.json and /.well-known/did.json endpoints.
 * Verifies HTTP response headers, content types, and response structure.
 */

import { describe, it, expect, afterAll, beforeAll } from "bun:test";
import { logger } from "@/utils/logging/logger.service";
import { setupTestApp, stopTestServer } from "./setup-test-app";
import { getAvailablePort, releasePort } from "./helpers/port-manager.helper";

// Port and URL configuration
let TEST_PORT: number;
let API_URL: string;

// Ensure DB-related env-vars are set before any module import
if (!process.env.DB_TYPE) {
  process.env.DB_TYPE = "sqlite";
}
if (process.env.DB_TYPE === "sqlite" && !process.env.SQLITE_DB_PATH) {
  process.env.SQLITE_DB_PATH = ":memory:";
}
if (!process.env.NODE_ENV) {
  process.env.NODE_ENV = "test";
}

import { config } from "@/config/config";

// Server instance
type BunServer = { stop: () => void };
let server: BunServer | null = null;

describe("Well-Known Endpoints - E2E", () => {
  beforeAll(async () => {
    TEST_PORT = await getAvailablePort();
    const host = config.server.host ?? "127.0.0.1";
    API_URL = `http://${host}:${TEST_PORT}`;

    logger.info(`E2E Test: Using API URL: ${API_URL}`);

    try {
      logger.info(`E2E Test: Starting server on port ${TEST_PORT}`);
      const result = await setupTestApp(TEST_PORT);
      server = result.server as BunServer;
      logger.info("E2E Test: Server started successfully");
    } catch (error) {
      logger.error("E2E Test: Failed to start server", {
        error: error instanceof Error ? error.message : "Unknown error",
      });
      throw error;
    }
  });

  afterAll(async () => {
    if (server) {
      logger.info("E2E Test: Stopping server");
      stopTestServer(server);
    }
    await releasePort(TEST_PORT);
  });

  describe("GET /.well-known/jwks.json", () => {
    it("should return JWKS with correct Content-Type header", async () => {
      const response = await fetch(`${API_URL}/.well-known/jwks.json`);

      expect(response.status).toBe(200);
      expect(response.headers.get("Content-Type")).toContain(
        "application/json",
      );
    });

    it("should return JWKS with Cache-Control header", async () => {
      const response = await fetch(`${API_URL}/.well-known/jwks.json`);

      expect(response.status).toBe(200);
      expect(response.headers.get("Cache-Control")).toBe(
        "public, max-age=3600",
      );
    });

    it("should return valid JWKS structure", async () => {
      const response = await fetch(`${API_URL}/.well-known/jwks.json`);
      const body = await response.json();

      expect(response.status).toBe(200);
      expect(body).toHaveProperty("keys");
      expect(Array.isArray(body.keys)).toBe(true);

      // Each key (if any) should be a valid JWK
      // Note: In test environment, key count may be 0
      for (const key of body.keys) {
        expect(key).toHaveProperty("kty");
        expect(key).toHaveProperty("use");
        expect(key).toHaveProperty("kid");
      }
    });
  });

  describe("GET /.well-known/did.json", () => {
    it("should return DID document with correct Content-Type header", async () => {
      const response = await fetch(`${API_URL}/.well-known/did.json`);

      expect(response.status).toBe(200);
      // The header is set to application/did+json but c.json() may override to application/json
      // Both are acceptable for a DID document
      const contentType = response.headers.get("Content-Type") || "";
      expect(
        contentType.includes("application/did+json") ||
          contentType.includes("application/json"),
      ).toBe(true);
    });

    it("should return DID document with Cache-Control header", async () => {
      const response = await fetch(`${API_URL}/.well-known/did.json`);

      expect(response.status).toBe(200);
      expect(response.headers.get("Cache-Control")).toBe(
        "public, max-age=3600",
      );
    });

    it("should return valid DID document structure", async () => {
      const response = await fetch(`${API_URL}/.well-known/did.json`);
      const body = await response.json();

      expect(response.status).toBe(200);

      // Required DID document fields
      expect(body).toHaveProperty("@context");
      expect(body).toHaveProperty("id");
      expect(body).toHaveProperty("verificationMethod");
      expect(body).toHaveProperty("authentication");
      expect(body).toHaveProperty("assertionMethod");

      // Validate @context
      expect(Array.isArray(body["@context"])).toBe(true);
      expect(body["@context"]).toContain("https://www.w3.org/ns/did/v1");

      // Validate DID format
      expect(body.id).toMatch(/^did:web:/);

      // Validate arrays
      expect(Array.isArray(body.verificationMethod)).toBe(true);
      expect(Array.isArray(body.authentication)).toBe(true);
      expect(Array.isArray(body.assertionMethod)).toBe(true);
    });

    it("should have consistent keys between JWKS and DID document", async () => {
      const [jwksResponse, didResponse] = await Promise.all([
        fetch(`${API_URL}/.well-known/jwks.json`),
        fetch(`${API_URL}/.well-known/did.json`),
      ]);

      const jwks = await jwksResponse.json();
      const did = await didResponse.json();

      // Should have same number of keys
      expect(did.verificationMethod.length).toBe(jwks.keys.length);

      // Each verification method should reference a key from JWKS
      for (const vm of did.verificationMethod) {
        const matchingJwk = jwks.keys.find(
          (k: { kid: string }) => k.kid === vm.publicKeyJwk.kid,
        );
        expect(matchingJwk).toBeDefined();
      }
    });
  });
});
