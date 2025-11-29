import { isJsonLdObject, hasJsonLdType } from '../shared';
import type {
  Assertion,
  BadgeClass,
  Profile,
  IdentityObject,
  VerificationObject,
  Evidence,
  AlignmentObject,
  Image,
  Criteria,
  RevocationList,
  CryptographicKey,
} from './index';

/**
 * Type guard to check if a value is an OB2 Assertion
 * @param value The value to check
 * @returns True if the value is a valid OB2 Assertion, false otherwise
 */
export function isAssertion(value: unknown): value is Assertion {
  if (!isJsonLdObject(value)) {
    return false;
  }

  // Check for required properties
  if (!hasJsonLdType(value, 'Assertion')) {
    return false;
  }

  // Check for required fields
  if (
    !('id' in value) ||
    !('recipient' in value) ||
    !('badge' in value) ||
    !('verification' in value) ||
    !('issuedOn' in value)
  ) {
    return false;
  }

  // issuedOn must be a string
  if (!('issuedOn' in value) || typeof value.issuedOn !== 'string') {
    return false;
  }

  // recipient must be a valid IdentityObject
  if (!('recipient' in value) || !isIdentityObject(value.recipient)) {
    return false;
  }

  // badge must be a string (IRI) or valid BadgeClass
  if (!('badge' in value)) {
    return false;
  }
  const badge = value.badge;
  if (!(typeof badge === 'string' || isBadgeClass(badge))) {
    return false;
  }

  // verification must be a valid VerificationObject
  if (!('verification' in value) || !isVerificationObject(value.verification)) {
    return false;
  }

  return true;
}

/**
 * Type guard to check if a value is an OB2 BadgeClass
 * @param value The value to check
 * @returns True if the value is a valid OB2 BadgeClass, false otherwise
 */
export function isBadgeClass(value: unknown): value is BadgeClass {
  if (typeof value !== 'object' || value === null) {
    return false;
  }

  // Check for required properties
  // For embedded BadgeClass objects, they might not have @context,
  // but they should have type property
  if (
    !('type' in value) ||
    (Array.isArray(value.type) ? !value.type.includes('BadgeClass') : value.type !== 'BadgeClass')
  ) {
    return false;
  }

  return !(
    !('id' in value) ||
    !('name' in value) ||
    !('description' in value) ||
    !('image' in value) ||
    !('criteria' in value) ||
    !('issuer' in value)
  );
}

/**
 * Type guard to check if a value is an OB2 Profile
 * @param value The value to check
 * @returns True if the value is a valid OB2 Profile, false otherwise
 */
export function isProfile(value: unknown): value is Profile {
  if (typeof value !== 'object' || value === null) {
    return false;
  }

  // Check for required properties
  // For embedded Profile objects, they might not have @context,
  // but they should have type property
  if (!('type' in value)) {
    return false;
  }

  // Check if type is Profile or Issuer
  const type = value.type;
  const isProfileType = Array.isArray(type)
    ? type.includes('Profile') || type.includes('Issuer')
    : type === 'Profile' || type === 'Issuer';

  if (!isProfileType) {
    return false;
  }

  return !(!('id' in value) || !('name' in value));
}

/**
 * Type guard to check if a value is an OB2 IdentityObject
 * @param value The value to check
 * @returns True if the value is a valid OB2 IdentityObject, false otherwise
 */
export function isIdentityObject(value: unknown): value is IdentityObject {
  if (typeof value !== 'object' || value === null) {
    return false;
  }

  // Check for required properties and types
  if (!('type' in value) || typeof value.type !== 'string') {
    return false;
  }
  if (!('identity' in value) || typeof value.identity !== 'string') {
    return false;
  }

  return true;
}

/**
 * Type guard to check if a value is an OB2 VerificationObject
 * @param value The value to check
 * @returns True if the value is a valid OB2 VerificationObject, false otherwise
 */
export function isVerificationObject(value: unknown): value is VerificationObject {
  if (typeof value !== 'object' || value === null) {
    return false;
  }

  // Check for required properties
  return 'type' in value;
}

/**
 * Type guard to check if a value is an OB2 Evidence
 * @param value The value to check
 * @returns True if the value is a valid OB2 Evidence, false otherwise
 */
export function isEvidence(value: unknown): value is Evidence {
  // OB2 Evidence has no required properties per spec
  // https://www.imsglobal.org/sites/default/files/Badges/OBv2p0Final/index.html#Evidence
  return typeof value === 'object' && value !== null;
}

/**
 * Type guard to check if a value is an OB2 AlignmentObject
 * @param value The value to check
 * @returns True if the value is a valid OB2 AlignmentObject, false otherwise
 */
export function isAlignmentObject(value: unknown): value is AlignmentObject {
  if (typeof value !== 'object' || value === null) {
    return false;
  }

  // Check for required properties
  return !(!('targetName' in value) || !('targetUrl' in value));
}

/**
 * Type guard to check if a value is an OB2 Image
 * @param value The value to check
 * @returns True if the value is a valid OB2 Image, false otherwise
 */
export function isImage(value: unknown): value is Image {
  if (typeof value !== 'object' || value === null) {
    return false;
  }

  // OB2 Image requires id (the image URL) per spec
  // https://www.imsglobal.org/sites/default/files/Badges/OBv2p0Final/index.html#Image
  return 'id' in value && typeof (value as Record<string, unknown>).id === 'string';
}

/**
 * Type guard to check if a value is an OB2 Criteria
 * @param value The value to check
 * @returns True if the value is a valid OB2 Criteria, false otherwise
 */
export function isCriteria(value: unknown): value is Criteria {
  if (typeof value !== 'object' || value === null) {
    return false;
  }

  // OB2 Criteria requires id (URL to criteria page) OR narrative per spec
  // https://www.imsglobal.org/sites/default/files/Badges/OBv2p0Final/index.html#Criteria
  return 'id' in value || 'narrative' in value;
}

/**
 * Type guard to check if a value is an OB2 RevocationList
 * @param value The value to check
 * @returns True if the value is a valid OB2 RevocationList, false otherwise
 */
export function isRevocationList(value: unknown): value is RevocationList {
  if (!isJsonLdObject(value)) {
    return false;
  }

  // Check for required properties
  if (!hasJsonLdType(value, 'RevocationList')) {
    return false;
  }

  return !(!('id' in value) || !('revokedAssertions' in value));
}

/**
 * Type guard to check if a value is an OB2 CryptographicKey
 * @param value The value to check
 * @returns True if the value is a valid OB2 CryptographicKey, false otherwise
 */
export function isCryptographicKey(value: unknown): value is CryptographicKey {
  if (!isJsonLdObject(value)) {
    return false;
  }

  // Check for required properties
  if (!hasJsonLdType(value, 'CryptographicKey')) {
    return false;
  }

  return !(!('id' in value) || !('owner' in value));
}
