/**
 * Badge version detection and context URL constants for Open Badges
 *
 * Supports OB 2.0 and OB 3.0 (VC Data Model 2.0) badge versions.
 *
 * @module credentials/version
 */

export enum BadgeVersion {
  V2 = "2.0",
  V3 = "3.0",
}

export const VC_V2_CONTEXT_URL = "https://www.w3.org/ns/credentials/v2";
export const OBV3_CONTEXT_URL =
  "https://purl.imsglobal.org/spec/ob/v3p0/context-3.0.3.json";

/**
 * Badge version context URLs
 *
 * For OB3 (VC Data Model 2.0), the @context array order is critical:
 * 1. VC 2.0 context MUST be first
 * 2. OB3 context second
 *
 * @see https://www.w3.org/TR/vc-data-model-2.0/#contexts
 */
export const BADGE_VERSION_CONTEXTS = {
  [BadgeVersion.V2]: "https://w3id.org/openbadges/v2",
  [BadgeVersion.V3]: [VC_V2_CONTEXT_URL, OBV3_CONTEXT_URL],
};

/**
 * Detects the Open Badges version from a JSON-LD object
 * @param obj The JSON-LD object to check
 * @returns The detected badge version or undefined if not detected
 */
export function detectBadgeVersion(
  obj: Record<string, unknown>,
): BadgeVersion | undefined {
  if (!obj || typeof obj !== "object") {
    return undefined;
  }

  const context = obj["@context"];
  if (!context) {
    return undefined;
  }

  // Handle array context
  if (Array.isArray(context)) {
    if (
      BADGE_VERSION_CONTEXTS[BadgeVersion.V3].some((url) =>
        context.includes(url),
      )
    ) {
      return BadgeVersion.V3;
    }
    if (context.includes(BADGE_VERSION_CONTEXTS[BadgeVersion.V2])) {
      return BadgeVersion.V2;
    }
    return undefined;
  }

  // Handle string context
  if (typeof context === "string") {
    if (context === BADGE_VERSION_CONTEXTS[BadgeVersion.V2]) {
      return BadgeVersion.V2;
    }
    if (BADGE_VERSION_CONTEXTS[BadgeVersion.V3].includes(context)) {
      return BadgeVersion.V3;
    }
  }

  return undefined;
}
