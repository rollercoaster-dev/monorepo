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
