/**
 * Shared ESLint configuration for Rollercoaster.dev monorepo
 * Based on ESLint Flat Config (v9+)
 */

import js from '@eslint/js';
import typescript from '@typescript-eslint/eslint-plugin';
import typescriptParser from '@typescript-eslint/parser';
import prettier from 'eslint-config-prettier';
import vuePlugin from 'eslint-plugin-vue';
import vueParser from 'vue-eslint-parser';

/**
 * Base config for all TypeScript projects
 */
export const base = [
  js.configs.recommended,
  {
    files: ['**/*.ts', '**/*.tsx'],
    languageOptions: {
      parser: typescriptParser,
      parserOptions: {
        ecmaVersion: 'latest',
        sourceType: 'module',
      },
    },
    plugins: {
      '@typescript-eslint': typescript,
    },
    rules: {
      ...typescript.configs?.recommended?.rules,

      // Disable base rule in favor of TypeScript version
      'no-unused-vars': 'off',

      // TypeScript specific
      '@typescript-eslint/no-unused-vars': [
        'error',
        {
          argsIgnorePattern: '^_|^(e|err|error)$',
          varsIgnorePattern: '^_',
          caughtErrorsIgnorePattern: '^_|^(e|err|error)$',
        },
      ],
      '@typescript-eslint/no-explicit-any': 'warn',
      '@typescript-eslint/consistent-type-imports': 'error',

      // General
      'no-console': ['warn', { allow: ['warn', 'error'] }],
      'prefer-const': 'error',
      'no-var': 'error',
    },
  },
  prettier, // Must be last to disable conflicting rules
];

/**
 * Config for Node.js/backend projects
 */
export const node = [
  ...base,
  {
    languageOptions: {
      globals: {
        // Node.js globals
        process: 'readonly',
        Buffer: 'readonly',
        __dirname: 'readonly',
        __filename: 'readonly',
        console: 'readonly',
        setTimeout: 'readonly',
        clearTimeout: 'readonly',
        setInterval: 'readonly',
        clearInterval: 'readonly',
        setImmediate: 'readonly',
        clearImmediate: 'readonly',
        // Web APIs available in Node.js
        URL: 'readonly',
        URLSearchParams: 'readonly',
      },
    },
  },
];

/**
 * Config for Vue.js projects
 */
export const vue = [
  js.configs.recommended,
  ...vuePlugin.configs['flat/recommended'],
  {
    files: ['**/*.vue'],
    languageOptions: {
      parser: vueParser,
      parserOptions: {
        parser: typescriptParser,
        ecmaVersion: 'latest',
        sourceType: 'module',
        extraFileExtensions: ['.vue'],
      },
    },
    plugins: {
      '@typescript-eslint': typescript,
    },
    rules: {
      // Vue-specific rules
      'vue/no-mutating-props': 'error',
      'vue/require-default-prop': 'warn',
      'vue/require-prop-types': 'error',
      'vue/no-unused-components': 'error',
      'vue/no-v-html': 'warn',
      'vue/component-tags-order': ['error', { order: ['script', 'template', 'style'] }],
      'vue/multi-word-component-names': 'off',

      // Disable base rule in favor of TypeScript version
      'no-unused-vars': 'off',

      // TypeScript rules for Vue files - allow common event handler params
      '@typescript-eslint/no-unused-vars': [
        'error',
        {
          argsIgnorePattern: '^_|^(e|event|value|badge|assertion|payload|isValid|page|density)$',
          varsIgnorePattern: '^_',
          caughtErrorsIgnorePattern: '^_|^(e|err|error)$',
        },
      ],
    },
  },
  {
    files: ['**/*.ts', '**/*.tsx'],
    languageOptions: {
      parser: typescriptParser,
      parserOptions: {
        ecmaVersion: 'latest',
        sourceType: 'module',
      },
    },
    plugins: {
      '@typescript-eslint': typescript,
    },
    rules: {
      ...typescript.configs?.recommended?.rules,
      'no-unused-vars': 'off',
      '@typescript-eslint/no-unused-vars': [
        'error',
        {
          argsIgnorePattern: '^_|^(e|err|error)$',
          varsIgnorePattern: '^_',
          caughtErrorsIgnorePattern: '^_|^(e|err|error)$',
        },
      ],
      '@typescript-eslint/no-explicit-any': 'warn',
      '@typescript-eslint/consistent-type-imports': 'error',
    },
  },
  {
    languageOptions: {
      globals: {
        // Browser globals
        window: 'readonly',
        document: 'readonly',
        navigator: 'readonly',
        console: 'readonly',
        setTimeout: 'readonly',
        clearTimeout: 'readonly',
        setInterval: 'readonly',
        clearInterval: 'readonly',
        fetch: 'readonly',
        URL: 'readonly',
        URLSearchParams: 'readonly',
        // Node.js globals for build tools
        process: 'readonly',
      },
    },
  },
  {
    // General rules for all files
    rules: {
      'no-console': ['warn', { allow: ['warn', 'error'] }],
      'prefer-const': 'error',
      'no-var': 'error',
    },
  },
  prettier, // Must be last to disable conflicting rules
];

export default base;
