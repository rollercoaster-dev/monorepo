import React, { Suspense, useCallback, useEffect, useRef, useState } from 'react';
import { View, ScrollView, TextInput, ActivityIndicator, Alert, Pressable } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation, type NavigationProp } from '@react-navigation/native';
import { useQuery } from '@evolu/react';
import { useUnistyles } from 'react-native-unistyles';
import { Text } from '../../components/Text';
import { Button } from '../../components/Button';
import { IconButton } from '../../components/IconButton';
import {
  goalsQuery,
  updateGoal,
  stepsByGoalQuery,
  createStep,
  updateStep,
  deleteStep,
} from '../../db';
import type { GoalId, StepId } from '../../db';
import type { EditModeScreenProps, GoalsStackParamList } from '../../navigation/types';
import { styles } from './EditModeScreen.styles';

const DEBOUNCE_MS = 500;

function EditContent({ goalId, cameFromFocus }: { goalId: string; cameFromFocus: boolean }) {
  const navigation = useNavigation<NavigationProp<GoalsStackParamList>>();
  const { theme } = useUnistyles();
  const rows = useQuery(goalsQuery);
  const goal = rows.find((r) => r.id === goalId);
  const stepRows = useQuery(stepsByGoalQuery(goalId as GoalId));

  const [title, setTitle] = useState(goal?.title ?? '');
  const [description, setDescription] = useState(goal?.description ?? '');
  const [titleError, setTitleError] = useState('');
  const [newStepTitle, setNewStepTitle] = useState('');

  const titleTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const descTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    return () => {
      if (titleTimer.current) clearTimeout(titleTimer.current);
      if (descTimer.current) clearTimeout(descTimer.current);
    };
  }, []);

  const debouncedUpdateTitle = useCallback(
    (newTitle: string) => {
      if (titleTimer.current) clearTimeout(titleTimer.current);
      titleTimer.current = setTimeout(() => {
        const trimmed = newTitle.trim();
        if (!trimmed) {
          setTitleError('Title cannot be empty');
          return;
        }
        setTitleError('');
        try {
          updateGoal(goalId as GoalId, { title: trimmed });
        } catch (error) {
          console.error('[EditModeScreen] Failed to update title', { goalId, title: trimmed, error });
          setTitleError('Failed to update title');
        }
      }, DEBOUNCE_MS);
    },
    [goalId],
  );

  const debouncedUpdateDescription = useCallback(
    (newDesc: string) => {
      if (descTimer.current) clearTimeout(descTimer.current);
      descTimer.current = setTimeout(() => {
        try {
          const value = newDesc.trim() || null;
          updateGoal(goalId as GoalId, { description: value });
        } catch (error) {
          console.error('[EditModeScreen] Failed to update description', { goalId, error });
          Alert.alert('Error', 'Failed to update description.');
        }
      }, DEBOUNCE_MS);
    },
    [goalId],
  );

  if (!goal) {
    return (
      <View style={styles.centered}>
        <Text variant="body">Goal not found.</Text>
      </View>
    );
  }

  function handleTitleChange(text: string) {
    setTitle(text);
    debouncedUpdateTitle(text);
  }

  function handleDescriptionChange(text: string) {
    setDescription(text);
    debouncedUpdateDescription(text);
  }

  function handleUpdateStep(stepId: string, newTitle: string) {
    try {
      updateStep(stepId as StepId, { title: newTitle });
    } catch (error) {
      console.error('[EditModeScreen] Failed to update step', { stepId, newTitle, error });
      Alert.alert('Error', 'Could not update step.');
    }
  }

  function handleDeleteStep(stepId: string) {
    if (stepRows.length <= 1) return;
    try {
      deleteStep(stepId as StepId);
    } catch (error) {
      console.error('[EditModeScreen] Failed to delete step', { goalId, stepId, error });
      Alert.alert('Error', 'Could not delete step.');
    }
  }

  function handleAddStep() {
    const trimmed = newStepTitle.trim();
    if (!trimmed) return;
    const maxOrdinal = stepRows.reduce(
      (max, s) => Math.max(max, s.ordinal ?? -1),
      -1,
    );
    try {
      createStep(goalId as GoalId, trimmed, maxOrdinal + 1);
      setNewStepTitle('');
    } catch (error) {
      console.error('[EditModeScreen] Failed to create step', { goalId, stepTitle: trimmed, error });
      Alert.alert('Error', 'Could not create step.');
    }
  }

  function handleNavigate() {
    // FocusMode route will be added by issue #127 — navigate safely
    (navigation as { navigate: (name: string, params: object) => void })
      .navigate('FocusMode', { goalId });
  }

  const canDelete = stepRows.length > 1;

  return (
    <ScrollView contentContainerStyle={styles.scrollContent}>
      {/* Title */}
      <View style={styles.section}>
        <Text variant="label" style={styles.label}>Goal Title</Text>
        <TextInput
          style={[styles.titleInput, titleError ? styles.inputError : undefined]}
          value={title}
          onChangeText={handleTitleChange}
          placeholder="Goal title"
          placeholderTextColor={theme.colors.textMuted}
          accessibilityLabel="Goal title"
          accessibilityHint="Edit the goal title"
          returnKeyType="next"
        />
        {titleError ? (
          <Text variant="caption" style={styles.errorText}>{titleError}</Text>
        ) : null}
      </View>

      {/* Description */}
      <View style={styles.section}>
        <Text variant="label" style={styles.label}>Description</Text>
        <TextInput
          style={styles.descriptionInput}
          value={description}
          onChangeText={handleDescriptionChange}
          placeholder="Add a description..."
          placeholderTextColor={theme.colors.textMuted}
          multiline
          accessibilityLabel="Goal description"
          accessibilityHint="Edit the goal description"
        />
      </View>

      {/* Steps */}
      <View style={styles.section}>
        <View style={styles.stepListHeader}>
          <Text variant="body" style={styles.stepListTitle}>Steps</Text>
          <Text style={styles.stepCount}>
            {stepRows.length} step{stepRows.length !== 1 ? 's' : ''}
          </Text>
        </View>

        <View style={{ gap: 8 }}>
          {stepRows.map((step) => (
            <EditStepItem
              key={step.id}
              stepId={step.id}
              title={step.title ?? ''}
              canDelete={canDelete}
              onUpdate={handleUpdateStep}
              onDelete={handleDeleteStep}
            />
          ))}
        </View>

        {/* Add step row */}
        <View style={styles.addStepRow}>
          <TextInput
            style={styles.addStepInput}
            value={newStepTitle}
            onChangeText={setNewStepTitle}
            onSubmitEditing={handleAddStep}
            placeholder="Add a step..."
            placeholderTextColor={theme.colors.textMuted}
            returnKeyType="done"
            accessibilityLabel="Add a new step"
            accessibilityHint="Type a step title and press return to add"
          />
          <Pressable
            style={styles.addStepBtn}
            onPress={handleAddStep}
            accessibilityLabel="Add step"
            accessibilityRole="button"
          >
            <Text style={styles.addStepBtnText}>+</Text>
          </Pressable>
        </View>
      </View>

      {/* Navigate button */}
      <View style={styles.buttonSection}>
        <Button
          label={cameFromFocus ? 'Back to Focus' : 'Start Working'}
          onPress={handleNavigate}
        />
      </View>
    </ScrollView>
  );
}

/** Single step row: ≡ drag handle | editable title input | × delete */
function EditStepItem({
  stepId,
  title: initialTitle,
  canDelete,
  onUpdate,
  onDelete,
}: {
  stepId: string;
  title: string;
  canDelete: boolean;
  onUpdate: (id: string, title: string) => void;
  onDelete: (id: string) => void;
}) {
  const { theme } = useUnistyles();
  const [value, setValue] = useState(initialTitle);

  function handleBlur() {
    const trimmed = value.trim();
    if (trimmed && trimmed !== initialTitle) {
      onUpdate(stepId, trimmed);
    } else if (!trimmed) {
      setValue(initialTitle);
    }
  }

  return (
    <View style={styles.stepItem}>
      <Text style={styles.dragHandle} accessibilityLabel="Step position indicator">≡</Text>
      <TextInput
        style={styles.stepTitleInput}
        value={value}
        onChangeText={setValue}
        onBlur={handleBlur}
        onSubmitEditing={handleBlur}
        returnKeyType="done"
        placeholderTextColor={theme.colors.textMuted}
        accessibilityLabel={`Step title: ${initialTitle}`}
      />
      {canDelete && (
        <Pressable
          style={styles.deleteStepBtn}
          onPress={() => onDelete(stepId)}
          accessibilityLabel={`Delete step: ${initialTitle}`}
          accessibilityRole="button"
        >
          <Text style={styles.deleteStepText}>×</Text>
        </Pressable>
      )}
    </View>
  );
}

export function EditModeScreen({ route }: EditModeScreenProps) {
  const navigation = useNavigation();
  const { theme } = useUnistyles();
  const { goalId, cameFromFocus = false } = route.params;

  return (
    <SafeAreaView edges={['top']} style={{ flex: 1, backgroundColor: theme.colors.background }}>
      <View style={styles.topBar}>
        <IconButton
          icon={<Text variant="body" style={styles.backIcon}>{'<'}</Text>}
          onPress={() => navigation.goBack()}
          accessibilityLabel="Go back"
          size="sm"
        />
        <Text variant="label">Edit Goal</Text>
        <View style={styles.spacer} />
      </View>
      <Suspense
        fallback={
          <ActivityIndicator style={styles.loadingIndicator} size="large" />
        }
      >
        <EditContent goalId={goalId} cameFromFocus={cameFromFocus} />
      </Suspense>
    </SafeAreaView>
  );
}
