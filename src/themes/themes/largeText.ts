import { palette } from '../palette';
import { space, sizeL, radius, zIndex, fontWeight, lineHeight } from '../tokens';

/**
 * Large Text theme for improved readability
 * Same colors as light theme, but with 1.25x text sizes
 */
export const largeTextTheme = {
  // Colors - same as light theme
  colors: {
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
  },

  // Shadows
  shadows: {
    opacity: 0.04,
  },

  // Tokens - use large text size scale
  space,
  size: sizeL,
  radius,
  zIndex,
  fontWeight,
  lineHeight,
} as const;

export type LargeTextTheme = typeof largeTextTheme;
