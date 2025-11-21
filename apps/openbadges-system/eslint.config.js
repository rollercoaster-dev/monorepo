import js from '@eslint/js'
import vue from 'eslint-plugin-vue'
import ts from '@typescript-eslint/eslint-plugin'
import tsParser from '@typescript-eslint/parser'
import vueParser from 'vue-eslint-parser'
import prettierConfig from 'eslint-config-prettier'

export default [
  // Base JavaScript rules
  js.configs.recommended,

  // Vue recommended rules
  ...vue.configs['flat/recommended'],

  // Prettier config to disable conflicting rules
  prettierConfig,

  // Global configuration for browser environment
  {
    files: ['src/client/**/*.{ts,js,vue}'],
    languageOptions: {
      globals: {
        console: 'readonly',
        window: 'readonly',
        document: 'readonly',
        navigator: 'readonly',
        localStorage: 'readonly',
        fetch: 'readonly',
        URL: 'readonly',
        URLSearchParams: 'readonly',
        btoa: 'readonly',
        atob: 'readonly',
        crypto: 'readonly',
        TextEncoder: 'readonly',
        Headers: 'readonly',
        Request: 'readonly',
        Response: 'readonly',
        ReadableStream: 'readonly',
        RequestInit: 'readonly',
        Blob: 'readonly',
        Event: 'readonly',
        HTMLElement: 'readonly',
        KeyboardEvent: 'readonly',
        setTimeout: 'readonly',
        confirm: 'readonly',
        prompt: 'readonly',
        PublicKeyCredential: 'readonly',
        AuthenticatorTransport: 'readonly',
        PublicKeyCredentialParameters: 'readonly',
        AttestationConveyancePreference: 'readonly',
        PublicKeyCredentialDescriptor: 'readonly',
        AuthenticatorSelectionCriteria: 'readonly',
        UserVerificationRequirement: 'readonly',
        PublicKeyCredentialCreationOptions: 'readonly',
        AuthenticatorAttestationResponse: 'readonly',
        PublicKeyCredentialRequestOptions: 'readonly',
        AuthenticatorAssertionResponse: 'readonly',
        AuthenticatorAttachment: 'readonly',
        // Vue auto-imports
        ref: 'readonly',
        reactive: 'readonly',
        computed: 'readonly',
        watch: 'readonly',
        watchEffect: 'readonly',
        onMounted: 'readonly',
        onUnmounted: 'readonly',
        nextTick: 'readonly',
        useRoute: 'readonly',
        useRouter: 'readonly',
        RouterLink: 'readonly',
        RouterView: 'readonly',
      },
    },
  },

  // Node.js environment for server files
  {
    files: ['src/server/**/*.ts', 'database/**/*.ts', 'scripts/**/*.ts', '*.ts'],
    languageOptions: {
      globals: {
        console: 'readonly',
        process: 'readonly',
        __dirname: 'readonly',
        __filename: 'readonly',
        Buffer: 'readonly',
        global: 'readonly',
        URL: 'readonly',
        btoa: 'readonly',
        atob: 'readonly',
        fetch: 'readonly',
        Headers: 'readonly',
        Request: 'readonly',
        Response: 'readonly',
        ReadableStream: 'readonly',
      },
    },
  },

  // Test environment
  {
    files: ['**/*.test.ts', '**/*.spec.ts', 'src/test/**/*.ts'],
    languageOptions: {
      globals: {
        console: 'readonly',
        global: 'readonly',
        localStorage: 'readonly',
        window: 'readonly',
        document: 'readonly',
        fetch: 'readonly',
        Headers: 'readonly',
        Request: 'readonly',
        Response: 'readonly',
        ReadableStream: 'readonly',
        URL: 'readonly',
        vi: 'readonly',
        describe: 'readonly',
        it: 'readonly',
        test: 'readonly',
        expect: 'readonly',
        beforeEach: 'readonly',
        afterEach: 'readonly',
        beforeAll: 'readonly',
        afterAll: 'readonly',
      },
    },
  },

  // TypeScript files
  {
    files: ['**/*.ts', '**/*.tsx'],
    languageOptions: {
      parser: tsParser,
      parserOptions: {
        ecmaVersion: 'latest',
        sourceType: 'module',
      },
    },
    plugins: {
      '@typescript-eslint': ts,
    },
    rules: {
      '@typescript-eslint/no-unused-vars': ['error', { argsIgnorePattern: '^_' }],
      '@typescript-eslint/no-explicit-any': 'warn',
      'no-unused-vars': 'off', // Turn off base rule as it can conflict with TypeScript rule
    },
  },

  // Vue files with TypeScript
  {
    files: ['**/*.vue'],
    languageOptions: {
      parser: vueParser,
      parserOptions: {
        parser: tsParser,
        ecmaVersion: 'latest',
        sourceType: 'module',
        extraFileExtensions: ['.vue'],
      },
    },
    plugins: {
      vue,
      '@typescript-eslint': ts,
    },
    rules: {
      'vue/multi-word-component-names': 'off',
      'vue/no-v-html': 'warn',
      'vue/component-definition-name-casing': ['error', 'PascalCase'],
      'vue/component-name-in-template-casing': ['error', 'PascalCase'],
      'vue/attributes-order': 'warn',
      '@typescript-eslint/no-unused-vars': ['error', { argsIgnorePattern: '^_' }],
      'no-unused-vars': 'off',
      // Enforce block order: template, script, style
      'vue/block-order': ['error', { order: ['template', 'script', 'style'] }],
    },
  },

  // GitHub Actions Node.js files
  {
    files: ['.github/actions/**/*.js'],
    languageOptions: {
      globals: {
        console: 'readonly',
        process: 'readonly',
        __dirname: 'readonly',
        __filename: 'readonly',
        Buffer: 'readonly',
        global: 'readonly',
        require: 'readonly',
        module: 'readonly',
        exports: 'readonly',
      },
      ecmaVersion: 2021,
      sourceType: 'script',
    },
    rules: {
      'no-console': 'off',
      'no-unused-vars': [
        'error',
        {
          argsIgnorePattern: '^_',
          varsIgnorePattern: '^_',
        },
      ],
    },
  },

  // Node/CommonJS scripts (cjs/js) in scripts directory
  {
    files: ['scripts/**/*.{js,cjs,mjs}'],
    languageOptions: {
      globals: {
        console: 'readonly',
        process: 'readonly',
        __dirname: 'readonly',
        __filename: 'readonly',
        Buffer: 'readonly',
        global: 'readonly',
        require: 'readonly',
        module: 'readonly',
        exports: 'readonly',
      },
      ecmaVersion: 2021,
      sourceType: 'script',
    },
    rules: {
      'no-console': 'off',
      // Allow unused vars if prefixed with _; warn otherwise
      'no-unused-vars': [
        'warn',
        {
          argsIgnorePattern: '^_',
          varsIgnorePattern: '^_',
        },
      ],
      // Allow lexical declarations in case blocks for Node scripts
      'no-case-declarations': 'off',
      // Some scripts run in Node contexts where globals are provided
      'no-undef': 'off',
    },
  },

  // Global ignores
  {
    ignores: [
      'node_modules/**',
      'dist/**',
      'build/**',
      '.nuxt/**',
      '*.min.js',
      'public/**',
      'coverage/**',
      'openbadges_server_data/**',
      'data/**',
      'eslint.config.js',
      'vite.config.js',
      'vitest.config.ts',
      'tailwind.config.js',
      'postcss.config.cjs',
      'commitlint.config.js',
      // Auto-generated files
      'src/client/auto-imports.d.ts',
      'src/client/components.d.ts',
      'src/client/typed-router.d.ts',
    ],
  },

  // Test files configuration - allow any type for mocking and test data
  {
    files: [
      '**/*.test.ts',
      '**/*.test.js',
      '**/test/**/*.ts',
      '**/test/**/*.js',
      '**/__tests__/**/*.ts',
      '**/__tests__/**/*.js',
    ],
    rules: {
      '@typescript-eslint/no-explicit-any': 'off', // Allow any type in tests for flexibility with mocks
    },
  },

  // Prettier config at the end to override any conflicting rules
  prettierConfig,
]
