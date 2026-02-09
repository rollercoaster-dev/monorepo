import { StepStatus } from '../../../db';

/**
 * Tests for goal completion detection logic.
 *
 * The allStepsComplete derivation in GoalDetailScreen:
 *   stepRows.length > 0 && stepRows.every(s => s.status === StepStatus.completed)
 */

type StepRow = { status: string };

function allStepsComplete(stepRows: StepRow[]): boolean {
  return (
    stepRows.length > 0 &&
    stepRows.every((s) => s.status === StepStatus.completed)
  );
}

describe('Goal completion detection', () => {
  it('returns true when all steps are completed', () => {
    const steps = [
      { status: StepStatus.completed },
      { status: StepStatus.completed },
      { status: StepStatus.completed },
    ];
    expect(allStepsComplete(steps)).toBe(true);
  });

  it('returns false when some steps are pending', () => {
    const steps = [
      { status: StepStatus.completed },
      { status: StepStatus.pending },
      { status: StepStatus.completed },
    ];
    expect(allStepsComplete(steps)).toBe(false);
  });

  it('returns false for zero steps (no auto-trigger)', () => {
    expect(allStepsComplete([])).toBe(false);
  });

  it('returns true for single completed step', () => {
    const steps = [{ status: StepStatus.completed }];
    expect(allStepsComplete(steps)).toBe(true);
  });

  it('returns false when all steps are pending', () => {
    const steps = [
      { status: StepStatus.pending },
      { status: StepStatus.pending },
    ];
    expect(allStepsComplete(steps)).toBe(false);
  });
});
