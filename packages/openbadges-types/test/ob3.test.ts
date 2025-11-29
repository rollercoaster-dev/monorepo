import type { OB3} from '../src';
import { Shared } from '../src';
import { createOB3VerifiableCredential, createOB3Achievement } from './helpers';

describe('Open Badges 3.0 Types', () => {
  // Test data
  const validCredential = createOB3VerifiableCredential();

  describe('VerifiableCredential', () => {
    test('should have all required properties', () => {
      // Validate that the credential matches the specification
      expect(validCredential).toHaveProperty('@context');
      expect(validCredential).toHaveProperty('id');
      expect(validCredential).toHaveProperty('type');
      expect(validCredential).toHaveProperty('issuer');
      expect(validCredential).toHaveProperty('validFrom');
      expect(validCredential).toHaveProperty('credentialSubject');
    });

    test('should support proof property', () => {
      // Test with proof
      const credentialWithProof: OB3.VerifiableCredential = {
        ...validCredential,
        proof: {
          type: 'Ed25519Signature2020',
          created: Shared.createDateTime('2023-06-15T12:05:00Z'),
          verificationMethod: Shared.createIRI('https://example.org/issuers/123#keys-1'),
          proofPurpose: 'assertionMethod',
          proofValue: 'z58DAdFfa9SkqZMVPxAQpic6FPCsJWa6SpsfDqwmUbHEVnWxeh',
        },
      };

      expect(credentialWithProof).toHaveProperty('proof');
      expect(credentialWithProof.proof).toHaveProperty('type');
      expect(credentialWithProof.proof?.type).toBe('Ed25519Signature2020');
    });

    test('should support multiple achievements as an array', () => {
      // Test with multiple achievements
      const credentialWithMultipleAchievements = createOB3VerifiableCredential({
        credentialSubject: {
          id: Shared.createIRI('did:example:ebfeb1f712ebc6f1c276e12ec21'),
          achievement: [
            createOB3Achievement({ name: '3-D Printmaster' }),
            createOB3Achievement({ name: 'Safety Expert' }),
          ],
        },
      });

      expect(Array.isArray(credentialWithMultipleAchievements.credentialSubject.achievement)).toBe(
        true
      );
      expect(credentialWithMultipleAchievements.credentialSubject.achievement).toHaveLength(2);
    });

    test('should support evidence property', () => {
      // Test with evidence
      const credentialWithEvidence: OB3.VerifiableCredential = {
        ...validCredential,
        evidence: [
          {
            id: Shared.createIRI('https://example.org/evidence/123'),
            type: ['Evidence'],
            narrative: 'Alice completed all required tasks with distinction.',
          },
        ],
      };

      expect(credentialWithEvidence).toHaveProperty('evidence');
      expect(Array.isArray(credentialWithEvidence.evidence)).toBe(true);
      expect(credentialWithEvidence.evidence).toHaveLength(1);
    });
  });
});
