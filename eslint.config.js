// https://docs.expo.dev/guides/using-eslint/
const { defineConfig } = require('eslint/config');
const expoConfig = require("eslint-config-expo/flat");

const localRules = {
  plugins: {
    local: {
      rules: {
        'no-raw-colors': require('./src/eslint-rules/no-raw-colors'),
        'no-component-imports-screens': require('./src/eslint-rules/no-component-imports-screens'),
        'file-size-limit': require('./src/eslint-rules/file-size-limit'),
      },
    },
  },
  rules: {
    'local/no-raw-colors': 'error',
    'local/no-component-imports-screens': 'error',
    'local/file-size-limit': 'warn',
  },
};

module.exports = defineConfig([
  expoConfig,
  localRules,
  {
    ignores: ["dist/*"],
  }
]);
