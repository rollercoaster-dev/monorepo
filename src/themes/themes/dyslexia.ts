import { palette } from '../palette';
import { space, size, radius, zIndex, fontWeight, lineHeight } from '../tokens';

/**
 * Dyslexia-Friendly theme
 * Cream background reduces visual stress
 * Designed for use with OpenDyslexic font
 */
export const dyslexiaTheme = {
  // Colors - cream background reduces visual stress
  colors: {
    background: palette.cream100,
    backgroundSecondary: palette.cream200,
    backgroundTertiary: palette.gray200,
    text: palette.gray700,
    textSecondary: palette.gray600,
    textMuted: palette.gray500,
    accentPrimary: palette.gray700,
    accentPurple: palette.purple400,
    accentMint: palette.mint200,
    accentYellow: palette.yellow300,
    border: palette.gray300,
    shadow: palette.black,
    focusRing: palette.gray700,
  },

  // Shadows
  shadows: {
    opacity: 0.04,
  },

  // Tokens
  space,
  size,
  radius,
  zIndex,
  fontWeight,
  lineHeight,
} as const;

export type DyslexiaTheme = typeof dyslexiaTheme;
