import React from 'react';
import { renderWithProviders, screen, fireEvent } from '../../../__tests__/test-utils';
import { StepList, type Step } from '../StepList';

jest.mock('react-native-gesture-handler', () => ({
  GestureHandlerRootView: ({ children }: { children: React.ReactNode }) => children,
  GestureDetector: ({ children }: { children: React.ReactNode }) => children,
  Gesture: { Pan: () => ({ onStart: () => ({}), onUpdate: () => ({}), onEnd: () => ({}) }) },
}));

jest.mock('expo-haptics', () => ({
  impactAsync: jest.fn().mockResolvedValue(undefined),
  ImpactFeedbackStyle: { Light: 'light', Medium: 'medium', Heavy: 'heavy' },
}));

jest.mock('../../../utils/haptics', () => ({
  triggerDragStart: jest.fn(),
  triggerDragDrop: jest.fn(),
}));

jest.mock('../../../hooks/useAnimationPref', () => ({
  useAnimationPref: () => ({
    animationPref: 'full',
    shouldAnimate: true,
    shouldReduceMotion: false,
    setAnimationPref: jest.fn(),
  }),
}));

const mockSteps: Step[] = [
  { id: '1', title: 'Step one', completed: false },
  { id: '2', title: 'Step two', completed: true },
];

describe('StepList', () => {
  it('renders steps with header and count', () => {
    renderWithProviders(
      <StepList steps={mockSteps} onToggleStep={jest.fn()} />,
    );
    expect(screen.getByText('Steps')).toBeOnTheScreen();
    expect(screen.getByText('1/2')).toBeOnTheScreen();
    expect(screen.getByText('Step one')).toBeOnTheScreen();
    expect(screen.getByText('Step two')).toBeOnTheScreen();
  });

  it('calls onToggleStep when a checkbox is pressed', () => {
    const onToggle = jest.fn();
    renderWithProviders(
      <StepList steps={mockSteps} onToggleStep={onToggle} />,
    );
    fireEvent.press(screen.getByRole('checkbox', { name: 'Step one' }));
    expect(onToggle).toHaveBeenCalledWith('1');
  });

  it('shows add step input when onCreateStep is provided', () => {
    renderWithProviders(
      <StepList
        steps={mockSteps}
        onToggleStep={jest.fn()}
        onCreateStep={jest.fn()}
      />,
    );
    expect(screen.getByLabelText('Add a new step')).toBeOnTheScreen();
  });
});
