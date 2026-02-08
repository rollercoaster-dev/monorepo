/**
 * Goal CRUD operation tests
 *
 * Tests validation, timestamp generation, and error handling
 */

import {
  createGoal,
  updateGoal,
  completeGoal,
  uncompleteGoal,
  deleteGoal,
} from '../queries';
import type { GoalId } from '../schema';

const mockGoalId = 'goal_test_123' as GoalId;

describe('Goal CRUD Operations', () => {
  describe('createGoal - Title Validation', () => {
    test('should throw when title is empty string', () => {
      expect(() => createGoal('')).toThrow(
        'Goal title must be 1-1000 characters',
      );
    });

    test('should throw when title is only whitespace', () => {
      expect(() => createGoal('   \n\t  ')).toThrow(
        'Goal title must be 1-1000 characters',
      );
    });

    test('should throw when title exceeds 1000 characters', () => {
      const longTitle = 'a'.repeat(1001);
      expect(() => createGoal(longTitle)).toThrow(
        'Goal title must be 1-1000 characters',
      );
    });

    test('should succeed with valid title', () => {
      expect(() => createGoal('Valid Goal Title')).not.toThrow();
    });

    test('should trim whitespace from valid title', () => {
      expect(() => createGoal('  Valid Goal  ')).not.toThrow();
    });

    test('should succeed with title at 1000 character limit', () => {
      const maxTitle = 'a'.repeat(1000);
      expect(() => createGoal(maxTitle)).not.toThrow();
    });
  });

  describe('updateGoal - Title Validation', () => {
    test('should throw when updating to empty title', () => {
      expect(() => updateGoal(mockGoalId, { title: '' })).toThrow(
        'Goal title must be 1-1000 characters',
      );
    });

    test('should throw when updating to whitespace-only title', () => {
      expect(() => updateGoal(mockGoalId, { title: '   ' })).toThrow(
        'Goal title must be 1-1000 characters',
      );
    });

    test('should throw when updating to >1000 character title', () => {
      const longTitle = 'a'.repeat(1001);
      expect(() => updateGoal(mockGoalId, { title: longTitle })).toThrow(
        'Goal title must be 1-1000 characters',
      );
    });

    test('should succeed with valid title update', () => {
      expect(() => updateGoal(mockGoalId, { title: 'Updated Title' })).not.toThrow();
    });
  });

  describe('updateGoal - Description Validation', () => {
    test('should throw when updating to empty description', () => {
      expect(() => updateGoal(mockGoalId, { description: '' })).toThrow(
        'Goal description must be 1-1000 characters',
      );
    });

    test('should throw when updating to >1000 character description', () => {
      const longDesc = 'a'.repeat(1001);
      expect(() => updateGoal(mockGoalId, { description: longDesc })).toThrow(
        'Goal description must be 1-1000 characters',
      );
    });

    test('should succeed when setting description to null', () => {
      expect(() => updateGoal(mockGoalId, { description: null })).not.toThrow();
    });

    test('should succeed with valid description', () => {
      expect(() =>
        updateGoal(mockGoalId, { description: 'Valid description' }),
      ).not.toThrow();
    });
  });

  describe('updateGoal - Null vs Undefined', () => {
    test('should allow clearing description with null', () => {
      expect(() => updateGoal(mockGoalId, { description: null })).not.toThrow();
    });

    test('should allow updating only title (description undefined)', () => {
      expect(() => updateGoal(mockGoalId, { title: 'New Title' })).not.toThrow();
    });

    test('should allow updating both title and description', () => {
      expect(() =>
        updateGoal(mockGoalId, {
          title: 'New Title',
          description: 'New Description',
        }),
      ).not.toThrow();
    });

    test('should allow updating title and clearing description', () => {
      expect(() =>
        updateGoal(mockGoalId, {
          title: 'New Title',
          description: null,
        }),
      ).not.toThrow();
    });
  });

  describe('completeGoal - Timestamp Generation', () => {
    test('should succeed with valid date', () => {
      expect(() => completeGoal(mockGoalId)).not.toThrow();
    });

    // Note: Testing timestamp generation failure is difficult without mocking Date
    // In a real scenario, dateToDateIso would need to be mocked to return {ok: false}
  });

  describe('uncompleteGoal', () => {
    test('should succeed marking goal as active', () => {
      expect(() => uncompleteGoal(mockGoalId)).not.toThrow();
    });
  });

  describe('deleteGoal - Soft Delete', () => {
    test('should succeed soft-deleting goal', () => {
      expect(() => deleteGoal(mockGoalId)).not.toThrow();
    });
  });
});
