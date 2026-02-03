import { StatusBar } from 'expo-status-bar';
import { TamaguiProvider } from './src/TamaguiProvider';
import { View, Text } from '@tamagui/core';

export default function App() {
  return (
    <TamaguiProvider>
      <View flex={1} backgroundColor="$background" alignItems="center" justifyContent="center">
        <Text color="$color" fontSize="$6">
          Tamagui Prototype
        </Text>
        <StatusBar style="auto" />
      </View>
    </TamaguiProvider>
  );
}
