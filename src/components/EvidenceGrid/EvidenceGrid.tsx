import React from 'react';
import { View, Text } from 'react-native';
import { Button } from '../Button';
import { EvidenceThumbnail, type Evidence } from '../EvidenceThumbnail';
import { styles } from './EvidenceGrid.styles';

export interface EvidenceGridProps {
  evidences: Evidence[];
  onPress?: (evidence: Evidence) => void;
  onAdd?: () => void;
}

export function EvidenceGrid({ evidences, onPress, onAdd }: EvidenceGridProps) {
  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.headerLabel}>Evidence</Text>
      </View>
      <View style={styles.grid}>
        {evidences.map((evidence) => (
          <View key={evidence.id} style={styles.item}>
            <EvidenceThumbnail
              evidence={evidence}
              onPress={onPress ? () => onPress(evidence) : undefined}
            />
          </View>
        ))}
      </View>
      {onAdd && (
        <Button label="Add Evidence" variant="secondary" onPress={onAdd} />
      )}
    </View>
  );
}
