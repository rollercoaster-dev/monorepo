import { useFonts as useExpoFonts } from 'expo-font';

export function useFonts() {
  const [loaded, error] = useExpoFonts({
    // Uncomment when font files are added:
    // 'OpenDyslexic': require('../../assets/fonts/OpenDyslexic-Regular.otf'),
    // 'AtkinsonHyperlegible': require('../../assets/fonts/AtkinsonHyperlegible-Regular.ttf'),
    // 'DMMono': require('../../assets/fonts/DMMono-Regular.ttf'),
  });

  return { loaded: loaded || true, error }; // Return true for now since no fonts loaded
}
