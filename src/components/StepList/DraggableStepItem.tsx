import React from 'react';
import { View } from 'react-native';
import { Gesture, GestureDetector } from 'react-native-gesture-handler';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withTiming,
  runOnJS,
} from 'react-native-reanimated';
import type { AnimationPref } from '../../hooks/useAnimationPref';
import { getTimingConfig } from '../../utils/animation';
import { Checkbox } from '../Checkbox';
import { IconButton } from '../IconButton';
import { Text } from '../Text';
import { styles } from './StepList.styles';
import type { Step } from './StepList';

export interface DraggableStepItemProps {
  step: Step;
  index: number;
  isBeingDragged: boolean;
  onToggleStep: (id: string) => void;
  onLabelPress?: (step: Step) => void;
  onDragStart: (index: number) => void;
  onDragMove: (translationY: number) => void;
  onDragEnd: () => void;
  onDeleteStep?: () => void;
  onMoveUp?: () => void;
  onMoveDown?: () => void;
  showAccessibleControls: boolean;
  animationPref: AnimationPref;
  isFirst: boolean;
  isLast: boolean;
  editContent: React.ReactNode;
}

export function DraggableStepItem({
  step,
  index,
  isBeingDragged,
  onToggleStep,
  onLabelPress,
  onDragStart,
  onDragMove,
  onDragEnd,
  onDeleteStep,
  onMoveUp,
  onMoveDown,
  showAccessibleControls,
  animationPref,
  isFirst,
  isLast,
  editContent,
}: DraggableStepItemProps) {
  const translateY = useSharedValue(0);
  const scale = useSharedValue(1);
  const isDragging = useSharedValue(false);

  const timingQuick = getTimingConfig(animationPref, 'quick');
  const timingNormal = getTimingConfig(animationPref, 'normal');

  const noAnimation = animationPref === 'none';

  function resetDragState() {
    'worklet';
    translateY.value = noAnimation ? 0 : withTiming(0, timingNormal);
    scale.value = noAnimation ? 1 : withTiming(1, timingQuick);
    isDragging.value = false;
    runOnJS(onDragEnd)();
  }

  const longPress = Gesture.LongPress()
    .minDuration(400)
    .onStart(() => {
      isDragging.value = true;
      scale.value = noAnimation ? 1.02 : withTiming(1.02, timingQuick);
      runOnJS(onDragStart)(index);
    });

  const pan = Gesture.Pan()
    .manualActivation(true)
    .onTouchesMove((_e, stateManager) => {
      if (isDragging.value) {
        stateManager.activate();
      } else {
        stateManager.fail();
      }
    })
    .onUpdate((e) => {
      translateY.value = e.translationY;
      runOnJS(onDragMove)(e.translationY);
    })
    .onEnd(resetDragState)
    .onFinalize(resetDragState);

  const composed = Gesture.Simultaneous(longPress, pan);

  const animatedStyle = useAnimatedStyle(() => ({
    transform: [
      { translateY: translateY.value },
      { scale: scale.value },
    ],
    zIndex: isDragging.value ? 100 : 0,
  }));

  return (
    <GestureDetector gesture={composed}>
      <Animated.View
        style={[
          styles.draggableItem,
          isBeingDragged && styles.draggingItem,
          animatedStyle,
        ]}
      >
        {editContent ? (
          editContent
        ) : (
          <View style={styles.stepRow}>
            <View style={styles.stepContent}>
              <Checkbox
                checked={step.completed}
                onToggle={() => onToggleStep(step.id)}
                label={step.title}
                onLabelPress={onLabelPress ? () => onLabelPress(step) : undefined}
              />
            </View>
            {showAccessibleControls && (
              <View style={styles.reorderButtons}>
                {onMoveUp && !isFirst && (
                  <IconButton
                    icon={<Text variant="body">↑</Text>}
                    onPress={onMoveUp}
                    size="sm"
                    accessibilityLabel={`Move "${step.title}" up`}
                  />
                )}
                {onMoveDown && !isLast && (
                  <IconButton
                    icon={<Text variant="body">↓</Text>}
                    onPress={onMoveDown}
                    size="sm"
                    accessibilityLabel={`Move "${step.title}" down`}
                  />
                )}
                {onDeleteStep && (
                  <IconButton
                    icon={<Text variant="body">✕</Text>}
                    onPress={onDeleteStep}
                    size="sm"
                    variant="destructive"
                    accessibilityLabel={`Delete "${step.title}"`}
                  />
                )}
              </View>
            )}
          </View>
        )}
      </Animated.View>
    </GestureDetector>
  );
}
