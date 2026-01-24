/**
 * Enhanced Schema Validation Tests
 *
 * Tests for the new entity-level validators and detailed error reporting.
 */
import {
  validateOB2BadgeClass,
  validateOB2BadgeClassDetailed,
  validateOB2Profile,
  validateOB2ProfileDetailed,
  validateOB3Achievement,
  validateOB3AchievementDetailed,
  validateOB3Issuer,
  validateOB3IssuerDetailed,
  validateBadgeWithSchema,
} from "../src/validateWithSchema";
import { Shared } from "../src";

// ============================================================================
// OB2 BadgeClass Tests
// ============================================================================

describe("OB2 BadgeClass Validation", () => {
  const validBadgeClass = {
    "@context": "https://w3id.org/openbadges/v2",
    id: Shared.createIRI("https://example.org/badges/1"),
    type: "BadgeClass",
    name: "Test Badge",
    description: "A test badge for validation",
    criteria: {
      narrative: "Complete the test requirements",
    },
    issuer: {
      id: Shared.createIRI("https://example.org/issuer"),
      type: "Profile",
      name: "Test Issuer",
    },
  };

  test("valid BadgeClass passes validation", () => {
    const result = validateOB2BadgeClass(validBadgeClass);
    expect(result.valid).toBe(true);
    expect(result.errors).toBeUndefined();
  });

  test("valid BadgeClass passes detailed validation", () => {
    const result = validateOB2BadgeClassDetailed(validBadgeClass);
    expect(result.valid).toBe(true);
    expect(result.errorCount).toBe(0);
    expect(result.openBadgesVersion).toBe("2.0");
  });

  test("missing name fails validation", () => {
    const invalid = { ...validBadgeClass };
    delete (invalid as Record<string, unknown>).name;
    const result = validateOB2BadgeClass(invalid);
    expect(result.valid).toBe(false);
    expect(result.errors?.some((e) => e.message.includes("name"))).toBe(true);
  });

  test("missing description fails validation", () => {
    const invalid = { ...validBadgeClass };
    delete (invalid as Record<string, unknown>).description;
    const result = validateOB2BadgeClass(invalid);
    expect(result.valid).toBe(false);
  });

  test("missing criteria fails validation", () => {
    const invalid = { ...validBadgeClass };
    delete (invalid as Record<string, unknown>).criteria;
    const result = validateOB2BadgeClass(invalid);
    expect(result.valid).toBe(false);
  });

  test("missing issuer fails validation", () => {
    const invalid = { ...validBadgeClass };
    delete (invalid as Record<string, unknown>).issuer;
    const result = validateOB2BadgeClass(invalid);
    expect(result.valid).toBe(false);
  });

  test("detailed validation provides error path", () => {
    const invalid = { ...validBadgeClass };
    delete (invalid as Record<string, unknown>).name;
    const result = validateOB2BadgeClassDetailed(invalid);
    expect(result.valid).toBe(false);
    expect(result.messages.some((m) => m.result.includes("name"))).toBe(true);
  });

  test("non-object input fails validation", () => {
    const result = validateOB2BadgeClass("not an object");
    expect(result.valid).toBe(false);
    expect(result.errors?.[0].message).toBe("Data must be an object");
  });

  test("null input fails validation", () => {
    const result = validateOB2BadgeClass(null);
    expect(result.valid).toBe(false);
  });
});

// ============================================================================
// OB2 Profile Tests
// ============================================================================

describe("OB2 Profile Validation", () => {
  const validProfile = {
    "@context": "https://w3id.org/openbadges/v2",
    id: Shared.createIRI("https://example.org/issuer"),
    type: "Profile",
    name: "Test Issuer",
    url: Shared.createIRI("https://example.org"),
    email: "contact@example.org",
  };

  test("valid Profile passes validation", () => {
    const result = validateOB2Profile(validProfile);
    expect(result.valid).toBe(true);
  });

  test("valid Profile passes detailed validation", () => {
    const result = validateOB2ProfileDetailed(validProfile);
    expect(result.valid).toBe(true);
    expect(result.openBadgesVersion).toBe("2.0");
  });

  test("missing id fails validation", () => {
    const invalid = { ...validProfile };
    delete (invalid as Record<string, unknown>).id;
    const result = validateOB2Profile(invalid);
    expect(result.valid).toBe(false);
  });

  test("missing name fails validation", () => {
    const invalid = { ...validProfile };
    delete (invalid as Record<string, unknown>).name;
    const result = validateOB2Profile(invalid);
    expect(result.valid).toBe(false);
  });

  test("invalid id format fails validation", () => {
    const invalid = { ...validProfile, id: "not-a-uri" };
    const result = validateOB2Profile(invalid);
    expect(result.valid).toBe(false);
    expect(result.errors?.some((e) => e.keyword === "format")).toBe(true);
  });

  test("Issuer type variant passes validation", () => {
    const issuer = { ...validProfile, type: "Issuer" };
    const result = validateOB2Profile(issuer);
    expect(result.valid).toBe(true);
  });

  test("array type with Profile passes validation", () => {
    const profile = { ...validProfile, type: ["Profile", "Organization"] };
    const result = validateOB2Profile(profile);
    expect(result.valid).toBe(true);
  });
});

// ============================================================================
// OB3 Achievement Tests
// ============================================================================

describe("OB3 Achievement Validation", () => {
  const validAchievement = {
    "@context": "https://purl.imsglobal.org/spec/ob/v3p0/context.json",
    id: Shared.createIRI("https://example.org/achievements/1"),
    type: ["Achievement"],
    name: "Test Achievement",
    description: "A test achievement for validation",
    criteria: {
      narrative: "Complete the test requirements",
    },
  };

  test("valid Achievement passes validation", () => {
    const result = validateOB3Achievement(validAchievement);
    expect(result.valid).toBe(true);
  });

  test("valid Achievement passes detailed validation", () => {
    const result = validateOB3AchievementDetailed(validAchievement);
    expect(result.valid).toBe(true);
    expect(result.openBadgesVersion).toBe("3.0");
  });

  test("missing name fails validation", () => {
    const invalid = { ...validAchievement };
    delete (invalid as Record<string, unknown>).name;
    const result = validateOB3Achievement(invalid);
    expect(result.valid).toBe(false);
  });

  test("missing criteria fails validation", () => {
    const invalid = { ...validAchievement };
    delete (invalid as Record<string, unknown>).criteria;
    const result = validateOB3Achievement(invalid);
    expect(result.valid).toBe(false);
  });

  test("achievement with alignment passes validation", () => {
    const withAlignment = {
      ...validAchievement,
      alignment: [
        {
          type: "Alignment",
          targetName: "Test Standard",
          targetUrl: "https://example.org/standards/1",
        },
      ],
    };
    const result = validateOB3Achievement(withAlignment);
    expect(result.valid).toBe(true);
  });

  test("achievement with multi-language name passes validation", () => {
    const multiLang = {
      ...validAchievement,
      name: {
        en: "Test Achievement",
        es: "Logro de Prueba",
      },
    };
    const result = validateOB3Achievement(multiLang);
    expect(result.valid).toBe(true);
  });

  test("achievement with creditsAvailable passes validation", () => {
    const withCredits = {
      ...validAchievement,
      creditsAvailable: 3.5,
    };
    const result = validateOB3Achievement(withCredits);
    expect(result.valid).toBe(true);
  });

  test("detailed validation shows error count", () => {
    const invalid = { type: ["Achievement"] }; // Missing required fields
    const result = validateOB3AchievementDetailed(invalid);
    expect(result.valid).toBe(false);
    expect(result.errorCount).toBeGreaterThan(0);
  });
});

// ============================================================================
// OB3 Issuer Tests
// ============================================================================

describe("OB3 Issuer Validation", () => {
  const validIssuer = {
    "@context": "https://purl.imsglobal.org/spec/ob/v3p0/context.json",
    id: Shared.createIRI("https://example.org/issuers/1"),
    type: ["Profile"],
    name: "Test Issuer",
    url: Shared.createIRI("https://example.org"),
    email: "contact@example.org",
  };

  test("valid Issuer passes validation", () => {
    const result = validateOB3Issuer(validIssuer);
    expect(result.valid).toBe(true);
  });

  test("valid Issuer passes detailed validation", () => {
    const result = validateOB3IssuerDetailed(validIssuer);
    expect(result.valid).toBe(true);
    expect(result.openBadgesVersion).toBe("3.0");
  });

  test("missing id fails validation", () => {
    const invalid = { ...validIssuer };
    delete (invalid as Record<string, unknown>).id;
    const result = validateOB3Issuer(invalid);
    expect(result.valid).toBe(false);
  });

  test("missing name fails validation", () => {
    const invalid = { ...validIssuer };
    delete (invalid as Record<string, unknown>).name;
    const result = validateOB3Issuer(invalid);
    expect(result.valid).toBe(false);
  });

  test("issuer with address passes validation", () => {
    const withAddress = {
      ...validIssuer,
      address: {
        type: "Address",
        addressCountry: "US",
        addressLocality: "New York",
      },
    };
    const result = validateOB3Issuer(withAddress);
    expect(result.valid).toBe(true);
  });

  test("issuer with multi-language name passes validation", () => {
    const multiLang = {
      ...validIssuer,
      name: {
        en: "Test Issuer",
        fr: "Émetteur de Test",
      },
    };
    const result = validateOB3Issuer(multiLang);
    expect(result.valid).toBe(true);
  });

  test("issuer with parentOrg reference passes validation", () => {
    const withParent = {
      ...validIssuer,
      parentOrg: "https://example.org/parent",
    };
    const result = validateOB3Issuer(withParent);
    expect(result.valid).toBe(true);
  });
});

// ============================================================================
// Auto-Detection Tests
// ============================================================================

describe("Badge Version Auto-Detection", () => {
  test("detects OB2 Assertion by type", () => {
    const ob2Badge = {
      "@context": "https://w3id.org/openbadges/v2",
      id: "https://example.org/assertions/1",
      type: "Assertion",
      recipient: { type: "email", identity: "test@example.org" },
      badge: "https://example.org/badges/1",
      verification: { type: "hosted" },
      issuedOn: "2024-01-01T00:00:00Z",
    };
    const result = validateBadgeWithSchema(ob2Badge);
    expect(result.openBadgesVersion).toBe("2.0");
  });

  test("detects OB3 VerifiableCredential by type", () => {
    const ob3Badge = {
      "@context": [
        "https://www.w3.org/2018/credentials/v1",
        "https://purl.imsglobal.org/spec/ob/v3p0/context.json",
      ],
      id: "https://example.org/credentials/1",
      type: ["VerifiableCredential", "OpenBadgeCredential"],
      issuer: {
        id: "https://example.org/issuers/1",
        type: ["Profile"],
        name: "Test Issuer",
      },
      validFrom: "2024-01-01T00:00:00Z",
      credentialSubject: {
        id: "did:example:123",
        achievement: {
          id: "https://example.org/achievements/1",
          type: ["Achievement"],
          name: "Test",
          criteria: { narrative: "Do something" },
        },
      },
    };
    const result = validateBadgeWithSchema(ob3Badge);
    expect(result.openBadgesVersion).toBe("3.0");
  });

  test("detects OB3 by context when type is OpenBadgeCredential", () => {
    // The implementation detects OB3 by OpenBadgeCredential type
    // or by the openbadges.org/spec/ob/v3p0 context pattern
    const ob3Badge = {
      "@context": ["https://purl.imsglobal.org/spec/ob/v3p0/context.json"],
      id: "https://example.org/credentials/1",
      type: ["OpenBadgeCredential"],
      issuer: "https://example.org/issuers/1",
      validFrom: "2024-01-01T00:00:00Z",
    };
    const result = validateBadgeWithSchema(ob3Badge);
    expect(result.openBadgesVersion).toBe("3.0");
  });

  test("non-object returns error", () => {
    const result = validateBadgeWithSchema("not an object");
    expect(result.valid).toBe(false);
    expect(result.messages[0].result).toBe("Badge must be an object");
  });
});

// ============================================================================
// Error Message Quality Tests
// ============================================================================

describe("Error Message Quality", () => {
  test("missing required property has clear message", () => {
    const invalid = {
      "@context": "https://w3id.org/openbadges/v2",
      id: "https://example.org/badges/1",
      type: "BadgeClass",
      description: "Test",
      criteria: { narrative: "Test" },
      issuer: {
        id: "https://example.org/issuer",
        type: "Profile",
        name: "Test",
      },
    }; // Missing name
    const result = validateOB2BadgeClassDetailed(invalid);
    expect(result.valid).toBe(false);
    const nameError = result.messages.find((m) => m.result.includes("name"));
    expect(nameError).toBeDefined();
    expect(nameError?.messageLevel).toBe("ERROR");
  });

  test("format error includes expected format", () => {
    const invalid = {
      "@context": "https://w3id.org/openbadges/v2",
      id: "not-a-uri",
      type: "Profile",
      name: "Test",
    };
    const result = validateOB2ProfileDetailed(invalid);
    expect(result.valid).toBe(false);
    const formatError = result.messages.find(
      (m) => m.name === "VALIDATE_FORMAT",
    );
    expect(formatError).toBeDefined();
    expect(formatError?.result).toContain("uri");
  });

  test("nested error includes path", () => {
    const invalid = {
      "@context": "https://w3id.org/openbadges/v2",
      id: "https://example.org/badges/1",
      type: "BadgeClass",
      name: "Test",
      description: "Test",
      criteria: { narrative: "Test" },
      issuer: {
        type: "Profile",
        name: "Test",
        // Missing id
      },
    };
    const result = validateOB2BadgeClassDetailed(invalid);
    expect(result.valid).toBe(false);
    const issuerError = result.messages.find(
      (m) => m.node_path && m.node_path.includes("issuer"),
    );
    expect(issuerError).toBeDefined();
  });
});
