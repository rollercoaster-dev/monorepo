/**
 * ESLint configuration for openbadges-types
 * Uses shared config from @rollercoaster-dev/shared-config
 */

import { node } from '@rollercoaster-dev/shared-config/eslint';

export default [
  {
    ignores: [
      'dist/**',
      'coverage/**',
      'node_modules/**',
      '*.tsbuildinfo',
      'examples/**', // Examples are documentation, not production code
    ],
  },
  ...node,
  {
    files: ['**/*.ts'],
    rules: {
      // Allow namespace for Open Badges type organization
      '@typescript-eslint/no-namespace': ['error', { allowDeclarations: true }],
      // Foundation package: must not import any workspace packages
      // See docs/architecture/overview.md#prohibited-import-directions
      'no-restricted-imports': [
        'error',
        {
          paths: [
            {
              name: '@rollercoaster-dev/rd-logger',
              message: 'openbadges-types is a foundation package and must not import workspace packages. See docs/architecture/overview.md',
            },
            {
              name: '@rollercoaster-dev/openbadges-core',
              message: 'openbadges-types is a foundation package and must not import workspace packages. See docs/architecture/overview.md',
            },
            {
              name: 'openbadges-ui',
              message: 'openbadges-types is a foundation package and must not import workspace packages. See docs/architecture/overview.md',
            },
            {
              name: '@rollercoaster-dev/design-tokens',
              message: 'openbadges-types is a foundation package and must not import workspace packages. See docs/architecture/overview.md',
            },
          ],
        },
      ],
    },
  },
  {
    files: ['**/*.test.ts', '**/*.spec.ts', '**/__tests__/**/*.ts'],
    languageOptions: {
      globals: {
        // Bun test environment
        describe: 'readonly',
        it: 'readonly',
        test: 'readonly',
        expect: 'readonly',
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
