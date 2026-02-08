import React, { useRef, useState } from 'react';
import { View, Text, TextInput, Pressable } from 'react-native';
import { useUnistyles } from 'react-native-unistyles';
import { Checkbox } from '../Checkbox';
import { styles } from './StepList.styles';

export interface Step {
  id: string;
  title: string;
  completed: boolean;
}

export interface StepListProps {
  steps: Step[];
  onToggleStep: (id: string) => void;
  onCreateStep?: (title: string) => void;
  onUpdateStep?: (id: string, title: string) => void;
  onDeleteStep?: (id: string) => void;
}

export function StepList({
  steps,
  onToggleStep,
  onCreateStep,
  onUpdateStep,
  onDeleteStep,
}: StepListProps) {
  const { theme } = useUnistyles();
  const completedCount = steps.filter((s) => s.completed).length;

  const [editingId, setEditingId] = useState<string | null>(null);
  const [editText, setEditText] = useState('');
  const [newStepTitle, setNewStepTitle] = useState('');
  const newStepInputRef = useRef<TextInput>(null);

  function startEditing(step: Step) {
    if (!onUpdateStep) return;
    setEditingId(step.id);
    setEditText(step.title);
  }

  function commitEdit() {
    if (editingId && onUpdateStep) {
      const trimmed = editText.trim();
      if (trimmed && trimmed !== steps.find((s) => s.id === editingId)?.title) {
        onUpdateStep(editingId, trimmed);
      }
    }
    setEditingId(null);
    setEditText('');
  }

  function handleNewStepSubmit() {
    const trimmed = newStepTitle.trim();
    if (trimmed && onCreateStep) {
      onCreateStep(trimmed);
      setNewStepTitle('');
    }
  }

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.headerLabel} accessibilityRole="header">Steps</Text>
        <Text
          style={styles.count}
          accessibilityLabel={`${completedCount} of ${steps.length} steps completed`}
        >
          {completedCount}/{steps.length}
        </Text>
      </View>

      {steps.map((step) => (
        <Pressable
          key={step.id}
          onLongPress={onDeleteStep ? () => onDeleteStep(step.id) : undefined}
          accessibilityHint={onDeleteStep ? 'Long press to delete' : undefined}
        >
          {editingId === step.id ? (
            <View style={styles.editRow}>
              <View style={[styles.editBox, step.completed && styles.editBoxChecked]}>
                {step.completed && <Text style={styles.editCheckmark}>✓</Text>}
              </View>
              <TextInput
                style={styles.editInput}
                value={editText}
                onChangeText={setEditText}
                onSubmitEditing={commitEdit}
                onBlur={commitEdit}
                autoFocus
                returnKeyType="done"
                placeholderTextColor={theme.colors.textMuted}
                selectTextOnFocus
              />
            </View>
          ) : (
            <Checkbox
              checked={step.completed}
              onToggle={() => onToggleStep(step.id)}
              label={step.title}
              onLabelPress={onUpdateStep ? () => startEditing(step) : undefined}
            />
          )}
        </Pressable>
      ))}

      {onCreateStep && (
        <View style={styles.addStepRow}>
          <Text style={styles.addStepPlus} accessibilityElementsHidden importantForAccessibility="no">+</Text>
          <TextInput
            ref={newStepInputRef}
            style={styles.addStepInput}
            placeholder="Add step..."
            placeholderTextColor={theme.colors.textMuted}
            value={newStepTitle}
            onChangeText={setNewStepTitle}
            onSubmitEditing={handleNewStepSubmit}
            returnKeyType="done"
            blurOnSubmit={false}
            accessibilityLabel="Add a new step"
            accessibilityHint="Type a step title and press return to add"
          />
        </View>
      )}
    </View>
  );
}
