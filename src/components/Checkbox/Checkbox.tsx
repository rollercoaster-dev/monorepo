import React from 'react';
import { Pressable, View, Text } from 'react-native';
import { styles } from './Checkbox.styles';

export interface CheckboxProps {
  checked: boolean;
  onToggle: () => void;
  label: string;
  onLabelPress?: () => void;
}

export function Checkbox({ checked, onToggle, label, onLabelPress }: CheckboxProps) {
  return (
    <View style={styles.container}>
      <Pressable
        onPress={onToggle}
        hitSlop={10}
        accessible
        accessibilityRole="checkbox"
        accessibilityLabel={label}
        accessibilityState={{ checked }}
      >
        <View style={[styles.box, checked && styles.boxChecked]}>
          {checked && <Text style={styles.checkmark}>✓</Text>}
        </View>
      </Pressable>
      <Pressable
        onPress={onLabelPress ?? onToggle}
        style={styles.labelContainer}
        accessibilityLabel={onLabelPress ? `Edit ${label}` : label}
        accessibilityHint={onLabelPress ? 'Tap to edit step title' : undefined}
      >
        <Text style={[styles.label, checked && styles.labelChecked]}>
          {label}
        </Text>
      </Pressable>
    </View>
  );
}
