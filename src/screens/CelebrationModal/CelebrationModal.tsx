import React from 'react';
import { View, Modal } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useUnistyles } from 'react-native-unistyles';
import { Text } from '../../components/Text';
import { Card } from '../../components/Card';
import { Button } from '../../components/Button';
import { styles } from './CelebrationModal.styles';

export interface CelebrationModalProps {
  visible: boolean;
  onDismiss: () => void;
  title: string;
  message?: string;
  icon?: string;
  actionLabel?: string;
  onAction?: () => void;
  animationType?: 'none' | 'slide' | 'fade';
}

export function CelebrationModal({
  visible,
  onDismiss,
  title,
  message,
  icon = '⭐',
  actionLabel,
  onAction,
  animationType = 'fade',
}: CelebrationModalProps) {
  const { theme } = useUnistyles();

  return (
    <Modal
      visible={visible}
      transparent
      animationType={animationType}
      onRequestClose={onDismiss}
      accessibilityViewIsModal
    >
      <View style={[styles.overlay, { backgroundColor: `${theme.colors.shadow}80` }]}>
        <SafeAreaView edges={['bottom']} style={styles.container}>
          <Card size="normal">
            <View
              style={styles.content}
              accessible
              accessibilityLiveRegion="polite"
            >
              <Text variant="display" style={styles.icon}>
                {icon}
              </Text>
              <Text
                variant="headline"
                style={styles.title}
                accessibilityRole="header"
              >
                {title}
              </Text>
              {message && (
                <Text variant="body" style={styles.message}>
                  {message}
                </Text>
              )}
            </View>

            <View style={styles.actions}>
              {actionLabel && onAction && (
                <Button
                  label={actionLabel}
                  onPress={onAction}
                  variant="primary"
                />
              )}
              <Button
                label="Done"
                onPress={onDismiss}
                variant={actionLabel ? 'secondary' : 'primary'}
              />
            </View>
          </Card>
        </SafeAreaView>
      </View>
    </Modal>
  );
}
