/**
 * Tests for PNG Baking Service
 */

import { describe, it, expect } from "bun:test";
import { bakePNG, unbakePNG } from "../../../../src/services/baking/png/png-baking.service";
import type { OB2 } from "openbadges-types";

/**
 * Create a minimal valid PNG image buffer
 * This is a 1x1 transparent PNG
 */
function createMinimalPNG(): Buffer {
  // PNG signature + IHDR + IDAT + IEND chunks
  return Buffer.from([
    // PNG signature
    137, 80, 78, 71, 13, 10, 26, 10,
    // IHDR chunk (13 bytes data)
    0, 0, 0, 13, 73, 72, 68, 82, // Length + "IHDR"
    0, 0, 0, 1, // Width: 1
    0, 0, 0, 1, // Height: 1
    8, 6, // Bit depth: 8, Color type: 6 (RGBA)
    0, 0, 0, // Compression, filter, interlace
    159, 116, 14, 123, // CRC
    // IDAT chunk (minimal compressed data)
    0, 0, 0, 12, 73, 68, 65, 84, // Length + "IDAT"
    120, 156, 99, 0, 1, 0, 0, 5, 0, 1, 13, 10, 45, 180, // Compressed data
    // IEND chunk
    0, 0, 0, 0, 73, 69, 78, 68, 174, 66, 96, 130, // Length + "IEND" + CRC
  ]);
}

/**
 * Create a mock OB2 Assertion for testing
 */
function createMockOB2Assertion(): OB2.Assertion {
  return {
    "@context": "https://w3id.org/openbadges/v2",
    type: "Assertion",
    id: "https://example.org/assertions/123",
    recipient: {
      type: "email",
      identity: "test@example.org",
      hashed: false,
    },
    badge: "https://example.org/badges/test-badge",
    issuedOn: "2024-01-01T00:00:00Z",
    verification: {
      type: "hosted",
    },
  };
}

describe("PNG Baking Service", () => {
  describe("bakePNG", () => {
    it("should embed credential into PNG image", () => {
      const png = createMinimalPNG();
      const credential = createMockOB2Assertion();

      const bakedPNG = bakePNG(png, credential);

      expect(bakedPNG).toBeInstanceOf(Buffer);
      expect(bakedPNG.length).toBeGreaterThan(png.length);
    });

    it("should throw error for invalid PNG (missing signature)", () => {
      const invalidPNG = Buffer.from([1, 2, 3, 4]);
      const credential = createMockOB2Assertion();

      expect(() => bakePNG(invalidPNG, credential)).toThrow(
        "Invalid PNG image: missing PNG signature",
      );
    });

    it("should throw error for PNG without IEND chunk", () => {
      // PNG signature only
      const invalidPNG = Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]);
      const credential = createMockOB2Assertion();

      expect(() => bakePNG(invalidPNG, credential)).toThrow(
        "Invalid PNG image: missing IEND chunk",
      );
    });

    it("should replace existing baked credential", () => {
      const png = createMinimalPNG();
      const credential1 = createMockOB2Assertion();
      const credential2: OB2.Assertion = {
        ...credential1,
        id: "https://example.org/assertions/456",
      };

      const bakedPNG1 = bakePNG(png, credential1);
      const bakedPNG2 = bakePNG(bakedPNG1, credential2);

      const extracted = unbakePNG(bakedPNG2);
      expect(extracted).not.toBeNull();
      expect(extracted?.id).toBe("https://example.org/assertions/456");
    });
  });

  describe("unbakePNG", () => {
    it("should extract credential from baked PNG", () => {
      const png = createMinimalPNG();
      const credential = createMockOB2Assertion();

      const bakedPNG = bakePNG(png, credential);
      const extracted = unbakePNG(bakedPNG);

      expect(extracted).not.toBeNull();
      expect(extracted?.id).toBe(credential.id);
      expect(extracted?.badge).toBe(credential.badge);
    });

    it("should return null for unbaked PNG", () => {
      const png = createMinimalPNG();

      const extracted = unbakePNG(png);

      expect(extracted).toBeNull();
    });

    it("should throw error for invalid PNG", () => {
      const invalidPNG = Buffer.from([1, 2, 3, 4]);

      expect(() => unbakePNG(invalidPNG)).toThrow(
        "Invalid PNG image: missing PNG signature",
      );
    });
  });

  describe("round-trip baking and unbaking", () => {
    it("should preserve credential data through bake/unbake cycle", () => {
      const png = createMinimalPNG();
      const credential = createMockOB2Assertion();

      const bakedPNG = bakePNG(png, credential);
      const extracted = unbakePNG(bakedPNG);

      expect(extracted).toEqual(credential);
    });

    it("should handle complex credential with nested objects", () => {
      const png = createMinimalPNG();
      const credential: OB2.Assertion = {
        ...createMockOB2Assertion(),
        evidence: [
          {
            id: "https://example.org/evidence/1",
            name: "Test Evidence",
            description: "Evidence description",
          },
        ],
      };

      const bakedPNG = bakePNG(png, credential);
      const extracted = unbakePNG(bakedPNG);

      expect(extracted).toEqual(credential);
      expect((extracted as OB2.Assertion).evidence).toEqual(credential.evidence);
    });
  });
});
