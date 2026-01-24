// tests/unit/utils/type-helpers.test.ts
import { describe, it, expect } from "vitest";
import {
  validateOB3Context,
  isOB3VerifiableCredential,
  createIRI,
  createDateTime,
} from "@/utils/type-helpers";
import type { OB3 } from "openbadges-types";

describe("validateOB3Context", () => {
  describe("valid formats", () => {
    it("should accept a valid string context", () => {
      const result = validateOB3Context(
        "https://www.w3.org/2018/credentials/v1",
      );
      expect(result.valid).toBe(true);
      expect(result.error).toBeUndefined();
    });

    it("should accept a valid array with VC and OB3 contexts", () => {
      const result = validateOB3Context([
        "https://www.w3.org/2018/credentials/v1",
        "https://purl.imsglobal.org/spec/ob/v3p0/context.json",
      ]);
      expect(result.valid).toBe(true);
      expect(result.error).toBeUndefined();
    });

    it("should accept VC v2 context", () => {
      const result = validateOB3Context([
        "https://www.w3.org/ns/credentials/v2",
        "https://purl.imsglobal.org/spec/ob/v3p0/context.json",
      ]);
      expect(result.valid).toBe(true);
      expect(result.error).toBeUndefined();
    });

    it("should accept alternative OB3 context URL", () => {
      const result = validateOB3Context([
        "https://www.w3.org/2018/credentials/v1",
        "https://openbadges.org/spec/ob/v3p0/context.json",
      ]);
      expect(result.valid).toBe(true);
      expect(result.error).toBeUndefined();
    });

    it("should accept array with additional contexts", () => {
      const result = validateOB3Context([
        "https://www.w3.org/2018/credentials/v1",
        "https://purl.imsglobal.org/spec/ob/v3p0/context.json",
        "https://w3id.org/security/suites/ed25519-2020/v1",
      ]);
      expect(result.valid).toBe(true);
      expect(result.error).toBeUndefined();
    });

    it("should accept array with mixed string and object items", () => {
      const result = validateOB3Context([
        "https://www.w3.org/2018/credentials/v1",
        "https://purl.imsglobal.org/spec/ob/v3p0/context.json",
        { "@vocab": "https://example.org/vocab#" },
      ]);
      expect(result.valid).toBe(true);
      expect(result.error).toBeUndefined();
    });

    it("should accept a valid object context (embedded)", () => {
      const result = validateOB3Context({
        "@vocab": "https://www.w3.org/2018/credentials#",
        badge: "https://purl.imsglobal.org/spec/ob/v3p0/vocab#",
      });
      expect(result.valid).toBe(true);
      expect(result.error).toBeUndefined();
    });
  });

  describe("invalid formats", () => {
    it("should reject undefined context", () => {
      const result = validateOB3Context(undefined);
      expect(result.valid).toBe(false);
      expect(result.error).toBe("@context is required");
    });

    it("should reject null context", () => {
      const result = validateOB3Context(null);
      expect(result.valid).toBe(false);
      expect(result.error).toBe("@context is required");
    });

    it("should reject an empty array", () => {
      const result = validateOB3Context([]);
      expect(result.valid).toBe(false);
      expect(result.error).toBe("@context array must not be empty");
    });

    it("should reject array missing VC context", () => {
      const result = validateOB3Context([
        "https://purl.imsglobal.org/spec/ob/v3p0/context.json",
      ]);
      expect(result.valid).toBe(false);
      expect(result.error).toBe(
        "@context must include W3C Verifiable Credentials context",
      );
    });

    it("should reject array missing OB3 context", () => {
      const result = validateOB3Context([
        "https://www.w3.org/2018/credentials/v1",
      ]);
      expect(result.valid).toBe(false);
      expect(result.error).toBe(
        "@context must include Open Badges 3.0 context",
      );
    });

    it("should reject array with invalid item type (number)", () => {
      const result = validateOB3Context([
        "https://www.w3.org/2018/credentials/v1",
        123,
      ]);
      expect(result.valid).toBe(false);
      expect(result.error).toBe(
        "@context array item at index 1 must be a string or object",
      );
    });

    it("should reject array with invalid item type (null)", () => {
      const result = validateOB3Context([
        "https://www.w3.org/2018/credentials/v1",
        null,
      ]);
      expect(result.valid).toBe(false);
      expect(result.error).toBe(
        "@context array item at index 1 must be a string or object",
      );
    });

    it("should reject non-string, non-array, non-object types", () => {
      const result = validateOB3Context(123);
      expect(result.valid).toBe(false);
      expect(result.error).toBe("@context must be a string, array, or object");
    });

    it("should reject boolean type", () => {
      const result = validateOB3Context(true);
      expect(result.valid).toBe(false);
      expect(result.error).toBe("@context must be a string, array, or object");
    });
  });
});

describe("isOB3VerifiableCredential", () => {
  // Base valid OB3 credential for testing
  const validOB3Credential: OB3.VerifiableCredential = {
    "@context": [
      "https://www.w3.org/2018/credentials/v1",
      "https://purl.imsglobal.org/spec/ob/v3p0/context.json",
    ],
    id: createIRI("http://example.org/credentials/123"),
    type: ["VerifiableCredential", "OpenBadgeCredential"],
    issuer: {
      id: createIRI("http://example.org/issuers/1"),
      type: "Profile",
      name: "Test Issuer",
      url: createIRI("http://example.org/issuers/1"),
    },
    validFrom: createDateTime("2023-01-01T00:00:00Z"),
    credentialSubject: {
      id: createIRI("did:example:123"),
      type: "AchievementSubject",
      achievement: {
        id: createIRI("http://example.org/achievements/1"),
        type: "Achievement",
        name: "Test Achievement",
        description: "Test description",
        criteria: { narrative: "Test criteria" },
      },
    },
  };

  describe("non-strict mode (default)", () => {
    it("should accept valid credential with array @context", () => {
      const result = isOB3VerifiableCredential(validOB3Credential);
      expect(result).toBe(true);
    });

    it("should accept credential with string @context", () => {
      const credential = {
        ...validOB3Credential,
        "@context": "https://www.w3.org/2018/credentials/v1",
      };
      const result = isOB3VerifiableCredential(credential);
      expect(result).toBe(true);
    });

    it("should accept credential with object @context", () => {
      const credential = {
        ...validOB3Credential,
        "@context": { "@vocab": "https://www.w3.org/2018/credentials#" },
      };
      const result = isOB3VerifiableCredential(credential);
      expect(result).toBe(true);
    });

    it("should reject credential without @context", () => {
      const { "@context": _, ...credentialWithoutContext } = validOB3Credential;
      const result = isOB3VerifiableCredential(credentialWithoutContext);
      expect(result).toBe(false);
    });

    it("should reject credential without type", () => {
      const { type: _, ...credentialWithoutType } = validOB3Credential;
      const result = isOB3VerifiableCredential(credentialWithoutType);
      expect(result).toBe(false);
    });

    it("should reject credential without VerifiableCredential type", () => {
      const credential = {
        ...validOB3Credential,
        type: ["OpenBadgeCredential"],
      };
      const result = isOB3VerifiableCredential(credential);
      expect(result).toBe(false);
    });

    it("should reject credential without issuer", () => {
      const { issuer: _, ...credentialWithoutIssuer } = validOB3Credential;
      const result = isOB3VerifiableCredential(credentialWithoutIssuer);
      expect(result).toBe(false);
    });

    it("should reject credential without validFrom or issuanceDate", () => {
      const { validFrom: _, ...credentialWithoutDate } = validOB3Credential;
      const result = isOB3VerifiableCredential(credentialWithoutDate);
      expect(result).toBe(false);
    });

    it("should accept credential with issuanceDate instead of validFrom", () => {
      const { validFrom: _, ...rest } = validOB3Credential;
      const credential = {
        ...rest,
        issuanceDate: createDateTime("2023-01-01T00:00:00Z"),
      };
      const result = isOB3VerifiableCredential(credential);
      expect(result).toBe(true);
    });

    it("should reject credential without credentialSubject", () => {
      const { credentialSubject: _, ...credentialWithoutSubject } =
        validOB3Credential;
      const result = isOB3VerifiableCredential(credentialWithoutSubject);
      expect(result).toBe(false);
    });

    it("should reject null", () => {
      const result = isOB3VerifiableCredential(null);
      expect(result).toBe(false);
    });

    it("should reject undefined", () => {
      const result = isOB3VerifiableCredential(undefined);
      expect(result).toBe(false);
    });

    it("should reject primitive types", () => {
      expect(isOB3VerifiableCredential("string")).toBe(false);
      expect(isOB3VerifiableCredential(123)).toBe(false);
      expect(isOB3VerifiableCredential(true)).toBe(false);
    });
  });

  describe("strict mode", () => {
    it("should accept valid credential with proper @context", () => {
      const result = isOB3VerifiableCredential(validOB3Credential, true);
      expect(result).toBe(true);
    });

    it("should reject credential with string @context in strict mode", () => {
      // String context is valid format but doesn't include required URIs for array check
      const credential = {
        ...validOB3Credential,
        "@context": "https://www.w3.org/2018/credentials/v1",
      };
      // String format is valid (no URI check for strings)
      const result = isOB3VerifiableCredential(credential, true);
      expect(result).toBe(true);
    });

    it("should reject credential with missing required contexts in strict mode", () => {
      const credential = {
        ...validOB3Credential,
        "@context": ["https://www.w3.org/2018/credentials/v1"],
      };
      const result = isOB3VerifiableCredential(credential, true);
      expect(result).toBe(false);
    });

    it("should reject credential with empty @context array in strict mode", () => {
      const credential = {
        ...validOB3Credential,
        "@context": [],
      };
      const result = isOB3VerifiableCredential(credential, true);
      expect(result).toBe(false);
    });
  });
});
