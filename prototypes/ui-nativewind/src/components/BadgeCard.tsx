import React from "react";
import { View, Text, Pressable } from "react-native";

export interface Badge {
  id: string;
  title: string;
  description: string;
  dateEarned: string;
  evidenceCount: number;
  category: string;
}

interface BadgeCardProps {
  badge: Badge;
  onPress?: () => void;
}

export function BadgeCard({ badge, onPress }: BadgeCardProps) {
  const accessibilityLabel = `${badge.title} badge. ${badge.description}. Earned on ${badge.dateEarned}. ${badge.evidenceCount} evidence items. Category: ${badge.category}`;

  return (
    <Pressable
      onPress={onPress}
      accessible
      accessibilityRole="button"
      accessibilityLabel={accessibilityLabel}
      accessibilityHint="Double tap to view badge details"
      className="active:opacity-80"
    >
      {({ pressed }) => (
        <View
          className={`
            bg-bg-secondary
            border
            border-border
            rounded-card
            p-4
            mb-3
            ${pressed ? "opacity-80" : "opacity-100"}
          `}
        >
          <View className="flex-row justify-between items-start mb-2">
            <Text
              className="text-text-primary text-body-lg font-semibold flex-1 mr-2"
              accessibilityRole="header"
            >
              {badge.title}
            </Text>
            <View className="bg-accent-purple px-2 py-1 rounded-button">
              <Text className="text-white text-body-sm font-medium">
                {badge.category}
              </Text>
            </View>
          </View>

          <Text
            className="text-text-secondary text-body-md mb-3"
            numberOfLines={2}
          >
            {badge.description}
          </Text>

          <View className="flex-row justify-between items-center">
            <Text className="text-text-muted text-body-sm">
              {badge.dateEarned}
            </Text>
            <View className="flex-row items-center">
              <View className="w-2 h-2 rounded-full bg-accent-mint mr-2" />
              <Text className="text-text-muted text-body-sm">
                {badge.evidenceCount} evidence
              </Text>
            </View>
          </View>
        </View>
      )}
    </Pressable>
  );
}
