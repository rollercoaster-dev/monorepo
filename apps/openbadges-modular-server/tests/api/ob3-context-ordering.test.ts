/**
 * OB3 Context Array Ordering Tests
 *
 * Per Open Badges 3.0 specification (built on VC Data Model 2.0), the @context
 * array MUST have the W3C Verifiable Credentials context first, followed by
 * the Open Badges context.
 *
 * Valid ordering:
 * 1. https://www.w3.org/ns/credentials/v2 (VC 2.0 context) - MUST be first
 * 2. https://purl.imsglobal.org/spec/ob/v3p0/context-3.0.3.json (OB3 context)
 *
 * @see https://www.imsglobal.org/spec/ob/v3p0
 * @see https://www.w3.org/TR/vc-data-model-2.0/
 */

import { describe, expect, it } from "bun:test";
import { Assertion } from "@/domains/assertion/assertion.entity";
import { BadgeClass } from "@/domains/badgeClass/badgeClass.entity";
import { Issuer } from "@/domains/issuer/issuer.entity";
import { BadgeVersion } from "@/utils/version/badge-version";
import { VC_V2_CONTEXT_URL, OBV3_CONTEXT_URL } from "@/constants/urls";
import type { Shared } from "openbadges-types";

describe("OB3 Context Array Ordering", () => {
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
      description: "A test badge for context ordering tests",
      image: "https://example.com/badge.png" as Shared.IRI,
      criteria: { id: "https://example.com/criteria" as Shared.IRI },
      issuer: testIssuerId,
    });

  const createTestAssertion = () =>
    Assertion.create({
      id: "https://example.com/assertions/1" as Shared.IRI,
      badgeClass: testBadgeClassId,
      recipient: {
        type: "email",
        identity: "test@example.com",
        hashed: false,
      },
      issuedOn: new Date().toISOString(),
      issuer: testIssuerId,
    });

  describe("Assertion @context ordering", () => {
    it("should have VC context as first element in @context array", () => {
      const assertion = createTestAssertion();
      const issuer = createTestIssuer();
      const badgeClass = createTestBadgeClass();

      const jsonLd = assertion.toJsonLd(BadgeVersion.V3, badgeClass, issuer);
      const context = jsonLd["@context"];

      expect(Array.isArray(context)).toBe(true);
      expect((context as string[])[0]).toBe(VC_V2_CONTEXT_URL);
    });

    it("should have OB3 context following VC context", () => {
      const assertion = createTestAssertion();
      const issuer = createTestIssuer();
      const badgeClass = createTestBadgeClass();

      const jsonLd = assertion.toJsonLd(BadgeVersion.V3, badgeClass, issuer);
      const context = jsonLd["@context"] as string[];

      expect(Array.isArray(context)).toBe(true);
      expect(context.length).toBeGreaterThanOrEqual(2);

      // VC context must be first
      expect(context[0]).toBe(VC_V2_CONTEXT_URL);

      // OB3 context should be present (position may vary if additional contexts added)
      expect(context).toContain(OBV3_CONTEXT_URL);
    });

    it("should not have @context as a single string for OB3 credentials", () => {
      const assertion = createTestAssertion();
      const issuer = createTestIssuer();
      const badgeClass = createTestBadgeClass();

      const jsonLd = assertion.toJsonLd(BadgeVersion.V3, badgeClass, issuer);
      const context = jsonLd["@context"];

      // OB3 requires array format, not single string
      expect(Array.isArray(context)).toBe(true);
      expect(typeof context).not.toBe("string");
    });

    it("should include both required contexts for OB3 compliance", () => {
      const assertion = createTestAssertion();
      const issuer = createTestIssuer();
      const badgeClass = createTestBadgeClass();

      const jsonLd = assertion.toJsonLd(BadgeVersion.V3, badgeClass, issuer);
      const context = jsonLd["@context"] as string[];

      expect(context).toContain(VC_V2_CONTEXT_URL);
      expect(context).toContain(OBV3_CONTEXT_URL);
    });
  });

  describe("Assertion toObject @context ordering", () => {
    it("should have correct @context ordering in toObject output", () => {
      const assertion = createTestAssertion();

      const obj = assertion.toObject(BadgeVersion.V3);
      const context = obj["@context"] as string[];

      expect(Array.isArray(context)).toBe(true);
      expect(context[0]).toBe(VC_V2_CONTEXT_URL);
      expect(context).toContain(OBV3_CONTEXT_URL);
    });
  });

  describe("BadgeClass @context ordering", () => {
    it("should have VC context in BadgeClass JSON-LD output", () => {
      const badgeClass = createTestBadgeClass();

      const jsonLd = badgeClass.toJsonLd(BadgeVersion.V3);
      const context = jsonLd["@context"] as string[];

      expect(Array.isArray(context)).toBe(true);
      expect(context).toContain(VC_V2_CONTEXT_URL);
      expect(context).toContain(OBV3_CONTEXT_URL);
    });
  });

  describe("Edge cases", () => {
    it("should handle assertion without issuer entity (fallback context)", () => {
      const assertion = createTestAssertion();

      // toJsonLd without issuer parameter
      const jsonLd = assertion.toJsonLd(BadgeVersion.V3);
      const context = jsonLd["@context"] as string[];

      expect(Array.isArray(context)).toBe(true);
      expect(context[0]).toBe(VC_V2_CONTEXT_URL);
    });

    it("should maintain context ordering when additional contexts are added", () => {
      const assertion = createTestAssertion();
      const issuer = createTestIssuer();
      const badgeClass = createTestBadgeClass();

      const jsonLd = assertion.toJsonLd(BadgeVersion.V3, badgeClass, issuer);
      const context = jsonLd["@context"] as string[];

      // Regardless of additional contexts, VC context must be first
      expect(context[0]).toBe(VC_V2_CONTEXT_URL);

      // All required contexts must be present
      const requiredContexts = [VC_V2_CONTEXT_URL, OBV3_CONTEXT_URL];
      for (const required of requiredContexts) {
        expect(context).toContain(required);
      }
    });
  });
});
