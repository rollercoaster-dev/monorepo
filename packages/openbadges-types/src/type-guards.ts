/**
 * Direct exports of commonly used type guards
 * This file provides a convenient way to import type guards without namespace prefixes
 */

// Import from OB2
import {
  isAssertion as isOB2Assertion,
  isBadgeClass as isOB2BadgeClass,
  isProfile as isOB2Profile,
} from "./v2/guards";

// Import from OB3
import {
  isVerifiableCredential as isOB3VerifiableCredential,
  isAchievement as isOB3Achievement,
  isIssuer as isOB3Issuer,
} from "./v3/guards";

// Import from shared
import {
  isJsonLdObject,
  hasJsonLdType,
  hasJsonLdContext,
  typeIncludes,
} from "./shared/jsonld";
import { isIRI, isDateTime } from "./shared/common";

// Import from composite-guards
import { isBadge } from "./composite-guards";

// Re-export all type guards
export {
  // OB2 type guards
  isOB2Assertion,
  isOB2BadgeClass,
  isOB2Profile,

  // OB3 type guards
  isOB3VerifiableCredential,
  isOB3Achievement,
  isOB3Issuer,

  // Shared type guards
  isJsonLdObject,
  hasJsonLdType,
  hasJsonLdContext,
  typeIncludes,
  isIRI,
  isDateTime,

  // Composite type guards
  isBadge,
};
