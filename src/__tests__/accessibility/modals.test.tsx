import React from 'react';
import { renderWithProviders, screen } from '../test-utils';
import {
  expectModalAccessibility,
  expectLiveRegion,
} from '../a11y-helpers';
import { CelebrationModal } from '../../screens/CelebrationModal';
import { ConfirmDeleteModal } from '../../screens/ConfirmDeleteModal';

describe('Accessibility: Modals', () => {
  describe('CelebrationModal', () => {
    it('has accessibilityViewIsModal on the Modal', () => {
      renderWithProviders(
        <CelebrationModal
          visible
          onDismiss={jest.fn()}
          title="Goal Complete!"
        />,
      );
      const modal = screen.UNSAFE_getByType(
        require('react-native').Modal,
      );
      expectModalAccessibility(modal);
    });

    it('content area has accessibilityLiveRegion=polite', () => {
      renderWithProviders(
        <CelebrationModal
          visible
          onDismiss={jest.fn()}
          title="Goal Complete!"
          message="You did it!"
        />,
      );
      const liveViews = screen.UNSAFE_getAllByType(
        require('react-native').View,
      ).filter(
        (v) => v.props.accessibilityLiveRegion === 'polite',
      );
      expect(liveViews.length).toBeGreaterThan(0);
      expectLiveRegion(liveViews[0]!, 'polite');
    });

    it('title has header role', () => {
      renderWithProviders(
        <CelebrationModal
          visible
          onDismiss={jest.fn()}
          title="Goal Complete!"
        />,
      );
      screen.getByRole('header', { name: 'Goal Complete!' });
    });

    it('renders dismiss button with label', () => {
      renderWithProviders(
        <CelebrationModal
          visible
          onDismiss={jest.fn()}
          title="Goal Complete!"
        />,
      );
      screen.getByRole('button', { name: 'Done' });
    });

    it('renders action button when provided', () => {
      renderWithProviders(
        <CelebrationModal
          visible
          onDismiss={jest.fn()}
          title="Goal Complete!"
          actionLabel="Share"
          onAction={jest.fn()}
        />,
      );
      screen.getByRole('button', { name: 'Share' });
      screen.getByRole('button', { name: 'Done' });
    });
  });

  describe('ConfirmDeleteModal', () => {
    it('has accessibilityViewIsModal on the Modal', () => {
      renderWithProviders(
        <ConfirmDeleteModal
          visible
          onCancel={jest.fn()}
          onConfirm={jest.fn()}
        />,
      );
      const modal = screen.UNSAFE_getByType(
        require('react-native').Modal,
      );
      expectModalAccessibility(modal);
    });

    it('content area has accessibilityLiveRegion=polite', () => {
      renderWithProviders(
        <ConfirmDeleteModal
          visible
          onCancel={jest.fn()}
          onConfirm={jest.fn()}
        />,
      );
      const liveViews = screen.UNSAFE_getAllByType(
        require('react-native').View,
      ).filter(
        (v) => v.props.accessibilityLiveRegion === 'polite',
      );
      expect(liveViews.length).toBeGreaterThan(0);
      expectLiveRegion(liveViews[0]!, 'polite');
    });

    it('title has header role', () => {
      renderWithProviders(
        <ConfirmDeleteModal
          visible
          onCancel={jest.fn()}
          onConfirm={jest.fn()}
        />,
      );
      screen.getByRole('header', { name: 'Delete this item?' });
    });

    it('renders confirm and cancel buttons', () => {
      renderWithProviders(
        <ConfirmDeleteModal
          visible
          onCancel={jest.fn()}
          onConfirm={jest.fn()}
        />,
      );
      screen.getByRole('button', { name: 'Delete' });
      screen.getByRole('button', { name: 'Cancel' });
    });

    it('uses custom labels when provided', () => {
      renderWithProviders(
        <ConfirmDeleteModal
          visible
          onCancel={jest.fn()}
          onConfirm={jest.fn()}
          title="Remove goal?"
          confirmLabel="Remove"
          cancelLabel="Keep"
        />,
      );
      screen.getByRole('header', { name: 'Remove goal?' });
      screen.getByRole('button', { name: 'Remove' });
      screen.getByRole('button', { name: 'Keep' });
    });
  });
});
