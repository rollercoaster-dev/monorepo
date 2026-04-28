import React, { useEffect } from "react";
import { Pressable, View } from "react-native";
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withTiming,
} from "react-native-reanimated";
import { StyleSheet, useUnistyles } from "react-native-unistyles";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import type { BottomTabBarProps } from "@react-navigation/bottom-tabs";
import { CommonActions } from "@react-navigation/native";
import { shadowStyle } from "../styles/shadows";
import { getRecommendedTextColor } from "../utils/accessibility";
import { useAnimationPref } from "../hooks/useAnimationPref";
import { BadgesIcon, GoalsIcon, PlusIcon, SettingsIcon } from "./icons";
import type { RootTabParamList } from "./types";

type RouteName = keyof RootTabParamList;

const TAB_LABELS: Record<RouteName, string> = {
  GoalsTab: "Goals",
  BadgesTab: "Badges",
  SettingsTab: "Settings",
};

const ICON_SIZE = 22;
const COLLAPSED_WIDTH = 44;
const EXPANDED_WIDTH = 110;
const MORPH_DURATION = 220;

function TabIcon({ name, color }: { name: RouteName; color: string }) {
  if (name === "GoalsTab") return <GoalsIcon color={color} size={ICON_SIZE} />;
  if (name === "BadgesTab")
    return <BadgesIcon color={color} size={ICON_SIZE} />;
  return <SettingsIcon color={color} size={ICON_SIZE} />;
}

interface AnimatedTabProps {
  name: RouteName;
  label: string;
  isActive: boolean;
  activeColor: string;
  inactiveColor: string;
  duration: number;
  onPress: () => void;
}

function AnimatedTab({
  name,
  label,
  isActive,
  activeColor,
  inactiveColor,
  duration,
  onPress,
}: AnimatedTabProps) {
  const progress = useSharedValue(isActive ? 1 : 0);

  useEffect(() => {
    progress.value = withTiming(isActive ? 1 : 0, { duration });
  }, [isActive, duration, progress]);

  const containerStyle = useAnimatedStyle(() => {
    const width =
      COLLAPSED_WIDTH + (EXPANDED_WIDTH - COLLAPSED_WIDTH) * progress.value;
    return { width };
  });

  const labelStyle = useAnimatedStyle(() => ({
    opacity: progress.value,
    // Hide text from layout when fully collapsed to avoid mid-animation overflow.
    width: progress.value === 0 ? 0 : undefined,
  }));

  const iconColor = isActive ? activeColor : inactiveColor;

  return (
    <Pressable
      accessibilityRole="tab"
      accessibilityLabel={label}
      accessibilityState={{ selected: isActive }}
      testID={`tab-${name}`}
      onPress={onPress}
    >
      <Animated.View
        style={[
          styles.tab,
          isActive ? styles.tabActive : styles.tabCollapsed,
          containerStyle,
        ]}
      >
        <TabIcon name={name} color={iconColor} />
        <Animated.Text
          numberOfLines={1}
          style={[styles.label, { color: activeColor }, labelStyle]}
        >
          {label}
        </Animated.Text>
      </Animated.View>
    </Pressable>
  );
}

export function FocusPillTabBar({ state, navigation }: BottomTabBarProps) {
  const { theme } = useUnistyles();
  const insets = useSafeAreaInsets();
  const { shouldAnimate } = useAnimationPref();
  const duration = shouldAnimate ? MORPH_DURATION : 0;

  const activeRoute = state.routes[state.index];
  const activeName = activeRoute.name as RouteName;
  const showFab = activeName !== "SettingsTab";

  const fabOpacity = useSharedValue(showFab ? 1 : 0);
  useEffect(() => {
    fabOpacity.value = withTiming(showFab ? 1 : 0, { duration });
  }, [showFab, duration, fabOpacity]);
  const fabStyle = useAnimatedStyle(() => ({
    opacity: fabOpacity.value,
    width: fabOpacity.value === 0 ? 0 : COLLAPSED_WIDTH,
    marginLeft: fabOpacity.value === 0 ? 0 : 4,
  }));

  const activeColor = getRecommendedTextColor(theme.colors.accentPurple);
  const inactiveColor = theme.colors.text;

  return (
    <View
      style={[styles.container, { paddingBottom: Math.max(insets.bottom, 12) }]}
    >
      <View style={styles.pill}>
        {state.routes.map((route, index) => {
          const name = route.name as RouteName;
          const isActive = state.index === index;
          const label = TAB_LABELS[name];

          const onPress = () => {
            const event = navigation.emit({
              type: "tabPress",
              target: route.key,
              canPreventDefault: true,
            });
            if (!isActive && !event.defaultPrevented) {
              navigation.dispatch({
                ...CommonActions.navigate(route.name, route.params),
                target: state.key,
              });
            }
          };

          return (
            <AnimatedTab
              key={route.key}
              name={name}
              label={label}
              isActive={isActive}
              activeColor={activeColor}
              inactiveColor={inactiveColor}
              duration={duration}
              onPress={onPress}
            />
          );
        })}

        <Animated.View
          style={fabStyle}
          pointerEvents={showFab ? "auto" : "none"}
        >
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
            <PlusIcon color={theme.colors.text} size={20} />
          </Pressable>
        </Animated.View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create((theme) => ({
  container: {
    paddingHorizontal: theme.space[4],
    paddingTop: theme.space[2],
    backgroundColor: "transparent",
    alignItems: "center" as const,
  },
  pill: {
    flexDirection: "row" as const,
    alignItems: "center" as const,
    gap: 4,
    backgroundColor: theme.colors.background,
    borderColor: theme.colors.border,
    borderWidth: theme.borderWidth.medium,
    borderRadius: 999,
    padding: 6,
    height: 56,
    ...shadowStyle(theme, "hardMd"),
  },
  tab: {
    height: 44,
    borderRadius: 999,
    alignItems: "center" as const,
    justifyContent: "center" as const,
    flexDirection: "row" as const,
    overflow: "hidden" as const,
  },
  tabCollapsed: {},
  tabActive: {
    backgroundColor: theme.colors.accentPurple,
    borderColor: theme.colors.border,
    borderWidth: theme.borderWidth.medium,
    paddingHorizontal: 12,
    gap: 8,
  },
  label: {
    fontFamily: theme.fontFamily.body,
    fontWeight: theme.fontWeight.bold,
    fontSize: theme.size.sm,
    letterSpacing: theme.letterSpacing.tight,
  },
  fab: {
    width: COLLAPSED_WIDTH,
    height: COLLAPSED_WIDTH,
    borderRadius: COLLAPSED_WIDTH / 2,
    backgroundColor: theme.colors.accentYellow,
    borderColor: theme.colors.border,
    borderWidth: theme.borderWidth.medium,
    alignItems: "center" as const,
    justifyContent: "center" as const,
    ...shadowStyle(theme, "hardSm"),
  },
}));
