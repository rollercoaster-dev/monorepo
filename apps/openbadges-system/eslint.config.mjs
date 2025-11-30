import { vue } from '@rollercoaster-dev/shared-config/eslint';

export default [
  // Base Vue configuration from shared-config
  ...vue,

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
      'eslint.config.mjs',
      'vite.config.js',
      'vitest.config.ts',
      'vitest.client.config.ts',
      'vitest.server.config.ts',
      'tailwind.config.js',
      'postcss.config.cjs',
      'commitlint.config.js',
      // Auto-generated files
      'src/client/auto-imports.d.ts',
      'src/client/components.d.ts',
      'src/client/typed-router.d.ts',
      // Type declaration files (often have necessary any types)
      'src/types/**/*.d.ts',
    ],
  },

  // Browser environment with Vue auto-imports for client files
  {
    files: ['src/client/**/*.{ts,js,vue}'],
    languageOptions: {
      globals: {
        // Additional browser globals not in shared-config
        localStorage: 'readonly',
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
        confirm: 'readonly',
        prompt: 'readonly',
        // WebAuthn types
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

  // Node.js/Bun environment for server files
  {
    files: ['src/server/**/*.ts', 'database/**/*.ts', 'scripts/**/*.ts', '*.ts'],
    languageOptions: {
      globals: {
        process: 'readonly',
        __dirname: 'readonly',
        __filename: 'readonly',
        Buffer: 'readonly',
        global: 'readonly',
        btoa: 'readonly',
        atob: 'readonly',
        Headers: 'readonly',
        Request: 'readonly',
        Response: 'readonly',
        ReadableStream: 'readonly',
        console: 'readonly',
        Bun: 'readonly',
      },
    },
  },

  // Test environment
  {
    files: ['**/*.test.ts', '**/*.spec.ts', 'src/test/**/*.ts'],
    languageOptions: {
      globals: {
        global: 'readonly',
        localStorage: 'readonly',
        Headers: 'readonly',
        Request: 'readonly',
        Response: 'readonly',
        ReadableStream: 'readonly',
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
    rules: {
      '@typescript-eslint/no-explicit-any': 'off', // Allow any type in tests for flexibility with mocks
    },
  },

  // Vue files override - use template-first block order (project preference)
  {
    files: ['**/*.vue'],
    rules: {
      // Override shared-config's block order to match project convention
      'vue/component-tags-order': 'off',
      'vue/block-order': ['error', { order: ['template', 'script', 'style'] }],
      'vue/component-definition-name-casing': ['error', 'PascalCase'],
      'vue/component-name-in-template-casing': ['error', 'PascalCase'],
      'vue/attributes-order': 'warn',
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
      'no-unused-vars': [
        'warn',
        {
          argsIgnorePattern: '^_',
          varsIgnorePattern: '^_',
        },
      ],
      // Allow lexical declarations in case blocks (common pattern in this codebase)
      'no-case-declarations': 'off',
      'no-undef': 'off',
    },
  },
];
