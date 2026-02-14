import React from 'react';
import { renderWithProviders, screen, fireEvent } from '../../../__tests__/test-utils';
import { FocusModeScreen } from '../FocusModeScreen';

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

const mockCompleteStep = jest.fn();
const mockUncompleteStep = jest.fn();
const mockDeleteEvidence = jest.fn();

jest.mock('../../../utils/evidenceCleanup', () => ({
  deleteEvidenceFile: jest.fn(),
}));

jest.mock('../../../db', () => ({
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
  stepsByGoalQuery: jest.fn((id: string) => `stepsByGoalQuery-${id}`),
  evidenceByGoalQuery: jest.fn((id: string) => `evidenceByGoalQuery-${id}`),
  evidenceByStepQuery: jest.fn((id: string) => `evidenceByStepQuery-${id}`),
  completeStep: (...args: unknown[]) => mockCompleteStep(...args),
  uncompleteStep: (...args: unknown[]) => mockUncompleteStep(...args),
  deleteEvidence: (...args: unknown[]) => mockDeleteEvidence(...args),
}));

const mockUseQuery = jest.fn();
jest.mock('@evolu/react', () => ({
  useQuery: (...args: unknown[]) => mockUseQuery(...args),
  EvoluProvider: ({ children }: { children: React.ReactNode }) => children,
}));

// --- Helpers ---

const GOAL = {
  id: 'goal-1',
  title: 'Learn TypeScript',
  description: 'Master the type system',
  status: 'active',
};

const STEPS = [
  { id: 'step-1', title: 'Read docs', status: 'pending', ordinal: 0 },
  { id: 'step-2', title: 'Practice', status: 'completed', ordinal: 1 },
];

const GOAL_EVIDENCE = [
  { id: 'ev-g1', type: 'photo', uri: '/goal-photo.jpg', description: 'Goal photo' },
];

const STEP_EVIDENCE = [
  { id: 'ev-s1', type: 'text', uri: 'content:text;My notes', description: 'Step notes' },
];

const routeProps = {
  route: {
    key: 'FocusMode-1',
    name: 'FocusMode' as const,
    params: { goalId: 'goal-1' },
  },
  navigation: {} as any,
};

function setupQueries({
  goal = GOAL,
  steps = STEPS,
  goalEvidence = GOAL_EVIDENCE,
  stepEvidence = STEP_EVIDENCE,
}: {
  goal?: object | null;
  steps?: object[];
  goalEvidence?: object[];
  stepEvidence?: object[];
} = {}) {
  mockUseQuery.mockImplementation((query: unknown) => {
    if (query === 'goalsQuery') return goal ? [goal] : [];
    if (typeof query === 'string' && query.startsWith('evidenceByGoalQuery')) return goalEvidence;
    if (typeof query === 'string' && query.startsWith('evidenceByStepQuery')) return stepEvidence;
    if (typeof query === 'string' && query.startsWith('stepsByGoalQuery')) return steps;
    return [];
  });
}

// --- Tests ---

describe('FocusModeScreen', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockUseQuery.mockReturnValue([]);
  });

  it('renders goal title in header', () => {
    setupQueries();
    renderWithProviders(<FocusModeScreen {...routeProps} />);
    expect(screen.getByText('Learn TypeScript')).toBeOnTheScreen();
  });

  it('shows "Goal not found" when goal does not exist', () => {
    setupQueries({ goal: null, steps: [] });
    renderWithProviders(<FocusModeScreen {...routeProps} />);
    expect(screen.getByText('Goal not found.')).toBeOnTheScreen();
  });

  it('renders MiniTimeline with step navigation', () => {
    setupQueries();
    renderWithProviders(<FocusModeScreen {...routeProps} />);
    // Labels appear in both MiniTimeline (button) and ProgressDots (tab)
    expect(screen.getAllByLabelText('Step 1: in-progress').length).toBeGreaterThanOrEqual(1);
    expect(screen.getAllByLabelText('Step 2: completed').length).toBeGreaterThanOrEqual(1);
  });

  it('renders ProgressDots with step and goal dots', () => {
    setupQueries();
    renderWithProviders(<FocusModeScreen {...routeProps} />);
    // ProgressDots renders tab elements
    expect(screen.getByLabelText('Step navigation')).toBeOnTheScreen();
    // "Goal evidence" label appears in both MiniTimeline and ProgressDots
    expect(screen.getAllByLabelText('Goal evidence').length).toBeGreaterThanOrEqual(2);
  });

  it('renders StepCard for current step', () => {
    setupQueries();
    renderWithProviders(<FocusModeScreen {...routeProps} />);
    expect(screen.getByText('Step 1 of 2')).toBeOnTheScreen();
    expect(screen.getByText('Read docs')).toBeOnTheScreen();
  });

  it('calls completeStep when step checkbox is toggled', () => {
    setupQueries();
    renderWithProviders(<FocusModeScreen {...routeProps} />);
    fireEvent.press(screen.getByText('Mark complete'));
    expect(mockCompleteStep).toHaveBeenCalledWith('step-1');
  });

  it('calls uncompleteStep when completed step checkbox is toggled', () => {
    setupQueries({
      steps: [
        { id: 'step-1', title: 'Read docs', status: 'completed', ordinal: 0 },
        { id: 'step-2', title: 'Practice', status: 'pending', ordinal: 1 },
      ],
    });
    renderWithProviders(<FocusModeScreen {...routeProps} />);
    // "Completed" appears as both StatusBadge label and Checkbox label
    // Target the checkbox specifically
    const completedElements = screen.getAllByText('Completed');
    // The checkbox's Completed text is the one we want to press
    fireEvent.press(completedElements[completedElements.length - 1]);
    expect(mockUncompleteStep).toHaveBeenCalledWith('step-1');
  });

  it('renders FAB button for adding evidence', () => {
    setupQueries();
    renderWithProviders(<FocusModeScreen {...routeProps} />);
    expect(screen.getByLabelText('Add evidence')).toBeOnTheScreen();
  });

  it('opens FABMenu when FAB is pressed', () => {
    setupQueries();
    renderWithProviders(<FocusModeScreen {...routeProps} />);
    fireEvent.press(screen.getByLabelText('Add evidence'));
    expect(screen.getByLabelText('Add evidence menu')).toBeOnTheScreen();
  });

  it('navigates to capture screen when evidence type is selected', () => {
    setupQueries();
    renderWithProviders(<FocusModeScreen {...routeProps} />);
    // Open FAB menu
    fireEvent.press(screen.getByLabelText('Add evidence'));
    // Select Photo
    fireEvent.press(screen.getByLabelText('Photo'));
    expect(mockNavigate).toHaveBeenCalledWith('CapturePhoto', {
      goalId: 'goal-1',
      stepId: 'step-1',
    });
  });

  it('navigates back when back button is pressed', () => {
    setupQueries();
    renderWithProviders(<FocusModeScreen {...routeProps} />);
    fireEvent.press(screen.getByLabelText('Go back'));
    expect(mockGoBack).toHaveBeenCalled();
  });

  it('navigates to GoalDetail when edit button is pressed', () => {
    setupQueries();
    renderWithProviders(<FocusModeScreen {...routeProps} />);
    fireEvent.press(screen.getByLabelText('Edit goal'));
    expect(mockNavigate).toHaveBeenCalledWith('GoalDetail', { goalId: 'goal-1' });
  });

  it('renders "Focus Mode" label in top bar', () => {
    setupQueries();
    renderWithProviders(<FocusModeScreen {...routeProps} />);
    expect(screen.getByText('Focus Mode')).toBeOnTheScreen();
  });
});
