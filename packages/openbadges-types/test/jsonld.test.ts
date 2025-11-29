import { Shared } from "../src";
import { createOB2Assertion, createOB3VerifiableCredential } from "./helpers";

describe("JSON-LD Type Guards", () => {
  describe("isJsonLdObject", () => {
    test("should correctly identify valid JSON-LD objects", () => {
      // Valid JSON-LD objects
      expect(
        Shared.isJsonLdObject({
          "@context": "https://w3id.org/openbadges/v2",
          type: "Assertion",
        }),
      ).toBe(true);

      expect(
        Shared.isJsonLdObject({
          "@context": ["https://www.w3.org/2018/credentials/v1"],
          type: ["VerifiableCredential"],
        }),
      ).toBe(true);

      expect(
        Shared.isJsonLdObject({
          "@context": { "@vocab": "https://example.org/" },
          type: "Example",
        }),
      ).toBe(true);

      // Invalid JSON-LD objects
      expect(Shared.isJsonLdObject(null)).toBe(false);
      expect(Shared.isJsonLdObject(undefined)).toBe(false);
      expect(Shared.isJsonLdObject("string")).toBe(false);
      expect(Shared.isJsonLdObject(123)).toBe(false);
      expect(Shared.isJsonLdObject({})).toBe(false);
      expect(
        Shared.isJsonLdObject({ "@context": "https://example.org/" }),
      ).toBe(false);
      expect(Shared.isJsonLdObject({ type: "Example" })).toBe(false);
    });
  });

  describe("isJsonLdArray", () => {
    test("should correctly identify valid JSON-LD arrays", () => {
      // Valid JSON-LD arrays
      expect(Shared.isJsonLdArray("single item")).toBe(true);
      expect(Shared.isJsonLdArray(["item1", "item2"])).toBe(true);

      // With item guard
      const isString = (value: unknown): value is string =>
        typeof value === "string";
      expect(Shared.isJsonLdArray("string", isString)).toBe(true);
      expect(Shared.isJsonLdArray(["string1", "string2"], isString)).toBe(true);
      expect(Shared.isJsonLdArray([123], isString)).toBe(false);
      expect(Shared.isJsonLdArray(123, isString)).toBe(false);
    });
  });

  describe("hasJsonLdType", () => {
    test("should correctly check for specific JSON-LD types", () => {
      // Valid types
      expect(
        Shared.hasJsonLdType(
          {
            "@context": "https://w3id.org/openbadges/v2",
            type: "Assertion",
          },
          "Assertion",
        ),
      ).toBe(true);

      expect(
        Shared.hasJsonLdType(
          {
            "@context": "https://w3id.org/openbadges/v2",
            type: ["Assertion", "Extension"],
          },
          "Assertion",
        ),
      ).toBe(true);

      // Invalid types
      expect(
        Shared.hasJsonLdType(
          {
            "@context": "https://w3id.org/openbadges/v2",
            type: "BadgeClass",
          },
          "Assertion",
        ),
      ).toBe(false);

      expect(Shared.hasJsonLdType(null, "Assertion")).toBe(false);
      expect(Shared.hasJsonLdType(undefined, "Assertion")).toBe(false);
      expect(Shared.hasJsonLdType("string", "Assertion")).toBe(false);
    });
  });

  describe("hasJsonLdContext", () => {
    test("should correctly check for specific JSON-LD contexts", () => {
      // Valid contexts
      expect(
        Shared.hasJsonLdContext(
          {
            "@context": Shared.OB2Context,
            type: "Assertion",
          },
          Shared.OB2Context,
        ),
      ).toBe(true);

      expect(
        Shared.hasJsonLdContext(
          {
            "@context": [Shared.VCContext, Shared.OB3Context],
            type: ["VerifiableCredential"],
          },
          Shared.VCContext,
        ),
      ).toBe(true);

      // Invalid contexts
      expect(
        Shared.hasJsonLdContext(
          {
            "@context": Shared.OB2Context,
            type: "Assertion",
          },
          Shared.OB3Context,
        ),
      ).toBe(false);

      expect(Shared.hasJsonLdContext(null, Shared.OB2Context)).toBe(false);
      expect(Shared.hasJsonLdContext(undefined, Shared.OB2Context)).toBe(false);
      expect(Shared.hasJsonLdContext("string", Shared.OB2Context)).toBe(false);
    });
  });

  describe("typeIncludes", () => {
    test("should handle string type values", () => {
      expect(Shared.typeIncludes("Assertion", "Assertion")).toBe(true);
      expect(Shared.typeIncludes("Assertion", "BadgeClass")).toBe(false);
      expect(
        Shared.typeIncludes("VerifiableCredential", "VerifiableCredential"),
      ).toBe(true);
    });

    test("should handle array type values", () => {
      expect(Shared.typeIncludes(["Assertion", "Extension"], "Assertion")).toBe(
        true,
      );
      expect(Shared.typeIncludes(["Assertion", "Extension"], "Extension")).toBe(
        true,
      );
      expect(
        Shared.typeIncludes(["Assertion", "Extension"], "BadgeClass"),
      ).toBe(false);
      expect(
        Shared.typeIncludes(
          ["VerifiableCredential", "OpenBadgeCredential"],
          "OpenBadgeCredential",
        ),
      ).toBe(true);
    });

    test("should handle edge cases", () => {
      expect(Shared.typeIncludes(null, "Assertion")).toBe(false);
      expect(Shared.typeIncludes(undefined, "Assertion")).toBe(false);
      expect(Shared.typeIncludes(123, "Assertion")).toBe(false);
      expect(Shared.typeIncludes({}, "Assertion")).toBe(false);
      expect(Shared.typeIncludes([], "Assertion")).toBe(false);
      expect(Shared.typeIncludes("", "")).toBe(true);
      expect(Shared.typeIncludes([""], "")).toBe(true);
    });
  });

  describe("Integration with OB2 and OB3", () => {
    test("should work with OB2 Assertion objects", () => {
      const assertion = createOB2Assertion();

      expect(Shared.isJsonLdObject(assertion)).toBe(true);
      expect(Shared.hasJsonLdType(assertion, "Assertion")).toBe(true);
      expect(Shared.hasJsonLdContext(assertion, Shared.OB2Context)).toBe(true);
    });

    test("should work with OB3 VerifiableCredential objects", () => {
      const credential = createOB3VerifiableCredential();

      expect(Shared.isJsonLdObject(credential)).toBe(true);
      expect(Shared.hasJsonLdType(credential, "VerifiableCredential")).toBe(
        true,
      );
      expect(Shared.hasJsonLdContext(credential, Shared.VCContext)).toBe(true);
    });
  });
});
