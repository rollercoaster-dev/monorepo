/**
 * Unified Baking Service
 *
 * Provides a unified facade for embedding (baking) and extracting (unbaking)
 * Open Badges credentials in both PNG and SVG images.
 *
 * Auto-detects the image format based on content and delegates to the
 * appropriate format-specific service (PNG or SVG).
 *
 * @see https://www.imsglobal.org/spec/ob/v3p0/#baked-badge
 */

import type { OB2, OB3 } from "openbadges-types";
import { bakePNG, unbakePNG } from "./png/png-baking.service.js";
import { bakeSVG, unbakeSVG } from "./svg/svg-baking.service.js";
import type {
  ImageFormat,
  BakeOptions,
  BakedImage,
  UnbakeResult,
  BakingService,
} from "./types.js";

/**
 * PNG signature bytes (magic number)
 * @see https://www.w3.org/TR/PNG/#5PNG-file-signature
 */
const PNG_SIGNATURE = [137, 80, 78, 71, 13, 10, 26, 10];

/**
 * SVG detection patterns
 * Checks for XML declaration, DOCTYPE, or SVG element
 */
const SVG_PATTERNS = {
  xmlDeclaration: /^\s*<\?xml/i,
  doctype: /<!DOCTYPE\s+svg/i,
  svgElement: /<svg[\s>]/i,
};

/**
 * Check if image data is a PNG image
 *
 * @param imageData - The image data to check
 * @returns True if the data starts with PNG signature
 */
function isPNG(imageData: Buffer): boolean {
  if (imageData.length < 8) {
    return false;
  }

  for (let i = 0; i < 8; i++) {
    if (imageData[i] !== PNG_SIGNATURE[i]) {
      return false;
    }
  }

  return true;
}

/**
 * Check if image data is an SVG image
 *
 * @param imageData - The image data to check
 * @returns True if the data appears to be SVG content
 */
function isSVG(imageData: Buffer): boolean {
  // Convert to string for pattern matching (check first 1000 bytes for efficiency)
  const content = imageData.slice(0, 1000).toString("utf-8");

  return (
    SVG_PATTERNS.xmlDeclaration.test(content) ||
    SVG_PATTERNS.doctype.test(content) ||
    SVG_PATTERNS.svgElement.test(content)
  );
}

/**
 * Detect the format of an image from its data
 *
 * Examines the image data to determine if it's a PNG or SVG format.
 * For PNG, checks the 8-byte signature at the beginning.
 * For SVG, checks for XML/SVG patterns in text content.
 *
 * @param imageData - The image data as a Buffer
 * @returns The detected image format, or null if unsupported
 */
export function detectFormat(imageData: Buffer): ImageFormat | null {
  // Check for PNG signature
  if (isPNG(imageData)) {
    return "png";
  }

  // Check for SVG (text-based format)
  if (isSVG(imageData)) {
    return "svg";
  }

  return null;
}

/**
 * Embed an Open Badges credential into an image
 *
 * Auto-detects the image format and delegates to the appropriate
 * format-specific baking service.
 *
 * @param imageData - The source image data as a Buffer
 * @param credential - The OB2 Assertion or OB3 VerifiableCredential to embed
 * @param options - Optional baking options (format can be auto-detected)
 * @returns The baked image result with embedded credential
 * @throws Error if the image format is unsupported or invalid
 */
export async function bake(
  imageData: Buffer,
  credential: OB2.Assertion | OB3.VerifiableCredential,
  options?: Partial<BakeOptions>,
): Promise<BakedImage> {
  // Determine format from options or auto-detect
  const format = options?.format ?? detectFormat(imageData);

  if (!format) {
    throw new Error(
      "Unsupported image format: unable to detect PNG or SVG format",
    );
  }

  let bakedData: Buffer;
  let mimeType: "image/png" | "image/svg+xml";

  if (format === "png") {
    bakedData = bakePNG(imageData, credential);
    mimeType = "image/png";
  } else {
    // SVG format - convert Buffer to string for processing
    const svgContent = imageData.toString("utf-8");
    const bakedSVG = bakeSVG(svgContent, credential);
    bakedData = Buffer.from(bakedSVG, "utf-8");
    mimeType = "image/svg+xml";
  }

  return {
    data: bakedData,
    mimeType,
    format,
    size: bakedData.length,
    compressed: options?.compress ?? false,
  };
}

/**
 * Extract an Open Badges credential from a baked image
 *
 * Auto-detects the image format and delegates to the appropriate
 * format-specific unbaking service.
 *
 * @param imageData - The baked image data as a Buffer
 * @returns The extraction result containing the credential if found
 * @throws Error if the image format is unsupported or invalid
 */
export async function unbake(imageData: Buffer): Promise<UnbakeResult> {
  const format = detectFormat(imageData);

  if (!format) {
    throw new Error(
      "Unsupported image format: unable to detect PNG or SVG format",
    );
  }

  let credential: OB2.Assertion | OB3.VerifiableCredential | null;
  let rawData: string | undefined;

  if (format === "png") {
    credential = unbakePNG(imageData);
  } else {
    // SVG format - convert Buffer to string for processing
    const svgContent = imageData.toString("utf-8");
    credential = unbakeSVG(svgContent);
  }

  if (credential) {
    rawData = JSON.stringify(credential);
  }

  return {
    found: credential !== null,
    credential: credential ?? undefined,
    rawData,
    sourceFormat: format,
  };
}

/**
 * Check if an image contains baked credential data
 *
 * @param imageData - The image data as a Buffer
 * @returns True if the image contains embedded credential data
 */
export async function isBaked(imageData: Buffer): Promise<boolean> {
  try {
    const result = await unbake(imageData);
    return result.found;
  } catch {
    return false;
  }
}

/**
 * Create an instance of the BakingService interface
 *
 * Provides an object-oriented interface for baking operations,
 * useful for dependency injection and testing.
 *
 * @returns BakingService implementation
 */
export function createBakingService(): BakingService {
  return {
    bake,
    unbake,
    detectFormat,
    isBaked,
  };
}

/**
 * Default baking service instance
 *
 * Can be imported directly for convenience:
 * ```ts
 * import { bakingService } from './baking.service.js';
 * const result = await bakingService.bake(imageData, credential);
 * ```
 */
export const bakingService = createBakingService();
