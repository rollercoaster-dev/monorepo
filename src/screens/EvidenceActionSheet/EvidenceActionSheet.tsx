import React from 'react';
import { View, Modal, Pressable } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Text } from '../../components/Text';
import { Card } from '../../components/Card';
import { Button } from '../../components/Button';
import { EvidenceType } from '../../db';
import { styles } from './EvidenceActionSheet.styles';

export type EvidenceTypeValue = (typeof EvidenceType)[keyof typeof EvidenceType];

export interface EvidenceActionSheetProps {
  visible: boolean;
  onClose: () => void;
  onSelectType: (type: EvidenceTypeValue) => void;
}

export const EVIDENCE_OPTIONS: {
  type: EvidenceTypeValue;
  label: string;
  icon: string;
}[] = [
  { type: EvidenceType.photo, label: 'Take Photo', icon: '\u{1F4F7}' },
  { type: EvidenceType.voice_memo, label: 'Record Voice Memo', icon: '\u{1F3A4}' },
  { type: EvidenceType.text, label: 'Write a Note', icon: '\u{1F4DD}' },
  { type: EvidenceType.link, label: 'Add Link', icon: '\u{1F517}' },
  { type: EvidenceType.file, label: 'Attach File', icon: '\u{1F4CE}' },
];

export function EvidenceActionSheet({
  visible,
  onClose,
  onSelectType,
}: EvidenceActionSheetProps) {
  return (
    <Modal
      visible={visible}
      transparent
      animationType="slide"
      onRequestClose={onClose}
      accessibilityViewIsModal
    >
      <View style={styles.overlay}>
        <Pressable
          style={styles.backdrop}
          onPress={onClose}
          accessible
          accessibilityRole="button"
          accessibilityLabel="Close evidence options"
        />
        <SafeAreaView edges={['bottom']} style={styles.container}>
          <Card>
            <Text
              variant="headline"
              style={styles.title}
              accessibilityRole="header"
            >
              Add Evidence
            </Text>

            {EVIDENCE_OPTIONS.map((option) => (
              <Pressable
                key={option.type}
                onPress={() => onSelectType(option.type)}
                accessible
                accessibilityRole="button"
                accessibilityLabel={option.label}
                style={({ pressed }) => [
                  styles.option,
                  pressed && styles.optionPressed,
                ]}
              >
                <Text style={styles.optionIcon} accessibilityElementsHidden>{option.icon}</Text>
                <Text variant="body">{option.label}</Text>
              </Pressable>
            ))}

            <View style={styles.cancelContainer}>
              <Button
                label="Cancel"
                variant="secondary"
                onPress={onClose}
              />
            </View>
          </Card>
        </SafeAreaView>
      </View>
    </Modal>
  );
}
