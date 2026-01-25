/**
 * OB3 type string constants
 * Use these constants instead of magic strings for consistency and type safety
 */

export const OB3_TYPES = {
  VERIFIABLE_CREDENTIAL: "VerifiableCredential",
  OPEN_BADGE_CREDENTIAL: "OpenBadgeCredential",
  ACHIEVEMENT: "Achievement",
  PROFILE: "Profile",
  EVIDENCE: "Evidence",
  CRITERIA: "Criteria",
} as const;
