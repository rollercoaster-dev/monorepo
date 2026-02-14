import React from 'react';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { GoalsScreen } from '../screens/GoalsScreen';
import { GoalDetailScreen } from '../screens/GoalDetailScreen';
import { FocusModeScreen } from '../screens/FocusModeScreen';
import { NewGoalModal } from '../screens/NewGoalModal';
import { CapturePhoto } from '../screens/CapturePhoto';
import { CapturePlaceholder } from '../screens/CapturePlaceholder';
import { CaptureVideoScreen } from '../screens/CaptureVideoScreen';
import { VoiceMemoScreen } from '../screens/VoiceMemoScreen';
import { CaptureFile } from '../screens/CaptureFile';
import { CaptureLinkScreen } from '../screens/CaptureLinkScreen';
import { CaptureTextNote } from '../screens/CaptureTextNote';
import { EditModeScreen } from '../screens/EditModeScreen';
import type { GoalsStackParamList } from './types';

const Stack = createNativeStackNavigator<GoalsStackParamList>();

export function GoalsStack() {
  return (
    <Stack.Navigator screenOptions={{ headerShown: false }}>
      <Stack.Screen name="Goals" component={GoalsScreen} />
      <Stack.Screen name="GoalDetail" component={GoalDetailScreen} />
      <Stack.Screen name="FocusMode" component={FocusModeScreen} />
      <Stack.Screen
        name="NewGoal"
        component={NewGoalModal}
        options={{ presentation: 'modal' }}
      />
      <Stack.Screen name="CapturePhoto" component={CapturePhoto} />
      <Stack.Screen name="CaptureVideo" component={CaptureVideoScreen} />
      <Stack.Screen name="CaptureVoiceMemo" component={VoiceMemoScreen} />
      <Stack.Screen name="CaptureTextNote" component={CaptureTextNote} />
      <Stack.Screen name="CaptureLink" component={CaptureLinkScreen} />
      <Stack.Screen name="CaptureFile" component={CaptureFile} />
      <Stack.Screen name="EditMode" component={EditModeScreen} />
    </Stack.Navigator>
  );
}
