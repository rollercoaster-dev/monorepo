import React from "react";
import { View, Text, ScrollView, SafeAreaView, Alert } from "react-native";
import { BadgeCard, Badge } from "../components/BadgeCard";
import { ThemeSwitcher } from "../components/ThemeSwitcher";

const mockBadges: Badge[] = [
  {
    id: "1",
    title: "Critical Thinking",
    description:
      "Demonstrated ability to analyze complex problems and form well-reasoned conclusions based on evidence.",
    dateEarned: "January 15, 2025",
    evidenceCount: 5,
    category: "Cognitive",
  },
  {
    id: "2",
    title: "Team Collaboration",
    description:
      "Effectively worked with peers to achieve shared goals and contributed positively to group dynamics.",
    dateEarned: "January 20, 2025",
    evidenceCount: 3,
    category: "Social",
  },
  {
    id: "3",
    title: "Digital Literacy",
    description:
      "Showed proficiency in using digital tools and platforms for learning and communication.",
    dateEarned: "February 1, 2025",
    evidenceCount: 7,
    category: "Technical",
  },
  {
    id: "4",
    title: "Self-Regulation",
    description:
      "Demonstrated ability to manage emotions, behavior, and learning strategies independently.",
    dateEarned: "February 10, 2025",
    evidenceCount: 4,
    category: "Emotional",
  },
];

export function TestScreen() {
  const handleBadgePress = (badge: Badge) => {
    Alert.alert(
      badge.title,
      `Category: ${badge.category}\nEarned: ${badge.dateEarned}\nEvidence: ${badge.evidenceCount} items`
    );
  };

  return (
    <SafeAreaView className="flex-1 bg-bg-primary">
      <ScrollView
        className="flex-1"
        contentContainerClassName="p-4"
        showsVerticalScrollIndicator={false}
      >
        <View className="mb-6">
          <Text
            className="text-text-primary text-heading-lg font-bold mb-2"
            accessibilityRole="header"
          >
            NativeWind Prototype
          </Text>
          <Text className="text-text-secondary text-body-md">
            Testing 7 ND accessibility themes with CSS variables and NativeWind
            v4
          </Text>
        </View>

        <ThemeSwitcher />

        <View>
          <Text
            className="text-text-primary text-heading-sm font-bold mb-4"
            accessibilityRole="header"
          >
            Badge Collection
          </Text>
          {mockBadges.map((badge) => (
            <BadgeCard
              key={badge.id}
              badge={badge}
              onPress={() => handleBadgePress(badge)}
            />
          ))}
        </View>

        <View className="mt-6 p-4 bg-bg-tertiary rounded-card">
          <Text className="text-text-primary text-body-md font-semibold mb-2">
            Theme Features Demo
          </Text>
          <View className="flex-row flex-wrap gap-2">
            <View className="bg-accent-purple px-3 py-2 rounded-button">
              <Text className="text-white text-body-sm">Purple Accent</Text>
            </View>
            <View className="bg-accent-mint px-3 py-2 rounded-button">
              <Text className="text-white text-body-sm">Mint Accent</Text>
            </View>
            <View className="bg-accent-yellow px-3 py-2 rounded-button">
              <Text className="text-black text-body-sm">Yellow Accent</Text>
            </View>
          </View>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}
