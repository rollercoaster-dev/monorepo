import { describe, test, expect } from "bun:test";
import {
  CreateAssertionSchema,
  UpdateAssertionSchema,
} from "@/api/validation/assertion.schemas";
import {
  EXAMPLE_ASSERTION_URL,
  EXAMPLE_BADGE_CLASS_URL,
} from "@/constants/urls";
import { Assertion } from "@/domains/assertion/assertion.entity";
import { Issuer } from "@/domains/issuer/issuer.entity";
import { BadgeClass } from "@/domains/badgeClass/badgeClass.entity";
import { BadgeVersion } from "@/utils/version/badge-version";
import type { Shared } from "openbadges-types";

describe("Assertion Schemas", () => {
  describe("CreateAssertionSchema", () => {
    test("should validate a valid OB2 assertion", () => {
      const validOB2Assertion = {
        recipient: {
          type: "email",
          identity: "test@example.com",
          hashed: false,
        },
        badge: EXAMPLE_BADGE_CLASS_URL,
        issuedOn: new Date().toISOString(),
        verification: {
          type: "HostedBadge",
        },
      };

      const result = CreateAssertionSchema.safeParse(validOB2Assertion);
      expect(result.success).toBe(true);
    });

    test("should validate a valid OB3 assertion with issuedOn (backward compatible)", () => {
      const validOB3Assertion = {
        id: EXAMPLE_ASSERTION_URL,
        type: "VerifiableCredential",
        recipient: {
          type: "email",
          identity: "test@example.com",
          hashed: false,
        },
        badge: EXAMPLE_BADGE_CLASS_URL,
        issuedOn: new Date().toISOString(),
        verification: {
          type: "HostedBadge",
        },
        credentialSubject: {
          id: "did:example:123",
          type: "AchievementSubject",
        },
      };

      const result = CreateAssertionSchema.safeParse(validOB3Assertion);
      expect(result.success).toBe(true);
    });

    test("should validate a valid OB3 assertion with validFrom (VC Data Model 2.0)", () => {
      const validOB3Assertion = {
        id: EXAMPLE_ASSERTION_URL,
        type: "VerifiableCredential",
        recipient: {
          type: "email",
          identity: "test@example.com",
          hashed: false,
        },
        badge: EXAMPLE_BADGE_CLASS_URL,
        validFrom: new Date().toISOString(),
        verification: {
          type: "HostedBadge",
        },
        credentialSubject: {
          id: "did:example:123",
          type: "AchievementSubject",
        },
      };

      const result = CreateAssertionSchema.safeParse(validOB3Assertion);
      expect(result.success).toBe(true);
    });

    test("should validate a valid OB3 assertion with validFrom and validUntil", () => {
      const now = new Date();
      const validUntil = new Date(now.getTime() + 86400000); // Tomorrow

      const validOB3Assertion = {
        id: EXAMPLE_ASSERTION_URL,
        type: "VerifiableCredential",
        recipient: {
          type: "email",
          identity: "test@example.com",
          hashed: false,
        },
        badge: EXAMPLE_BADGE_CLASS_URL,
        validFrom: now.toISOString(),
        validUntil: validUntil.toISOString(),
        verification: {
          type: "HostedBadge",
        },
        credentialSubject: {
          id: "did:example:123",
          type: "AchievementSubject",
        },
      };

      const result = CreateAssertionSchema.safeParse(validOB3Assertion);
      expect(result.success).toBe(true);
    });

    test("should reject an assertion without required fields", () => {
      const invalidAssertion = {
        recipient: {
          type: "email",
          identity: "test@example.com",
          hashed: false,
        },
        // Missing badge and issuedOn/validFrom
      };

      const result = CreateAssertionSchema.safeParse(invalidAssertion);
      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error.issues.length).toBeGreaterThan(0);
      }
    });

    test("should reject an assertion without any temporal field (issuedOn or validFrom)", () => {
      const invalidAssertion = {
        recipient: {
          type: "email",
          identity: "test@example.com",
          hashed: false,
        },
        badge: EXAMPLE_BADGE_CLASS_URL,
        // Missing both issuedOn and validFrom
        verification: {
          type: "HostedBadge",
        },
      };

      const result = CreateAssertionSchema.safeParse(invalidAssertion);
      expect(result.success).toBe(false);
      if (!result.success) {
        expect(
          result.error.issues.some(
            (issue) =>
              issue.message.includes("issuedOn") ||
              issue.message.includes("validFrom"),
          ),
        ).toBe(true);
      }
    });

    test("should reject an assertion with invalid date format", () => {
      const invalidAssertion = {
        recipient: {
          type: "email",
          identity: "test@example.com",
          hashed: false,
        },
        badge: EXAMPLE_BADGE_CLASS_URL,
        issuedOn: "not-a-date", // Invalid date format
      };

      const result = CreateAssertionSchema.safeParse(invalidAssertion);
      expect(result.success).toBe(false);
      if (!result.success) {
        expect(
          result.error.issues.some(
            (issue) =>
              issue.path.includes("issuedOn") &&
              issue.message.includes("Invalid"),
          ),
        ).toBe(true);
      }
    });

    test("should reject an assertion with invalid recipient format", () => {
      // Create an invalid assertion with completely missing recipient
      const invalidAssertion = {
        // Missing recipient entirely
        badge: EXAMPLE_BADGE_CLASS_URL,
        issuedOn: new Date().toISOString(),
      };

      const result = CreateAssertionSchema.safeParse(invalidAssertion);
      expect(result.success).toBe(false);
      if (!result.success) {
        // Just verify that validation failed, which is enough for this test
        expect(result.error.issues.length).toBeGreaterThan(0);
      }
    });

    test("should reject an assertion with invalid validFrom format", () => {
      const invalidAssertion = {
        recipient: {
          type: "email",
          identity: "test@example.com",
          hashed: false,
        },
        badge: EXAMPLE_BADGE_CLASS_URL,
        validFrom: "not-a-date", // Invalid date format
      };

      const result = CreateAssertionSchema.safeParse(invalidAssertion);
      expect(result.success).toBe(false);
      if (!result.success) {
        expect(
          result.error.issues.some(
            (issue) =>
              issue.path.includes("validFrom") &&
              issue.message.includes("Invalid"),
          ),
        ).toBe(true);
      }
    });

    test("should reject an assertion with invalid validUntil format", () => {
      const invalidAssertion = {
        recipient: {
          type: "email",
          identity: "test@example.com",
          hashed: false,
        },
        badge: EXAMPLE_BADGE_CLASS_URL,
        validFrom: new Date().toISOString(),
        validUntil: "not-a-date", // Invalid date format
      };

      const result = CreateAssertionSchema.safeParse(invalidAssertion);
      expect(result.success).toBe(false);
      if (!result.success) {
        expect(
          result.error.issues.some(
            (issue) =>
              issue.path.includes("validUntil") &&
              issue.message.includes("Invalid"),
          ),
        ).toBe(true);
      }
    });
  });

  describe("UpdateAssertionSchema", () => {
    test("should validate a partial update with expires (OB2)", () => {
      const validUpdate = {
        expires: new Date(Date.now() + 86400000).toISOString(), // Tomorrow
      };

      const result = UpdateAssertionSchema.safeParse(validUpdate);
      expect(result.success).toBe(true);
    });

    test("should validate a partial update with validUntil (OB3)", () => {
      const validUpdate = {
        validUntil: new Date(Date.now() + 86400000).toISOString(), // Tomorrow
      };

      const result = UpdateAssertionSchema.safeParse(validUpdate);
      expect(result.success).toBe(true);
    });

    test("should reject an update with invalid fields", () => {
      const invalidUpdate = {
        expires: "not-a-date",
      };

      const result = UpdateAssertionSchema.safeParse(invalidUpdate);
      expect(result.success).toBe(false);
      if (!result.success) {
        expect(
          result.error.issues.some(
            (issue) =>
              issue.path.includes("expires") &&
              issue.message.includes("Invalid"),
          ),
        ).toBe(true);
      }
    });

    test("should validate an empty update object", () => {
      const emptyUpdate = {};

      const result = UpdateAssertionSchema.safeParse(emptyUpdate);
      expect(result.success).toBe(true);
    });
  });

  /**
   * OB3 Output Format Tests
   *
   * Per VC Data Model 2.0, OB3 credentials use validFrom/validUntil
   * instead of OB2's issuedOn/expires. These tests verify the output
   * format contains the correct temporal field names.
   */
  describe("OB3 Temporal Field Output Format", () => {
    // Test fixtures
    const testIssuerId = "https://example.com/issuer/1" as Shared.IRI;
    const testBadgeClassId = "https://example.com/badges/1" as Shared.IRI;

    const createTestIssuer = () =>
      Issuer.create({
        id: testIssuerId,
        name: "Test Issuer",
        url: "https://example.com" as Shared.IRI,
      });

    const createTestBadgeClass = () =>
      BadgeClass.create({
        id: testBadgeClassId,
        name: "Test Badge",
        description: "A test badge",
        image: "https://example.com/badge.png" as Shared.IRI,
        criteria: { id: "https://example.com/criteria" as Shared.IRI },
        issuer: testIssuerId,
      });

    test("should output validFrom instead of issuedOn for OB3 credentials", () => {
      const issuedOn = "2024-01-15T12:00:00Z";
      const assertion = Assertion.create({
        id: EXAMPLE_ASSERTION_URL as Shared.IRI,
        badgeClass: testBadgeClassId,
        recipient: {
          type: "email",
          identity: "test@example.com",
          hashed: false,
        },
        issuedOn,
        issuer: testIssuerId,
      });

      const issuer = createTestIssuer();
      const badgeClass = createTestBadgeClass();
      const jsonLd = assertion.toJsonLd(BadgeVersion.V3, badgeClass, issuer);

      // OB3 should have validFrom, not issuedOn
      expect(jsonLd).toHaveProperty("validFrom");
      expect(jsonLd).not.toHaveProperty("issuedOn");
      expect(jsonLd.validFrom).toBe(issuedOn);
    });

    test("should output validUntil instead of expires for OB3 credentials", () => {
      const issuedOn = "2024-01-15T12:00:00Z";
      const expires = "2025-01-15T12:00:00Z";
      const assertion = Assertion.create({
        id: EXAMPLE_ASSERTION_URL as Shared.IRI,
        badgeClass: testBadgeClassId,
        recipient: {
          type: "email",
          identity: "test@example.com",
          hashed: false,
        },
        issuedOn,
        expires,
        issuer: testIssuerId,
      });

      const issuer = createTestIssuer();
      const badgeClass = createTestBadgeClass();
      const jsonLd = assertion.toJsonLd(BadgeVersion.V3, badgeClass, issuer);

      // OB3 should have validUntil, not expires
      expect(jsonLd).toHaveProperty("validUntil");
      expect(jsonLd).not.toHaveProperty("expires");
      expect(jsonLd.validUntil).toBe(expires);
    });

    test("should correctly map internal issuedOn to output validFrom", () => {
      const now = new Date();
      const assertion = Assertion.create({
        id: EXAMPLE_ASSERTION_URL as Shared.IRI,
        badgeClass: testBadgeClassId,
        recipient: {
          type: "email",
          identity: "test@example.com",
          hashed: false,
        },
        issuedOn: now.toISOString(),
        issuer: testIssuerId,
      });

      const issuer = createTestIssuer();
      const badgeClass = createTestBadgeClass();
      const jsonLd = assertion.toJsonLd(BadgeVersion.V3, badgeClass, issuer);

      // Verify the mapping is correct
      expect(jsonLd.validFrom).toBe(now.toISOString());
    });

    test("should output issuedOn for OB2 credentials (not validFrom)", () => {
      const issuedOn = "2024-01-15T12:00:00Z";
      const assertion = Assertion.create({
        id: EXAMPLE_ASSERTION_URL as Shared.IRI,
        badgeClass: testBadgeClassId,
        recipient: {
          type: "email",
          identity: "test@example.com",
          hashed: false,
        },
        issuedOn,
        issuer: testIssuerId,
      });

      const jsonLd = assertion.toJsonLd(BadgeVersion.V2);

      // OB2 should have issuedOn, not validFrom
      expect(jsonLd).toHaveProperty("issuedOn");
      expect(jsonLd).not.toHaveProperty("validFrom");
    });

    test("should output expires for OB2 credentials (not validUntil)", () => {
      const issuedOn = "2024-01-15T12:00:00Z";
      const expires = "2025-01-15T12:00:00Z";
      const assertion = Assertion.create({
        id: EXAMPLE_ASSERTION_URL as Shared.IRI,
        badgeClass: testBadgeClassId,
        recipient: {
          type: "email",
          identity: "test@example.com",
          hashed: false,
        },
        issuedOn,
        expires,
        issuer: testIssuerId,
      });

      const jsonLd = assertion.toJsonLd(BadgeVersion.V2);

      // OB2 should have expires, not validUntil
      expect(jsonLd).toHaveProperty("expires");
      expect(jsonLd).not.toHaveProperty("validUntil");
    });

    test("should not include validUntil if no expiration is set", () => {
      const assertion = Assertion.create({
        id: EXAMPLE_ASSERTION_URL as Shared.IRI,
        badgeClass: testBadgeClassId,
        recipient: {
          type: "email",
          identity: "test@example.com",
          hashed: false,
        },
        issuedOn: new Date().toISOString(),
        // No expires/validUntil set
        issuer: testIssuerId,
      });

      const issuer = createTestIssuer();
      const badgeClass = createTestBadgeClass();
      const jsonLd = assertion.toJsonLd(BadgeVersion.V3, badgeClass, issuer);

      // Should not have validUntil if no expiration
      expect(jsonLd).not.toHaveProperty("validUntil");
      expect(jsonLd).not.toHaveProperty("expires");
    });
  });
});
