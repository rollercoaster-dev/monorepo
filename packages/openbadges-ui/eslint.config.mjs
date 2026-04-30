import { vue } from '@rollercoaster-dev/shared-config/eslint';

export default [
  ...vue,
  {
    ignores: ['dist/**', 'histoire-dist/**', 'node_modules/**', 'coverage/**', '*.d.ts'],
  },
  {
    files: ['**/*.ts', '**/*.vue'],
    rules: {
      // UI package: must not import from apps
      // See docs/architecture/overview.md#prohibited-import-directions
      'no-restricted-imports': [
        'error',
        {
          paths: [
            {
              name: '@rollercoaster-dev/openbadges-core',
              message: 'openbadges-ui must not import openbadges-core (UI layer should not depend on core). See docs/architecture/overview.md',
            },
          ],
        },
      ],
    },
  },
  {
    // Node.js config files
    files: ['*.config.ts', '*.config.js', 'vite.config.ts', 'vitest.config.ts', 'histoire.config.ts'],
    languageOptions: {
      globals: {
        __dirname: 'readonly',
        __filename: 'readonly',
        process: 'readonly',
        module: 'readonly',
        require: 'readonly',
      },
    },
  },
  {
    // Story and example files are dev-only demos, not production code
    files: ['**/*.story.vue', 'examples/**/*.js'],
    rules: {
      'no-console': 'off',
    },
  },
];
