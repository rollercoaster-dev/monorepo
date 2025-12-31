/**
 * Unit tests for badge-serializer @context ordering
 *
 * Per VC Data Model 2.0 spec, the @context array MUST have the VC 2.0
 * context URL as the first item.
 *
 * @see https://www.w3.org/TR/vc-data-model-2.0/#contexts
 */

import { describe, expect, it } from "bun:test";
import {
  OpenBadges3Serializer,
  OpenBadges2Serializer,
} from "@/utils/version/badge-serializer";
import { VC_V2_CONTEXT_URL, OBV3_CONTEXT_URL } from "@/constants/urls";
import type { Shared } from "openbadges-types";
import type {
  IssuerData,
  BadgeClassData,
  AssertionData,
} from "@/utils/types/badge-data.types";

describe("OpenBadges3Serializer @context ordering", () => {
  const mockIssuer: IssuerData = {
    id: "https://example.edu/issuer/1" as Shared.IRI,
    name: "Example University",
    url: "https://example.edu" as Shared.IRI,
    email: "badges@example.edu",
  };

  const mockBadgeClass: BadgeClassData = {
    id: "https://example.edu/badges/123" as Shared.IRI,
    name: "Web Development Fundamentals",
    description: "Demonstrates competency in web development basics",
    image: "https://example.edu/badges/123/image.png" as Shared.IRI,
    criteria: {
      narrative: "Complete the web development course with 80% or higher",
    },
    issuer: mockIssuer.id as Shared.IRI,
  };

  const mockAssertion: AssertionData = {
    id: "https://example.edu/assertions/456" as Shared.IRI,
    badgeClass: mockBadgeClass.id as Shared.IRI,
    recipient: {
      type: "email",
      identity: "student@example.edu",
      hashed: false,
    },
    issuedOn: "2024-01-15T10:00:00Z",
    expires: "2025-01-15T10:00:00Z",
  };

  const serializer = new OpenBadges3Serializer();

  describe("VerifiableCredential @context", () => {
    it("should have VC 2.0 context as first item in @context array", () => {
      const result = serializer.serializeAssertion(
        mockAssertion,
        mockBadgeClass,
        mockIssuer,
      );

      expect(Array.isArray(result["@context"])).toBe(true);
      const context = result["@context"] as string[];
      expect(context[0]).toBe(VC_V2_CONTEXT_URL);
    });

    it("should have OB3 context as second item in @context array", () => {
      const result = serializer.serializeAssertion(
        mockAssertion,
        mockBadgeClass,
        mockIssuer,
      );

      const context = result["@context"] as string[];
      expect(context[1]).toBe(OBV3_CONTEXT_URL);
    });

    it("should have exactly two context URLs", () => {
      const result = serializer.serializeAssertion(
        mockAssertion,
        mockBadgeClass,
        mockIssuer,
      );

      const context = result["@context"] as string[];
      expect(context.length).toBe(2);
    });
  });

  describe("Issuer @context", () => {
    it("should have VC 2.0 context in issuer serialization", () => {
      const result = serializer.serializeIssuer(mockIssuer);

      expect(Array.isArray(result["@context"])).toBe(true);
      const context = result["@context"] as string[];
      expect(context).toContain(VC_V2_CONTEXT_URL);
    });
  });

  describe("BadgeClass/Achievement @context", () => {
    it("should have VC 2.0 context in badge class serialization", () => {
      const result = serializer.serializeBadgeClass(mockBadgeClass);

      expect(Array.isArray(result["@context"])).toBe(true);
      const context = result["@context"] as string[];
      expect(context).toContain(VC_V2_CONTEXT_URL);
    });
  });

  describe("Assertion without full VC (no issuer/badgeClass)", () => {
    it("should have VC 2.0 context in basic assertion serialization", () => {
      const result = serializer.serializeAssertion(mockAssertion);

      expect(Array.isArray(result["@context"])).toBe(true);
      const context = result["@context"] as string[];
      expect(context).toContain(VC_V2_CONTEXT_URL);
    });
  });
});

describe("OpenBadges2Serializer @context", () => {
  const serializer = new OpenBadges2Serializer();

  const mockIssuer: IssuerData = {
    id: "https://example.edu/issuer/1" as Shared.IRI,
    name: "Example University",
    url: "https://example.edu" as Shared.IRI,
  };

  it("should use OB2 context for v2 serialization (not VC 2.0)", () => {
    const result = serializer.serializeIssuer(mockIssuer);

    // OB2 uses a single string context, not VC 2.0
    expect(result["@context"]).toBe("https://w3id.org/openbadges/v2");
  });
});
