import React from 'react';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { GoalsScreen } from '../screens/GoalsScreen';
import { GoalDetailScreen } from '../screens/GoalDetailScreen';
import { NewGoalModal } from '../screens/NewGoalModal';
import { CapturePlaceholder } from '../screens/CapturePlaceholder';
import type { GoalsStackParamList } from './types';

const Stack = createNativeStackNavigator<GoalsStackParamList>();

export function GoalsStack() {
  return (
    <Stack.Navigator screenOptions={{ headerShown: false }}>
      <Stack.Screen name="Goals" component={GoalsScreen} />
      <Stack.Screen name="GoalDetail" component={GoalDetailScreen} />
      <Stack.Screen
        name="NewGoal"
        component={NewGoalModal}
        options={{ presentation: 'modal' }}
      />
      <Stack.Screen name="CapturePhoto" component={CapturePlaceholder} />
      <Stack.Screen name="CaptureVoiceMemo" component={CapturePlaceholder} />
      <Stack.Screen name="CaptureTextNote" component={CapturePlaceholder} />
      <Stack.Screen name="CaptureLink" component={CapturePlaceholder} />
      <Stack.Screen name="CaptureFile" component={CapturePlaceholder} />
    </Stack.Navigator>
  );
}
