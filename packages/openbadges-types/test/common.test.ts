import { Shared } from "../src";

describe("Shared Common Types", () => {
  describe("IRI Type Guard", () => {
    test("should correctly identify valid IRIs", () => {
      // Valid IRIs
      expect(Shared.isIRI("https://example.org/badges/5")).toBe(true);
      expect(Shared.isIRI("http://example.com/path?query=value#fragment")).toBe(
        true,
      );
      expect(
        Shared.isIRI("urn:uuid:f81d4fae-7dec-11d0-a765-00a0c91e6bf6"),
      ).toBe(true);

      // Invalid IRIs
      expect(Shared.isIRI(123)).toBe(false);
      expect(Shared.isIRI(null)).toBe(false);
      expect(Shared.isIRI(undefined)).toBe(false);
      expect(Shared.isIRI({})).toBe(false);
      expect(Shared.isIRI("not a url")).toBe(false);
      expect(Shared.isIRI("")).toBe(false);
    });
  });

  describe("DateTime Type Guard", () => {
    test("should correctly identify valid ISO 8601 DateTime strings", () => {
      // Valid DateTime strings
      expect(Shared.isDateTime("2023-06-15T12:00:00Z")).toBe(true);
      expect(Shared.isDateTime("2023-06-15T12:00:00.123Z")).toBe(true);
      expect(Shared.isDateTime("2023-06-15T12:00:00+01:00")).toBe(true);
      expect(Shared.isDateTime("2023-06-15T12:00:00-05:00")).toBe(true);

      // Invalid DateTime strings
      expect(Shared.isDateTime(123)).toBe(false);
      expect(Shared.isDateTime(null)).toBe(false);
      expect(Shared.isDateTime(undefined)).toBe(false);
      expect(Shared.isDateTime({})).toBe(false);
      expect(Shared.isDateTime("2023-06-15")).toBe(false); // Missing time
      expect(Shared.isDateTime("12:00:00")).toBe(false); // Missing date
      expect(Shared.isDateTime("not a date")).toBe(false);
      expect(Shared.isDateTime("")).toBe(false);
    });
  });

  describe("Branded Types", () => {
    test("should create branded IRI and DateTime types", () => {
      // Create branded types
      const iri = Shared.createIRI("https://example.org/badges/5");
      const dateTime = Shared.createDateTime("2023-06-15T12:00:00Z");

      // These should compile without errors
      // Using the variables to avoid unused variable warnings
      expect(iri).toEqual(expect.any(String));
      expect(dateTime).toEqual(expect.any(String));

      // We can still use them as strings
      expect(typeof iri).toBe("string");
      expect(typeof dateTime).toBe("string");

      // They should maintain their string value
      expect(iri).toBe("https://example.org/badges/5");
      expect(dateTime).toBe("2023-06-15T12:00:00Z");
    });
  });
});
