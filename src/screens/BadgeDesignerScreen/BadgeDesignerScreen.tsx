import React, { Suspense, useCallback, useMemo, useState } from 'react';
import { ActivityIndicator, Alert, ScrollView, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
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
import { badgeWithGoalQuery, goalsQuery, updateBadge } from '../../db';
import type { BadgeId } from '../../db';
import { pendingDesignStore } from '../../stores/pendingDesignStore';
import { Logger } from '../../shims/rd-logger';
import type {
  BadgeDesignerScreenProps,
  GoalsStackParamList,
} from '../../navigation/types';
import { styles } from './BadgeDesignerScreen.styles';

const logger = new Logger('BadgeDesignerScreen');

// ---------------------------------------------------------------------------
// Shared design editor UI (stateless — receives design + callbacks)
// ---------------------------------------------------------------------------

interface DesignEditorProps {
  currentDesign: BadgeDesign;
  goalColor?: string | null;
  onDesignChange: (design: BadgeDesign) => void;
  onSave: () => void;
  saveLabel?: string;
  extraFooter?: React.ReactNode;
}

function DesignEditor({
  currentDesign,
  goalColor,
  onDesignChange,
  onSave,
  saveLabel = 'Save Design',
  extraFooter,
}: DesignEditorProps) {
  const handleShapeChange = useCallback((shape: BadgeShape) => {
    onDesignChange({ ...currentDesign, shape });
  }, [currentDesign, onDesignChange]);

  const handleColorChange = useCallback((color: string) => {
    onDesignChange({ ...currentDesign, color });
  }, [currentDesign, onDesignChange]);

  const handleIconChange = useCallback((iconName: string) => {
    onDesignChange({ ...currentDesign, iconName });
  }, [currentDesign, onDesignChange]);

  const handleWeightChange = useCallback((iconWeight: BadgeIconWeight) => {
    onDesignChange({ ...currentDesign, iconWeight });
  }, [currentDesign, onDesignChange]);

  const previewLabel = `Badge preview: ${currentDesign.color} ${currentDesign.shape} with ${currentDesign.iconName} icon`;

  return (
    <ScrollView
      contentContainerStyle={styles.scrollContent}
      keyboardShouldPersistTaps="handled"
    >
      <View
        style={styles.previewContainer}
        accessibilityRole="image"
        accessibilityLabel={previewLabel}
      >
        <BadgeRenderer design={currentDesign} size={160} />
      </View>

      <View style={styles.sectionContainer}>
        <Text style={styles.sectionLabel}>Shape</Text>
        <ShapeSelector
          selectedShape={currentDesign.shape}
          onSelectShape={handleShapeChange}
          accentColor={currentDesign.color}
        />
      </View>

      <View style={styles.sectionContainer}>
        <Text style={styles.sectionLabel}>Color</Text>
        <ColorPicker
          selectedColor={currentDesign.color}
          onSelectColor={handleColorChange}
          goalColor={goalColor ?? undefined}
        />
      </View>

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

      <View style={styles.footer}>
        <Button label={saveLabel} onPress={onSave} />
        {extraFooter}
      </View>
    </ScrollView>
  );
}

// ---------------------------------------------------------------------------
// Badge editing content — used by both BadgesStack and GoalsStack redesign
// ---------------------------------------------------------------------------

function BadgeDesignerContentBadge({ badgeId }: { badgeId: string }) {
  const navigation = useNavigation();
  const query = useMemo(() => badgeWithGoalQuery(badgeId as BadgeId), [badgeId]);
  const rows = useQuery(query);
  const badge = rows[0] ?? null;

  const initialDesign = useMemo(() => {
    if (!badge) return null;
    const goalTitle = (badge.goalTitle as string) ?? 'Untitled';
    const goalColor = badge.goalColor as string | null;
    return parseBadgeDesign(badge.design as string | null)
      ?? createDefaultBadgeDesign(goalTitle, goalColor);
  }, [badge]);

  const [design, setDesign] = useState<BadgeDesign | null>(null);
  const currentDesign = design ?? initialDesign;
  const goalColor = badge?.goalColor as string | null | undefined;

  const handleSave = useCallback(() => {
    if (!currentDesign) return;
    try {
      updateBadge(badgeId as BadgeId, { design: JSON.stringify(currentDesign) });
    } catch (err) {
      logger.error('Failed to save badge design', { badgeId, error: err });
      Alert.alert('Save Failed', 'Could not save your badge design. Please try again.');
      return;
    }
    navigation.goBack();
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

  return (
    <DesignEditor
      currentDesign={currentDesign}
      goalColor={goalColor}
      onDesignChange={setDesign}
      onSave={handleSave}
    />
  );
}

// ---------------------------------------------------------------------------
// GoalsStack: new-goal mode — no badge exists yet, design saved to store
// ---------------------------------------------------------------------------

function BadgeDesignerContentNewGoal({ goalId }: { goalId: string }) {
  const navigation = useNavigation<NativeStackNavigationProp<GoalsStackParamList>>();
  const goals = useQuery(goalsQuery);
  const goal = goals.find((g) => g.id === goalId) ?? null;

  const initialDesign = useMemo(() => {
    const title = (goal?.title as string) ?? 'Untitled';
    const color = (goal?.color as string | null) ?? null;
    return createDefaultBadgeDesign(title, color);
  }, [goal]);

  const [design, setDesign] = useState<BadgeDesign | null>(null);
  const currentDesign = design ?? initialDesign;

  const goalColor = (goal?.color as string | null) ?? null;

  const saveAndNavigate = useCallback((designToSave: BadgeDesign) => {
    try {
      pendingDesignStore.set(goalId, JSON.stringify(designToSave));
      navigation.replace('EditMode', { goalId });
    } catch (err) {
      logger.error('Failed to save design and navigate', { goalId, error: err });
      Alert.alert('Save Failed', 'Could not save your badge design. Please try again.');
    }
  }, [goalId, navigation]);

  const handleSave = useCallback(() => {
    saveAndNavigate(currentDesign);
  }, [currentDesign, saveAndNavigate]);

  const handleSkip = useCallback(() => {
    saveAndNavigate(initialDesign);
  }, [initialDesign, saveAndNavigate]);

  if (!goal) {
    return (
      <View style={styles.centered}>
        <ActivityIndicator size="large" />
      </View>
    );
  }

  return (
    <DesignEditor
      currentDesign={currentDesign}
      goalColor={goalColor}
      onDesignChange={setDesign}
      onSave={handleSave}
      saveLabel="Use This Design"
      extraFooter={
        <Button
          label="Skip — Use Default"
          variant="secondary"
          onPress={handleSkip}
        />
      }
    />
  );
}

// ---------------------------------------------------------------------------
// Screen wrapper — detects mode from route params
// ---------------------------------------------------------------------------

type ScreenParams =
  | { badgeId: string; mode?: undefined }
  | { mode: 'new-goal'; goalId: string }
  | { mode: 'redesign'; badgeId: string };

export function BadgeDesignerScreen({ route }: BadgeDesignerScreenProps | { route: { params: ScreenParams } }) {
  const navigation = useNavigation();
  const { theme } = useUnistyles();
  const params = route.params as ScreenParams;

  let content: React.ReactNode;
  if ('mode' in params && params.mode === 'new-goal') {
    content = <BadgeDesignerContentNewGoal goalId={params.goalId} />;
  } else if ('badgeId' in params && params.badgeId) {
    content = <BadgeDesignerContentBadge badgeId={params.badgeId} />;
  } else {
    logger.error('BadgeDesignerScreen: unrecognized params', { params });
    content = (
      <View style={styles.centered}>
        <Text variant="body">Invalid badge designer parameters</Text>
        <Button label="Go Back" variant="secondary" onPress={() => navigation.goBack()} />
      </View>
    );
  }

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
            {content}
          </Suspense>
        </ErrorBoundary>
      </View>
    </SafeAreaView>
  );
}
