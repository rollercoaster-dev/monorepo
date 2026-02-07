const { getDefaultConfig } = require('expo/metro-config');
const { withStorybook } = require('@storybook/react-native/metro/withStorybook');
const path = require('path');

const designTokensPath = path.resolve(
  __dirname,
  '../monorepo/packages/design-tokens'
);

/** @type {import('expo/metro-config').MetroConfig} */
const config = getDefaultConfig(__dirname);

// Follow the symlink into the monorepo so Metro can resolve design-tokens
config.watchFolders = [designTokensPath];
config.resolver.nodeModulesPaths = [path.resolve(__dirname, 'node_modules')];
// Ensure Metro respects package.json "exports" for subpath imports like
// @rollercoaster-dev/design-tokens/unistyles and follows symlinks correctly.
config.resolver.unstable_enablePackageExports = true;
config.resolver.unstable_enableSymlinks = true;

module.exports = withStorybook(config, {
  configPath: path.resolve(__dirname, './.storybook'),
  enabled: process.env.EXPO_PUBLIC_STORYBOOK_ENABLED === 'true',
});
