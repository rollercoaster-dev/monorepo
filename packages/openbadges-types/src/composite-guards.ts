import * as OB2 from './v2/index';
import * as OB3 from './v3/index';

/**
 * Type representing either an OB2 Assertion or OB3 VerifiableCredential
 */
export type Badge = OB2.Assertion | OB3.VerifiableCredential;

/**
 * Type guard to check if a value is a valid Badge (either OB2 or OB3)
 * @param value The value to check
 * @returns True if the value is a valid Badge, false otherwise
 */
export function isBadge(value: unknown): value is Badge {
  return OB2.isAssertion(value) || OB3.isVerifiableCredential(value);
}

/**
 * Type guard to check if a value is a valid OB2 BadgeClass or embedded in an OB2 Assertion
 * @param value The value to check
 * @returns True if the value is a valid BadgeClass, false otherwise
 */
export function getBadgeClass(badge: Badge): OB2.BadgeClass | null {
  if (OB2.isAssertion(badge)) {
    if (typeof badge.badge === 'string') {
      // This is a reference to a BadgeClass, would need to be fetched
      return null;
    }
    return badge.badge;
  }
  return null;
}

/**
 * Type guard to check if a value is a valid OB3 Achievement or embedded in an OB3 VerifiableCredential
 * @param value The value to check
 * @returns True if the value is a valid Achievement, false otherwise
 */
export function getAchievement(badge: Badge): OB3.Achievement | null {
  if (OB3.isVerifiableCredential(badge)) {
    const achievement = badge.credentialSubject.achievement;
    if (Array.isArray(achievement)) {
      return achievement[0] ?? null; // Return the first achievement if it's an array
    }
    return achievement ?? null;
  }
  return null;
}

/**
 * Gets the name of a badge, regardless of whether it's OB2 or OB3
 * @param badge The badge to get the name from
 * @returns The name of the badge, or null if it couldn't be determined
 */
export function getBadgeName(badge: Badge): string | null {
  if (OB2.isAssertion(badge)) {
    const badgeClass = getBadgeClass(badge);
    return badgeClass?.name || null;
  } else if (OB3.isVerifiableCredential(badge)) {
    const achievement = getAchievement(badge);
    if (!achievement) return null;

    if (typeof achievement.name === 'string') {
      return achievement.name;
    } else if (achievement.name) {
      // Handle multi-language string by returning the first value
      return Object.values(achievement.name)[0] || null;
    }
  }
  return null;
}

/**
 * Gets the description of a badge, regardless of whether it's OB2 or OB3
 * @param badge The badge to get the description from
 * @returns The description of the badge, or null if it couldn't be determined
 */
export function getBadgeDescription(badge: Badge): string | null {
  if (OB2.isAssertion(badge)) {
    const badgeClass = getBadgeClass(badge);
    return badgeClass?.description || null;
  } else if (OB3.isVerifiableCredential(badge)) {
    const achievement = getAchievement(badge);
    if (!achievement) return null;

    if (typeof achievement.description === 'string') {
      return achievement.description;
    } else if (achievement.description) {
      // Handle multi-language string by returning the first value
      return Object.values(achievement.description)[0] || null;
    }
  }
  return null;
}

/**
 * Gets the image URL of a badge, regardless of whether it's OB2 or OB3
 * @param badge The badge to get the image from
 * @returns The image URL of the badge, or null if it couldn't be determined
 */
export function getBadgeImageUrl(badge: Badge): string | null {
  if (OB2.isAssertion(badge)) {
    const badgeClass = getBadgeClass(badge);
    if (!badgeClass) return null;

    if (typeof badgeClass.image === 'string') {
      return badgeClass.image;
    } else if (badgeClass.image && 'id' in badgeClass.image && badgeClass.image.id) {
      return String(badgeClass.image.id);
    }
  } else if (OB3.isVerifiableCredential(badge)) {
    const achievement = getAchievement(badge);
    if (!achievement) return null;

    if (typeof achievement.image === 'string') {
      return achievement.image;
    } else if (achievement.image && 'id' in achievement.image && achievement.image.id) {
      return String(achievement.image.id);
    }
  }
  return null;
}

/**
 * Gets the issuer of a badge, regardless of whether it's OB2 or OB3
 * @param badge The badge to get the issuer from
 * @returns The issuer of the badge, or null if it couldn't be determined
 */
export function getBadgeIssuer(badge: Badge): OB2.Profile | OB3.Issuer | null {
  if (OB2.isAssertion(badge)) {
    const badgeClass = getBadgeClass(badge);
    if (!badgeClass) return null;

    if (typeof badgeClass.issuer === 'string') {
      // This is a reference to an issuer, would need to be fetched
      return null;
    }
    return badgeClass.issuer;
  } else if (OB3.isVerifiableCredential(badge)) {
    if (typeof badge.issuer === 'string') {
      // This is a reference to an issuer, would need to be fetched
      return null;
    }
    return badge.issuer;
  }
  return null;
}

/**
 * Gets the issuer name of a badge, regardless of whether it's OB2 or OB3
 * @param badge The badge to get the issuer name from
 * @returns The issuer name of the badge, or null if it couldn't be determined
 */
export function getBadgeIssuerName(badge: Badge): string | null {
  const issuer = getBadgeIssuer(badge);
  if (!issuer) return null;

  if (typeof issuer.name === 'string') {
    return issuer.name;
  } else if (issuer.name) {
    // Handle multi-language string by returning the first value
    return Object.values(issuer.name)[0] || null;
  }

  return null;
}

/**
 * Gets the issuance date of a badge, regardless of whether it's OB2 or OB3
 * @param badge The badge to get the issuance date from
 * @returns The issuance date of the badge, or null if it couldn't be determined
 */
export function getBadgeIssuanceDate(badge: Badge): string | null {
  if (OB2.isAssertion(badge)) {
    return badge.issuedOn;
  } else if (OB3.isVerifiableCredential(badge)) {
    return badge.issuanceDate;
  }
  return null;
}

/**
 * Gets the expiration date of a badge, regardless of whether it's OB2 or OB3
 * @param badge The badge to get the expiration date from
 * @returns The expiration date of the badge, or null if it doesn't have one
 */
export function getBadgeExpirationDate(badge: Badge): string | null {
  if (OB2.isAssertion(badge)) {
    return badge.expires || null;
  } else if (OB3.isVerifiableCredential(badge)) {
    return badge.expirationDate || null;
  }
  return null;
}

/**
 * Checks if a badge is expired, regardless of whether it's OB2 or OB3
 * @param badge The badge to check
 * @returns True if the badge is expired, false otherwise
 */
export function isBadgeExpired(badge: Badge): boolean {
  const expirationDate = getBadgeExpirationDate(badge);
  if (!expirationDate) return false;

  const now = new Date();
  const expiration = new Date(expirationDate);

  return now > expiration;
}

/**
 * Gets the recipient of a badge, regardless of whether it's OB2 or OB3
 * @param badge The badge to get the recipient from
 * @returns The recipient of the badge, or null if it couldn't be determined
 */
export function getBadgeRecipient(badge: Badge): OB2.IdentityObject | OB3.CredentialSubject | null {
  if (OB2.isAssertion(badge)) {
    return badge.recipient;
  } else if (OB3.isVerifiableCredential(badge)) {
    return badge.credentialSubject;
  }
  return null;
}

/**
 * Gets the recipient identity of a badge, regardless of whether it's OB2 or OB3
 * @param badge The badge to get the recipient identity from
 * @returns The recipient identity of the badge, or null if it couldn't be determined
 */
export function getBadgeRecipientIdentity(badge: Badge): string | null {
  if (OB2.isAssertion(badge)) {
    return badge.recipient.identity;
  } else if (OB3.isVerifiableCredential(badge)) {
    return badge.credentialSubject.id || null;
  }
  return null;
}

/**
 * Gets the criteria of a badge, regardless of whether it's OB2 or OB3
 * @param badge The badge to get the criteria from
 * @returns The criteria of the badge, or null if it couldn't be determined
 */
export function getBadgeCriteria(badge: Badge): OB2.Criteria | OB3.Criteria | null {
  if (OB2.isAssertion(badge)) {
    const badgeClass = getBadgeClass(badge);
    if (!badgeClass) return null;

    if (typeof badgeClass.criteria === 'string') {
      // This is a reference to criteria, would need to be fetched
      return null;
    }
    return badgeClass.criteria;
  } else if (OB3.isVerifiableCredential(badge)) {
    const achievement = getAchievement(badge);
    if (!achievement) return null;

    return achievement.criteria || null;
  }
  return null;
}

/**
 * Gets the criteria narrative of a badge, regardless of whether it's OB2 or OB3
 * @param badge The badge to get the criteria narrative from
 * @returns The criteria narrative of the badge, or null if it couldn't be determined
 */
export function getBadgeCriteriaNarrative(badge: Badge): string | null {
  const criteria = getBadgeCriteria(badge);
  if (!criteria) return null;

  if ('narrative' in criteria) {
    if (typeof criteria.narrative === 'string') {
      return criteria.narrative;
    }
  }

  return null;
}

/**
 * Gets the evidence of a badge, regardless of whether it's OB2 or OB3
 * @param badge The badge to get the evidence from
 * @returns The evidence of the badge, or null if it couldn't be determined
 */
export function getBadgeEvidence(badge: Badge): OB2.Evidence | OB3.Evidence | null {
  if (OB2.isAssertion(badge)) {
    if (!badge.evidence) return null;

    if (Array.isArray(badge.evidence)) {
      // Filter out IRI values, return the first Evidence if present
      const evidence = badge.evidence.find(e => typeof e !== 'string');
      return evidence ?? null;
    } else if (typeof badge.evidence === 'string') {
      // This is a reference to evidence, would need to be fetched
      return null;
    }
    return badge.evidence;
  } else if (OB3.isVerifiableCredential(badge)) {
    if (!badge.evidence) return null;

    if (Array.isArray(badge.evidence)) {
      // Filter out IRI values, return the first Evidence if present
      const evidence = badge.evidence.find(e => typeof e !== 'string');
      return evidence ?? null;
    }
    return badge.evidence;
  }
  return null;
}

/**
 * Gets the version of a badge
 * @param badge The badge to get the version from
 * @returns '2.0' for OB2 badges, '3.0' for OB3 badges, or null if it couldn't be determined
 */
export function getBadgeVersion(badge: Badge): '2.0' | '3.0' | null {
  if (OB2.isAssertion(badge)) {
    return '2.0';
  } else if (OB3.isVerifiableCredential(badge)) {
    return '3.0';
  }
  return null;
}
