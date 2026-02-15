import { Suspense, useState } from 'react';
import { View, ScrollView, Image, ActivityIndicator } from 'react-native';
import type { ImageSourcePropType } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation, type NavigationProp } from '@react-navigation/native';
import { useQuery } from '@evolu/react';
import { useUnistyles } from 'react-native-unistyles';
import { Text } from '../../components/Text';
import { Button } from '../../components/Button';
import { IconButton } from '../../components/IconButton';
import { Confetti } from '../../components/Confetti';
import { ModeIndicator } from '../../components/ModeIndicator';
import {
  goalsQuery,
  stepsByGoalQuery,
  evidenceByGoalQuery,
  EvidenceType,
} from '../../db';
import type { GoalId } from '../../db';
import type {
  GoalsStackParamList,
  CompletionFlowScreenProps,
  CaptureScreenName,
} from '../../navigation/types';
import type { EvidenceTypeValue } from '../EvidenceActionSheet';
import { EVIDENCE_OPTIONS } from '../EvidenceActionSheet';
import { EVIDENCE_TYPE_ICONS } from '../../constants/evidenceIcons';
import { styles } from './CompletionFlowScreen.styles';

/**
 * Optional image override for the completion icon.
 * Set to an image source (e.g. require('../../../assets/icon.png')) to use an image,
 * or leave as undefined to use the default 🎯 emoji.
 */
// eslint-disable-next-line @typescript-eslint/no-unused-vars
const COMPLETION_ICON: ImageSourcePropType | undefined = undefined;

const EVIDENCE_ROUTE_MAP: Partial<Record<EvidenceTypeValue, CaptureScreenName>> = {
  [EvidenceType.photo]: 'CapturePhoto',
  [EvidenceType.video]: 'CaptureVideo',
  [EvidenceType.voice_memo]: 'CaptureVoiceMemo',
  [EvidenceType.text]: 'CaptureTextNote',
  [EvidenceType.link]: 'CaptureLink',
  [EvidenceType.file]: 'CaptureFile',
};

function CompletionContent({ goalId }: { goalId: string }) {
  const navigation = useNavigation<NavigationProp<GoalsStackParamList>>();
  const rows = useQuery(goalsQuery);
  const goal = rows.find((r) => r.id === goalId);
  const stepRows = useQuery(stepsByGoalQuery(goalId as GoalId));
  const goalEvidenceRows = useQuery(evidenceByGoalQuery(goalId as GoalId));

  const [showConfetti, setShowConfetti] = useState(true);
  const hasGoalEvidence = goalEvidenceRows.length > 0;

  if (!goal) {
    return (
      <View style={styles.centered}>
        <Text variant="body">Goal not found.</Text>
      </View>
    );
  }

  const handleAddEvidence = () => {
    // Navigate to a random evidence capture type (like prototype) or first available
    const firstType = EVIDENCE_OPTIONS[0];
    if (!firstType) return;
    const routeName = EVIDENCE_ROUTE_MAP[firstType.type];
    if (!routeName) return;
    navigation.navigate(routeName, { goalId });
  };

  const handleViewJourney = () => {
    navigation.navigate('TimelineJourney', { goalId });
  };

  return (
    <View style={{ flex: 1 }}>
      <Confetti visible={showConfetti} onComplete={() => setShowConfetti(false)} />
      <ScrollView contentContainerStyle={styles.scrollContent}>
        <View
          style={styles.card}
          accessible
          accessibilityRole="summary"
          accessibilityLabel={`Congratulations! All ${stepRows.length} steps completed for ${goal.title}`}
        >
          <View style={styles.iconContainer} accessibilityElementsHidden>
            {COMPLETION_ICON ? (
              <Image
                source={COMPLETION_ICON}
                style={styles.iconImage}
                resizeMode="contain"
              />
            ) : (
              <Text style={styles.iconEmoji}>🎯</Text>
            )}
          </View>
          <Text
            variant="headline"
            style={styles.headline}
            accessibilityRole="header"
          >
            You did it!
          </Text>
          <Text variant="body" style={styles.summary}>
            All {stepRows.length} steps completed for {goal.title}
          </Text>

          <View style={styles.actions}>
            <Button
              label="Add Final Evidence"
              onPress={handleAddEvidence}
              variant={hasGoalEvidence ? 'secondary' : 'primary'}
            />
            <Button
              label="View Your Journey →"
              onPress={handleViewJourney}
              variant={hasGoalEvidence ? 'primary' : 'secondary'}
            />
          </View>

          {hasGoalEvidence && (
            <View style={styles.evidenceSection}>
              <Text variant="label" style={styles.evidenceSectionTitle}>
                Goal Evidence Added
              </Text>
              {goalEvidenceRows.map((ev) => {
                const evType = (ev.type ?? 'file') as EvidenceTypeValue;
                const icon = EVIDENCE_TYPE_ICONS[evType] ?? '\u{1F4C4}';
                return (
                  <View
                    key={ev.id}
                    style={styles.evidenceItem}
                    accessible
                    accessibilityRole="text"
                    accessibilityLabel={`${ev.type ?? 'file'} evidence: ${ev.description ?? ev.type}`}
                  >
                    <Text style={styles.evidenceIcon}>{icon}</Text>
                    <Text variant="body" style={styles.evidenceLabel} numberOfLines={1}>
                      {ev.description ?? ev.type ?? 'Evidence'}
                    </Text>
                  </View>
                );
              })}
            </View>
          )}
        </View>
      </ScrollView>
    </View>
  );
}

export function CompletionFlowScreen({ route }: CompletionFlowScreenProps) {
  const navigation = useNavigation();
  const { theme } = useUnistyles();

  return (
    <SafeAreaView edges={['top']} style={{ flex: 1, backgroundColor: theme.colors.background }}>
      <View style={styles.topBar}>
        <IconButton
          icon={<Text variant="body" style={styles.backIcon}>{'<'}</Text>}
          onPress={() => navigation.goBack()}
          accessibilityLabel="Go back"
          size="sm"
        />
        <Text variant="label">Complete</Text>
        <View style={styles.spacer} />
      </View>
      <Suspense
        fallback={<ActivityIndicator style={styles.loadingIndicator} size="large" />}
      >
        <CompletionContent goalId={route.params.goalId} />
      </Suspense>
      <ModeIndicator mode="complete" />
    </SafeAreaView>
  );
}
