import React, { Suspense, useState } from 'react';
import { View, ScrollView, ActivityIndicator } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';
import { useQuery } from '@evolu/react';
import { useUnistyles } from 'react-native-unistyles';
import { Text } from '../../components/Text';
import { Card } from '../../components/Card';
import { Button } from '../../components/Button';
import { IconButton } from '../../components/IconButton';
import { StatusBadge } from '../../components/StatusBadge';
import { Divider } from '../../components/Divider';
import { ConfirmDeleteModal } from '../ConfirmDeleteModal';
import {
  goalsQuery,
  completeGoal,
  uncompleteGoal,
  deleteGoal,
  GoalStatus,
} from '../../db';
import type { GoalDetailScreenProps } from '../../navigation/types';
import { styles } from './GoalDetailScreen.styles';

function GoalContent({ goalId }: { goalId: string }) {
  const navigation = useNavigation();
  const rows = useQuery(goalsQuery);
  const goal = rows.find((r) => r.id === goalId);
  const [showDeleteModal, setShowDeleteModal] = useState(false);

  if (!goal) {
    return (
      <View style={styles.centered}>
        <Text variant="body">Goal not found.</Text>
      </View>
    );
  }

  const { id, title, description } = goal;
  const isCompleted = goal.status === GoalStatus.completed;

  function handleToggleStatus() {
    if (isCompleted) {
      uncompleteGoal(id);
    } else {
      completeGoal(id);
    }
  }

  function handleDelete() {
    setShowDeleteModal(true);
  }

  function confirmDelete() {
    deleteGoal(id);
    setShowDeleteModal(false);
    navigation.goBack();
  }

  return (
    <>
      <ScrollView contentContainerStyle={styles.scrollContent}>
        <Card>
          <View style={styles.titleRow}>
            <Text variant="title" style={styles.titleText}>{title}</Text>
            <StatusBadge variant={isCompleted ? 'completed' : 'active'} />
          </View>
          <Divider spacing="2" />
          {description ? (
            <Text variant="body" style={styles.descriptionText}>{description}</Text>
          ) : (
            <Text variant="caption" style={styles.mutedText}>No description added.</Text>
          )}
        </Card>

        <Card>
          <Text variant="label">Actions</Text>
          <View style={styles.actions}>
            <View style={styles.actionButton}>
              <Button
                label={isCompleted ? 'Reopen' : 'Complete'}
                variant="primary"
                onPress={handleToggleStatus}
              />
            </View>
            <View style={styles.actionButton}>
              <Button
                label="Delete"
                variant="destructive"
                onPress={handleDelete}
              />
            </View>
          </View>
        </Card>
      </ScrollView>
      <ConfirmDeleteModal
        visible={showDeleteModal}
        onCancel={() => setShowDeleteModal(false)}
        onConfirm={confirmDelete}
        title="Delete this goal?"
        message={`"${title}" and all progress will be permanently deleted.`}
      />
    </>
  );
}

export function GoalDetailScreen({ route }: GoalDetailScreenProps) {
  const navigation = useNavigation();
  // Subscribe to theme changes to trigger re-renders
  const { theme } = useUnistyles();

  return (
    <SafeAreaView edges={['top']} style={{ flex: 1, backgroundColor: theme.colors.background }}>
      <View style={styles.topBar}>
        <IconButton
          icon={<Text variant="body" style={styles.backIcon}>{'<'}</Text>}
          onPress={() => navigation.goBack()}
          accessibilityLabel="Go back"
          size="sm"
        />
        <Text variant="label">Goal Detail</Text>
        <View style={styles.spacer} />
      </View>
      <Suspense
        fallback={
          <ActivityIndicator style={styles.loadingIndicator} size="large" />
        }
      >
        <GoalContent goalId={route.params.goalId} />
      </Suspense>
    </SafeAreaView>
  );
}
