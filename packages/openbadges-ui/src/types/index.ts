// src/types/index.ts
// Re-export types from openbadges-types package

// Re-export all types from the openbadges-types package
export * from "openbadges-types";

// Utility types for the library
export type ProfileType = "Issuer" | "Recipient";

export interface Profile {
  id: string;
  name: string;
  image?: string;
  description?: string;
  url?: string;
  email?: string;
  type: ProfileType;
}
