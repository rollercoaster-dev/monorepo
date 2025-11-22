import { vue } from '@rollercoaster-dev/shared-config/eslint';

export default [
  ...vue,
  {
    ignores: ['dist/**', 'node_modules/**', 'coverage/**', '*.d.ts'],
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
];
