import { validateBadge } from "../src";

describe("OB3 Nested Object Validation", () => {
  // Test data - a complete OB3 badge with nested objects
  const completeOB3Badge = {
    "@context": [
      "https://www.w3.org/2018/credentials/v1",
      "https://purl.imsglobal.org/spec/ob/v3p0/context.json",
    ],
    id: "https://example.org/credentials/3732",
    type: ["VerifiableCredential", "OpenBadgeCredential"],
    issuer: {
      "@context": "https://purl.imsglobal.org/spec/ob/v3p0/context.json",
      id: "https://example.org/issuers/123",
      type: "Profile",
      name: "Example Maker Society",
      url: "https://example.org",
      email: "contact@example.org",
    },
    validFrom: "2023-06-15T12:00:00Z",
    credentialSubject: {
      id: "did:example:ebfeb1f712ebc6f1c276e12ec21",
      achievement: {
        "@context": "https://purl.imsglobal.org/spec/ob/v3p0/context.json",
        id: "https://example.org/achievements/1",
        type: "Achievement",
        name: "3-D Printmaster",
        description:
          "This badge is awarded for passing the 3-D printing knowledge and safety test.",
        criteria: {
          narrative:
            "Students are tested on knowledge and safety, both through a paper test and a supervised performance evaluation on key skills.",
        },
      },
    },
  };

  // Test data - an OB3 badge with nested objects missing @context
  const nestedOB3Badge = {
    "@context": [
      "https://www.w3.org/2018/credentials/v1",
      "https://purl.imsglobal.org/spec/ob/v3p0/context.json",
    ],
    id: "https://example.org/credentials/3732",
    type: ["VerifiableCredential", "OpenBadgeCredential"],
    issuer: {
      // No @context property
      id: "https://example.org/issuers/123",
      type: "Profile",
      name: "Example Maker Society",
      url: "https://example.org",
      email: "contact@example.org",
    },
    validFrom: "2023-06-15T12:00:00Z",
    credentialSubject: {
      id: "did:example:ebfeb1f712ebc6f1c276e12ec21",
      achievement: {
        // No @context property
        id: "https://example.org/achievements/1",
        type: "Achievement",
        name: "3-D Printmaster",
        description:
          "This badge is awarded for passing the 3-D printing knowledge and safety test.",
        criteria: {
          narrative:
            "Students are tested on knowledge and safety, both through a paper test and a supervised performance evaluation on key skills.",
        },
      },
    },
  };

  // Test data - an OB3 badge with array types
  const arrayTypesOB3Badge = {
    "@context": [
      "https://www.w3.org/2018/credentials/v1",
      "https://purl.imsglobal.org/spec/ob/v3p0/context.json",
    ],
    id: "https://example.org/credentials/3732",
    type: ["VerifiableCredential", "OpenBadgeCredential"],
    issuer: {
      id: "https://example.org/issuers/123",
      type: ["Profile"],
      name: "Example Maker Society",
      url: "https://example.org",
      email: "contact@example.org",
    },
    validFrom: "2023-06-15T12:00:00Z",
    credentialSubject: {
      id: "did:example:ebfeb1f712ebc6f1c276e12ec21",
      achievement: {
        id: "https://example.org/achievements/1",
        type: ["Achievement"],
        name: "3-D Printmaster",
        description:
          "This badge is awarded for passing the 3-D printing knowledge and safety test.",
        criteria: {
          narrative:
            "Students are tested on knowledge and safety, both through a paper test and a supervised performance evaluation on key skills.",
        },
      },
    },
  };

  // Test data - an OB3 badge with invalid array types
  const invalidArrayTypesOB3Badge = {
    "@context": [
      "https://www.w3.org/2018/credentials/v1",
      "https://purl.imsglobal.org/spec/ob/v3p0/context.json",
    ],
    id: "https://example.org/credentials/3732",
    type: ["VerifiableCredential"],
    issuer: {
      id: "https://example.org/issuers/123",
      type: [123, 456], // Invalid array contents (numbers instead of strings)
      name: "Example Maker Society",
      url: "https://example.org",
      email: "contact@example.org",
    },
    validFrom: "2023-06-15T12:00:00Z",
    credentialSubject: {
      id: "did:example:ebfeb1f712ebc6f1c276e12ec21",
      achievement: {
        id: "https://example.org/achievements/1",
        type: { key: "value" }, // Invalid type (object instead of string or array)
        name: "3-D Printmaster",
        description:
          "This badge is awarded for passing the 3-D printing knowledge and safety test.",
        criteria: {
          narrative:
            "Students are tested on knowledge and safety, both through a paper test and a supervised performance evaluation on key skills.",
        },
      },
    },
  };

  describe("Validation Behavior", () => {
    test("should validate a complete OB3 badge with @context in nested objects", () => {
      const result = validateBadge(completeOB3Badge);
      expect(result.isValid).toBe(true);
      expect(result.errors).toHaveLength(0);
    });

    test("should validate OB3 badge with nested objects missing @context", () => {
      const result = validateBadge(nestedOB3Badge);

      // With our fix, validation should pass
      expect(result.isValid).toBe(true);
      expect(result.errors).toHaveLength(0);
    });

    test("should validate OB3 badge with array types", () => {
      const result = validateBadge(arrayTypesOB3Badge);

      // With our fix, validation should pass
      expect(result.isValid).toBe(true);
      expect(result.errors).toHaveLength(0);
    });

    test("should reject OB3 badge with invalid array types", () => {
      const result = validateBadge(invalidArrayTypesOB3Badge);

      // Should fail validation due to invalid types
      expect(result.isValid).toBe(false);
      expect(result.errors.length).toBeGreaterThan(0);
    });
  });
});
