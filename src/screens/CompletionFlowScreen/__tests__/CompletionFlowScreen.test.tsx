import React from 'react';
import { renderWithProviders, screen, fireEvent } from '../../../__tests__/test-utils';
import { CompletionFlowScreen } from '../CompletionFlowScreen';

// --- Mocks ---

const mockGoBack = jest.fn();
const mockNavigate = jest.fn();
const mockParentNavigate = jest.fn();
const mockGetParent = jest.fn(() => ({ navigate: mockParentNavigate }));
jest.mock('@react-navigation/native', () => {
  const actual = jest.requireActual('../../../__tests__/mocks/navigation');
  return {
    ...actual,
    useNavigation: jest.fn(() => ({
      ...actual.useNavigation(),
      goBack: mockGoBack,
      navigate: mockNavigate,
      getParent: mockGetParent,
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

const mockUseCreateBadge = jest.fn<{ status: string; error: string | null }, [string]>(
  () => ({ status: 'done', error: null }),
);
jest.mock('../../../hooks/useCreateBadge', () => ({
  PLACEHOLDER_IMAGE_URI: 'pending:baked-image',
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  useCreateBadge: (goalId: any) => mockUseCreateBadge(goalId),
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
  badgeByGoalQuery: jest.fn((id: string) => `badgeByGoalQuery-${id}`),
  badgesQuery: 'badgesQuery',
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

const BADGE_ROW = {
  id: 'badge-1',
  goalId: 'goal-1',
  credential: '{"@context":"..."}',
  imageUri: 'file:///badges/test-badge.png',
  createdAt: '2026-01-01T00:00:00Z',
};

function setupQueries({
  goal = GOAL,
  steps = COMPLETED_STEPS,
  goalEvidence = [] as object[],
  badge = null as object | null,
  allBadges = [] as object[],
}: {
  goal?: object | null;
  steps?: object[];
  goalEvidence?: object[];
  badge?: object | null;
  allBadges?: object[];
} = {}) {
  mockUseQuery.mockImplementation((query: unknown) => {
    if (query === 'goalsQuery') return goal ? [goal] : [];
    if (typeof query === 'string' && query.startsWith('stepsByGoalQuery')) return steps;
    if (typeof query === 'string' && query.startsWith('evidenceByGoalQuery')) return goalEvidence;
    if (typeof query === 'string' && query.startsWith('badgeByGoalQuery')) return badge ? [badge] : [];
    if (query === 'badgesQuery') return allBadges;
    return [];
  });
}

// --- Tests ---

describe('CompletionFlowScreen', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockUseQuery.mockReturnValue([]);
    mockUseCreateBadge.mockReturnValue({ status: 'done', error: null });
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

  describe('badge creation lifecycle', () => {
    it('shows loading indicator while badge is being created', () => {
      mockUseCreateBadge.mockReturnValue({ status: 'building', error: null });
      setupQueries();
      renderWithProviders(<CompletionFlowScreen {...routeProps} />);
      expect(screen.getByLabelText('Creating your badge...')).toBeOnTheScreen();
    });

    it('shows loading indicator during signing phase', () => {
      mockUseCreateBadge.mockReturnValue({ status: 'signing', error: null });
      setupQueries();
      renderWithProviders(<CompletionFlowScreen {...routeProps} />);
      expect(screen.getByLabelText('Creating your badge...')).toBeOnTheScreen();
    });

    it('does not show loading indicator when done', () => {
      mockUseCreateBadge.mockReturnValue({ status: 'done', error: null });
      setupQueries();
      renderWithProviders(<CompletionFlowScreen {...routeProps} />);
      expect(screen.queryByLabelText('Creating your badge...')).not.toBeOnTheScreen();
    });

    it('shows error message when badge creation fails', () => {
      mockUseCreateBadge.mockReturnValue({ status: 'error', error: 'crypto unavailable' });
      setupQueries();
      renderWithProviders(<CompletionFlowScreen {...routeProps} />);
      expect(screen.getByLabelText('Badge creation failed: crypto unavailable')).toBeOnTheScreen();
    });

    it('shows loading indicator during storing phase', () => {
      mockUseCreateBadge.mockReturnValue({ status: 'storing', error: null });
      setupQueries();
      renderWithProviders(<CompletionFlowScreen {...routeProps} />);
      expect(screen.getByLabelText('Creating your badge...')).toBeOnTheScreen();
    });

    it('shows key unavailable message when status is no-key', () => {
      mockUseCreateBadge.mockReturnValue({ status: 'no-key', error: null });
      setupQueries();
      renderWithProviders(<CompletionFlowScreen {...routeProps} />);
      expect(screen.getByLabelText('Badge could not be created: signing key unavailable')).toBeOnTheScreen();
    });

    it('still renders celebration content during badge creation', () => {
      mockUseCreateBadge.mockReturnValue({ status: 'building', error: null });
      setupQueries();
      renderWithProviders(<CompletionFlowScreen {...routeProps} />);
      expect(screen.getByText('You did it!')).toBeOnTheScreen();
    });

    it('still renders celebration content when status is no-key', () => {
      mockUseCreateBadge.mockReturnValue({ status: 'no-key', error: null });
      setupQueries();
      renderWithProviders(<CompletionFlowScreen {...routeProps} />);
      expect(screen.getByText('You did it!')).toBeOnTheScreen();
    });

    it('calls useCreateBadge with the correct goalId', () => {
      setupQueries();
      renderWithProviders(<CompletionFlowScreen {...routeProps} />);
      expect(mockUseCreateBadge).toHaveBeenCalledWith('goal-1');
    });
  });

  describe('BadgeEarnedModal integration', () => {
    it('shows BadgeEarnedModal when badgeStatus is done and badge exists', () => {
      mockUseCreateBadge.mockReturnValue({ status: 'done', error: null });
      setupQueries({ badge: BADGE_ROW, allBadges: [BADGE_ROW] });
      renderWithProviders(<CompletionFlowScreen {...routeProps} />);
      expect(screen.getByLabelText('Badge earned')).toBeOnTheScreen();
    });

    it('does not show BadgeEarnedModal when badgeStatus is building', () => {
      mockUseCreateBadge.mockReturnValue({ status: 'building', error: null });
      setupQueries({ badge: null, allBadges: [] });
      renderWithProviders(<CompletionFlowScreen {...routeProps} />);
      expect(screen.queryByLabelText('Badge earned')).not.toBeOnTheScreen();
    });

    it('does not show BadgeEarnedModal when no badge row yet', () => {
      mockUseCreateBadge.mockReturnValue({ status: 'done', error: null });
      setupQueries({ badge: null, allBadges: [] });
      renderWithProviders(<CompletionFlowScreen {...routeProps} />);
      expect(screen.queryByLabelText('Badge earned')).not.toBeOnTheScreen();
    });

    it('shows first-badge microcopy when only one badge exists', () => {
      mockUseCreateBadge.mockReturnValue({ status: 'done', error: null });
      setupQueries({ badge: BADGE_ROW, allBadges: [BADGE_ROW] });
      renderWithProviders(<CompletionFlowScreen {...routeProps} />);
      expect(screen.getByText('First one. (noted.)')).toBeOnTheScreen();
    });

    it('shows neutral microcopy when multiple badges exist', () => {
      const otherBadge = { ...BADGE_ROW, id: 'badge-2', goalId: 'goal-2' };
      mockUseCreateBadge.mockReturnValue({ status: 'done', error: null });
      setupQueries({ badge: BADGE_ROW, allBadges: [BADGE_ROW, otherBadge] });
      renderWithProviders(<CompletionFlowScreen {...routeProps} />);
      expect(screen.getByText('Badge earned.')).toBeOnTheScreen();
    });

    it('dismisses modal on "Keep going"', () => {
      mockUseCreateBadge.mockReturnValue({ status: 'done', error: null });
      setupQueries({ badge: BADGE_ROW, allBadges: [BADGE_ROW] });
      renderWithProviders(<CompletionFlowScreen {...routeProps} />);
      fireEvent.press(screen.getByLabelText('Keep going'));
      expect(screen.queryByText('First one. (noted.)')).not.toBeOnTheScreen();
    });

    it('navigates to BadgeDetail via parent tab navigator on "View Badge"', () => {
      mockUseCreateBadge.mockReturnValue({ status: 'done', error: null });
      setupQueries({ badge: BADGE_ROW, allBadges: [BADGE_ROW] });
      renderWithProviders(<CompletionFlowScreen {...routeProps} />);
      fireEvent.press(screen.getByLabelText('View Badge'));
      expect(mockParentNavigate).toHaveBeenCalledWith('BadgesTab', {
        screen: 'BadgeDetail',
        params: { badgeId: 'badge-1' },
      });
    });

    it('does not re-show BadgeEarnedModal after dismissal and re-render', () => {
      mockUseCreateBadge.mockReturnValue({ status: 'done', error: null });
      setupQueries({ badge: BADGE_ROW, allBadges: [BADGE_ROW] });
      const { rerender } = renderWithProviders(<CompletionFlowScreen {...routeProps} />);
      fireEvent.press(screen.getByLabelText('Keep going'));
      expect(screen.queryByLabelText('Badge earned')).not.toBeOnTheScreen();
      rerender(<CompletionFlowScreen {...routeProps} />);
      expect(screen.queryByLabelText('Badge earned')).not.toBeOnTheScreen();
    });
  });
});
