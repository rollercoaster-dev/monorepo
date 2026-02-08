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
import { StepList, type Step } from '../../components/StepList';
import { ConfirmDeleteModal } from '../ConfirmDeleteModal';
import {
  goalsQuery,
  completeGoal,
  uncompleteGoal,
  deleteGoal,
  GoalStatus,
  stepsByGoalQuery,
  createStep,
  updateStep,
  deleteStep,
  completeStep,
  uncompleteStep,
  StepStatus,
} from '../../db';
import type { GoalId, StepId } from '../../db';
import type { GoalDetailScreenProps } from '../../navigation/types';
import { styles } from './GoalDetailScreen.styles';

function GoalContent({ goalId }: { goalId: string }) {
  const navigation = useNavigation();
  const rows = useQuery(goalsQuery);
  const goal = rows.find((r) => r.id === goalId);
  const stepRows = useQuery(stepsByGoalQuery(goalId as GoalId));
  const [showDeleteGoalModal, setShowDeleteGoalModal] = useState(false);
  const [deleteStepTarget, setDeleteStepTarget] = useState<{ id: string; title: string } | null>(null);

  if (!goal) {
    return (
      <View style={styles.centered}>
        <Text variant="body">Goal not found.</Text>
      </View>
    );
  }

  const { id, title, description } = goal;
  const isCompleted = goal.status === GoalStatus.completed;

  const steps: Step[] = stepRows.map((row) => ({
    id: row.id,
    title: row.title ?? '',
    completed: row.status === StepStatus.completed,
  }));

  function handleToggleStatus() {
    if (isCompleted) {
      uncompleteGoal(id);
    } else {
      completeGoal(id);
    }
  }

  function handleDeleteGoal() {
    setShowDeleteGoalModal(true);
  }

  function confirmDeleteGoal() {
    try {
      deleteGoal(id);
      setShowDeleteGoalModal(false);
      navigation.goBack();
    } catch {
      setShowDeleteGoalModal(false);
    }
  }

  function handleToggleStep(stepId: string) {
    const step = stepRows.find((s) => s.id === stepId);
    if (!step) return;
    if (step.status === StepStatus.completed) {
      uncompleteStep(stepId as StepId);
    } else {
      completeStep(stepId as StepId);
    }
  }

  function handleCreateStep(stepTitle: string) {
    const maxOrdinal = stepRows.reduce(
      (max, s) => Math.max(max, s.ordinal ?? -1),
      -1,
    );
    createStep(goalId as GoalId, stepTitle, maxOrdinal + 1);
  }

  function handleUpdateStep(stepId: string, newTitle: string) {
    updateStep(stepId as StepId, { title: newTitle });
  }

  function handleDeleteStep(stepId: string) {
    const step = stepRows.find((s) => s.id === stepId);
    setDeleteStepTarget(step ? { id: step.id, title: step.title ?? '' } : null);
  }

  function confirmDeleteStep() {
    if (deleteStepTarget) {
      deleteStep(deleteStepTarget.id as StepId);
      setDeleteStepTarget(null);
    }
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
          <StepList
            steps={steps}
            onToggleStep={handleToggleStep}
            onCreateStep={handleCreateStep}
            onUpdateStep={handleUpdateStep}
            onDeleteStep={handleDeleteStep}
          />
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
                onPress={handleDeleteGoal}
              />
            </View>
          </View>
        </Card>
      </ScrollView>

      <ConfirmDeleteModal
        visible={showDeleteGoalModal}
        onCancel={() => setShowDeleteGoalModal(false)}
        onConfirm={confirmDeleteGoal}
        title="Delete this goal?"
        message={`"${title}" and all progress will be permanently deleted.`}
      />
      <ConfirmDeleteModal
        visible={deleteStepTarget !== null}
        onCancel={() => setDeleteStepTarget(null)}
        onConfirm={confirmDeleteStep}
        title="Delete this step?"
        message={deleteStepTarget ? `"${deleteStepTarget.title}" will be permanently deleted.` : ''}
      />
    </>
  );
}

export function GoalDetailScreen({ route }: GoalDetailScreenProps) {
  const navigation = useNavigation();
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
