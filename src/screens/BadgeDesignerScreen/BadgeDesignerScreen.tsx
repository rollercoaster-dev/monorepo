import React, { Suspense, useCallback, useMemo, useState } from 'react';
import { ActivityIndicator, Alert, ScrollView, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';
import { useUnistyles } from 'react-native-unistyles';
import { useQuery } from '@evolu/react';

import { Text } from '../../components/Text';
import { IconButton } from '../../components/IconButton';
import { Button } from '../../components/Button';
import { ErrorBoundary } from '../../components/ErrorBoundary';
import { BadgeRenderer } from '../../badges/BadgeRenderer';
import { ShapeSelector } from '../../badges/ShapeSelector';
import { ColorPicker } from '../../badges/ColorPicker';
import { IconPicker } from '../../badges/IconPicker';
import { parseBadgeDesign, createDefaultBadgeDesign } from '../../badges/types';
import type { BadgeDesign, BadgeShape, BadgeIconWeight } from '../../badges/types';
import { badgeWithGoalQuery, updateBadge } from '../../db';
import type { BadgeId } from '../../db';
import type { BadgeDesignerScreenProps } from '../../navigation/types';
import { styles } from './BadgeDesignerScreen.styles';

// ---------------------------------------------------------------------------
// Inner content (uses Evolu query, must be inside Suspense)
// ---------------------------------------------------------------------------

function BadgeDesignerContent({ badgeId }: { badgeId: string }) {
  const navigation = useNavigation();
  const query = useMemo(() => badgeWithGoalQuery(badgeId as BadgeId), [badgeId]);
  const rows = useQuery(query);
  const badge = rows[0] ?? null;

  // Parse existing design or create default
  const initialDesign = useMemo(() => {
    if (!badge) return null;
    const goalTitle = (badge.goalTitle as string) ?? 'Untitled';
    const goalColor = badge.goalColor as string | null;
    return parseBadgeDesign(badge.design as string | null)
      ?? createDefaultBadgeDesign(goalTitle, goalColor);
  }, [badge]);

  const [design, setDesign] = useState<BadgeDesign | null>(null);

  // Use initialDesign as starting point once available
  const currentDesign = design ?? initialDesign;

  const goalColor = badge?.goalColor as string | null | undefined;

  const handleShapeChange = useCallback((shape: BadgeShape) => {
    setDesign((prev) => {
      const base = prev ?? initialDesign;
      if (!base) return prev;
      return { ...base, shape };
    });
  }, [initialDesign]);

  const handleColorChange = useCallback((color: string) => {
    setDesign((prev) => {
      const base = prev ?? initialDesign;
      if (!base) return prev;
      return { ...base, color };
    });
  }, [initialDesign]);

  const handleIconChange = useCallback((iconName: string) => {
    setDesign((prev) => {
      const base = prev ?? initialDesign;
      if (!base) return prev;
      return { ...base, iconName };
    });
  }, [initialDesign]);

  const handleWeightChange = useCallback((iconWeight: BadgeIconWeight) => {
    setDesign((prev) => {
      const base = prev ?? initialDesign;
      if (!base) return prev;
      return { ...base, iconWeight };
    });
  }, [initialDesign]);

  const handleSave = useCallback(() => {
    if (!currentDesign) return;
    try {
      updateBadge(badgeId as BadgeId, { design: JSON.stringify(currentDesign) });
      navigation.goBack();
    } catch {
      Alert.alert('Save Failed', 'Could not save your badge design. Please try again.');
    }
  }, [badgeId, currentDesign, navigation]);

  if (!badge || !currentDesign) {
    return (
      <View style={styles.centered}>
        <Text variant="body">Badge not found</Text>
        <Button
          label="Go Back"
          variant="secondary"
          onPress={() => navigation.goBack()}
        />
      </View>
    );
  }

  const previewLabel = `Badge preview: ${currentDesign.color} ${currentDesign.shape} with ${currentDesign.iconName} icon`;

  return (
    <ScrollView
      contentContainerStyle={styles.scrollContent}
      keyboardShouldPersistTaps="handled"
    >
      {/* Live preview */}
      <View
        style={styles.previewContainer}
        accessibilityRole="image"
        accessibilityLabel={previewLabel}
      >
        <BadgeRenderer design={currentDesign} size={160} />
      </View>

      {/* Shape selector */}
      <View style={styles.sectionContainer}>
        <Text style={styles.sectionLabel}>Shape</Text>
        <ShapeSelector
          selectedShape={currentDesign.shape}
          onSelectShape={handleShapeChange}
          accentColor={currentDesign.color}
        />
      </View>

      {/* Color picker */}
      <View style={styles.sectionContainer}>
        <Text style={styles.sectionLabel}>Color</Text>
        <ColorPicker
          selectedColor={currentDesign.color}
          onSelectColor={handleColorChange}
          goalColor={goalColor ?? undefined}
        />
      </View>

      {/* Icon picker — trigger button opens full-screen modal */}
      <View style={styles.iconSection}>
        <Text style={styles.sectionLabel}>Icon</Text>
        <IconPicker
          selectedIcon={currentDesign.iconName}
          selectedWeight={currentDesign.iconWeight}
          onSelectIcon={handleIconChange}
          onSelectWeight={handleWeightChange}
          accentColor={currentDesign.color}
        />
      </View>

      {/* Save button */}
      <View style={styles.footer}>
        <Button
          label="Save Design"
          onPress={handleSave}
        />
      </View>
    </ScrollView>
  );
}

// ---------------------------------------------------------------------------
// Screen wrapper
// ---------------------------------------------------------------------------

export function BadgeDesignerScreen({ route }: BadgeDesignerScreenProps) {
  const navigation = useNavigation();
  const { theme } = useUnistyles();
  const { badgeId } = route.params;

  return (
    <SafeAreaView edges={['top']} style={{ flex: 1, backgroundColor: theme.colors.accentYellow }}>
      <View style={styles.topBar}>
        <IconButton
          icon={<Text variant="headline">{'\u2190'}</Text>}
          onPress={() => navigation.goBack()}
          variant="ghost"
          accessibilityLabel="Go back"
        />
        <Text style={styles.topBarTitle}>Design Badge</Text>
        <View style={styles.spacer} />
      </View>

      <View style={styles.contentArea}>
        <ErrorBoundary>
          <Suspense
            fallback={
              <ActivityIndicator style={styles.loadingIndicator} size="large" />
            }
          >
            <BadgeDesignerContent badgeId={badgeId} />
          </Suspense>
        </ErrorBoundary>
      </View>
    </SafeAreaView>
  );
}
