import { createTamagui, createTokens, createFont } from '@tamagui/core';
import { createAnimations } from '@tamagui/animations-react-native';

// Base spacing scale (matches design-token-system.md)
const space = {
  0: 0,
  1: 4,
  2: 8,
  3: 12,
  4: 16,
  5: 20,
  6: 24,
  8: 32,
  12: 48,
  true: 16, // default
};

// Typography sizes (matches design-language.md)
const size = {
  xs: 12,
  sm: 14,
  md: 16,
  lg: 18,
  xl: 20,
  '2xl': 24,
  '3xl': 30,
  true: 16,
};

// Border radii
const radius = {
  sm: 4,
  md: 8,
  lg: 12,
  full: 9999,
  true: 8,
};

// Z-index scale
const zIndex = {
  0: 0,
  1: 100,
  2: 200,
  3: 300,
  4: 400,
  5: 500,
};

// Base color palette - foundational values
const palette = {
  white: '#ffffff',
  black: '#000000',
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
  purple300: '#c4b5fd',
  purple400: '#a78bfa',
  mint200: '#d4f4e7',
  mint600: '#059669',
  yellow300: '#ffe50c',
  yellow200: '#f0e68c',
  cream100: '#f8f5e4',
  cream200: '#f0edd6',
  blue600: '#0000ff',
  red600: '#dc2626',
  green600: '#16a34a',
};

const tokens = createTokens({
  space,
  size,
  radius,
  zIndex,
  color: palette,
});

// System font for body text
const bodyFont = createFont({
  family: 'System',
  size: {
    1: 12,
    2: 14,
    3: 16,
    4: 18,
    5: 20,
    6: 24,
    7: 30,
    true: 16,
  },
  lineHeight: {
    1: 16,
    2: 20,
    3: 24,
    4: 26,
    5: 28,
    6: 32,
    7: 40,
    true: 24,
  },
  weight: {
    4: '400',
    6: '600',
    7: '700',
  },
  letterSpacing: {
    4: 0,
    true: 0,
  },
});

// Animations with reduced motion support
const animations = createAnimations({
  fast: {
    type: 'timing',
    duration: 100,
  },
  medium: {
    type: 'timing',
    duration: 200,
  },
  slow: {
    type: 'timing',
    duration: 300,
  },
});

export const config = createTamagui({
  tokens,
  fonts: {
    body: bodyFont,
    heading: bodyFont, // Will be replaced with Anybody font
  },
  animations,
  themes: {}, // Themes added in next task
});

export type Conf = typeof config;

declare module '@tamagui/core' {
  interface TamaguiCustomConfig extends Conf {}
}

export default config;
