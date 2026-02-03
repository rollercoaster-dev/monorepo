/**
 * Platform detection utilities for Open Badges Core
 *
 * Provides runtime environment detection to support both Node.js and Bun environments.
 * Used internally by crypto and baking modules to select appropriate platform APIs.
 */

/**
 * Supported runtime platforms
 */
export type Platform = "node" | "bun" | "unknown";

/**
 * Detect the current runtime platform
 *
 * @returns The detected platform type
 */
export function detectPlatform(): Platform {
  if (typeof process !== "undefined" && process.versions) {
    if (process.versions.bun) {
      return "bun";
    }
    if (process.versions.node) {
      return "node";
    }
  }
  return "unknown";
}

/**
 * Check if running in Bun runtime
 *
 * @returns True if running in Bun
 */
export function isBun(): boolean {
  return detectPlatform() === "bun";
}

/**
 * Check if running in Node.js runtime
 *
 * @returns True if running in Node.js
 */
export function isNode(): boolean {
  return detectPlatform() === "node";
}
