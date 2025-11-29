import * as OB2 from './v2/index';
import * as OB3 from './v3/index';
import * as Shared from './shared/index';

/**
 * Result of a badge validation
 */
export interface ValidationResult {
  isValid: boolean;
  errors: string[];
  warnings: string[];
  version?: 'OB2' | 'OB3';
}

/**
 * Validates a badge against the Open Badges specification
 * @param badge The badge to validate
 * @returns A validation result object
 */
export function validateBadge(badge: unknown): ValidationResult {
  const result: ValidationResult = {
    isValid: false,
    errors: [],
    warnings: [],
  };

  // Check if the badge is an object
  if (typeof badge !== 'object' || badge === null) {
    result.errors.push('Badge must be an object');
    return result;
  }

  // Check if the badge is a valid JSON-LD object
  if (!Shared.isJsonLdObject(badge)) {
    result.errors.push('Badge must be a valid JSON-LD object with @context and type properties');
    return result;
  }

  // Check if the badge is an OB2 Assertion
  if (OB2.isAssertion(badge)) {
    result.isValid = true;
    result.version = 'OB2';

    // Validate required properties according to the OB2 specification
    validateOB2Assertion(badge, result);

    return result;
  }

  // Check if the badge is an OB3 VerifiableCredential
  if (OB3.isVerifiableCredential(badge)) {
    result.isValid = true;
    result.version = 'OB3';

    // Validate required properties according to the OB3 specification
    validateOB3VerifiableCredential(badge, result);

    return result;
  }

  result.errors.push('Badge is not a valid OB2 Assertion or OB3 VerifiableCredential');
  return result;
}

/**
 * Validates an OB2 Assertion against the Open Badges specification
 * @param assertion The assertion to validate
 * @param result The validation result to update
 */
function validateOB2Assertion(assertion: OB2.Assertion, result: ValidationResult): void {
  // Validate id
  if (!Shared.isIRI(assertion.id)) {
    result.errors.push('Assertion id must be a valid IRI');
    result.isValid = false;
  }

  // Validate issuedOn
  if (!Shared.isDateTime(assertion.issuedOn)) {
    result.errors.push('Assertion issuedOn must be a valid DateTime in ISO 8601 format');
    result.isValid = false;
  }

  // Validate recipient
  if (!OB2.isIdentityObject(assertion.recipient)) {
    result.errors.push('Assertion recipient must be a valid IdentityObject');
    result.isValid = false;
  }

  // Validate verification
  if (!OB2.isVerificationObject(assertion.verification)) {
    result.errors.push('Assertion verification must be a valid VerificationObject');
    result.isValid = false;
  }

  // Validate badge
  if (!OB2.isBadgeClass(assertion.badge)) {
    result.errors.push('Assertion badge must be a valid BadgeClass');
    result.isValid = false;
  } else {
    // Validate BadgeClass
    validateOB2BadgeClass(assertion.badge, result);
  }

  // Validate optional properties
  if (
    assertion.evidence &&
    !Array.isArray(assertion.evidence) &&
    !OB2.isEvidence(assertion.evidence)
  ) {
    result.warnings.push(
      'Assertion evidence should be a valid Evidence object or array of Evidence objects'
    );
  }

  if (assertion.expires && !Shared.isDateTime(assertion.expires)) {
    result.warnings.push('Assertion expires should be a valid DateTime in ISO 8601 format');
  }
}

/**
 * Validates an OB2 BadgeClass against the Open Badges specification
 * @param badgeClass The BadgeClass to validate
 * @param result The validation result to update
 */
function validateOB2BadgeClass(badgeClass: OB2.BadgeClass, result: ValidationResult): void {
  // Validate id
  if (!Shared.isIRI(badgeClass.id)) {
    result.errors.push('BadgeClass id must be a valid IRI');
    result.isValid = false;
  }

  // Validate name
  if (typeof badgeClass.name !== 'string' || badgeClass.name.trim() === '') {
    result.errors.push('BadgeClass name must be a non-empty string');
    result.isValid = false;
  }

  // Validate description
  if (typeof badgeClass.description !== 'string' || badgeClass.description.trim() === '') {
    result.errors.push('BadgeClass description must be a non-empty string');
    result.isValid = false;
  }

  // Validate image
  if (!Shared.isIRI(badgeClass.image) && typeof badgeClass.image !== 'object') {
    result.errors.push('BadgeClass image must be a valid IRI or Image object');
    result.isValid = false;
  }

  // Validate criteria
  if (!OB2.isCriteria(badgeClass.criteria)) {
    result.errors.push('BadgeClass criteria must be a valid Criteria object');
    result.isValid = false;
  }

  // Validate issuer
  if (!OB2.isProfile(badgeClass.issuer)) {
    result.errors.push('BadgeClass issuer must be a valid Profile');
    result.isValid = false;
  } else {
    // Validate Issuer Profile
    validateOB2Profile(badgeClass.issuer, result);
  }

  // Validate optional properties
  if (
    badgeClass.alignment &&
    !Array.isArray(badgeClass.alignment) &&
    !OB2.isAlignmentObject(badgeClass.alignment)
  ) {
    result.warnings.push(
      'BadgeClass alignment should be a valid AlignmentObject or array of AlignmentObjects'
    );
  }
}

/**
 * Validates an OB2 Profile against the Open Badges specification
 * @param profile The Profile to validate
 * @param result The validation result to update
 */
function validateOB2Profile(profile: OB2.Profile, result: ValidationResult): void {
  // Validate id
  if (!Shared.isIRI(profile.id)) {
    result.errors.push('Profile id must be a valid IRI');
    result.isValid = false;
  }

  // Validate name
  if (typeof profile.name !== 'string' || profile.name.trim() === '') {
    result.errors.push('Profile name must be a non-empty string');
    result.isValid = false;
  }

  // For issuers, additional properties are required
  if (
    profile.type === 'Issuer' ||
    (Array.isArray(profile.type) && profile.type.includes('Issuer'))
  ) {
    // Validate url
    if (!profile.url || !Shared.isIRI(profile.url)) {
      result.errors.push('Issuer Profile url must be a valid IRI');
      result.isValid = false;
    }

    // Validate email
    if (!profile.email || typeof profile.email !== 'string' || !profile.email.includes('@')) {
      result.errors.push('Issuer Profile email must be a valid email address');
      result.isValid = false;
    }
  }
}

/**
 * Validates an OB3 VerifiableCredential against the Open Badges specification
 * @param credential The VerifiableCredential to validate
 * @param result The validation result to update
 */
function validateOB3VerifiableCredential(
  credential: OB3.VerifiableCredential,
  result: ValidationResult
): void {
  // Validate id
  if (!Shared.isIRI(credential.id)) {
    result.errors.push('VerifiableCredential id must be a valid IRI');
    result.isValid = false;
  }

  // Validate validFrom (was issuanceDate in VC 1.0)
  if (!Shared.isDateTime(credential.validFrom)) {
    result.errors.push(
      'VerifiableCredential validFrom must be a valid DateTime in ISO 8601 format'
    );
    result.isValid = false;
  }

  // Validate issuer
  if (!OB3.isIssuer(credential.issuer)) {
    result.errors.push('VerifiableCredential issuer must be a valid Issuer');
    result.isValid = false;
  }

  // Validate credentialSubject
  if (!OB3.isCredentialSubject(credential.credentialSubject)) {
    result.errors.push('VerifiableCredential credentialSubject must be a valid CredentialSubject');
    result.isValid = false;
  } else {
    // Validate Achievement
    if (!OB3.isAchievement(credential.credentialSubject.achievement)) {
      result.errors.push('CredentialSubject achievement must be a valid Achievement');
      result.isValid = false;
    }
  }

  // Validate proof if present
  if (credential.proof && !OB3.isProof(credential.proof)) {
    result.errors.push('VerifiableCredential proof must be a valid Proof');
    result.isValid = false;
  }
}
