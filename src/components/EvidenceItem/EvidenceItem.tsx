import React from 'react';
import { Pressable, Text } from 'react-native';
import type { EvidenceTypeValue } from '../../screens/EvidenceActionSheet';
import { styles } from './EvidenceItem.styles';

/** Map evidence types to display icons */
const EVIDENCE_TYPE_ICONS: Record<EvidenceTypeValue, string> = {
  photo: '\u{1F4F7}',
  screenshot: '\u{1F4F8}',
  video: '\u{1F3AC}',
  text: '\u{1F4DD}',
  voice_memo: '\u{1F3A4}',
  link: '\u{1F517}',
  file: '\u{1F4CE}',
};

export interface EvidenceItemProps {
  id: string;
  type: EvidenceTypeValue;
  label: string;
  isGoal?: boolean;
  onLongPress: (id: string) => void;
}

const MAX_LABEL_LENGTH = 20;

function truncateLabel(label: string): string {
  if (label.length <= MAX_LABEL_LENGTH) return label;
  return label.slice(0, MAX_LABEL_LENGTH) + '\u2026';
}

export function EvidenceItem({
  id,
  type,
  label,
  isGoal = false,
  onLongPress,
}: EvidenceItemProps) {
  const icon = EVIDENCE_TYPE_ICONS[type];
  const truncated = truncateLabel(label);

  return (
    <Pressable
      onLongPress={() => onLongPress(id)}
      delayLongPress={600}
      accessible
      accessibilityRole="button"
      accessibilityLabel={`${type} evidence: ${truncated}`}
      accessibilityHint="Long press to delete"
      style={({ pressed }) => [
        styles.container(isGoal),
        pressed && styles.pressed,
      ]}
    >
      <Text style={styles.icon} accessibilityElementsHidden>
        {icon}
      </Text>
      <Text style={styles.label} numberOfLines={1}>
        {truncated}
      </Text>
    </Pressable>
  );
}
