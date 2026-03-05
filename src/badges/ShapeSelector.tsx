import React, { useCallback } from 'react';
import { Pressable, ScrollView, Text, View } from 'react-native';
import { StyleSheet, useUnistyles } from 'react-native-unistyles';

import { BadgeShapeView } from './shapes/BadgeShapeView';
import { BadgeShape } from './types';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface ShapeSelectorProps {
  selectedShape: BadgeShape;
  onSelectShape: (shape: BadgeShape) => void;
  accentColor?: string;
  testID?: string;
}

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

const SHAPES = Object.values(BadgeShape) as BadgeShape[];

const SHAPE_LABELS: Record<BadgeShape, string> = {
  circle: 'Circle',
  shield: 'Shield',
  hexagon: 'Hexagon',
  roundedRect: 'Rounded Rect',
  star: 'Star',
  diamond: 'Diamond',
};

const THUMBNAIL_SIZE = 56;

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export function ShapeSelector({
  selectedShape,
  onSelectShape,
  accentColor,
  testID = 'shape-selector',
}: ShapeSelectorProps) {
  const { theme } = useUnistyles();
  const resolvedAccent = accentColor ?? theme.colors.accentPrimary;

  const handlePress = useCallback(
    (shape: BadgeShape) => onSelectShape(shape),
    [onSelectShape],
  );

  return (
    <View
      testID={testID}
      accessibilityRole="radiogroup"
      accessibilityLabel="Badge shape"
    >
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.row}
      >
        {SHAPES.map((shape) => {
          const isSelected = shape === selectedShape;
          return (
            <Pressable
              key={shape}
              onPress={() => handlePress(shape)}
              accessibilityRole="radio"
              accessibilityLabel={`${SHAPE_LABELS[shape]} shape`}
              accessibilityState={{ checked: isSelected }}
              style={[
                styles.cell,
                {
                  borderColor: isSelected
                    ? resolvedAccent
                    : theme.colors.border,
                  borderWidth: isSelected ? 4 : 3,
                },
              ]}
            >
              <BadgeShapeView
                shape={shape}
                fillColor={resolvedAccent}
                size={THUMBNAIL_SIZE}
                strokeWidth={2}
                showShadow={false}
              />
              <Text
                style={[styles.label, { color: theme.colors.textSecondary }]}
                numberOfLines={1}
              >
                {SHAPE_LABELS[shape]}
              </Text>
            </Pressable>
          );
        })}
      </ScrollView>
    </View>
  );
}

// ---------------------------------------------------------------------------
// Styles
// ---------------------------------------------------------------------------

const styles = StyleSheet.create((theme) => ({
  row: {
    gap: theme.space[3],
    paddingHorizontal: theme.space[4],
    paddingVertical: theme.space[2],
  },
  cell: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: theme.space[2],
    paddingVertical: theme.space[2],
    minWidth: 72,
    height: 88,
    borderRadius: 0,
    gap: theme.space[1],
  },
  label: {
    fontSize: 11,
    fontFamily: theme.fontFamily.body,
    fontWeight: '500',
  },
}));
