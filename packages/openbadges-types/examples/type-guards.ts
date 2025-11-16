/**
 * Type Guards Examples for Open Badges Types
 * 
 * This file demonstrates how to use the type guards provided by the Open Badges Types package
 * for runtime validation of badge data.
 */

import { OB2, OB3, Shared } from '../src';
import { createOB2Example, createOB3Example } from './basic-usage';

/**
 * Example 1: Using JSON-LD Type Guards
 */
function jsonLdTypeGuardsExample() {
  // Create some test objects
  const validJsonLd = {
    '@context': 'https://w3id.org/openbadges/v2',
    'type': 'Assertion'
  };
  
  const invalidJsonLd = {
    'id': 'https://example.org/badges/5',
    'name': 'Test Badge'
  };
  
  const arrayTypeJsonLd = {
    '@context': 'https://w3id.org/openbadges/v2',
    'type': ['Assertion', 'Extension']
  };
  
  // Check if objects are valid JSON-LD
  console.log('validJsonLd is JSON-LD:', Shared.isJsonLdObject(validJsonLd));
  console.log('invalidJsonLd is JSON-LD:', Shared.isJsonLdObject(invalidJsonLd));
  console.log('arrayTypeJsonLd is JSON-LD:', Shared.isJsonLdObject(arrayTypeJsonLd));
  
  // Check for specific types
  console.log('validJsonLd has type Assertion:', Shared.hasJsonLdType(validJsonLd, 'Assertion'));
  console.log('arrayTypeJsonLd has type Extension:', Shared.hasJsonLdType(arrayTypeJsonLd, 'Extension'));
  console.log('validJsonLd has type BadgeClass:', Shared.hasJsonLdType(validJsonLd, 'BadgeClass'));
  
  // Check for specific contexts
  console.log('validJsonLd has OB2 context:', Shared.hasJsonLdContext(validJsonLd, Shared.OB2Context));
  console.log('validJsonLd has OB3 context:', Shared.hasJsonLdContext(validJsonLd, Shared.OB3Context));
}

/**
 * Example 2: Using Open Badges 2.0 Type Guards
 */
function ob2TypeGuardsExample() {
  // Get a valid OB2 Assertion
  const validAssertion = createOB2Example();
  
  // Create an invalid assertion (missing required fields)
  const invalidAssertion = {
    '@context': 'https://w3id.org/openbadges/v2',
    'type': 'Assertion',
    'id': 'https://example.org/assertions/123'
    // Missing recipient, badge, issuedOn, verification
  };
  
  // Check if objects are valid OB2 Assertions
  console.log('validAssertion is an OB2 Assertion:', OB2.isAssertion(validAssertion));
  console.log('invalidAssertion is an OB2 Assertion:', OB2.isAssertion(invalidAssertion));
  
  // Extract the BadgeClass from the valid assertion
  const badgeClass = typeof validAssertion.badge === 'string' 
    ? null // In a real app, you would fetch the BadgeClass
    : validAssertion.badge;
  
  if (badgeClass) {
    console.log('badgeClass is a BadgeClass:', OB2.isBadgeClass(badgeClass));
  }
  
  // Check if the issuer is a valid Profile
  if (badgeClass && typeof badgeClass.issuer !== 'string') {
    console.log('issuer is a Profile:', OB2.isProfile(badgeClass.issuer));
  }
}

/**
 * Example 3: Using Open Badges 3.0 Type Guards
 */
function ob3TypeGuardsExample() {
  // Get a valid OB3 VerifiableCredential
  const validCredential = createOB3Example();
  
  // Create an invalid credential (missing required fields)
  const invalidCredential = {
    '@context': [
      'https://www.w3.org/2018/credentials/v1',
      'https://purl.imsglobal.org/spec/ob/v3p0/context.json'
    ],
    'type': ['VerifiableCredential'],
    'id': 'https://example.org/credentials/3732'
    // Missing issuer, issuanceDate, credentialSubject
  };
  
  // Check if objects are valid OB3 VerifiableCredentials
  console.log('validCredential is an OB3 VerifiableCredential:', OB3.isVerifiableCredential(validCredential));
  console.log('invalidCredential is an OB3 VerifiableCredential:', OB3.isVerifiableCredential(invalidCredential));
  
  // Extract the Achievement from the valid credential
  const achievement = validCredential.credentialSubject.achievement;
  const singleAchievement = Array.isArray(achievement) ? achievement[0] : achievement;
  
  console.log('achievement is an Achievement:', OB3.isAchievement(singleAchievement));
  
  // Check if the issuer is valid
  if (typeof validCredential.issuer !== 'string') {
    console.log('issuer is an Issuer:', OB3.isIssuer(validCredential.issuer));
  }
  
  // Check if the proof is valid
  if (validCredential.proof) {
    console.log('proof is a Proof:', OB3.isProof(validCredential.proof));
  }
}

/**
 * Example 4: Using Shared Type Guards
 */
function sharedTypeGuardsExample() {
  // Test IRI validation
  const validIRIs = [
    'https://example.org/badges/5',
    'http://example.com/path?query=value#fragment',
    'urn:uuid:f81d4fae-7dec-11d0-a765-00a0c91e6bf6'
  ];
  
  const invalidIRIs = [
    'not a url',
    '',
    123,
    null,
    undefined,
    {}
  ];
  
  console.log('Valid IRIs:');
  validIRIs.forEach(iri => {
    console.log(`  "${iri}" is a valid IRI:`, Shared.isIRI(iri));
  });
  
  console.log('Invalid IRIs:');
  invalidIRIs.forEach(iri => {
    console.log(`  "${iri}" is a valid IRI:`, Shared.isIRI(iri));
  });
  
  // Test DateTime validation
  const validDateTimes = [
    '2023-06-15T12:00:00Z',
    '2023-06-15T12:00:00.123Z',
    '2023-06-15T12:00:00+01:00',
    '2023-06-15T12:00:00-05:00'
  ];
  
  const invalidDateTimes = [
    '2023-06-15',
    '12:00:00',
    'not a date',
    '',
    123,
    null,
    undefined,
    {}
  ];
  
  console.log('Valid DateTimes:');
  validDateTimes.forEach(dateTime => {
    console.log(`  "${dateTime}" is a valid DateTime:`, Shared.isDateTime(dateTime));
  });
  
  console.log('Invalid DateTimes:');
  invalidDateTimes.forEach(dateTime => {
    console.log(`  "${dateTime}" is a valid DateTime:`, Shared.isDateTime(dateTime));
  });
}

/**
 * Example 5: Practical Validation Example
 */
function practicalValidationExample() {
  // Function to validate badge data from an external source
  function validateBadgeData(data: unknown): string {
    // Check if it's a JSON-LD object
    if (!Shared.isJsonLdObject(data)) {
      return 'Invalid data: Not a JSON-LD object';
    }
    
    // Check if it's an OB2 Assertion
    if (OB2.isAssertion(data)) {
      return `Valid OB2 Assertion with ID: ${data.id}`;
    }
    
    // Check if it's an OB3 VerifiableCredential
    if (OB3.isVerifiableCredential(data)) {
      return `Valid OB3 VerifiableCredential with ID: ${data.id}`;
    }
    
    // If it's neither, it's an invalid badge
    return 'Invalid data: Not a recognized badge format';
  }
  
  // Test with valid badges
  const ob2Badge = createOB2Example();
  const ob3Badge = createOB3Example();
  
  // Test with invalid data
  const invalidData = {
    '@context': 'https://example.org/context',
    'type': 'SomethingElse',
    'id': 'https://example.org/something/123'
  };
  
  console.log('OB2 Badge Validation:', validateBadgeData(ob2Badge));
  console.log('OB3 Badge Validation:', validateBadgeData(ob3Badge));
  console.log('Invalid Data Validation:', validateBadgeData(invalidData));
  console.log('Non-Object Validation:', validateBadgeData('not an object'));
}

// Run all examples
function runAllExamples() {
  console.log('=== Example 1: Using JSON-LD Type Guards ===');
  jsonLdTypeGuardsExample();
  
  console.log('\n=== Example 2: Using Open Badges 2.0 Type Guards ===');
  ob2TypeGuardsExample();
  
  console.log('\n=== Example 3: Using Open Badges 3.0 Type Guards ===');
  ob3TypeGuardsExample();
  
  console.log('\n=== Example 4: Using Shared Type Guards ===');
  sharedTypeGuardsExample();
  
  console.log('\n=== Example 5: Practical Validation Example ===');
  practicalValidationExample();
}

// If this file is run directly, run all examples
if (require.main === module) {
  runAllExamples();
}

// Export examples for use in other files
export {
  jsonLdTypeGuardsExample,
  ob2TypeGuardsExample,
  ob3TypeGuardsExample,
  sharedTypeGuardsExample,
  practicalValidationExample
};
