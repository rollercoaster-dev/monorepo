/**
 * Tests for Unified Baking Service
 *
 * Tests the unified baking service facade that auto-detects format
 * and delegates to PNG/SVG baking services.
 */

import { describe, it, expect } from "bun:test";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import type { OB2, OB3 } from "openbadges-types";
import { createIRI, createDateTime } from "openbadges-types";
import {
  detectFormat,
  bake,
  unbake,
  isBaked,
  createBakingService,
  bakingService,
} from "../../../src/services/baking/baking.service.js";

/**
 * Create a minimal valid PNG image buffer
 * This is a 1x1 transparent PNG with valid CRC checksums
 */
function createMinimalPNG(): Buffer {
  return Buffer.from([
    137,
    80,
    78,
    71,
    13,
    10,
    26,
    10, // PNG signature
    0,
    0,
    0,
    13,
    73,
    72,
    68,
    82, // IHDR chunk header
    0,
    0,
    0,
    1,
    0,
    0,
    0,
    1,
    8,
    6,
    0,
    0,
    0, // IHDR data
    31,
    21,
    196,
    137, // IHDR CRC
    0,
    0,
    0,
    13,
    73,
    68,
    65,
    84, // IDAT chunk header
    120,
    218,
    99,
    100,
    248,
    207,
    80,
    15,
    0,
    3,
    134,
    1,
    128, // IDAT data
    90,
    52,
    125,
    107, // IDAT CRC
    0,
    0,
    0,
    0,
    73,
    69,
    78,
    68,
    174,
    66,
    96,
    130, // IEND chunk
  ]);
}

/**
 * Create a minimal valid SVG image buffer
 */
function createMinimalSVG(): Buffer {
  const svg = `<?xml version="1.0" encoding="UTF-8"?>
<svg xmlns="http://www.w3.org/2000/svg" width="100" height="100" viewBox="0 0 100 100">
  <circle cx="50" cy="50" r="40" fill="#4a90d9"/>
</svg>`;
  return Buffer.from(svg, "utf-8");
}

/**
 * Load the test SVG fixture
 */
function loadTestSVG(): Buffer {
  const TEST_SVG_PATH = join(import.meta.dir, "../../fixtures/test-badge.svg");
  return readFileSync(TEST_SVG_PATH);
}

/**
 * Create a mock OB2 Assertion for testing
 */
function createMockOB2Assertion(): OB2.Assertion {
  return {
    "@context": "https://w3id.org/openbadges/v2",
    type: "Assertion",
    id: createIRI("https://example.org/assertions/123"),
    recipient: {
      type: "email",
      identity: "test@example.org",
      hashed: false,
    },
    badge: createIRI("https://example.org/badges/test-badge"),
    issuedOn: createDateTime("2024-01-01T00:00:00Z"),
    verification: {
      type: "hosted",
    },
  };
}

/**
 * Create a mock OB3 VerifiableCredential for testing
 */
function createMockOB3Credential(): OB3.VerifiableCredential {
  return {
    "@context": [
      "https://www.w3.org/2018/credentials/v1",
      "https://purl.imsglobal.org/spec/ob/v3p0/context.json",
    ],
    type: ["VerifiableCredential", "OpenBadgeCredential"],
    id: createIRI("https://example.org/credentials/123"),
    issuer: {
      id: createIRI("https://example.org/issuers/1"),
      type: ["Profile"],
      name: "Test Issuer",
      url: createIRI("https://example.org/issuers/1"),
    },
    validFrom: createDateTime("2024-01-01T00:00:00Z"),
    credentialSubject: {
      id: createIRI("did:example:recipient123"),
      type: ["AchievementSubject"],
      achievement: {
        id: createIRI("https://example.org/achievements/1"),
        type: ["Achievement"],
        name: "Test Achievement",
        description: "A test achievement for unit testing",
        criteria: {
          narrative: "Complete the test",
        },
      },
    },
  };
}

describe("Unified Baking Service", () => {
  describe("detectFormat", () => {
    it("should detect PNG format from signature", () => {
      const png = createMinimalPNG();
      expect(detectFormat(png)).toBe("png");
    });

    it("should detect SVG format from XML declaration", () => {
      const svg = createMinimalSVG();
      expect(detectFormat(svg)).toBe("svg");
    });

    it("should detect SVG format from svg element without XML declaration", () => {
      const svg = Buffer.from('<svg xmlns="http://www.w3.org/2000/svg"></svg>');
      expect(detectFormat(svg)).toBe("svg");
    });

    it("should detect SVG format from DOCTYPE", () => {
      const svg = Buffer.from(
        '<!DOCTYPE svg PUBLIC "-//W3C//DTD SVG 1.1//EN" "http://www.w3.org/Graphics/SVG/1.1/DTD/svg11.dtd"><svg></svg>',
      );
      expect(detectFormat(svg)).toBe("svg");
    });

    it("should return null for unsupported format", () => {
      const unknown = Buffer.from([0, 1, 2, 3, 4, 5, 6, 7]);
      expect(detectFormat(unknown)).toBeNull();
    });

    it("should return null for empty buffer", () => {
      const empty = Buffer.alloc(0);
      expect(detectFormat(empty)).toBeNull();
    });

    it("should return null for buffer too short to be PNG", () => {
      const short = Buffer.from([137, 80, 78, 71]);
      expect(detectFormat(short)).toBeNull();
    });

    // Edge case tests for SVG detection with large preambles
    // Note: SVG detection inspects only the first 1000 bytes for efficiency
    // This is documented behavior suitable for badge use cases
    it("should detect SVG with XML comment before svg element", () => {
      const svg = Buffer.from(
        '<?xml version="1.0"?><!-- This is a comment --><svg xmlns="http://www.w3.org/2000/svg"></svg>',
      );
      expect(detectFormat(svg)).toBe("svg");
    });

    it("should detect SVG with processing instruction before svg element", () => {
      const svg = Buffer.from(
        '<?xml version="1.0"?><?xml-stylesheet type="text/css" href="style.css"?><svg xmlns="http://www.w3.org/2000/svg"></svg>',
      );
      expect(detectFormat(svg)).toBe("svg");
    });

    it("should detect SVG with whitespace/newlines before svg element", () => {
      const svg = Buffer.from(
        '<?xml version="1.0"?>\n\n   \t\n<svg xmlns="http://www.w3.org/2000/svg"></svg>',
      );
      expect(detectFormat(svg)).toBe("svg");
    });

    it("should detect SVG via XML declaration even if svg element is beyond 1000 bytes", () => {
      // Even with a large comment pushing <svg> beyond 1000 bytes,
      // the <?xml declaration at the start still triggers SVG detection
      const largeComment = "x".repeat(1001);
      const svg = Buffer.from(
        `<?xml version="1.0"?><!--${largeComment}--><svg xmlns="http://www.w3.org/2000/svg"></svg>`,
      );
      // Detection works because <?xml is in the first 1000 bytes
      expect(detectFormat(svg)).toBe("svg");
    });

    it("should return null when no SVG patterns found in first 1000 bytes", () => {
      // Random binary data without any SVG markers
      const randomData = Buffer.alloc(1500, 0x42); // Fill with 'B' characters
      expect(detectFormat(randomData)).toBeNull();
    });
  });

  describe("bake", () => {
    it("should auto-detect PNG format and embed credential", async () => {
      const png = createMinimalPNG();
      const credential = createMockOB2Assertion();

      const result = await bake(png, credential);

      expect(result.format).toBe("png");
      expect(result.mimeType).toBe("image/png");
      expect(result.data).toBeInstanceOf(Buffer);
      expect(result.size).toBeGreaterThan(png.length);
    });

    it("should auto-detect SVG format and embed credential", async () => {
      const svg = loadTestSVG();
      const credential = createMockOB2Assertion();

      const result = await bake(svg, credential);

      expect(result.format).toBe("svg");
      expect(result.mimeType).toBe("image/svg+xml");
      expect(result.data).toBeInstanceOf(Buffer);

      // Verify credential is embedded
      const svgContent = result.data.toString("utf-8");
      expect(svgContent).toContain("openbadges:credential");
      expect(svgContent).toContain(credential.id as string);
    });

    it("should use explicit format from options", async () => {
      const svg = loadTestSVG();
      const credential = createMockOB2Assertion();

      const result = await bake(svg, credential, { format: "svg" });

      expect(result.format).toBe("svg");
    });

    it("should throw error for unsupported format", async () => {
      const unknown = Buffer.from([0, 1, 2, 3, 4, 5, 6, 7]);
      const credential = createMockOB2Assertion();

      await expect(bake(unknown, credential)).rejects.toThrow(
        "Unsupported image format",
      );
    });

    it("should embed OB3 credential in PNG", async () => {
      const png = createMinimalPNG();
      const credential = createMockOB3Credential();

      const result = await bake(png, credential);

      expect(result.format).toBe("png");
      expect(result.size).toBeGreaterThan(png.length);
    });

    it("should embed OB3 credential in SVG", async () => {
      const svg = loadTestSVG();
      const credential = createMockOB3Credential();

      const result = await bake(svg, credential);

      expect(result.format).toBe("svg");
      const svgContent = result.data.toString("utf-8");
      expect(svgContent).toContain(credential.id as string);
    });
  });

  describe("unbake", () => {
    it("should auto-detect PNG format and extract credential", async () => {
      const png = createMinimalPNG();
      const credential = createMockOB2Assertion();

      const bakedResult = await bake(png, credential);
      const unbakeResult = await unbake(bakedResult.data);

      expect(unbakeResult.found).toBe(true);
      expect(unbakeResult.sourceFormat).toBe("png");
      expect(unbakeResult.credential).toBeDefined();
      expect(unbakeResult.credential?.id).toBe(credential.id);
      expect(unbakeResult.rawData).toBeDefined();
    });

    it("should auto-detect SVG format and extract credential", async () => {
      const svg = loadTestSVG();
      const credential = createMockOB2Assertion();

      const bakedResult = await bake(svg, credential);
      const unbakeResult = await unbake(bakedResult.data);

      expect(unbakeResult.found).toBe(true);
      expect(unbakeResult.sourceFormat).toBe("svg");
      expect(unbakeResult.credential).toBeDefined();
      expect(unbakeResult.credential?.id).toBe(credential.id);
    });

    it("should return found: false for unbaked PNG", async () => {
      const png = createMinimalPNG();

      const result = await unbake(png);

      expect(result.found).toBe(false);
      expect(result.credential).toBeUndefined();
      expect(result.rawData).toBeUndefined();
      expect(result.sourceFormat).toBe("png");
    });

    it("should return found: false for unbaked SVG", async () => {
      const svg = loadTestSVG();

      const result = await unbake(svg);

      expect(result.found).toBe(false);
      expect(result.credential).toBeUndefined();
      expect(result.sourceFormat).toBe("svg");
    });

    it("should throw error for unsupported format", async () => {
      const unknown = Buffer.from([0, 1, 2, 3, 4, 5, 6, 7]);

      await expect(unbake(unknown)).rejects.toThrow("Unsupported image format");
    });
  });

  describe("isBaked", () => {
    it("should return true for baked PNG", async () => {
      const png = createMinimalPNG();
      const credential = createMockOB2Assertion();

      const bakedResult = await bake(png, credential);

      expect(await isBaked(bakedResult.data)).toBe(true);
    });

    it("should return true for baked SVG", async () => {
      const svg = loadTestSVG();
      const credential = createMockOB2Assertion();

      const bakedResult = await bake(svg, credential);

      expect(await isBaked(bakedResult.data)).toBe(true);
    });

    it("should return false for unbaked PNG", async () => {
      const png = createMinimalPNG();

      expect(await isBaked(png)).toBe(false);
    });

    it("should return false for unbaked SVG", async () => {
      const svg = loadTestSVG();

      expect(await isBaked(svg)).toBe(false);
    });

    it("should return false for unsupported format", async () => {
      const unknown = Buffer.from([0, 1, 2, 3, 4, 5, 6, 7]);

      expect(await isBaked(unknown)).toBe(false);
    });
  });

  describe("round-trip (bake + unbake)", () => {
    it("should preserve OB2 credential through PNG round-trip", async () => {
      const png = createMinimalPNG();
      const credential = createMockOB2Assertion();

      const bakedResult = await bake(png, credential);
      const unbakeResult = await unbake(bakedResult.data);

      expect(unbakeResult.credential).toEqual(credential);
    });

    it("should preserve OB3 credential through PNG round-trip", async () => {
      const png = createMinimalPNG();
      const credential = createMockOB3Credential();

      const bakedResult = await bake(png, credential);
      const unbakeResult = await unbake(bakedResult.data);

      expect(unbakeResult.credential).toEqual(credential);
    });

    it("should preserve OB2 credential through SVG round-trip", async () => {
      const svg = loadTestSVG();
      const credential = createMockOB2Assertion();

      const bakedResult = await bake(svg, credential);
      const unbakeResult = await unbake(bakedResult.data);

      expect(unbakeResult.credential).toEqual(credential);
    });

    it("should preserve OB3 credential through SVG round-trip", async () => {
      const svg = loadTestSVG();
      const credential = createMockOB3Credential();

      const bakedResult = await bake(svg, credential);
      const unbakeResult = await unbake(bakedResult.data);

      expect(unbakeResult.credential).toEqual(credential);
    });
  });

  describe("createBakingService", () => {
    it("should create a BakingService instance", () => {
      const service = createBakingService();

      expect(service).toBeDefined();
      expect(typeof service.bake).toBe("function");
      expect(typeof service.unbake).toBe("function");
      expect(typeof service.detectFormat).toBe("function");
      expect(typeof service.isBaked).toBe("function");
    });

    it("should work with created service instance", async () => {
      const service = createBakingService();
      const png = createMinimalPNG();
      const credential = createMockOB2Assertion();

      const bakedResult = await service.bake(png, credential, {
        format: "png",
      });
      expect(bakedResult.format).toBe("png");

      const unbakeResult = await service.unbake(bakedResult.data);
      expect(unbakeResult.found).toBe(true);
    });
  });

  describe("bakingService (default instance)", () => {
    it("should be a valid BakingService instance", () => {
      expect(bakingService).toBeDefined();
      expect(typeof bakingService.bake).toBe("function");
      expect(typeof bakingService.unbake).toBe("function");
      expect(typeof bakingService.detectFormat).toBe("function");
      expect(typeof bakingService.isBaked).toBe("function");
    });

    it("should work with default service instance", async () => {
      const png = createMinimalPNG();
      const credential = createMockOB2Assertion();

      const bakedResult = await bakingService.bake(png, credential, {
        format: "png",
      });
      expect(bakedResult.format).toBe("png");

      const unbakeResult = await bakingService.unbake(bakedResult.data);
      expect(unbakeResult.found).toBe(true);
      expect(unbakeResult.credential?.id).toBe(credential.id);
    });
  });
});
