import { OB3, Shared } from '../src';
import { createOB3VerifiableCredential, createOB3Achievement, createOB3Issuer } from './helpers';

describe('OB3 Type Guards', () => {
  describe('isVerifiableCredential', () => {
    test('should correctly identify valid OB3 VerifiableCredential objects', () => {
      const validCredential = createOB3VerifiableCredential();
      expect(OB3.isVerifiableCredential(validCredential)).toBe(true);
    });

    test('should reject null and empty objects', () => {
      expect(OB3.isVerifiableCredential(null)).toBe(false);
      expect(OB3.isVerifiableCredential({})).toBe(false);
    });

    test('should reject credentials with wrong type', () => {
      expect(
        OB3.isVerifiableCredential({
          '@context': 'https://www.w3.org/2018/credentials/v1',
          type: 'Achievement',
        })
      ).toBe(false);
    });

    test('should reject credentials missing OpenBadgeCredential type', () => {
      expect(
        OB3.isVerifiableCredential({
          '@context': [
            'https://www.w3.org/2018/credentials/v1',
            'https://purl.imsglobal.org/spec/ob/v3p0/context.json',
          ],
          type: ['VerifiableCredential'], // Missing OpenBadgeCredential
          id: 'https://example.org/credentials/1',
          issuer: 'https://example.org/issuers/1',
          validFrom: '2023-06-15T12:00:00Z',
          credentialSubject: { achievement: {} },
        })
      ).toBe(false);
    });

    test('should reject credentials missing required properties', () => {
      expect(
        OB3.isVerifiableCredential({
          '@context': 'https://www.w3.org/2018/credentials/v1',
          type: ['VerifiableCredential', 'OpenBadgeCredential'],
        })
      ).toBe(false);
    });
  });

  describe('isIssuer', () => {
    test('should correctly identify valid OB3 Issuer objects', () => {
      const validIssuer = createOB3Issuer();

      expect(OB3.isIssuer(validIssuer)).toBe(true);

      // Invalid issuers
      expect(OB3.isIssuer(null)).toBe(false);
      expect(OB3.isIssuer({})).toBe(false);
      expect(
        OB3.isIssuer({
          '@context': 'https://purl.imsglobal.org/spec/ob/v3p0/context.json',
          type: 'Profile',
          // Missing id property
        })
      ).toBe(false);
    });
  });

  describe('isCredentialSubject', () => {
    test('should correctly identify valid OB3 CredentialSubject objects', () => {
      const validCredentialSubject = createOB3VerifiableCredential().credentialSubject;

      expect(OB3.isCredentialSubject(validCredentialSubject)).toBe(true);

      // Invalid credential subjects
      expect(OB3.isCredentialSubject(null)).toBe(false);
      expect(OB3.isCredentialSubject({})).toBe(false);
      expect(
        OB3.isCredentialSubject({
          id: 'did:example:123',
          // Missing achievement property
        })
      ).toBe(false);
    });
  });

  describe('isAchievement', () => {
    test('should correctly identify valid OB3 Achievement objects', () => {
      const validAchievement = createOB3Achievement();
      expect(OB3.isAchievement(validAchievement)).toBe(true);
    });

    test('should reject null and empty objects', () => {
      expect(OB3.isAchievement(null)).toBe(false);
      expect(OB3.isAchievement({})).toBe(false);
    });

    test('should reject achievements missing required id', () => {
      expect(
        OB3.isAchievement({
          type: 'Achievement',
          name: 'Test',
          description: 'Test description',
          criteria: { narrative: 'Do something' },
        })
      ).toBe(false);
    });

    test('should reject achievements missing required name', () => {
      expect(
        OB3.isAchievement({
          id: 'https://example.org/achievements/1',
          type: 'Achievement',
          description: 'Test description',
          criteria: { narrative: 'Do something' },
        })
      ).toBe(false);
    });

    test('should reject achievements missing required description', () => {
      expect(
        OB3.isAchievement({
          id: 'https://example.org/achievements/1',
          type: 'Achievement',
          name: 'Test',
          criteria: { narrative: 'Do something' },
        })
      ).toBe(false);
    });

    test('should reject achievements missing required criteria', () => {
      expect(
        OB3.isAchievement({
          id: 'https://example.org/achievements/1',
          type: 'Achievement',
          name: 'Test',
          description: 'Test description',
        })
      ).toBe(false);
    });
  });

  describe('isProof', () => {
    test('should correctly identify valid OB3 Proof objects', () => {
      const validProof: OB3.Proof = {
        type: 'Ed25519Signature2020',
        created: Shared.createDateTime('2023-06-15T12:05:00Z'),
        verificationMethod: Shared.createIRI('https://example.org/issuers/123#keys-1'),
        proofPurpose: 'assertionMethod',
        proofValue: 'z58DAdFfa9SkqZMVPxAQpic6FPCsJWa6SpsfDqwmUbHEVnWxeh',
      };

      expect(OB3.isProof(validProof)).toBe(true);

      // Invalid proofs
      expect(OB3.isProof(null)).toBe(false);
      expect(OB3.isProof({})).toBe(false);
      expect(
        OB3.isProof({
          type: 'Ed25519Signature2020',
          // Missing required properties
        })
      ).toBe(false);
    });
  });

  // Additional tests for other type guards can be added here
});
