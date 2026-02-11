import React from 'react';
import { Pressable, View, Text, Linking, Alert } from 'react-native';
import { EvidenceType } from '../../db';
import { styles } from './EvidenceThumbnail.styles';

type EvidenceTypeValue = (typeof EvidenceType)[keyof typeof EvidenceType];

export interface Evidence {
  id: string;
  title: string;
  type: EvidenceTypeValue;
  /** URI for the evidence (file path or URL). Used for link-type evidence to open in browser. */
  uri?: string;
}

export interface EvidenceThumbnailProps {
  evidence: Evidence;
  onPress?: () => void;
}

const typeIcons: Record<EvidenceTypeValue, string> = {
  photo: '\u{1F4F7}',
  screenshot: '\u{1F4F1}',
  voice_memo: '\u{1F3A4}',
  text: '\u{1F4DD}',
  link: '\u{1F517}',
  file: '\u{1F4C4}',
  video: '\u{1F3AC}',
};

/**
 * Opens a link evidence URI in the system browser.
 * Shows an alert if the URL cannot be opened.
 */
async function openLinkInBrowser(uri: string): Promise<void> {
  try {
    const canOpen = await Linking.canOpenURL(uri);
    if (canOpen) {
      await Linking.openURL(uri);
    } else {
      Alert.alert('Cannot open link', `Unable to open: ${uri}`);
    }
  } catch {
    Alert.alert('Cannot open link', `Failed to open: ${uri}`);
  }
}

export function EvidenceThumbnail({ evidence, onPress }: EvidenceThumbnailProps) {
  const isLink = evidence.type === 'link' && evidence.uri;

  function handlePress() {
    if (onPress) {
      onPress();
    } else if (isLink) {
      openLinkInBrowser(evidence.uri!);
    }
  }

  const isInteractive = !!onPress || !!isLink;
  const accessibilityHint = isLink && !onPress ? 'Opens link in browser' : undefined;

  return (
    <Pressable
      onPress={handlePress}
      disabled={!isInteractive}
      accessible
      accessibilityRole={isInteractive ? 'button' : undefined}
      accessibilityLabel={`${evidence.type} evidence: ${evidence.title}`}
      accessibilityHint={accessibilityHint}
      style={({ pressed }) => [pressed && isInteractive && styles.pressed]}
    >
      <View style={styles.container}>
        <View style={styles.preview}>
          <Text style={styles.previewIcon}>{typeIcons[evidence.type]}</Text>
        </View>
        <View style={styles.info}>
          <Text style={styles.title} numberOfLines={1}>{evidence.title}</Text>
          {isLink ? (
            <Text style={styles.linkUrl} numberOfLines={1}>{evidence.uri}</Text>
          ) : (
            <Text style={styles.type}>{evidence.type}</Text>
          )}
        </View>
      </View>
    </Pressable>
  );
}
