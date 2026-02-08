import type { NavigatorScreenParams } from '@react-navigation/native';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import type { BottomTabScreenProps } from '@react-navigation/bottom-tabs';

// ---------------------------------------------------------------------------
// Stack param lists
// ---------------------------------------------------------------------------

export type GoalsStackParamList = {
  Goals: undefined;
  GoalDetail: { goalId: string };
  NewGoal: undefined;
};

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

export type RootTabProps = BottomTabScreenProps<RootTabParamList>;
