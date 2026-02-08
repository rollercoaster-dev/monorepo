import React from 'react';
import { Pressable, View, Text } from 'react-native';
import { styles } from './EvidenceThumbnail.styles';

export type EvidenceType = 'photo' | 'voice' | 'text' | 'link' | 'file';

export interface Evidence {
  id: string;
  title: string;
  type: EvidenceType;
}

export interface EvidenceThumbnailProps {
  evidence: Evidence;
  onPress?: () => void;
}

const typeIcons: Record<EvidenceType, string> = {
  photo: '📷',
  voice: '🎤',
  text: '📝',
  link: '🔗',
  file: '📄',
};

export function EvidenceThumbnail({ evidence, onPress }: EvidenceThumbnailProps) {
  return (
    <Pressable
      onPress={onPress}
      disabled={!onPress}
      accessible
      accessibilityRole={onPress ? 'button' : undefined}
      accessibilityLabel={`${evidence.type} evidence: ${evidence.title}`}
      style={({ pressed }) => [pressed && onPress && styles.pressed]}
    >
      <View style={styles.container}>
        <View style={styles.preview}>
          <Text style={styles.previewIcon}>{typeIcons[evidence.type]}</Text>
        </View>
        <View style={styles.info}>
          <Text style={styles.title} numberOfLines={1}>{evidence.title}</Text>
          <Text style={styles.type}>{evidence.type}</Text>
        </View>
      </View>
    </Pressable>
  );
}
