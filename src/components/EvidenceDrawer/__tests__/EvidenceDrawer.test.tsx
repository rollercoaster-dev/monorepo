import React from 'react';
import {
  renderWithProviders,
  screen,
  fireEvent,
} from '../../../__tests__/test-utils';
import { EvidenceDrawer } from '../EvidenceDrawer';
import type { EvidenceItemData } from '../EvidenceDrawer';

const mockEvidence: EvidenceItemData[] = [
  { id: '1', type: 'photo', label: 'Lab notebook page' },
  { id: '2', type: 'link', label: 'Reference paper' },
  { id: '3', type: 'text', label: 'My observations' },
];

const defaultProps = {
  evidence: mockEvidence,
  isOpen: false,
  onToggle: jest.fn(),
  onDeleteEvidence: jest.fn(),
};

describe('EvidenceDrawer', () => {
  beforeEach(() => jest.clearAllMocks());

  it('shows handle label with evidence count when closed', () => {
    renderWithProviders(<EvidenceDrawer {...defaultProps} />);
    expect(screen.getByText('3 evidence items')).toBeOnTheScreen();
  });

  it('shows singular label for 1 item', () => {
    renderWithProviders(
      <EvidenceDrawer {...defaultProps} evidence={[mockEvidence[0]]} />,
    );
    expect(screen.getByText('1 evidence item')).toBeOnTheScreen();
  });

  it('shows evidence items when open', () => {
    renderWithProviders(<EvidenceDrawer {...defaultProps} isOpen />);
    expect(screen.getByText('Lab notebook page')).toBeOnTheScreen();
    expect(screen.getByText('Reference paper')).toBeOnTheScreen();
    expect(screen.getByText('My observations')).toBeOnTheScreen();
  });

  it('shows empty state when open with no evidence', () => {
    renderWithProviders(
      <EvidenceDrawer {...defaultProps} evidence={[]} isOpen />,
    );
    expect(
      screen.getByText('No evidence yet \u2014 tap + to add'),
    ).toBeOnTheScreen();
  });

  it('calls onToggle when handle is pressed', () => {
    const onToggle = jest.fn();
    renderWithProviders(
      <EvidenceDrawer {...defaultProps} onToggle={onToggle} />,
    );
    fireEvent.press(screen.getByLabelText('Toggle evidence drawer'));
    expect(onToggle).toHaveBeenCalledTimes(1);
  });

  it('calls onToggle when overlay is pressed', () => {
    const onToggle = jest.fn();
    renderWithProviders(
      <EvidenceDrawer {...defaultProps} isOpen onToggle={onToggle} />,
    );
    fireEvent.press(screen.getByLabelText('Close evidence drawer'));
    expect(onToggle).toHaveBeenCalledTimes(1);
  });

  it('shows goal styling label when isGoal', () => {
    renderWithProviders(
      <EvidenceDrawer {...defaultProps} isGoal />,
    );
    expect(screen.getByText('Goal evidence: 3 items')).toBeOnTheScreen();
  });

  it('has correct accessibility label for goal drawer', () => {
    renderWithProviders(
      <EvidenceDrawer {...defaultProps} isGoal />,
    );
    expect(
      screen.getByLabelText('Goal evidence drawer'),
    ).toBeOnTheScreen();
  });

  it('does not show overlay when closed', () => {
    renderWithProviders(<EvidenceDrawer {...defaultProps} />);
    expect(
      screen.queryByLabelText('Close evidence drawer'),
    ).not.toBeOnTheScreen();
  });

  it('calls onDeleteEvidence with correct id on item long-press', () => {
    const onDeleteEvidence = jest.fn();
    renderWithProviders(
      <EvidenceDrawer
        {...defaultProps}
        isOpen
        onDeleteEvidence={onDeleteEvidence}
      />,
    );
    fireEvent(
      screen.getByLabelText('photo evidence: Lab notebook page'),
      'onLongPress',
    );
    expect(onDeleteEvidence).toHaveBeenCalledWith('1');
  });

  it('shows "0 evidence items" when closed with no evidence', () => {
    renderWithProviders(
      <EvidenceDrawer {...defaultProps} evidence={[]} />,
    );
    expect(screen.getByText('0 evidence items')).toBeOnTheScreen();
  });
});
