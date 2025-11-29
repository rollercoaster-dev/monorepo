import { BadgeNormalizer } from "../src";
import { createOB2Assertion, createOB3VerifiableCredential } from "./helpers";

describe("Badge Normalizer", () => {
  // Test data
  const ob2Badge = createOB2Assertion();
  const ob3Badge = createOB3VerifiableCredential();

  describe("normalizeBadge", () => {
    test("should normalize an OB2 Assertion", () => {
      const normalized = BadgeNormalizer.normalizeBadge(ob2Badge);

      expect(normalized.id).toBe(ob2Badge.id);
      expect(normalized.type).toBe("OB2");
      expect(normalized.name).toBe("3-D Printmaster");
      expect(normalized.description).toBe(
        "This badge is awarded for passing the 3-D printing knowledge and safety test.",
      );
      expect(normalized.imageUrl).toBe("https://example.org/badges/5/image");
      expect(normalized.issuerName).toBe("Example Maker Society");
      expect(normalized.issuanceDate).toBe("2016-12-31T23:59:59+00:00");
      expect(normalized.rawBadge).toBe(ob2Badge);
    });

    test("should normalize an OB3 VerifiableCredential", () => {
      const normalized = BadgeNormalizer.normalizeBadge(ob3Badge);

      expect(normalized.id).toBe(ob3Badge.id);
      expect(normalized.type).toBe("OB3");
      expect(normalized.name).toBe("3-D Printmaster");
      expect(normalized.description).toBe(
        "This badge is awarded for passing the 3-D printing knowledge and safety test.",
      );
      expect(normalized.issuerName).toBe("Example Maker Society");
      expect(normalized.issuanceDate).toBe("2023-06-15T12:00:00Z");
      expect(normalized.rawBadge).toBe(ob3Badge);
    });

    test("should throw an error for invalid badges", () => {
      expect(() => {
        BadgeNormalizer.normalizeBadge({});
      }).toThrow("Invalid badge format");

      expect(() => {
        BadgeNormalizer.normalizeBadge(null);
      }).toThrow("Invalid badge format");
    });
  });

  describe("normalizeBadges", () => {
    test("should normalize an array of badges", () => {
      const badges = [ob2Badge, ob3Badge, {}];
      const normalized = BadgeNormalizer.normalizeBadges(badges);

      expect(normalized.length).toBe(2); // The invalid badge should be skipped
      expect(normalized[0].type).toBe("OB2");
      expect(normalized[1].type).toBe("OB3");
    });
  });

  describe("sortBadges", () => {
    test("should sort badges by name in ascending order", () => {
      const badges = [
        { ...BadgeNormalizer.normalizeBadge(ob2Badge), name: "Z Badge" },
        { ...BadgeNormalizer.normalizeBadge(ob3Badge), name: "A Badge" },
      ];

      const sorted = BadgeNormalizer.sortBadges(badges, "name");

      expect(sorted[0].name).toBe("A Badge");
      expect(sorted[1].name).toBe("Z Badge");
    });

    test("should sort badges by name in descending order", () => {
      const badges = [
        { ...BadgeNormalizer.normalizeBadge(ob2Badge), name: "A Badge" },
        { ...BadgeNormalizer.normalizeBadge(ob3Badge), name: "Z Badge" },
      ];

      const sorted = BadgeNormalizer.sortBadges(badges, "name", "desc");

      expect(sorted[0].name).toBe("Z Badge");
      expect(sorted[1].name).toBe("A Badge");
    });
  });

  describe("filterBadgesBySearchTerm", () => {
    test("should filter badges by search term", () => {
      const badges = [
        {
          ...BadgeNormalizer.normalizeBadge(ob2Badge),
          name: "Test Badge 1",
          description: null,
        },
        {
          ...BadgeNormalizer.normalizeBadge(ob3Badge),
          name: "Another Badge",
          description: "This is a test description",
        },
      ];

      const filtered = BadgeNormalizer.filterBadgesBySearchTerm(badges, "test");

      // Both badges should match: one by name, one by description
      expect(filtered.length).toBe(2);
      expect(filtered.some((badge) => badge.name === "Test Badge 1")).toBe(
        true,
      );
      expect(filtered.some((badge) => badge.name === "Another Badge")).toBe(
        true,
      );

      // Filter by a more specific term
      const filteredSpecific = BadgeNormalizer.filterBadgesBySearchTerm(
        badges,
        "Test Badge",
      );
      expect(filteredSpecific.length).toBe(1);
      expect(filteredSpecific[0].name).toBe("Test Badge 1");
    });
  });

  describe("filterBadgesByType", () => {
    test("should filter badges by type", () => {
      const badges = [
        BadgeNormalizer.normalizeBadge(ob2Badge),
        BadgeNormalizer.normalizeBadge(ob3Badge),
      ];

      const filteredOB2 = BadgeNormalizer.filterBadgesByType(badges, "OB2");
      expect(filteredOB2.length).toBe(1);
      expect(filteredOB2[0].type).toBe("OB2");

      const filteredOB3 = BadgeNormalizer.filterBadgesByType(badges, "OB3");
      expect(filteredOB3.length).toBe(1);
      expect(filteredOB3[0].type).toBe("OB3");

      const filteredAll = BadgeNormalizer.filterBadgesByType(badges, "all");
      expect(filteredAll.length).toBe(2);
    });
  });

  describe("groupBadges", () => {
    test("should group badges by type", () => {
      const badges = [
        BadgeNormalizer.normalizeBadge(ob2Badge),
        BadgeNormalizer.normalizeBadge(ob3Badge),
        BadgeNormalizer.normalizeBadge(ob2Badge),
      ];

      const grouped = BadgeNormalizer.groupBadges(badges, "type");

      expect(Object.keys(grouped).length).toBe(2);
      expect(grouped["OB2"].length).toBe(2);
      expect(grouped["OB3"].length).toBe(1);
    });
  });
});
