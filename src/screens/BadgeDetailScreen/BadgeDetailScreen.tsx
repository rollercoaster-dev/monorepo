import React from 'react';
import { View, ScrollView } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';
import { useUnistyles } from 'react-native-unistyles';
import { Text } from '../../components/Text';
import { IconButton } from '../../components/IconButton';
import { Card } from '../../components/Card';
import { StatusBadge } from '../../components/StatusBadge';
import type { BadgeDetailScreenProps } from '../../navigation/types';
import { styles } from './BadgeDetailScreen.styles';

export function BadgeDetailScreen({ route }: BadgeDetailScreenProps) {
  const navigation = useNavigation();
  const { badgeId } = route.params;
  // Subscribe to theme changes to trigger re-renders
  const { theme } = useUnistyles();

  return (
    <SafeAreaView edges={['top']} style={{ flex: 1, backgroundColor: theme.colors.background }}>
      <View style={styles.topBar}>
        <IconButton
          icon={<Text variant="headline">{'\u2190'}</Text>}
          onPress={() => navigation.goBack()}
          variant="ghost"
          accessibilityLabel="Go back"
        />
        <Text style={styles.topBarTitle}>Badge</Text>
        <View style={styles.spacer} />
      </View>

      <ScrollView contentContainerStyle={styles.scrollContent}>
        <View style={styles.badgeImage}>
          <Text style={styles.badgeInitial}>?</Text>
        </View>

        <Text style={styles.title}>Badge {badgeId.slice(0, 8)}</Text>
        <Text style={styles.description}>
          Badge details will appear here once the badge data layer is connected.
        </Text>

        <Card>
          <View style={styles.infoSection}>
            <View style={styles.criteriaRow}>
              <StatusBadge variant="locked" />
              <Text style={styles.criteriaText}>Badge data layer not yet connected</Text>
            </View>
          </View>
        </Card>
      </ScrollView>
    </SafeAreaView>
  );
}
