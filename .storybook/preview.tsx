import type { Preview } from '@storybook/react';
import React from 'react';
import { View } from 'react-native';
import { StyleSheet, UnistylesRuntime } from 'react-native-unistyles';
import { themeNames, type ThemeName } from '../src/themes';

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const themeDecorator = (Story: React.ComponentType, context: any) => {
  const selectedTheme = context.globals?.theme as ThemeName | undefined;

  React.useEffect(() => {
    if (selectedTheme && themeNames.includes(selectedTheme)) {
      UnistylesRuntime.setTheme(selectedTheme);
    }
  }, [selectedTheme]);

  return (
    <View style={styles.container}>
      <Story />
    </View>
  );
};

const styles = StyleSheet.create((theme) => ({
  container: {
    flex: 1,
    backgroundColor: theme.colors.background,
    padding: theme.space[4],
  },
}));

const preview: Preview = {
  decorators: [themeDecorator],
  globalTypes: {
    theme: {
      name: 'Theme',
      description: 'Select a theme combination',
      toolbar: {
        icon: 'paintbrush',
        items: themeNames.map((name) => ({ value: name, title: name })),
        dynamicTitle: true,
      },
    },
  },
  globals: {
    theme: 'light-default',
  },
};

export default preview;
