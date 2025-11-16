/**
 * Basic Usage Examples for Open Badges Types
 *
 * This file demonstrates basic usage of the Open Badges Types package,
 * including creating and working with Open Badges 2.0 and 3.0 types.
 */

import { OB2, OB3, Shared, OpenBadgesVersion, VersionedBadge } from '../src';

// Helper function to create branded types
const createIRI = (value: string): Shared.IRI => value as Shared.IRI;
const createDateTime = (value: string): Shared.DateTime => value as Shared.DateTime;

/**
 * Example 1: Creating an Open Badges 2.0 Assertion
 */
function createOB2Example() {
  // Create a BadgeClass
  const badgeClass: OB2.BadgeClass = {
    '@context': 'https://w3id.org/openbadges/v2',
    id: createIRI('https://example.org/badges/5'),
    type: 'BadgeClass',
    name: 'Advanced Coding Badge',
    description: 'This badge is awarded for demonstrating advanced coding skills.',
    image: createIRI('https://example.org/badges/5/image'),
    criteria: {
      narrative: 'Recipients must complete a complex coding project that demonstrates understanding of advanced programming concepts.'
    },
    issuer: {
      id: createIRI('https://example.org/issuer'),
      type: 'Profile',
      name: 'Code Academy',
      url: createIRI('https://example.org'),
      email: 'contact@example.org',
      verification: {
        type: 'hosted',
        allowedOrigins: 'example.org'
      }
    },
    alignment: [
      {
        targetName: 'ISTE Standard 5: Computational Thinker',
        targetUrl: createIRI('https://www.iste.org/standards/for-students')
      }
    ],
    tags: ['coding', 'programming', 'advanced']
  };

  // Create an Assertion
  const assertion: OB2.Assertion = {
    '@context': 'https://w3id.org/openbadges/v2',
    id: createIRI('https://example.org/assertions/123'),
    type: 'Assertion',
    recipient: {
      type: 'email',
      identity: 'student@example.org',
      hashed: false
    },
    issuedOn: createDateTime('2023-06-15T12:00:00Z'),
    expires: createDateTime('2026-06-15T12:00:00Z'),
    verification: {
      type: 'hosted'
    },
    badge: badgeClass,
    evidence: [
      {
        id: createIRI('https://example.org/evidence/123'),
        name: 'Project Repository',
        description: 'GitHub repository containing the completed project',
        genre: 'Repository',
        audience: 'Evaluators',
        narrative: 'This repository contains a complex web application that demonstrates advanced coding skills.'
      }
    ]
  };

  console.log('Open Badges 2.0 Assertion created:', assertion);
  return assertion;
}

/**
 * Example 2: Creating an Open Badges 3.0 Verifiable Credential
 */
function createOB3Example() {
  // Create an Achievement
  const achievement: OB3.Achievement = {
    type: ['Achievement'],
    name: {
      en: 'Advanced Coding Badge',
      es: 'Insignia de Codificación Avanzada'
    },
    description: {
      en: 'This badge is awarded for demonstrating advanced coding skills.',
      es: 'Esta insignia se otorga por demostrar habilidades avanzadas de codificación.'
    },
    criteria: {
      narrative: 'Recipients must complete a complex coding project that demonstrates understanding of advanced programming concepts.'
    },
    image: createIRI('https://example.org/badges/5/image'),
    alignments: [
      {
        targetName: 'ISTE Standard 5: Computational Thinker',
        targetUrl: createIRI('https://www.iste.org/standards/for-students')
      }
    ]
  };

  // Create a Verifiable Credential
  const credential: OB3.VerifiableCredential = {
    '@context': [
      'https://www.w3.org/2018/credentials/v1',
      'https://purl.imsglobal.org/spec/ob/v3p0/context.json'
    ],
    id: createIRI('https://example.org/credentials/3732'),
    type: ['VerifiableCredential'],
    issuer: {
      id: createIRI('https://example.org/issuers/123'),
      type: ['Profile'],
      name: 'Code Academy',
      url: createIRI('https://example.org'),
      email: 'contact@example.org'
    },
    issuanceDate: createDateTime('2023-06-15T12:00:00Z'),
    expirationDate: createDateTime('2026-06-15T12:00:00Z'),
    credentialSubject: {
      id: createIRI('did:example:ebfeb1f712ebc6f1c276e12ec21'),
      achievement: achievement,
      results: {
        resultDescription: 'https://example.org/results/advanced-coding',
        status: 'Achieved',
        value: 95
      }
    },
    evidence: [
      {
        id: createIRI('https://example.org/evidence/123'),
        name: {
          en: 'Project Repository',
          es: 'Repositorio del Proyecto'
        },
        description: {
          en: 'GitHub repository containing the completed project',
          es: 'Repositorio de GitHub que contiene el proyecto completado'
        },
        genre: 'Repository',
        audience: 'Evaluators',
        narrative: 'This repository contains a complex web application that demonstrates advanced coding skills.'
      }
    ],
    proof: {
      type: 'Ed25519Signature2020',
      created: createDateTime('2023-06-15T12:05:00Z'),
      verificationMethod: createIRI('https://example.org/issuers/123#keys-1'),
      proofPurpose: 'assertionMethod',
      proofValue: 'z58DAdFfa9SkqZMVPxAQpic6FPCsJWa6SpsfDqwmUbHEVnWxeh'
    }
  };

  console.log('Open Badges 3.0 Verifiable Credential created:', credential);
  return credential;
}

/**
 * Example 3: Using Shared Types
 */
function usingSharedTypes() {
  // Create branded types
  const iri: Shared.IRI = createIRI('https://example.org/badges/5');
  const dateTime: Shared.DateTime = createDateTime('2023-06-15T12:00:00Z');

  // Create a JSON-LD object
  const jsonLdObject: Shared.JsonLdObject = {
    '@context': 'https://example.org/context',
    type: 'Example',
    id: 'https://example.org/example/1'
  };

  // Create a multi-language string
  const multiLanguageString: Shared.MultiLanguageString = {
    en: 'Hello, world!',
    es: '¡Hola, mundo!',
    fr: 'Bonjour, monde!'
  };

  // Create an image object
  const imageObject: Shared.ImageObject = {
    id: createIRI('https://example.org/images/1'),
    type: 'Image',
    caption: multiLanguageString,
    author: 'John Doe'
  };

  console.log('Shared types example:', {
    iri,
    dateTime,
    jsonLdObject,
    multiLanguageString,
    imageObject
  });
}

/**
 * Example 4: Version-Agnostic Badge Processing
 */
function versionAgnosticProcessing() {
  // Create badges of both versions
  const ob2Badge = createOB2Example();
  const ob3Badge = createOB3Example();

  // Function that works with either version
  function getBadgeName<T extends OpenBadgesVersion>(
    badge: VersionedBadge<T>,
    version: T
  ): string {
    if (version === OpenBadgesVersion.V2) {
      // badge is typed as OB2.Assertion
      const ob2Badge = badge as OB2.Assertion;
      const badgeClass = typeof ob2Badge.badge === 'string'
        ? { name: 'Unknown' } // In a real app, you would fetch the BadgeClass
        : ob2Badge.badge;
      return badgeClass.name;
    } else {
      // badge is typed as OB3.VerifiableCredential
      const ob3Badge = badge as OB3.VerifiableCredential;
      const achievement = ob3Badge.credentialSubject.achievement;

      if (Array.isArray(achievement)) {
        return typeof achievement[0].name === 'string'
          ? achievement[0].name
          : Object.values(achievement[0].name)[0]; // Get first language value
      } else {
        return typeof achievement.name === 'string'
          ? achievement.name
          : Object.values(achievement.name)[0]; // Get first language value
      }
    }
  }

  // Process both versions
  const ob2Name = getBadgeName(ob2Badge, OpenBadgesVersion.V2);
  const ob3Name = getBadgeName(ob3Badge, OpenBadgesVersion.V3);

  console.log('OB2 Badge Name:', ob2Name);
  console.log('OB3 Badge Name:', ob3Name);
}

// Run all examples
function runAllExamples() {
  console.log('=== Example 1: Creating an Open Badges 2.0 Assertion ===');
  createOB2Example();

  console.log('\n=== Example 2: Creating an Open Badges 3.0 Verifiable Credential ===');
  createOB3Example();

  console.log('\n=== Example 3: Using Shared Types ===');
  usingSharedTypes();

  console.log('\n=== Example 4: Version-Agnostic Badge Processing ===');
  versionAgnosticProcessing();
}

// If this file is run directly, run all examples
if (require.main === module) {
  runAllExamples();
}

// Export examples for use in other files
export {
  createOB2Example,
  createOB3Example,
  usingSharedTypes,
  versionAgnosticProcessing
};
