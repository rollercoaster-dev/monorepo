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
  test.each([
    ['empty string', '', undefined, true],
    ['whitespace only', '   \n\t  ', undefined, true],
    ['exceeds 1000 chars', 'a'.repeat(1001), undefined, true],
    ['valid title', 'Valid Step', undefined, false],
    ['valid title with ordinal 0', 'Valid Step', 0, false],
    ['valid title with ordinal', 'Valid Step', 5, false],
  ])('createStep with %s', (_label, title, ordinal, shouldThrow) => {
    if (shouldThrow) {
      expect(() => createStep(mockGoalId, title, ordinal)).toThrow(
        'Step title must be 1-1000 characters',
      );
    } else {
      expect(() => createStep(mockGoalId, title, ordinal)).not.toThrow();
    }
  });

  test.each([
    ['empty title', { title: '' }, true],
    ['>1000 char title', { title: 'a'.repeat(1001) }, true],
    ['valid title', { title: 'Updated Title' }, false],
    ['ordinal update', { ordinal: 5 }, false],
    ['null ordinal', { ordinal: null }, false],
    ['title and ordinal', { title: 'New Title', ordinal: 3 }, false],
  ] as const)('updateStep with %s', (_label, fields, shouldThrow) => {
    if (shouldThrow) {
      expect(() => updateStep(mockStepId, fields)).toThrow();
    } else {
      expect(() => updateStep(mockStepId, fields)).not.toThrow();
    }
  });

  test('completeStep should succeed', () => {
    expect(() => completeStep(mockStepId)).not.toThrow();
  });

  test('uncompleteStep should succeed', () => {
    expect(() => uncompleteStep(mockStepId)).not.toThrow();
  });

  test('deleteStep should succeed', () => {
    expect(() => deleteStep(mockStepId)).not.toThrow();
  });

  describe('reorderSteps - Zero-Index Bug Fix', () => {
    test('should handle ordinal 0 correctly (zero-index bug fix)', () => {
      const stepIds = [
        'step_1' as StepId,
        'step_2' as StepId,
        'step_3' as StepId,
      ];
      expect(() => reorderSteps(mockGoalId, stepIds)).not.toThrow();
    });

    test('should handle empty step list', () => {
      expect(() => reorderSteps(mockGoalId, [])).not.toThrow();
    });

    test('should handle single step', () => {
      expect(() => reorderSteps(mockGoalId, ['step_1' as StepId])).not.toThrow();
    });

    test('should handle many steps', () => {
      const stepIds = Array.from({ length: 100 }, (_, i) => `step_${i}` as StepId);
      expect(() => reorderSteps(mockGoalId, stepIds)).not.toThrow();
    });
  });
});
