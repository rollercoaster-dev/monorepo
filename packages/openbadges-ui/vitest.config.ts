import { defineConfig } from 'vitest/config';
import vue from '@vitejs/plugin-vue';
import { resolve } from 'path';

export default defineConfig({
  plugins: [vue()],
  resolve: {
    alias: {
      '@': resolve(__dirname, './src'),
      '@components': resolve(__dirname, './src/components'),
      '@composables': resolve(__dirname, './src/composables'),
      '@services': resolve(__dirname, './src/services'),
      '@utils': resolve(__dirname, './src/utils'),
      '@types': resolve(__dirname, './src/types'),
    },
  },
  test: {
    // Use single-threaded mode for Bun compatibility in CI
    // Bun doesn't fully support Node.js worker_threads APIs used by vitest pools
    threads: false,
    environment: 'jsdom',
    globals: true,
    include: ['tests/**/*.{test,spec}.{js,ts,vue}'],
    setupFiles: ['tests/integration/setup.ts'],
    typecheck: {
      tsconfig: './tsconfig.test.json',
      enableSyntheticDefaultImports: true,
    },
    coverage: {
      provider: 'istanbul',
      reporter: ['text', 'json', 'html'],
      exclude: [
        'node_modules/',
        'tests/setup.ts',
        '**/*.d.ts',
        '**/*.config.{js,ts}',
        '**/histoire.{js,ts}',
      ],
    },
    deps: {
      inline: ['vue', 'primevue', '@vue/test-utils'],
    },
  },
});
