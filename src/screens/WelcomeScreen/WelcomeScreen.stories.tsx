import React from 'react';
import { WelcomeScreen } from './WelcomeScreen';

export default {
  title: 'Screens/WelcomeScreen',
  component: WelcomeScreen,
};

export function Default() {
  return (
    <WelcomeScreen
      onGetStarted={() => console.log('Get started')}
    />
  );
}

export function WithoutThemeSelector() {
  return (
    <WelcomeScreen
      onGetStarted={() => console.log('Get started')}
      showThemeSelector={false}
    />
  );
}
