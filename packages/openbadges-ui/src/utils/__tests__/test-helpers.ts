// src/utils/__tests__/test-helpers.ts

import type { OB2, OB3 } from "@/types";
import { createIRI, createDateTime } from "@/utils/type-helpers";
import { vi } from "vitest";
import type { VerificationResult } from "@/services/BadgeVerificationService";

/**
 * Helper function for tests to create a properly typed OB2 Assertion with branded types
 */
export function createTestOB2Assertion(
  partialAssertion: Partial<OB2.Assertion> = {},
): OB2.Assertion {
  const defaultAssertion: OB2.Assertion = {
    "@context": "https://w3id.org/openbadges/v2",
    id: createIRI("http://example.org/test-badge"),
    type: "Assertion",
    recipient: {
      type: "email",
      identity: "test@example.org",
      hashed: false,
    },
    badge: {
      type: "BadgeClass",
      id: createIRI("http://example.org/test-badgeclass"),
      name: "Test Badge",
      description: "A badge for testing",
      image: createIRI("http://example.org/test-badge.png"),
      criteria: {
        narrative: "To earn this badge, you need to pass all the tests.",
      },
      issuer: {
        id: createIRI("http://example.org/test-issuer"),
        type: "Profile",
        name: "Test Issuer",
        url: createIRI("http://example.org"),
      },
    },
    verification: {
      type: "hosted",
    },
    issuedOn: createDateTime("2023-01-01T00:00:00Z"),
  };

  return { ...defaultAssertion, ...partialAssertion };
}

/**
 * Helper function for tests to create a properly typed OB3 VerifiableCredential with branded types
 */
export function createTestOB3Credential(
  partialCredential: Partial<OB3.VerifiableCredential> = {},
): OB3.VerifiableCredential {
  const defaultCredential: OB3.VerifiableCredential = {
    "@context": [
      "https://www.w3.org/2018/credentials/v1",
      "https://purl.imsglobal.org/spec/ob/v3p0/context.json",
    ],
    id: createIRI("http://example.org/test-credential"),
    type: ["VerifiableCredential", "OpenBadgeCredential"],
    issuer: {
      id: createIRI("http://example.org/test-issuer"),
      type: "Profile",
      name: "Test Issuer",
      url: createIRI("http://example.org/test-issuer"),
    },
    validFrom: createDateTime("2023-01-01T00:00:00Z"),
    credentialSubject: {
      id: createIRI("did:example:123"),
      type: "AchievementSubject",
      achievement: {
        id: createIRI("http://example.org/test-achievement"),
        type: "Achievement",
        name: "Test Achievement",
        description: "A test achievement",
        criteria: {
          narrative:
            "To earn this achievement, you need to pass all the tests.",
        },
        image: {
          id: createIRI("http://example.org/test-badge.png"),
          type: "Image",
        },
      },
    },
    proof: {
      type: "Ed25519Signature2020",
      created: createDateTime("2023-01-01T00:00:00Z"),
      verificationMethod: createIRI("http://example.org/test-key"),
      proofPurpose: "assertionMethod",
      proofValue: "z3ABcd",
    },
  };

  return { ...defaultCredential, ...partialCredential };
}

/**
 * Helper function for tests to mock BadgeVerificationService
 */
export function mockBadgeVerificationService(): {
  mockVerifyBadge: ReturnType<typeof vi.fn>;
  mockVerificationResult: (
    result: Partial<VerificationResult>,
  ) => ReturnType<typeof vi.fn>;
} {
  // Create a mock version of BadgeVerificationService
  const mockVerifyBadge = vi.fn();

  // Add mock methods to the function
  mockVerifyBadge.mockResolvedValue = vi.fn().mockReturnValue(mockVerifyBadge);
  mockVerifyBadge.mockResolvedValueOnce = vi
    .fn()
    .mockReturnValue(mockVerifyBadge);
  mockVerifyBadge.mockRejectedValue = vi.fn().mockReturnValue(mockVerifyBadge);
  mockVerifyBadge.mockRejectedValueOnce = vi
    .fn()
    .mockReturnValue(mockVerifyBadge);

  // Return the mocked function and helper to set mock responses
  return {
    mockVerifyBadge,
    mockVerificationResult: (result: Partial<VerificationResult>) => {
      const defaultResult = {
        isValid: true,
        errors: [],
        warnings: [],
        badgeVersion: "OB2" as const,
        structureValidation: {
          isValid: true,
          errors: [],
          warnings: [],
        },
        contentValidation: {
          isValid: true,
          errors: [],
          warnings: [],
        },
      };
      mockVerifyBadge.mockResolvedValueOnce({ ...defaultResult, ...result });
      return mockVerifyBadge;
    },
  };
}

/**
 * Create an OB2.BadgeClass with proper typing for tests
 */
export function createTestOB2BadgeClass(
  partial: Partial<OB2.BadgeClass> = {},
): OB2.BadgeClass {
  const defaultBadgeClass: OB2.BadgeClass = {
    "@context": "https://w3id.org/openbadges/v2",
    id: createIRI("http://example.org/test-badgeclass"),
    type: "BadgeClass",
    name: "Test Badge",
    description: "A badge for testing",
    image: createIRI("http://example.org/test-badge.png"),
    criteria: {
      narrative: "Test criteria",
    },
    issuer: {
      id: createIRI("http://example.org/test-issuer"),
      type: "Profile",
      name: "Test Issuer",
    },
  };

  return { ...defaultBadgeClass, ...partial };
}

/**
 * Create an OB2.Profile with proper typing for tests
 */
export function createTestOB2Profile(
  partial: Partial<OB2.Profile> = {},
): OB2.Profile {
  const defaultProfile: OB2.Profile = {
    "@context": "https://w3id.org/openbadges/v2",
    id: createIRI("http://example.org/test-profile"),
    type: "Profile",
    name: "Test Profile",
  };

  return { ...defaultProfile, ...partial };
}
