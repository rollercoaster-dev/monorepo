/**
 * Platform detection utilities
 * @module platform
 *
 * Placeholder for future platform-specific implementations.
 */

/**
 * Detects the current runtime platform
 * @returns The detected platform name
 */
export function detectPlatform(): "node" | "bun" | "browser" | "unknown" {
  // Placeholder implementation
  if (typeof process !== "undefined" && process.versions?.bun) {
    return "bun";
  }
  if (typeof process !== "undefined" && process.versions?.node) {
    return "node";
  }
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  if (typeof (globalThis as any).window !== "undefined") {
    return "browser";
  }
  return "unknown";
}
