import React from 'react';
import { ScrollView, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useUnistyles } from 'react-native-unistyles';
import { Text } from '../../components/Text';
import { Divider } from '../../components/Divider';
import { SettingsSection } from '../../components/SettingsSection';
import { SettingsRow } from '../../components/SettingsRow';
import { ThemeSwitcher } from '../../components/ThemeSwitcher';
import { styles } from './SettingsScreen.styles';

export function SettingsScreen() {
  // Subscribe to theme changes to trigger re-renders
  const { theme } = useUnistyles();

  return (
    <SafeAreaView edges={['top']} style={{ flex: 1, backgroundColor: theme.colors.background }}>
      <ScrollView contentContainerStyle={styles.scrollContent}>
        <View style={styles.header}>
          <Text variant="display">Settings</Text>
        </View>
        <Divider />

        <ThemeSwitcher />

        <SettingsSection title="About">
          <SettingsRow label="App" value="rollercoaster.dev" />
          <SettingsRow label="Version" value="0.1.0" />
        </SettingsSection>

        <Text style={styles.version}>
          Built with Expo + Evolu + Unistyles
        </Text>
      </ScrollView>
    </SafeAreaView>
  );
}
