/**
 * Verification Service Tests
 *
 * Tests for the unified verification service that orchestrates
 * proof, issuer, and temporal validation checks.
 */

import { describe, expect, it, beforeEach } from "bun:test";
import { verify } from "../../../src/services/verification/verification.service.js";
import type { VerificationOptions } from "../../../src/services/verification/types.js";
import type { Shared } from "openbadges-types";

describe("Verification Service", () => {
  describe("verify()", () => {
    describe("JWT Credentials", () => {
      it("should reject invalid JWT format", async () => {
        const invalidJWT = "not.a.valid.jwt.string";

        const result = await verify(invalidJWT);

        expect(result.status).toBe("error");
        expect(result.isValid).toBe(false);
        expect(result.error).toContain("Invalid JWT format");
        expect(result.checks.proof).toHaveLength(1);
        expect(result.checks.proof[0].passed).toBe(false);
      });

      it("should reject JWT with invalid payload", async () => {
        // Create a JWT with invalid base64 payload
        const invalidJWT = "header.invalid-base64.signature";

        const result = await verify(invalidJWT);

        expect(result.status).toBe("error");
        expect(result.isValid).toBe(false);
        expect(result.error).toContain("Failed to parse JWT");
      });

      it("should extract credential from JWT payload", async () => {
        // Create a minimal valid JWT structure
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

        const result = await verify(jwt);

        // Should fail on proof verification (fake signature)
        // but should successfully extract issuer
        expect(result.issuer).toBe("did:web:example.com" as Shared.IRI);
      });
    });

    describe("JSON-LD Credentials", () => {
      it("should reject credential without issuer", async () => {
        const credentialWithoutIssuer = {
          "@context": ["https://www.w3.org/2018/credentials/v1"],
          type: ["VerifiableCredential", "OpenBadgeCredential"],
          issuanceDate: "2024-01-01T00:00:00Z",
        };

        const result = await verify(credentialWithoutIssuer);

        expect(result.status).toBe("error");
        expect(result.isValid).toBe(false);
        expect(result.error).toContain("Missing issuer");
        expect(result.checks.issuer[0].passed).toBe(false);
      });

      it("should extract string issuer", async () => {
        const credential = {
          "@context": ["https://www.w3.org/2018/credentials/v1"],
          type: ["VerifiableCredential", "OpenBadgeCredential"],
          issuer: "did:web:example.com",
          issuanceDate: "2024-01-01T00:00:00Z",
          proof: {
            type: "DataIntegrityProof",
            verificationMethod: "did:web:example.com#key-1",
          },
        };

        const result = await verify(credential);

        expect(result.issuer).toBe("did:web:example.com" as Shared.IRI);
      });

      it("should extract object issuer with id", async () => {
        const credential = {
          "@context": ["https://www.w3.org/2018/credentials/v1"],
          type: ["VerifiableCredential", "OpenBadgeCredential"],
          issuer: {
            id: "did:web:example.com",
            type: "Profile",
            name: "Example University",
          },
          issuanceDate: "2024-01-01T00:00:00Z",
          proof: {
            type: "DataIntegrityProof",
            verificationMethod: "did:web:example.com#key-1",
          },
        };

        const result = await verify(credential);

        expect(result.issuer).toBe("did:web:example.com" as Shared.IRI);
      });
    });

    describe("Temporal Validation", () => {
      describe("Issuance Date", () => {
        it("should reject credential without issuanceDate or validFrom", async () => {
          const credential = {
            "@context": ["https://www.w3.org/2018/credentials/v1"],
            type: ["VerifiableCredential"],
            issuer: "did:web:example.com",
            proof: {
              type: "DataIntegrityProof",
              verificationMethod: "did:web:example.com#key-1",
            },
          };

          const result = await verify(credential);

          expect(result.status).toBe("invalid");
          expect(result.isValid).toBe(false);
          const issuanceCheck = result.checks.temporal.find(
            (c) => c.check === "temporal.issuance",
          );
          expect(issuanceCheck?.passed).toBe(false);
          expect(issuanceCheck?.error).toContain(
            "missing required validFrom or issuanceDate",
          );
        });

        it("should accept credential with validFrom (OB3/VC 2.0 field)", async () => {
          const pastDate = new Date();
          pastDate.setDate(pastDate.getDate() - 30);

          const credential = {
            "@context": ["https://www.w3.org/2018/credentials/v2"],
            type: ["VerifiableCredential"],
            issuer: "did:web:example.com",
            validFrom: pastDate.toISOString(),
            proof: {
              type: "DataIntegrityProof",
              verificationMethod: "did:web:example.com#key-1",
            },
          };

          const result = await verify(credential);

          const issuanceCheck = result.checks.temporal.find(
            (c) => c.check === "temporal.issuance",
          );
          expect(issuanceCheck?.passed).toBe(true);
          expect(issuanceCheck?.details?.age).toBeGreaterThan(0);
        });

        it("should prefer validFrom over issuanceDate when both present", async () => {
          const validFromDate = new Date();
          validFromDate.setDate(validFromDate.getDate() - 10);

          const issuanceDateDate = new Date();
          issuanceDateDate.setDate(issuanceDateDate.getDate() - 30);

          const credential = {
            "@context": ["https://www.w3.org/2018/credentials/v2"],
            type: ["VerifiableCredential"],
            issuer: "did:web:example.com",
            validFrom: validFromDate.toISOString(),
            issuanceDate: issuanceDateDate.toISOString(),
            proof: {
              type: "DataIntegrityProof",
              verificationMethod: "did:web:example.com#key-1",
            },
          };

          const result = await verify(credential);

          const issuanceCheck = result.checks.temporal.find(
            (c) => c.check === "temporal.issuance",
          );
          expect(issuanceCheck?.passed).toBe(true);
          // Age should be approximately 10 days (~864000 seconds), not 30 days
          // This verifies validFrom is used over issuanceDate
          expect(issuanceCheck?.details?.age).toBeLessThan(15 * 24 * 60 * 60); // Less than 15 days in seconds
        });

        it("should reject credential with future validFrom", async () => {
          const futureDate = new Date();
          futureDate.setFullYear(futureDate.getFullYear() + 1);

          const credential = {
            "@context": ["https://www.w3.org/2018/credentials/v2"],
            type: ["VerifiableCredential"],
            issuer: "did:web:example.com",
            validFrom: futureDate.toISOString(),
            proof: {
              type: "DataIntegrityProof",
              verificationMethod: "did:web:example.com#key-1",
            },
          };

          const result = await verify(credential);

          const issuanceCheck = result.checks.temporal.find(
            (c) => c.check === "temporal.issuance",
          );
          expect(issuanceCheck?.passed).toBe(false);
          expect(issuanceCheck?.error).toContain("in the future");
        });

        it("should reject credential with future issuanceDate", async () => {
          const futureDate = new Date();
          futureDate.setFullYear(futureDate.getFullYear() + 1);

          const credential = {
            "@context": ["https://www.w3.org/2018/credentials/v1"],
            type: ["VerifiableCredential"],
            issuer: "did:web:example.com",
            issuanceDate: futureDate.toISOString(),
            proof: {
              type: "DataIntegrityProof",
              verificationMethod: "did:web:example.com#key-1",
            },
          };

          const result = await verify(credential);

          const issuanceCheck = result.checks.temporal.find(
            (c) => c.check === "temporal.issuance",
          );
          expect(issuanceCheck?.passed).toBe(false);
          expect(issuanceCheck?.error).toContain("in the future");
        });

        it("should accept credential with past issuanceDate", async () => {
          const pastDate = new Date();
          pastDate.setDate(pastDate.getDate() - 30);

          const credential = {
            "@context": ["https://www.w3.org/2018/credentials/v1"],
            type: ["VerifiableCredential"],
            issuer: "did:web:example.com",
            issuanceDate: pastDate.toISOString(),
            proof: {
              type: "DataIntegrityProof",
              verificationMethod: "did:web:example.com#key-1",
            },
          };

          const result = await verify(credential);

          const issuanceCheck = result.checks.temporal.find(
            (c) => c.check === "temporal.issuance",
          );
          expect(issuanceCheck?.passed).toBe(true);
          expect(issuanceCheck?.details?.age).toBeGreaterThan(0);
        });

        it("should reject invalid issuanceDate format", async () => {
          const credential = {
            "@context": ["https://www.w3.org/2018/credentials/v1"],
            type: ["VerifiableCredential"],
            issuer: "did:web:example.com",
            issuanceDate: "not-a-valid-date",
            proof: {
              type: "DataIntegrityProof",
              verificationMethod: "did:web:example.com#key-1",
            },
          };

          const result = await verify(credential);

          const issuanceCheck = result.checks.temporal.find(
            (c) => c.check === "temporal.issuance",
          );
          expect(issuanceCheck?.passed).toBe(false);
          expect(issuanceCheck?.error).toContain(
            "Invalid issuance date format",
          );
        });
      });

      describe("Expiration Date", () => {
        it("should accept credential without expirationDate or validUntil", async () => {
          const credential = {
            "@context": ["https://www.w3.org/2018/credentials/v1"],
            type: ["VerifiableCredential"],
            issuer: "did:web:example.com",
            issuanceDate: "2024-01-01T00:00:00Z",
            proof: {
              type: "DataIntegrityProof",
              verificationMethod: "did:web:example.com#key-1",
            },
          };

          const result = await verify(credential);

          const expirationCheck = result.checks.temporal.find(
            (c) => c.check === "temporal.expiration",
          );
          expect(expirationCheck?.passed).toBe(true);
          expect(expirationCheck?.details?.hasExpiration).toBe(false);
        });

        it("should accept credential with future validUntil (OB3/VC 2.0 field)", async () => {
          const futureDate = new Date();
          futureDate.setFullYear(futureDate.getFullYear() + 1);

          const credential = {
            "@context": ["https://www.w3.org/2018/credentials/v2"],
            type: ["VerifiableCredential"],
            issuer: "did:web:example.com",
            validFrom: "2024-01-01T00:00:00Z",
            validUntil: futureDate.toISOString(),
            proof: {
              type: "DataIntegrityProof",
              verificationMethod: "did:web:example.com#key-1",
            },
          };

          const result = await verify(credential);

          const expirationCheck = result.checks.temporal.find(
            (c) => c.check === "temporal.expiration",
          );
          expect(expirationCheck?.passed).toBe(true);
          expect(expirationCheck?.details?.expiresIn).toBeGreaterThan(0);
        });

        it("should prefer validUntil over expirationDate when both present", async () => {
          const validUntilDate = new Date();
          validUntilDate.setFullYear(validUntilDate.getFullYear() + 2); // 2 years from now

          const expirationDateDate = new Date();
          expirationDateDate.setDate(expirationDateDate.getDate() - 30); // 30 days ago (expired)

          const credential = {
            "@context": ["https://www.w3.org/2018/credentials/v2"],
            type: ["VerifiableCredential"],
            issuer: "did:web:example.com",
            validFrom: "2024-01-01T00:00:00Z",
            validUntil: validUntilDate.toISOString(),
            expirationDate: expirationDateDate.toISOString(), // Would fail if used
            proof: {
              type: "DataIntegrityProof",
              verificationMethod: "did:web:example.com#key-1",
            },
          };

          const result = await verify(credential);

          const expirationCheck = result.checks.temporal.find(
            (c) => c.check === "temporal.expiration",
          );
          // Should pass because validUntil (2 years from now) is used instead of expirationDate (30 days ago)
          expect(expirationCheck?.passed).toBe(true);
          expect(expirationCheck?.details?.expiresIn).toBeGreaterThan(0);
        });

        it("should reject credential with past validUntil", async () => {
          const pastDate = new Date();
          pastDate.setDate(pastDate.getDate() - 30);

          const credential = {
            "@context": ["https://www.w3.org/2018/credentials/v2"],
            type: ["VerifiableCredential"],
            issuer: "did:web:example.com",
            validFrom: "2023-01-01T00:00:00Z",
            validUntil: pastDate.toISOString(),
            proof: {
              type: "DataIntegrityProof",
              verificationMethod: "did:web:example.com#key-1",
            },
          };

          const result = await verify(credential);

          const expirationCheck = result.checks.temporal.find(
            (c) => c.check === "temporal.expiration",
          );
          expect(expirationCheck?.passed).toBe(false);
          expect(expirationCheck?.error).toContain("expired");
        });

        it("should accept credential with future expirationDate", async () => {
          const futureDate = new Date();
          futureDate.setFullYear(futureDate.getFullYear() + 1);

          const credential = {
            "@context": ["https://www.w3.org/2018/credentials/v1"],
            type: ["VerifiableCredential"],
            issuer: "did:web:example.com",
            issuanceDate: "2024-01-01T00:00:00Z",
            expirationDate: futureDate.toISOString(),
            proof: {
              type: "DataIntegrityProof",
              verificationMethod: "did:web:example.com#key-1",
            },
          };

          const result = await verify(credential);

          const expirationCheck = result.checks.temporal.find(
            (c) => c.check === "temporal.expiration",
          );
          expect(expirationCheck?.passed).toBe(true);
          expect(expirationCheck?.details?.expiresIn).toBeGreaterThan(0);
        });

        it("should reject expired credential", async () => {
          const pastDate = new Date();
          pastDate.setDate(pastDate.getDate() - 30);

          const credential = {
            "@context": ["https://www.w3.org/2018/credentials/v1"],
            type: ["VerifiableCredential"],
            issuer: "did:web:example.com",
            issuanceDate: "2023-01-01T00:00:00Z",
            expirationDate: pastDate.toISOString(),
            proof: {
              type: "DataIntegrityProof",
              verificationMethod: "did:web:example.com#key-1",
            },
          };

          const result = await verify(credential);

          const expirationCheck = result.checks.temporal.find(
            (c) => c.check === "temporal.expiration",
          );
          expect(expirationCheck?.passed).toBe(false);
          expect(expirationCheck?.error).toContain("expired");
        });

        it("should accept expired credential with allowExpired option", async () => {
          const pastDate = new Date();
          pastDate.setDate(pastDate.getDate() - 30);

          const credential = {
            "@context": ["https://www.w3.org/2018/credentials/v1"],
            type: ["VerifiableCredential"],
            issuer: "did:web:example.com",
            issuanceDate: "2023-01-01T00:00:00Z",
            expirationDate: pastDate.toISOString(),
            proof: {
              type: "DataIntegrityProof",
              verificationMethod: "did:web:example.com#key-1",
            },
          };

          const options: VerificationOptions = {
            allowExpired: true,
          };

          const result = await verify(credential, options);

          const expirationCheck = result.checks.temporal.find(
            (c) => c.check === "temporal.expiration",
          );
          expect(expirationCheck?.passed).toBe(true);
          expect(expirationCheck?.details?.isExpired).toBe(true);
          expect(expirationCheck?.details?.allowExpired).toBe(true);
        });

        it("should reject invalid expirationDate format", async () => {
          const credential = {
            "@context": ["https://www.w3.org/2018/credentials/v1"],
            type: ["VerifiableCredential"],
            issuer: "did:web:example.com",
            issuanceDate: "2024-01-01T00:00:00Z",
            expirationDate: "not-a-valid-date",
            proof: {
              type: "DataIntegrityProof",
              verificationMethod: "did:web:example.com#key-1",
            },
          };

          const result = await verify(credential);

          const expirationCheck = result.checks.temporal.find(
            (c) => c.check === "temporal.expiration",
          );
          expect(expirationCheck?.passed).toBe(false);
          expect(expirationCheck?.error).toContain(
            "Invalid expiration date format",
          );
        });
      });

      describe("Clock Tolerance", () => {
        it("should apply clock tolerance to issuance date", async () => {
          // Create an issuance date 5 seconds in the future
          const futureDate = new Date();
          futureDate.setSeconds(futureDate.getSeconds() + 5);

          const credential = {
            "@context": ["https://www.w3.org/2018/credentials/v1"],
            type: ["VerifiableCredential"],
            issuer: "did:web:example.com",
            issuanceDate: futureDate.toISOString(),
            proof: {
              type: "DataIntegrityProof",
              verificationMethod: "did:web:example.com#key-1",
            },
          };

          // Should fail without tolerance
          const resultWithoutTolerance = await verify(credential);
          const issuanceCheck1 = resultWithoutTolerance.checks.temporal.find(
            (c) => c.check === "temporal.issuance",
          );
          expect(issuanceCheck1?.passed).toBe(false);

          // Should pass with 10 second tolerance
          const resultWithTolerance = await verify(credential, {
            clockTolerance: 10,
          });
          const issuanceCheck2 = resultWithTolerance.checks.temporal.find(
            (c) => c.check === "temporal.issuance",
          );
          expect(issuanceCheck2?.passed).toBe(true);
        });

        it("should apply clock tolerance to expiration date", async () => {
          // Create an expiration date 5 seconds in the past
          const pastDate = new Date();
          pastDate.setSeconds(pastDate.getSeconds() - 5);

          const credential = {
            "@context": ["https://www.w3.org/2018/credentials/v1"],
            type: ["VerifiableCredential"],
            issuer: "did:web:example.com",
            issuanceDate: "2023-01-01T00:00:00Z",
            expirationDate: pastDate.toISOString(),
            proof: {
              type: "DataIntegrityProof",
              verificationMethod: "did:web:example.com#key-1",
            },
          };

          // Should fail without tolerance
          const resultWithoutTolerance = await verify(credential);
          const expirationCheck1 = resultWithoutTolerance.checks.temporal.find(
            (c) => c.check === "temporal.expiration",
          );
          expect(expirationCheck1?.passed).toBe(false);

          // Should pass with 10 second tolerance
          const resultWithTolerance = await verify(credential, {
            clockTolerance: 10,
          });
          const expirationCheck2 = resultWithTolerance.checks.temporal.find(
            (c) => c.check === "temporal.expiration",
          );
          expect(expirationCheck2?.passed).toBe(true);
        });
      });
    });

    describe("Verification Options", () => {
      let validCredential: Record<string, unknown>;

      beforeEach(() => {
        validCredential = {
          "@context": ["https://www.w3.org/2018/credentials/v1"],
          type: ["VerifiableCredential"],
          issuer: "did:web:example.com",
          issuanceDate: "2024-01-01T00:00:00Z",
          proof: {
            type: "DataIntegrityProof",
            verificationMethod: "did:web:example.com#key-1",
          },
        };
      });

      it("should skip temporal validation when skipTemporalValidation is true", async () => {
        const futureDate = new Date();
        futureDate.setFullYear(futureDate.getFullYear() + 1);

        const credential = {
          ...validCredential,
          issuanceDate: futureDate.toISOString(), // Future date (invalid)
        };

        const options: VerificationOptions = {
          skipTemporalValidation: true,
        };

        const result = await verify(credential, options);

        // Should not have temporal checks
        expect(result.checks.temporal).toHaveLength(0);
      });

      it("should skip proof verification when skipProofVerification is true", async () => {
        const options: VerificationOptions = {
          skipProofVerification: true,
        };

        const result = await verify(validCredential, options);

        // Should not have proof checks from verifyJWTProof/verifyLinkedDataProof
        const proofSignatureCheck = result.checks.proof.find(
          (c) =>
            c.check === "proof.jwt.signature" ||
            c.check === "proof.linked-data.signature",
        );
        expect(proofSignatureCheck).toBeUndefined();
      });
    });

    describe("Verification Result Structure", () => {
      it("should return complete verification result", async () => {
        const credential = {
          id: "https://example.com/credentials/123",
          "@context": ["https://www.w3.org/2018/credentials/v1"],
          type: ["VerifiableCredential"],
          issuer: "did:web:example.com",
          issuanceDate: "2024-01-01T00:00:00Z",
          proof: {
            type: "DataIntegrityProof",
            verificationMethod: "did:web:example.com#key-1",
          },
        };

        const result = await verify(credential);

        // Should have all required fields
        expect(result.status).toBeDefined();
        expect(result.isValid).toBeDefined();
        expect(result.checks).toBeDefined();
        expect(result.verifiedAt).toBeDefined();

        // Should have check categories
        expect(result.checks.proof).toBeDefined();
        expect(result.checks.issuer).toBeDefined();
        expect(result.checks.temporal).toBeDefined();
        expect(result.checks.status).toBeDefined();
        expect(result.checks.schema).toBeDefined();

        // Should have metadata
        expect(result.metadata).toBeDefined();
        expect(result.metadata?.durationMs).toBeGreaterThanOrEqual(0);

        // Should extract credential info
        expect(result.credentialId).toBe(
          "https://example.com/credentials/123" as Shared.IRI,
        );
        expect(result.issuer).toBe("did:web:example.com" as Shared.IRI);
        expect(result.verificationMethod).toBe(
          "did:web:example.com#key-1" as Shared.IRI,
        );
      });

      it("should set isValid to match status", async () => {
        const credential = {
          "@context": ["https://www.w3.org/2018/credentials/v1"],
          type: ["VerifiableCredential"],
          issuer: "did:web:example.com",
          issuanceDate: "2024-01-01T00:00:00Z",
          proof: {
            type: "DataIntegrityProof",
            verificationMethod: "did:web:example.com#key-1",
          },
        };

        const result = await verify(credential);

        if (result.status === "valid") {
          expect(result.isValid).toBe(true);
        } else {
          expect(result.isValid).toBe(false);
        }
      });

      it("should extract proofType from Linked Data credentials", async () => {
        const credential = {
          "@context": ["https://www.w3.org/2018/credentials/v1"],
          type: ["VerifiableCredential"],
          issuer: "did:web:example.com",
          issuanceDate: "2024-01-01T00:00:00Z",
          proof: {
            type: "DataIntegrityProof",
            verificationMethod: "did:web:example.com#key-1",
          },
        };

        const result = await verify(credential);

        expect(result.proofType).toBe("DataIntegrityProof");
      });
    });

    describe("Schema Validation", () => {
      it("should reject credential without type field", async () => {
        const credential = {
          "@context": ["https://www.w3.org/2018/credentials/v1"],
          issuer: "did:web:example.com",
          issuanceDate: "2024-01-01T00:00:00Z",
        };

        const result = await verify(credential);

        expect(result.status).toBe("error");
        expect(result.isValid).toBe(false);
        expect(result.error).toContain("type");
        expect(result.checks.schema).toHaveLength(1);
        expect(result.checks.schema[0].check).toBe("schema.type");
        expect(result.checks.schema[0].passed).toBe(false);
      });

      it("should reject credential without VerifiableCredential type", async () => {
        const credential = {
          "@context": ["https://www.w3.org/2018/credentials/v1"],
          type: ["OpenBadgeCredential"],
          issuer: "did:web:example.com",
          issuanceDate: "2024-01-01T00:00:00Z",
        };

        const result = await verify(credential);

        expect(result.status).toBe("error");
        expect(result.isValid).toBe(false);
        expect(result.error).toContain("VerifiableCredential");
        expect(result.checks.schema[0].passed).toBe(false);
      });

      it("should pass type validation with valid credential types", async () => {
        const credential = {
          "@context": ["https://www.w3.org/2018/credentials/v1"],
          type: ["VerifiableCredential", "OpenBadgeCredential"],
          issuer: "did:web:example.com",
          issuanceDate: "2024-01-01T00:00:00Z",
          proof: {
            type: "DataIntegrityProof",
            verificationMethod: "did:web:example.com#key-1",
          },
        };

        const result = await verify(credential);

        expect(result.checks.schema).toHaveLength(1);
        expect(result.checks.schema[0].check).toBe("schema.type");
        expect(result.checks.schema[0].passed).toBe(true);
        expect(result.checks.schema[0].details).toHaveProperty(
          "hasVerifiableCredential",
          true,
        );
        expect(result.checks.schema[0].details).toHaveProperty(
          "hasOpenBadgeCredential",
          true,
        );
      });
    });
  });
});
