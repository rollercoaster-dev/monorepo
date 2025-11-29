import { OB2 } from "../src";
import {
  validOB2Assertion,
  invalidOB2Assertion,
  validOB2BadgeClass,
  invalidOB2BadgeClass,
  validOB2Profile,
  invalidOB2Profile,
  validOB2IdentityObject,
  invalidOB2IdentityObject,
  validOB2VerificationObject,
  invalidOB2VerificationObject,
} from "./helpers";

describe("OB2 Type Guards", () => {
  describe("isAssertion", () => {
    test("should correctly identify valid OB2 Assertions", () => {
      expect(OB2.isAssertion(validOB2Assertion)).toBe(true);
    });
    test("should reject invalid OB2 Assertions", () => {
      expect(OB2.isAssertion(invalidOB2Assertion)).toBe(false);
    });

    test("should reject null and empty objects", () => {
      expect(OB2.isAssertion(null)).toBe(false);
      expect(OB2.isAssertion({})).toBe(false);
    });

    test("should reject objects with wrong type", () => {
      expect(
        OB2.isAssertion({
          "@context": "https://w3id.org/openbadges/v2",
          type: "BadgeClass", // Wrong type
        }),
      ).toBe(false);
    });

    test("should reject objects missing required properties", () => {
      expect(
        OB2.isAssertion({
          "@context": "https://w3id.org/openbadges/v2",
          type: "Assertion",
          // Missing required properties
        }),
      ).toBe(false);
    });
  });

  describe("isBadgeClass", () => {
    test("should correctly identify valid OB2 BadgeClass objects", () => {
      expect(OB2.isBadgeClass(validOB2BadgeClass)).toBe(true);
    });
    test("should reject invalid OB2 BadgeClass objects", () => {
      expect(OB2.isBadgeClass(invalidOB2BadgeClass)).toBe(false);
    });

    test("should reject null, empty objects, and objects with wrong type", () => {
      expect(OB2.isBadgeClass(null)).toBe(false);
      expect(OB2.isBadgeClass({})).toBe(false);
      expect(
        OB2.isBadgeClass({
          "@context": "https://w3id.org/openbadges/v2",
          type: "Assertion", // Wrong type
        }),
      ).toBe(false);
    });
  });

  describe("isProfile", () => {
    test("should correctly identify valid OB2 Profile objects", () => {
      expect(OB2.isProfile(validOB2Profile)).toBe(true);
    });
    test("should reject invalid OB2 Profile objects", () => {
      expect(OB2.isProfile(invalidOB2Profile)).toBe(false);
    });

    test("should reject null, empty objects, and objects with wrong type", () => {
      expect(OB2.isProfile(null)).toBe(false);
      expect(OB2.isProfile({})).toBe(false);
      expect(
        OB2.isProfile({
          "@context": "https://w3id.org/openbadges/v2",
          type: "BadgeClass", // Wrong type
        }),
      ).toBe(false);
    });
  });

  describe("isIdentityObject", () => {
    test("should correctly identify valid OB2 IdentityObject objects", () => {
      expect(OB2.isIdentityObject(validOB2IdentityObject)).toBe(true);
    });
    test("should reject invalid OB2 IdentityObject objects", () => {
      expect(OB2.isIdentityObject(invalidOB2IdentityObject)).toBe(false);
    });

    test("should reject null, empty objects, and objects missing required properties", () => {
      expect(OB2.isIdentityObject(null)).toBe(false);
      expect(OB2.isIdentityObject({})).toBe(false);
      expect(
        OB2.isIdentityObject({
          type: "email",
          // Missing identity property
        }),
      ).toBe(false);
    });
  });

  describe("isVerificationObject", () => {
    test("should correctly identify valid OB2 VerificationObject objects", () => {
      expect(OB2.isVerificationObject(validOB2VerificationObject)).toBe(true);
    });
    test("should reject invalid OB2 VerificationObject objects", () => {
      expect(OB2.isVerificationObject(invalidOB2VerificationObject)).toBe(
        false,
      );
    });

    test("should reject null, empty objects, and objects missing required properties", () => {
      expect(OB2.isVerificationObject(null)).toBe(false);
      expect(OB2.isVerificationObject({})).toBe(false);
      expect(
        OB2.isVerificationObject({
          // Missing type property
        }),
      ).toBe(false);
    });
  });

  describe("isEvidence", () => {
    // OB2 Evidence has NO required properties per spec
    // See: https://www.imsglobal.org/sites/default/files/Badges/OBv2p0Final/index.html#Evidence
    test("should accept empty objects (OB2 Evidence has no required properties)", () => {
      expect(OB2.isEvidence({})).toBe(true);
    });

    test("should reject null and undefined", () => {
      expect(OB2.isEvidence(null)).toBe(false);
      expect(OB2.isEvidence(undefined)).toBe(false);
    });

    test("should accept objects with id property", () => {
      expect(OB2.isEvidence({ id: "https://example.com/evidence/1" })).toBe(
        true,
      );
    });

    test("should accept objects with narrative property", () => {
      expect(
        OB2.isEvidence({ narrative: "Completed the project successfully" }),
      ).toBe(true);
    });

    test("should accept objects with both id and narrative", () => {
      expect(
        OB2.isEvidence({
          id: "https://example.com/evidence/1",
          narrative: "Completed the project successfully",
        }),
      ).toBe(true);
    });
  });

  describe("isImage", () => {
    test("should reject empty objects", () => {
      expect(OB2.isImage({})).toBe(false);
    });

    test("should reject null and undefined", () => {
      expect(OB2.isImage(null)).toBe(false);
      expect(OB2.isImage(undefined)).toBe(false);
    });

    test("should accept objects with string id property", () => {
      expect(OB2.isImage({ id: "https://example.com/image.png" })).toBe(true);
    });

    test("should reject objects with non-string id property", () => {
      expect(OB2.isImage({ id: 123 })).toBe(false);
      expect(OB2.isImage({ id: null })).toBe(false);
    });

    test("should accept full Image objects", () => {
      expect(
        OB2.isImage({
          id: "https://example.com/image.png",
          type: "Image",
          caption: "A badge image",
        }),
      ).toBe(true);
    });
  });

  describe("isCriteria", () => {
    // OB2 Criteria has NO required properties per spec
    // See: https://www.imsglobal.org/sites/default/files/Badges/OBv2p0Final/index.html#Criteria
    test("should accept empty objects (OB2 Criteria has no required properties)", () => {
      expect(OB2.isCriteria({})).toBe(true);
    });

    test("should reject null and undefined", () => {
      expect(OB2.isCriteria(null)).toBe(false);
      expect(OB2.isCriteria(undefined)).toBe(false);
    });

    test("should accept objects with id property", () => {
      expect(OB2.isCriteria({ id: "https://example.com/criteria" })).toBe(true);
    });

    test("should accept objects with narrative property", () => {
      expect(
        OB2.isCriteria({ narrative: "Must complete all assignments" }),
      ).toBe(true);
    });

    test("should accept objects with both id and narrative", () => {
      expect(
        OB2.isCriteria({
          id: "https://example.com/criteria",
          narrative: "Must complete all assignments",
        }),
      ).toBe(true);
    });
  });
});
