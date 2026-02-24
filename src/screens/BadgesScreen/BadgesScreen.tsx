import React from 'react';
import { View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useUnistyles } from 'react-native-unistyles';
import { Text } from '../../components/Text';
import { EmptyState } from '../../components/EmptyState';
import { styles } from './BadgesScreen.styles';

export function BadgesScreen() {
  // Subscribe to theme changes to trigger re-renders
  const { theme } = useUnistyles();

  return (
    <SafeAreaView edges={['top']} style={{ flex: 1, backgroundColor: theme.colors.accentYellow }}>
      <View style={styles.header}>
        <Text variant="display">Badges</Text>
      </View>
      <View style={[styles.scrollContent, { flex: 1, backgroundColor: theme.colors.background }]}>
        <EmptyState
          title="No badges yet"
          body="Complete goals to earn badges. Your collection will grow here."
        />
      </View>
    </SafeAreaView>
  );
}
