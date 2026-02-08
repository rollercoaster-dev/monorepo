const { getDefaultConfig } = require('expo/metro-config');
const { withStorybook } = require('@storybook/react-native/metro/withStorybook');
const path = require('path');

/** @type {import('expo/metro-config').MetroConfig} */
const config = getDefaultConfig(__dirname);

// Ensure Metro respects package.json "exports" for subpath imports like
// @rollercoaster-dev/design-tokens/unistyles
config.resolver.unstable_enablePackageExports = true;


// Evolu: allow .wasm assets to be bundled
config.resolver.assetExts = [...(config.resolver.assetExts ?? []), 'wasm'];

// Evolu: COOP/COEP headers required for SharedArrayBuffer (web only)
config.server = {
  ...config.server,
  enhanceMiddleware: (middleware) => (req, res, next) => {
    res.setHeader('Cross-Origin-Opener-Policy', 'same-origin');
    res.setHeader('Cross-Origin-Embedder-Policy', 'require-corp');
    return middleware(req, res, next);
  },
};

module.exports = withStorybook(config, {
  configPath: path.resolve(__dirname, './.storybook'),
  enabled: process.env.EXPO_PUBLIC_STORYBOOK_ENABLED === 'true',
});
