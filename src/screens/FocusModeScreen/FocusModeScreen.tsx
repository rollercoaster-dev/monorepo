import { Suspense, useEffect, useRef, useState } from 'react';
import { View, ActivityIndicator, AccessibilityInfo, Alert } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation, type NavigationProp } from '@react-navigation/native';
import { useQuery } from '@evolu/react';
import { useUnistyles } from 'react-native-unistyles';
import { Text } from '../../components/Text';
import { IconButton } from '../../components/IconButton';
import { CardCarousel } from '../../components/CardCarousel';
import { MiniTimeline, type MiniTimelineStep } from '../../components/MiniTimeline';
import { ProgressDots, type ProgressDotsStep } from '../../components/ProgressDots';
import { StepCard, type StepCardStatus } from '../../components/StepCard';
import { GoalEvidenceCard } from '../../components/GoalEvidenceCard';
import { EvidenceDrawer, type EvidenceItemData } from '../../components/EvidenceDrawer';
import { FAB } from '../../components/FAB';
import { FABMenu } from '../../components/FABMenu';
import {
  goalsQuery,
  stepsByGoalQuery,
  evidenceByGoalQuery,
  evidenceByStepQuery,
  completeStep,
  uncompleteStep,
  deleteEvidence,
  EvidenceType,
  StepStatus,
} from '../../db';
import type { GoalId, StepId, EvidenceId } from '../../db';
import type { GoalsStackParamList, FocusModeScreenProps as FocusModeNavProps, CaptureScreenName } from '../../navigation/types';
import type { EvidenceTypeValue } from '../EvidenceActionSheet';
import type { StepStatus as UIStepStatus } from '../../types/steps';
import { deleteEvidenceFile } from '../../utils/evidenceCleanup';
import { styles } from './FocusModeScreen.styles';

const EVIDENCE_ROUTE_MAP: Partial<Record<EvidenceTypeValue, CaptureScreenName>> = {
  [EvidenceType.photo]: 'CapturePhoto',
  [EvidenceType.video]: 'CaptureVideo',
  [EvidenceType.voice_memo]: 'CaptureVoiceMemo',
  [EvidenceType.text]: 'CaptureTextNote',
  [EvidenceType.link]: 'CaptureLink',
  [EvidenceType.file]: 'CaptureFile',
};

function FocusContent({ goalId }: { goalId: string }) {
  const navigation = useNavigation<NavigationProp<GoalsStackParamList>>();
  const rows = useQuery(goalsQuery);
  const goal = rows.find((r) => r.id === goalId);
  const stepRows = useQuery(stepsByGoalQuery(goalId as GoalId));
  const goalEvidenceRows = useQuery(evidenceByGoalQuery(goalId as GoalId));

  const [currentCardIndex, setCurrentCardIndex] = useState(0);
  const [isDrawerOpen, setIsDrawerOpen] = useState(false);
  const [isFABMenuOpen, setIsFABMenuOpen] = useState(false);
  const hasAnnouncedComplete = useRef(false);

  const isGoalCard = currentCardIndex >= stepRows.length;

  // Derive UI step status: current step is 'in-progress', others are mapped from DB
  const uiSteps: { id: string; title: string; status: UIStepStatus; evidenceCount: number }[] =
    stepRows.map((row, index) => ({
      id: row.id,
      title: row.title ?? '',
      status:
        row.status === StepStatus.completed
          ? 'completed'
          : index === currentCardIndex
            ? 'in-progress'
            : 'pending',
      evidenceCount: 0, // Will be enriched below
    }));

  // Query evidence per step for counts
  const stepEvidenceCounts = useStepEvidenceCounts(stepRows);

  // Enrich step evidence counts
  const stepsWithEvidence = uiSteps.map((step, i) => ({
    ...step,
    evidenceCount: stepEvidenceCounts[i] ?? 0,
  }));

  // Timeline + dot steps
  const timelineSteps: MiniTimelineStep[] = stepsWithEvidence.map((s) => ({ status: s.status }));
  const dotSteps: ProgressDotsStep[] = stepsWithEvidence.map((s) => ({ status: s.status }));

  // Current evidence for the drawer
  const currentStepId = isGoalCard ? null : stepRows[currentCardIndex]?.id;
  const currentStepEvidenceRows = useQuery(
    currentStepId
      ? evidenceByStepQuery(currentStepId as StepId)
      : evidenceByGoalQuery(goalId as GoalId),
  );

  const drawerEvidence: EvidenceItemData[] = (isGoalCard ? goalEvidenceRows : currentStepEvidenceRows).map(
    (row) => ({
      id: row.id,
      type: (row.type ?? 'file') as EvidenceTypeValue,
      label: row.description ?? row.type ?? 'Evidence',
    }),
  );

  const goalEvidenceCount = goalEvidenceRows.length;

  const allStepsComplete =
    stepRows.length > 0 && stepRows.every((s) => s.status === StepStatus.completed);

  // Announce when all steps become complete
  useEffect(() => {
    if (!goal) return;
    if (allStepsComplete && !hasAnnouncedComplete.current) {
      hasAnnouncedComplete.current = true;
      AccessibilityInfo.announceForAccessibility(
        `All steps completed for "${goal.title}". Goal is ready to complete!`,
      );
    } else if (!allStepsComplete) {
      hasAnnouncedComplete.current = false;
    }
  }, [goal, allStepsComplete]);

  if (!goal) {
    return (
      <View style={styles.centered}>
        <Text variant="body">Goal not found.</Text>
      </View>
    );
  }

  // --- Event Handlers ---

  const handleIndexChange = (index: number) => {
    setCurrentCardIndex(index);
    if (isDrawerOpen) setIsDrawerOpen(false);
    if (isFABMenuOpen) setIsFABMenuOpen(false);
  };

  const handleToggleStep = (stepId: string) => {
    const step = stepRows.find((s) => s.id === stepId);
    if (!step) {
      console.warn(`[FocusModeScreen] handleToggleStep: step not found for id "${stepId}"`);
      return;
    }

    try {
      if (step.status === StepStatus.completed) {
        uncompleteStep(stepId as StepId);
        AccessibilityInfo.announceForAccessibility(`Step "${step.title}" marked as incomplete`);
      } else {
        completeStep(stepId as StepId);
        AccessibilityInfo.announceForAccessibility(`Step "${step.title}" completed`);
      }
    } catch (error) {
      console.error('[FocusModeScreen] Failed to toggle step completion', { stepId, error });
      Alert.alert('Could not update step', 'Something went wrong. Please try again.');
    }
  };

  const handleEvidenceTap = () => {
    setIsDrawerOpen(true);
  };

  const handleToggleDrawer = () => {
    setIsDrawerOpen((prev) => !prev);
  };

  const handleToggleFABMenu = () => {
    setIsFABMenuOpen((prev) => !prev);
  };

  const handleSelectEvidenceType = (type: EvidenceTypeValue) => {
    setIsFABMenuOpen(false);
    const routeName = EVIDENCE_ROUTE_MAP[type];
    if (!routeName) return;

    navigation.navigate(routeName, {
      goalId,
      stepId: isGoalCard ? undefined : stepRows[currentCardIndex]?.id,
    });
  };

  const handleDeleteEvidence = (id: string) => {
    const row = currentStepEvidenceRows.find((r) => r.id === id) ??
      goalEvidenceRows.find((r) => r.id === id);
    try {
      deleteEvidence(id as EvidenceId);
      if (row?.uri && row.type) {
        deleteEvidenceFile(row.uri, row.type);
      }
    } catch (error) {
      console.error('[FocusModeScreen] Failed to delete evidence', { evidenceId: id, error });
      Alert.alert('Could not delete evidence', 'Something went wrong. Please try again.');
    }
  };

  const handleTimelineTap = () => {
    // Timeline view not yet implemented — stub for future navigation
  };

  const handleEditPress = () => {
    // Edit mode not yet implemented — navigate back to GoalDetail for now
    navigation.navigate('GoalDetail', { goalId });
  };

  // --- Render ---

  return (
    <View style={styles.content}>
      {/* Header */}
      <View style={styles.headerRow}>
        <Text
          variant="title"
          style={styles.title}
          numberOfLines={2}
          accessible
          accessibilityRole="header"
        >
          {goal.title}
        </Text>
        <IconButton
          icon={<Text variant="body">&#9998;</Text>}
          onPress={handleEditPress}
          accessibilityLabel="Edit goal"
          size="sm"
        />
      </View>

      {/* MiniTimeline */}
      <MiniTimeline
        steps={timelineSteps}
        currentIndex={currentCardIndex}
        onStepTap={handleIndexChange}
        onTimelineTap={handleTimelineTap}
      />

      {/* CardCarousel with ProgressDots as indicator */}
      <CardCarousel
        currentIndex={currentCardIndex}
        onIndexChange={handleIndexChange}
        accessibilityLabel={`Focus mode cards, ${stepRows.length} steps`}
        renderIndicator={() => (
          <ProgressDots
            steps={dotSteps}
            currentIndex={currentCardIndex}
            onDotTap={handleIndexChange}
            showGoalDot
          />
        )}
      >
        {[
          ...stepsWithEvidence.map((step, index) => (
            <StepCard
              key={step.id}
              step={{
                id: step.id,
                title: step.title,
                status: step.status as StepCardStatus,
                evidenceCount: step.evidenceCount,
              }}
              stepIndex={index}
              totalSteps={stepRows.length}
              onToggleComplete={() => handleToggleStep(step.id)}
              onEvidenceTap={handleEvidenceTap}
            />
          )),
          <GoalEvidenceCard
            key="goal-evidence"
            evidenceCount={goalEvidenceCount}
            onEvidenceTap={handleEvidenceTap}
          />,
        ]}
      </CardCarousel>

      {/* EvidenceDrawer */}
      <EvidenceDrawer
        evidence={drawerEvidence}
        isGoal={isGoalCard}
        isOpen={isDrawerOpen}
        onToggle={handleToggleDrawer}
        onDeleteEvidence={handleDeleteEvidence}
      />

      {/* FAB + Menu */}
      <View style={styles.fabContainer}>
        <FABMenu
          isOpen={isFABMenuOpen}
          onSelectType={handleSelectEvidenceType}
        />
        <FAB isOpen={isFABMenuOpen} onToggle={handleToggleFABMenu} />
      </View>
    </View>
  );
}

/**
 * Hook to get evidence counts per step.
 * Uses individual queries per step (Evolu auto-caches these).
 */
function useStepEvidenceCounts(
  stepRows: readonly { id: string }[],
): number[] {
  // Query each step's evidence — Evolu deduplicates identical queries
  const counts: number[] = [];
  for (const step of stepRows) {
    // eslint-disable-next-line react-hooks/rules-of-hooks
    const rows = useQuery(evidenceByStepQuery(step.id as StepId));
    counts.push(rows.length);
  }
  return counts;
}

export function FocusModeScreen({ route }: FocusModeNavProps) {
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
        <Text variant="label">Focus Mode</Text>
        <View style={styles.spacer} />
      </View>
      <Suspense
        fallback={<ActivityIndicator style={styles.loadingIndicator} size="large" />}
      >
        <FocusContent goalId={route.params.goalId} />
      </Suspense>
    </SafeAreaView>
  );
}
