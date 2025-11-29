import { isJsonLdObject, hasJsonLdType, hasJsonLdContext, VCContext, OB3Context } from '../shared';
import type {
  VerifiableCredential,
  Issuer,
  CredentialSubject,
  Achievement,
  Proof,
  Evidence,
  Criteria,
  Alignment,
  ResultDescription,
  Results,
  CredentialStatus,
  RefreshService,
  TermsOfUse,
  IdentityObject,
} from './index';

/**
 * Type guard to check if a value is an OB3 VerifiableCredential
 * @param value The value to check
 * @returns True if the value is a valid OB3 VerifiableCredential, false otherwise
 * @see https://www.imsglobal.org/spec/ob/v3p0/#openbadgecredential
 */
export function isVerifiableCredential(value: unknown): value is VerifiableCredential {
  if (!isJsonLdObject(value)) {
    return false;
  }

  // Check for required type properties per OB3 spec
  // Must have both 'VerifiableCredential' and 'OpenBadgeCredential'
  if (!hasJsonLdType(value, 'VerifiableCredential')) {
    return false;
  }
  if (!hasJsonLdType(value, 'OpenBadgeCredential')) {
    return false;
  }

  // Check for required contexts
  // VC should have both the VC context and the OB3 context
  const hasVCContext = hasJsonLdContext(value, VCContext);
  const hasOB3Context = hasJsonLdContext(value, OB3Context);
  if (!hasVCContext || !hasOB3Context) {
    return false;
  }

  return !(
    !('id' in value) ||
    !('issuer' in value) ||
    !('issuanceDate' in value) ||
    !('credentialSubject' in value)
  );
}

/**
 * Type guard to check if a value is an OB3 Issuer
 * @param value The value to check
 * @returns True if the value is a valid OB3 Issuer, false otherwise
 */
export function isIssuer(value: unknown): value is Issuer {
  if (typeof value !== 'object' || value === null) {
    return false;
  }

  // Check for required properties
  if (!('id' in value) || !('name' in value) || !('url' in value)) {
    return false;
  }

  // If it has a type property, check if it's 'Profile'
  if ('type' in value) {
    const type = value.type;
    // Ensure 'type' is either a string or an array of strings
    if (Array.isArray(type)) {
      if (type.every(item => typeof item === 'string')) {
        return type.includes('Profile');
      } else {
        return false; // Invalid array contents
      }
    } else if (typeof type === 'string') {
      return type === 'Profile';
    } else {
      return false; // Unexpected type
    }
  }

  // If no type property or type check failed, still consider it valid if it has the required fields
  return true;
}

/**
 * Type guard to check if a value is an OB3 IdentityObject
 * @param value The value to check
 * @returns True if the value is a valid OB3 IdentityObject, false otherwise
 */
export function isIdentityObject(value: unknown): value is IdentityObject {
  if (typeof value !== 'object' || value === null) {
    return false;
  }

  // Check for required properties
  if (!('identityHash' in value) || typeof value.identityHash !== 'string') {
    return false;
  }

  // If hashed is true, salt is required
  if ('hashed' in value && value.hashed === true) {
    if (!('salt' in value) || typeof value.salt !== 'string') {
      return false;
    }
  }

  return true;
}

/**
 * Type guard to check if a value is an OB3 CredentialSubject
 * @param value The value to check
 * @returns True if the value is a valid OB3 CredentialSubject, false otherwise
 */
export function isCredentialSubject(value: unknown): value is CredentialSubject {
  if (typeof value !== 'object' || value === null) {
    return false;
  }

  // Check for required properties
  return 'achievement' in value;
}

/**
 * Type guard to check if a value is an OB3 Achievement
 * @param value The value to check
 * @returns True if the value is a valid OB3 Achievement, false otherwise
 * @see https://www.imsglobal.org/spec/ob/v3p0/#achievement
 */
export function isAchievement(value: unknown): value is Achievement {
  if (typeof value !== 'object' || value === null) {
    return false;
  }

  // Check for required properties per OB3 spec Section 4.3
  // id, name, description, and criteria are all required
  if (
    !('id' in value) ||
    !('name' in value) ||
    !('description' in value) ||
    !('criteria' in value)
  ) {
    return false;
  }

  // If it has a type property, check if it's 'Achievement'
  if ('type' in value) {
    const type = value.type;
    // Ensure 'type' is either a string or an array of strings
    if (Array.isArray(type)) {
      if (type.every(item => typeof item === 'string')) {
        return type.includes('Achievement');
      } else {
        return false; // Invalid array contents
      }
    } else if (typeof type === 'string') {
      return type === 'Achievement';
    } else {
      return false; // Unexpected type
    }
  }

  // If no type property or type check failed, still consider it valid if it has the required fields
  return true;
}

/**
 * Type guard to check if a value is an OB3 Proof
 * @param value The value to check
 * @returns True if the value is a valid OB3 Proof, false otherwise
 */
export function isProof(value: unknown): value is Proof {
  if (typeof value !== 'object' || value === null) {
    return false;
  }

  // Check for required properties
  return !(
    !('type' in value) ||
    !('created' in value) ||
    !('verificationMethod' in value) ||
    !('proofPurpose' in value)
  );
}

/**
 * Type guard to check if a value is an OB3 Evidence
 * @param value The value to check
 * @returns True if the value is a valid OB3 Evidence, false otherwise
 */
export function isEvidence(value: unknown): value is Evidence {
  if (typeof value !== 'object' || value === null) {
    return false;
  }

  // Check for type if present
  if ('type' in value) {
    const type = value.type;
    if (Array.isArray(type)) {
      // If it's an array, at least one element should be 'Evidence'
      if (!type.includes('Evidence')) {
        return false;
      }
    } else if (typeof type === 'string' && type !== 'Evidence') {
      return false;
    }
  }

  return true;
}

/**
 * Type guard to check if a value is an OB3 Criteria
 * @param value The value to check
 * @returns True if the value is a valid OB3 Criteria, false otherwise
 */
export function isCriteria(value: unknown): value is Criteria {
  if (typeof value !== 'object' || value === null) {
    return false;
  }

  // Check for type if present
  if ('type' in value) {
    const type = value.type;
    if (Array.isArray(type)) {
      // If it's an array, at least one element should be 'Criteria'
      if (!type.includes('Criteria')) {
        return false;
      }
    } else if (typeof type === 'string' && type !== 'Criteria') {
      return false;
    }
  }

  // Check for narrative if present
  if ('narrative' in value && typeof value.narrative !== 'string') {
    return false;
  }

  return true;
}

/**
 * Type guard to check if a value is an OB3 Alignment
 * @param value The value to check
 * @returns True if the value is a valid OB3 Alignment, false otherwise
 */
export function isAlignment(value: unknown): value is Alignment {
  if (typeof value !== 'object' || value === null) {
    return false;
  }

  // Check for required properties
  return !(!('targetName' in value) || !('targetUrl' in value));
}

/**
 * Type guard to check if a value is an OB3 ResultDescription
 * @param value The value to check
 * @returns True if the value is a valid OB3 ResultDescription, false otherwise
 */
export function isResultDescription(value: unknown): value is ResultDescription {
  if (typeof value !== 'object' || value === null) {
    return false;
  }

  // No specific required properties for ResultDescription
  return true;
}

/**
 * Type guard to check if a value is an OB3 Results
 * @param value The value to check
 * @returns True if the value is a valid OB3 Results, false otherwise
 */
export function isResults(value: unknown): value is Results {
  if (typeof value !== 'object' || value === null) {
    return false;
  }

  // No specific required properties for Results
  return true;
}

/**
 * Type guard to check if a value is an OB3 CredentialStatus
 * @param value The value to check
 * @returns True if the value is a valid OB3 CredentialStatus, false otherwise
 */
export function isCredentialStatus(value: unknown): value is CredentialStatus {
  if (typeof value !== 'object' || value === null) {
    return false;
  }

  // Check for required properties
  return !(!('id' in value) || !('type' in value));
}

/**
 * Type guard to check if a value is an OB3 RefreshService
 * @param value The value to check
 * @returns True if the value is a valid OB3 RefreshService, false otherwise
 */
export function isRefreshService(value: unknown): value is RefreshService {
  if (typeof value !== 'object' || value === null) {
    return false;
  }

  // Check for required properties
  return !(!('id' in value) || !('type' in value));
}

/**
 * Type guard to check if a value is an OB3 TermsOfUse
 * @param value The value to check
 * @returns True if the value is a valid OB3 TermsOfUse, false otherwise
 */
export function isTermsOfUse(value: unknown): value is TermsOfUse {
  if (typeof value !== 'object' || value === null) {
    return false;
  }

  // Check for required properties
  return 'type' in value;
}
