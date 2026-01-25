// tests/test-utils.ts
import type { OB2, OB3, Shared } from "@/types";
import { createIRI, createDateTime } from "@/utils/type-helpers";

/**
 * Helper function for tests to convert string values to proper IRI types
 * Use this to cast string values to proper OB2/OB3 types in test files
 */
export function asIRI(url: string): Shared.IRI {
  return createIRI(url);
}

/**
 * Helper function for tests to convert string values to DateTime type
 */
export function asDateTime(date: string): Shared.DateTime {
  return createDateTime(date);
}

/**
 * Helper to convert a mock assertion to ensure all IRI and DateTime values are typed correctly
 */
export function typedAssertion(
  assertion: Record<string, unknown>,
): OB2.Assertion {
  // Process the basic fields
  if (typeof assertion.id === "string") {
    assertion.id = asIRI(assertion.id);
  }
  if (typeof assertion.issuedOn === "string") {
    assertion.issuedOn = asDateTime(assertion.issuedOn);
  }
  if (typeof assertion.expires === "string") {
    assertion.expires = asDateTime(assertion.expires);
  }

  // Process badge field
  if (typeof assertion.badge === "object" && assertion.badge !== null) {
    const badge = assertion.badge as Record<string, unknown>;
    if (typeof badge.id === "string") {
      badge.id = asIRI(badge.id);
    }
    if (typeof badge.image === "string") {
      badge.image = asIRI(badge.image);
    }

    // Process issuer inside badge
    if (typeof badge.issuer === "object" && badge.issuer !== null) {
      const issuer = badge.issuer as Record<string, unknown>;
      if (typeof issuer.id === "string") {
        issuer.id = asIRI(issuer.id);
      }
      if (typeof issuer.url === "string") {
        issuer.url = asIRI(issuer.url);
      }
    }
  }

  return assertion as OB2.Assertion;
}

/**
 * Helper to convert a mock credential to ensure all IRI and DateTime values are typed correctly
 */
export function typedCredential(
  credential: Record<string, unknown>,
): OB3.VerifiableCredential {
  // Process the basic fields
  if (typeof credential.id === "string") {
    credential.id = asIRI(credential.id);
  }
  // Handle both legacy (issuanceDate/expirationDate) and VC 2.0 (validFrom/validUntil)
  if (typeof credential.issuanceDate === "string") {
    credential.issuanceDate = asDateTime(credential.issuanceDate);
  }
  if (typeof credential.expirationDate === "string") {
    credential.expirationDate = asDateTime(credential.expirationDate);
  }
  if (typeof credential.validFrom === "string") {
    credential.validFrom = asDateTime(credential.validFrom);
  }
  if (typeof credential.validUntil === "string") {
    credential.validUntil = asDateTime(credential.validUntil);
  }

  // Process issuer field
  if (typeof credential.issuer === "object" && credential.issuer !== null) {
    const issuer = credential.issuer as Record<string, unknown>;
    if (typeof issuer.id === "string") {
      issuer.id = asIRI(issuer.id);
    }
    if (typeof issuer.url === "string") {
      issuer.url = asIRI(issuer.url);
    }
  }

  // Process credentialSubject field
  if (
    typeof credential.credentialSubject === "object" &&
    credential.credentialSubject !== null
  ) {
    const subject = credential.credentialSubject as Record<string, unknown>;
    if (typeof subject.id === "string") {
      subject.id = asIRI(subject.id);
    }

    // Process achievement inside credentialSubject
    if (
      typeof subject.achievement === "object" &&
      subject.achievement !== null
    ) {
      const achievements = Array.isArray(subject.achievement)
        ? subject.achievement
        : [subject.achievement];

      for (const achievement of achievements) {
        if (typeof achievement === "object" && achievement !== null) {
          const ach = achievement as Record<string, unknown>;
          if (typeof ach.id === "string") {
            ach.id = asIRI(ach.id);
          }

          // Process image inside achievement
          if (typeof ach.image === "object" && ach.image !== null) {
            const image = ach.image as Record<string, unknown>;
            if (typeof image.id === "string") {
              image.id = asIRI(image.id);
            }
          } else if (typeof ach.image === "string") {
            ach.image = asIRI(ach.image);
          }
        }
      }
    }
  }

  return credential as OB3.VerifiableCredential;
}
