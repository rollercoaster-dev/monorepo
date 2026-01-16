/**
 * DTOs for bake credential endpoint
 *
 * Defines request and response structures for baking Open Badges
 * credentials into PNG or SVG images.
 */

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
