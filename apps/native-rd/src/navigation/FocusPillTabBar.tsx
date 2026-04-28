import React from "react";
import { Pressable, Text, View } from "react-native";
import { StyleSheet, useUnistyles } from "react-native-unistyles";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import type { BottomTabBarProps } from "@react-navigation/bottom-tabs";
import { CommonActions } from "@react-navigation/native";
import { GearSix, Medal, Plus, Target } from "phosphor-react-native";
import { shadowStyle } from "../styles/shadows";
import { getRecommendedTextColor } from "../utils/accessibility";
import type { RootTabParamList } from "./types";

type RouteName = keyof RootTabParamList;

const TAB_LABELS: Record<RouteName, string> = {
  GoalsTab: "Goals",
  BadgesTab: "Badges",
  SettingsTab: "Settings",
};

const ICON_SIZE = 24;
const ICON_WEIGHT = "bold" as const;

function TabIcon({ name, color }: { name: RouteName; color: string }) {
  if (name === "GoalsTab")
    return <Target color={color} size={ICON_SIZE} weight={ICON_WEIGHT} />;
  if (name === "BadgesTab")
    return <Medal color={color} size={ICON_SIZE} weight={ICON_WEIGHT} />;
  return <GearSix color={color} size={ICON_SIZE} weight={ICON_WEIGHT} />;
}

export function FocusPillTabBar({ state, navigation }: BottomTabBarProps) {
  const { theme } = useUnistyles();
  const insets = useSafeAreaInsets();

  const activeRoute = state.routes[state.index];
  const activeName = activeRoute.name as RouteName;
  const showFab = activeName !== "SettingsTab";

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
            <Pressable
              key={route.key}
              accessibilityRole="tab"
              accessibilityLabel={label}
              accessibilityState={{ selected: isActive }}
              testID={`tab-${route.name}`}
              onPress={onPress}
              style={[
                styles.tab,
                isActive ? styles.tabActive : styles.tabCollapsed,
              ]}
            >
              <TabIcon
                name={name}
                color={isActive ? activeColor : inactiveColor}
              />
              {isActive ? (
                <Text
                  numberOfLines={1}
                  style={[styles.label, { color: activeColor }]}
                >
                  {label}
                </Text>
              ) : null}
            </Pressable>
          );
        })}

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
    gap: 6,
    backgroundColor: theme.colors.background,
    borderColor: theme.colors.border,
    borderWidth: theme.borderWidth.medium,
    borderRadius: 999,
    padding: 6,
    height: 60,
    ...shadowStyle(theme, "hardMd"),
  },
  tab: {
    height: 46,
    borderRadius: 999,
    alignItems: "center" as const,
    justifyContent: "center" as const,
    flexDirection: "row" as const,
  },
  tabCollapsed: {
    width: 46,
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
    width: 46,
    height: 46,
    borderRadius: 23,
    backgroundColor: theme.colors.accentYellow,
    borderColor: theme.colors.border,
    borderWidth: theme.borderWidth.medium,
    alignItems: "center" as const,
    justifyContent: "center" as const,
    ...shadowStyle(theme, "hardSm"),
  },
}));
