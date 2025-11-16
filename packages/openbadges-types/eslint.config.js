import globals from 'globals';
import jest from 'eslint-plugin-jest';
import tseslint from '@typescript-eslint/eslint-plugin';
import tsParser from '@typescript-eslint/parser';

export default [
  {
    ignores: ['dist/**/*', 'node_modules/**/*'],
  },
  {
    files: ['src/**/*.{ts,tsx}', 'test/**/*.{ts,tsx}'],
    languageOptions: {
      parser: tsParser,
      parserOptions: {
        project: './tsconfig.json',
        sourceType: 'module',
      },
      globals: {
        ...globals.node,
        ...globals.jest,
        console: 'readonly',
      },
    },
    plugins: { jest, '@typescript-eslint': tseslint },
    rules: {
      ...jest.configs.recommended.rules,
      ...tseslint.configs.recommended.rules,
      '@typescript-eslint/no-explicit-any': 'error',
      '@typescript-eslint/no-unused-vars': [
        'error',
        { argsIgnorePattern: '^_', varsIgnorePattern: '^_' },
      ],
    },
  },
  {
    files: ['src/**/*.{js,jsx}', 'test/**/*.{js,jsx}'],
    languageOptions: {
      globals: {
        ...globals.node,
        ...globals.jest,
        console: 'readonly',
      },
    },
    plugins: { jest },
    rules: {
      ...jest.configs.recommended.rules,
    },
  },
];
