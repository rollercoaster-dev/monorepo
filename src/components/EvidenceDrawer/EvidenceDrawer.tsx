import React from 'react';
import { View, Pressable, ScrollView, Text, useWindowDimensions } from 'react-native';
import { useUnistyles } from 'react-native-unistyles';
import type { EvidenceTypeValue } from '../../types/evidence';
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
  onViewEvidence?: (id: string) => void;
  onDeleteEvidence: (id: string) => void;
}

const PEEK_HEIGHT = 44;

export function EvidenceDrawer({
  evidence,
  isGoal = false,
  isOpen,
  onToggle,
  onViewEvidence,
  onDeleteEvidence,
}: EvidenceDrawerProps) {
  const { width: windowWidth, height: windowHeight } = useWindowDimensions();
  const { theme } = useUnistyles();
  const maxHeight = windowHeight * 0.6;
  const items = evidence ?? [];

  // Calculate equal-width tiles for 3-column grid
  const COLUMNS = 3;
  const horizontalPadding = theme.space[4] * 2;
  const totalGap = theme.space[2] * (COLUMNS - 1);
  const itemWidth = Math.floor((windowWidth - horizontalPadding - totalGap) / COLUMNS);

  const drawerLabel = isGoal
    ? `Goal evidence: ${items.length} item${items.length !== 1 ? 's' : ''}`
    : `${items.length} evidence item${items.length !== 1 ? 's' : ''}`;

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
            {items.length === 0 ? (
              <Text style={styles.emptyText}>
                No evidence yet — tap + to add
              </Text>
            ) : (
              items.map((item) => (
                <View key={item.id} style={styles.gridItem(itemWidth)}>
                  <EvidenceItem
                    id={item.id}
                    type={item.type}
                    label={item.label}
                    isGoal={isGoal}
                    onPress={onViewEvidence}
                    onLongPress={onDeleteEvidence}
                  />
                </View>
              ))
            )}
          </ScrollView>
        )}
      </View>
    </>
  );
}
