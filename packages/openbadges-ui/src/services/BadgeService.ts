// src/services/BadgeService.ts
import type { OB2, OB3, Shared } from '@/types';
import { v4 as uuidv4 } from 'uuid';
import { createIRI, isOB2Assertion, isOB3VerifiableCredential } from '@utils/type-helpers';

/**
 * Utility service for badge-related operations
 */
export class BadgeService {
  /**
   * Creates a new BadgeClass template with default values
   */
  static createBadgeClassTemplate(): OB2.BadgeClass {
    const id = createIRI(`urn:uuid:${uuidv4()}`);
    const emptyImage = {
      id,
      type: 'Image',
    } as OB2.Image;
    return {
      '@context': 'https://w3id.org/openbadges/v2',
      id,
      type: 'BadgeClass',
      name: '',
      description: '',
      image: emptyImage,
      criteria: { narrative: '' },
      issuer: {
        id,
        type: 'Profile',
        name: '',
      },
    };
  }

  /**
   * Creates a new Assertion template with default values
   */
  static createAssertionTemplate(
    badgeClass: OB2.BadgeClass,
    recipientEmail: string
  ): OB2.Assertion {
    const id = `urn:uuid:${uuidv4()}` as Shared.IRI;
    const now = new Date().toISOString() as Shared.DateTime;
    return {
      '@context': 'https://w3id.org/openbadges/v2',
      id,
      type: 'Assertion',
      recipient: {
        identity: recipientEmail,
        type: 'email',
        hashed: false,
      },
      badge: badgeClass,
      issuedOn: now,
      verification: {
        type: 'hosted',
      },
    };
  }

  /**
   * Validates a BadgeClass object
   * @returns Array of validation errors, empty if valid
   */
  static validateBadgeClass(badgeClass: OB2.BadgeClass): string[] {
    const errors: string[] = [];

    if (!badgeClass.id) {
      errors.push('Badge ID is required');
    }
    if (!badgeClass.name) {
      errors.push('Badge name is required');
    }
    if (!badgeClass.description) {
      errors.push('Badge description is required');
    }
    if (!badgeClass.image) {
      errors.push('Badge image is required');
    }
    if (!badgeClass.issuer) {
      errors.push('Issuer is required');
    }
    if (typeof badgeClass.issuer === 'object' && !badgeClass.issuer.name) {
      errors.push('Issuer name is required');
    }

    return errors;
  }

  /**
   * Validates an Assertion object
   * @returns Array of validation errors, empty if valid
   */
  static validateAssertion(assertion: OB2.Assertion): string[] {
    const errors: string[] = [];

    if (!assertion.id) {
      errors.push('Assertion ID is required');
    }
    if (!assertion.badge) {
      errors.push('Badge reference is required');
    }
    if (!assertion.issuedOn) {
      errors.push('Issue date is required');
    }
    if (!assertion.recipient?.identity) {
      errors.push('Recipient identity is required');
    }

    return errors;
  }

  /**
   * Normalizes a badge object (either OB2 or OB3) to a common format for display
   */
  static normalizeBadge(badge: OB2.Assertion | OB3.VerifiableCredential): {
    id: string;
    name: string;
    description: string;
    image: string;
    issuer: {
      name: string;
      url?: string;
      image?: string;
    };
    issuedOn: string;
    expires?: string;
  } {
    if (isOB2Assertion(badge)) {
      // Handle OB2 Assertion
      const badgeClass =
        typeof badge.badge === 'string'
          ? { name: 'Unknown Badge', description: '', image: '' }
          : badge.badge;

      // Handle issuer which could be a string or Profile object
      let issuerName = 'Unknown Issuer';
      let issuerUrl: string | undefined;
      let issuerImage: string | undefined;

      if (typeof badgeClass === 'object' && 'issuer' in badgeClass) {
        if (typeof badgeClass.issuer === 'string') {
          // Issuer is a string reference
          issuerName = 'Unknown Issuer';
        } else if (typeof badgeClass.issuer === 'object') {
          // Issuer is a Profile object
          issuerName = badgeClass.issuer.name;
          issuerUrl = typeof badgeClass.issuer.url === 'string' ? badgeClass.issuer.url : undefined;

          if (badgeClass.issuer.image) {
            if (typeof badgeClass.issuer.image === 'string') {
              issuerImage = badgeClass.issuer.image;
            } else if (
              typeof badgeClass.issuer.image === 'object' &&
              'id' in badgeClass.issuer.image
            ) {
              issuerImage = badgeClass.issuer.image.id as string;
            }
          }
        }
      }

      // Handle image which could be a string or Image object
      let badgeImage = '';
      if (typeof badgeClass === 'object' && 'image' in badgeClass) {
        if (typeof badgeClass.image === 'string') {
          badgeImage = badgeClass.image;
        } else if (typeof badgeClass.image === 'object' && 'id' in badgeClass.image) {
          badgeImage = badgeClass.image.id as string;
        }
      }

      return {
        id: badge.id as string,
        name:
          typeof badgeClass === 'object' && 'name' in badgeClass
            ? badgeClass.name
            : 'Unknown Badge',
        description:
          typeof badgeClass === 'object' && 'description' in badgeClass
            ? badgeClass.description
            : '',
        image: badgeImage,
        issuer: {
          name: issuerName,
          url: issuerUrl,
          image: issuerImage,
        },
        issuedOn: badge.issuedOn as string,
        expires: badge.expires as string | undefined,
      };
    } else if (isOB3VerifiableCredential(badge)) {
      // Handle OB3 VerifiableCredential
      const achievement = badge.credentialSubject.achievement;
      const issuer = badge.issuer;

      // Handle achievement name which could be a string or array
      let achievementName = 'Unknown Badge';
      if (typeof achievement === 'object') {
        if (Array.isArray(achievement)) {
          // If achievement is an array, use the first one's name
          if (achievement.length > 0 && 'name' in achievement[0]) {
            const name = achievement[0].name;
            achievementName = typeof name === 'string' ? name : 'Unknown Badge';
          }
        } else if ('name' in achievement) {
          // Single achievement object
          const name = achievement.name;
          if (typeof name === 'string') {
            achievementName = name;
          } else if (Array.isArray(name) && name.length > 0) {
            achievementName = typeof name[0] === 'string' ? name[0] : 'Unknown Badge';
          }
        }
      }

      // Handle achievement description
      let achievementDescription = '';
      if (
        typeof achievement === 'object' &&
        !Array.isArray(achievement) &&
        'description' in achievement
      ) {
        const description = achievement.description;
        if (typeof description === 'string') {
          achievementDescription = description;
        }
      }

      // Handle achievement image
      let achievementImage = '';
      if (
        typeof achievement === 'object' &&
        !Array.isArray(achievement) &&
        'image' in achievement
      ) {
        const image = achievement.image;
        if (typeof image === 'string') {
          achievementImage = image;
        } else if (typeof image === 'object' && image && 'id' in image) {
          achievementImage = image.id as string;
        }
      }

      // Handle issuer information
      let issuerName = 'Unknown Issuer';
      let issuerUrl: string | undefined;
      let issuerImage: string | undefined;

      if (typeof issuer === 'object') {
        if ('name' in issuer) {
          const name = issuer.name;
          issuerName = typeof name === 'string' ? name : 'Unknown Issuer';
        }

        if ('url' in issuer) {
          issuerUrl = issuer.url as string;
        }

        if ('image' in issuer) {
          const image = issuer.image;
          if (typeof image === 'string') {
            issuerImage = image;
          } else if (typeof image === 'object' && image && 'id' in image) {
            issuerImage = image.id as string;
          }
        }
      }

      return {
        id: badge.id as string,
        name: achievementName,
        description: achievementDescription,
        image: achievementImage,
        issuer: {
          name: issuerName,
          url: issuerUrl,
          image: issuerImage,
        },
        issuedOn: badge.issuanceDate as string,
        expires: badge.expirationDate as string | undefined,
      };
    }

    // Fallback for unknown format
    return {
      id: 'unknown',
      name: 'Unknown Badge',
      description: 'Badge format not recognized',
      image: '',
      issuer: {
        name: 'Unknown Issuer',
      },
      issuedOn: new Date().toISOString(),
    };
  }
}
