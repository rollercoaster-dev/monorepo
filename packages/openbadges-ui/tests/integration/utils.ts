// tests/integration/utils.ts

import { mount } from '@vue/test-utils';
import type { Component } from 'vue';
import type { OB2, OB3, Shared } from 'openbadges-types';
import { createIRI, createDateTime } from '@/utils/type-helpers';

/**
 * Creates a test wrapper with the specified component and props
 * @param component The component to mount
 * @param props The props to pass to the component
 * @param options Additional mount options
 * @returns The mounted wrapper
 */
export function createWrapper<T extends Component>(
  component: T,
  props: Record<string, unknown> = {},
  options: Record<string, unknown> = {}
) {
  // Use type assertion to handle the props type mismatch
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  return mount(component as any, {
    props,
    ...options,
  });
}

/**
 * Creates a mock OB2 badge assertion for testing
 * @param overrides Properties to override in the default mock badge
 * @returns A mock OB2 badge assertion
 */
export function createMockOB2Badge(overrides: Partial<OB2.Assertion> = {}): OB2.Assertion {
  const baseAssertion: OB2.Assertion = {
    '@context': 'https://w3id.org/openbadges/v2',
    type: 'Assertion',
    id: createIRI('http://example.org/badge1'),
    recipient: {
      identity: 'test@example.org',
      type: 'email',
      hashed: false,
    },
    badge: {
      type: 'BadgeClass',
      id: createIRI('http://example.org/badgeclass1'),
      name: 'Test Badge',
      description: 'A test badge description',
      image: createIRI('http://example.org/badge.png'), // Can also be an Image object
      criteria: createIRI('http://example.org/badgeclass1/criteria'), // Can also be a Criteria object
      issuer: {
        type: 'Profile',
        id: createIRI('http://example.org/issuer'),
        name: 'Test Issuer',
      },
    },
    issuedOn: createDateTime('2023-01-01T00:00:00Z'),
    verification: {
      type: 'hosted',
    },
  };

  // Merge base with overrides. If a nested object like 'badge' is in overrides,
  // it will replace the entire 'badge' from baseAssertion.
  const result: OB2.Assertion = {
    ...baseAssertion,
    ...overrides,
  };

  // Now, ensure specific fields are correctly typed if they were part of `overrides` as plain strings.

  // Top-level properties
  if (typeof overrides.id === 'string') {
    result.id = createIRI(overrides.id);
  }
  if (typeof overrides.issuedOn === 'string') {
    result.issuedOn = createDateTime(overrides.issuedOn);
  }
  if (typeof overrides.expires === 'string') {
    result.expires = createDateTime(overrides.expires);
  }
  if (typeof overrides.image === 'string') {
    // Top-level image for Assertion
    result.image = createIRI(overrides.image);
  }

  // Nested 'badge' property
  if (overrides.badge) {
    if (typeof overrides.badge === 'string') {
      result.badge = createIRI(overrides.badge);
    } else {
      // overrides.badge is an object
      const badgeObjectInResult = result.badge as OB2.BadgeClass; // It's an object after the spread
      if (typeof overrides.badge.id === 'string') {
        badgeObjectInResult.id = createIRI(overrides.badge.id);
      }
      if (typeof overrides.badge.image === 'string') {
        badgeObjectInResult.image = createIRI(overrides.badge.image);
      }
      if (typeof overrides.badge.criteria === 'string') {
        badgeObjectInResult.criteria = createIRI(overrides.badge.criteria);
      }
      // Nested 'issuer' within 'badge'
      if (overrides.badge.issuer) {
        if (typeof overrides.badge.issuer === 'string') {
          badgeObjectInResult.issuer = createIRI(overrides.badge.issuer);
        } else {
          // overrides.badge.issuer is an object
          const issuerObjectInBadge = badgeObjectInResult.issuer as OB2.Profile;
          if (typeof overrides.badge.issuer.id === 'string') {
            issuerObjectInBadge.id = createIRI(overrides.badge.issuer.id);
          }
          if (typeof overrides.badge.issuer.image === 'string') {
            issuerObjectInBadge.image = createIRI(overrides.badge.issuer.image);
          }
          if (typeof overrides.badge.issuer.url === 'string') {
            issuerObjectInBadge.url = createIRI(overrides.badge.issuer.url);
          }
        }
      }
    }
  }

  // Nested 'evidence' property (can be IRI, Evidence, or array)
  if (overrides.evidence) {
    if (typeof overrides.evidence === 'string') {
      result.evidence = createIRI(overrides.evidence);
    } else if (Array.isArray(overrides.evidence)) {
      // Handle evidence as an array
      result.evidence = overrides.evidence.map((e) =>
        typeof e === 'string' ? createIRI(e) : e
      ) as Array<Shared.IRI | OB2.Evidence>;
    } else {
      // It's an Evidence object
      const evidenceObjectInResult = result.evidence as OB2.Evidence;
      if (typeof overrides.evidence.id === 'string') {
        evidenceObjectInResult.id = createIRI(overrides.evidence.id);
      }
    }
  }

  return result;
}

/**
 * Creates a mock OB3 verifiable credential for testing
 * @param overrides Properties to override in the default mock credential
 * @returns A mock OB3 verifiable credential
 */
export function createMockOB3Badge(
  overrides: Partial<OB3.VerifiableCredential> = {}
): OB3.VerifiableCredential {
  const baseCredential: OB3.VerifiableCredential = {
    '@context': [
      'https://www.w3.org/2018/credentials/v1',
      'https://purl.imsglobal.org/spec/ob/v3p0/context.json',
    ],
    id: createIRI('http://example.org/credentials/3732'),
    type: ['VerifiableCredential', 'OpenBadgeCredential'],
    issuer: {
      // Issuer in OB3 is an object by default or an IRI
      type: 'Profile',
      id: createIRI('http://example.org/issuers/1'),
      name: 'Test Issuer',
      url: createIRI('http://example.org/issuers/1/profile'),
    },
    issuanceDate: createDateTime('2023-01-01T00:00:00Z'),
    credentialSubject: {
      // id for credentialSubject is optional, can be IRI
      // id: createIRI('did:example:ebfeb1f712ebc6f1c276e12ec21'),
      type: 'AchievementSubject',
      achievement: {
        id: createIRI('http://example.org/achievements/1'),
        type: 'Achievement',
        name: 'Test Badge',
        description: 'A test badge description',
        image: {
          // Image in OB3 Achievement is an Image Object
          id: createIRI('http://example.org/badge.png'),
          type: 'Image',
        },
        // criteria for achievement can be IRI or Criteria object
        // criteria: createIRI('http://example.org/achievements/1/criteria')
      },
    },
    proof: {
      // Proof structure can vary. This is a common example.
      type: 'Ed25519Signature2020',
      created: createDateTime('2023-01-01T00:00:00Z'),
      verificationMethod: createIRI('http://example.org/issuers/1#keys/1'),
      proofPurpose: 'assertionMethod',
      proofValue:
        'z58DAdFfa9SkqZMVPxAQpic6FPCsJWa6SpsfDLnfWE3SV8mZ9qqLH81imXXAiLnJwkoXkgZ1xQ24zQ6yVsQFKR29D',
    },
  };

  const result: OB3.VerifiableCredential = {
    ...baseCredential,
    ...overrides,
  };

  // Top-level properties
  if (typeof overrides.id === 'string') {
    result.id = createIRI(overrides.id);
  }
  if (typeof overrides.issuanceDate === 'string') {
    result.issuanceDate = createDateTime(overrides.issuanceDate);
  }
  if (typeof overrides.expirationDate === 'string') {
    result.expirationDate = createDateTime(overrides.expirationDate);
  }

  // Nested 'issuer' property
  if (overrides.issuer) {
    if (typeof overrides.issuer === 'string') {
      result.issuer = createIRI(overrides.issuer);
    } else {
      // overrides.issuer is an object
      const issuerObjectInResult = result.issuer as OB3.Issuer;
      if (typeof overrides.issuer.id === 'string') {
        issuerObjectInResult.id = createIRI(overrides.issuer.id);
      }
      if (typeof overrides.issuer.url === 'string') {
        issuerObjectInResult.url = createIRI(overrides.issuer.url);
      }
      if (overrides.issuer.image && typeof overrides.issuer.image === 'string') {
        // OB3 issuer can have image (IRI | ImageObject)
        issuerObjectInResult.image = createIRI(overrides.issuer.image);
      } else if (overrides.issuer.image && typeof overrides.issuer.image !== 'string') {
        // ImageObject
        const imageObjInIssuer = issuerObjectInResult.image as Shared.ImageObject;
        if (typeof (overrides.issuer.image as Shared.ImageObject).id === 'string') {
          const imageId = (overrides.issuer.image as Shared.ImageObject).id as string;
          imageObjInIssuer.id = createIRI(imageId);
        }
      }
    }
  }

  // Nested 'credentialSubject' and its 'achievement'
  if (overrides.credentialSubject) {
    const csInResult = result.credentialSubject as OB3.CredentialSubject; // Already an object from spread
    if (typeof overrides.credentialSubject.id === 'string') {
      csInResult.id = createIRI(overrides.credentialSubject.id);
    }
    if (overrides.credentialSubject.achievement) {
      // achievement is an object
      const achInCs = csInResult.achievement as OB3.Achievement; // Already an object

      // Handle achievement as a single object (not an array)
      const achievementObj = overrides.credentialSubject.achievement as OB3.Achievement;

      if (achievementObj && typeof achievementObj.id === 'string') {
        achInCs.id = createIRI(achievementObj.id);
      }

      if (achievementObj && achievementObj.image && typeof achievementObj.image !== 'string') {
        const imgInAch = achInCs.image as Shared.OB3ImageObject; // Already an object
        const imageObj = achievementObj.image as Shared.OB3ImageObject;

        if (imageObj && typeof imageObj.id === 'string') {
          imgInAch.id = createIRI(imageObj.id);
        }
      }

      if (achievementObj && typeof achievementObj.criteria === 'string') {
        // Create a criteria object instead of using IRI directly
        achInCs.criteria = {
          id: createIRI(achievementObj.criteria),
          narrative: 'Criteria from test',
        };
      }
      // Potentially other Achievement properties like related, tags etc.
    }
  }

  // Nested 'proof' property
  if (overrides.proof && typeof overrides.proof !== 'string') {
    // proof is an object
    const proofInResult = result.proof as OB3.Proof; // Already an object
    if (typeof overrides.proof.created === 'string') {
      proofInResult.created = createDateTime(overrides.proof.created);
    }
    if (typeof overrides.proof.verificationMethod === 'string') {
      proofInResult.verificationMethod = createIRI(overrides.proof.verificationMethod);
    }
  }

  // Nested 'credentialStatus' property (e.g. StatusList2021CredentialStatus)
  if (overrides.credentialStatus && typeof overrides.credentialStatus !== 'string') {
    const statusInResult = result.credentialStatus as OB3.CredentialStatus; // Properly typed as OB3.CredentialStatus
    if (typeof overrides.credentialStatus.id === 'string') {
      statusInResult.id = createIRI(overrides.credentialStatus.id);
    }
  }

  return result;
}

/**
 * Waits for a condition to be true
 * @param condition The condition to wait for
 * @param timeout The maximum time to wait in milliseconds
 * @returns A promise that resolves when the condition is true
 */
export async function waitFor(
  condition: () => boolean | Promise<boolean>,
  timeout = 1000
): Promise<void> {
  const start = Date.now();
  while (Date.now() - start < timeout) {
    if (await condition()) {
      return;
    }
    await new Promise((resolve) => setTimeout(resolve, 50));
  }
  throw new Error(`Timeout waiting for condition after ${timeout}ms`);
}
