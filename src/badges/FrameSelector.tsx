import React, { useCallback } from 'react';
import { Pressable, ScrollView, Text, View } from 'react-native';
import { StyleSheet, useUnistyles } from 'react-native-unistyles';

import { BadgeFrame } from './types';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface FrameSelectorProps {
  selectedFrame: BadgeFrame;
  onSelectFrame: (frame: BadgeFrame) => void;
  accentColor?: string;
  testID?: string;
}

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

const FRAMES = Object.values(BadgeFrame) as BadgeFrame[];

const FRAME_LABELS: Record<BadgeFrame, string> = {
  none: 'None',
  boldBorder: 'Bold Border',
  guilloche: 'Guilloche',
  crossHatch: 'Cross Hatch',
  microprint: 'Microprint',
  rosette: 'Rosette',
};

/** Simple visual hint character per frame type */
const FRAME_GLYPHS: Record<BadgeFrame, string> = {
  none: '—',
  boldBorder: '▣',
  guilloche: '◎',
  crossHatch: '╳',
  microprint: '⋮',
  rosette: '✿',
};

const THUMBNAIL_SIZE = 56;

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export function FrameSelector({
  selectedFrame,
  onSelectFrame,
  accentColor,
  testID = 'frame-selector',
}: FrameSelectorProps) {
  const { theme } = useUnistyles();
  const resolvedAccent = accentColor ?? theme.colors.accentPrimary;

  const handlePress = useCallback(
    (frame: BadgeFrame) => onSelectFrame(frame),
    [onSelectFrame],
  );

  return (
    <View
      testID={testID}
      accessibilityRole="radiogroup"
      accessibilityLabel="Badge frame"
    >
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.row}
      >
        {FRAMES.map((frame) => {
          const isSelected = frame === selectedFrame;
          return (
            <Pressable
              key={frame}
              onPress={() => handlePress(frame)}
              accessibilityRole="radio"
              accessibilityLabel={`${FRAME_LABELS[frame]} frame`}
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
              <View
                style={[
                  styles.thumbnail,
                  { borderColor: theme.colors.border },
                ]}
              >
                <Text
                  style={[
                    styles.glyph,
                    { color: isSelected ? resolvedAccent : theme.colors.text },
                  ]}
                >
                  {FRAME_GLYPHS[frame]}
                </Text>
              </View>
              <Text
                style={[styles.label, { color: theme.colors.textSecondary }]}
                numberOfLines={1}
              >
                {FRAME_LABELS[frame]}
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
  thumbnail: {
    width: THUMBNAIL_SIZE,
    height: THUMBNAIL_SIZE,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderRadius: 0,
  },
  glyph: {
    fontSize: 24,
    fontWeight: '700',
  },
  label: {
    fontSize: 11,
    fontFamily: theme.fontFamily.body,
    fontWeight: '500',
  },
}));
