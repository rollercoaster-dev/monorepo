/**
 * Verify Credential Endpoint Tests
 *
 * Tests for POST /v3/verify endpoint that verifies credentials
 * in both JSON-LD and JWT formats.
 */

import { describe, expect, it } from "bun:test";
import { VerificationController } from "../../src/api/controllers/verification.controller";
import {
  VerifyCredentialRequestSchema,
  VerificationOptionsSchema,
} from "../../src/api/dtos/verify.dto";
import type { Shared } from "openbadges-types";

describe("Verify Credential Endpoint", () => {
  describe("DTO Validation", () => {
    describe("VerificationOptionsSchema", () => {
      it("should accept valid options", () => {
        const validOptions = {
          skipProofVerification: true,
          skipStatusCheck: false,
          skipTemporalValidation: true,
          skipIssuerVerification: false,
          clockTolerance: 300,
          allowExpired: true,
          allowRevoked: false,
        };

        const result = VerificationOptionsSchema.safeParse(validOptions);
        expect(result.success).toBe(true);
      });

      it("should accept empty options", () => {
        const result = VerificationOptionsSchema.safeParse({});
        expect(result.success).toBe(true);
      });

      it("should reject invalid clockTolerance (negative)", () => {
        const invalidOptions = {
          clockTolerance: -10,
        };

        const result = VerificationOptionsSchema.safeParse(invalidOptions);
        expect(result.success).toBe(false);
      });

      it("should reject unknown properties (strict)", () => {
        const invalidOptions = {
          unknownProperty: "value",
        };

        const result = VerificationOptionsSchema.safeParse(invalidOptions);
        expect(result.success).toBe(false);
      });
    });

    describe("VerifyCredentialRequestSchema", () => {
      describe("JSON-LD Credentials", () => {
        it("should accept valid JSON-LD credential", () => {
          const validRequest = {
            credential: {
              "@context": ["https://www.w3.org/2018/credentials/v1"],
              type: ["VerifiableCredential", "OpenBadgeCredential"],
              issuer: "did:web:example.com",
              issuanceDate: "2024-01-01T00:00:00Z",
              credentialSubject: {
                id: "did:example:recipient",
                type: ["AchievementSubject"],
              },
            },
          };

          const result = VerifyCredentialRequestSchema.safeParse(validRequest);
          expect(result.success).toBe(true);
        });

        it("should accept credential with object issuer", () => {
          const validRequest = {
            credential: {
              "@context": ["https://www.w3.org/2018/credentials/v1"],
              type: ["VerifiableCredential"],
              issuer: {
                id: "did:web:example.com",
                type: "Profile",
                name: "Example University",
              },
              issuanceDate: "2024-01-01T00:00:00Z",
            },
          };

          const result = VerifyCredentialRequestSchema.safeParse(validRequest);
          expect(result.success).toBe(true);
        });

        it("should accept credential with proof", () => {
          const validRequest = {
            credential: {
              "@context": ["https://www.w3.org/2018/credentials/v1"],
              type: ["VerifiableCredential"],
              issuer: "did:web:example.com",
              issuanceDate: "2024-01-01T00:00:00Z",
              proof: {
                type: "DataIntegrityProof",
                verificationMethod: "did:web:example.com#key-1",
                created: "2024-01-01T00:00:00Z",
                proofPurpose: "assertionMethod",
                proofValue: "abc123",
              },
            },
          };

          const result = VerifyCredentialRequestSchema.safeParse(validRequest);
          expect(result.success).toBe(true);
        });

        it("should accept credential with options", () => {
          const validRequest = {
            credential: {
              "@context": ["https://www.w3.org/2018/credentials/v1"],
              type: ["VerifiableCredential"],
              issuer: "did:web:example.com",
              issuanceDate: "2024-01-01T00:00:00Z",
            },
            options: {
              skipProofVerification: true,
              clockTolerance: 60,
            },
          };

          const result = VerifyCredentialRequestSchema.safeParse(validRequest);
          expect(result.success).toBe(true);
        });
      });

      describe("JWT Credentials", () => {
        it("should accept valid JWT credential", () => {
          // Valid JWT structure: header.payload.signature
          const validJwt =
            "eyJhbGciOiJSUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiIxMjM0NTY3ODkwIiwibmFtZSI6IkpvaG4gRG9lIiwiYWRtaW4iOnRydWUsImlhdCI6MTUxNjIzOTAyMn0.POstGetfAytaZS82wHcjoTyoqhMyxXiWdR7Nn7A29DNSl0EiXLdwJ6xC6AfgZWF1bOsS_TuYI3OG85AmiExREkrS6tDfTQ2B3WXlrr-wp5AokiRbz3_oB4OxG-W9KcEEbDRcZc0nH3L7LzYptiy1PtAylQGxHTWZXtGz4ht0bAecBgmpdgXMguEIcoqPJ1n3pIWk_dUZegpqx0Lka21H6XxUTxiy8OcaarA8zdnPUnV6AmNP3ecFawIFYdvJB_cm-GvpCSbr8G8y_Mllj8f4x9nBH8pQux89_6gUY618iYv7tuPWBFfEbLxtF2pZS6YC1aSfLQxeNe8djT9YjpvRZA";

          const validRequest = {
            credential: validJwt,
          };

          const result = VerifyCredentialRequestSchema.safeParse(validRequest);
          expect(result.success).toBe(true);
        });

        it("should reject invalid JWT format (no dots)", () => {
          const invalidRequest = {
            credential: "not-a-valid-jwt",
          };

          const result = VerifyCredentialRequestSchema.safeParse(invalidRequest);
          expect(result.success).toBe(false);
        });

        it("should reject JWT with wrong number of parts", () => {
          const invalidRequest = {
            credential: "header.payload",
          };

          const result = VerifyCredentialRequestSchema.safeParse(invalidRequest);
          expect(result.success).toBe(false);
        });

        it("should accept JWT with options", () => {
          const validRequest = {
            credential: "header.payload.signature",
            options: {
              allowExpired: true,
            },
          };

          const result = VerifyCredentialRequestSchema.safeParse(validRequest);
          expect(result.success).toBe(true);
        });
      });

      describe("Invalid Requests", () => {
        it("should reject missing credential", () => {
          const invalidRequest = {};

          const result = VerifyCredentialRequestSchema.safeParse(invalidRequest);
          expect(result.success).toBe(false);
        });

        it("should reject null credential", () => {
          const invalidRequest = {
            credential: null,
          };

          const result = VerifyCredentialRequestSchema.safeParse(invalidRequest);
          expect(result.success).toBe(false);
        });
      });
    });
  });

  describe("VerificationController", () => {
    const controller = new VerificationController();

    describe("verifyCredential", () => {
      it("should verify a valid JSON-LD credential", async () => {
        const request = {
          credential: {
            "@context": ["https://www.w3.org/2018/credentials/v1"],
            type: ["VerifiableCredential", "OpenBadgeCredential"],
            id: "https://example.com/credentials/123",
            issuer: "did:web:example.com",
            issuanceDate: "2024-01-01T00:00:00Z",
            credentialSubject: {
              id: "did:example:recipient",
              type: ["AchievementSubject"],
            },
            proof: {
              type: "DataIntegrityProof",
              verificationMethod: "did:web:example.com#key-1",
              created: "2024-01-01T00:00:00Z",
              proofPurpose: "assertionMethod",
              proofValue: "test-proof-value",
            },
          },
        };

        const result = await controller.verifyCredential(request);

        // The result should have the expected structure
        expect(result.status).toBeDefined();
        expect(result.isValid).toBeDefined();
        expect(result.checks).toBeDefined();
        expect(result.verifiedAt).toBeDefined();

        // Should extract credential info
        expect(result.credentialId).toBe("https://example.com/credentials/123" as Shared.IRI);
        expect(result.issuer).toBe("did:web:example.com" as Shared.IRI);
      });

      it("should reject credential missing issuer", async () => {
        const request = {
          credential: {
            "@context": ["https://www.w3.org/2018/credentials/v1"],
            type: ["VerifiableCredential"],
            issuanceDate: "2024-01-01T00:00:00Z",
          },
        };

        const result = await controller.verifyCredential(request);

        expect(result.status).toBe("error");
        expect(result.isValid).toBe(false);
        expect(result.error).toContain("issuer");
      });

      it("should reject credential with invalid type", async () => {
        const request = {
          credential: {
            "@context": ["https://www.w3.org/2018/credentials/v1"],
            type: ["OpenBadgeCredential"], // Missing VerifiableCredential
            issuer: "did:web:example.com",
            issuanceDate: "2024-01-01T00:00:00Z",
          },
        };

        const result = await controller.verifyCredential(request);

        expect(result.status).toBe("error");
        expect(result.isValid).toBe(false);
        expect(result.error).toContain("VerifiableCredential");
      });

      it("should handle verification options", async () => {
        const request = {
          credential: {
            "@context": ["https://www.w3.org/2018/credentials/v1"],
            type: ["VerifiableCredential"],
            issuer: "did:web:example.com",
            issuanceDate: new Date(
              Date.now() + 1000 * 60 * 60,
            ).toISOString(), // 1 hour in future
            proof: {
              type: "DataIntegrityProof",
              verificationMethod: "did:web:example.com#key-1",
            },
          },
          options: {
            skipTemporalValidation: true, // Should skip the future issuance date check
          },
        };

        const result = await controller.verifyCredential(request);

        // When skipping temporal validation, there should be no temporal checks
        expect(result.checks.temporal).toHaveLength(0);
      });

      it("should verify JWT credentials", async () => {
        // Create a valid JWT structure with a proper VC payload
        const header = Buffer.from(
          JSON.stringify({ alg: "RS256", typ: "JWT" }),
        ).toString("base64url");
        const payload = Buffer.from(
          JSON.stringify({
            vc: {
              "@context": ["https://www.w3.org/2018/credentials/v1"],
              type: ["VerifiableCredential", "OpenBadgeCredential"],
              issuer: "did:web:example.com",
              issuanceDate: "2024-01-01T00:00:00Z",
              credentialSubject: {
                id: "did:example:recipient",
                type: ["AchievementSubject"],
              },
            },
          }),
        ).toString("base64url");
        const signature = "fake-signature";
        const jwt = `${header}.${payload}.${signature}`;

        const request = {
          credential: jwt,
        };

        const result = await controller.verifyCredential(request);

        // Should extract issuer from JWT payload
        expect(result.issuer).toBe("did:web:example.com" as Shared.IRI);
        expect(result.status).toBeDefined();
      });

      it("should reject invalid JWT format", async () => {
        const request = {
          credential: "invalid.jwt.format.with.four.parts",
        };

        const result = await controller.verifyCredential(request);

        expect(result.status).toBe("error");
        expect(result.isValid).toBe(false);
        expect(result.error).toContain("Invalid JWT format");
      });

      it("should reject expired credentials", async () => {
        const pastDate = new Date();
        pastDate.setDate(pastDate.getDate() - 30);

        const request = {
          credential: {
            "@context": ["https://www.w3.org/2018/credentials/v1"],
            type: ["VerifiableCredential"],
            issuer: "did:web:example.com",
            issuanceDate: "2023-01-01T00:00:00Z",
            expirationDate: pastDate.toISOString(),
            proof: {
              type: "DataIntegrityProof",
              verificationMethod: "did:web:example.com#key-1",
            },
          },
        };

        const result = await controller.verifyCredential(request);

        expect(result.isValid).toBe(false);
        const expirationCheck = result.checks.temporal.find(
          (c) => c.check === "temporal.expiration",
        );
        expect(expirationCheck?.passed).toBe(false);
      });

      it("should allow expired credentials with allowExpired option", async () => {
        const pastDate = new Date();
        pastDate.setDate(pastDate.getDate() - 30);

        const request = {
          credential: {
            "@context": ["https://www.w3.org/2018/credentials/v1"],
            type: ["VerifiableCredential"],
            issuer: "did:web:example.com",
            issuanceDate: "2023-01-01T00:00:00Z",
            expirationDate: pastDate.toISOString(),
            proof: {
              type: "DataIntegrityProof",
              verificationMethod: "did:web:example.com#key-1",
            },
          },
          options: {
            allowExpired: true,
          },
        };

        const result = await controller.verifyCredential(request);

        const expirationCheck = result.checks.temporal.find(
          (c) => c.check === "temporal.expiration",
        );
        expect(expirationCheck?.passed).toBe(true);
        expect(expirationCheck?.details?.allowExpired).toBe(true);
      });

      it("should return verification metadata", async () => {
        const request = {
          credential: {
            "@context": ["https://www.w3.org/2018/credentials/v1"],
            type: ["VerifiableCredential"],
            issuer: "did:web:example.com",
            issuanceDate: "2024-01-01T00:00:00Z",
            proof: {
              type: "DataIntegrityProof",
              verificationMethod: "did:web:example.com#key-1",
            },
          },
        };

        const result = await controller.verifyCredential(request);

        // Should include metadata
        expect(result.metadata).toBeDefined();
        expect(result.metadata?.durationMs).toBeGreaterThanOrEqual(0);
        expect(result.verifiedAt).toBeDefined();
      });
    });
  });
});
