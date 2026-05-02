import React from "react";
import { View, Text, Pressable } from "react-native";
import { TimelineNode } from "../TimelineNode";
import type { EvidenceItemData } from "../EvidenceDrawer";
import { EVIDENCE_TYPE_ICONS } from "../../constants/evidenceIcons";
import { styles } from "./FinishLine.styles";

export interface FinishLineProps {
  goalEvidence: EvidenceItemData[];
  onEvidencePress?: (evidenceId: string) => void;
}

export function FinishLine({ goalEvidence, onEvidencePress }: FinishLineProps) {
  return (
    <View style={styles.container}>
      <View style={styles.nodeColumn}>
        <TimelineNode
          status="completed"
          isGoalNode
          accessibilityLabel="Goal finish line"
        />
      </View>
      <View style={styles.contentCard}>
        <Text style={styles.heading} accessible accessibilityRole="header">
          Goal Evidence
        </Text>
        {goalEvidence.length > 0 ? (
          goalEvidence.map((ev) => (
            <Pressable
              key={ev.id}
              style={styles.evidenceCard}
              onPress={
                onEvidencePress ? () => onEvidencePress(ev.id) : undefined
              }
              disabled={!onEvidencePress}
              accessible
              accessibilityRole={onEvidencePress ? "button" : undefined}
              accessibilityLabel={`${ev.type} evidence: ${ev.label}`}
              accessibilityHint={
                onEvidencePress ? "Tap to view evidence" : undefined
              }
            >
              <Text style={styles.evidenceIcon}>
                {EVIDENCE_TYPE_ICONS[ev.type] ?? "\u{1F4C4}"}
              </Text>
              <Text style={styles.evidenceLabel} numberOfLines={1}>
                {ev.label}
              </Text>
            </Pressable>
          ))
        ) : (
          <Text style={styles.noEvidence}>No goal evidence yet</Text>
        )}
      </View>
    </View>
  );
}
