// src/services/mockData.ts
import type { OB2, OB3, Shared } from '@/types';

/**
 * Mock data for testing and development
 */

// Mock Issuer
export const mockIssuer: OB2.Profile = {
  '@context': 'https://w3id.org/openbadges/v2',
  id: 'https://example.org/issuer' as Shared.IRI,
  type: 'Profile',
  name: 'Rollercoaster.dev',
  url: 'https://example.org' as Shared.IRI,
  email: 'badges@example.org',
  description: 'An organization dedicated to advancing AI education and certification.',
  image: {
    id: 'https://ui-avatars.com/api/?name=Manus+AI&background=0D8ABC&color=fff' as Shared.IRI,
    type: 'Image',
  },
};

// Mock Badge Classes
export const mockBadgeClasses: OB2.BadgeClass[] = [
  {
    '@context': 'https://w3id.org/openbadges/v2',
    id: 'https://example.org/badges/1' as Shared.IRI,
    type: 'BadgeClass',
    name: 'AI Ethics Fundamentals',
    description:
      'Awarded for demonstrating understanding of core AI ethics principles and their application.',
    image: {
      id: 'https://ui-avatars.com/api/?name=AI+Ethics&background=2A9D8F&color=fff' as Shared.IRI,
      type: 'Image',
    },
    criteria: {
      narrative:
        'Recipients must complete the AI Ethics course and pass the assessment with a score of 80% or higher.',
    },
    issuer: mockIssuer,
    tags: ['ai', 'ethics', 'fundamentals'],
  },
  {
    '@context': 'https://w3id.org/openbadges/v2',
    id: 'https://example.org/badges/2' as Shared.IRI,
    type: 'BadgeClass',
    name: 'Machine Learning Practitioner',
    description:
      'Recognizes proficiency in applying machine learning algorithms to solve real-world problems.',
    image: {
      id: 'https://ui-avatars.com/api/?name=ML+Pro&background=E9C46A&color=000' as Shared.IRI,
      type: 'Image',
    },
    criteria: {
      narrative:
        'Recipients must complete three ML projects demonstrating data preprocessing, model selection, training, evaluation, and deployment.',
    },
    issuer: mockIssuer,
    tags: ['machine learning', 'data science', 'advanced'],
  },
  {
    '@context': 'https://w3id.org/openbadges/v2',
    id: 'https://example.org/badges/3' as Shared.IRI,
    type: 'BadgeClass',
    name: 'Neural Network Architect',
    description:
      'Awarded for expertise in designing and implementing neural network architectures.',
    image: {
      id: 'https://ui-avatars.com/api/?name=NN+Arch&background=E76F51&color=fff' as Shared.IRI,
      type: 'Image',
    },
    criteria: {
      narrative:
        'Recipients must design and implement a custom neural network architecture that achieves state-of-the-art performance on a benchmark task.',
    },
    issuer: mockIssuer,
    tags: ['neural networks', 'deep learning', 'expert'],
  },
];

// Mock Assertions (Issued Badges)
export const mockAssertions: OB2.Assertion[] = [
  {
    '@context': 'https://w3id.org/openbadges/v2',
    id: 'https://example.org/assertions/1001' as Shared.IRI,
    type: 'Assertion',
    recipient: {
      identity: 'alice@example.org',
      type: 'email',
      hashed: false,
    },
    badge: mockBadgeClasses[0],
    issuedOn: '2025-01-15T12:00:00Z' as Shared.DateTime,
    verification: {
      type: 'hosted',
    },
  },
  {
    '@context': 'https://w3id.org/openbadges/v2',
    id: 'https://example.org/assertions/1002' as Shared.IRI,
    type: 'Assertion',
    recipient: {
      identity: 'bob@example.org',
      type: 'email',
      hashed: false,
    },
    badge: mockBadgeClasses[1],
    issuedOn: '2025-02-20T14:30:00Z' as Shared.DateTime,
    verification: {
      type: 'hosted',
    },
  },
  {
    '@context': 'https://w3id.org/openbadges/v2',
    id: 'https://example.org/assertions/1003' as Shared.IRI,
    type: 'Assertion',
    recipient: {
      identity: 'alice@example.org',
      type: 'email',
      hashed: false,
    },
    badge: mockBadgeClasses[2],
    issuedOn: '2025-03-10T09:15:00Z' as Shared.DateTime,
    verification: {
      type: 'hosted',
    },
  },
];

// Mock OB3 Achievement
export const mockOB3Achievement: OB3.Achievement = {
  type: ['Achievement'],
  id: 'https://example.org/achievements/4' as Shared.IRI,
  name: 'Responsible AI Developer',
  description:
    'Awarded for demonstrating expertise in developing AI systems that are ethical, fair, and transparent.',
  criteria: {
    narrative:
      'Recipients must complete the Responsible AI course and implement a project that addresses bias, fairness, and explainability.',
  },
  image: {
    id: 'https://ui-avatars.com/api/?name=Resp+AI&background=264653&color=fff' as Shared.IRI,
    type: 'Image',
  },
};

// Mock OB3 Verifiable Credential
export const mockOB3Credential: OB3.VerifiableCredential = {
  '@context': [
    'https://www.w3.org/2018/credentials/v1',
    'https://purl.imsglobal.org/spec/ob/v3p0/context.json',
  ],
  id: 'https://example.org/credentials/2001' as Shared.IRI,
  type: ['VerifiableCredential', 'OpenBadgeCredential'],
  issuer: {
    id: 'https://example.org/issuers/manus' as Shared.IRI,
    type: ['Profile'],
    name: 'Rollercoaster.dev',
    url: 'https://example.org' as Shared.IRI,
    image: {
      id: 'https://ui-avatars.com/api/?name=Manus+AI&background=0D8ABC&color=fff' as Shared.IRI,
      type: 'Image',
    },
  },
  validFrom: '2025-04-01T10:00:00Z' as Shared.DateTime,
  credentialSubject: {
    id: 'did:example:ebfeb1f712ebc6f1c276e12ec21' as Shared.IRI,
    achievement: mockOB3Achievement,
  },
};

// Mock Profiles
export const mockProfiles: Record<
  string,
  {
    id: string;
    name: string;
    image?: string;
    description?: string;
    url?: string;
    email?: string;
    type: 'Issuer' | 'Recipient';
    badges: (OB2.Assertion | OB3.VerifiableCredential)[];
  }
> = {
  alice: {
    id: 'https://example.org/recipients/alice',
    name: 'Alice Johnson',
    image: 'https://ui-avatars.com/api/?name=Alice+J&background=553C9A&color=fff',
    description: 'AI researcher and machine learning enthusiast',
    email: 'alice@example.org',
    type: 'Recipient',
    badges: [mockAssertions[0], mockAssertions[2], mockOB3Credential],
  },
  bob: {
    id: 'https://example.org/recipients/bob',
    name: 'Bob Smith',
    image: 'https://ui-avatars.com/api/?name=Bob+S&background=2B6CB0&color=fff',
    description: 'Data scientist specializing in neural networks',
    email: 'bob@example.org',
    type: 'Recipient',
    badges: [mockAssertions[1]],
  },
  manus: {
    id: 'https://example.org/issuer',
    name: 'Rollercoaster.dev',
    image: 'https://ui-avatars.com/api/?name=Manus+AI&background=0D8ABC&color=fff',
    description: 'An organization dedicated to advancing AI education and certification.',
    url: 'https://example.org',
    email: 'badges@example.org',
    type: 'Issuer',
    badges: mockAssertions,
  },
};
