// src/utils/type-helpers.ts
import type { OB2, OB3, Shared } from "@/types";

// Helper function to convert string to IRI branded type
export function createIRI(url: string): Shared.IRI {
  return url as Shared.IRI;
}

// Helper function to convert string to DateTime branded type
export function createDateTime(dateTimeString: string): Shared.DateTime {
  return dateTimeString as Shared.DateTime;
}

// Create namespaces to match the guards referenced in BadgeVerificationService.ts
// These namespaces mirror the guards available in the OB2 and OB3 modules
export const OB2Guards = {
  isIdentityObject: (value: unknown): value is OB2.IdentityObject => {
    if (typeof value !== "object" || value === null) {
      return false;
    }
    const obj = value as Record<string, unknown>;
    return "type" in obj && "identity" in obj;
  },

  isVerificationObject: (value: unknown): value is OB2.VerificationObject => {
    if (typeof value !== "object" || value === null) {
      return false;
    }
    const obj = value as Record<string, unknown>;
    return "type" in obj;
  },

  isEvidence: (value: unknown): value is OB2.Evidence => {
    if (typeof value !== "object" || value === null) {
      return false;
    }
    const obj = value as Record<string, unknown>;
    // OB2 Evidence has no required fields, but should have at least one known property
    return (
      "id" in obj ||
      "type" in obj ||
      "narrative" in obj ||
      "name" in obj ||
      "description" in obj ||
      "genre" in obj ||
      "audience" in obj
    );
  },

  isAlignmentObject: (value: unknown): value is OB2.AlignmentObject => {
    if (typeof value !== "object" || value === null) {
      return false;
    }
    const obj = value as Record<string, unknown>;
    return "targetName" in obj && "targetUrl" in obj;
  },

  isImage: (value: unknown): value is OB2.Image => {
    if (typeof value !== "object" || value === null) {
      return false;
    }
    const obj = value as Record<string, unknown>;
    // OB2 Image has no required fields, but should have at least one known property
    return (
      "id" in obj ||
      "type" in obj ||
      "caption" in obj ||
      "author" in obj ||
      "imageData" in obj
    );
  },

  isCriteria: (value: unknown): value is OB2.Criteria => {
    if (typeof value !== "object" || value === null) {
      return false;
    }
    const obj = value as Record<string, unknown>;
    // OB2 Criteria has no required fields, but should have at least one known property
    return "id" in obj || "narrative" in obj;
  },
};

export const OB3Guards = {
  isProof: (value: unknown): value is OB3.Proof => {
    if (typeof value !== "object" || value === null) {
      return false;
    }
    const obj = value as Record<string, unknown>;
    return "type" in obj;
  },

  isCredentialStatus: (value: unknown): value is OB3.CredentialStatus => {
    if (typeof value !== "object" || value === null) {
      return false;
    }
    const obj = value as Record<string, unknown>;
    return "id" in obj && "type" in obj;
  },

  isIssuer: (value: unknown): value is OB3.Issuer => {
    if (typeof value !== "object" || value === null) {
      return false;
    }
    const obj = value as Record<string, unknown>;
    return "id" in obj && "type" in obj;
  },

  isCredentialSubject: (value: unknown): value is OB3.CredentialSubject => {
    if (typeof value !== "object" || value === null) {
      return false;
    }
    const obj = value as Record<string, unknown>;
    return "id" in obj || "achievement" in obj;
  },

  isAchievement: (value: unknown): value is OB3.Achievement => {
    if (typeof value !== "object" || value === null) {
      return false;
    }
    const obj = value as Record<string, unknown>;
    return "id" in obj && "type" in obj;
  },

  isCriteria: (value: unknown): value is OB3.Criteria => {
    if (typeof value !== "object" || value === null) {
      return false;
    }
    const obj = value as Record<string, unknown>;
    return "narrative" in obj || "id" in obj;
  },

  isRefreshService: (value: unknown): value is OB3.RefreshService => {
    if (typeof value !== "object" || value === null) {
      return false;
    }
    const obj = value as Record<string, unknown>;
    return "id" in obj && "type" in obj;
  },

  isTermsOfUse: (value: unknown): value is OB3.TermsOfUse => {
    if (typeof value !== "object" || value === null) {
      return false;
    }
    const obj = value as Record<string, unknown>;
    return "type" in obj;
  },

  isEvidence: (value: unknown): value is OB3.Evidence => {
    if (typeof value !== "object" || value === null) {
      return false;
    }
    const obj = value as Record<string, unknown>;
    return "type" in obj || "id" in obj;
  },
};

// Helper to check if a type value includes a specific type string
// Handles both string and array forms per OB2/OB3 spec
function typeIncludes(typeValue: unknown, targetType: string): boolean {
  if (typeof typeValue === "string") {
    return typeValue === targetType;
  }
  if (Array.isArray(typeValue)) {
    return typeValue.includes(targetType);
  }
  return false;
}

/**
 * Validates the @context field structure for OB3 VerifiableCredentials.
 * Per OB3 spec, @context can be:
 * - A string (single context URI)
 * - An array of strings or objects
 * - An object (embedded context)
 *
 * When array format, VC context should come first, then OB context.
 *
 * @param context The @context value to validate
 * @returns Object with validation result and optional error message
 */
export function validateOB3Context(context: unknown): {
  valid: boolean;
  error?: string;
} {
  // Check if context exists
  if (context === undefined || context === null) {
    return { valid: false, error: "@context is required" };
  }

  // String format - valid
  if (typeof context === "string") {
    return { valid: true };
  }

  // Array format - check structure and order
  if (Array.isArray(context)) {
    if (context.length === 0) {
      return { valid: false, error: "@context array must not be empty" };
    }

    // All items must be strings or objects
    for (let i = 0; i < context.length; i++) {
      const item = context[i];
      if (
        typeof item !== "string" &&
        (typeof item !== "object" || item === null)
      ) {
        return {
          valid: false,
          error: `@context array item at index ${i} must be a string or object`,
        };
      }
    }

    // For OB3, check that required context URIs are present (warn but allow)
    const stringContexts = context.filter(
      (c): c is string => typeof c === "string",
    );

    // Check for VC context first (should be first element per W3C spec)
    const hasVCContext = stringContexts.some(
      (c) =>
        c === "https://www.w3.org/2018/credentials/v1" ||
        c === "https://www.w3.org/ns/credentials/v2",
    );

    // Check for OB3 context
    const hasOB3Context = stringContexts.some(
      (c) =>
        c.includes("purl.imsglobal.org/spec/ob/v3p0") ||
        c.includes("openbadges.org/spec/ob/v3p0"),
    );

    if (!hasVCContext) {
      return {
        valid: false,
        error: "@context must include W3C Verifiable Credentials context",
      };
    }

    if (!hasOB3Context) {
      return {
        valid: false,
        error: "@context must include Open Badges 3.0 context",
      };
    }

    return { valid: true };
  }

  // Object format (embedded context) - valid if it's an object
  if (typeof context === "object" && context !== null) {
    return { valid: true };
  }

  return {
    valid: false,
    error: "@context must be a string, array, or object",
  };
}

// Type guards for runtime type checking
export function isOB2Assertion(badge: unknown): badge is OB2.Assertion {
  if (typeof badge !== "object" || badge === null) {
    return false;
  }
  const obj = badge as Record<string, unknown>;

  // OB2 spec allows type to be string 'Assertion' or array ['Assertion', ...]
  return (
    "type" in obj &&
    typeIncludes(obj.type, "Assertion") &&
    "recipient" in obj &&
    "badge" in obj &&
    "verification" in obj &&
    "issuedOn" in obj
  );
}

/**
 * Type guard for OB3 VerifiableCredential with @context validation.
 * Validates:
 * - Required fields: @context, type, issuer, validFrom/issuanceDate, credentialSubject
 * - @context format and required URIs (when array format)
 *
 * @param badge The badge to check
 * @param strict If true, validates @context has required URIs. Default: false for backwards compatibility.
 * @returns True if badge is a valid OB3 VerifiableCredential
 */
export function isOB3VerifiableCredential(
  badge: unknown,
  strict = false,
): badge is OB3.VerifiableCredential {
  if (typeof badge !== "object" || badge === null) {
    return false;
  }
  const obj = badge as Record<string, unknown>;

  // Check required fields exist
  if (!("@context" in obj)) {
    return false;
  }
  if (!("type" in obj) || !typeIncludes(obj.type, "VerifiableCredential")) {
    return false;
  }
  if (!("issuer" in obj)) {
    return false;
  }
  if (!("validFrom" in obj) && !("issuanceDate" in obj)) {
    return false;
  }
  if (!("credentialSubject" in obj)) {
    return false;
  }

  // In strict mode, validate @context structure
  if (strict) {
    const contextValidation = validateOB3Context(obj["@context"]);
    if (!contextValidation.valid) {
      return false;
    }
  }

  return true;
}
