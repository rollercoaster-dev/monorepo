import { palette } from '../palette';
import { space, size, radius, zIndex, fontWeight, lineHeight } from '../tokens';

/**
 * Autism-Friendly theme
 * Muted/desaturated colors to reduce sensory overload
 * Animations should be disabled when this theme is active
 */
export const autismFriendlyTheme = {
  // Colors - muted, low saturation
  colors: {
    background: palette.gray100,
    backgroundSecondary: palette.gray200,
    backgroundTertiary: palette.gray300,
    text: palette.gray700,
    textSecondary: palette.gray600,
    textMuted: palette.gray500,
    accentPrimary: palette.gray700,
    accentPurple: palette.purpleDesaturated,
    accentMint: palette.mintDesaturated,
    accentYellow: palette.yellow200,
    border: palette.gray300,
    shadow: palette.black,
    focusRing: palette.gray700,
  },

  // Shadows - disabled to reduce visual noise
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

export type AutismFriendlyTheme = typeof autismFriendlyTheme;
