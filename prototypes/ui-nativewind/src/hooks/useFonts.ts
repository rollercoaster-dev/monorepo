import { useCallback, useEffect, useState } from "react";
import * as Font from "expo-font";
import * as SplashScreen from "expo-splash-screen";

SplashScreen.preventAutoHideAsync();

interface FontLoadResult {
  fontsLoaded: boolean;
  fontError: Error | null;
  onLayoutRootView: () => Promise<void>;
}

export function useFonts(): FontLoadResult {
  const [fontsLoaded, setFontsLoaded] = useState(false);
  const [fontError, setFontError] = useState<Error | null>(null);

  useEffect(() => {
    async function loadFonts() {
      try {
        await Font.loadAsync({
          // OpenDyslexic font for dyslexia-friendly theme
          // Note: You'll need to add the OpenDyslexic font files to assets/fonts/
          // Download from: https://opendyslexic.org/
          // "OpenDyslexic": require("../../assets/fonts/OpenDyslexic-Regular.otf"),
          // "OpenDyslexic-Bold": require("../../assets/fonts/OpenDyslexic-Bold.otf"),
        });
        setFontsLoaded(true);
      } catch (error) {
        setFontError(error as Error);
        // Still mark as loaded so app can function without custom fonts
        setFontsLoaded(true);
      }
    }

    loadFonts();
  }, []);

  const onLayoutRootView = useCallback(async () => {
    if (fontsLoaded) {
      await SplashScreen.hideAsync();
    }
  }, [fontsLoaded]);

  return { fontsLoaded, fontError, onLayoutRootView };
}
