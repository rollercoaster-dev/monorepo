import React from 'react';
import { renderWithProviders, screen } from '../test-utils';
import {
  expectAccessible,
  expectAccessibleRole,
  expectAccessibleLabel,
  expectAccessibleValue,
} from '../a11y-helpers';
import { StatusBadge } from '../../components/StatusBadge';
import { ProgressBar } from '../../components/ProgressBar';

describe('Accessibility: Status & Progress', () => {
  describe('StatusBadge', () => {
    it('has text role with status prefix label', () => {
      renderWithProviders(<StatusBadge variant="active" />);
      const badge = screen.getByLabelText('Status: Active');
      expectAccessible(badge);
      expectAccessibleRole(badge, 'text');
      expectAccessibleLabel(badge, 'Status: Active');
    });

    it('uses custom label when provided', () => {
      renderWithProviders(
        <StatusBadge variant="completed" label="Finished" />,
      );
      const badge = screen.getByLabelText('Status: Finished');
      expectAccessibleLabel(badge, 'Status: Finished');
    });

    it.each([
      ['active', 'Active'],
      ['completed', 'Done'],
      ['locked', 'Locked'],
      ['earned', 'Earned'],
    ] as const)(
      'renders default label for %s variant',
      (variant, expectedLabel) => {
        renderWithProviders(<StatusBadge variant={variant} />);
        screen.getByLabelText(`Status: ${expectedLabel}`);
      },
    );
  });

  describe('ProgressBar', () => {
    it('has progressbar role', () => {
      renderWithProviders(<ProgressBar progress={0.5} />);
      const bar = screen.getByRole('progressbar');
      expectAccessible(bar);
      expectAccessibleRole(bar, 'progressbar');
    });

    it('exposes value with min=0, max=100, now=50 at 50%', () => {
      renderWithProviders(<ProgressBar progress={0.5} />);
      const bar = screen.getByRole('progressbar');
      expectAccessibleValue(bar, { min: 0, max: 100, now: 50 });
    });

    it('clamps progress to 0-100 range', () => {
      renderWithProviders(<ProgressBar progress={1.5} />);
      const bar = screen.getByRole('progressbar');
      expectAccessibleValue(bar, { now: 100 });
    });

    it('reports 0% for zero progress', () => {
      renderWithProviders(<ProgressBar progress={0} />);
      const bar = screen.getByRole('progressbar');
      expectAccessibleValue(bar, { now: 0 });
    });

    it('rounds to nearest integer', () => {
      renderWithProviders(<ProgressBar progress={0.333} />);
      const bar = screen.getByRole('progressbar');
      expectAccessibleValue(bar, { now: 33 });
    });
  });
});
