import React, { Suspense, useState } from 'react';
import { View, ScrollView, ActivityIndicator, AccessibilityInfo, Alert } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation, type NavigationProp } from '@react-navigation/native';
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
import { EvidenceActionSheet } from '../EvidenceActionSheet';
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
  EvidenceType,
} from '../../db';
import type { GoalId, StepId } from '../../db';
import type { GoalDetailScreenProps, GoalsStackParamList, CaptureScreenName } from '../../navigation/types';
import type { EvidenceTypeValue } from '../EvidenceActionSheet';
import { styles } from './GoalDetailScreen.styles';

const EVIDENCE_ROUTE_MAP: Partial<Record<EvidenceTypeValue, CaptureScreenName>> = {
  [EvidenceType.photo]: 'CapturePhoto',
  [EvidenceType.voice_memo]: 'CaptureVoiceMemo',
  [EvidenceType.text]: 'CaptureTextNote',
  [EvidenceType.link]: 'CaptureLink',
  [EvidenceType.file]: 'CaptureFile',
};

function GoalContent({ goalId }: { goalId: string }) {
  const navigation = useNavigation<NavigationProp<GoalsStackParamList>>();
  const rows = useQuery(goalsQuery);
  const goal = rows.find((r) => r.id === goalId);
  const stepRows = useQuery(stepsByGoalQuery(goalId as GoalId));
  const [showDeleteGoalModal, setShowDeleteGoalModal] = useState(false);
  const [deleteStepTarget, setDeleteStepTarget] = useState<{ id: string; title: string } | null>(null);
  const [showEvidenceSheet, setShowEvidenceSheet] = useState(false);

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
    if (!step) {
      console.warn(`[GoalDetailScreen] handleToggleStep: step not found for id "${stepId}"`);
      return;
    }
    const isCurrentlyCompleted = step.status === StepStatus.completed;
    try {
      if (isCurrentlyCompleted) {
        uncompleteStep(stepId as StepId);
      } else {
        completeStep(stepId as StepId);
      }
      AccessibilityInfo.announceForAccessibility(
        `Step "${step.title}" marked as ${isCurrentlyCompleted ? 'incomplete' : 'completed'}`,
      );
    } catch (error) {
      console.error('[GoalDetailScreen] Failed to toggle step completion', { stepId, error });
      Alert.alert('Could not update step', 'Something went wrong. Please try again.');
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

  function handleSelectEvidenceType(type: EvidenceTypeValue) {
    setShowEvidenceSheet(false);
    const route = EVIDENCE_ROUTE_MAP[type];
    if (!route) {
      console.warn(`[GoalDetailScreen] No route for evidence type "${type}"`);
      return;
    }
    navigation.navigate(route, { goalId });
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
          <Text variant="label">Evidence</Text>
          <Button
            label="Add Evidence"
            variant="secondary"
            onPress={() => setShowEvidenceSheet(true)}
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

      <EvidenceActionSheet
        visible={showEvidenceSheet}
        onClose={() => setShowEvidenceSheet(false)}
        onSelectType={handleSelectEvidenceType}
      />
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
