/**
 * Theme variant overrides
 * Each variant defines what it changes from the base colorMode
 */

import { palette } from './palette';
import { size, sizeL, lineHeight, lineHeightL } from './tokens';
import type { Colors } from './colorModes';

export type Variant =
  | 'default'
  | 'highContrast'
  | 'largeText'
  | 'dyslexia'
  | 'lowVision'
  | 'autismFriendly';

export const variants: Variant[] = [
  'default',
  'highContrast',
  'largeText',
  'dyslexia',
  'lowVision',
  'autismFriendly',
];

type VariantColorOverrides = Partial<Colors>;

interface VariantOverride {
  colors?: {
    light?: VariantColorOverrides;
    dark?: VariantColorOverrides;
  };
  shadows?: { opacity: number };
  size?: typeof size | typeof sizeL;
  lineHeight?: typeof lineHeight | typeof lineHeightL;
  fontFamily?: string;
}

/**
 * Variant override definitions
 * Each variant can override colors (per colorMode), shadows, size scale, and fontFamily
 */
export const variantOverrides: Record<Variant, VariantOverride> = {
  /**
   * Default - no overrides, uses base colorMode as-is
   */
  default: {},

  /**
   * High Contrast - maximum contrast for WCAG AAA compliance
   * Light: black text on white
   * Dark: white text on black
   */
  highContrast: {
    colors: {
      light: {
        background: palette.white,
        backgroundSecondary: palette.gray100,
        backgroundTertiary: palette.gray200,
        text: palette.black,
        textSecondary: palette.black,
        textMuted: palette.gray700,
        accentPrimary: palette.black,
        accentPurple: palette.purple400,
        border: palette.black,
        focusRing: palette.blue600,
      },
      dark: {
        background: palette.black,
        backgroundSecondary: palette.gray900,
        backgroundTertiary: palette.gray700,
        text: palette.white,
        textSecondary: palette.white,
        textMuted: palette.gray300,
        accentPrimary: palette.white,
        accentPurple: palette.purple300,
        border: palette.white,
        focusRing: palette.blue600,
      },
    },
    shadows: { opacity: 0 },
  },

  /**
   * Large Text - 1.25x text size scale for improved readability
   */
  largeText: {
    size: sizeL,
  },

  /**
   * Dyslexia-Friendly - cream background reduces visual stress
   * Uses OpenDyslexic font (set separately)
   */
  dyslexia: {
    colors: {
      light: {
        background: palette.cream100,
        backgroundSecondary: palette.cream200,
        backgroundTertiary: palette.gray200,
        text: palette.gray700,
        textSecondary: palette.gray600,
        textMuted: palette.gray500,
        accentPrimary: palette.gray700,
        border: palette.gray300,
        focusRing: palette.gray700,
      },
      dark: {
        // Warm dark background for dark mode dyslexia
        background: palette.gray800,
        backgroundSecondary: palette.gray700,
        backgroundTertiary: palette.gray600,
        text: palette.cream100,
        textSecondary: palette.cream200,
        textMuted: palette.gray400,
        accentPrimary: palette.cream100,
        border: palette.gray600,
        focusRing: palette.cream100,
      },
    },
    lineHeight: lineHeightL,
    fontFamily: 'OpenDyslexic',
  },

  /**
   * Low Vision - high contrast + large text + clear focus indicators
   * Uses Atkinson Hyperlegible font (set separately)
   */
  lowVision: {
    colors: {
      light: {
        background: palette.white,
        backgroundSecondary: palette.gray100,
        backgroundTertiary: palette.gray200,
        text: palette.black,
        textSecondary: palette.black,
        textMuted: palette.gray700,
        accentPrimary: palette.black,
        border: palette.black,
        focusRing: palette.blue600,
      },
      dark: {
        background: palette.black,
        backgroundSecondary: palette.gray900,
        backgroundTertiary: palette.gray700,
        text: palette.white,
        textSecondary: palette.gray200,
        textMuted: palette.gray300,
        accentPrimary: palette.white,
        accentPurple: palette.purple300,
        border: palette.white,
        focusRing: palette.blue600,
      },
    },
    shadows: { opacity: 0 },
    size: sizeL,
    fontFamily: 'AtkinsonHyperlegible',
  },

  /**
   * Autism-Friendly - muted/desaturated colors to reduce sensory overload
   */
  autismFriendly: {
    colors: {
      light: {
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
        focusRing: palette.gray700,
      },
      dark: {
        background: palette.gray800,
        backgroundSecondary: palette.gray700,
        backgroundTertiary: palette.gray600,
        text: palette.gray200,
        textSecondary: palette.gray300,
        textMuted: palette.gray400,
        accentPrimary: palette.gray200,
        accentPurple: palette.purpleDesaturated,
        accentMint: palette.mintDesaturated,
        accentYellow: palette.yellow200,
        border: palette.gray600,
        focusRing: palette.gray200,
      },
    },
    shadows: { opacity: 0 },
  },
};

export const variantOptions: Array<{
  id: Variant;
  label: string;
  description: string;
}> = [
  { id: 'default', label: 'Default', description: 'Standard theme' },
  {
    id: 'highContrast',
    label: 'High Contrast',
    description: 'WCAG AAA compliant',
  },
  { id: 'largeText', label: 'Large Text', description: '1.25x text size' },
  {
    id: 'dyslexia',
    label: 'Dyslexia-Friendly',
    description: 'Cream background',
  },
  { id: 'lowVision', label: 'Low Vision', description: 'High contrast + large' },
  {
    id: 'autismFriendly',
    label: 'Autism-Friendly',
    description: 'Muted colors',
  },
];
