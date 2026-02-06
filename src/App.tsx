import { StatusBar } from 'expo-status-bar';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { TestScreen } from './screens/TestScreen';
import { useFonts } from './hooks/useFonts';

/**
 * Root App component
 *
 * Note: NO theme provider wrapper needed!
 * Unistyles handles theming globally via StyleSheet.configure()
 */
export function App() {
  const { isReady } = useFonts();

  if (!isReady) return null;

  return (
    <SafeAreaProvider>
      <StatusBar style="auto" />
      <TestScreen />
    </SafeAreaProvider>
  );
}
