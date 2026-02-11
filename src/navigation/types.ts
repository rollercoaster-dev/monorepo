import type { NavigatorScreenParams } from '@react-navigation/native';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import type { BottomTabScreenProps } from '@react-navigation/bottom-tabs';

// ---------------------------------------------------------------------------
// Stack param lists
// ---------------------------------------------------------------------------

/** Shared params for all evidence capture screens */
export type CaptureParams = { goalId: string; stepId?: string };

/** Evidence capture routes — single source of truth */
type CaptureRoutes = {
  CapturePhoto: CaptureParams;
  CaptureVideo: CaptureParams;
  CaptureVoiceMemo: CaptureParams;
  CaptureTextNote: CaptureParams;
  CaptureLink: CaptureParams;
  CaptureFile: CaptureParams;
};

/** Screen names that accept CaptureParams (derived from CaptureRoutes) */
export type CaptureScreenName = keyof CaptureRoutes;

export type GoalsStackParamList = {
  Goals: undefined;
  GoalDetail: { goalId: string };
  NewGoal: undefined;
} & CaptureRoutes;

export type BadgesStackParamList = {
  Badges: undefined;
  BadgeDetail: { badgeId: string };
};

export type SettingsStackParamList = {
  Settings: undefined;
};

// ---------------------------------------------------------------------------
// Root tab param list
// ---------------------------------------------------------------------------

export type RootTabParamList = {
  GoalsTab: NavigatorScreenParams<GoalsStackParamList>;
  BadgesTab: NavigatorScreenParams<BadgesStackParamList>;
  SettingsTab: NavigatorScreenParams<SettingsStackParamList>;
};

// ---------------------------------------------------------------------------
// Screen prop types (for use in screen components)
// ---------------------------------------------------------------------------

export type GoalsScreenProps = NativeStackScreenProps<GoalsStackParamList, 'Goals'>;
export type GoalDetailScreenProps = NativeStackScreenProps<GoalsStackParamList, 'GoalDetail'>;
export type NewGoalScreenProps = NativeStackScreenProps<GoalsStackParamList, 'NewGoal'>;

export type BadgesScreenProps = NativeStackScreenProps<BadgesStackParamList, 'Badges'>;
export type BadgeDetailScreenProps = NativeStackScreenProps<BadgesStackParamList, 'BadgeDetail'>;

export type SettingsScreenProps = NativeStackScreenProps<SettingsStackParamList, 'Settings'>;

export type CapturePhotoScreenProps = NativeStackScreenProps<GoalsStackParamList, 'CapturePhoto'>;
export type CaptureVoiceMemoScreenProps = NativeStackScreenProps<GoalsStackParamList, 'CaptureVoiceMemo'>;
export type CaptureTextNoteScreenProps = NativeStackScreenProps<GoalsStackParamList, 'CaptureTextNote'>;
export type CaptureLinkScreenProps = NativeStackScreenProps<GoalsStackParamList, 'CaptureLink'>;
export type CaptureVideoScreenProps = NativeStackScreenProps<GoalsStackParamList, 'CaptureVideo'>;
export type CaptureFileScreenProps = NativeStackScreenProps<GoalsStackParamList, 'CaptureFile'>;

export type RootTabProps = BottomTabScreenProps<RootTabParamList>;
