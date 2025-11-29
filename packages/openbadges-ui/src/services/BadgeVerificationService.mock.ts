// src/services/BadgeVerificationService.mock.ts
import { vi } from "vitest";
import type { VerificationResult } from "./BadgeVerificationService";

// Create a typed mock for the verification function
// Use explicit types instead of importing from openbadges-types
export const mockVerifyBadge = vi.fn<
  [unknown], // Use unknown instead of OB2.Assertion | OB3.VerifiableCredential
  Promise<VerificationResult>
>();

export const BadgeVerificationService = {
  verifyBadge: mockVerifyBadge,
};
