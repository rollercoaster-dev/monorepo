/**
 * Baking Service
 *
 * Unified service for embedding (baking) and extracting (unbaking)
 * Open Badges credentials in PNG and SVG images.
 *
 * The unified service auto-detects image format and delegates to
 * the appropriate format-specific service.
 *
 * @example
 * ```ts
 * import { bake, unbake, bakingService } from './services/baking';
 *
 * // Bake credential into image (format auto-detected)
 * const bakedResult = await bake(imageData, credential);
 *
 * // Extract credential from baked image
 * const unbakeResult = await unbake(bakedImageData);
 *
 * // Or use the service instance
 * const result = await bakingService.bake(imageData, credential);
 * ```
 */

// Types
export * from "./types.js";

// Unified baking service (recommended)
export {
  detectFormat,
  bake,
  unbake,
  isBaked,
  createBakingService,
  bakingService,
} from "./baking.service.js";

// Format-specific services (for direct access if needed)
export { bakePNG, unbakePNG } from "./png/png-baking.service.js";
export { bakeSVG, unbakeSVG } from "./svg/svg-baking.service.js";
