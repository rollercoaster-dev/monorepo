import { palette } from '../palette';
import { space, size, radius, zIndex, fontWeight, lineHeight } from '../tokens';

export const lightTheme = {
  // Colors
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

  // Tokens
  space,
  size,
  radius,
  zIndex,
  fontWeight,
  lineHeight,
} as const;

export type LightTheme = typeof lightTheme;
