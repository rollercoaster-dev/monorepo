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
