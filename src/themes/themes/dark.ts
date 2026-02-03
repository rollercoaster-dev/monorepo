import { palette } from '../palette';
import { space, size, radius, zIndex, fontWeight, lineHeight } from '../tokens';

export const darkTheme = {
  // Colors
  colors: {
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
  },

  // Shadows
  shadows: {
    opacity: 0.2,
  },

  // Tokens
  space,
  size,
  radius,
  zIndex,
  fontWeight,
  lineHeight,
} as const;

export type DarkTheme = typeof darkTheme;
