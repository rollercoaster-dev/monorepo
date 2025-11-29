import { CompositeGuards } from "../src";
import { createOB2Assertion, createOB3VerifiableCredential } from "./helpers";

describe("Composite Type Guards", () => {
  // Test data
  const ob2Badge = createOB2Assertion();
  const ob3Badge = createOB3VerifiableCredential();

  describe("isBadge", () => {
    test("should correctly identify valid badges", () => {
      expect(CompositeGuards.isBadge(ob2Badge)).toBe(true);
      expect(CompositeGuards.isBadge(ob3Badge)).toBe(true);

      // Invalid badges
      expect(CompositeGuards.isBadge(null)).toBe(false);
      expect(CompositeGuards.isBadge({})).toBe(false);
      expect(CompositeGuards.isBadge({ type: "NotABadge" })).toBe(false);
    });
  });

  describe("getBadgeClass", () => {
    test("should extract BadgeClass from OB2 Assertion", () => {
      const badgeClass = CompositeGuards.getBadgeClass(ob2Badge);
      expect(badgeClass).toBeTruthy();
      expect(badgeClass?.name).toBe("3-D Printmaster");
    });

    test("should return null for OB3 VerifiableCredential", () => {
      const badgeClass = CompositeGuards.getBadgeClass(ob3Badge);
      expect(badgeClass).toBeNull();
    });
  });

  describe("getAchievement", () => {
    test("should extract Achievement from OB3 VerifiableCredential", () => {
      const achievement = CompositeGuards.getAchievement(ob3Badge);
      expect(achievement).toBeTruthy();
      expect(achievement?.name).toBe("3-D Printmaster");
    });

    test("should return null for OB2 Assertion", () => {
      const achievement = CompositeGuards.getAchievement(ob2Badge);
      expect(achievement).toBeNull();
    });
  });

  describe("getBadgeName", () => {
    test("should get name from OB2 Assertion", () => {
      const name = CompositeGuards.getBadgeName(ob2Badge);
      expect(name).toBe("3-D Printmaster");
    });

    test("should get name from OB3 VerifiableCredential", () => {
      const name = CompositeGuards.getBadgeName(ob3Badge);
      expect(name).toBe("3-D Printmaster");
    });
  });

  describe("getBadgeDescription", () => {
    test("should get description from OB2 Assertion", () => {
      const description = CompositeGuards.getBadgeDescription(ob2Badge);
      expect(description).toBe(
        "This badge is awarded for passing the 3-D printing knowledge and safety test.",
      );
    });

    test("should get description from OB3 VerifiableCredential", () => {
      const description = CompositeGuards.getBadgeDescription(ob3Badge);
      expect(description).toBe(
        "This badge is awarded for passing the 3-D printing knowledge and safety test.",
      );
    });
  });

  describe("getBadgeImageUrl", () => {
    test("should get image URL from OB2 Assertion", () => {
      const imageUrl = CompositeGuards.getBadgeImageUrl(ob2Badge);
      expect(imageUrl).toBe("https://example.org/badges/5/image");
    });
  });

  describe("getBadgeIssuer", () => {
    test("should get issuer from OB2 Assertion", () => {
      const issuer = CompositeGuards.getBadgeIssuer(ob2Badge);
      expect(issuer).toBeTruthy();
      expect(issuer?.name).toBe("Example Maker Society");
    });

    test("should get issuer from OB3 VerifiableCredential", () => {
      const issuer = CompositeGuards.getBadgeIssuer(ob3Badge);
      expect(issuer).toBeTruthy();
      expect(issuer?.name).toBe("Example Maker Society");
    });
  });

  describe("getBadgeIssuerName", () => {
    test("should get issuer name from OB2 Assertion", () => {
      const issuerName = CompositeGuards.getBadgeIssuerName(ob2Badge);
      expect(issuerName).toBe("Example Maker Society");
    });

    test("should get issuer name from OB3 VerifiableCredential", () => {
      const issuerName = CompositeGuards.getBadgeIssuerName(ob3Badge);
      expect(issuerName).toBe("Example Maker Society");
    });
  });

  describe("getBadgeIssuanceDate", () => {
    test("should get issuance date from OB2 Assertion", () => {
      const issuanceDate = CompositeGuards.getBadgeIssuanceDate(ob2Badge);
      expect(issuanceDate).toBe("2016-12-31T23:59:59+00:00");
    });

    test("should get issuance date from OB3 VerifiableCredential", () => {
      const issuanceDate = CompositeGuards.getBadgeIssuanceDate(ob3Badge);
      expect(issuanceDate).toBe("2023-06-15T12:00:00Z");
    });
  });

  describe("getBadgeVersion", () => {
    test("should get version from OB2 Assertion", () => {
      const version = CompositeGuards.getBadgeVersion(ob2Badge);
      expect(version).toBe("2.0");
    });

    test("should get version from OB3 VerifiableCredential", () => {
      const version = CompositeGuards.getBadgeVersion(ob3Badge);
      expect(version).toBe("3.0");
    });
  });
});
