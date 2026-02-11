import React from 'react';
import { View, Modal, Pressable } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useVideoPlayer, VideoView } from 'expo-video';
import { Text } from '../../components/Text';
import { styles } from './VideoPlayerModal.styles';

export interface VideoPlayerModalProps {
  visible: boolean;
  uri: string | null;
  onClose: () => void;
}

function PlayerContent({ uri }: { uri: string }) {
  const player = useVideoPlayer(uri, (p) => {
    p.loop = false;
    p.play();
  });
  return (
    <VideoView
      player={player}
      style={styles.video}
      fullscreenOptions={{ enable: true }}
      nativeControls
      contentFit="contain"
      accessibilityLabel="Video evidence playback"
    />
  );
}

export function VideoPlayerModal({ visible, uri, onClose }: VideoPlayerModalProps) {
  if (!uri) return null;

  return (
    <Modal
      visible={visible}
      transparent={false}
      animationType="slide"
      onRequestClose={onClose}
      supportedOrientations={['portrait', 'landscape']}
      accessibilityViewIsModal
    >
      <View style={styles.overlay}>
        <SafeAreaView edges={['top', 'bottom']} style={styles.container}>
          <View style={styles.topBar}>
            <Pressable
              onPress={onClose}
              accessible
              accessibilityRole="button"
              accessibilityLabel="Close video player"
            >
              <Text style={styles.closeText}>{'✕'}</Text>
            </Pressable>
          </View>
          <View style={styles.videoContainer}>
            <PlayerContent uri={uri} />
          </View>
        </SafeAreaView>
      </View>
    </Modal>
  );
}
