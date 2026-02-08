import React from 'react';
import { View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useUnistyles } from 'react-native-unistyles';
import { Text } from '../../components/Text';
import { Button } from '../../components/Button';
import { Card } from '../../components/Card';
import { ThemeSwitcher } from '../../components/ThemeSwitcher';
import { styles } from './WelcomeScreen.styles';

export interface WelcomeScreenProps {
  onGetStarted: () => void;
  showThemeSelector?: boolean;
}

export function WelcomeScreen({
  onGetStarted,
  showThemeSelector = true,
}: WelcomeScreenProps) {
  const { theme } = useUnistyles();

  return (
    <SafeAreaView
      edges={['top', 'bottom']}
      style={[styles.container, { backgroundColor: theme.colors.background }]}
    >
      <View style={styles.content}>
        <View style={styles.header}>
          <Text variant="display" style={styles.appName}>
            rollercoaster.dev
          </Text>
          <Text variant="body" style={styles.tagline}>
            Learn anything. Track progress. Earn badges.
          </Text>
        </View>

        {showThemeSelector && (
          <Card size="normal">
            <View style={styles.themeSection}>
              <Text variant="label" style={styles.sectionLabel}>
                Choose your theme
              </Text>
              <ThemeSwitcher />
            </View>
          </Card>
        )}

        <View style={styles.intro}>
          <Text variant="body" style={styles.introText}>
            Set goals, break them into steps, collect evidence, and earn badges for your learning journey.
          </Text>
        </View>
      </View>

      <View style={styles.footer}>
        <Button
          label="Get Started"
          onPress={onGetStarted}
          size="lg"
        />
      </View>
    </SafeAreaView>
  );
}
