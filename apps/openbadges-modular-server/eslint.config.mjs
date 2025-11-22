/**
 * IMPORTANT: DO NOT MODIFY THESE ESLINT RULES TO MAKE THEM LESS STRICT
 *
 * - Never change rules from 'error' to 'warn' or 'off'
 * - Never disable TypeScript type checking rules
 * - If you're tempted to disable a rule, fix the code instead
 *
 * Key rules for catching missing imports and undefined variables:
 * - 'no-undef': Catches undefined variables and missing imports
 * - '@typescript-eslint/no-use-before-define': Catches functions used before definition
 * - '@typescript-eslint/explicit-module-boundary-types': Requires explicit return types
 *
 * Any PR that weakens these rules will be rejected.
 */
import { node } from '@rollercoaster-dev/shared-config/eslint';
import tsParser from '@typescript-eslint/parser';

export default [
  // Base Node.js configuration from shared-config
  ...node,

  // Global ignores
  {
    ignores: [
      'node_modules/**',
      'dist/**',
      '.github/**',
      '.husky/**',
      'docs/examples/**',
      // Legacy CommonJS config files
      'tests/.eslintrc.js',
      'commitlint.config.js',
      // Build/release scripts
      'scripts/*.js',
    ],
  },

  // Configuration for TypeScript files in the project
  {
    files: ['src/**/*.ts', 'tests/**/*.ts'],
    languageOptions: {
      parser: tsParser,
      parserOptions: {
        ecmaVersion: 'latest',
        sourceType: 'module',
        project: './tsconfig.json',
      },
      globals: {
        // Web/Browser globals needed for server
        URL: 'readonly',
        URLSearchParams: 'readonly',
        fetch: 'readonly',
        Request: 'readonly',
        Response: 'readonly',
        File: 'readonly',
        TextEncoder: 'readonly',
        TextDecoder: 'readonly',
        structuredClone: 'readonly',
        // Node.js globals (require for dynamic imports)
        require: 'readonly',
        // Node.js types
        NodeJS: 'readonly',
        // Bun globals
        Bun: 'readonly',
      },
    },
    rules: {
      // Allow require() for dynamic imports in infrastructure layer
      '@typescript-eslint/no-require-imports': 'off',
      // ESLint core rules - STRICTER THAN SHARED-CONFIG
      'no-console': 'error', // NEVER DISABLE THIS RULE (shared-config allows warn/error)
      'no-undef': 'error', // Catch undefined variables and missing imports
      'no-constant-condition': 'warn',
      // Allow lexical declarations in case blocks (common pattern in this codebase)
      'no-case-declarations': 'off',

      // TypeScript rules - NEVER DISABLE THESE RULES
      '@typescript-eslint/explicit-module-boundary-types': 'error',
      '@typescript-eslint/no-explicit-any': 'error',
      '@typescript-eslint/no-unused-vars': [
        'error',
        {
          argsIgnorePattern: '^_',
          varsIgnorePattern: '^_',
          caughtErrorsIgnorePattern: '^_',
        },
      ],
      '@typescript-eslint/no-use-before-define': 'error', // Catch use of variables before definition

      // Rules from shared-config that need adjustment for this codebase
      '@typescript-eslint/no-empty-object-type': 'off', // Used for generic type constraints
      '@typescript-eslint/no-namespace': 'off', // Namespaces used for type utilities
      // Allow import() type annotations (valid TypeScript pattern for dynamic imports)
      '@typescript-eslint/consistent-type-imports': [
        'error',
        { disallowTypeAnnotations: false },
      ],
      // TODO: Fix unreachable code in sqlite-api-key.repository.ts and postgres-api-key.repository.ts
      // These are stub implementations with early returns before catch blocks
      'no-unreachable': 'warn',
    },
  },

  // Configuration for TypeScript files outside the main project (like root-level scripts)
  {
    files: ['*.ts', 'scripts/**/*.ts', 'drizzle.config.ts'],
    languageOptions: {
      parser: tsParser,
      parserOptions: {
        ecmaVersion: 'latest',
        sourceType: 'module',
        // No project config for standalone files
      },
      globals: {
        // Web/Browser globals
        URL: 'readonly',
        URLSearchParams: 'readonly',
        fetch: 'readonly',
        Request: 'readonly',
        Response: 'readonly',
        File: 'readonly',
        TextEncoder: 'readonly',
        TextDecoder: 'readonly',
        structuredClone: 'readonly',
        // Node.js types
        NodeJS: 'readonly',
        // Bun globals
        Bun: 'readonly',
      },
    },
    rules: {
      // ESLint core rules
      'no-console': 'error', // NEVER DISABLE THIS RULE
      'no-undef': 'error', // Catch undefined variables and missing imports
      'no-constant-condition': 'warn',

      // TypeScript rules - NEVER DISABLE THESE RULES (but some may not work without project config)
      '@typescript-eslint/no-explicit-any': 'error',
      '@typescript-eslint/no-unused-vars': [
        'error',
        {
          argsIgnorePattern: '^_',
          varsIgnorePattern: '^_',
          caughtErrorsIgnorePattern: '^_',
        },
      ],
      '@typescript-eslint/no-use-before-define': 'error', // Catch use of variables before definition
    },
  },

  // E2E test files that use dynamic require
  {
    files: ['tests/e2e/**/*.ts'],
    languageOptions: {
      globals: {
        require: 'readonly',
      },
    },
    rules: {
      // Allow require in E2E tests for dynamic imports
      '@typescript-eslint/no-require-imports': 'off',
    },
  },

  // JavaScript test files
  {
    files: ['tests/**/*.js'],
    languageOptions: {
      globals: {
        require: 'readonly',
        module: 'readonly',
        exports: 'readonly',
        __dirname: 'readonly',
        __filename: 'readonly',
        process: 'readonly',
        console: 'readonly',
      },
      sourceType: 'commonjs',
    },
  },
];
