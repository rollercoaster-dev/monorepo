import React from 'react';
import { renderWithProviders, screen } from '../test-utils';
import {
  expectAccessibleRole,
  expectAccessibleValue,
} from '../a11y-helpers';
import { GoalCard, type GoalCardGoal } from '../../components/GoalCard';
import { EmptyState } from '../../components/EmptyState';

const activeGoal: GoalCardGoal = {
  id: '1',
  title: 'Learn TypeScript',
  status: 'active',
  stepsTotal: 5,
  stepsCompleted: 2,
};

const completedGoal: GoalCardGoal = {
  id: '2',
  title: 'Read a book',
  status: 'completed',
  stepsTotal: 3,
  stepsCompleted: 3,
};

describe('Accessibility: Composite Components', () => {
  describe('GoalCard', () => {
    it('has descriptive accessibilityLabel with step count', () => {
      renderWithProviders(
        <GoalCard goal={activeGoal} onPress={jest.fn()} />,
      );
      const card = screen.getByRole('button', {
        name: 'Learn TypeScript, 2 of 5 steps completed, active',
      });
      expect(card).toBeOnTheScreen();
    });

    it('has accessibilityHint when pressable', () => {
      renderWithProviders(
        <GoalCard goal={activeGoal} onPress={jest.fn()} />,
      );
      const card = screen.getByRole('button');
      expect(card.props.accessibilityHint).toBe(
        'Double-tap to view details',
      );
    });

    it('title has header role', () => {
      renderWithProviders(
        <GoalCard goal={activeGoal} onPress={jest.fn()} />,
      );
      screen.getByRole('header', { name: 'Learn TypeScript' });
    });

    it('contains a progressbar with correct value', () => {
      renderWithProviders(
        <GoalCard goal={activeGoal} onPress={jest.fn()} />,
      );
      const progressBar = screen.getByRole('progressbar');
      expectAccessibleRole(progressBar, 'progressbar');
      expectAccessibleValue(progressBar, { min: 0, max: 100, now: 40 });
    });

    it('contains status badge', () => {
      renderWithProviders(
        <GoalCard goal={completedGoal} onPress={jest.fn()} />,
      );
      screen.getByLabelText('Status: Done');
    });

    it('reflects completed status in label', () => {
      renderWithProviders(
        <GoalCard goal={completedGoal} onPress={jest.fn()} />,
      );
      screen.getByRole('button', {
        name: 'Read a book, 3 of 3 steps completed, completed',
      });
    });

    it('does not set a11y label/hint when non-interactive', () => {
      renderWithProviders(<GoalCard goal={activeGoal} />);
      expect(screen.queryByRole('button')).toBeNull();
    });
  });

  describe('EmptyState', () => {
    it('title has header role', () => {
      renderWithProviders(
        <EmptyState title="No goals yet" body="Create your first goal" />,
      );
      screen.getByRole('header', { name: 'No goals yet' });
    });

    it('renders body text', () => {
      renderWithProviders(
        <EmptyState title="No goals yet" body="Create your first goal" />,
      );
      expect(
        screen.getByText('Create your first goal'),
      ).toBeOnTheScreen();
    });

    it('action button has correct label', () => {
      renderWithProviders(
        <EmptyState
          title="No goals yet"
          body="Create your first goal"
          action={{ label: 'Add Goal', onPress: jest.fn() }}
        />,
      );
      screen.getByRole('button', { name: 'Add Goal' });
    });
  });
});
