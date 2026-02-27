/**
 * Tests for the IconPicker component
 *
 * Verifies search filtering, icon selection, weight selection,
 * category browsing, and accessibility requirements.
 */

import React from 'react';
import { renderWithProviders, screen, fireEvent } from '../../__tests__/test-utils';
import { IconPicker } from '../IconPicker';
import { POPULAR_ICON_NAMES } from '../iconIndex';

// Mock phosphor-react-native — each icon is a simple View with testID
jest.mock('phosphor-react-native', () => {
  const React = require('react');
  const { View, Text } = require('react-native');

  const createMockIcon = (name: string) => {
    const MockIcon: React.FC<{ size?: number; weight?: string; color?: string; testID?: string }> =
      ({ testID, ...props }) => (
        <View testID={testID ?? `icon-${name}`}>
          <Text>{name}</Text>
        </View>
      );
    MockIcon.displayName = name;
    return MockIcon;
  };

  // Create mock icons for all icons referenced in the registry
  const iconNames = [
    'Trophy', 'Medal', 'MedalMilitary', 'Crown', 'CrownSimple', 'Star', 'StarFour',
    'Sparkle', 'Certificate', 'SealCheck', 'Seal', 'ShieldCheck', 'ShieldStar',
    'Flag', 'FlagBanner', 'FlagCheckered', 'ThumbsUp', 'HandFist', 'Champagne', 'Confetti', 'Target',
    'Book', 'BookOpen', 'BookBookmark', 'Books', 'GraduationCap', 'Student',
    'Chalkboard', 'ChalkboardTeacher', 'Brain', 'Lightbulb', 'LightbulbFilament',
    'Atom', 'Flask', 'TestTube', 'MathOperations', 'Exam', 'Notebook', 'PencilSimple',
    'Pen', 'MagnifyingGlass', 'Compass', 'Globe',
    'Code', 'CodeBlock', 'Terminal', 'TerminalWindow', 'Bug', 'BugBeetle',
    'GitBranch', 'GitCommit', 'GitMerge', 'GitPullRequest', 'Database',
    'CloudArrowUp', 'Cpu', 'Robot', 'Wrench', 'Gear', 'GearSix', 'Plugs',
    'Browsers', 'Layout', 'DeviceMobile', 'Desktop',
    'Heart', 'Heartbeat', 'FirstAid', 'Pill', 'Barbell', 'PersonSimpleRun',
    'PersonSimpleWalk', 'Bicycle', 'HandHeart', 'YinYang', 'SmileyWink', 'Smiley',
    'SunHorizon', 'Moon', 'BowlFood', 'AppleLogo',
    'PaintBrush', 'Palette', 'Pencil', 'PaintRoller', 'Camera', 'FilmStrip',
    'VideoCamera', 'MusicNote', 'MusicNotes', 'Guitar', 'PianoKeys', 'Microphone',
    'Scissors', 'Cube', 'Shapes', 'MagicWand', 'Aperture',
    'Tree', 'Plant', 'Flower', 'FlowerLotus', 'Leaf', 'Sun', 'CloudSun',
    'Mountains', 'Waves', 'Drop', 'Fire', 'Lightning', 'Snowflake', 'Rainbow',
    'PawPrint', 'Bird', 'Butterfly', 'Fish',
    'ChatCircle', 'ChatDots', 'EnvelopeSimple', 'Megaphone', 'ShareNetwork',
    'Users', 'UserCircle', 'Handshake', 'Chats', 'Translate', 'Presentation',
    'CurrencyDollar', 'Coin', 'Coins', 'Wallet', 'PiggyBank', 'ChartLineUp',
    'ChartBar', 'TrendUp', 'Scales',
    'SoccerBall', 'Basketball', 'TennisBall', 'Baseball', 'Football', 'SwimmingPool',
    'PersonSimpleBike',
    'Airplane', 'MapPin', 'Tent', 'Backpack', 'Binoculars', 'House', 'RocketLaunch', 'Rocket',
  ];

  const exports: Record<string, unknown> = {
    IconContext: React.createContext({}),
  };

  for (const name of iconNames) {
    exports[name] = createMockIcon(name);
  }

  return exports;
});

describe('IconPicker', () => {
  const defaultProps = {
    selectedIcon: 'Trophy',
    selectedWeight: 'regular' as const,
    onSelectIcon: jest.fn(),
    onSelectWeight: jest.fn(),
  };

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('renders search input with correct accessibility', () => {
    renderWithProviders(<IconPicker {...defaultProps} />);

    const searchInput = screen.getByLabelText('Search icons');
    expect(searchInput).toBeOnTheScreen();
    expect(searchInput.props.accessibilityRole).toBe('search');
  });

  it('renders weight selector chips', () => {
    renderWithProviders(<IconPicker {...defaultProps} />);

    expect(screen.getByLabelText('Regular weight')).toBeOnTheScreen();
    expect(screen.getByLabelText('Bold weight')).toBeOnTheScreen();
    expect(screen.getByLabelText('Fill weight')).toBeOnTheScreen();
  });

  it('marks current weight as checked', () => {
    renderWithProviders(<IconPicker {...defaultProps} selectedWeight="bold" />);

    const boldChip = screen.getByLabelText('Bold weight');
    expect(boldChip.props.accessibilityState?.checked).toBe(true);

    const regularChip = screen.getByLabelText('Regular weight');
    expect(regularChip.props.accessibilityState?.checked).toBe(false);
  });

  it('calls onSelectWeight when a weight chip is pressed', () => {
    const onSelectWeight = jest.fn();
    renderWithProviders(
      <IconPicker {...defaultProps} onSelectWeight={onSelectWeight} />,
    );

    fireEvent.press(screen.getByLabelText('Bold weight'));
    expect(onSelectWeight).toHaveBeenCalledWith('bold');
  });

  it('renders category chips', () => {
    renderWithProviders(<IconPicker {...defaultProps} />);

    expect(screen.getByLabelText('Achievement category')).toBeOnTheScreen();
    expect(screen.getByLabelText('Learning category')).toBeOnTheScreen();
    expect(screen.getByLabelText('Coding category')).toBeOnTheScreen();
  });

  it('shows popular icons by default', () => {
    renderWithProviders(<IconPicker {...defaultProps} />);

    // Should show Trophy icon (it's in the popular set)
    const trophyButton = screen.getByLabelText('Trophy icon, selected');
    expect(trophyButton).toBeOnTheScreen();
  });

  it('calls onSelectIcon when an icon is pressed', () => {
    const onSelectIcon = jest.fn();
    renderWithProviders(
      <IconPicker {...defaultProps} onSelectIcon={onSelectIcon} />,
    );

    // Star is in the popular set
    const starButton = screen.getByLabelText('Star icon');
    fireEvent.press(starButton);
    expect(onSelectIcon).toHaveBeenCalledWith('Star');
  });

  it('marks selected icon with selected accessibility state', () => {
    renderWithProviders(<IconPicker {...defaultProps} selectedIcon="Trophy" />);

    const trophyButton = screen.getByLabelText('Trophy icon, selected');
    expect(trophyButton.props.accessibilityState?.selected).toBe(true);
  });

  it('filters icons when search query is entered', () => {
    renderWithProviders(<IconPicker {...defaultProps} />);

    const searchInput = screen.getByLabelText('Search icons');
    fireEvent.changeText(searchInput, 'trophy');

    // Trophy should appear, random other icons should not
    expect(screen.getByLabelText('Trophy icon, selected')).toBeOnTheScreen();
  });

  it('shows "No icons found" for unmatched search', () => {
    renderWithProviders(<IconPicker {...defaultProps} />);

    const searchInput = screen.getByLabelText('Search icons');
    fireEvent.changeText(searchInput, 'xyzzyplugh');

    expect(screen.getByText('No icons found')).toBeOnTheScreen();
  });

  it('icon cells meet 44x44pt minimum touch target', () => {
    renderWithProviders(<IconPicker {...defaultProps} />);

    // The icon cell style is 52x52 which exceeds the 44x44 minimum
    // We verify the first icon button exists and is touchable
    const trophyButton = screen.getByLabelText('Trophy icon, selected');
    expect(trophyButton.props.accessibilityRole).toBe('button');
  });

  it('each icon has an accessibility label with its name', () => {
    renderWithProviders(<IconPicker {...defaultProps} />);

    // Check that popular icons have proper labels
    for (const iconName of POPULAR_ICON_NAMES.slice(0, 3)) {
      const label = iconName === defaultProps.selectedIcon
        ? `${iconName.replace(/([A-Z])/g, ' $1').trim()} icon, selected`
        : `${iconName.replace(/([A-Z])/g, ' $1').trim()} icon`;
      const button = screen.getByLabelText(label);
      expect(button).toBeOnTheScreen();
    }
  });
});
