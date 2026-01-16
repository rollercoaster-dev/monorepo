/**
 * DTOs for bake credential endpoint
 *
 * Defines request and response structures for baking Open Badges
 * credentials into PNG or SVG images.
 */

import { z } from "zod";

/**
 * Maximum image size (10MB)
 * Matches the size limit for baked image verification
 */
const MAX_IMAGE_SIZE = 10 * 1024 * 1024;

/**
 * Base64 pattern validation (standard base64, not base64url)
 * Matches the pattern used in verify.dto.ts for baked images
 */
const base64Pattern = /^[A-Za-z0-9+/]*={0,2}$/;

/**
 * Zod schema for bake request validation
 * Validates format and base64-encoded image with size limit
 */
export const BakeRequestSchema = z.object({
  /**
   * Image format for baking
   * Must be either 'png' or 'svg'
   */
  format: z.enum(["png", "svg"], {
    errorMap: () => ({ message: "Format must be 'png' or 'svg'" }),
  }),

  /**
   * Base64-encoded image data
   * Must be valid base64 and under 10MB
   */
  image: z
    .string()
    .min(1, "Image data cannot be empty")
    .refine((val) => val.length <= MAX_IMAGE_SIZE, {
      message: `Image must be less than ${MAX_IMAGE_SIZE / (1024 * 1024)}MB`,
    })
    .refine((val) => base64Pattern.test(val), {
      message: "Image must be valid base64 encoded data",
    }),
});

/**
 * Request DTO for baking a credential into an image
 *
 * @property format - The image format to bake into ('png' or 'svg')
 * @property image - Base64-encoded image data to embed credential into
 */
export interface BakeRequestDto {
  /**
   * Image format for baking
   * Must be either 'png' or 'svg'
   */
  format: "png" | "svg";

  /**
   * Base64-encoded image data
   * This is the source image that will have the credential embedded
   */
  image: string;
}

/**
 * Response DTO for successful bake operation
 *
 * @property data - Base64-encoded baked image with embedded credential
 * @property mimeType - MIME type of the baked image
 * @property size - Size of the baked image in bytes
 * @property format - Format of the baked image
 */
export interface BakeResponseDto {
  /**
   * Base64-encoded baked image data
   * This image contains the embedded credential
   */
  data: string;

  /**
   * MIME type of the baked image
   * Either 'image/png' or 'image/svg+xml'
   */
  mimeType: "image/png" | "image/svg+xml";

  /**
   * Size of the baked image in bytes
   */
  size: number;

  /**
   * Format of the baked image
   */
  format: "png" | "svg";
}
