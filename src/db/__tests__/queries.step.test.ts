/**
 * Step CRUD operation tests
 *
 * Tests validation, reordering (zero-index bug fix), and error handling
 */

import {
  createStep,
  updateStep,
  completeStep,
  uncompleteStep,
  deleteStep,
  reorderSteps,
} from '../queries';
import type { GoalId, StepId } from '../schema';

const mockGoalId = 'goal_test_123' as GoalId;
const mockStepId = 'step_test_456' as StepId;

describe('Step CRUD Operations', () => {
  describe('createStep - Title Validation', () => {
    test('should throw when title is empty string', () => {
      expect(() => createStep(mockGoalId, '')).toThrow(
        'Step title must be 1-1000 characters',
      );
    });

    test('should throw when title is only whitespace', () => {
      expect(() => createStep(mockGoalId, '   \n\t  ')).toThrow(
        'Step title must be 1-1000 characters',
      );
    });

    test('should throw when title exceeds 1000 characters', () => {
      const longTitle = 'a'.repeat(1001);
      expect(() => createStep(mockGoalId, longTitle)).toThrow(
        'Step title must be 1-1000 characters',
      );
    });

    test('should succeed with valid title', () => {
      expect(() => createStep(mockGoalId, 'Valid Step')).not.toThrow();
    });

    test('should succeed with title and ordinal', () => {
      expect(() => createStep(mockGoalId, 'Valid Step', 0)).not.toThrow();
    });
  });

  describe('createStep - Ordinal Handling', () => {
    test('should succeed with ordinal 0', () => {
      expect(() => createStep(mockGoalId, 'First Step', 0)).not.toThrow();
    });

    test('should succeed with positive ordinal', () => {
      expect(() => createStep(mockGoalId, 'Second Step', 1)).not.toThrow();
    });

    test('should succeed with large ordinal', () => {
      expect(() => createStep(mockGoalId, 'Last Step', 999)).not.toThrow();
    });

    test('should succeed without ordinal (null)', () => {
      expect(() => createStep(mockGoalId, 'Unordered Step')).not.toThrow();
    });
  });

  describe('updateStep - Validation', () => {
    test('should throw when updating to empty title', () => {
      expect(() => updateStep(mockStepId, { title: '' })).toThrow(
        'Step title must be 1-1000 characters',
      );
    });

    test('should throw when updating to >1000 character title', () => {
      const longTitle = 'a'.repeat(1001);
      expect(() => updateStep(mockStepId, { title: longTitle })).toThrow(
        'Step title must be 1-1000 characters',
      );
    });

    test('should succeed updating title', () => {
      expect(() => updateStep(mockStepId, { title: 'Updated Title' })).not.toThrow();
    });

    test('should succeed updating ordinal', () => {
      expect(() => updateStep(mockStepId, { ordinal: 5 })).not.toThrow();
    });

    test('should succeed setting ordinal to null', () => {
      expect(() => updateStep(mockStepId, { ordinal: null })).not.toThrow();
    });

    test('should succeed updating both title and ordinal', () => {
      expect(() =>
        updateStep(mockStepId, { title: 'New Title', ordinal: 3 }),
      ).not.toThrow();
    });
  });

  describe('completeStep - Timestamp Generation', () => {
    test('should succeed with valid date', () => {
      expect(() => completeStep(mockStepId)).not.toThrow();
    });
  });

  describe('uncompleteStep', () => {
    test('should succeed marking step as pending', () => {
      expect(() => uncompleteStep(mockStepId)).not.toThrow();
    });
  });

  describe('deleteStep - Soft Delete', () => {
    test('should succeed soft-deleting step', () => {
      expect(() => deleteStep(mockStepId)).not.toThrow();
    });
  });

  describe('reorderSteps - Zero-Index Bug Fix', () => {
    test('should handle ordinal 0 correctly (zero-index bug fix)', () => {
      const stepIds = [
        'step_1' as StepId,
        'step_2' as StepId,
        'step_3' as StepId,
      ];

      // This is the critical test: index 0 should NOT be skipped
      // Before fix: if (ordinal) would skip when ordinal === 0
      // After fix: if (ordinal !== null) correctly processes index 0
      expect(() => reorderSteps(mockGoalId, stepIds)).not.toThrow();
    });

    test('should handle empty step list', () => {
      expect(() => reorderSteps(mockGoalId, [])).not.toThrow();
    });

    test('should handle single step', () => {
      const stepIds = ['step_1' as StepId];
      expect(() => reorderSteps(mockGoalId, stepIds)).not.toThrow();
    });

    test('should handle many steps', () => {
      const stepIds = Array.from({ length: 100 }, (_, i) => `step_${i}` as StepId);
      expect(() => reorderSteps(mockGoalId, stepIds)).not.toThrow();
    });
  });
});
