/**
 * Color mode definitions for light and dark themes
 * These are the base color values that variants can override
 */

import { palette } from './palette';

export type ColorMode = 'light' | 'dark';

/**
 * Colors interface - uses string type for flexibility in variant overrides
 */
export interface Colors {
  background: string;
  backgroundSecondary: string;
  backgroundTertiary: string;
  text: string;
  textSecondary: string;
  textMuted: string;
  accentPrimary: string;
  accentPurple: string;
  accentMint: string;
  accentYellow: string;
  border: string;
  shadow: string;
  focusRing: string;
}

/**
 * Light mode base colors
 */
export const lightColors: Colors = {
  background: palette.white,
  backgroundSecondary: palette.gray100,
  backgroundTertiary: palette.gray200,
  text: palette.gray900,
  textSecondary: palette.gray600,
  textMuted: palette.gray500,
  accentPrimary: palette.gray900,
  accentPurple: palette.purple400,
  accentMint: palette.mint200,
  accentYellow: palette.yellow300,
  border: palette.gray200,
  shadow: palette.black,
  focusRing: palette.gray900,
};

/**
 * Dark mode base colors
 */
export const darkColors: Colors = {
  background: palette.gray900,
  backgroundSecondary: palette.gray800,
  backgroundTertiary: palette.gray700,
  text: palette.gray50,
  textSecondary: palette.gray400,
  textMuted: palette.gray600,
  accentPrimary: palette.gray50,
  accentPurple: palette.purple400,
  accentMint: palette.mint600,
  accentYellow: palette.yellow300,
  border: palette.gray700,
  shadow: palette.black,
  focusRing: palette.gray50,
};

export interface ColorModeConfig {
  colors: Colors;
  shadows: { opacity: number };
}

export const colorModes: Record<ColorMode, ColorModeConfig> = {
  light: {
    colors: lightColors,
    shadows: { opacity: 0.04 },
  },
  dark: {
    colors: darkColors,
    shadows: { opacity: 0.2 },
  },
};
