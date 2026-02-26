import React, { Suspense, useMemo, useState } from 'react';
import { View, ScrollView, Image, ActivityIndicator } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';
import { useQuery } from '@evolu/react';
import { useUnistyles } from 'react-native-unistyles';
import { Text } from '../../components/Text';
import { IconButton } from '../../components/IconButton';
import { Card } from '../../components/Card';
import { ErrorBoundary } from '../../components/ErrorBoundary';
import { badgeWithGoalQuery } from '../../db';
import type { BadgeId } from '../../db';
import { PLACEHOLDER_IMAGE_URI } from '../../hooks/useCreateBadge';
import { formatDate } from '../../utils/format';
import type { BadgeDetailScreenProps } from '../../navigation/types';
import { styles } from './BadgeDetailScreen.styles';

function BadgeDetailContent({ badgeId }: { badgeId: string }) {
  const query = useMemo(() => badgeWithGoalQuery(badgeId as BadgeId), [badgeId]);
  const rows = useQuery(query);
  const badge = rows[0] ?? null;

  const [imageLoadFailed, setImageLoadFailed] = useState(false);

  if (!badge) {
    return (
      <View style={styles.centered}>
        <Text variant="body">Badge not found</Text>
      </View>
    );
  }

  const imageUri = badge.imageUri as string | null;
  const hasRealImage = imageUri && imageUri !== PLACEHOLDER_IMAGE_URI && !imageLoadFailed;
  const goalTitle = (badge.goalTitle as string) ?? 'Untitled';
  const earnedDate = formatDate((badge.completedAt ?? badge.createdAt) as string | null);

  return (
    <ScrollView contentContainerStyle={styles.scrollContent}>
      {hasRealImage ? (
        <Image
          source={{ uri: imageUri }}
          style={styles.badgeImage}
          resizeMode="contain"
          accessibilityLabel={`Badge image for ${goalTitle}`}
          onError={() => setImageLoadFailed(true)}
        />
      ) : (
        <View style={styles.badgeImage}>
          <Text style={styles.badgeInitial}>
            {(goalTitle.charAt(0) || '?').toUpperCase()}
          </Text>
        </View>
      )}

      <Text style={styles.title}>{goalTitle}</Text>
      {earnedDate ? (
        <Text style={styles.description}>Earned {earnedDate}</Text>
      ) : null}

      <Card>
        <View style={styles.infoSection}>
          <Text style={styles.sectionLabel}>Details</Text>
          <Text style={styles.criteriaText}>
            Created {formatDate(badge.createdAt as string | null)}
          </Text>
        </View>
      </Card>
    </ScrollView>
  );
}

export function BadgeDetailScreen({ route }: BadgeDetailScreenProps) {
  const navigation = useNavigation();
  const { badgeId } = route.params;
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

      <ErrorBoundary>
        <Suspense
          fallback={
            <ActivityIndicator style={styles.loadingIndicator} size="large" />
          }
        >
          <BadgeDetailContent badgeId={badgeId} />
        </Suspense>
      </ErrorBoundary>
    </SafeAreaView>
  );
}
