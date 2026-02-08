/**
 * Badge CRUD operation tests
 *
 * Tests validation and error handling for OB3 credential storage
 */

import { createBadge, updateBadge, deleteBadge } from '../queries';
import type { GoalId, BadgeId } from '../schema';

const mockGoalId = 'goal_test_123' as GoalId;
const mockBadgeId = 'badge_test_456' as BadgeId;

describe('Badge CRUD Operations', () => {
  describe('createBadge - Credential Validation', () => {
    test('should throw when credential is empty string', () => {
      expect(() =>
        createBadge({
          goalId: mockGoalId,
          credential: '',
          imageUri: 'file://badge.png',
        }),
      ).toThrow('Badge credential must not be empty');
    });

    test('should succeed with large OB3 credential (>1000 chars)', () => {
      const largeCredential = JSON.stringify({
        '@context': ['https://www.w3.org/ns/credentials/v2', 'https://purl.imsglobal.org/spec/ob/v3p0/context.json'],
        type: ['VerifiableCredential', 'OpenBadgeCredential'],
        issuer: { id: 'did:example:123', name: 'Test Issuer', url: 'https://example.com' },
        credentialSubject: { achievement: { name: 'a'.repeat(2000) } },
      });

      expect(() =>
        createBadge({
          goalId: mockGoalId,
          credential: largeCredential,
          imageUri: 'file://badge.png',
        }),
      ).not.toThrow();
    });

    test('should succeed with valid JSON credential', () => {
      const validCredential = JSON.stringify({
        '@context': 'https://www.w3.org/ns/credentials/v2',
        type: ['VerifiableCredential', 'OpenBadgeCredential'],
        issuer: 'did:example:123',
      });

      expect(() =>
        createBadge({
          goalId: mockGoalId,
          credential: validCredential,
          imageUri: 'file://badge.png',
        }),
      ).not.toThrow();
    });
  });

  describe('createBadge - ImageUri Validation', () => {
    test('should throw when imageUri is empty string', () => {
      expect(() =>
        createBadge({
          goalId: mockGoalId,
          credential: '{"valid": "json"}',
          imageUri: '',
        }),
      ).toThrow('Badge imageUri must be 1-1000 characters');
    });

    test('should throw when imageUri exceeds 1000 characters', () => {
      const longUri = 'file://' + 'a'.repeat(1001);
      expect(() =>
        createBadge({
          goalId: mockGoalId,
          credential: '{"valid": "json"}',
          imageUri: longUri,
        }),
      ).toThrow('Badge imageUri must be 1-1000 characters');
    });

    test('should succeed with valid imageUri', () => {
      expect(() =>
        createBadge({
          goalId: mockGoalId,
          credential: '{"valid": "json"}',
          imageUri: 'file://badge.png',
        }),
      ).not.toThrow();
    });
  });

  describe('updateBadge - Credential Validation', () => {
    test('should throw when updating to empty credential', () => {
      expect(() =>
        updateBadge(mockBadgeId, { credential: '' }),
      ).toThrow('Badge credential must not be empty');
    });

    test('should succeed updating to large credential', () => {
      const largeCredential = 'a'.repeat(5000);
      expect(() =>
        updateBadge(mockBadgeId, { credential: largeCredential }),
      ).not.toThrow();
    });

    test('should succeed updating credential', () => {
      expect(() =>
        updateBadge(mockBadgeId, { credential: '{"updated": true}' }),
      ).not.toThrow();
    });
  });

  describe('updateBadge - ImageUri Validation', () => {
    test('should throw when updating to empty imageUri', () => {
      expect(() => updateBadge(mockBadgeId, { imageUri: '' })).toThrow(
        'Badge imageUri must be 1-1000 characters',
      );
    });

    test('should throw when updating to >1000 character imageUri', () => {
      const longUri = 'file://' + 'a'.repeat(1001);
      expect(() => updateBadge(mockBadgeId, { imageUri: longUri })).toThrow(
        'Badge imageUri must be 1-1000 characters',
      );
    });

    test('should succeed updating imageUri', () => {
      expect(() =>
        updateBadge(mockBadgeId, { imageUri: 'file://new-badge.png' }),
      ).not.toThrow();
    });
  });

  describe('updateBadge - Multiple Fields', () => {
    test('should succeed updating both credential and imageUri', () => {
      expect(() =>
        updateBadge(mockBadgeId, {
          credential: '{"rebaked": true}',
          imageUri: 'file://rebaked.png',
        }),
      ).not.toThrow();
    });
  });

  describe('deleteBadge - Soft Delete', () => {
    test('should succeed soft-deleting badge', () => {
      expect(() => deleteBadge(mockBadgeId)).not.toThrow();
    });
  });
});
