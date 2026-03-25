/**
 * ESLint configuration for @rollercoaster-dev/rd-logger
 * Uses shared config from @rollercoaster-dev/shared-config
 */

import { node } from '@rollercoaster-dev/shared-config/eslint';

export default [
  {
    ignores: ['dist/**', 'coverage/**', 'node_modules/**', '*.tsbuildinfo'],
  },
  ...node,
  {
    files: ['**/*.ts'],
    rules: {
      // We use 'any' in some places for flexibility with middleware integrations
      '@typescript-eslint/no-explicit-any': 'off',

      // Allow namespace for declaration merging
      '@typescript-eslint/no-namespace': ['error', { allowDeclarations: true }],

      // Foundation package: must not import any workspace packages
      // See docs/architecture/overview.md#prohibited-import-directions
      'no-restricted-imports': [
        'error',
        {
          paths: [
            {
              name: 'openbadges-types',
              message: 'rd-logger is a foundation package and must not import workspace packages. See docs/architecture/overview.md',
            },
            {
              name: '@rollercoaster-dev/openbadges-core',
              message: 'rd-logger is a foundation package and must not import workspace packages. See docs/architecture/overview.md',
            },
            {
              name: 'openbadges-ui',
              message: 'rd-logger is a foundation package and must not import workspace packages. See docs/architecture/overview.md',
            },
            {
              name: '@rollercoaster-dev/design-tokens',
              message: 'rd-logger is a foundation package and must not import workspace packages. See docs/architecture/overview.md',
            },
          ],
        },
      ],
    },
  },
  {
    // rd-logger IS the logging implementation — transports and adapters legitimately use console.*
    files: ['**/transports/**/*.ts', '**/adapters/**/*.ts'],
    rules: {
      'no-console': 'off',
    },
  },
  {
    files: ['**/*.test.ts', '**/*.spec.ts', '**/__tests__/**/*.ts'],
    languageOptions: {
      globals: {
        // Jest test environment
        describe: 'readonly',
        it: 'readonly',
        expect: 'readonly',
        jest: 'readonly',
        beforeEach: 'readonly',
        afterEach: 'readonly',
        beforeAll: 'readonly',
        afterAll: 'readonly',
        // Node.js globals for tests
        console: 'readonly',
        setTimeout: 'readonly',
        clearTimeout: 'readonly',
        setInterval: 'readonly',
        clearInterval: 'readonly',
        URL: 'readonly',
      },
    },
  },
];
