import React from 'react';
import { renderWithProviders, screen, fireEvent } from '../../../__tests__/test-utils';
import { CompletionFlowScreen } from '../CompletionFlowScreen';

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

jest.mock('../../../hooks/useAnimationPref', () => ({
  useAnimationPref: jest.fn(() => ({
    animationPref: 'full',
    shouldAnimate: true,
    shouldReduceMotion: false,
    setAnimationPref: jest.fn(),
  })),
}));

const mockUncompleteGoal = jest.fn();
jest.mock('../../../db', () => ({
  EvidenceType: {
    photo: 'photo',
    screenshot: 'screenshot',
    text: 'text',
    voice_memo: 'voice_memo',
    video: 'video',
    link: 'link',
    file: 'file',
  },
  GoalStatus: { active: 'active', completed: 'completed' },
  goalsQuery: 'goalsQuery',
  stepsByGoalQuery: jest.fn((id: string) => `stepsByGoalQuery-${id}`),
  evidenceByGoalQuery: jest.fn((id: string) => `evidenceByGoalQuery-${id}`),
  uncompleteGoal: (...args: unknown[]) => mockUncompleteGoal(...args),
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

const COMPLETED_STEPS = [
  { id: 'step-1', title: 'Read docs', status: 'completed', ordinal: 0 },
  { id: 'step-2', title: 'Practice', status: 'completed', ordinal: 1 },
  { id: 'step-3', title: 'Build project', status: 'completed', ordinal: 2 },
];

const routeProps = {
  route: {
    key: 'CompletionFlow-1',
    name: 'CompletionFlow' as const,
    params: { goalId: 'goal-1' },
  },
  navigation: {} as any,
};

function setupQueries({
  goal = GOAL,
  steps = COMPLETED_STEPS,
  goalEvidence = [] as object[],
}: {
  goal?: object | null;
  steps?: object[];
  goalEvidence?: object[];
} = {}) {
  mockUseQuery.mockImplementation((query: unknown) => {
    if (query === 'goalsQuery') return goal ? [goal] : [];
    if (typeof query === 'string' && query.startsWith('stepsByGoalQuery')) return steps;
    if (typeof query === 'string' && query.startsWith('evidenceByGoalQuery')) return goalEvidence;
    return [];
  });
}

// --- Tests ---

describe('CompletionFlowScreen', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockUseQuery.mockReturnValue([]);
  });

  it('renders celebration headline', () => {
    setupQueries();
    renderWithProviders(<CompletionFlowScreen {...routeProps} />);
    expect(screen.getByText('You did it!')).toBeOnTheScreen();
  });

  it('shows correct summary text with step count and goal title', () => {
    setupQueries();
    renderWithProviders(<CompletionFlowScreen {...routeProps} />);
    expect(
      screen.getByText('All 3 steps completed for Learn TypeScript'),
    ).toBeOnTheScreen();
  });

  it('shows both action buttons', () => {
    setupQueries();
    renderWithProviders(<CompletionFlowScreen {...routeProps} />);
    expect(screen.getByLabelText('Add Final Evidence')).toBeOnTheScreen();
    expect(screen.getByLabelText(/View Your Journey/)).toBeOnTheScreen();
  });

  it('does not show evidence list initially', () => {
    setupQueries();
    renderWithProviders(<CompletionFlowScreen {...routeProps} />);
    expect(screen.queryByText('Goal Evidence Added')).not.toBeOnTheScreen();
  });

  it('shows evidence list when evidence has been added', () => {
    const evidence = [
      { id: 'ev-1', type: 'photo', description: 'Photo evidence', uri: '/photo.jpg' },
    ];
    setupQueries({ goalEvidence: evidence });
    renderWithProviders(<CompletionFlowScreen {...routeProps} />);
    expect(screen.getByText('Goal Evidence Added')).toBeOnTheScreen();
    expect(screen.getByText('Photo evidence')).toBeOnTheScreen();
  });

  it('navigates to capture screen when "Add Final Evidence" is tapped', () => {
    setupQueries();
    renderWithProviders(<CompletionFlowScreen {...routeProps} />);
    fireEvent.press(screen.getByLabelText('Add Final Evidence'));
    expect(mockNavigate).toHaveBeenCalledWith('CapturePhoto', { goalId: 'goal-1' });
  });

  it('navigates to TimelineJourney when "View Your Journey" is tapped', () => {
    setupQueries();
    renderWithProviders(<CompletionFlowScreen {...routeProps} />);
    fireEvent.press(screen.getByLabelText(/View Your Journey/));
    expect(mockNavigate).toHaveBeenCalledWith('TimelineJourney', { goalId: 'goal-1' });
  });

  it('shows "Goal not found" when goal does not exist', () => {
    setupQueries({ goal: null });
    renderWithProviders(<CompletionFlowScreen {...routeProps} />);
    expect(screen.getByText('Goal not found.')).toBeOnTheScreen();
  });

  it('navigates back when back button is pressed', () => {
    setupQueries();
    renderWithProviders(<CompletionFlowScreen {...routeProps} />);
    fireEvent.press(screen.getByLabelText('Go back'));
    expect(mockGoBack).toHaveBeenCalled();
  });

  it('renders "Complete" label in top bar and mode indicator', () => {
    setupQueries();
    renderWithProviders(<CompletionFlowScreen {...routeProps} />);
    expect(screen.getAllByText('Complete').length).toBeGreaterThanOrEqual(1);
  });

  it('has accessible celebration card with summary', () => {
    setupQueries();
    renderWithProviders(<CompletionFlowScreen {...routeProps} />);
    expect(
      screen.getByLabelText(
        'Congratulations! All 3 steps completed for Learn TypeScript',
      ),
    ).toBeOnTheScreen();
  });

  it('shows Reopen Goal button when goal is completed', () => {
    setupQueries({ goal: { ...GOAL, status: 'completed' } });
    renderWithProviders(<CompletionFlowScreen {...routeProps} />);
    expect(screen.getByLabelText('Reopen Goal')).toBeOnTheScreen();
  });

  it('does not show Reopen Goal button when goal is active', () => {
    setupQueries();
    renderWithProviders(<CompletionFlowScreen {...routeProps} />);
    expect(screen.queryByLabelText('Reopen Goal')).not.toBeOnTheScreen();
  });

  it('calls uncompleteGoal and navigates to FocusMode on reopen', () => {
    setupQueries({ goal: { ...GOAL, status: 'completed' } });
    renderWithProviders(<CompletionFlowScreen {...routeProps} />);
    fireEvent.press(screen.getByLabelText('Reopen Goal'));
    expect(mockUncompleteGoal).toHaveBeenCalledWith('goal-1');
    expect(mockNavigate).toHaveBeenCalledWith('FocusMode', { goalId: 'goal-1' });
  });
});
