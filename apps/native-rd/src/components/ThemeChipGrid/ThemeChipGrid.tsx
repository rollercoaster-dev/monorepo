import React from "react";
import { Pressable, Text, View } from "react-native";
import { useThemeContext, themeOptions } from "../../hooks/useTheme";
import { themes, type ThemeName } from "../../themes/compose";
import { styles } from "./ThemeChipGrid.styles";

// Swatches derive from each theme's composed colors so chips automatically
// stay in sync with the actual palette in design-tokens.
interface ChipSwatch {
  bg: string;
  stripe1: string;
  stripe2: string;
  isDarkBase: boolean;
}

function getSwatch(themeName: ThemeName): ChipSwatch {
  const c = themes[themeName].colors;
  return {
    bg: c.background,
    stripe1: c.accentPurple,
    stripe2: c.text,
    isDarkBase: themeName.startsWith("dark-"),
  };
}

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
        const swatch = getSwatch(option.id);
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
