/**
 * Test for the convertToEndorsementCredential function fix
 *
 * This test verifies that the issuer URL mapping is handled correctly
 * when converting EndorsementCredentialDto to EndorsementCredential domain type.
 */

import { describe, expect, it } from "bun:test";
import type { EndorsementCredentialDto } from "@/api/validation/badgeClass.schemas";

// Import the actual implementation to test it
import { convertToEndorsementCredential } from "@/api/api.router";
import { toIRI } from "@/utils/types/iri-utils";

describe("EndorsementCredential Conversion Fix", () => {
  describe("convertToEndorsementCredential issuer URL mapping", () => {
    it("should handle issuer object with valid URL id", () => {
      const dto: EndorsementCredentialDto = {
        "@context": ["https://www.w3.org/2018/credentials/v1"],
        id: "https://example.org/endorsements/1",
        type: ["VerifiableCredential", "EndorsementCredential"],
        issuer: {
          id: "https://example.org/issuers/123",
          type: ["Issuer"],
          name: "Test Issuer",
        },
        validFrom: "2023-01-01T00:00:00Z",
        credentialSubject: {
          id: "https://example.org/achievements/456",
          type: ["Achievement"],
          endorsementComment: "Great achievement!",
        },
      };

      const result = convertToEndorsementCredential(dto);

      expect(typeof result.issuer).toBe("object");
      if (typeof result.issuer === "object") {
        expect(result.issuer.url).toBe(
          toIRI("https://example.org/issuers/123"),
        );
        expect(result.issuer.id).toBe(toIRI("https://example.org/issuers/123"));
        expect(result.issuer.name).toBe("Test Issuer");
      }
    });

    it("should handle issuer object with UUID id (not a URL)", () => {
      const dto: EndorsementCredentialDto = {
        "@context": ["https://www.w3.org/2018/credentials/v1"],
        id: "https://example.org/endorsements/1",
        type: ["VerifiableCredential", "EndorsementCredential"],
        issuer: {
          id: "123e4567-e89b-12d3-a456-426614174000",
          type: ["Issuer"],
          name: "Test Issuer",
        },
        validFrom: "2023-01-01T00:00:00Z",
        credentialSubject: {
          id: "https://example.org/achievements/456",
          type: ["Achievement"],
          endorsementComment: "Great achievement!",
        },
      };

      const result = convertToEndorsementCredential(dto);

      expect(typeof result.issuer).toBe("object");
      if (typeof result.issuer === "object") {
        expect(result.issuer.url).toBe(
          toIRI(
            "https://example.org/issuers/123e4567-e89b-12d3-a456-426614174000",
          ),
        );
        expect(result.issuer.id).toBe(
          toIRI("123e4567-e89b-12d3-a456-426614174000"),
        );
        expect(result.issuer.name).toBe("Test Issuer");
      }
    });

    it("should handle issuer object with no id", () => {
      const dto: EndorsementCredentialDto = {
        "@context": ["https://www.w3.org/2018/credentials/v1"],
        id: "https://example.org/endorsements/1",
        type: ["VerifiableCredential", "EndorsementCredential"],
        issuer: {
          id: "",
          type: ["Issuer"],
          name: "Test Issuer",
        },
        validFrom: "2023-01-01T00:00:00Z",
        credentialSubject: {
          id: "https://example.org/achievements/456",
          type: ["Achievement"],
          endorsementComment: "Great achievement!",
        },
      };

      const result = convertToEndorsementCredential(dto);

      expect(typeof result.issuer).toBe("object");
      if (typeof result.issuer === "object") {
        expect(result.issuer.url).toBe(
          toIRI("https://example.org/issuers/unknown"),
        );
        expect(result.issuer.id).toBe(undefined);
        expect(result.issuer.name).toBe("Test Issuer");
      }
    });

    it("should handle string issuer (IRI)", () => {
      const dto: EndorsementCredentialDto = {
        "@context": ["https://www.w3.org/2018/credentials/v1"],
        id: "https://example.org/endorsements/1",
        type: ["VerifiableCredential", "EndorsementCredential"],
        issuer: "https://example.org/issuers/123",
        validFrom: "2023-01-01T00:00:00Z",
        credentialSubject: {
          id: "https://example.org/achievements/456",
          type: ["Achievement"],
          endorsementComment: "Great achievement!",
        },
      };

      const result = convertToEndorsementCredential(dto);

      expect(typeof result.issuer).toBe("string");
      expect(result.issuer).toBe(toIRI("https://example.org/issuers/123"));
    });
  });

  describe("Error scenarios and edge cases", () => {
    it("should throw error for invalid issuer format (null)", () => {
      const dto = {
        "@context": ["https://www.w3.org/2018/credentials/v1"],
        id: "https://example.org/endorsements/1",
        type: ["VerifiableCredential", "EndorsementCredential"],
        issuer: null,
        validFrom: "2023-01-01T00:00:00Z",
        credentialSubject: {
          id: "https://example.org/achievements/456",
          type: ["Achievement"],
          endorsementComment: "Great achievement!",
        },
      } as unknown as EndorsementCredentialDto;

      expect(() => convertToEndorsementCredential(dto)).toThrow(
        "Invalid issuer format in endorsement credential",
      );
    });

    it("should throw error for invalid issuer format (undefined)", () => {
      const dto = {
        "@context": ["https://www.w3.org/2018/credentials/v1"],
        id: "https://example.org/endorsements/1",
        type: ["VerifiableCredential", "EndorsementCredential"],
        issuer: undefined,
        validFrom: "2023-01-01T00:00:00Z",
        credentialSubject: {
          id: "https://example.org/achievements/456",
          type: ["Achievement"],
          endorsementComment: "Great achievement!",
        },
      } as unknown as EndorsementCredentialDto;

      expect(() => convertToEndorsementCredential(dto)).toThrow(
        "Invalid issuer format in endorsement credential",
      );
    });

    it("should throw error for invalid issuer format (number)", () => {
      const dto = {
        "@context": ["https://www.w3.org/2018/credentials/v1"],
        id: "https://example.org/endorsements/1",
        type: ["VerifiableCredential", "EndorsementCredential"],
        issuer: 123,
        validFrom: "2023-01-01T00:00:00Z",
        credentialSubject: {
          id: "https://example.org/achievements/456",
          type: ["Achievement"],
          endorsementComment: "Great achievement!",
        },
      } as unknown as EndorsementCredentialDto;

      expect(() => convertToEndorsementCredential(dto)).toThrow(
        "Invalid issuer format in endorsement credential",
      );
    });

    it("should throw error for invalid issuer format (boolean)", () => {
      const dto = {
        "@context": ["https://www.w3.org/2018/credentials/v1"],
        id: "https://example.org/endorsements/1",
        type: ["VerifiableCredential", "EndorsementCredential"],
        issuer: false,
        validFrom: "2023-01-01T00:00:00Z",
        credentialSubject: {
          id: "https://example.org/achievements/456",
          type: ["Achievement"],
          endorsementComment: "Great achievement!",
        },
      } as unknown as EndorsementCredentialDto;

      expect(() => convertToEndorsementCredential(dto)).toThrow(
        "Invalid issuer format in endorsement credential",
      );
    });

    it("should preserve additional fields in issuer object via spread operator", () => {
      const dto: EndorsementCredentialDto = {
        "@context": ["https://www.w3.org/2018/credentials/v1"],
        id: "https://example.org/endorsements/1",
        type: ["VerifiableCredential", "EndorsementCredential"],
        issuer: {
          id: "https://example.org/issuers/123",
          type: ["Issuer"],
          name: "Test Issuer",
          // Additional fields that should be preserved
          email: "contact@example.org",
          description: "A test issuer for validation",
          customField: "custom value",
        } as EndorsementCredentialDto["issuer"] & {
          email: string;
          description: string;
          customField: string;
        },
        validFrom: "2023-01-01T00:00:00Z",
        credentialSubject: {
          id: "https://example.org/achievements/456",
          type: ["Achievement"],
          endorsementComment: "Great achievement!",
        },
      };

      const result = convertToEndorsementCredential(dto);

      expect(typeof result.issuer).toBe("object");
      if (typeof result.issuer === "object") {
        expect(result.issuer.id).toBe(toIRI("https://example.org/issuers/123"));
        expect(result.issuer.name).toBe("Test Issuer");
        expect(result.issuer.url).toBe(
          toIRI("https://example.org/issuers/123"),
        );
        // Verify additional fields are preserved
        const issuerWithExtras = result.issuer as typeof result.issuer & {
          email: string;
          description: string;
          customField: string;
        };
        expect(issuerWithExtras.email).toBe("contact@example.org");
        expect(issuerWithExtras.description).toBe(
          "A test issuer for validation",
        );
        expect(issuerWithExtras.customField).toBe("custom value");
      }
    });

    it("should handle issuer object with null id", () => {
      const dto: EndorsementCredentialDto = {
        "@context": ["https://www.w3.org/2018/credentials/v1"],
        id: "https://example.org/endorsements/1",
        type: ["VerifiableCredential", "EndorsementCredential"],
        issuer: {
          id: null as unknown as string,
          type: ["Issuer"],
          name: "Test Issuer",
        },
        validFrom: "2023-01-01T00:00:00Z",
        credentialSubject: {
          id: "https://example.org/achievements/456",
          type: ["Achievement"],
          endorsementComment: "Great achievement!",
        },
      };

      const result = convertToEndorsementCredential(dto);

      expect(typeof result.issuer).toBe("object");
      if (typeof result.issuer === "object") {
        expect(result.issuer.url).toBe(
          toIRI("https://example.org/issuers/unknown"),
        );
        expect(result.issuer.id).toBe(undefined);
        expect(result.issuer.name).toBe("Test Issuer");
      }
    });

    it("should handle issuer object with undefined id", () => {
      const dto: EndorsementCredentialDto = {
        "@context": ["https://www.w3.org/2018/credentials/v1"],
        id: "https://example.org/endorsements/1",
        type: ["VerifiableCredential", "EndorsementCredential"],
        issuer: {
          id: undefined as unknown as string,
          type: ["Issuer"],
          name: "Test Issuer",
        },
        validFrom: "2023-01-01T00:00:00Z",
        credentialSubject: {
          id: "https://example.org/achievements/456",
          type: ["Achievement"],
          endorsementComment: "Great achievement!",
        },
      };

      const result = convertToEndorsementCredential(dto);

      expect(typeof result.issuer).toBe("object");
      if (typeof result.issuer === "object") {
        expect(result.issuer.url).toBe(
          toIRI("https://example.org/issuers/unknown"),
        );
        expect(result.issuer.id).toBe(undefined);
        expect(result.issuer.name).toBe("Test Issuer");
      }
    });
  });

  describe("toIRI edge cases", () => {
    it("should handle invalid string that toIRI returns null for", () => {
      const dto: EndorsementCredentialDto = {
        "@context": ["https://www.w3.org/2018/credentials/v1"],
        id: "https://example.org/endorsements/1",
        type: ["VerifiableCredential", "EndorsementCredential"],
        issuer: {
          id: "invalid-iri-string",
          type: ["Issuer"],
          name: "Test Issuer",
        },
        validFrom: "2023-01-01T00:00:00Z",
        credentialSubject: {
          id: "https://example.org/achievements/456",
          type: ["Achievement"],
          endorsementComment: "Great achievement!",
        },
      };

      const result = convertToEndorsementCredential(dto);

      expect(typeof result.issuer).toBe("object");
      if (typeof result.issuer === "object") {
        // Should use placeholder URL when toIRI returns null for the id
        expect(result.issuer.url).toBe(
          toIRI("https://example.org/issuers/unknown"),
        );
        expect(result.issuer.id).toBe(null); // toIRI returns null for invalid string
        expect(result.issuer.name).toBe("Test Issuer");
      }
    });

    it("should handle malformed URL that throws in URL constructor", () => {
      const dto: EndorsementCredentialDto = {
        "@context": ["https://www.w3.org/2018/credentials/v1"],
        id: "https://example.org/endorsements/1",
        type: ["VerifiableCredential", "EndorsementCredential"],
        issuer: {
          id: "ht tp://invalid url with spaces",
          type: ["Issuer"],
          name: "Test Issuer",
        },
        validFrom: "2023-01-01T00:00:00Z",
        credentialSubject: {
          id: "https://example.org/achievements/456",
          type: ["Achievement"],
          endorsementComment: "Great achievement!",
        },
      };

      const result = convertToEndorsementCredential(dto);

      expect(typeof result.issuer).toBe("object");
      if (typeof result.issuer === "object") {
        // Should use placeholder URL when URL constructor throws
        expect(result.issuer.url).toBe(
          toIRI("https://example.org/issuers/unknown"),
        );
        expect(result.issuer.id).toBe(null); // toIRI returns null for invalid URL
        expect(result.issuer.name).toBe("Test Issuer");
      }
    });
  });

  /**
   * EndorsementCredential Structure Validation Tests
   *
   * Per Open Badges 3.0 specification, EndorsementCredential is a
   * VerifiableCredential with specific structure requirements:
   *
   * Required fields:
   * - @context: Array including VC and OB3 contexts
   * - id: IRI (required)
   * - type: ["VerifiableCredential", "EndorsementCredential"]
   * - issuer: IRI or Issuer object with id, type, name, url
   * - validFrom: DateTime string (VC Data Model 2.0)
   * - credentialSubject: Object with id, type, and optional endorsementComment
   *
   * @see https://www.imsglobal.org/spec/ob/v3p0/#endorsementcredential
   */
  describe("EndorsementCredential Structure Validation", () => {
    it("should have correct type array including both VerifiableCredential and EndorsementCredential", () => {
      const dto: EndorsementCredentialDto = {
        "@context": [
          "https://www.w3.org/ns/credentials/v2",
          "https://purl.imsglobal.org/spec/ob/v3p0/context-3.0.3.json",
        ],
        id: "https://example.org/endorsements/1",
        type: ["VerifiableCredential", "EndorsementCredential"],
        issuer: "https://example.org/issuers/endorser",
        validFrom: "2024-01-15T12:00:00Z",
        credentialSubject: {
          id: "https://example.org/achievements/456",
          type: ["EndorsementSubject"],
          endorsementComment: "This is an excellent achievement!",
        },
      };

      const result = convertToEndorsementCredential(dto);

      expect(result.type).toEqual([
        "VerifiableCredential",
        "EndorsementCredential",
      ]);
      expect(result.type[0]).toBe("VerifiableCredential");
      expect(result.type[1]).toBe("EndorsementCredential");
    });

    it("should include required @context array with VC and OB3 contexts", () => {
      const dto: EndorsementCredentialDto = {
        "@context": [
          "https://www.w3.org/ns/credentials/v2",
          "https://purl.imsglobal.org/spec/ob/v3p0/context-3.0.3.json",
        ],
        id: "https://example.org/endorsements/1",
        type: ["VerifiableCredential", "EndorsementCredential"],
        issuer: "https://example.org/issuers/endorser",
        validFrom: "2024-01-15T12:00:00Z",
        credentialSubject: {
          id: "https://example.org/achievements/456",
          type: ["EndorsementSubject"],
        },
      };

      const result = convertToEndorsementCredential(dto);

      expect(Array.isArray(result["@context"])).toBe(true);
      expect(result["@context"]).toContain(
        "https://www.w3.org/ns/credentials/v2",
      );
      expect(result["@context"]).toContain(
        "https://purl.imsglobal.org/spec/ob/v3p0/context-3.0.3.json",
      );
    });

    it("should have validFrom field (VC Data Model 2.0 temporal field)", () => {
      const validFromDate = "2024-01-15T12:00:00Z";
      const dto: EndorsementCredentialDto = {
        "@context": ["https://www.w3.org/ns/credentials/v2"],
        id: "https://example.org/endorsements/1",
        type: ["VerifiableCredential", "EndorsementCredential"],
        issuer: "https://example.org/issuers/endorser",
        validFrom: validFromDate,
        credentialSubject: {
          id: "https://example.org/achievements/456",
          type: ["EndorsementSubject"],
        },
      };

      const result = convertToEndorsementCredential(dto);

      expect(result.validFrom).toBe(validFromDate);
    });

    it("should have properly structured credentialSubject with id and type", () => {
      const dto: EndorsementCredentialDto = {
        "@context": ["https://www.w3.org/ns/credentials/v2"],
        id: "https://example.org/endorsements/1",
        type: ["VerifiableCredential", "EndorsementCredential"],
        issuer: "https://example.org/issuers/endorser",
        validFrom: "2024-01-15T12:00:00Z",
        credentialSubject: {
          id: "https://example.org/achievements/456",
          type: ["EndorsementSubject"],
          endorsementComment: "Highly recommended achievement!",
        },
      };

      const result = convertToEndorsementCredential(dto);

      expect(result.credentialSubject).toBeDefined();
      expect(result.credentialSubject.id).toBe(
        toIRI("https://example.org/achievements/456"),
      );
      expect(result.credentialSubject.type).toEqual(["EndorsementSubject"]);
      expect(result.credentialSubject.endorsementComment).toBe(
        "Highly recommended achievement!",
      );
    });

    it("should accept credentialSubject without optional endorsementComment", () => {
      const dto: EndorsementCredentialDto = {
        "@context": ["https://www.w3.org/ns/credentials/v2"],
        id: "https://example.org/endorsements/1",
        type: ["VerifiableCredential", "EndorsementCredential"],
        issuer: "https://example.org/issuers/endorser",
        validFrom: "2024-01-15T12:00:00Z",
        credentialSubject: {
          id: "https://example.org/achievements/456",
          type: ["EndorsementSubject"],
          // No endorsementComment - it's optional
        },
      };

      const result = convertToEndorsementCredential(dto);

      expect(result.credentialSubject.endorsementComment).toBeUndefined();
    });

    it("should handle embedded issuer object with full profile", () => {
      const dto: EndorsementCredentialDto = {
        "@context": ["https://www.w3.org/ns/credentials/v2"],
        id: "https://example.org/endorsements/1",
        type: ["VerifiableCredential", "EndorsementCredential"],
        issuer: {
          id: "https://example.org/issuers/endorser",
          type: ["Profile"],
          name: "Endorsing Organization",
        },
        validFrom: "2024-01-15T12:00:00Z",
        credentialSubject: {
          id: "https://example.org/achievements/456",
          type: ["EndorsementSubject"],
        },
      };

      const result = convertToEndorsementCredential(dto);

      expect(typeof result.issuer).toBe("object");
      if (typeof result.issuer === "object") {
        expect(result.issuer.id).toBe(
          toIRI("https://example.org/issuers/endorser"),
        );
        expect(result.issuer.name).toBe("Endorsing Organization");
        expect(result.issuer.url).toBeDefined();
      }
    });

    it("should preserve id as valid IRI", () => {
      const endorsementId = "https://example.org/endorsements/abc123";
      const dto: EndorsementCredentialDto = {
        "@context": ["https://www.w3.org/ns/credentials/v2"],
        id: endorsementId,
        type: ["VerifiableCredential", "EndorsementCredential"],
        issuer: "https://example.org/issuers/endorser",
        validFrom: "2024-01-15T12:00:00Z",
        credentialSubject: {
          id: "https://example.org/achievements/456",
          type: ["EndorsementSubject"],
        },
      };

      const result = convertToEndorsementCredential(dto);

      expect(result.id).toBe(toIRI(endorsementId));
    });
  });

  describe("Additional fields preservation", () => {
    it("should preserve additional top-level fields via spread operator", () => {
      const dto = {
        "@context": ["https://www.w3.org/2018/credentials/v1"],
        id: "https://example.org/endorsements/1",
        type: ["VerifiableCredential", "EndorsementCredential"],
        issuer: "https://example.org/issuers/123",
        validFrom: "2023-01-01T00:00:00Z",
        credentialSubject: {
          id: "https://example.org/achievements/456",
          type: ["Achievement"],
          endorsementComment: "Great achievement!",
        },
        // Additional fields that should be preserved
        validUntil: "2024-01-01T00:00:00Z",
        proof: {
          type: "Ed25519Signature2020",
          created: "2023-01-01T00:00:00Z",
          verificationMethod: "https://example.org/keys/1",
          proofPurpose: "assertionMethod",
          proofValue: "z3MvGX...",
        },
        customProperty: "custom value",
      } as EndorsementCredentialDto & {
        validUntil: string;
        proof: {
          type: string;
          created: string;
          verificationMethod: string;
          proofPurpose: string;
          proofValue: string;
        };
        customProperty: string;
      };

      const result = convertToEndorsementCredential(dto);

      // Verify core fields are converted correctly
      expect(result.issuer).toBe(toIRI("https://example.org/issuers/123"));
      expect(result.id).toBe(toIRI("https://example.org/endorsements/1"));

      // Verify additional fields are preserved
      expect(result.validUntil).toBe("2024-01-01T00:00:00Z");
      expect(result.proof).toEqual({
        type: "Ed25519Signature2020",
        created: "2023-01-01T00:00:00Z",
        verificationMethod: "https://example.org/keys/1",
        proofPurpose: "assertionMethod",
        proofValue: "z3MvGX...",
      });
      expect(result.customProperty).toBe("custom value");
    });
  });
});
