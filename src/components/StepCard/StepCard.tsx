import React from 'react';
import { View, Text, Pressable } from 'react-native';
import Animated from 'react-native-reanimated';
import { Card } from '../Card';
import { StatusBadge, type StatusBadgeVariant } from '../StatusBadge';
import { Checkbox } from '../Checkbox';
import { useFlashOnIncrease } from '../../hooks/useFlashOnIncrease';
import { formatEvidenceLabel } from '../../utils/formatEvidenceLabel';
import { styles } from './StepCard.styles';

export type StepCardStatus = 'completed' | 'in-progress' | 'pending';

export interface StepCardStep {
  id: string;
  title: string;
  status: StepCardStatus;
  evidenceCount: number;
}

export interface StepCardProps {
  step: StepCardStep;
  stepIndex: number;
  totalSteps: number;
  onToggleComplete: () => void;
  onEvidenceTap: () => void;
}

const statusToVariant: Record<StepCardStatus, StatusBadgeVariant> = {
  completed: 'completed',
  'in-progress': 'active',
  pending: 'locked',
};

const statusToLabel: Record<StepCardStatus, string> = {
  completed: 'Completed',
  'in-progress': 'In Progress',
  pending: 'Pending',
};

export function StepCard({
  step,
  stepIndex,
  totalSteps,
  onToggleComplete,
  onEvidenceTap,
}: StepCardProps) {
  const isCompleted = step.status === 'completed';
  const evidenceLabel = formatEvidenceLabel(step.evidenceCount);
  const flashStyle = useFlashOnIncrease(step.evidenceCount);

  return (
    <Card>
      <View style={styles.container}>
        <Text style={styles.stepNumber}>
          Step {stepIndex + 1} of {totalSteps}
        </Text>
        <Text
          style={styles.title}
          numberOfLines={2}
          accessible
          accessibilityRole="header"
        >
          {step.title}
        </Text>
        <View style={styles.statusRow}>
          <StatusBadge
            variant={statusToVariant[step.status]}
            label={statusToLabel[step.status]}
          />
          <View style={styles.evidenceBadgeWrapper}>
            <Pressable
              onPress={onEvidenceTap}
              style={styles.evidenceBadge}
              accessible
              accessibilityRole="button"
              accessibilityLabel={`${step.evidenceCount} evidence items, tap to view`}
            >
              <Text style={styles.evidenceText}>{evidenceLabel}</Text>
            </Pressable>
            <Animated.View
              style={[styles.evidenceFlash, flashStyle]}
              pointerEvents="none"
              accessibilityElementsHidden
              importantForAccessibility="no-hide-descendants"
            />
          </View>
        </View>
        <View style={styles.checkboxRow}>
          <Checkbox
            checked={isCompleted}
            onToggle={onToggleComplete}
            label={isCompleted ? 'Completed' : 'Mark complete'}
          />
        </View>
      </View>
    </Card>
  );
}
