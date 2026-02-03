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
  const [colorMode, setColorModeState] = useState<ColorMode>('light');
  const [variant, setVariantState] = useState<Variant>('default');

  // Sync state with UnistylesRuntime on mount
  useEffect(() => {
    const currentTheme = UnistylesRuntime.themeName as ThemeName;
    if (currentTheme) {
      const parsed = parseThemeName(currentTheme);
      setColorModeState(parsed.colorMode);
      setVariantState(parsed.variant);
    }
  }, []);

  // Update Unistyles when colorMode or variant changes
  useEffect(() => {
    const themeName = getThemeName(colorMode, variant);
    if (UnistylesRuntime.themeName !== themeName) {
      UnistylesRuntime.setTheme(themeName);
    }
  }, [colorMode, variant]);

  const setColorMode = useCallback((mode: ColorMode) => {
    setColorModeState(mode);
  }, []);

  const setVariant = useCallback((v: Variant) => {
    setVariantState(v);
  }, []);

  const toggleColorMode = useCallback(() => {
    setColorModeState((prev) => (prev === 'light' ? 'dark' : 'light'));
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
