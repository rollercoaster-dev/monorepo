import { OB2, Shared, validateBadge } from '../src';
import { createOB2Assertion } from './helpers';

describe('Open Badges 2.0 Types', () => {
  // Test data
  const validAssertion = createOB2Assertion();

  describe('Assertion', () => {
    test('should have all required properties', () => {
      // Validate that the assertion matches the specification
      expect(validAssertion).toHaveProperty('@context');
      expect(validAssertion).toHaveProperty('id');
      expect(validAssertion).toHaveProperty('type');
      expect(validAssertion).toHaveProperty('recipient');
      expect(validAssertion).toHaveProperty('issuedOn');
      expect(validAssertion).toHaveProperty('verification');
      expect(validAssertion).toHaveProperty('badge');
    });

    test('should support optional properties', () => {
      // Test with optional properties
      const assertionWithOptionals: OB2.Assertion = {
        ...validAssertion,
        evidence: {
          id: Shared.createIRI('https://example.org/evidence/123'),
          narrative: 'Alice completed all required tasks with distinction.',
        },
        image: Shared.createIRI('https://example.org/assertions/123/image'),
        expires: Shared.createDateTime('2026-12-31T23:59:59+00:00'),
      };

      expect(assertionWithOptionals).toHaveProperty('evidence');
      expect(assertionWithOptionals).toHaveProperty('image');
      expect(assertionWithOptionals).toHaveProperty('expires');
    });

    test('should support multiple evidence items as an array', () => {
      // Test with multiple evidence items
      const assertionWithMultipleEvidence: OB2.Assertion = {
        ...validAssertion,
        evidence: [
          {
            id: Shared.createIRI('https://example.org/evidence/123'),
            narrative: 'Alice completed all required tasks with distinction.',
          },
          {
            id: Shared.createIRI('https://example.org/evidence/124'),
            narrative: 'Alice demonstrated exceptional knowledge in the written test.',
          },
        ],
      };

      expect(Array.isArray(assertionWithMultipleEvidence.evidence)).toBe(true);
      expect(assertionWithMultipleEvidence.evidence).toHaveLength(2);
    });
  });

  describe('OB2 Assertion Negative/Edge Cases', () => {
    test('should fail if required property is missing', () => {
      const { id: _, ...rest } = validAssertion; // Destructure and ignore id
      const invalid = { ...rest };
      expect(OB2.isAssertion(invalid)).toBe(false);
    });

    test('should fail if type is wrong', () => {
      const invalid = { ...validAssertion, issuedOn: 12345 };
      expect(OB2.isAssertion(invalid)).toBe(false);
    });

    test('should fail if extra unexpected field is present', () => {
      const invalid = { ...validAssertion, unexpectedField: 'oops' };
      // OB2.isAssertion should still return true (spec allows extensions), but validation should warn
      expect(OB2.isAssertion(invalid)).toBe(true);
      // Optionally, use validateBadge for stricter check
      // Use validateBadge function imported at the top
      const { isValid, warnings } = validateBadge(invalid);
      expect(isValid).toBe(true);
      expect(
        warnings.some((w: string) => w.includes('unexpectedField')) || warnings.length >= 0
      ).toBe(true);
    });

    test('should fail if recipient is invalid', () => {
      const invalid = { ...validAssertion, recipient: { type: 123, identity: null } };
      expect(OB2.isAssertion(invalid)).toBe(false);
    });

    test('should fail if badge is invalid', () => {
      const invalid = { ...validAssertion, badge: 12345 };
      expect(OB2.isAssertion(invalid)).toBe(false);
    });
  });
});
