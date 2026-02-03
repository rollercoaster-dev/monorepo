/**
 * Theme composition - combines colorModes with variants
 * Generates all 12 theme combinations
 */

import { colorModes, type ColorMode, type Colors } from './colorModes';
import { variantOverrides, type Variant } from './variants';
import { space, size, sizeL, radius, zIndex, fontWeight, lineHeight } from './tokens';

/** Size scale type - either normal or large */
export type SizeScale = typeof size | typeof sizeL;

export interface ComposedTheme {
  colors: Colors;
  shadows: { opacity: number };
  space: typeof space;
  size: SizeScale;
  radius: typeof radius;
  zIndex: typeof zIndex;
  fontWeight: typeof fontWeight;
  lineHeight: typeof lineHeight;
  fontFamily?: string;
}

/**
 * Deep merge utility for composing themes
 */
function deepMerge<T extends object>(base: T, overrides: Partial<T>): T {
  const result = { ...base };
  for (const key in overrides) {
    const value = overrides[key];
    if (value !== undefined) {
      if (
        typeof value === 'object' &&
        value !== null &&
        !Array.isArray(value) &&
        typeof result[key] === 'object' &&
        result[key] !== null
      ) {
        result[key] = deepMerge(
          result[key] as object,
          value as object
        ) as T[typeof key];
      } else {
        result[key] = value as T[typeof key];
      }
    }
  }
  return result;
}

/**
 * Compose a theme from a colorMode and variant
 */
export function composeTheme(
  colorMode: ColorMode,
  variant: Variant
): ComposedTheme {
  const base = colorModes[colorMode];
  const variantDef = variantOverrides[variant];

  // Start with base colors from colorMode
  let colors = { ...base.colors };

  // Apply variant color overrides if they exist
  if (variantDef.colors?.[colorMode]) {
    colors = { ...colors, ...variantDef.colors[colorMode] };
  }

  // Determine shadow opacity
  const shadowOpacity = variantDef.shadows?.opacity ?? base.shadows.opacity;

  // Determine size scale
  const sizeScale = variantDef.size ?? size;

  const theme: ComposedTheme = {
    colors,
    shadows: { opacity: shadowOpacity },
    space,
    size: sizeScale,
    radius,
    zIndex,
    fontWeight,
    lineHeight,
  };

  // Add fontFamily if specified
  if (variantDef.fontFamily) {
    theme.fontFamily = variantDef.fontFamily;
  }

  return theme;
}

/**
 * Generate theme name from colorMode and variant
 */
export function getThemeName(colorMode: ColorMode, variant: Variant): ThemeName {
  return `${colorMode}-${variant}` as ThemeName;
}

/**
 * Parse theme name into colorMode and variant
 */
export function parseThemeName(themeName: ThemeName): {
  colorMode: ColorMode;
  variant: Variant;
} {
  const [colorMode, variant] = themeName.split('-') as [ColorMode, Variant];
  return { colorMode, variant };
}

/**
 * All possible theme names
 */
export type ThemeName =
  | 'light-default'
  | 'dark-default'
  | 'light-highContrast'
  | 'dark-highContrast'
  | 'light-largeText'
  | 'dark-largeText'
  | 'light-dyslexia'
  | 'dark-dyslexia'
  | 'light-lowVision'
  | 'dark-lowVision'
  | 'light-autismFriendly'
  | 'dark-autismFriendly';

export const themeNames: ThemeName[] = [
  'light-default',
  'dark-default',
  'light-highContrast',
  'dark-highContrast',
  'light-largeText',
  'dark-largeText',
  'light-dyslexia',
  'dark-dyslexia',
  'light-lowVision',
  'dark-lowVision',
  'light-autismFriendly',
  'dark-autismFriendly',
];

/**
 * All 12 composed themes
 */
export const themes = {
  'light-default': composeTheme('light', 'default'),
  'dark-default': composeTheme('dark', 'default'),
  'light-highContrast': composeTheme('light', 'highContrast'),
  'dark-highContrast': composeTheme('dark', 'highContrast'),
  'light-largeText': composeTheme('light', 'largeText'),
  'dark-largeText': composeTheme('dark', 'largeText'),
  'light-dyslexia': composeTheme('light', 'dyslexia'),
  'dark-dyslexia': composeTheme('dark', 'dyslexia'),
  'light-lowVision': composeTheme('light', 'lowVision'),
  'dark-lowVision': composeTheme('dark', 'lowVision'),
  'light-autismFriendly': composeTheme('light', 'autismFriendly'),
  'dark-autismFriendly': composeTheme('dark', 'autismFriendly'),
} as const;

export type Themes = typeof themes;
