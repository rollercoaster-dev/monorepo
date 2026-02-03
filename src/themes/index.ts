// Re-export tokens and palette
export * from './tokens';
export * from './palette';

// Re-export colorModes
export { colorModes, lightColors, darkColors } from './colorModes';
export type { ColorMode, Colors } from './colorModes';

// Re-export variants
export { variantOverrides, variants, variantOptions } from './variants';
export type { Variant } from './variants';

// Re-export compose functions and themes
export {
  themes,
  themeNames,
  composeTheme,
  getThemeName,
  parseThemeName,
} from './compose';
export type { ThemeName, ComposedTheme, Themes } from './compose';

// Convenience: export AppTheme as an alias for ComposedTheme
import type { ComposedTheme } from './compose';
export type AppTheme = ComposedTheme;

// Import themes for module augmentation
import { themes } from './compose';

// Module augmentation for react-native-unistyles
declare module 'react-native-unistyles' {
  export interface UnistylesThemes {
    'light-default': typeof themes['light-default'];
    'dark-default': typeof themes['dark-default'];
    'light-highContrast': typeof themes['light-highContrast'];
    'dark-highContrast': typeof themes['dark-highContrast'];
    'light-largeText': typeof themes['light-largeText'];
    'dark-largeText': typeof themes['dark-largeText'];
    'light-dyslexia': typeof themes['light-dyslexia'];
    'dark-dyslexia': typeof themes['dark-dyslexia'];
    'light-lowVision': typeof themes['light-lowVision'];
    'dark-lowVision': typeof themes['dark-lowVision'];
    'light-autismFriendly': typeof themes['light-autismFriendly'];
    'dark-autismFriendly': typeof themes['dark-autismFriendly'];
  }
}
