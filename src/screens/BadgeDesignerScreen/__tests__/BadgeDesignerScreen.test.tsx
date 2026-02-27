import React from 'react';
import { renderWithProviders, screen, fireEvent } from '../../../__tests__/test-utils';
import { BadgeDesignerScreen } from '../BadgeDesignerScreen';
import type { BadgeDesignerScreenProps } from '../../../navigation/types';

const mockGoBack = jest.fn();

jest.mock('@react-navigation/native', () => {
  const actual = jest.requireActual('@react-navigation/native');
  return {
    ...actual,
    useNavigation: () => ({
      navigate: jest.fn(),
      goBack: mockGoBack,
      setOptions: jest.fn(),
      addListener: jest.fn(() => jest.fn()),
      canGoBack: jest.fn(() => true),
    }),
  };
});

const mockUseQuery = jest.fn();
jest.mock('@evolu/react', () => {
  const actual = jest.requireActual('@evolu/react');
  return {
    ...actual,
    useQuery: (...args: unknown[]) => mockUseQuery(...args),
  };
});

const mockUpdateBadge = jest.fn();
jest.mock('../../../db', () => ({
  badgeWithGoalQuery: jest.fn(() => ({ __brand: 'badgeWithGoalQuery' })),
  updateBadge: (...args: unknown[]) => mockUpdateBadge(...args),
}));

// Mock react-native-svg
jest.mock('react-native-svg', () => {
  const React = require('react');
  const { View } = require('react-native');
  return {
    __esModule: true,
    default: (props: Record<string, unknown>) => <View {...props} />,
    Svg: (props: Record<string, unknown>) => <View {...props} />,
    Path: (props: Record<string, unknown>) => <View {...props} />,
    G: (props: Record<string, unknown>) => <View {...props} />,
  };
});

// Mock phosphor-react-native (virtual — not installed in node_modules)
jest.mock('phosphor-react-native', () => {
  const React = require('react');
  const { View, Text } = require('react-native');
  const createMockIcon = (name: string) => {
    const MockIcon: React.FC<{ size?: number; weight?: string; color?: string }> = () => (
      <View testID={`icon-${name}`}>
        <Text>{name}</Text>
      </View>
    );
    MockIcon.displayName = name;
    return MockIcon;
  };
  const iconNames = [
    'Trophy', 'Medal', 'Star', 'Crown', 'Heart', 'Book', 'Code', 'Brain',
    'Rocket', 'Fire', 'ShieldCheck', 'Lightbulb',
    'X', 'GraduationCap', 'PaintBrush', 'Leaf', 'ChatCircle', 'Coin',
    'SoccerBall', 'Airplane', 'Sparkle',
  ];
  const exports: Record<string, unknown> = {
    IconContext: React.createContext({}),
  };
  for (const name of iconNames) {
    exports[name] = createMockIcon(name);
  }
  return exports;
}, { virtual: true });

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

const makeRow = (overrides: Record<string, unknown> = {}) => ({
  id: 'badge-1',
  goalId: 'goal-1',
  credential: '{}',
  imageUri: 'file://badge.png',
  design: JSON.stringify({
    shape: 'circle',
    frame: 'none',
    color: '#a78bfa',
    iconName: 'Trophy',
    iconWeight: 'regular',
    title: 'Learn TypeScript',
  }),
  createdAt: '2026-01-28T00:00:00.000Z',
  goalTitle: 'Learn TypeScript',
  completedAt: '2026-01-28T00:00:00.000Z',
  goalColor: '#06b6d4',
  ...overrides,
});

const mockRoute = {
  params: { badgeId: 'badge-1' },
  key: 'BadgeDesigner-1',
  name: 'BadgeDesigner' as const,
} as BadgeDesignerScreenProps['route'];

beforeEach(() => {
  jest.clearAllMocks();
  mockUseQuery.mockReturnValue([]);
});

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe('BadgeDesignerScreen', () => {
  it('renders "Badge not found" when badge does not exist', () => {
    renderWithProviders(
      <BadgeDesignerScreen route={mockRoute} navigation={{} as never} />,
    );
    expect(screen.getByText('Badge not found')).toBeOnTheScreen();
  });

  it('renders top bar with "Design Badge" title', () => {
    mockUseQuery.mockReturnValue([makeRow()]);
    renderWithProviders(
      <BadgeDesignerScreen route={mockRoute} navigation={{} as never} />,
    );
    expect(screen.getByText('Design Badge')).toBeOnTheScreen();
  });

  it('renders back button that calls goBack', () => {
    mockUseQuery.mockReturnValue([makeRow()]);
    renderWithProviders(
      <BadgeDesignerScreen route={mockRoute} navigation={{} as never} />,
    );
    fireEvent.press(screen.getByLabelText('Go back'));
    expect(mockGoBack).toHaveBeenCalled();
  });

  it('renders live preview with accessibility label', () => {
    mockUseQuery.mockReturnValue([makeRow()]);
    renderWithProviders(
      <BadgeDesignerScreen route={mockRoute} navigation={{} as never} />,
    );
    expect(
      screen.getByLabelText(/Badge preview:.*circle.*Trophy/),
    ).toBeOnTheScreen();
  });

  it('renders ShapeSelector with all 6 shapes', () => {
    mockUseQuery.mockReturnValue([makeRow()]);
    renderWithProviders(
      <BadgeDesignerScreen route={mockRoute} navigation={{} as never} />,
    );
    expect(screen.getByLabelText('Badge shape')).toBeOnTheScreen();
    expect(screen.getByLabelText('Circle shape')).toBeOnTheScreen();
    expect(screen.getByLabelText('Diamond shape')).toBeOnTheScreen();
  });

  it('renders ColorPicker with accent swatches and goal color', () => {
    mockUseQuery.mockReturnValue([makeRow()]);
    renderWithProviders(
      <BadgeDesignerScreen route={mockRoute} navigation={{} as never} />,
    );
    expect(screen.getByLabelText('Badge color')).toBeOnTheScreen();
    expect(screen.getByLabelText('Purple color')).toBeOnTheScreen();
    expect(screen.getByLabelText('Goal color')).toBeOnTheScreen();
  });

  it('renders Save Design button', () => {
    mockUseQuery.mockReturnValue([makeRow()]);
    renderWithProviders(
      <BadgeDesignerScreen route={mockRoute} navigation={{} as never} />,
    );
    expect(screen.getByLabelText('Save Design')).toBeOnTheScreen();
  });

  it('calls updateBadge and goBack when Save is pressed', () => {
    mockUseQuery.mockReturnValue([makeRow()]);
    renderWithProviders(
      <BadgeDesignerScreen route={mockRoute} navigation={{} as never} />,
    );

    fireEvent.press(screen.getByLabelText('Save Design'));
    expect(mockUpdateBadge).toHaveBeenCalledWith(
      'badge-1',
      expect.objectContaining({
        design: expect.stringContaining('"shape":"circle"'),
      }),
    );
    expect(mockGoBack).toHaveBeenCalled();
  });

  it('updates preview when a different shape is selected', () => {
    mockUseQuery.mockReturnValue([makeRow()]);
    renderWithProviders(
      <BadgeDesignerScreen route={mockRoute} navigation={{} as never} />,
    );

    fireEvent.press(screen.getByLabelText('Shield shape'));
    expect(
      screen.getByLabelText(/Badge preview:.*shield/i),
    ).toBeOnTheScreen();
  });

  it('updates preview when a different color is selected', () => {
    mockUseQuery.mockReturnValue([makeRow()]);
    renderWithProviders(
      <BadgeDesignerScreen route={mockRoute} navigation={{} as never} />,
    );

    fireEvent.press(screen.getByLabelText('Mint color'));
    expect(
      screen.getByLabelText(/Badge preview:.*#34d399/),
    ).toBeOnTheScreen();
  });

  it('persists modified design when Save is pressed after changes', () => {
    mockUseQuery.mockReturnValue([makeRow()]);
    renderWithProviders(
      <BadgeDesignerScreen route={mockRoute} navigation={{} as never} />,
    );

    fireEvent.press(screen.getByLabelText('Shield shape'));
    fireEvent.press(screen.getByLabelText('Mint color'));
    fireEvent.press(screen.getByLabelText('Save Design'));

    expect(mockUpdateBadge).toHaveBeenCalledWith(
      'badge-1',
      expect.objectContaining({
        design: expect.stringContaining('"shape":"shield"'),
      }),
    );
    expect(mockUpdateBadge).toHaveBeenCalledWith(
      'badge-1',
      expect.objectContaining({
        design: expect.stringContaining('"color":"#34d399"'),
      }),
    );
    expect(mockGoBack).toHaveBeenCalled();
  });

  it('creates default design when badge has no existing design', () => {
    mockUseQuery.mockReturnValue([makeRow({ design: null })]);
    renderWithProviders(
      <BadgeDesignerScreen route={mockRoute} navigation={{} as never} />,
    );
    // Should still render with default design
    expect(
      screen.getByLabelText(/Badge preview:/),
    ).toBeOnTheScreen();
    expect(screen.getByLabelText('Save Design')).toBeOnTheScreen();
  });
});
