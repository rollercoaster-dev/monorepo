import { StatusBar } from 'expo-status-bar';
import { TamaguiProvider, useThemeName } from './src/TamaguiProvider';
import { TestScreen } from './src/screens/TestScreen';

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

export default function App() {
  return (
    <TamaguiProvider>
      <AppContent />
    </TamaguiProvider>
  );
}
