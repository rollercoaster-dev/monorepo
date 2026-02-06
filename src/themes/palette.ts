/**
 * Base color palette - foundational color values
 * Derived from tamagui.config.ts
 */

export const palette = {
  white: '#ffffff',
  black: '#000000',

  // Gray scale
  gray50: '#fafafa',
  gray100: '#f5f5f5',
  gray200: '#e5e5e5',
  gray300: '#d4d4d4',
  gray400: '#a3a3a3',
  gray500: '#737373',
  gray600: '#525252',
  gray700: '#404040',
  gray800: '#262626',
  gray900: '#171717',

  // Brand colors
  purple300: '#c4b5fd',
  purple400: '#a78bfa',

  // Accent colors
  mint200: '#d4f4e7',
  mint600: '#059669',
  yellow200: '#f0e68c',
  yellow300: '#ffe50c',

  // Accessibility colors
  cream100: '#f8f5e4',
  cream200: '#f0edd6',

  // Semantic colors
  blue600: '#2563eb',
  red600: '#dc2626',
  green600: '#16a34a',

  // Desaturated (for autism-friendly theme)
  purpleDesaturated: '#b4a7d6',
  mintDesaturated: '#c8e6d4',
} as const;

export type Palette = typeof palette;
