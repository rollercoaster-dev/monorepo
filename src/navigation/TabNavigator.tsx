import React from 'react';
import { Text } from 'react-native';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { useUnistyles } from 'react-native-unistyles';
import { GoalsStack } from './GoalsStack';
import { BadgesStack } from './BadgesStack';
import { SettingsStack } from './SettingsStack';
import type { RootTabParamList } from './types';

const Tab = createBottomTabNavigator<RootTabParamList>();

const tabLetters: Record<keyof RootTabParamList, string> = {
  GoalsTab: 'G',
  BadgesTab: 'B',
  SettingsTab: 'S',
};

export function TabNavigator() {
  const { theme } = useUnistyles();

  return (
    <Tab.Navigator
      screenOptions={({ route }) => ({
        headerShown: false,
        tabBarShowLabel: false,
        tabBarIcon: ({ color }) => (
          <Text
            style={{
              color,
              fontSize: theme.size['2xl'],
              fontWeight: theme.fontWeight.black,
              fontFamily: theme.fontFamily.headline,
              letterSpacing: theme.letterSpacing.tight,
              lineHeight: theme.size['2xl'] * 1.2,
            }}
          >
            {tabLetters[route.name]}
          </Text>
        ),
        tabBarActiveTintColor: theme.colors.text,
        tabBarInactiveTintColor: theme.colors.backgroundSecondary,
        tabBarStyle: {
          backgroundColor: theme.colors.accentPurple,
          borderTopWidth: theme.borderWidth.medium,
          borderTopColor: theme.colors.border,
          height: 56,
        },
      })}
    >
      <Tab.Screen name="GoalsTab" component={GoalsStack} />
      <Tab.Screen name="BadgesTab" component={BadgesStack} />
      <Tab.Screen name="SettingsTab" component={SettingsStack} />
    </Tab.Navigator>
  );
}
