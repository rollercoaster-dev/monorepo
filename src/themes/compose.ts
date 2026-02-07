/**
 * Theme composition - combines colorModes with variants
 * Generates all 14 theme combinations (2 colorModes × 7 variants)
 */

import { colorModes, type ColorMode, type Colors } from './colorModes';
import { variantOverrides, variants, type Variant } from './variants';
import { space, size, sizeL, radius, zIndex, fontWeight, lineHeight, lineHeightL } from './tokens';
import { narrativeModes, type Narrative } from './adapter';

/** Size scale type - either normal or large */
export type SizeScale = typeof size | typeof sizeL;

/** Line height scale type - either normal or large */
export type LineHeightScale = typeof lineHeight | typeof lineHeightL;

export interface ComposedTheme {
  colors: Colors;
  narrative: Narrative;
  shadows: { opacity: number };
  space: typeof space;
  size: SizeScale;
  radius: typeof radius;
  zIndex: typeof zIndex;
  fontWeight: typeof fontWeight;
  lineHeight: LineHeightScale;
  fontFamily?: string;
}

/**
 * Compose a theme from a colorMode and variant
 */
export function composeTheme(
  colorMode: ColorMode,
  variant: Variant
): ComposedTheme {
  const base = colorModes[colorMode];
  const baseNarrative = narrativeModes[colorMode];
  const variantDef = variantOverrides[variant];

  // Start with base colors from colorMode
  let colors = { ...base.colors };

  // Apply variant color overrides (variants are defined as light-based diffs)
  if (variantDef.colors) {
    colors = { ...colors, ...variantDef.colors };
  }

  // Apply variant narrative overrides
  let narrative = baseNarrative;
  if (variantDef.narrative) {
    narrative = {
      climb: { ...baseNarrative.climb, ...variantDef.narrative.climb },
      drop: { ...baseNarrative.drop, ...variantDef.narrative.drop },
      stories: { ...baseNarrative.stories, ...variantDef.narrative.stories },
      relief: { ...baseNarrative.relief, ...variantDef.narrative.relief },
    };
  }

  // Determine shadow opacity
  const shadowOpacity = variantDef.shadows?.opacity ?? base.shadows.opacity;

  // Determine size scale
  const sizeScale = variantDef.size ?? size;

  // Determine line height scale
  const lineHeightScale = variantDef.lineHeight ?? lineHeight;

  const theme: ComposedTheme = {
    colors,
    narrative,
    shadows: { opacity: shadowOpacity },
    space,
    size: sizeScale,
    radius,
    zIndex,
    fontWeight,
    lineHeight: lineHeightScale,
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
  const idx = themeName.indexOf('-');
  const colorMode = themeName.slice(0, idx) as ColorMode;
  const variant = themeName.slice(idx + 1) as Variant;
  return { colorMode, variant };
}

/** All possible theme names - derived from colorMode × variant */
export type ThemeName = `${ColorMode}-${Variant}`;

const colorModeList: ColorMode[] = ['light', 'dark'];

export const themeNames: ThemeName[] = colorModeList.flatMap(
  (cm) => variants.map((v) => `${cm}-${v}` as ThemeName)
);

/** All 14 composed themes - derived from colorMode × variant */
export const themes = Object.fromEntries(
  colorModeList.flatMap((cm) =>
    variants.map((v) => [`${cm}-${v}`, composeTheme(cm, v)])
  )
) as Record<ThemeName, ComposedTheme>;

export type Themes = typeof themes;
