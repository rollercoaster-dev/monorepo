import React, { Suspense, useEffect, useRef, useState } from 'react';
import { View, ScrollView, Modal, ActivityIndicator, AccessibilityInfo, Alert } from 'react-native';
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
import { CelebrationModal } from '../CelebrationModal';
import { EvidenceActionSheet } from '../EvidenceActionSheet';
import { useAnimationPref } from '../../hooks/useAnimationPref';
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
  reorderSteps,
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
  const { animationPref } = useAnimationPref();
  const [showDeleteGoalModal, setShowDeleteGoalModal] = useState(false);
  const [deleteStepTarget, setDeleteStepTarget] = useState<{ id: string; title: string } | null>(null);
  const [showEvidenceSheet, setShowEvidenceSheet] = useState(false);
  const [showCompletionConfirm, setShowCompletionConfirm] = useState(false);
  const [showCelebration, setShowCelebration] = useState(false);
  const hasAnnouncedReady = useRef(false);

  const isCompleted = goal?.status === GoalStatus.completed;
  const allStepsComplete = stepRows.length > 0 && stepRows.every(
    (s) => s.status === StepStatus.completed,
  );

  // Announce when all steps become complete (once per transition)
  useEffect(() => {
    if (!goal) return;
    if (allStepsComplete && !isCompleted && !hasAnnouncedReady.current) {
      hasAnnouncedReady.current = true;
      AccessibilityInfo.announceForAccessibility(
        `All steps completed for "${goal.title}". Ready to complete goal.`,
      );
    } else if (!allStepsComplete) {
      hasAnnouncedReady.current = false;
    }
  }, [goal, allStepsComplete, isCompleted]);

  if (!goal) {
    return (
      <View style={styles.centered}>
        <Text variant="body">Goal not found.</Text>
      </View>
    );
  }

  const { id, title, description } = goal;

  const steps: Step[] = stepRows.map((row) => ({
    id: row.id,
    title: row.title ?? '',
    completed: row.status === StepStatus.completed,
  }));

  function handleCompleteGoal() {
    try {
      completeGoal(id);
      setShowCompletionConfirm(false);
      setShowCelebration(true);
      AccessibilityInfo.announceForAccessibility(
        `Goal "${title}" completed!`,
      );
      // TODO(A.3 #59): Replace with actual badge creation
      console.log('[GoalDetailScreen] Badge creation stub for goal:', id);
    } catch (error) {
      console.error('[GoalDetailScreen] Failed to complete goal', { goalId: id, error });
      setShowCompletionConfirm(false);
      Alert.alert('Could not complete goal', 'Something went wrong. Please try again.');
    }
  }

  function handleToggleStatus() {
    if (isCompleted) {
      uncompleteGoal(id);
    } else {
      setShowCompletionConfirm(true);
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

  function handleReorderSteps(stepIds: string[]) {
    try {
      reorderSteps(goalId as GoalId, stepIds as StepId[]);
    } catch (error) {
      console.error('[GoalDetailScreen] Failed to reorder steps', { error });
      Alert.alert('Could not reorder steps', 'Something went wrong. Please try again.');
    }
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
            onReorderSteps={handleReorderSteps}
          />
          {allStepsComplete && !isCompleted && (
            <Text
              variant="caption"
              style={styles.completionCue}
              accessibilityRole="text"
            >
              All steps done!
            </Text>
          )}
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
                label={isCompleted ? 'Reopen' : 'Complete Goal'}
                variant={allStepsComplete && !isCompleted ? 'primary' : 'secondary'}
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
      <Modal
        visible={showCompletionConfirm}
        transparent
        animationType={animationPref === 'none' ? 'none' : 'fade'}
        onRequestClose={() => setShowCompletionConfirm(false)}
        accessibilityViewIsModal
      >
        <View style={styles.modalOverlay}>
          <SafeAreaView edges={['bottom']} style={styles.modalContainer}>
            <Card size="normal">
              <View
                style={styles.modalContent}
                accessible
                accessibilityLiveRegion="polite"
              >
                <Text
                  variant="headline"
                  style={styles.modalTitle}
                  accessibilityRole="header"
                >
                  Complete this goal?
                </Text>
                <Text variant="body" style={styles.modalMessage}>
                  {allStepsComplete
                    ? 'All steps done! Ready to earn your badge?'
                    : 'Some steps are still incomplete. Complete this goal anyway?'}
                </Text>
              </View>
              <View style={styles.modalActions}>
                <Button
                  label="Complete Goal"
                  onPress={handleCompleteGoal}
                  variant="primary"
                />
                <Button
                  label="Not Yet"
                  onPress={() => setShowCompletionConfirm(false)}
                  variant="secondary"
                />
              </View>
            </Card>
          </SafeAreaView>
        </View>
      </Modal>
      <CelebrationModal
        visible={showCelebration}
        onDismiss={() => setShowCelebration(false)}
        title="Goal completed!"
        message="You did it. Badge coming soon."
        icon="🎯"
        animationType={animationPref === 'none' ? 'none' : 'fade'}
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
