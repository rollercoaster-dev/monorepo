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
  test('should throw when credential is empty', () => {
    expect(() =>
      createBadge({
        goalId: mockGoalId,
        credential: '',
        imageUri: 'file://badge.png',
      }),
    ).toThrow('Badge credential must not be empty');
  });

  test('should accept large OB3 credential (>1000 chars)', () => {
    const largeCredential = JSON.stringify({
      '@context': ['https://www.w3.org/ns/credentials/v2'],
      type: ['VerifiableCredential', 'OpenBadgeCredential'],
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

  test.each([
    ['empty imageUri', '', true],
    ['>1000 char imageUri', 'file://' + 'a'.repeat(1001), true],
    ['valid imageUri', 'file://badge.png', false],
  ])('createBadge with %s', (_label, imageUri, shouldThrow) => {
    if (shouldThrow) {
      expect(() =>
        createBadge({
          goalId: mockGoalId,
          credential: '{"valid": "json"}',
          imageUri,
        }),
      ).toThrow('Badge imageUri must be 1-1000 characters');
    } else {
      expect(() =>
        createBadge({
          goalId: mockGoalId,
          credential: '{"valid": "json"}',
          imageUri,
        }),
      ).not.toThrow();
    }
  });

  test.each([
    ['empty credential', { credential: '' }, true],
    ['valid credential', { credential: '{"updated": true}' }, false],
    ['large credential', { credential: 'a'.repeat(5000) }, false],
    ['empty imageUri', { imageUri: '' }, true],
    ['>1000 char imageUri', { imageUri: 'file://' + 'a'.repeat(1001) }, true],
    ['valid imageUri', { imageUri: 'file://new-badge.png' }, false],
    ['both fields', { credential: '{"rebaked": true}', imageUri: 'file://rebaked.png' }, false],
  ])('updateBadge with %s', (_label, fields, shouldThrow) => {
    if (shouldThrow) {
      expect(() => updateBadge(mockBadgeId, fields)).toThrow();
    } else {
      expect(() => updateBadge(mockBadgeId, fields)).not.toThrow();
    }
  });

  test('deleteBadge should succeed', () => {
    expect(() => deleteBadge(mockBadgeId)).not.toThrow();
  });
});
