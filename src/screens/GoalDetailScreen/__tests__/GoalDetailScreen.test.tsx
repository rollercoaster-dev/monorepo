import React from 'react';
import { Alert } from 'react-native';
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

jest.mock('expo-video', () => {
  const { View } = require('react-native');
  return {
    useVideoPlayer: jest.fn(() => ({ play: jest.fn(), pause: jest.fn(), loop: false })),
    VideoView: (props: Record<string, unknown>) => <View testID="video-player" {...props} />,
  };
});

jest.mock('expo-audio', () => ({
  useAudioPlayer: jest.fn(() => ({
    play: jest.fn(),
    pause: jest.fn(),
    seekTo: jest.fn(),
  })),
  useAudioPlayerStatus: jest.fn(() => ({
    playing: false,
    currentTime: 0,
    duration: 0,
    didJustFinish: false,
  })),
}));

jest.mock('expo-sharing', () => ({
  isAvailableAsync: jest.fn().mockResolvedValue(true),
  shareAsync: jest.fn().mockResolvedValue(undefined),
}));

let mockFileExists = true;
jest.mock('expo-file-system', () => ({
  File: jest.fn().mockImplementation(() => ({
    get exists() {
      return mockFileExists;
    },
  })),
  Directory: jest.fn(),
  Paths: { document: '/mock/document' },
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
  evidenceByGoalQuery: jest.fn(() => 'evidenceByGoalQuery'),
  deleteEvidence: jest.fn(),
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

function setupQueries(goal: object | null = GOAL_ACTIVE, steps = STEPS_MIXED, evidence: object[] = []) {
  mockUseQuery.mockImplementation((query: unknown) => {
    if (query === 'goalsQuery') {
      return goal ? [goal] : [];
    }
    if (query === 'evidenceByGoalQuery') {
      return evidence;
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

  // --- Evidence display ---

  it('renders evidence items from query', () => {
    const evidence = [
      { id: 'ev-1', type: 'photo', uri: '/photo.jpg', description: 'Progress photo' },
      { id: 'ev-2', type: 'text', description: 'My notes' },
    ];
    setupQueries(GOAL_ACTIVE, STEPS_MIXED, evidence);
    renderWithProviders(<GoalDetailScreen {...routeProps} />);
    expect(screen.getByText('Evidence (2)')).toBeOnTheScreen();
  });

  it('shows empty state when no evidence exists', () => {
    setupQueries(GOAL_ACTIVE, STEPS_MIXED, []);
    renderWithProviders(<GoalDetailScreen {...routeProps} />);
    expect(screen.getByText('No evidence yet')).toBeOnTheScreen();
  });

  // --- Evidence viewer routing ---

  it('opens photo viewer when photo evidence is pressed', () => {
    const evidence = [
      { id: 'ev-1', type: 'photo', uri: '/photo.jpg', description: 'Progress photo' },
    ];
    setupQueries(GOAL_ACTIVE, STEPS_MIXED, evidence);
    renderWithProviders(<GoalDetailScreen {...routeProps} />);
    fireEvent.press(screen.getByLabelText('photo evidence: Progress photo'));
    expect(screen.getByLabelText('Close photo viewer')).toBeOnTheScreen();
  });

  it('opens text viewer when text evidence is pressed', () => {
    const evidence = [
      { id: 'ev-1', type: 'text', description: 'My detailed notes' },
    ];
    setupQueries(GOAL_ACTIVE, STEPS_MIXED, evidence);
    renderWithProviders(<GoalDetailScreen {...routeProps} />);
    fireEvent.press(screen.getByLabelText('text evidence: My detailed notes'));
    expect(screen.getByLabelText('Close text note viewer')).toBeOnTheScreen();
  });

  it('extracts text content from uri with content:text; prefix', () => {
    const evidence = [
      { id: 'ev-1', type: 'text', uri: 'content:text;This is the actual note', description: null },
    ];
    setupQueries(GOAL_ACTIVE, STEPS_MIXED, evidence);
    renderWithProviders(<GoalDetailScreen {...routeProps} />);
    // Without description, title falls back to type string "text"
    fireEvent.press(screen.getByLabelText('text evidence: text'));
    expect(screen.getByLabelText('Close text note viewer')).toBeOnTheScreen();
    expect(screen.getByText('This is the actual note')).toBeOnTheScreen();
  });

  it('shows caption as createdAt when text has both uri content and description', () => {
    const evidence = [
      { id: 'ev-1', type: 'text', uri: 'content:text;My important thought', description: 'Daily reflection' },
    ];
    setupQueries(GOAL_ACTIVE, STEPS_MIXED, evidence);
    renderWithProviders(<GoalDetailScreen {...routeProps} />);
    fireEvent.press(screen.getByLabelText('text evidence: Daily reflection'));
    expect(screen.getByText('My important thought')).toBeOnTheScreen();
    expect(screen.getByText('Daily reflection')).toBeOnTheScreen();
  });

  it('opens audio player modal when voice memo evidence is pressed', () => {
    const evidence = [
      { id: 'ev-1', type: 'voice_memo', uri: '/audio.m4a', description: 'Voice memo' },
    ];
    setupQueries(GOAL_ACTIVE, STEPS_MIXED, evidence);
    renderWithProviders(<GoalDetailScreen {...routeProps} />);
    fireEvent.press(screen.getByLabelText('voice_memo evidence: Voice memo'));
    expect(screen.getByLabelText('Close audio player')).toBeOnTheScreen();
  });

  it('closes audio player modal when close is pressed', () => {
    const evidence = [
      { id: 'ev-1', type: 'voice_memo', uri: '/audio.m4a', description: 'Voice memo' },
    ];
    setupQueries(GOAL_ACTIVE, STEPS_MIXED, evidence);
    renderWithProviders(<GoalDetailScreen {...routeProps} />);
    fireEvent.press(screen.getByLabelText('voice_memo evidence: Voice memo'));
    expect(screen.getByLabelText('Close audio player')).toBeOnTheScreen();

    fireEvent.press(screen.getByLabelText('Close audio player'));
    expect(screen.queryByLabelText('Close audio player')).not.toBeOnTheScreen();
  });

  it('opens share sheet when file evidence is pressed', async () => {
    const Sharing = require('expo-sharing');
    const evidence = [
      { id: 'ev-1', type: 'file', uri: '/doc.pdf', description: 'Document' },
    ];
    setupQueries(GOAL_ACTIVE, STEPS_MIXED, evidence);
    renderWithProviders(<GoalDetailScreen {...routeProps} />);
    fireEvent.press(screen.getByLabelText('file evidence: Document'));
    // Wait for the async openFile to complete
    await screen.findByText('Evidence (1)');
    expect(Sharing.isAvailableAsync).toHaveBeenCalled();
    expect(Sharing.shareAsync).toHaveBeenCalledWith('/doc.pdf', {});
  });

  it('passes UTI option when file evidence has mimeType metadata', async () => {
    const Sharing = require('expo-sharing');
    const evidence = [
      {
        id: 'ev-1',
        type: 'file',
        uri: '/doc.pdf',
        description: 'PDF Document',
        metadata: JSON.stringify({ mimeType: 'application/pdf', fileName: 'doc.pdf' }),
      },
    ];
    setupQueries(GOAL_ACTIVE, STEPS_MIXED, evidence);
    renderWithProviders(<GoalDetailScreen {...routeProps} />);
    fireEvent.press(screen.getByLabelText('file evidence: PDF Document'));
    await screen.findByText('Evidence (1)');
    expect(Sharing.shareAsync).toHaveBeenCalledWith('/doc.pdf', { UTI: 'com.adobe.pdf' });
  });

  it('shows alert when file does not exist', async () => {
    mockFileExists = false;
    const alertSpy = jest.spyOn(Alert, 'alert');
    try {
      const evidence = [
        { id: 'ev-1', type: 'file', uri: '/missing.pdf', description: 'Missing file' },
      ];
      setupQueries(GOAL_ACTIVE, STEPS_MIXED, evidence);
      renderWithProviders(<GoalDetailScreen {...routeProps} />);
      fireEvent.press(screen.getByLabelText('file evidence: Missing file'));
      await screen.findByText('Evidence (1)');
      expect(alertSpy).toHaveBeenCalledWith('File not found', 'The file may have been deleted.');
    } finally {
      mockFileExists = true;
      alertSpy.mockRestore();
    }
  });
});
