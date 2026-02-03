import React, { createContext, useContext, useState, useCallback } from "react";
import { View, StatusBar } from "react-native";
import { vars } from "nativewind";
import { themes, ThemeName, isDarkTheme, ThemeTokens } from "./themes";

interface ThemeContextValue {
  theme: ThemeName;
  setTheme: (theme: ThemeName) => void;
  tokens: ThemeTokens;
}

const ThemeContext = createContext<ThemeContextValue | undefined>(undefined);

interface ThemeProviderProps {
  children: React.ReactNode;
  defaultTheme?: ThemeName;
}

export function ThemeProvider({
  children,
  defaultTheme = "light",
}: ThemeProviderProps) {
  const [theme, setThemeState] = useState<ThemeName>(defaultTheme);

  const setTheme = useCallback((newTheme: ThemeName) => {
    setThemeState(newTheme);
  }, []);

  const tokens = themes[theme];
  const isDark = isDarkTheme(theme);

  return (
    <ThemeContext.Provider value={{ theme, setTheme, tokens }}>
      <StatusBar barStyle={isDark ? "light-content" : "dark-content"} />
      <View style={[{ flex: 1 }, vars(tokens)]}>
        {children}
      </View>
    </ThemeContext.Provider>
  );
}

export function useTheme(): ThemeContextValue {
  const context = useContext(ThemeContext);
  if (!context) {
    throw new Error("useTheme must be used within a ThemeProvider");
  }
  return context;
}
