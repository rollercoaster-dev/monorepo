import React from 'react';
import { renderWithProviders, screen, fireEvent } from '../../../__tests__/test-utils';
import { GoalDetailScreen } from '../GoalDetailScreen';

// --- Mocks ---

const mockGoBack = jest.fn();
const mockNavigate = jest.fn();
jest.mock('@react-navigation/native', () => {
  const actual = jest.requireActual('../../../__tests__/mocks/navigation');
  return {
    ...actual,
    useNavigation: jest.fn(() => ({
      ...actual.useNavigation(),
      goBack: mockGoBack,
      navigate: mockNavigate,
    })),
  };
});

// Chainable gesture mock using Proxy — every method call returns the same proxy
const mockGestureProxy = (): unknown =>
  new Proxy(() => {}, {
    get: () => (..._args: unknown[]) => mockGestureProxy(),
    apply: () => mockGestureProxy(),
  });
jest.mock('react-native-gesture-handler', () => ({
  GestureHandlerRootView: ({ children }: { children: React.ReactNode }) => children,
  GestureDetector: ({ children }: { children: React.ReactNode }) => children,
  Gesture: new Proxy({}, { get: () => () => mockGestureProxy() }),
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

const mockCompleteGoal = jest.fn();
const mockUncompleteGoal = jest.fn();
const mockDeleteGoal = jest.fn();
const mockCompleteStep = jest.fn();
const mockUncompleteStep = jest.fn();
const mockCreateStep = jest.fn();
const mockUpdateStep = jest.fn();
const mockDeleteStep = jest.fn();
const mockReorderSteps = jest.fn();

jest.mock('../../../db', () => ({
  GoalStatus: { active: 'active', completed: 'completed' },
  StepStatus: { pending: 'pending', completed: 'completed' },
  EvidenceType: {
    photo: 'photo',
    screenshot: 'screenshot',
    text: 'text',
    voice_memo: 'voice_memo',
    video: 'video',
    link: 'link',
    file: 'file',
  },
  goalsQuery: 'goalsQuery',
  stepsByGoalQuery: jest.fn(() => 'stepsByGoalQuery'),
  completeGoal: (...args: unknown[]) => mockCompleteGoal(...args),
  uncompleteGoal: (...args: unknown[]) => mockUncompleteGoal(...args),
  deleteGoal: (...args: unknown[]) => mockDeleteGoal(...args),
  completeStep: (...args: unknown[]) => mockCompleteStep(...args),
  uncompleteStep: (...args: unknown[]) => mockUncompleteStep(...args),
  createStep: (...args: unknown[]) => mockCreateStep(...args),
  updateStep: (...args: unknown[]) => mockUpdateStep(...args),
  deleteStep: (...args: unknown[]) => mockDeleteStep(...args),
  reorderSteps: (...args: unknown[]) => mockReorderSteps(...args),
}));

// useQuery mock that returns different data based on the query argument
const mockUseQuery = jest.fn();
jest.mock('@evolu/react', () => ({
  useQuery: (...args: unknown[]) => mockUseQuery(...args),
  EvoluProvider: ({ children }: { children: React.ReactNode }) => children,
}));

// --- Helpers ---

const GOAL_ACTIVE = {
  id: 'goal-1',
  title: 'Learn TypeScript',
  description: 'Master the type system',
  status: 'active',
};

const GOAL_COMPLETED = {
  ...GOAL_ACTIVE,
  status: 'completed',
};

const STEPS_MIXED = [
  { id: 'step-1', title: 'Read docs', status: 'pending', ordinal: 0 },
  { id: 'step-2', title: 'Practice', status: 'completed', ordinal: 1 },
];

const STEPS_ALL_COMPLETE = [
  { id: 'step-1', title: 'Read docs', status: 'completed', ordinal: 0 },
  { id: 'step-2', title: 'Practice', status: 'completed', ordinal: 1 },
];

const routeProps = {
  route: {
    key: 'GoalDetail-1',
    name: 'GoalDetail' as const,
    params: { goalId: 'goal-1' },
  },
  navigation: {} as any,
};

function setupQueries(goal: object | null = GOAL_ACTIVE, steps = STEPS_MIXED) {
  mockUseQuery.mockImplementation((query: unknown) => {
    if (query === 'goalsQuery') {
      return goal ? [goal] : [];
    }
    // stepsByGoalQuery
    return steps;
  });
}

// --- Tests ---

describe('GoalDetailScreen', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockUseQuery.mockReturnValue([]);
  });

  it('renders goal title and description', () => {
    setupQueries();
    renderWithProviders(<GoalDetailScreen {...routeProps} />);
    expect(screen.getByText('Learn TypeScript')).toBeOnTheScreen();
    expect(screen.getByText('Master the type system')).toBeOnTheScreen();
  });

  it('shows "Goal not found" when goal does not exist', () => {
    setupQueries(null, []);
    renderWithProviders(<GoalDetailScreen {...routeProps} />);
    expect(screen.getByText('Goal not found.')).toBeOnTheScreen();
  });

  it('renders step list with step count', () => {
    setupQueries();
    renderWithProviders(<GoalDetailScreen {...routeProps} />);
    expect(screen.getByText('Steps')).toBeOnTheScreen();
    expect(screen.getByText('1/2')).toBeOnTheScreen();
  });

  it('shows "Complete Goal" button for active goal', () => {
    setupQueries();
    renderWithProviders(<GoalDetailScreen {...routeProps} />);
    expect(screen.getByText('Complete Goal')).toBeOnTheScreen();
  });

  it('shows "Reopen" button for completed goal', () => {
    setupQueries(GOAL_COMPLETED);
    renderWithProviders(<GoalDetailScreen {...routeProps} />);
    expect(screen.getByText('Reopen')).toBeOnTheScreen();
  });

  it('shows completion confirmation when Complete Goal is pressed', () => {
    setupQueries();
    renderWithProviders(<GoalDetailScreen {...routeProps} />);
    fireEvent.press(screen.getByText('Complete Goal'));
    expect(screen.getByText('Complete this goal?')).toBeOnTheScreen();
  });

  it('shows "All steps done!" cue when all steps complete and goal active', () => {
    setupQueries(GOAL_ACTIVE, STEPS_ALL_COMPLETE);
    renderWithProviders(<GoalDetailScreen {...routeProps} />);
    expect(screen.getByText('All steps done!')).toBeOnTheScreen();
  });

  it('opens delete goal modal when Delete is pressed', () => {
    setupQueries();
    renderWithProviders(<GoalDetailScreen {...routeProps} />);
    fireEvent.press(screen.getByText('Delete'));
    expect(screen.getByText('Delete this goal?')).toBeOnTheScreen();
  });

  it('shows Add Evidence button', () => {
    setupQueries();
    renderWithProviders(<GoalDetailScreen {...routeProps} />);
    expect(screen.getByText('Add Evidence')).toBeOnTheScreen();
  });
});
