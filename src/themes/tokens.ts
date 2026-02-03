/**
 * Design tokens for the application
 * Matches design-token-system.md specifications
 */

/** Base spacing scale (4px increments) */
export const space = {
  0: 0,
  1: 4,
  2: 8,
  3: 12,
  4: 16,
  5: 20,
  6: 24,
  8: 32,
  12: 48,
} as const;

/** Typography sizes (matches design-language.md) */
export const size = {
  xs: 12,
  sm: 14,
  md: 16,
  lg: 18,
  xl: 20,
  '2xl': 24,
  '3xl': 30,
} as const;

/** Large text scale (1.25x multiplier for accessibility) */
export const sizeL = {
  xs: 15,
  sm: 18,
  md: 20,
  lg: 23,
  xl: 25,
  '2xl': 30,
  '3xl': 38,
} as const;

/** Border radii */
export const radius = {
  sm: 4,
  md: 8,
  lg: 12,
  full: 9999,
} as const;

/** Z-index scale */
export const zIndex = {
  0: 0,
  1: 100,
  2: 200,
  3: 300,
  4: 400,
  5: 500,
} as const;

/** Font weights */
export const fontWeight = {
  normal: '400',
  semibold: '600',
  bold: '700',
} as const;

/** Line heights */
export const lineHeight = {
  xs: 16,
  sm: 20,
  md: 24,
  lg: 26,
  xl: 28,
  '2xl': 32,
  '3xl': 40,
} as const;

/** Increased line heights for accessibility fonts (1.4x multiplier) */
export const lineHeightL = {
  xs: 22,
  sm: 28,
  md: 34,
  lg: 36,
  xl: 40,
  '2xl': 44,
  '3xl': 56,
} as const;

export type Space = typeof space;
export type Size = typeof size;
export type Radius = typeof radius;
export type ZIndex = typeof zIndex;
