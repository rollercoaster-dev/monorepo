import { lightTheme } from './themes/light';
import { darkTheme } from './themes/dark';
import { highContrastTheme } from './themes/highContrast';
import { largeTextTheme } from './themes/largeText';
import { dyslexiaTheme } from './themes/dyslexia';
import { lowVisionTheme } from './themes/lowVision';
import { autismFriendlyTheme } from './themes/autismFriendly';

// Re-export tokens and palette
export * from './tokens';
export * from './palette';

// Re-export individual themes
export { lightTheme } from './themes/light';
export { darkTheme } from './themes/dark';
export { highContrastTheme } from './themes/highContrast';
export { largeTextTheme } from './themes/largeText';
export { dyslexiaTheme } from './themes/dyslexia';
export { lowVisionTheme } from './themes/lowVision';
export { autismFriendlyTheme } from './themes/autismFriendly';

/**
 * All available themes for unistyles configuration
 */
export const themes = {
  light: lightTheme,
  dark: darkTheme,
  highContrast: highContrastTheme,
  largeText: largeTextTheme,
  dyslexia: dyslexiaTheme,
  lowVision: lowVisionTheme,
  autismFriendly: autismFriendlyTheme,
} as const;

/**
 * Theme name type for type-safe theme switching
 */
export type ThemeName = keyof typeof themes;

/**
 * Array of theme names for iteration
 */
export const themeNames: ThemeName[] = [
  'light',
  'dark',
  'highContrast',
  'largeText',
  'dyslexia',
  'lowVision',
  'autismFriendly',
];

/**
 * Theme metadata for UI display
 */
export const themeOptions: { id: ThemeName; label: string; description: string }[] = [
  { id: 'light', label: 'Light', description: 'Default light theme' },
  { id: 'dark', label: 'Dark', description: 'For low light environments' },
  { id: 'highContrast', label: 'High Contrast', description: 'WCAG AAA contrast' },
  { id: 'largeText', label: 'Large Text', description: 'Increased text sizes' },
  { id: 'dyslexia', label: 'Dyslexia', description: 'OpenDyslexic font, cream background' },
  { id: 'lowVision', label: 'Low Vision', description: 'Atkinson Hyperlegible, large targets' },
  { id: 'autismFriendly', label: 'Autism-Friendly', description: 'Muted colors, no animations' },
];

// Type for the unified theme structure
export type AppTheme = typeof lightTheme;

// Module augmentation for react-native-unistyles
declare module 'react-native-unistyles' {
  export interface UnistylesThemes {
    light: typeof lightTheme;
    dark: typeof darkTheme;
    highContrast: typeof highContrastTheme;
    largeText: typeof largeTextTheme;
    dyslexia: typeof dyslexiaTheme;
    lowVision: typeof lowVisionTheme;
    autismFriendly: typeof autismFriendlyTheme;
  }
}
