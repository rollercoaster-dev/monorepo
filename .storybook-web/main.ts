import type { StorybookConfig } from '@storybook/react-native-web-vite';

const config: StorybookConfig = {
  stories: ['../src/**/*.stories.?(ts|tsx)'],
  framework: {
    name: '@storybook/react-native-web-vite',
    options: {
      modulesToTranspile: [
        'react-native-reanimated',
        'react-native-gesture-handler',
        'react-native-safe-area-context',
        'react-native-screens',
        'react-native-svg',
        'react-native-unistyles',
        '@react-navigation',
        '@rollercoaster-dev/design-tokens',
        'expo-haptics',
        'expo-font',
        'expo-modules-core',
        'expo-secure-store',
        'expo-sqlite',
        'expo-file-system',
        'expo-document-picker',
        'expo-image-picker',
        'expo-camera',
        'expo-video',
        'expo-audio',
        'expo-sharing',
        'expo-status-bar',
      ],
      pluginReactOptions: {
        babel: {
          plugins: [
            ['react-native-unistyles/plugin', { root: 'src' }],
          ],
        },
      },
    },
  },
  staticDirs: ['../public'],
};

export default config;
