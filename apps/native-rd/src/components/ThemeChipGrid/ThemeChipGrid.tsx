import React from "react";
import { Pressable, Text, View } from "react-native";
import { useThemeContext, themeOptions } from "../../hooks/useTheme";
import type { ThemeName } from "../../themes/compose";
import { styles } from "./ThemeChipGrid.styles";

// Fixed-per-target swatches. These advertise the destination theme — they do
// NOT reflect the active theme. Values mirror the verified welcome-a-live-mirror
// prototype (see apps/native-rd/prototypes/welcome-a-live-mirror.html) and
// resolve from packages/design-tokens/build/unistyles/{colorModes,variants}.ts.
interface ChipSwatch {
  bg: string;
  stripe1: string;
  stripe2: string;
  // Whether the chip-name caption sits on a dark surface (controls label color)
  isDarkBase: boolean;
}

const chipSwatches: Record<ThemeName, ChipSwatch> = {
  "light-default": {
    bg: "#ffffff",
    stripe1: "#ffe50c",
    stripe2: "#a78bfa",
    isDarkBase: false,
  },
  "dark-default": {
    bg: "#1a1033",
    stripe1: "#5eead4",
    stripe2: "#c4b5fd",
    isDarkBase: true,
  },
  "light-highContrast": {
    bg: "#ffffff",
    stripe1: "#000000",
    stripe2: "#ffe50c",
    isDarkBase: false,
  },
  "light-dyslexia": {
    bg: "#f8f5e4",
    stripe1: "#f4c430",
    stripe2: "#d97706",
    isDarkBase: false,
  },
  "light-autismFriendly": {
    bg: "#f5f3ee",
    stripe1: "#c8e6d4",
    stripe2: "#b4a7d6",
    isDarkBase: false,
  },
  "light-lowVision": {
    bg: "#ffffff",
    stripe1: "#000000",
    stripe2: "#ffe50c",
    isDarkBase: false,
  },
  "light-lowInfo": {
    bg: "#ffffff",
    stripe1: "#f5f5f5",
    stripe2: "#d4d4d4",
    isDarkBase: false,
  },
  // Variants below are not in `themeOptions`, but ThemeName covers all 14
  // combinations so we provide stub swatches to keep the type total.
  "dark-highContrast": {
    bg: "#000000",
    stripe1: "#ffffff",
    stripe2: "#ffe50c",
    isDarkBase: true,
  },
  "dark-dyslexia": {
    bg: "#1a1033",
    stripe1: "#f4c430",
    stripe2: "#d97706",
    isDarkBase: true,
  },
  "dark-autismFriendly": {
    bg: "#1a1033",
    stripe1: "#c8e6d4",
    stripe2: "#b4a7d6",
    isDarkBase: true,
  },
  "dark-lowVision": {
    bg: "#000000",
    stripe1: "#ffffff",
    stripe2: "#ffe50c",
    isDarkBase: true,
  },
  "dark-lowInfo": {
    bg: "#1a1033",
    stripe1: "#cccccc",
    stripe2: "#d4d4d4",
    isDarkBase: true,
  },
  "light-largeText": {
    bg: "#ffffff",
    stripe1: "#ffe50c",
    stripe2: "#a78bfa",
    isDarkBase: false,
  },
  "dark-largeText": {
    bg: "#1a1033",
    stripe1: "#5eead4",
    stripe2: "#c4b5fd",
    isDarkBase: true,
  },
};

// Stripe widths as flex-basis percentages, matching the prototype's
// per-variant proportions (stripe1, stripe2, stripe3-fills-rest).
const stripeWidths: Record<ThemeName, [number, number]> = {
  "light-default": [30, 25],
  "dark-default": [30, 25],
  "light-highContrast": [50, 25],
  "light-dyslexia": [30, 25],
  "light-autismFriendly": [35, 30],
  "light-lowVision": [60, 20],
  "light-lowInfo": [40, 25],
  "dark-highContrast": [50, 25],
  "dark-dyslexia": [30, 25],
  "dark-autismFriendly": [35, 30],
  "dark-lowVision": [60, 20],
  "dark-lowInfo": [40, 25],
  "light-largeText": [30, 25],
  "dark-largeText": [30, 25],
};

export function ThemeChipGrid() {
  const { themeName, setTheme } = useThemeContext();

  return (
    <View
      accessible
      accessibilityRole="radiogroup"
      accessibilityLabel="Theme"
      style={styles.grid}
    >
      {themeOptions.map((option) => {
        const isSelected = themeName === option.id;
        const swatch = chipSwatches[option.id];
        const [w1, w2] = stripeWidths[option.id];

        return (
          <Pressable
            key={option.id}
            onPress={() => setTheme(option.id)}
            accessible
            accessibilityRole="radio"
            accessibilityState={{ checked: isSelected }}
            accessibilityLabel={`${option.label}. ${option.description}`}
            testID={isSelected ? "selected-chip" : undefined}
            style={[
              styles.chip,
              isSelected ? styles.chipSelected : styles.chipUnselected,
            ]}
          >
            <View style={[styles.stripeRow, { backgroundColor: swatch.bg }]}>
              <View
                style={{
                  width: `${w1}%`,
                  backgroundColor: swatch.stripe1,
                }}
              />
              <View
                style={{
                  width: `${w2}%`,
                  backgroundColor: swatch.stripe2,
                }}
              />
            </View>
            <View
              style={[styles.nameBar, swatch.isDarkBase && styles.nameBarDark]}
            >
              <Text
                style={[
                  styles.nameText,
                  swatch.isDarkBase && styles.nameTextDark,
                ]}
                numberOfLines={1}
              >
                {option.label}
              </Text>
            </View>
          </Pressable>
        );
      })}
    </View>
  );
}
