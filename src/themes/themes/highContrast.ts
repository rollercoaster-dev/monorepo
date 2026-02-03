import { palette } from '../palette';
import { space, size, radius, zIndex, fontWeight, lineHeight } from '../tokens';

/**
 * High Contrast theme for WCAG AAA compliance
 * Black background, white text, maximum contrast
 */
export const highContrastTheme = {
  // Colors - maximum contrast
  colors: {
    background: palette.black,
    backgroundSecondary: palette.gray900,
    backgroundTertiary: palette.gray700,
    text: palette.white,
    textSecondary: palette.white,
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

  // Tokens
  space,
  size,
  radius,
  zIndex,
  fontWeight,
  lineHeight,
} as const;

export type HighContrastTheme = typeof highContrastTheme;
