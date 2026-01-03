/**
 * SVG Baking Service Tests
 *
 * Tests the SVG baking (embedding) and unbaking (extracting) functionality
 * for Open Badges credentials.
 */

import { describe, expect, test } from "bun:test";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import type { OB2, OB3 } from "openbadges-types";
import {
  bakeSVG,
  unbakeSVG,
} from "../../../../src/services/baking/svg/svg-baking.service.js";

// Load the test SVG fixture
const TEST_SVG_PATH = join(import.meta.dir, "../../../fixtures/test-badge.svg");
const TEST_SVG = readFileSync(TEST_SVG_PATH, "utf-8");

// Mock OB2 Assertion
const mockOB2Assertion = {
  "@context": "https://w3id.org/openbadges/v2",
  type: "Assertion",
  id: "https://example.org/assertions/123",
  recipient: {
    type: "email",
    identity: "test@example.org",
    hashed: false,
  },
  badge: "https://example.org/badges/testing-badge",
  verification: {
    type: "hosted",
  },
  issuedOn: "2024-01-01T00:00:00Z",
} as OB2.Assertion;

// Mock OB3 VerifiableCredential
const mockOB3Credential = {
  "@context": [
    "https://www.w3.org/ns/credentials/v2",
    "https://purl.imsglobal.org/spec/ob/v3p0/context-3.0.3.json",
  ],
  type: ["VerifiableCredential", "OpenBadgeCredential"],
  id: "https://example.org/credentials/456",
  issuer: {
    id: "https://example.org",
    type: "Profile",
    name: "Example Organization",
  },
  issuanceDate: "2024-01-01T00:00:00Z",
  credentialSubject: {
    id: "did:example:123",
    type: "AchievementSubject",
    achievement: {
      id: "https://example.org/achievements/testing",
      type: "Achievement",
      name: "Testing Achievement",
      description: "An achievement for testing",
      criteria: {
        narrative: "Complete the test",
      },
    },
  },
} as unknown as OB3.VerifiableCredential;

describe("SVG Baking Service", () => {
  describe("bakeSVG", () => {
    test("should embed OB2 credential in SVG", () => {
      const bakedSVG = bakeSVG(TEST_SVG, mockOB2Assertion);

      // Should contain the Open Badges namespace
      expect(bakedSVG).toContain(
        'xmlns:openbadges="https://purl.imsglobal.org/spec/ob/v3p0"',
      );

      // Should contain the credential element
      expect(bakedSVG).toContain("<openbadges:credential>");
      expect(bakedSVG).toContain("</openbadges:credential>");

      // Should contain the credential data
      expect(bakedSVG).toContain(mockOB2Assertion.id);
      expect(bakedSVG).toContain(mockOB2Assertion.recipient.identity);
    });

    test("should embed OB3 credential in SVG", () => {
      const bakedSVG = bakeSVG(TEST_SVG, mockOB3Credential);

      // Should contain the Open Badges namespace
      expect(bakedSVG).toContain(
        'xmlns:openbadges="https://purl.imsglobal.org/spec/ob/v3p0"',
      );

      // Should contain the credential element
      expect(bakedSVG).toContain("<openbadges:credential>");
      expect(bakedSVG).toContain("</openbadges:credential>");

      // Should contain the credential data
      expect(bakedSVG).toContain(mockOB3Credential.id);
      if (typeof mockOB3Credential.issuer !== "string") {
        expect(bakedSVG).toContain(mockOB3Credential.issuer.id);
      }
    });

    test("should preserve original SVG content", () => {
      const bakedSVG = bakeSVG(TEST_SVG, mockOB2Assertion);

      // Should still contain original SVG elements
      expect(bakedSVG).toContain("<circle");
      expect(bakedSVG).toContain("<text");
      expect(bakedSVG).toContain("BADGE");
    });

    test("should throw error for invalid SVG", () => {
      const invalidSVG = "This is not valid SVG";

      expect(() => bakeSVG(invalidSVG, mockOB2Assertion)).toThrow(
        "Invalid SVG content",
      );
    });
  });

  describe("unbakeSVG", () => {
    test("should extract OB2 credential from baked SVG", () => {
      // First bake the SVG
      const bakedSVG = bakeSVG(TEST_SVG, mockOB2Assertion);

      // Then unbake it
      const extractedCredential = unbakeSVG(bakedSVG);

      // Should extract the credential
      expect(extractedCredential).not.toBeNull();
      expect(extractedCredential).toMatchObject(mockOB2Assertion);
    });

    test("should extract OB3 credential from baked SVG", () => {
      // First bake the SVG
      const bakedSVG = bakeSVG(TEST_SVG, mockOB3Credential);

      // Then unbake it
      const extractedCredential = unbakeSVG(bakedSVG);

      // Should extract the credential
      expect(extractedCredential).not.toBeNull();
      expect(extractedCredential).toMatchObject(mockOB3Credential);
    });

    test("should return null for SVG without credential", () => {
      const extractedCredential = unbakeSVG(TEST_SVG);

      expect(extractedCredential).toBeNull();
    });

    test("should throw error for invalid credential JSON", () => {
      // Create an SVG with malformed JSON in credential element
      const malformedSVG = `
        <svg xmlns="http://www.w3.org/2000/svg" xmlns:openbadges="https://purl.imsglobal.org/spec/ob/v3p0">
          <openbadges:credential>{ invalid json }</openbadges:credential>
        </svg>
      `;

      expect(() => unbakeSVG(malformedSVG)).toThrow("Invalid credential JSON");
    });

    test("should throw error for invalid SVG", () => {
      const invalidSVG = "This is not valid SVG";

      expect(() => unbakeSVG(invalidSVG)).toThrow("Invalid SVG content");
    });
  });

  describe("Round-trip (bake + unbake)", () => {
    test("should preserve OB2 credential through round-trip", () => {
      const bakedSVG = bakeSVG(TEST_SVG, mockOB2Assertion);
      const extractedCredential = unbakeSVG(bakedSVG);

      expect(extractedCredential).toMatchObject(mockOB2Assertion);
    });

    test("should preserve OB3 credential through round-trip", () => {
      const bakedSVG = bakeSVG(TEST_SVG, mockOB3Credential);
      const extractedCredential = unbakeSVG(bakedSVG);

      expect(extractedCredential).toMatchObject(mockOB3Credential);
    });
  });
});
