import React from "react";
import { View, Linking, Alert } from "react-native";
import { Text } from "../Text";
import { Button } from "../Button";
import { styles } from "./LinkContent.styles";

export interface LinkContentProps {
  uri: string;
  description?: string;
}

async function openLink(uri: string) {
  try {
    const canOpen = await Linking.canOpenURL(uri);
    if (canOpen) {
      await Linking.openURL(uri);
    } else {
      Alert.alert("Cannot open link", `Unable to open: ${uri}`);
    }
  } catch (error) {
    console.error("[LinkContent] Failed to open link", { uri, error });
    Alert.alert("Cannot open link", `Failed to open: ${uri}`);
  }
}

export function LinkContent({ uri, description }: LinkContentProps) {
  return (
    <View style={styles.container}>
      <View style={styles.card}>
        {description ? (
          <Text style={styles.title} numberOfLines={3}>
            {description}
          </Text>
        ) : null}
        <Text
          style={styles.url}
          numberOfLines={3}
          accessibilityRole="text"
          selectable
        >
          {uri}
        </Text>
        <Button
          label="Open in browser"
          onPress={() => openLink(uri)}
          variant="primary"
        />
      </View>
    </View>
  );
}
