// @ts-nocheck
/**
 * Version Conversion Examples for Open Badges Types
 *
 * This file demonstrates how to convert between Open Badges 2.0 and 3.0 formats
 * using the Open Badges Types package.
 */

import { OB2, OB3, Shared, OpenBadgesVersion } from '../src';
import { createOB2Example, createOB3Example } from './basic-usage';

// Helper function to create branded types
const createIRI = (value: string): Shared.IRI => value as Shared.IRI;

/**
 * Example 1: Converting from Open Badges 2.0 to 3.0
 */
function convertOB2toOB3Example() {
  // Get a valid OB2 Assertion
  const ob2Assertion = createOB2Example();

  // Convert to OB3
  const ob3Credential = convertOB2toOB3(ob2Assertion);

  console.log('Original OB2 Assertion:', JSON.stringify(ob2Assertion, null, 2));
  console.log('Converted OB3 VerifiableCredential:', JSON.stringify(ob3Credential, null, 2));

  return ob3Credential;
}

/**
 * Example 2: Converting from Open Badges 3.0 to 2.0
 */
function convertOB3toOB2Example() {
  // Get a valid OB3 VerifiableCredential
  const ob3Credential = createOB3Example();

  // Convert to OB2
  const ob2Assertion = convertOB3toOB2(ob3Credential);

  console.log('Original OB3 VerifiableCredential:', JSON.stringify(ob3Credential, null, 2));
  console.log('Converted OB2 Assertion:', JSON.stringify(ob2Assertion, null, 2));

  return ob2Assertion;
}

/**
 * Example 3: Round-trip conversion (OB2 -> OB3 -> OB2)
 */
function roundTripConversionExample() {
  // Get a valid OB2 Assertion
  const originalOB2 = createOB2Example();

  // Convert to OB3
  const convertedOB3 = convertOB2toOB3(originalOB2);

  // Convert back to OB2
  const roundTripOB2 = convertOB3toOB2(convertedOB3);

  console.log('Original OB2 Assertion ID:', originalOB2.id);
  console.log('Round-trip OB2 Assertion ID:', roundTripOB2.id);

  // Compare the original and round-trip versions
  const originalName = typeof originalOB2.badge === 'string'
    ? 'Unknown' // In a real app, you would fetch the BadgeClass
    : originalOB2.badge.name;

  const roundTripName = typeof roundTripOB2.badge === 'string'
    ? 'Unknown' // In a real app, you would fetch the BadgeClass
    : roundTripOB2.badge.name;

  console.log('Original Badge Name:', originalName);
  console.log('Round-trip Badge Name:', roundTripName);
  console.log('Names match:', originalName === roundTripName);
}

/**
 * Converts an Open Badges 2.0 Assertion to an Open Badges 3.0 VerifiableCredential
 */
function convertOB2toOB3(assertion: OB2.Assertion): OB3.VerifiableCredential {
  // Extract the BadgeClass (either directly or by reference)
  const badgeClass = typeof assertion.badge === 'string'
    ? {
        name: 'Unknown Badge',
        description: 'Badge details not available',
        image: createIRI('https://example.org/placeholder-image'),
        criteria: { narrative: 'Criteria not available' },
        issuer: { id: createIRI('https://example.org/issuer'), type: 'Profile', name: 'Unknown Issuer' }
      } // In a real app, you would fetch the BadgeClass
    : assertion.badge;

  // Create the Achievement from the BadgeClass
  const achievement: OB3.Achievement = {
    type: ['Achievement'],
    name: badgeClass.name,
    description: badgeClass.description,
    criteria: badgeClass.criteria,
    image: typeof badgeClass.image === 'string' ? createIRI(badgeClass.image) : badgeClass.image.id,
    alignments: []  // In a real implementation, you would map from badgeClass.alignment if available
  };

  // Create the issuer from the BadgeClass issuer
  const issuer = typeof badgeClass.issuer === 'string'
    ? { id: badgeClass.issuer, type: ['Profile'] }
    : {
        id: badgeClass.issuer.id,
        type: Array.isArray(badgeClass.issuer.type)
          ? badgeClass.issuer.type
          : [badgeClass.issuer.type],
        name: badgeClass.issuer.name,
        url: typeof badgeClass.issuer === 'object' && 'url' in badgeClass.issuer ? createIRI(badgeClass.issuer.url as string) : undefined,
        email: typeof badgeClass.issuer === 'object' && 'email' in badgeClass.issuer ? badgeClass.issuer.email as string : undefined
      };

  // Convert recipient to credentialSubject
  // Note: In a real implementation, you might want to convert email identities to DIDs
  const recipientId = assertion.recipient.hashed
    ? `did:example:${Buffer.from(assertion.recipient.identity).toString('hex')}`
    : `did:email:${assertion.recipient.identity}`;

  // Create the VerifiableCredential
  const credential: OB3.VerifiableCredential = {
    '@context': [
      'https://www.w3.org/2018/credentials/v1',
      'https://purl.imsglobal.org/spec/ob/v3p0/context.json'
    ],
    id: assertion.id,
    type: ['VerifiableCredential'],
    issuer: issuer,
    issuanceDate: assertion.issuedOn,
    expirationDate: assertion.expires,
    credentialSubject: {
      id: createIRI(recipientId),
      achievement: achievement
    },
    // Create a basic proof (in a real app, you would generate a proper cryptographic proof)
    proof: {
      type: 'Ed25519Signature2020',
      created: assertion.issuedOn,
      verificationMethod: createIRI(`${issuer.id.toString()}#keys-1`),
      proofPurpose: 'assertionMethod',
      proofValue: 'z58DAdFfa9SkqZMVPxAQpic6FPCsJWa6SpsfDqwmUbHEVnWxeh'
    }
  };

  // Copy over evidence if it exists
  if (assertion.evidence) {
    credential.evidence = assertion.evidence;
  }

  return credential;
}

/**
 * Converts an Open Badges 3.0 VerifiableCredential to an Open Badges 2.0 Assertion
 */
function convertOB3toOB2(credential: OB3.VerifiableCredential): OB2.Assertion {
  // Extract the Achievement
  const achievement = Array.isArray(credential.credentialSubject.achievement)
    ? credential.credentialSubject.achievement[0]
    : credential.credentialSubject.achievement;

  // Create a BadgeClass from the Achievement
  const badgeClass: OB2.BadgeClass = {
    '@context': 'https://w3id.org/openbadges/v2',
    id: createIRI(`${credential.id}/badge`),
    type: 'BadgeClass',
    name: typeof achievement.name === 'string'
      ? achievement.name
      : Object.values(achievement.name)[0], // Get first language value
    description: typeof achievement.description === 'string'
      ? achievement.description
      : achievement.description
        ? Object.values(achievement.description)[0] // Get first language value
        : 'No description provided',
    image: achievement.image ? (typeof achievement.image === 'string' ? createIRI(achievement.image) : achievement.image) : createIRI('https://example.org/placeholder-image'),
    criteria: achievement.criteria || { narrative: 'Criteria not available' },
    issuer: typeof credential.issuer === 'string'
      ? credential.issuer
      : {
          id: credential.issuer.id,
          type: 'Profile',
          name: typeof credential.issuer.name === 'string' ? credential.issuer.name : 'Unknown Issuer',
          url: credential.issuer.url,
          email: credential.issuer.email || ''
        },
    alignment: achievement.alignments
  };

  // Extract recipient information from credentialSubject
  const recipientId = credential.credentialSubject.id || 'unknown';

  // Create the Assertion
  const assertion: OB2.Assertion = {
    '@context': 'https://w3id.org/openbadges/v2',
    id: credential.id,
    type: 'Assertion',
    recipient: {
      type: recipientId.startsWith('did:email:') ? 'email' : 'id',
      identity: recipientId.startsWith('did:email:')
        ? recipientId.replace('did:email:', '')
        : recipientId,
      hashed: false
    },
    issuedOn: credential.issuanceDate,
    expires: credential.expirationDate,
    verification: {
      type: 'hosted'
    },
    badge: badgeClass
  };

  // Copy over evidence if it exists
  if (credential.evidence) {
    // Handle evidence conversion - this is simplified for the example
    // In a real implementation, you would need to handle this more carefully
    if (credential.evidence) {
      if (Array.isArray(credential.evidence)) {
        assertion.evidence = credential.evidence[0].id || createIRI('https://example.org/evidence/default');
      } else {
        assertion.evidence = credential.evidence.id || createIRI('https://example.org/evidence/default');
      }
    }
  }

  return assertion;
}

/**
 * Example 4: Version detection and automatic conversion
 */
function versionDetectionExample() {
  // Function to detect badge version and convert if needed
  function processAnyBadge(badgeData: unknown, targetVersion: OpenBadgesVersion): unknown {
    // Check if it's a valid badge
    if (!Shared.isJsonLdObject(badgeData)) {
      throw new Error('Invalid badge data: Not a JSON-LD object');
    }

    // Detect the version
    if (OB2.isAssertion(badgeData)) {
      console.log('Detected OB2 Assertion');

      // Convert if needed
      if (targetVersion === OpenBadgesVersion.V3) {
        console.log('Converting to OB3...');
        return convertOB2toOB3(badgeData);
      }

      return badgeData;
    }

    if (OB3.isVerifiableCredential(badgeData)) {
      console.log('Detected OB3 VerifiableCredential');

      // Convert if needed
      if (targetVersion === OpenBadgesVersion.V2) {
        console.log('Converting to OB2...');
        return convertOB3toOB2(badgeData);
      }

      return badgeData;
    }

    throw new Error('Invalid badge data: Not a recognized badge format');
  }

  // Test with both badge versions
  const ob2Badge = createOB2Example();
  const ob3Badge = createOB3Example();

  // Process OB2 badge, targeting OB3
  console.log('Processing OB2 badge to OB3:');
  const ob2ToOb3 = processAnyBadge(ob2Badge, OpenBadgesVersion.V3);
  console.log('Result type:', OB3.isVerifiableCredential(ob2ToOb3) ? 'OB3 VerifiableCredential' : 'Unknown');

  // Process OB3 badge, targeting OB2
  console.log('\nProcessing OB3 badge to OB2:');
  const ob3ToOb2 = processAnyBadge(ob3Badge, OpenBadgesVersion.V2);
  console.log('Result type:', OB2.isAssertion(ob3ToOb2) ? 'OB2 Assertion' : 'Unknown');

  // Process OB2 badge, targeting OB2 (no conversion)
  console.log('\nProcessing OB2 badge to OB2 (no conversion):');
  const ob2ToOb2 = processAnyBadge(ob2Badge, OpenBadgesVersion.V2);
  console.log('Result type:', OB2.isAssertion(ob2ToOb2) ? 'OB2 Assertion' : 'Unknown');

  // Process OB3 badge, targeting OB3 (no conversion)
  console.log('\nProcessing OB3 badge to OB3 (no conversion):');
  const ob3ToOb3 = processAnyBadge(ob3Badge, OpenBadgesVersion.V3);
  console.log('Result type:', OB3.isVerifiableCredential(ob3ToOb3) ? 'OB3 VerifiableCredential' : 'Unknown');
}

// Run all examples
function runAllExamples() {
  console.log('=== Example 1: Converting from Open Badges 2.0 to 3.0 ===');
  convertOB2toOB3Example();

  console.log('\n=== Example 2: Converting from Open Badges 3.0 to 2.0 ===');
  convertOB3toOB2Example();

  console.log('\n=== Example 3: Round-trip conversion (OB2 -> OB3 -> OB2) ===');
  roundTripConversionExample();

  console.log('\n=== Example 4: Version detection and automatic conversion ===');
  versionDetectionExample();
}

// If this file is run directly, run all examples
if (require.main === module) {
  runAllExamples();
}

// Export examples and conversion functions for use in other files
export {
  convertOB2toOB3Example,
  convertOB3toOB2Example,
  roundTripConversionExample,
  versionDetectionExample,
  convertOB2toOB3,
  convertOB3toOB2
};
