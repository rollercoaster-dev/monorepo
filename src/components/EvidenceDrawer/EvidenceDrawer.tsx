import React from 'react';
import { View, Pressable, ScrollView, Text, useWindowDimensions } from 'react-native';
import type { EvidenceTypeValue } from '../../screens/EvidenceActionSheet';
import { EvidenceItem } from '../EvidenceItem';
import { styles } from './EvidenceDrawer.styles';

export interface EvidenceItemData {
  id: string;
  type: EvidenceTypeValue;
  label: string;
}

export interface EvidenceDrawerProps {
  evidence: EvidenceItemData[];
  isGoal?: boolean;
  isOpen: boolean;
  onToggle: () => void;
  onDeleteEvidence: (id: string) => void;
}

const PEEK_HEIGHT = 44;

export function EvidenceDrawer({
  evidence,
  isGoal = false,
  isOpen,
  onToggle,
  onDeleteEvidence,
}: EvidenceDrawerProps) {
  const { height: windowHeight } = useWindowDimensions();
  const maxHeight = windowHeight * 0.6;

  const drawerLabel = isGoal
    ? `Goal evidence: ${evidence.length} item${evidence.length !== 1 ? 's' : ''}`
    : `${evidence.length} evidence item${evidence.length !== 1 ? 's' : ''}`;

  return (
    <>
      {/* Overlay */}
      {isOpen && (
        <Pressable
          onPress={onToggle}
          style={styles.overlay}
          accessible
          accessibilityRole="button"
          accessibilityLabel="Close evidence drawer"
        />
      )}

      {/* Drawer */}
      <View
        style={[
          styles.drawer(isGoal),
          isOpen
            ? { height: maxHeight }
            : { height: PEEK_HEIGHT },
        ]}
        accessible
        accessibilityRole="summary"
        accessibilityLabel={isGoal ? 'Goal evidence drawer' : 'Evidence drawer'}
      >
        {/* Handle bar */}
        <Pressable
          onPress={onToggle}
          style={styles.handleArea}
          accessible
          accessibilityRole="button"
          accessibilityLabel="Toggle evidence drawer"
        >
          <View style={styles.handleBar(isGoal)} />
          <Text style={styles.handleLabel}>{drawerLabel}</Text>
        </Pressable>

        {/* Content */}
        {isOpen && (
          <ScrollView
            style={styles.scrollView}
            contentContainerStyle={styles.grid}
          >
            {evidence.length === 0 ? (
              <Text style={styles.emptyText}>
                No evidence yet — tap + to add
              </Text>
            ) : (
              evidence.map((item) => (
                <EvidenceItem
                  key={item.id}
                  id={item.id}
                  type={item.type}
                  label={item.label}
                  isGoal={isGoal}
                  onLongPress={onDeleteEvidence}
                />
              ))
            )}
          </ScrollView>
        )}
      </View>
    </>
  );
}
