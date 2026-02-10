import React from 'react';
import { Text as RNText } from 'react-native';
import { renderWithProviders, screen, fireEvent } from '../test-utils';
import {
  expectAccessible,
  expectAccessibleRole,
  expectAccessibleLabel,
  expectAccessibleState,
} from '../a11y-helpers';
import { Button } from '../../components/Button';
import { IconButton } from '../../components/IconButton';
import { Card } from '../../components/Card';
import { CollapsibleSection } from '../../components/CollapsibleSection';
import { SettingsRow } from '../../components/SettingsRow';
import { Checkbox } from '../../components/Checkbox';

jest.mock('expo-haptics', () => ({
  impactAsync: jest.fn().mockResolvedValue(undefined),
  ImpactFeedbackStyle: { Light: 'light', Medium: 'medium', Heavy: 'heavy' },
}));

describe('Accessibility: Interactive Elements', () => {
  describe('Button', () => {
    it('has button role and label', () => {
      renderWithProviders(<Button label="Save" onPress={jest.fn()} />);
      const button = screen.getByRole('button', { name: 'Save' });
      expectAccessible(button);
      expectAccessibleRole(button, 'button');
      expectAccessibleLabel(button, 'Save');
    });

    it('exposes disabled state', () => {
      renderWithProviders(
        <Button label="Save" onPress={jest.fn()} disabled />,
      );
      const button = screen.getByRole('button', { name: 'Save' });
      expectAccessibleState(button, { disabled: true });
    });

    it('exposes busy state when loading', () => {
      renderWithProviders(
        <Button label="Save" onPress={jest.fn()} loading />,
      );
      const button = screen.getByRole('button', { name: 'Save' });
      expectAccessibleState(button, { busy: true, disabled: true });
    });
  });

  describe('IconButton', () => {
    it('has button role and required label', () => {
      renderWithProviders(
        <IconButton
          icon={<RNText>X</RNText>}
          onPress={jest.fn()}
          accessibilityLabel="Close"
        />,
      );
      const button = screen.getByRole('button', { name: 'Close' });
      expectAccessible(button);
      expectAccessibleRole(button, 'button');
      expectAccessibleLabel(button, 'Close');
    });

    it('exposes disabled state', () => {
      renderWithProviders(
        <IconButton
          icon={<RNText>X</RNText>}
          onPress={jest.fn()}
          accessibilityLabel="Close"
          disabled
        />,
      );
      const button = screen.getByRole('button', { name: 'Close' });
      expectAccessibleState(button, { disabled: true });
    });
  });

  describe('Card (pressable)', () => {
    it('has button role when onPress is provided', () => {
      renderWithProviders(
        <Card onPress={jest.fn()} accessibilityLabel="Goal card">
          <RNText>Content</RNText>
        </Card>,
      );
      const card = screen.getByRole('button', { name: 'Goal card' });
      expectAccessible(card);
      expectAccessibleRole(card, 'button');
    });

    it('passes through accessibilityHint', () => {
      renderWithProviders(
        <Card
          onPress={jest.fn()}
          accessibilityLabel="Goal card"
          accessibilityHint="Double-tap to view"
        >
          <RNText>Content</RNText>
        </Card>,
      );
      const card = screen.getByRole('button', { name: 'Goal card' });
      expect(card.props.accessibilityHint).toBe('Double-tap to view');
    });

    it('does not have button role when non-interactive', () => {
      renderWithProviders(
        <Card>
          <RNText>Content</RNText>
        </Card>,
      );
      expect(screen.queryByRole('button')).toBeNull();
    });
  });

  describe('CollapsibleSection', () => {
    it('has button role with expanded state', () => {
      renderWithProviders(
        <CollapsibleSection title="Details" defaultExpanded>
          <RNText>Content</RNText>
        </CollapsibleSection>,
      );
      const header = screen.getByRole('button', {
        name: 'Details, collapse',
      });
      expectAccessible(header);
      expectAccessibleState(header, { expanded: true });
    });

    it('updates label and state when collapsed', () => {
      renderWithProviders(
        <CollapsibleSection title="Details" defaultExpanded={false}>
          <RNText>Content</RNText>
        </CollapsibleSection>,
      );
      const header = screen.getByRole('button', { name: 'Details, expand' });
      expectAccessibleState(header, { expanded: false });
    });

    it('toggles expanded state on press', () => {
      renderWithProviders(
        <CollapsibleSection title="Details" defaultExpanded>
          <RNText>Content</RNText>
        </CollapsibleSection>,
      );
      const header = screen.getByRole('button', {
        name: 'Details, collapse',
      });
      fireEvent.press(header);
      const collapsed = screen.getByRole('button', {
        name: 'Details, expand',
      });
      expectAccessibleState(collapsed, { expanded: false });
    });
  });

  describe('SettingsRow (pressable)', () => {
    it('has button role and label when onPress is provided', () => {
      renderWithProviders(
        <SettingsRow label="Theme" onPress={jest.fn()} />,
      );
      const row = screen.getByRole('button', { name: 'Theme' });
      expectAccessible(row);
      expectAccessibleRole(row, 'button');
      expectAccessibleLabel(row, 'Theme');
    });
  });

  describe('Checkbox', () => {
    it('has checkbox role and label', () => {
      renderWithProviders(
        <Checkbox checked={false} onToggle={jest.fn()} label="Learn React" />,
      );
      const checkbox = screen.getByRole('checkbox', { name: 'Learn React' });
      expectAccessible(checkbox);
      expectAccessibleRole(checkbox, 'checkbox');
      expectAccessibleLabel(checkbox, 'Learn React');
    });

    it('exposes checked=false state', () => {
      renderWithProviders(
        <Checkbox checked={false} onToggle={jest.fn()} label="Step 1" />,
      );
      const checkbox = screen.getByRole('checkbox', { name: 'Step 1' });
      expectAccessibleState(checkbox, { checked: false });
    });

    it('exposes checked=true state', () => {
      renderWithProviders(
        <Checkbox checked onToggle={jest.fn()} label="Step 1" />,
      );
      const checkbox = screen.getByRole('checkbox', { name: 'Step 1' });
      expectAccessibleState(checkbox, { checked: true });
    });

    it('label pressable has edit hint when onLabelPress provided', () => {
      renderWithProviders(
        <Checkbox
          checked={false}
          onToggle={jest.fn()}
          label="Step 1"
          onLabelPress={jest.fn()}
        />,
      );
      const labelPress = screen.getByLabelText('Edit Step 1');
      expect(labelPress.props.accessibilityHint).toBe(
        'Tap to edit step title',
      );
    });
  });
});
