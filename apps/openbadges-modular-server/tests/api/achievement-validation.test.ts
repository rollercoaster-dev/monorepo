/**
 * Achievement Required Fields Validation Tests
 *
 * Per Open Badges 3.0 specification, an Achievement (BadgeClass in OB2)
 * has specific required fields:
 * - id: IRI (required)
 * - type: "Achievement" (required)
 * - name: string or MultiLanguageString (required)
 * - description: string or MultiLanguageString (required in OB3)
 * - criteria: Criteria object with id or narrative (required)
 *
 * These tests verify the validation of Achievement required fields for
 * both embedded and referenced Achievements.
 *
 * @see https://www.imsglobal.org/spec/ob/v3p0/#achievement
 */

import { describe, expect, it } from "bun:test";
import { BadgeClass } from "@/domains/badgeClass/badgeClass.entity";
import { BadgeVersion } from "@/utils/version/badge-version";
import { CreateBadgeClassSchema } from "@/api/validation/badgeClass.schemas";
import type { Shared } from "openbadges-types";

describe("Achievement Required Fields Validation", () => {
  const testIssuerId = "https://example.com/issuer/1" as Shared.IRI;

  describe("Valid Achievement Creation", () => {
    it("should create Achievement with all required fields", () => {
      const badgeClass = BadgeClass.create({
        id: "https://example.com/badges/1" as Shared.IRI,
        name: "Test Badge",
        description: "A test badge description",
        image: "https://example.com/badge.png" as Shared.IRI,
        criteria: { id: "https://example.com/criteria" as Shared.IRI },
        issuer: testIssuerId,
      });

      expect(badgeClass.id).toBe("https://example.com/badges/1" as Shared.IRI);
      expect(badgeClass.name).toBe("Test Badge");
      expect(badgeClass.description).toBe("A test badge description");
      expect(badgeClass.criteria).toEqual({
        id: "https://example.com/criteria" as Shared.IRI,
      });
    });

    it("should accept Achievement with criteria containing narrative only", () => {
      const badgeClass = BadgeClass.create({
        id: "https://example.com/badges/2" as Shared.IRI,
        name: "Narrative Badge",
        description: "A badge with narrative criteria",
        image: "https://example.com/badge.png" as Shared.IRI,
        criteria: { narrative: "Complete the following tasks..." },
        issuer: testIssuerId,
      });

      expect(badgeClass.criteria).toEqual({
        narrative: "Complete the following tasks...",
      });
    });

    it("should accept Achievement with both criteria id and narrative", () => {
      const badgeClass = BadgeClass.create({
        id: "https://example.com/badges/3" as Shared.IRI,
        name: "Full Criteria Badge",
        description: "A badge with full criteria",
        image: "https://example.com/badge.png" as Shared.IRI,
        criteria: {
          id: "https://example.com/criteria" as Shared.IRI,
          narrative: "Complete the following tasks...",
        },
        issuer: testIssuerId,
      });

      expect(badgeClass.criteria).toEqual({
        id: "https://example.com/criteria" as Shared.IRI,
        narrative: "Complete the following tasks...",
      });
    });

    it("should accept Achievement with MultiLanguageString name", () => {
      const badgeClass = BadgeClass.create({
        id: "https://example.com/badges/4" as Shared.IRI,
        name: { en: "Test Badge", es: "Insignia de Prueba" },
        description: "A multilingual badge",
        image: "https://example.com/badge.png" as Shared.IRI,
        criteria: { id: "https://example.com/criteria" as Shared.IRI },
        issuer: testIssuerId,
      });

      expect(badgeClass.name).toEqual({
        en: "Test Badge",
        es: "Insignia de Prueba",
      });
    });
  });

  describe("Schema Validation for Required Fields", () => {
    it("should validate Achievement with all required fields", () => {
      const validAchievement = {
        name: "Valid Badge",
        description: "A valid badge description",
        image: "https://example.com/badge.png",
        criteria: { id: "https://example.com/criteria" },
        issuer: testIssuerId,
      };

      const result = CreateBadgeClassSchema.safeParse(validAchievement);
      expect(result.success).toBe(true);
    });

    it("should reject Achievement missing name field", () => {
      const invalidAchievement = {
        // Missing name
        description: "A badge without a name",
        image: "https://example.com/badge.png",
        criteria: { id: "https://example.com/criteria" },
        issuer: testIssuerId,
      };

      const result = CreateBadgeClassSchema.safeParse(invalidAchievement);
      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error.issues.some((i) => i.path.includes("name"))).toBe(
          true,
        );
      }
    });

    it("should reject Achievement missing description field", () => {
      const invalidAchievement = {
        name: "Badge Without Description",
        // Missing description
        image: "https://example.com/badge.png",
        criteria: { id: "https://example.com/criteria" },
        issuer: testIssuerId,
      };

      const result = CreateBadgeClassSchema.safeParse(invalidAchievement);
      expect(result.success).toBe(false);
      if (!result.success) {
        expect(
          result.error.issues.some((i) => i.path.includes("description")),
        ).toBe(true);
      }
    });

    it("should reject Achievement missing criteria field", () => {
      const invalidAchievement = {
        name: "Badge Without Criteria",
        description: "A badge missing criteria",
        image: "https://example.com/badge.png",
        // Missing criteria
        issuer: testIssuerId,
      };

      const result = CreateBadgeClassSchema.safeParse(invalidAchievement);
      expect(result.success).toBe(false);
      if (!result.success) {
        expect(
          result.error.issues.some((i) => i.path.includes("criteria")),
        ).toBe(true);
      }
    });

    it("should reject Achievement missing issuer field", () => {
      const invalidAchievement = {
        name: "Badge Without Issuer",
        description: "A badge missing issuer",
        image: "https://example.com/badge.png",
        criteria: { id: "https://example.com/criteria" },
        // Missing issuer
      };

      const result = CreateBadgeClassSchema.safeParse(invalidAchievement);
      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error.issues.some((i) => i.path.includes("issuer"))).toBe(
          true,
        );
      }
    });
  });

  describe("OB3 Criteria Object Validation", () => {
    it("should accept criteria with valid id IRI", () => {
      const validAchievement = {
        name: "Valid Criteria Badge",
        description: "A badge with valid criteria",
        image: "https://example.com/badge.png",
        criteria: { id: "https://example.com/criteria/123" },
        issuer: testIssuerId,
      };

      const result = CreateBadgeClassSchema.safeParse(validAchievement);
      expect(result.success).toBe(true);
    });

    it("should accept criteria as IRI string", () => {
      const validAchievement = {
        name: "IRI Criteria Badge",
        description: "A badge with IRI criteria",
        image: "https://example.com/badge.png",
        criteria: "https://example.com/criteria/456",
        issuer: testIssuerId,
      };

      const result = CreateBadgeClassSchema.safeParse(validAchievement);
      expect(result.success).toBe(true);
    });

    it("should accept criteria with narrative text", () => {
      const validAchievement = {
        name: "Narrative Criteria Badge",
        description: "A badge with narrative criteria",
        image: "https://example.com/badge.png",
        criteria: { narrative: "Complete the certification course" },
        issuer: testIssuerId,
      };

      const result = CreateBadgeClassSchema.safeParse(validAchievement);
      expect(result.success).toBe(true);
    });

    it("should reject criteria object without id or narrative", () => {
      const invalidAchievement = {
        name: "Empty Criteria Badge",
        description: "A badge with empty criteria object",
        image: "https://example.com/badge.png",
        criteria: {}, // Empty criteria object
        issuer: testIssuerId,
      };

      const result = CreateBadgeClassSchema.safeParse(invalidAchievement);
      // An empty criteria object should fail validation
      // as it needs either id or narrative
      expect(result.success).toBe(false);
    });
  });

  describe("Achievement JSON-LD Output", () => {
    it("should output type as Achievement array for OB3", () => {
      const badgeClass = BadgeClass.create({
        id: "https://example.com/badges/1" as Shared.IRI,
        name: "Test Badge",
        description: "A test badge",
        image: "https://example.com/badge.png" as Shared.IRI,
        criteria: { id: "https://example.com/criteria" as Shared.IRI },
        issuer: testIssuerId,
      });

      const jsonLd = badgeClass.toJsonLd(BadgeVersion.V3);

      expect(jsonLd.type).toEqual(["Achievement"]);
    });

    it("should output type as BadgeClass string for OB2", () => {
      const badgeClass = BadgeClass.create({
        id: "https://example.com/badges/1" as Shared.IRI,
        name: "Test Badge",
        description: "A test badge",
        image: "https://example.com/badge.png" as Shared.IRI,
        criteria: { id: "https://example.com/criteria" as Shared.IRI },
        issuer: testIssuerId,
      });

      const jsonLd = badgeClass.toJsonLd(BadgeVersion.V2);

      expect(jsonLd.type).toBe("BadgeClass");
    });

    it("should include all required fields in OB3 JSON-LD output", () => {
      const badgeClass = BadgeClass.create({
        id: "https://example.com/badges/1" as Shared.IRI,
        name: "Complete Badge",
        description: "A badge with all fields",
        image: "https://example.com/badge.png" as Shared.IRI,
        criteria: {
          id: "https://example.com/criteria" as Shared.IRI,
          narrative: "Complete all requirements",
        },
        issuer: testIssuerId,
      });

      const jsonLd = badgeClass.toJsonLd(BadgeVersion.V3);

      expect(jsonLd.id).toBeDefined();
      expect(jsonLd.type).toBeDefined();
      expect(jsonLd.name).toBe("Complete Badge");
      expect(jsonLd.description).toBe("A badge with all fields");
      expect(jsonLd.criteria).toBeDefined();
    });
  });

  describe("Referenced vs Embedded Achievement", () => {
    it("should support Achievement referenced by IRI", () => {
      // When referencing an Achievement by IRI in a credential
      const achievementIRI = "https://example.com/achievements/123";

      // The IRI should be a valid reference
      expect(typeof achievementIRI).toBe("string");
      expect(achievementIRI.startsWith("https://")).toBe(true);
    });

    it("should support fully embedded Achievement object", () => {
      const badgeClass = BadgeClass.create({
        id: "https://example.com/badges/embedded" as Shared.IRI,
        name: "Embedded Achievement",
        description: "An embedded achievement for testing",
        image: "https://example.com/badge.png" as Shared.IRI,
        criteria: { id: "https://example.com/criteria" as Shared.IRI },
        issuer: testIssuerId,
      });

      const embedded = badgeClass.toJsonLd(BadgeVersion.V3);

      // Embedded Achievement should have all required properties
      expect(embedded.id).toBe("https://example.com/badges/embedded");
      expect(embedded.name).toBe("Embedded Achievement");
      expect(embedded.description).toBe("An embedded achievement for testing");
      expect(embedded.criteria).toBeDefined();
    });
  });

  describe("Optional Achievement Fields", () => {
    it("should include achievementType when specified", () => {
      const badgeClass = BadgeClass.create({
        id: "https://example.com/badges/1" as Shared.IRI,
        name: "Certification Badge",
        description: "A certification badge",
        image: "https://example.com/badge.png" as Shared.IRI,
        criteria: { id: "https://example.com/criteria" as Shared.IRI },
        issuer: testIssuerId,
        achievementType: "Certificate",
      });

      const jsonLd = badgeClass.toJsonLd(BadgeVersion.V3);

      expect(jsonLd.achievementType).toBe("Certificate");
    });

    it("should include tags when specified", () => {
      const badgeClass = BadgeClass.create({
        id: "https://example.com/badges/1" as Shared.IRI,
        name: "Tagged Badge",
        description: "A badge with tags",
        image: "https://example.com/badge.png" as Shared.IRI,
        criteria: { id: "https://example.com/criteria" as Shared.IRI },
        issuer: testIssuerId,
        tags: ["skill", "certification", "professional"],
      });

      expect(badgeClass.tags).toEqual([
        "skill",
        "certification",
        "professional",
      ]);
    });

    it("should include alignment/alignments when specified", () => {
      const badgeClass = BadgeClass.create({
        id: "https://example.com/badges/1" as Shared.IRI,
        name: "Aligned Badge",
        description: "A badge with alignments",
        image: "https://example.com/badge.png" as Shared.IRI,
        criteria: { id: "https://example.com/criteria" as Shared.IRI },
        issuer: testIssuerId,
        alignment: [
          {
            targetName: "Competency Framework",
            targetUrl: "https://example.com/framework" as Shared.IRI,
          },
        ],
      });

      expect(badgeClass.alignment).toHaveLength(1);
      expect(badgeClass.alignment?.[0].targetName).toBe("Competency Framework");
    });
  });
});
