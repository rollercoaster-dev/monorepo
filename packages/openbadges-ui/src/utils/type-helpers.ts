// src/utils/type-helpers.ts
import type { OB2, OB3, Shared } from '@/types';

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
    if (typeof value !== 'object' || value === null) {return false;}
    const obj = value as Record<string, unknown>;
    return 'type' in obj && 'identity' in obj;
  },

  isVerificationObject: (value: unknown): value is OB2.VerificationObject => {
    if (typeof value !== 'object' || value === null) {return false;}
    const obj = value as Record<string, unknown>;
    return 'type' in obj;
  },

  isEvidence: (value: unknown): value is OB2.Evidence => {
    if (typeof value !== 'object' || value === null) {return false;}
    // OB2 Evidence is a flexible object with no strict required props
    return true;
  },

  isAlignmentObject: (value: unknown): value is OB2.AlignmentObject => {
    if (typeof value !== 'object' || value === null) {return false;}
    const obj = value as Record<string, unknown>;
    return 'targetName' in obj && 'targetUrl' in obj;
  },

  isImage: (value: unknown): value is OB2.Image => {
    if (typeof value !== 'object' || value === null) {return false;}
    // OB2 Image is a flexible object with no strict required props
    return true;
  },

  isCriteria: (value: unknown): value is OB2.Criteria => {
    if (typeof value !== 'object' || value === null) {return false;}
    // OB2 Criteria is a flexible object with no strict required props
    return true;
  },
};

export const OB3Guards = {
  isProof: (value: unknown): value is OB3.Proof => {
    if (typeof value !== 'object' || value === null) {return false;}
    const obj = value as Record<string, unknown>;
    return 'type' in obj;
  },

  isCredentialStatus: (value: unknown): value is OB3.CredentialStatus => {
    if (typeof value !== 'object' || value === null) {return false;}
    const obj = value as Record<string, unknown>;
    return 'id' in obj && 'type' in obj;
  },

  isIssuer: (value: unknown): value is OB3.Issuer => {
    if (typeof value !== 'object' || value === null) {return false;}
    const obj = value as Record<string, unknown>;
    return 'id' in obj && 'type' in obj;
  },

  isCredentialSubject: (value: unknown): value is OB3.CredentialSubject => {
    if (typeof value !== 'object' || value === null) {return false;}
    const obj = value as Record<string, unknown>;
    return 'id' in obj || 'achievement' in obj;
  },

  isAchievement: (value: unknown): value is OB3.Achievement => {
    if (typeof value !== 'object' || value === null) {return false;}
    const obj = value as Record<string, unknown>;
    return 'id' in obj && 'type' in obj;
  },

  isCriteria: (value: unknown): value is OB3.Criteria => {
    if (typeof value !== 'object' || value === null) {return false;}
    const obj = value as Record<string, unknown>;
    return 'narrative' in obj || 'id' in obj;
  },

  isRefreshService: (value: unknown): value is OB3.RefreshService => {
    if (typeof value !== 'object' || value === null) {return false;}
    const obj = value as Record<string, unknown>;
    return 'id' in obj && 'type' in obj;
  },

  isTermsOfUse: (value: unknown): value is OB3.TermsOfUse => {
    if (typeof value !== 'object' || value === null) {return false;}
    const obj = value as Record<string, unknown>;
    return 'type' in obj;
  },

  isEvidence: (value: unknown): value is OB3.Evidence => {
    if (typeof value !== 'object' || value === null) {return false;}
    const obj = value as Record<string, unknown>;
    return 'type' in obj || 'id' in obj;
  },
};

// Helper to check if a type value includes a specific type string
// Handles both string and array forms per OB2/OB3 spec
function typeIncludes(typeValue: unknown, targetType: string): boolean {
  if (typeof typeValue === 'string') {
    return typeValue === targetType;
  }
  if (Array.isArray(typeValue)) {
    return typeValue.includes(targetType);
  }
  return false;
}

// Type guards for runtime type checking
export function isOB2Assertion(badge: unknown): badge is OB2.Assertion {
  if (typeof badge !== 'object' || badge === null) {return false;}
  const obj = badge as Record<string, unknown>;

  // OB2 spec allows type to be string 'Assertion' or array ['Assertion', ...]
  return (
    'type' in obj &&
    typeIncludes(obj.type, 'Assertion') &&
    'recipient' in obj &&
    'badge' in obj &&
    'verification' in obj &&
    'issuedOn' in obj
  );
}

export function isOB3VerifiableCredential(badge: unknown): badge is OB3.VerifiableCredential {
  if (typeof badge !== 'object' || badge === null) {return false;}
  const obj = badge as Record<string, unknown>;

  // OB3 spec allows type to be string 'VerifiableCredential' or array ['VerifiableCredential', ...]
  return (
    '@context' in obj &&
    'type' in obj &&
    typeIncludes(obj.type, 'VerifiableCredential') &&
    'issuer' in obj &&
    'issuanceDate' in obj &&
    'credentialSubject' in obj
  );
}

// Export a dummy value to make the module recognized
export const __moduleMarker = true;
