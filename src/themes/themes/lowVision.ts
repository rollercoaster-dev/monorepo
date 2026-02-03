import { palette } from '../palette';
import { space, sizeL, radius, zIndex, fontWeight, lineHeight } from '../tokens';

/**
 * Low Vision theme
 * High contrast with large text and clear focus indicators
 * Designed for use with Atkinson Hyperlegible font
 */
export const lowVisionTheme = {
  // Colors - high contrast for visibility
  colors: {
    background: palette.black,
    backgroundSecondary: palette.gray900,
    backgroundTertiary: palette.gray700,
    text: palette.white,
    textSecondary: palette.gray200,
    textMuted: palette.gray300,
    accentPrimary: palette.white,
    accentPurple: palette.purple300,
    accentMint: palette.mint200,
    accentYellow: palette.yellow300,
    border: palette.white,
    shadow: palette.black,
    focusRing: palette.blue600,
  },

  // Shadows - disabled for clarity
  shadows: {
    opacity: 0,
  },

  // Tokens - use large text size scale
  space,
  size: sizeL,
  radius,
  zIndex,
  fontWeight,
  lineHeight,
} as const;

export type LowVisionTheme = typeof lowVisionTheme;
