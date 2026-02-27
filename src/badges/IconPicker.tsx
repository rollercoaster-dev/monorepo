/**
 * Icon picker for badge design
 *
 * Provides keyword search, category browsing, weight selection, and
 * a grid of Phosphor icons. Selected icon is highlighted with a
 * neo-brutalist accent border.
 *
 * All icons are curated badge-relevant icons from the Phosphor set.
 * Search is instant and local (no network calls).
 */

import React, { useCallback, useMemo, useState } from 'react';
import {
  FlatList,
  Pressable,
  Text,
  TextInput,
  View,
  type ListRenderItemInfo,
} from 'react-native';
import { StyleSheet, useUnistyles } from 'react-native-unistyles';
import type { IconWeight } from 'phosphor-react-native';

import { getIconComponent } from './iconRegistry';
import {
  searchIcons,
  getIconsByCategory,
  iconNameToLabel,
  CATEGORY_ORDER,
  CATEGORY_LABELS,
  type IconCategory,
} from './iconIndex';
import type { BadgeIconWeight } from './types';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface IconPickerProps {
  /** Currently selected icon name (PascalCase Phosphor name) */
  selectedIcon: string;
  /** Currently selected icon weight */
  selectedWeight: BadgeIconWeight;
  /** Callback when the user selects an icon */
  onSelectIcon: (iconName: string) => void;
  /** Callback when the user changes the icon weight */
  onSelectWeight: (weight: BadgeIconWeight) => void;
  /** Optional accent color for selected state (hex). Falls back to theme accent. */
  accentColor?: string;
  /** Test ID prefix for testing */
  testID?: string;
}

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

const ICON_SIZE = 28;
const GRID_COLUMNS = 5;
const WEIGHTS: { value: BadgeIconWeight; label: string }[] = [
  { value: 'thin', label: 'Thin' },
  { value: 'light', label: 'Light' },
  { value: 'regular', label: 'Regular' },
  { value: 'bold', label: 'Bold' },
  { value: 'fill', label: 'Fill' },
  { value: 'duotone', label: 'Duotone' },
];

// ---------------------------------------------------------------------------
// Sub-components
// ---------------------------------------------------------------------------

interface IconCellProps {
  name: string;
  weight: IconWeight;
  isSelected: boolean;
  accentColor: string;
  onPress: (name: string) => void;
  iconColor: string;
  selectedIconColor: string;
  borderColor: string;
}

const IconCell = React.memo(function IconCell({
  name,
  weight,
  isSelected,
  accentColor,
  onPress,
  iconColor,
  selectedIconColor,
  borderColor,
}: IconCellProps) {
  const IconComponent = getIconComponent(name);
  if (!IconComponent) return null;

  const label = iconNameToLabel(name);

  return (
    <Pressable
      onPress={() => onPress(name)}
      accessibilityRole="button"
      accessibilityLabel={`${label} icon${isSelected ? ', selected' : ''}`}
      accessibilityState={{ selected: isSelected }}
      style={[
        styles.iconCell,
        { borderColor: isSelected ? borderColor : 'transparent' },
        isSelected && { backgroundColor: accentColor },
      ]}
    >
      <IconComponent
        size={ICON_SIZE}
        weight={weight}
        color={isSelected ? selectedIconColor : iconColor}
      />
    </Pressable>
  );
});

// ---------------------------------------------------------------------------
// Main component
// ---------------------------------------------------------------------------

export function IconPicker({
  selectedIcon,
  selectedWeight,
  onSelectIcon,
  onSelectWeight,
  accentColor,
  testID = 'icon-picker',
}: IconPickerProps) {
  const { theme } = useUnistyles();
  const [query, setQuery] = useState('');
  const [activeCategory, setActiveCategory] = useState<IconCategory | null>(null);

  // Resolve colors from theme
  const resolvedAccent = accentColor ?? theme.colors.accentPrimary;
  const iconColor = theme.colors.text;
  const selectedIconColor = theme.colors.background;
  const borderColor = theme.colors.border;

  // Compute visible icons
  const visibleIcons = useMemo(() => {
    if (query.trim()) {
      return searchIcons(query);
    }
    if (activeCategory) {
      return getIconsByCategory(activeCategory);
    }
    return searchIcons(''); // returns popular icons
  }, [query, activeCategory]);

  const handleCategoryPress = useCallback(
    (category: IconCategory) => {
      setQuery('');
      setActiveCategory((prev) => (prev === category ? null : category));
    },
    [],
  );

  const handleSearchChange = useCallback((text: string) => {
    setQuery(text);
    if (text.trim()) {
      setActiveCategory(null);
    }
  }, []);

  const renderCategory = useCallback(
    ({ item: category }: ListRenderItemInfo<IconCategory>) => {
      const isActive = activeCategory === category && !query.trim();
      return (
        <Pressable
          onPress={() => handleCategoryPress(category)}
          accessibilityRole="button"
          accessibilityLabel={`${CATEGORY_LABELS[category]} category${isActive ? ', active' : ''}`}
          accessibilityState={{ selected: isActive }}
          style={[
            styles.categoryChip,
            {
              backgroundColor: isActive
                ? resolvedAccent
                : theme.colors.backgroundSecondary,
              borderColor: theme.colors.border,
            },
          ]}
        >
          <Text
            style={[
              styles.categoryLabel,
              {
                color: isActive
                  ? selectedIconColor
                  : theme.colors.text,
              },
            ]}
          >
            {CATEGORY_LABELS[category]}
          </Text>
        </Pressable>
      );
    },
    [activeCategory, query, handleCategoryPress, resolvedAccent, selectedIconColor, theme],
  );

  const renderIcon = useCallback(
    ({ item }: ListRenderItemInfo<string>) => (
      <IconCell
        name={item}
        weight={selectedWeight as IconWeight}
        isSelected={item === selectedIcon}
        accentColor={resolvedAccent}
        onPress={onSelectIcon}
        iconColor={iconColor}
        selectedIconColor={selectedIconColor}
        borderColor={borderColor}
      />
    ),
    [
      selectedWeight,
      selectedIcon,
      resolvedAccent,
      onSelectIcon,
      iconColor,
      selectedIconColor,
      borderColor,
    ],
  );

  const keyExtractor = useCallback((item: string) => item, []);

  return (
    <View testID={testID} style={styles.container}>
      {/* Search input */}
      <TextInput
        testID={`${testID}-search`}
        accessibilityRole="search"
        accessibilityLabel="Search icons"
        placeholder="Search icons..."
        placeholderTextColor={theme.colors.textSecondary}
        value={query}
        onChangeText={handleSearchChange}
        style={[
          styles.searchInput,
          {
            color: theme.colors.text,
            backgroundColor: theme.colors.backgroundSecondary,
            borderColor: theme.colors.border,
          },
        ]}
        autoCapitalize="none"
        autoCorrect={false}
        returnKeyType="search"
      />

      {/* Weight selector */}
      <View
        style={styles.weightRow}
        accessibilityRole="radiogroup"
        accessibilityLabel="Icon weight"
      >
        {WEIGHTS.map((w) => {
          const isActive = w.value === selectedWeight;
          return (
            <Pressable
              key={w.value}
              onPress={() => onSelectWeight(w.value)}
              accessibilityRole="radio"
              accessibilityLabel={`${w.label} weight`}
              accessibilityState={{ checked: isActive }}
              style={[
                styles.weightChip,
                {
                  backgroundColor: isActive
                    ? resolvedAccent
                    : theme.colors.backgroundSecondary,
                  borderColor: theme.colors.border,
                },
              ]}
            >
              <Text
                style={[
                  styles.weightLabel,
                  {
                    color: isActive
                      ? selectedIconColor
                      : theme.colors.text,
                  },
                ]}
              >
                {w.label}
              </Text>
            </Pressable>
          );
        })}
      </View>

      {/* Category chips */}
      <FlatList
        horizontal
        showsHorizontalScrollIndicator={false}
        data={CATEGORY_ORDER}
        keyExtractor={(item) => item}
        style={styles.categoryRow}
        contentContainerStyle={styles.categoryContent}
        renderItem={renderCategory}
      />

      {/* Icon grid */}
      <FlatList
        data={visibleIcons}
        keyExtractor={keyExtractor}
        renderItem={renderIcon}
        numColumns={GRID_COLUMNS}
        contentContainerStyle={styles.gridContent}
        style={styles.grid}
        initialNumToRender={20}
        maxToRenderPerBatch={30}
        windowSize={5}
        getItemLayout={(_data, index) => ({
          length: ROW_HEIGHT,
          offset: ROW_HEIGHT * Math.floor(index / GRID_COLUMNS),
          index,
        })}
        ListEmptyComponent={
          <View style={styles.emptyContainer}>
            <Text
              style={[styles.emptyText, { color: theme.colors.textSecondary }]}
            >
              No icons found
            </Text>
          </View>
        }
      />
    </View>
  );
}

// ---------------------------------------------------------------------------
// Styles
// ---------------------------------------------------------------------------

/** Cell size includes padding for 44x44pt touch target */
const CELL_SIZE = 52;
/** Effective row height = CELL_SIZE + vertical margin (2px top + 2px bottom) */
const ROW_HEIGHT = CELL_SIZE + 4;

const styles = StyleSheet.create((theme) => ({
  container: {
    flex: 1,
  },
  searchInput: {
    height: 44,
    borderWidth: 2,
    borderRadius: 8,
    paddingHorizontal: 12,
    fontSize: 16,
    fontFamily: theme.fontFamily.body,
    marginBottom: 8,
  },
  weightRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
    marginBottom: 8,
  },
  weightChip: {
    minHeight: 44,
    minWidth: 44,
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderWidth: 2,
    borderRadius: 0,
    justifyContent: 'center',
    alignItems: 'center',
  },
  weightLabel: {
    fontSize: 12,
    fontFamily: theme.fontFamily.body,
    fontWeight: '600',
  },
  categoryRow: {
    maxHeight: 40,
    marginBottom: 8,
  },
  categoryContent: {
    gap: 6,
    paddingRight: 8,
  },
  categoryChip: {
    minHeight: 32,
    paddingHorizontal: 12,
    paddingVertical: 4,
    borderWidth: 2,
    borderRadius: 0,
    justifyContent: 'center',
    alignItems: 'center',
  },
  categoryLabel: {
    fontSize: 13,
    fontFamily: theme.fontFamily.body,
    fontWeight: '500',
  },
  grid: {
    flex: 1,
  },
  gridContent: {
    paddingVertical: 4,
  },
  iconCell: {
    width: CELL_SIZE,
    height: CELL_SIZE,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 3,
    borderRadius: 0,
    margin: 2,
  },
  emptyContainer: {
    padding: 24,
    alignItems: 'center',
  },
  emptyText: {
    fontSize: 14,
    fontFamily: theme.fontFamily.body,
  },
}));
