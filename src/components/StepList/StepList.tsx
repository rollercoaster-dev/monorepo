import React from 'react';
import { View, Text } from 'react-native';
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
}

export function StepList({ steps, onToggleStep }: StepListProps) {
  const completedCount = steps.filter((s) => s.completed).length;

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.headerLabel}>Steps</Text>
        <Text style={styles.count}>
          {completedCount}/{steps.length}
        </Text>
      </View>
      {steps.map((step) => (
        <Checkbox
          key={step.id}
          checked={step.completed}
          onToggle={() => onToggleStep(step.id)}
          label={step.title}
        />
      ))}
    </View>
  );
}
