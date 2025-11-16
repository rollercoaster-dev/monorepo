import js from '@eslint/js';
import tseslint from '@typescript-eslint/eslint-plugin';
import tsParser from '@typescript-eslint/parser';
import prettier from 'eslint-config-prettier';
import prettierPlugin from 'eslint-plugin-prettier';
import jestPlugin from 'eslint-plugin-jest';
import globals from 'globals';

export default [
  js.configs.recommended,
  prettier,
  {
    ignores: [
      'dist/',
      'node_modules/',
      'coverage/',
      '*.d.ts',
      '*.js',
      '*.cjs',
      '*.mjs',
      '*.json',
      '*.snap',
      '*.test.*',
      'examples/',
      'test/',
      '.husky/',
      '.github/',
      '.cursor/',
    ],
    files: ['**/*.ts'],
    languageOptions: {
      parser: tsParser,
      parserOptions: {
        project: './tsconfig.json',
        sourceType: 'module',
      },
    },
    plugins: {
      '@typescript-eslint': tseslint,
      prettier: prettierPlugin,
    },
    rules: {
      'no-unused-vars': 'off',
      '@typescript-eslint/no-unused-vars': [
        'error',
        { argsIgnorePattern: '^_', varsIgnorePattern: '^_' },
      ],
      'prettier/prettier': 'error',
    },
  },
  {
    files: ['test/**/*.{ts,tsx}'],
    env: { node: true, jest: true },
    languageOptions: {
      globals: { ...globals.node, ...globals.jest, console: 'readonly' },
      parser: tsParser,
      parserOptions: { project: './tsconfig.json', sourceType: 'module' },
    },
    plugins: { jest: jestPlugin },
    rules: { ...jestPlugin.configs.recommended.rules },
  },
];
