import React, { useState } from 'react';
import { View } from 'react-native';
import { Button } from '../../components/Button';
import { CelebrationModal } from './CelebrationModal';

export default {
  title: 'Screens/CelebrationModal',
  component: CelebrationModal,
};

export function GoalCompleted() {
  const [visible, setVisible] = useState(false);

  return (
    <View style={{ padding: 16 }}>
      <Button label="Show Modal" onPress={() => setVisible(true)} />
      <CelebrationModal
        visible={visible}
        onDismiss={() => setVisible(false)}
        title="Goal Completed!"
        message="You've earned your first badge."
        icon="🎉"
        actionLabel="View Badge"
        onAction={() => {
          setVisible(false);
          console.log('Navigate to badge');
        }}
      />
    </View>
  );
}

export function BadgeEarned() {
  const [visible, setVisible] = useState(false);

  return (
    <View style={{ padding: 16 }}>
      <Button label="Show Modal" onPress={() => setVisible(true)} />
      <CelebrationModal
        visible={visible}
        onDismiss={() => setVisible(false)}
        title="First one. (noted.)"
        icon="⭐"
      />
    </View>
  );
}

export function SimpleSuccess() {
  const [visible, setVisible] = useState(false);

  return (
    <View style={{ padding: 16 }}>
      <Button label="Show Modal" onPress={() => setVisible(true)} />
      <CelebrationModal
        visible={visible}
        onDismiss={() => setVisible(false)}
        title="All set!"
        message="Your changes have been saved."
      />
    </View>
  );
}
