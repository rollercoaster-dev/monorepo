import { useState, useEffect, useCallback } from 'react';
import { UnistylesRuntime } from 'react-native-unistyles';
import type { ColorMode } from '../themes/colorModes';
import type { Variant } from '../themes/variants';
import { getThemeName, parseThemeName, type ThemeName } from '../themes/compose';

/**
 * Two-dimension theme management hook
 *
 * Separates color mode (light/dark) from accessibility variant.
 * This allows users to toggle light/dark mode while maintaining
 * their preferred accessibility settings.
 */
export function useTheme() {
  const [colorMode, setColorMode] = useState<ColorMode>('light');
  const [variant, setVariant] = useState<Variant>('default');

  // Sync state with UnistylesRuntime on mount
  useEffect(() => {
    const currentTheme = UnistylesRuntime.themeName as ThemeName;
    if (currentTheme) {
      const parsed = parseThemeName(currentTheme);
      setColorMode(parsed.colorMode);
      setVariant(parsed.variant);
    }
  }, []);

  // Update Unistyles when colorMode or variant changes
  useEffect(() => {
    const themeName = getThemeName(colorMode, variant);
    if (UnistylesRuntime.themeName !== themeName) {
      UnistylesRuntime.setTheme(themeName);
    }
  }, [colorMode, variant]);

  const toggleColorMode = useCallback(() => {
    setColorMode((prev) => (prev === 'light' ? 'dark' : 'light'));
  }, []);

  return {
    colorMode,
    variant,
    setColorMode,
    setVariant,
    toggleColorMode,
    themeName: getThemeName(colorMode, variant),
  };
}
