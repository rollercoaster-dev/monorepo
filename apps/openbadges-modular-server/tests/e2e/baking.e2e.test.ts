/**
 * Baking E2E Tests
 *
 * This file contains end-to-end tests for the badge baking and verification flow.
 * It validates the complete workflow: create issuer → badge class → credential → bake into image → verify from baked image.
 */

import {
  describe,
  it,
  expect,
  afterAll,
  beforeAll,
  beforeEach,
} from "bun:test";
import { logger } from "@/utils/logging/logger.service";
import { TestDataHelper } from "./helpers/test-data.helper";
import { resetDatabase } from "./helpers/database-reset.helper";
import { setupTestApp, stopTestServer } from "./setup-test-app";
import { getAvailablePort, releasePort } from "./helpers/port-manager.helper";
import { readFileSync } from "fs";
import { join } from "path";

// Port and URL configuration
let TEST_PORT: number;
let API_URL: string;
let CREDENTIALS_ENDPOINT: string;
let VERIFY_BAKED_ENDPOINT: string;

// Ensure DB-related env-vars are set **before** any module import that may read them
if (!process.env.DB_TYPE) {
  process.env.DB_TYPE = "sqlite";
}
if (process.env.DB_TYPE === "sqlite" && !process.env.SQLITE_DB_PATH) {
  process.env.SQLITE_DB_PATH = ":memory:";
}

// Tests must run in "test" mode *before* config is imported
if (!process.env.NODE_ENV) {
  process.env.NODE_ENV = "test";
}

import { config } from "@/config/config"; // safe to import after env is prepared

// API key for protected endpoints
const API_KEY =
  process.env.AUTH_API_KEY_E2E?.split(":")[0] || "verysecretkeye2e";

// Server instance for the test
type BunServer = {
  stop: () => void;
};
let server: BunServer | null = null;

describe("Baking API - E2E", () => {
  // Start the server before all tests
  beforeAll(async () => {
    // Get an available port to avoid conflicts
    TEST_PORT = await getAvailablePort();

    // Set up API URLs after getting the port
    const host = config.server.host ?? "127.0.0.1";
    API_URL = `http://${host}:${TEST_PORT}`;
    CREDENTIALS_ENDPOINT = `${API_URL}/v3/credentials`;
    VERIFY_BAKED_ENDPOINT = `${API_URL}/v3/verify/baked`;

    // Log the API URL for debugging
    logger.info(`E2E Test: Using API URL: ${API_URL}`);

    try {
      logger.info(`E2E Test: Starting server on port ${TEST_PORT}`);
      const result = await setupTestApp(TEST_PORT);
      server = result.server as BunServer;
      logger.info("E2E Test: Server started successfully");

      // Initialize test data helper
      TestDataHelper.initialize(API_URL, API_KEY);
      logger.info("Baking E2E tests: Initialized test data helper", {
        apiUrl: API_URL,
        apiKey: API_KEY ? "set" : "not set",
      });

      // Wait for the server to be fully ready
      await new Promise((resolve) => setTimeout(resolve, 1000));
    } catch (error) {
      logger.error("E2E Test: Failed to start server", {
        error: error instanceof Error ? error.message : String(error),
        stack: error instanceof Error ? error.stack : undefined,
      });
      throw error;
    }
  });

  // Reset database before each test to ensure isolation
  beforeEach(async () => {
    try {
      await resetDatabase();
      logger.info("Baking E2E tests: Reset database");
    } catch (error) {
      logger.error("Failed to reset database", {
        error: error instanceof Error ? error.message : String(error),
        stack: error instanceof Error ? error.stack : undefined,
      });
    }
  });

  // Stop the server and clean up test data after all tests
  afterAll(async () => {
    await TestDataHelper.cleanup();
    logger.info("Baking E2E tests: Cleaned up test data");

    if (server) {
      try {
        logger.info("E2E Test: Stopping server");
        stopTestServer(server);
        logger.info("E2E Test: Server stopped successfully");
      } catch (error) {
        logger.error("E2E Test: Error stopping server", {
          error: error instanceof Error ? error.message : String(error),
          stack: error instanceof Error ? error.stack : undefined,
        });
      }
    }

    // Release the allocated port
    if (TEST_PORT) {
      releasePort(TEST_PORT);
    }
  });

  describe("PNG Baking Flow", () => {
    it("should bake credential into PNG and verify", async () => {
      // Step 1: Create test issuer
      const { id: issuerId } = await TestDataHelper.createIssuer();
      logger.info("Created test issuer", { issuerId });

      // Step 2: Create test badge class
      const { id: badgeClassId } = await TestDataHelper.createBadgeClass(
        issuerId,
      );
      logger.info("Created test badge class", { badgeClassId });

      // Step 3: Create test credential
      const { id: credentialId } = await TestDataHelper.createAssertion(
        badgeClassId,
      );
      logger.info("Created test credential", { credentialId });

      // Step 4: Load PNG fixture and encode to base64
      const pngPath = join(process.cwd(), "tests/fixtures/test-badge.png");
      const pngBuffer = readFileSync(pngPath);
      const pngBase64 = pngBuffer.toString("base64");
      logger.info("Loaded PNG fixture", {
        path: pngPath,
        size: pngBuffer.length,
      });

      // Step 5: Bake credential into PNG
      const bakeResponse = await fetch(
        `${CREDENTIALS_ENDPOINT}/${credentialId}/bake`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            "X-API-Key": API_KEY,
          },
          body: JSON.stringify({
            format: "png",
            image: pngBase64,
          }),
        },
      );

      logger.debug("Bake PNG response", {
        status: bakeResponse.status,
        statusText: bakeResponse.statusText,
      });

      // Verify bake response
      expect(bakeResponse.status).toBe(200);
      const bakeResult = (await bakeResponse.json()) as {
        data: string;
        mimeType: string;
        size: number;
        format: string;
      };

      expect(bakeResult.data).toBeDefined();
      expect(bakeResult.mimeType).toBe("image/png");
      expect(bakeResult.format).toBe("png");
      expect(bakeResult.size).toBeGreaterThan(0);

      logger.info("Baked credential into PNG", {
        originalSize: pngBuffer.length,
        bakedSize: bakeResult.size,
      });

      // Step 6: Verify baked PNG
      const verifyResponse = await fetch(VERIFY_BAKED_ENDPOINT, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          image: bakeResult.data,
        }),
      });

      logger.debug("Verify baked PNG response", {
        status: verifyResponse.status,
        statusText: verifyResponse.statusText,
      });

      // Verify extraction and verification
      expect(verifyResponse.status).toBe(200);
      const verifyResult = (await verifyResponse.json()) as {
        isValid: boolean;
        status: string;
        metadata?: {
          extractionAttempted?: boolean;
          extractionSucceeded?: boolean;
          sourceFormat?: string;
        };
      };

      logger.info("Verification result", { verifyResult });

      expect(verifyResult.isValid).toBe(true);
      expect(verifyResult.status).toBe("valid");
      expect(verifyResult.metadata?.extractionAttempted).toBe(true);
      expect(verifyResult.metadata?.extractionSucceeded).toBe(true);
      expect(verifyResult.metadata?.sourceFormat).toBe("png");
    });
  });

  describe("SVG Baking Flow", () => {
    it("should bake credential into SVG and verify", async () => {
      // Step 1: Create test issuer
      const { id: issuerId } = await TestDataHelper.createIssuer();
      logger.info("Created test issuer", { issuerId });

      // Step 2: Create test badge class
      const { id: badgeClassId } = await TestDataHelper.createBadgeClass(
        issuerId,
      );
      logger.info("Created test badge class", { badgeClassId });

      // Step 3: Create test credential
      const { id: credentialId } = await TestDataHelper.createAssertion(
        badgeClassId,
      );
      logger.info("Created test credential", { credentialId });

      // Step 4: Load SVG fixture and encode to base64
      const svgPath = join(process.cwd(), "tests/fixtures/test-badge.svg");
      const svgBuffer = readFileSync(svgPath);
      const svgBase64 = svgBuffer.toString("base64");
      logger.info("Loaded SVG fixture", {
        path: svgPath,
        size: svgBuffer.length,
      });

      // Step 5: Bake credential into SVG
      const bakeResponse = await fetch(
        `${CREDENTIALS_ENDPOINT}/${credentialId}/bake`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            "X-API-Key": API_KEY,
          },
          body: JSON.stringify({
            format: "svg",
            image: svgBase64,
          }),
        },
      );

      logger.debug("Bake SVG response", {
        status: bakeResponse.status,
        statusText: bakeResponse.statusText,
      });

      // Verify bake response
      expect(bakeResponse.status).toBe(200);
      const bakeResult = (await bakeResponse.json()) as {
        data: string;
        mimeType: string;
        size: number;
        format: string;
      };

      expect(bakeResult.data).toBeDefined();
      expect(bakeResult.mimeType).toBe("image/svg+xml");
      expect(bakeResult.format).toBe("svg");
      expect(bakeResult.size).toBeGreaterThan(0);

      logger.info("Baked credential into SVG", {
        originalSize: svgBuffer.length,
        bakedSize: bakeResult.size,
      });

      // Step 6: Verify baked SVG
      const verifyResponse = await fetch(VERIFY_BAKED_ENDPOINT, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          image: bakeResult.data,
        }),
      });

      logger.debug("Verify baked SVG response", {
        status: verifyResponse.status,
        statusText: verifyResponse.statusText,
      });

      // Verify extraction and verification
      expect(verifyResponse.status).toBe(200);
      const verifyResult = (await verifyResponse.json()) as {
        isValid: boolean;
        status: string;
        metadata?: {
          extractionAttempted?: boolean;
          extractionSucceeded?: boolean;
          sourceFormat?: string;
        };
      };

      logger.info("Verification result", { verifyResult });

      expect(verifyResult.isValid).toBe(true);
      expect(verifyResult.status).toBe("valid");
      expect(verifyResult.metadata?.extractionAttempted).toBe(true);
      expect(verifyResult.metadata?.extractionSucceeded).toBe(true);
      expect(verifyResult.metadata?.sourceFormat).toBe("svg");
    });
  });

  describe("Tamper Detection", () => {
    it("should detect tampered baked image", async () => {
      // Step 1: Create test issuer
      const { id: issuerId } = await TestDataHelper.createIssuer();
      logger.info("Created test issuer", { issuerId });

      // Step 2: Create test badge class
      const { id: badgeClassId } = await TestDataHelper.createBadgeClass(
        issuerId,
      );
      logger.info("Created test badge class", { badgeClassId });

      // Step 3: Create test credential
      const { id: credentialId } = await TestDataHelper.createAssertion(
        badgeClassId,
      );
      logger.info("Created test credential", { credentialId });

      // Step 4: Load PNG fixture and bake credential
      const pngPath = join(process.cwd(), "tests/fixtures/test-badge.png");
      const pngBuffer = readFileSync(pngPath);
      const pngBase64 = pngBuffer.toString("base64");

      const bakeResponse = await fetch(
        `${CREDENTIALS_ENDPOINT}/${credentialId}/bake`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            "X-API-Key": API_KEY,
          },
          body: JSON.stringify({
            format: "png",
            image: pngBase64,
          }),
        },
      );

      expect(bakeResponse.status).toBe(200);
      const bakeResult = (await bakeResponse.json()) as {
        data: string;
        mimeType: string;
        size: number;
        format: string;
      };

      logger.info("Baked credential into PNG for tamper test");

      // Step 5: Tamper with the baked image data
      // Decode base64 to buffer
      const bakedBuffer = Buffer.from(bakeResult.data, "base64");

      // Modify a few bytes in the middle of the image buffer to corrupt embedded data
      // This simulates tampering with the baked image
      const tamperPosition = Math.floor(bakedBuffer.length / 2);
      bakedBuffer[tamperPosition] = bakedBuffer[tamperPosition] ^ 0xff; // Flip all bits
      bakedBuffer[tamperPosition + 1] = bakedBuffer[tamperPosition + 1] ^ 0xff;
      bakedBuffer[tamperPosition + 2] = bakedBuffer[tamperPosition + 2] ^ 0xff;

      // Re-encode to base64
      const tamperedBase64 = bakedBuffer.toString("base64");

      logger.info("Tampered with baked image data", {
        originalSize: bakeResult.data.length,
        tamperedSize: tamperedBase64.length,
        tamperPosition,
      });

      // Step 6: Attempt to verify tampered image
      const verifyResponse = await fetch(VERIFY_BAKED_ENDPOINT, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          image: tamperedBase64,
        }),
      });

      logger.debug("Verify tampered image response", {
        status: verifyResponse.status,
        statusText: verifyResponse.statusText,
      });

      // Step 7: Verify that verification fails
      expect(verifyResponse.status).toBe(200); // Endpoint always returns 200
      const verifyResult = (await verifyResponse.json()) as {
        isValid: boolean;
        status: string;
        checks?: {
          general?: Array<{
            check: string;
            passed: boolean;
            error?: string;
          }>;
        };
        metadata?: {
          extractionAttempted?: boolean;
          extractionSucceeded?: boolean;
        };
      };

      logger.info("Tampered verification result", { verifyResult });

      // Verification should fail for tampered image
      expect(verifyResult.isValid).toBe(false);
      expect(verifyResult.status).toBe("invalid");
      expect(verifyResult.metadata?.extractionAttempted).toBe(true);
      expect(verifyResult.metadata?.extractionSucceeded).toBe(false);

      // Should have an extraction error in the checks
      const generalChecks = verifyResult.checks?.general || [];
      const extractionCheck = generalChecks.find(
        (check) => check.check === "extraction",
      );
      expect(extractionCheck).toBeDefined();
      expect(extractionCheck?.passed).toBe(false);
      expect(extractionCheck?.error).toBeDefined();
    });
  });
});
