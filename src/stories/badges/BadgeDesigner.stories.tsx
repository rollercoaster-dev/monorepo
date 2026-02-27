import type { Meta, StoryObj } from '@storybook/react';
import React, { useState } from 'react';
import { ScrollView, View } from 'react-native';
import { StyleSheet } from 'react-native-unistyles';

import { BadgeRenderer } from '../../badges/BadgeRenderer';
import { ShapeSelector } from '../../badges/ShapeSelector';
import { ColorPicker } from '../../badges/ColorPicker';
import { IconPicker } from '../../badges/IconPicker';
import {
  BadgeShape,
  BadgeFrame,
  BadgeIconWeight,
  createDefaultBadgeDesign,
} from '../../badges/types';
import type { BadgeDesign } from '../../badges/types';

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function makeDesign(overrides: Partial<BadgeDesign> = {}): BadgeDesign {
  return {
    ...createDefaultBadgeDesign('Sample Badge'),
    ...overrides,
  };
}

// ---------------------------------------------------------------------------
// Interactive composer (renders all sub-components wired together)
// ---------------------------------------------------------------------------

function BadgeDesignerComposer({ initialDesign, goalColor }: {
  initialDesign: BadgeDesign;
  goalColor?: string;
}) {
  const [design, setDesign] = useState(initialDesign);

  return (
    <View style={styles.container}>
      <ScrollView contentContainerStyle={styles.scrollContent}>
        <View style={styles.previewContainer}>
          <BadgeRenderer design={design} size={160} />
        </View>

        <ShapeSelector
          selectedShape={design.shape}
          onSelectShape={(shape) => setDesign((prev) => ({ ...prev, shape }))}
          accentColor={design.color}
        />

        <ColorPicker
          selectedColor={design.color}
          onSelectColor={(color) => setDesign((prev) => ({ ...prev, color }))}
          goalColor={goalColor}
        />
      </ScrollView>

      <View style={styles.iconPickerContainer}>
        <IconPicker
          selectedIcon={design.iconName}
          selectedWeight={design.iconWeight}
          onSelectIcon={(iconName) => setDesign((prev) => ({ ...prev, iconName }))}
          onSelectWeight={(iconWeight) =>
            setDesign((prev) => ({ ...prev, iconWeight }))
          }
          accentColor={design.color}
        />
      </View>
    </View>
  );
}

// ---------------------------------------------------------------------------
// Meta
// ---------------------------------------------------------------------------

const meta: Meta = {
  title: 'Badges/BadgeDesigner',
};

export default meta;
type Story = StoryObj;

// ---------------------------------------------------------------------------
// Stories
// ---------------------------------------------------------------------------

export const Interactive: Story = {
  render: () => <BadgeDesignerComposer initialDesign={makeDesign()} />,
};

export const DefaultDesign: Story = {
  render: () => (
    <BadgeDesignerComposer
      initialDesign={makeDesign({
        shape: BadgeShape.circle,
        color: '#a78bfa',
        iconName: 'Trophy',
        iconWeight: BadgeIconWeight.regular,
      })}
    />
  ),
};

export const WithGoalColor: Story = {
  render: () => (
    <BadgeDesignerComposer
      initialDesign={makeDesign({
        shape: BadgeShape.hexagon,
        color: '#06b6d4',
        iconName: 'Code',
        iconWeight: BadgeIconWeight.bold,
      })}
      goalColor="#06b6d4"
    />
  ),
};

export const AllShapes: Story = {
  render: () => (
    <BadgeDesignerComposer
      initialDesign={makeDesign({
        shape: BadgeShape.star,
        frame: BadgeFrame.none,
        color: '#f97316',
        iconName: 'Fire',
        iconWeight: BadgeIconWeight.fill,
      })}
    />
  ),
};

// ---------------------------------------------------------------------------
// Styles
// ---------------------------------------------------------------------------

const styles = StyleSheet.create((theme) => ({
  container: {
    flex: 1,
  },
  scrollContent: {
    padding: theme.space[4],
    gap: theme.space[4],
    alignItems: 'center',
  },
  previewContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    padding: theme.space[4],
    borderRadius: theme.radius.sm,
    borderWidth: theme.borderWidth.medium,
    borderColor: theme.colors.border,
    backgroundColor: theme.colors.backgroundSecondary,
  },
  iconPickerContainer: {
    flex: 1,
    paddingHorizontal: theme.space[4],
  },
}));
