import React, { useEffect } from "react";
import {
  LayoutAnimation,
  type LayoutAnimationConfig,
  Platform,
  Pressable,
  Text,
  UIManager,
  View,
} from "react-native";
import { StyleSheet, useUnistyles } from "react-native-unistyles";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import type { BottomTabBarProps } from "@react-navigation/bottom-tabs";
import { CommonActions } from "@react-navigation/native";
import { GearSix, Medal, Plus, Target } from "phosphor-react-native";
import { shadowStyle } from "../styles/shadows";
import { getRecommendedTextColor } from "../utils/accessibility";
import { useAnimationPref } from "../hooks/useAnimationPref";
import type { RootTabParamList } from "./types";

type RouteName = keyof RootTabParamList;

const TAB_LABELS: Record<RouteName, string> = {
  GoalsTab: "Goals",
  BadgesTab: "Badges",
  SettingsTab: "Settings",
};

const ICON_SIZE = 24;
const ICON_WEIGHT = "bold" as const;
const MORPH_DURATION = 220;

if (
  Platform.OS === "android" &&
  UIManager.setLayoutAnimationEnabledExperimental
) {
  UIManager.setLayoutAnimationEnabledExperimental(true);
}

const morphConfig: LayoutAnimationConfig = {
  duration: MORPH_DURATION,
  create: {
    type: LayoutAnimation.Types.easeInEaseOut,
    property: LayoutAnimation.Properties.opacity,
  },
  update: { type: LayoutAnimation.Types.easeInEaseOut },
  delete: {
    type: LayoutAnimation.Types.easeInEaseOut,
    property: LayoutAnimation.Properties.opacity,
  },
};

function TabIcon({ name, color }: { name: RouteName; color: string }) {
  if (name === "GoalsTab")
    return <Target color={color} size={ICON_SIZE} weight={ICON_WEIGHT} />;
  if (name === "BadgesTab")
    return <Medal color={color} size={ICON_SIZE} weight={ICON_WEIGHT} />;
  return <GearSix color={color} size={ICON_SIZE} weight={ICON_WEIGHT} />;
}

interface TabButtonProps {
  name: RouteName;
  label: string;
  isActive: boolean;
  activeColor: string;
  inactiveColor: string;
  onPress: () => void;
}

function TabButton({
  name,
  label,
  isActive,
  activeColor,
  inactiveColor,
  onPress,
}: TabButtonProps) {
  return (
    <Pressable
      accessibilityRole="tab"
      accessibilityLabel={label}
      accessibilityState={{ selected: isActive }}
      testID={`tab-${name}`}
      onPress={onPress}
      style={[styles.tab, isActive ? styles.tabActive : styles.tabCollapsed]}
    >
      <TabIcon name={name} color={isActive ? activeColor : inactiveColor} />
      {isActive ? (
        <Text numberOfLines={1} style={[styles.label, { color: activeColor }]}>
          {label}
        </Text>
      ) : null}
    </Pressable>
  );
}

export function FocusPillTabBar({ state, navigation }: BottomTabBarProps) {
  const { theme } = useUnistyles();
  const insets = useSafeAreaInsets();
  const { shouldAnimate } = useAnimationPref();

  const activeRoute = state.routes[state.index];
  const activeName = activeRoute.name as RouteName;
  const showFab = activeName !== "SettingsTab";

  const activeColor = getRecommendedTextColor(theme.colors.accentPurple);
  const inactiveColor = theme.colors.text;

  useEffect(() => {
    if (shouldAnimate) LayoutAnimation.configureNext(morphConfig);
  }, [state.index, showFab, shouldAnimate]);

  const findRoute = (name: RouteName) => {
    const idx = state.routes.findIndex((r) => r.name === name);
    if (idx === -1) return null;
    return { route: state.routes[idx], index: idx };
  };

  const navigateTo = (entry: ReturnType<typeof findRoute>) => {
    if (!entry) return;
    const isActive = state.index === entry.index;
    const event = navigation.emit({
      type: "tabPress",
      target: entry.route.key,
      canPreventDefault: true,
    });
    if (!isActive && !event.defaultPrevented) {
      if (shouldAnimate) LayoutAnimation.configureNext(morphConfig);
      navigation.dispatch({
        ...CommonActions.navigate(entry.route.name, entry.route.params),
        target: state.key,
      });
    }
  };

  const renderTab = (entry: ReturnType<typeof findRoute>, name: RouteName) => {
    if (!entry) return null;
    return (
      <TabButton
        name={name}
        label={TAB_LABELS[name]}
        isActive={state.index === entry.index}
        activeColor={activeColor}
        inactiveColor={inactiveColor}
        onPress={() => navigateTo(entry)}
      />
    );
  };

  const goals = findRoute("GoalsTab");
  const badges = findRoute("BadgesTab");
  const settings = findRoute("SettingsTab");

  return (
    <View
      style={[
        styles.container,
        {
          paddingBottom: Math.max(insets.bottom, 4),
          paddingLeft: Math.max(insets.left, 0) + 16,
          paddingRight: Math.max(insets.right, 0) + 16,
        },
      ]}
    >
      <View style={styles.pill}>
        <View style={styles.leftGroup}>
          {renderTab(goals, "GoalsTab")}
          {renderTab(badges, "BadgesTab")}
        </View>

        <View style={styles.center}>
          {showFab ? (
            <Pressable
              accessibilityRole="button"
              accessibilityLabel="New goal"
              testID="tab-fab-new-goal"
              onPress={() =>
                navigation.dispatch(
                  CommonActions.navigate("GoalsTab", { screen: "NewGoal" }),
                )
              }
              style={styles.fab}
            >
              <Plus color={theme.colors.text} size={22} weight={ICON_WEIGHT} />
            </Pressable>
          ) : null}
        </View>

        <View style={styles.rightGroup}>
          {renderTab(settings, "SettingsTab")}
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create((theme) => ({
  container: {
    paddingTop: theme.space[2],
    backgroundColor: "transparent",
  },
  pill: {
    flexDirection: "row" as const,
    alignItems: "center" as const,
    height: 64,
    paddingHorizontal: 8,
    borderRadius: 999,
    borderColor: theme.colors.border,
    borderWidth: theme.borderWidth.medium,
    backgroundColor: theme.colors.background,
    ...shadowStyle(theme, "hardMd"),
  },
  leftGroup: {
    flex: 1,
    flexDirection: "row" as const,
    alignItems: "center" as const,
    gap: 6,
  },
  center: {
    width: 56,
    alignItems: "center" as const,
    justifyContent: "center" as const,
  },
  rightGroup: {
    flex: 1,
    flexDirection: "row" as const,
    alignItems: "center" as const,
    justifyContent: "flex-end" as const,
  },
  tab: {
    height: 48,
    borderRadius: 999,
    alignItems: "center" as const,
    justifyContent: "center" as const,
    flexDirection: "row" as const,
  },
  tabCollapsed: {
    width: 48,
  },
  tabActive: {
    backgroundColor: theme.colors.accentPurple,
    borderColor: theme.colors.border,
    borderWidth: theme.borderWidth.medium,
    paddingHorizontal: 16,
    gap: 8,
  },
  label: {
    fontFamily: theme.fontFamily.body,
    fontWeight: theme.fontWeight.bold,
    fontSize: theme.size.sm,
    letterSpacing: theme.letterSpacing.tight,
  },
  fab: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: theme.colors.accentYellow,
    borderColor: theme.colors.border,
    borderWidth: theme.borderWidth.medium,
    alignItems: "center" as const,
    justifyContent: "center" as const,
  },
}));
