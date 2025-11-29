import type { OB2, OB3} from '../src';
import { Shared } from '../src';

/**
 * Helper functions to create valid test objects
 */

// OB2 Helpers
export const createOB2Assertion = (overrides?: Partial<OB2.Assertion>): OB2.Assertion => {
  return {
    '@context': 'https://w3id.org/openbadges/v2',
    id: Shared.createIRI('https://example.org/assertions/123'),
    type: 'Assertion',
    recipient: {
      type: 'email',
      identity: 'alice@example.org',
    },
    issuedOn: Shared.createDateTime('2016-12-31T23:59:59+00:00'),
    verification: {
      type: 'hosted',
    },
    badge: {
      id: Shared.createIRI('https://example.org/badges/5'),
      type: 'BadgeClass',
      name: '3-D Printmaster',
      description: 'This badge is awarded for passing the 3-D printing knowledge and safety test.',
      image: Shared.createIRI('https://example.org/badges/5/image'),
      criteria: {
        narrative:
          'Students are tested on knowledge and safety, both through a paper test and a supervised performance evaluation on key skills.',
      },
      issuer: {
        id: Shared.createIRI('https://example.org/issuer'),
        type: 'Profile',
        name: 'Example Maker Society',
        url: Shared.createIRI('https://example.org'),
        email: 'contact@example.org',
        verification: {
          type: 'hosted',
          allowedOrigins: 'example.org',
        },
      },
    },
    ...overrides,
  };
};

// OB3 Helpers
export const createOB3Achievement = (overrides?: Partial<OB3.Achievement>): OB3.Achievement => {
  return {
    '@context': 'https://purl.imsglobal.org/spec/ob/v3p0/context.json',
    id: Shared.createIRI('https://example.org/achievements/1'),
    type: ['Achievement'],
    name: '3-D Printmaster',
    description: 'This badge is awarded for passing the 3-D printing knowledge and safety test.',
    criteria: {
      narrative:
        'Students are tested on knowledge and safety, both through a paper test and a supervised performance evaluation on key skills.',
    },
    ...overrides,
  };
};

export const createOB3Issuer = (overrides?: Partial<OB3.Issuer>): OB3.Issuer => {
  return {
    '@context': 'https://purl.imsglobal.org/spec/ob/v3p0/context.json',
    id: Shared.createIRI('https://example.org/issuers/123'),
    type: ['Profile'],
    name: 'Example Maker Society',
    url: Shared.createIRI('https://example.org'),
    email: 'contact@example.org',
    ...overrides,
  };
};

export const createOB3VerifiableCredential = (
  overrides?: Partial<OB3.VerifiableCredential>
): OB3.VerifiableCredential => {
  return {
    '@context': [
      'https://www.w3.org/2018/credentials/v1',
      'https://purl.imsglobal.org/spec/ob/v3p0/context.json',
    ],
    id: Shared.createIRI('https://example.org/credentials/3732'),
    type: ['VerifiableCredential', 'OpenBadgeCredential'],
    issuer: createOB3Issuer(),
    validFrom: Shared.createDateTime('2023-06-15T12:00:00Z'),
    credentialSubject: {
      id: Shared.createIRI('did:example:ebfeb1f712ebc6f1c276e12ec21'),
      achievement: createOB3Achievement(),
    },
    ...overrides,
  };
};

// OB3 Achievement sample objects
export const validOB3Achievement = {
  id: Shared.createIRI('https://example.org/achievements/1'),
  type: ['Achievement'],
  name: 'Sample Achievement',
  description: 'A valid OB3 achievement',
  criteria: { narrative: 'Do something great.' },
};

export const invalidOB3Achievement = {
  // Missing required 'id', 'name', 'description', and 'criteria' per OB3 spec
  type: ['Achievement'],
};

// OB3 Issuer sample objects
export const validOB3Issuer = {
  id: Shared.createIRI('https://example.org/issuers/1'),
  type: ['Profile'],
  name: 'Sample Issuer',
  url: Shared.createIRI('https://example.org'),
};

export const invalidOB3Issuer = {
  // Missing required 'id' and 'name'
  type: ['Profile'],
  url: Shared.createIRI('https://example.org'),
};

// OB3 CredentialSubject sample objects
export const validOB3CredentialSubject = {
  id: Shared.createIRI('did:example:subject1'),
  achievement: validOB3Achievement,
};

export const invalidOB3CredentialSubject = {
  // Missing required 'achievement'
  id: Shared.createIRI('did:example:subject1'),
};

// OB2 Assertion sample objects
export const validOB2Assertion: OB2.Assertion = createOB2Assertion();
export const invalidOB2Assertion = {
  '@context': 'https://w3id.org/openbadges/v2',
  type: 'Assertion',
  // Missing required fields: id, recipient, issuedOn, verification, badge
};

// OB2 BadgeClass sample objects
export const validOB2BadgeClass: OB2.BadgeClass = validOB2Assertion.badge as OB2.BadgeClass;
export const invalidOB2BadgeClass = {
  '@context': 'https://w3id.org/openbadges/v2',
  type: 'BadgeClass',
  // Missing required fields: id, name, description, criteria, issuer
};

// OB2 Profile sample objects
export const validOB2Profile: OB2.Profile = validOB2BadgeClass.issuer as OB2.Profile;
export const invalidOB2Profile = {
  '@context': 'https://w3id.org/openbadges/v2',
  type: 'Profile',
  // Missing required fields: id, name, url
};

// OB2 IdentityObject sample objects
export const validOB2IdentityObject: OB2.IdentityObject = validOB2Assertion.recipient;
export const invalidOB2IdentityObject = {
  type: 'email',
  // Missing required field: identity
};

// OB2 VerificationObject sample objects
export const validOB2VerificationObject: OB2.VerificationObject = validOB2Assertion.verification;
export const invalidOB2VerificationObject = {
  // Missing required field: type
};
