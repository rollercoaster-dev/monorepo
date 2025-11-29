import { validateBadge } from '../src';
import { createOB2Assertion, createOB3VerifiableCredential } from './helpers';

describe('Badge Validation', () => {
  describe('OB2 Assertion Validation', () => {
    test('should validate a valid OB2 Assertion', () => {
      const validAssertion = createOB2Assertion();
      const result = validateBadge(validAssertion);

      expect(result.isValid).toBe(true);
      expect(result.version).toBe('OB2');
      expect(result.errors).toHaveLength(0);
    });

    test('should invalidate an OB2 Assertion with missing required properties', () => {
      const invalidAssertion = {
        '@context': 'https://w3id.org/openbadges/v2',
        type: 'Assertion',
        // Missing required properties
      };

      const result = validateBadge(invalidAssertion);

      expect(result.isValid).toBe(false);
      expect(result.errors.length).toBeGreaterThan(0);
    });

    test('should invalidate an OB2 Assertion with invalid IRI', () => {
      const validAssertion = createOB2Assertion();
      const invalidAssertion = {
        ...validAssertion,
        id: 'not-a-valid-iri', // Invalid IRI
      };

      const result = validateBadge(invalidAssertion);

      expect(result.isValid).toBe(false);
      expect(result.errors.some(error => error.includes('id'))).toBe(true);
    });

    test('should invalidate an OB2 Assertion with invalid DateTime', () => {
      const validAssertion = createOB2Assertion();
      const invalidAssertion = {
        ...validAssertion,
        issuedOn: '2023-06-15', // Invalid DateTime (missing time)
      };

      const result = validateBadge(invalidAssertion);

      expect(result.isValid).toBe(false);
      expect(result.errors.some(error => error.includes('issuedOn'))).toBe(true);
    });
  });

  describe('OB3 VerifiableCredential Validation', () => {
    test('should validate a valid OB3 VerifiableCredential', () => {
      const validCredential = createOB3VerifiableCredential();
      const result = validateBadge(validCredential);

      expect(result.isValid).toBe(true);
      expect(result.version).toBe('OB3');
      expect(result.errors).toHaveLength(0);
    });

    test('should invalidate an OB3 VerifiableCredential with missing required properties', () => {
      const invalidCredential = {
        '@context': [
          'https://www.w3.org/2018/credentials/v1',
          'https://purl.imsglobal.org/spec/ob/v3p0/context.json',
        ],
        type: ['VerifiableCredential', 'OpenBadgeCredential'],
        // Missing required properties
      };

      const result = validateBadge(invalidCredential);

      expect(result.isValid).toBe(false);
      expect(result.errors.length).toBeGreaterThan(0);
    });

    test('should invalidate an OB3 VerifiableCredential with invalid IRI', () => {
      const validCredential = createOB3VerifiableCredential();
      const invalidCredential = {
        ...validCredential,
        id: 'not-a-valid-iri', // Invalid IRI
      };

      const result = validateBadge(invalidCredential);

      expect(result.isValid).toBe(false);
      expect(result.errors.some(error => error.includes('id'))).toBe(true);
    });

    test('should invalidate an OB3 VerifiableCredential with invalid DateTime', () => {
      const validCredential = createOB3VerifiableCredential();
      const invalidCredential = {
        ...validCredential,
        validFrom: '2023-06-15', // Invalid DateTime (missing time)
      };

      const result = validateBadge(invalidCredential);

      expect(result.isValid).toBe(false);
      expect(result.errors.some(error => error.includes('validFrom'))).toBe(true);
    });
  });

  describe('General Validation', () => {
    test('should invalidate non-object values', () => {
      const result = validateBadge('not-an-object');

      expect(result.isValid).toBe(false);
      expect(result.errors.some(error => error.includes('object'))).toBe(true);
    });

    test('should invalidate objects without @context and type', () => {
      const result = validateBadge({});

      expect(result.isValid).toBe(false);
      expect(result.errors.some(error => error.includes('JSON-LD'))).toBe(true);
    });

    test('should invalidate objects with unknown badge types', () => {
      const result = validateBadge({
        '@context': 'https://example.org/context',
        type: 'UnknownBadgeType',
      });

      expect(result.isValid).toBe(false);
      expect(result.errors.some(error => error.includes('not a valid'))).toBe(true);
    });
  });
});
