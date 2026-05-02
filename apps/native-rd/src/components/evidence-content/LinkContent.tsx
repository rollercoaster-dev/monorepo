import React from "react";
import { View } from "react-native";
import { Text } from "../Text";
import { Button } from "../Button";
import { openLinkInBrowser } from "../../utils/evidenceViewers";
import { styles } from "./LinkContent.styles";

export interface LinkContentProps {
  uri: string;
  description?: string;
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
          onPress={() => openLinkInBrowser(uri)}
          variant="primary"
        />
      </View>
    </View>
  );
}
