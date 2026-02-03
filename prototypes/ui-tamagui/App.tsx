import { StatusBar } from 'expo-status-bar';
import { View, Text } from '@tamagui/core';
import { TamaguiProvider, useThemeName } from './src/TamaguiProvider';
import { TestScreen } from './src/screens/TestScreen';
import { useFonts } from './src/hooks/useFonts';

function AppContent() {
  const { theme } = useThemeName();
  const isDark = theme === 'dark' || theme === 'highContrast' || theme === 'lowVision';

  return (
    <>
      <TestScreen />
      <StatusBar style={isDark ? 'light' : 'dark'} />
    </>
  );
}

function LoadingScreen() {
  return (
    <View flex={1} backgroundColor="$background" alignItems="center" justifyContent="center">
      <Text color="$color">Loading...</Text>
    </View>
  );
}

export default function App() {
  const { loaded, error } = useFonts();

  if (!loaded && !error) {
    return null; // Splash screen still visible
  }

  return (
    <TamaguiProvider>
      <AppContent />
    </TamaguiProvider>
  );
}
