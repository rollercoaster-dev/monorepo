import React, { useEffect, useState } from "react";
import { View, Image } from "react-native";
import { Text } from "../Text";
import { styles } from "./PhotoContent.styles";

export interface PhotoContentProps {
  uri: string | null;
  description?: string;
}

export function PhotoContent({ uri, description }: PhotoContentProps) {
  const [imageError, setImageError] = useState(false);

  useEffect(() => {
    setImageError(false);
  }, [uri]);

  return (
    <View style={styles.container}>
      <View style={styles.imageContainer}>
        {!uri || imageError ? (
          <Text style={styles.errorText}>Failed to load image</Text>
        ) : (
          <Image
            source={{ uri }}
            style={styles.image}
            resizeMode="contain"
            accessibilityLabel={description ?? "Photo evidence"}
            onError={() => setImageError(true)}
          />
        )}
      </View>
      {description ? (
        <View style={styles.captionBar}>
          <Text style={styles.captionText} numberOfLines={2}>
            {description}
          </Text>
        </View>
      ) : null}
    </View>
  );
}
