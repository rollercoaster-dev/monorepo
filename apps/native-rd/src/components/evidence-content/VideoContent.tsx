import React, { useEffect, useState } from "react";
import { View } from "react-native";
import { useVideoPlayer, VideoView } from "expo-video";
import { Text } from "../Text";
import { styles } from "./VideoContent.styles";

export interface VideoContentProps {
  uri: string | null;
}

function PlayerContent({ uri }: { uri: string }) {
  const [error, setError] = useState(false);
  const player = useVideoPlayer(uri, (p) => {
    p.loop = false;
    p.play();
  });

  useEffect(() => {
    const subscription = player.addListener("statusChange", (payload) => {
      if (payload.status === "error") {
        console.error("[VideoContent] Playback error", { uri, payload });
        setError(true);
      }
    });
    return () => subscription.remove();
  }, [player]);

  if (error) {
    return <Text style={styles.errorText}>Failed to load video</Text>;
  }

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

export function VideoContent({ uri }: VideoContentProps) {
  return (
    <View style={styles.container}>
      <View style={styles.videoContainer}>
        {uri ? (
          <PlayerContent uri={uri} />
        ) : (
          <Text style={styles.errorText}>Failed to load video</Text>
        )}
      </View>
    </View>
  );
}
