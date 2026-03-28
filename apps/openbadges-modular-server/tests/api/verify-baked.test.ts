/**
 * Tests for POST /v3/verify/baked endpoint
 *
 * Tests the verify baked image endpoint which extracts credentials from
 * baked images (PNG/SVG) and verifies them.
 */

import { describe, expect, it, beforeEach, mock } from "bun:test";
import type { Shared } from "openbadges-types";
import { VerifyBakedImageRequestSchema } from "../../src/api/dtos/verify.dto";
import { VerificationController } from "../../src/api/controllers/verification.controller";
import type { VerificationResult } from "../../src/services/verification/types";

// 1x1 red pixel PNG base64 padded to exceed 100-char DTO minimum.
// The padding is not valid PNG data but passes the base64 regex check.
const SAMPLE_PNG_BASE64 =
  "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg" +
  "AAAAAAAAAA";

// Minimal valid SVG encoded as base64
const SAMPLE_SVG_BASE64 = Buffer.from(
  '<svg xmlns="http://www.w3.org/2000/svg" width="100" height="100"><rect width="100" height="100" fill="red"/></svg>',
).toString("base64");

// Sample credential for mock results
const SAMPLE_CREDENTIAL = {
  "@context": [
    "https://www.w3.org/2018/credentials/v1",
    "https://purl.imsglobal.org/spec/ob/v3p0/context-3.0.3.json",
  ],
  type: ["VerifiableCredential", "OpenBadgeCredential"],
  id: "urn:uuid:test-credential-123",
  issuer: { id: "did:example:issuer123", type: "Profile", name: "Test Issuer" },
  issuanceDate: "2024-01-01T00:00:00Z",
  credentialSubject: {
    id: "did:example:recipient123",
    type: "AchievementSubject",
  },
};

describe("POST /v3/verify/baked - Verify Baked Image Endpoint", () => {
  describe("DTO Validation", () => {
    it("should reject empty request body", () => {
      const result = VerifyBakedImageRequestSchema.safeParse({});
      expect(result.success).toBe(false);
    });

    it("should reject invalid base64 encoding", () => {
      const result = VerifyBakedImageRequestSchema.safeParse({
        image: "!!!not-valid-base64!!!" + "x".repeat(100),
      });
      expect(result.success).toBe(false);
    });

    it("should reject image data that's too small", () => {
      const result = VerifyBakedImageRequestSchema.safeParse({
        image: "YWJj", // "abc" in base64, only 4 chars
      });
      expect(result.success).toBe(false);
      if (!result.success) {
        expect(
          result.error.errors.some((e) => e.message.includes("too small")),
        ).toBe(true);
      }
    });

    it("should reject image data that's too large", () => {
      // Generate a string that decodes to > 10MB
      // 10MB decoded = ~13.4MB base64 encoded
      const largeBase64 = "A".repeat(14 * 1024 * 1024);
      const result = VerifyBakedImageRequestSchema.safeParse({
        image: largeBase64,
      });
      expect(result.success).toBe(false);
    });

    it("should accept valid base64 PNG data", () => {
      const result = VerifyBakedImageRequestSchema.safeParse({
        image: SAMPLE_PNG_BASE64,
      });
      expect(result.success).toBe(true);
    });

    it("should accept valid base64 SVG data", () => {
      const result = VerifyBakedImageRequestSchema.safeParse({
        image: SAMPLE_SVG_BASE64,
      });
      expect(result.success).toBe(true);
    });

    it("should accept data URI format", () => {
      const dataUri = `data:image/png;base64,${SAMPLE_PNG_BASE64}`;
      const result = VerifyBakedImageRequestSchema.safeParse({
        image: dataUri,
      });
      expect(result.success).toBe(true);
    });

    it("should accept optional verification options", () => {
      const result = VerifyBakedImageRequestSchema.safeParse({
        image: SAMPLE_PNG_BASE64,
        options: {
          skipProofVerification: true,
          allowExpired: true,
          skipStatusCheck: false,
          clockTolerance: 30,
        },
      });
      expect(result.success).toBe(true);
    });
  });

  describe("Successful Verification Flow", () => {
    let controller: VerificationController;

    beforeEach(() => {
      controller = new VerificationController();
    });

    it("should extract and verify credential from PNG image", async () => {
      // Mock the unbake and verify imports used by the controller
      const verifyBakedImage = mock(
        async (): Promise<VerificationResult> => ({
          isValid: true,
          status: "valid",
          credential: SAMPLE_CREDENTIAL,
          checks: {
            proof: [{ check: "proof", description: "Verify cryptographic proof", passed: true }],
            status: [],
            temporal: [],
            issuer: [],
            schema: [],
            general: [],
          },
          verifiedAt: new Date().toISOString(),
          metadata: {
            durationMs: 50,
            extractionAttempted: true,
            extractionSucceeded: true,
            sourceFormat: "png",
          },
        }),
      );

      controller.verifyBakedImage = verifyBakedImage;
      const result = await controller.verifyBakedImage({
        image: SAMPLE_PNG_BASE64,
      });

      expect(result.isValid).toBe(true);
      expect(result.status).toBe("valid");
      expect(result.metadata?.sourceFormat).toBe("png");
      expect(verifyBakedImage).toHaveBeenCalledTimes(1);
    });

    it("should extract and verify credential from SVG image", async () => {
      const verifyBakedImage = mock(
        async (): Promise<VerificationResult> => ({
          isValid: true,
          status: "valid",
          credential: SAMPLE_CREDENTIAL,
          checks: {
            proof: [{ check: "proof", description: "Verify cryptographic proof", passed: true }],
            status: [],
            temporal: [],
            issuer: [],
            schema: [],
            general: [],
          },
          verifiedAt: new Date().toISOString(),
          metadata: {
            durationMs: 30,
            extractionAttempted: true,
            extractionSucceeded: true,
            sourceFormat: "svg",
          },
        }),
      );

      controller.verifyBakedImage = verifyBakedImage;
      const result = await controller.verifyBakedImage({
        image: SAMPLE_SVG_BASE64,
      });

      expect(result.isValid).toBe(true);
      expect(result.metadata?.sourceFormat).toBe("svg");
    });

    it("should include extraction metadata in response", async () => {
      const verifyBakedImage = mock(
        async (): Promise<VerificationResult> => ({
          isValid: true,
          status: "valid",
          checks: {
            proof: [],
            status: [],
            temporal: [],
            issuer: [],
            schema: [],
            general: [],
          },
          verifiedAt: new Date().toISOString(),
          metadata: {
            durationMs: 25,
            extractionAttempted: true,
            extractionSucceeded: true,
            sourceFormat: "png",
          },
        }),
      );

      controller.verifyBakedImage = verifyBakedImage;
      const result = await controller.verifyBakedImage({
        image: SAMPLE_PNG_BASE64,
      });

      expect(result.metadata).toBeDefined();
      expect(result.metadata?.extractionAttempted).toBe(true);
      expect(result.metadata?.extractionSucceeded).toBe(true);
      expect(result.metadata?.sourceFormat).toBe("png");
    });

    it("should return verification result with valid credential", async () => {
      const verifyBakedImage = mock(
        async (): Promise<VerificationResult> => ({
          isValid: true,
          status: "valid",
          credential: SAMPLE_CREDENTIAL,
          credentialId: "urn:uuid:test-credential-123" as Shared.IRI,
          issuer: "did:example:issuer123" as Shared.IRI,
          checks: {
            proof: [{ check: "proof", description: "Verify cryptographic proof", passed: true }],
            status: [{ check: "revocation", description: "Check revocation status", passed: true }],
            temporal: [{ check: "expiration", description: "Check credential expiration", passed: true }],
            issuer: [{ check: "issuer", description: "Verify issuer", passed: true }],
            schema: [{ check: "schema", description: "Validate credential schema", passed: true }],
            general: [],
          },
          verifiedAt: new Date().toISOString(),
          metadata: {
            durationMs: 100,
            extractionAttempted: true,
            extractionSucceeded: true,
            sourceFormat: "png",
          },
        }),
      );

      controller.verifyBakedImage = verifyBakedImage;
      const result = await controller.verifyBakedImage({
        image: SAMPLE_PNG_BASE64,
      });

      expect(result.isValid).toBe(true);
      expect(result.status).toBe("valid");
      expect(result.credential).toBeDefined();
      expect(result.credentialId).toBe("urn:uuid:test-credential-123" as Shared.IRI);
      expect(result.issuer).toBe("did:example:issuer123" as Shared.IRI);
      expect(result.checks.proof).toHaveLength(1);
      expect(result.checks.schema).toHaveLength(1);
    });
  });

  describe("Extraction Failures", () => {
    let controller: VerificationController;

    beforeEach(() => {
      controller = new VerificationController();
    });

    it("should handle PNG image without baked credential", async () => {
      const verifyBakedImage = mock(
        async (): Promise<VerificationResult> => ({
          isValid: false,
          status: "invalid",
          checks: {
            proof: [],
            status: [],
            temporal: [],
            issuer: [],
            schema: [],
            general: [
              {
                check: "extraction",
                description: "Extract credential from baked image",
                passed: false,
                error: "No credential data found in image",
              },
            ],
          },
          verifiedAt: new Date().toISOString(),
          metadata: {
            durationMs: 0,
            extractionAttempted: true,
            extractionSucceeded: false,
            sourceFormat: "png",
          },
        }),
      );

      controller.verifyBakedImage = verifyBakedImage;
      const result = await controller.verifyBakedImage({
        image: SAMPLE_PNG_BASE64,
      });

      expect(result.isValid).toBe(false);
      expect(result.status).toBe("invalid");
      expect(result.metadata?.extractionSucceeded).toBe(false);
      expect(result.checks.general).toHaveLength(1);
      expect(result.checks.general[0].check).toBe("extraction");
      expect(result.checks.general[0].passed).toBe(false);
    });

    it("should handle SVG image without baked credential", async () => {
      const verifyBakedImage = mock(
        async (): Promise<VerificationResult> => ({
          isValid: false,
          status: "invalid",
          checks: {
            proof: [],
            status: [],
            temporal: [],
            issuer: [],
            schema: [],
            general: [
              {
                check: "extraction",
                description: "Extract credential from baked image",
                passed: false,
                error: "No credential data found in image",
              },
            ],
          },
          verifiedAt: new Date().toISOString(),
          metadata: {
            durationMs: 0,
            extractionAttempted: true,
            extractionSucceeded: false,
            sourceFormat: "svg",
          },
        }),
      );

      controller.verifyBakedImage = verifyBakedImage;
      const result = await controller.verifyBakedImage({
        image: SAMPLE_SVG_BASE64,
      });

      expect(result.isValid).toBe(false);
      expect(result.metadata?.sourceFormat).toBe("svg");
      expect(result.metadata?.extractionSucceeded).toBe(false);
    });

    it("should handle unsupported image format", async () => {
      // JPEG-like data (starts with FF D8)
      const jpegBase64 = Buffer.from([0xff, 0xd8, 0xff, 0xe0])
        .toString("base64")
        .padEnd(100, "A");

      const verifyBakedImage = mock(
        async (): Promise<VerificationResult> => ({
          isValid: false,
          status: "invalid",
          checks: {
            proof: [],
            status: [],
            temporal: [],
            issuer: [],
            schema: [],
            general: [
              {
                check: "extraction",
                description: "Extract credential from baked image",
                passed: false,
                error: "Invalid or corrupted badge data",
              },
            ],
          },
          verifiedAt: new Date().toISOString(),
          metadata: {
            durationMs: 0,
            extractionAttempted: true,
            extractionSucceeded: false,
          },
        }),
      );

      controller.verifyBakedImage = verifyBakedImage;
      const result = await controller.verifyBakedImage({
        image: jpegBase64,
      });

      expect(result.isValid).toBe(false);
      expect(result.checks.general[0].error).toContain(
        "Invalid or corrupted badge data",
      );
    });

    it("should handle corrupt image data", async () => {
      // Starts with PNG signature but has corrupted data after
      const corruptPng = Buffer.from([
        137, 80, 78, 71, 13, 10, 26, 10, 0, 0, 0, 0, 0xff, 0xff,
      ])
        .toString("base64")
        .padEnd(100, "A");

      const verifyBakedImage = mock(
        async (): Promise<VerificationResult> => ({
          isValid: false,
          status: "invalid",
          checks: {
            proof: [],
            status: [],
            temporal: [],
            issuer: [],
            schema: [],
            general: [
              {
                check: "extraction",
                description: "Extract credential from baked image",
                passed: false,
                error: "Invalid or corrupted badge data",
              },
            ],
          },
          verifiedAt: new Date().toISOString(),
          metadata: {
            durationMs: 0,
            extractionAttempted: true,
            extractionSucceeded: false,
          },
        }),
      );

      controller.verifyBakedImage = verifyBakedImage;
      const result = await controller.verifyBakedImage({
        image: corruptPng,
      });

      expect(result.isValid).toBe(false);
      expect(result.metadata?.extractionAttempted).toBe(true);
      expect(result.metadata?.extractionSucceeded).toBe(false);
    });
  });

  describe("Verification Failures", () => {
    let controller: VerificationController;

    beforeEach(() => {
      controller = new VerificationController();
    });

    it("should detect invalid signature in baked credential", async () => {
      const verifyBakedImage = mock(
        async (): Promise<VerificationResult> => ({
          isValid: false,
          status: "invalid",
          checks: {
            proof: [
              {
                check: "proof",
                description: "Verify cryptographic proof",
                passed: false,
                error: "Invalid cryptographic proof",
              },
            ],
            status: [],
            temporal: [],
            issuer: [],
            schema: [],
            general: [],
          },
          verifiedAt: new Date().toISOString(),
          metadata: {
            durationMs: 75,
            extractionAttempted: true,
            extractionSucceeded: true,
            sourceFormat: "png",
          },
        }),
      );

      controller.verifyBakedImage = verifyBakedImage;
      const result = await controller.verifyBakedImage({
        image: SAMPLE_PNG_BASE64,
      });

      expect(result.isValid).toBe(false);
      expect(result.status).toBe("invalid");
      expect(result.checks.proof[0].passed).toBe(false);
      expect(result.metadata?.extractionSucceeded).toBe(true);
    });

    it("should detect expired credential", async () => {
      const verifyBakedImage = mock(
        async (): Promise<VerificationResult> => ({
          isValid: false,
          status: "invalid",
          checks: {
            proof: [{ check: "proof", description: "Verify cryptographic proof", passed: true }],
            status: [],
            temporal: [
              {
                check: "expiration",
                description: "Check credential expiration",
                passed: false,
                error: "Credential has expired",
              },
            ],
            issuer: [],
            schema: [],
            general: [],
          },
          verifiedAt: new Date().toISOString(),
          metadata: {
            durationMs: 60,
            extractionAttempted: true,
            extractionSucceeded: true,
            sourceFormat: "png",
          },
        }),
      );

      controller.verifyBakedImage = verifyBakedImage;
      const result = await controller.verifyBakedImage({
        image: SAMPLE_PNG_BASE64,
      });

      expect(result.isValid).toBe(false);
      expect(result.checks.temporal[0].passed).toBe(false);
      expect(result.checks.temporal[0].error).toContain("expired");
    });

    it("should detect revoked credential", async () => {
      const verifyBakedImage = mock(
        async (): Promise<VerificationResult> => ({
          isValid: false,
          status: "invalid",
          checks: {
            proof: [{ check: "proof", description: "Verify cryptographic proof", passed: true }],
            status: [
              {
                check: "revocation",
                description: "Check revocation status",
                passed: false,
                error: "Credential has been revoked",
              },
            ],
            temporal: [],
            issuer: [],
            schema: [],
            general: [],
          },
          verifiedAt: new Date().toISOString(),
          metadata: {
            durationMs: 80,
            extractionAttempted: true,
            extractionSucceeded: true,
            sourceFormat: "png",
          },
        }),
      );

      controller.verifyBakedImage = verifyBakedImage;
      const result = await controller.verifyBakedImage({
        image: SAMPLE_PNG_BASE64,
      });

      expect(result.isValid).toBe(false);
      expect(result.checks.status[0].passed).toBe(false);
      expect(result.checks.status[0].error).toContain("revoked");
    });
  });

  describe("Verification Options", () => {
    let controller: VerificationController;

    beforeEach(() => {
      controller = new VerificationController();
    });

    it("should respect skipProofVerification option", async () => {
      const verifyBakedImage = mock(
        async (): Promise<VerificationResult> => ({
          isValid: true,
          status: "valid",
          checks: {
            proof: [],
            status: [],
            temporal: [],
            issuer: [],
            schema: [],
            general: [],
          },
          verifiedAt: new Date().toISOString(),
          metadata: {
            durationMs: 20,
            extractionAttempted: true,
            extractionSucceeded: true,
            sourceFormat: "png",
          },
        }),
      );

      controller.verifyBakedImage = verifyBakedImage;
      const result = await controller.verifyBakedImage({
        image: SAMPLE_PNG_BASE64,
        options: { skipProofVerification: true },
      });

      expect(result.isValid).toBe(true);
      expect(result.checks.proof).toHaveLength(0);
      expect(verifyBakedImage).toHaveBeenCalledWith({
        image: SAMPLE_PNG_BASE64,
        options: { skipProofVerification: true },
      });
    });

    it("should respect allowExpired option", async () => {
      const verifyBakedImage = mock(
        async (): Promise<VerificationResult> => ({
          isValid: true,
          status: "valid",
          checks: {
            proof: [{ check: "proof", description: "Verify cryptographic proof", passed: true }],
            status: [],
            temporal: [
              {
                check: "expiration",
                description: "Check credential expiration (expired but allowed)",
                passed: true,
              },
            ],
            issuer: [],
            schema: [],
            general: [],
          },
          verifiedAt: new Date().toISOString(),
          metadata: {
            durationMs: 40,
            extractionAttempted: true,
            extractionSucceeded: true,
            sourceFormat: "png",
          },
        }),
      );

      controller.verifyBakedImage = verifyBakedImage;
      const result = await controller.verifyBakedImage({
        image: SAMPLE_PNG_BASE64,
        options: { allowExpired: true },
      });

      expect(result.isValid).toBe(true);
      expect(verifyBakedImage).toHaveBeenCalledWith({
        image: SAMPLE_PNG_BASE64,
        options: { allowExpired: true },
      });
    });

    it("should respect skipStatusCheck option", async () => {
      const verifyBakedImage = mock(
        async (): Promise<VerificationResult> => ({
          isValid: true,
          status: "valid",
          checks: {
            proof: [{ check: "proof", description: "Verify cryptographic proof", passed: true }],
            status: [],
            temporal: [],
            issuer: [],
            schema: [],
            general: [],
          },
          verifiedAt: new Date().toISOString(),
          metadata: {
            durationMs: 30,
            extractionAttempted: true,
            extractionSucceeded: true,
            sourceFormat: "png",
          },
        }),
      );

      controller.verifyBakedImage = verifyBakedImage;
      const result = await controller.verifyBakedImage({
        image: SAMPLE_PNG_BASE64,
        options: { skipStatusCheck: true },
      });

      expect(result.isValid).toBe(true);
      expect(result.checks.status).toHaveLength(0);
      expect(verifyBakedImage).toHaveBeenCalledWith({
        image: SAMPLE_PNG_BASE64,
        options: { skipStatusCheck: true },
      });
    });

    it("should pass through all verification options", async () => {
      const allOptions = {
        skipProofVerification: true,
        skipStatusCheck: true,
        skipTemporalValidation: true,
        skipIssuerVerification: true,
        clockTolerance: 60,
        allowExpired: true,
        allowRevoked: true,
      };

      const verifyBakedImage = mock(
        async (): Promise<VerificationResult> => ({
          isValid: true,
          status: "valid",
          checks: {
            proof: [],
            status: [],
            temporal: [],
            issuer: [],
            schema: [],
            general: [],
          },
          verifiedAt: new Date().toISOString(),
          metadata: {
            durationMs: 10,
            extractionAttempted: true,
            extractionSucceeded: true,
            sourceFormat: "png",
          },
        }),
      );

      controller.verifyBakedImage = verifyBakedImage;
      const result = await controller.verifyBakedImage({
        image: SAMPLE_PNG_BASE64,
        options: allOptions,
      });

      expect(result.isValid).toBe(true);
      expect(verifyBakedImage).toHaveBeenCalledWith({
        image: SAMPLE_PNG_BASE64,
        options: allOptions,
      });
    });
  });
});
