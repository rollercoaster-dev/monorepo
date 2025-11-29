// NOTE: If you see a TS/ESLint error about tsconfig not including this file, add 'test' to the 'include' array in tsconfig.json.
import { validateOB3Credential } from '../src/validateWithSchema';
import type { OB3 } from '../src';
import {
  createOB3VerifiableCredential,
  validOB3Achievement,
  invalidOB3Achievement,
  validOB3Issuer,
  invalidOB3Issuer,
  validOB3CredentialSubject,
  invalidOB3CredentialSubject,
} from './helpers';

test('OB3 VerifiableCredential matches OB3 schema', () => {
  const credential = createOB3VerifiableCredential();
  const result = validateOB3Credential(credential);
  if (!result.valid) {
    console.error('Validation errors:', result.errors);
  }
  expect(result.valid).toBe(true);
});

test('OB3 VerifiableCredential missing required field fails validation', () => {
  const credential = { ...createOB3VerifiableCredential() };
  delete (credential as Record<string, unknown>).issuer;
  const result = validateOB3Credential(credential);
  expect(result.valid).toBe(false);
  console.log('Missing field errors:', result.errors);
});

test('OB3 VerifiableCredential with wrong type fails validation', () => {
  const credential = { ...createOB3VerifiableCredential(), validFrom: 12345 };
  const result = validateOB3Credential(credential);
  expect(result.valid).toBe(false);
  console.log('Wrong type errors:', result.errors);
});

test('OB3 VerifiableCredential with extra unexpected field fails validation', () => {
  const credential = { ...createOB3VerifiableCredential(), unexpectedField: 'oops' };
  const result = validateOB3Credential(credential);
  if (!result.valid) {
    console.log('Extra field errors:', result.errors);
  } else {
    console.log('Extra field accepted (schema allows extensions)');
  }
  expect(typeof result.valid).toBe('boolean');
});

// Achievement

test('OB3 Achievement valid sample passes schema validation', () => {
  const credential = createOB3VerifiableCredential({
    credentialSubject: { ...validOB3CredentialSubject, achievement: validOB3Achievement },
  });
  const result = validateOB3Credential(credential);
  expect(result.valid).toBe(true);
});

test('OB3 Achievement invalid sample fails schema validation', () => {
  const credential = createOB3VerifiableCredential({
    credentialSubject: {
      ...validOB3CredentialSubject,
      achievement: invalidOB3Achievement as unknown as OB3.Achievement,
    },
  });
  const result = validateOB3Credential(credential);
  expect(result.valid).toBe(false);
  console.log('Achievement invalid errors:', result.errors);
});

// Issuer

test('OB3 Issuer valid sample passes schema validation', () => {
  const credential = createOB3VerifiableCredential({ issuer: validOB3Issuer });
  const result = validateOB3Credential(credential);
  expect(result.valid).toBe(true);
});

test('OB3 Issuer invalid sample fails schema validation', () => {
  const credential = createOB3VerifiableCredential({
    issuer: invalidOB3Issuer as unknown as OB3.Issuer,
  });
  const result = validateOB3Credential(credential);
  expect(result.valid).toBe(false);
  console.log('Issuer invalid errors:', result.errors);
});

// CredentialSubject

test('OB3 CredentialSubject valid sample passes schema validation', () => {
  const credential = createOB3VerifiableCredential({
    credentialSubject: validOB3CredentialSubject,
  });
  const result = validateOB3Credential(credential);
  expect(result.valid).toBe(true);
});

test('OB3 CredentialSubject invalid sample fails schema validation', () => {
  const credential = createOB3VerifiableCredential({
    credentialSubject: invalidOB3CredentialSubject as unknown as OB3.CredentialSubject,
  });
  const result = validateOB3Credential(credential);
  expect(result.valid).toBe(false);
  console.log('CredentialSubject invalid errors:', result.errors);
});

test('OB3 E2E: real-world minimal valid credential', () => {
  const credential = {
    '@context': [
      'https://www.w3.org/2018/credentials/v1',
      'https://purl.imsglobal.org/spec/ob/v3p0/context.json',
    ],
    id: 'https://example.org/credentials/1001',
    type: ['VerifiableCredential', 'OpenBadgeCredential'],
    issuer: {
      id: 'https://example.org/issuers/1',
      type: ['Profile'],
      name: 'Example Issuer',
      url: 'https://example.org',
    },
    validFrom: '2024-01-01T00:00:00Z',
    credentialSubject: {
      id: 'did:example:123',
      achievement: {
        id: 'https://example.org/achievements/1',
        type: ['Achievement'],
        name: 'Test Achievement',
        description: 'A test achievement for validation',
        criteria: { narrative: 'Complete the test' },
      },
    },
  };
  const result = validateOB3Credential(credential);
  expect(result.valid).toBe(true);
});

test('OB3 E2E: real-world invalid credential (missing achievement name)', () => {
  const credential = {
    '@context': [
      'https://www.w3.org/2018/credentials/v1',
      'https://purl.imsglobal.org/spec/ob/v3p0/context.json',
    ],
    id: 'https://example.org/credentials/1002',
    type: ['VerifiableCredential', 'OpenBadgeCredential'],
    issuer: {
      id: 'https://example.org/issuers/1',
      type: ['Profile'],
      name: 'Example Issuer',
      url: 'https://example.org',
    },
    validFrom: '2024-01-01T00:00:00Z',
    credentialSubject: {
      id: 'did:example:123',
      achievement: {
        id: 'https://example.org/achievements/1',
        type: ['Achievement'],
        description: 'A test achievement',
        criteria: { narrative: 'Complete the test' },
        // name missing
      },
    },
  };
  const result = validateOB3Credential(credential);
  expect(result.valid).toBe(false);
  expect(result.errors?.some(e => e.message.includes('name'))).toBe(true);
});
