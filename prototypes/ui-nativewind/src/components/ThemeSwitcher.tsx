import React from "react";
import { View, Text, Pressable, ScrollView } from "react-native";
import { useTheme } from "../ThemeProvider";
import {
  themeNames,
  ThemeName,
  themeDisplayNames,
  themeDescriptions,
} from "../themes";

export function ThemeSwitcher() {
  const { theme, setTheme } = useTheme();

  return (
    <View className="mb-6">
      <Text
        className="text-text-primary text-heading-sm font-bold mb-4"
        accessibilityRole="header"
      >
        Select Theme
      </Text>
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerClassName="gap-3"
      >
        {themeNames.map((themeName) => (
          <ThemeOption
            key={themeName}
            themeName={themeName}
            isSelected={theme === themeName}
            onSelect={() => setTheme(themeName)}
          />
        ))}
      </ScrollView>
    </View>
  );
}

interface ThemeOptionProps {
  themeName: ThemeName;
  isSelected: boolean;
  onSelect: () => void;
}

function ThemeOption({ themeName, isSelected, onSelect }: ThemeOptionProps) {
  const displayName = themeDisplayNames[themeName];
  const description = themeDescriptions[themeName];

  return (
    <Pressable
      onPress={onSelect}
      accessible
      accessibilityRole="button"
      accessibilityLabel={`${displayName} theme. ${description}`}
      accessibilityState={{ selected: isSelected }}
      accessibilityHint={
        isSelected ? "Currently selected" : "Double tap to select this theme"
      }
      className="active:opacity-80"
    >
      {({ pressed }) => (
        <View
          className={`
            min-w-[120px]
            p-3
            rounded-card
            border-2
            ${
              isSelected
                ? "border-accent-purple bg-bg-tertiary"
                : "border-border bg-bg-secondary"
            }
            ${pressed ? "opacity-80" : "opacity-100"}
          `}
        >
          <Text
            className={`
              text-body-md
              font-semibold
              mb-1
              ${isSelected ? "text-accent-purple" : "text-text-primary"}
            `}
          >
            {displayName}
          </Text>
          <Text
            className="text-text-muted text-body-sm"
            numberOfLines={2}
          >
            {description}
          </Text>
          {isSelected && (
            <View className="mt-2 flex-row items-center">
              <View className="w-3 h-3 rounded-full bg-accent-purple mr-1" />
              <Text className="text-accent-purple text-body-sm font-medium">
                Active
              </Text>
            </View>
          )}
        </View>
      )}
    </Pressable>
  );
}
