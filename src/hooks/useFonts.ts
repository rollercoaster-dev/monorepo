import { useFonts as useExpoFonts } from 'expo-font';

/**
 * Custom font loading hook
 *
 * Loads custom fonts for accessibility themes:
 * - OpenDyslexic for dyslexia theme
 * - Atkinson Hyperlegible for low vision theme
 *
 * Returns loading state for splash screen handling.
 */
export function useFonts() {
  const [fontsLoaded, fontError] = useExpoFonts({
    // System fonts are used by default
    // Custom fonts can be added here when available:
    // 'OpenDyslexic': require('../assets/fonts/OpenDyslexic-Regular.otf'),
    // 'AtkinsonHyperlegible': require('../assets/fonts/AtkinsonHyperlegible-Regular.ttf'),
  });

  return {
    fontsLoaded,
    fontError,
    isReady: fontsLoaded && !fontError,
  };
}
