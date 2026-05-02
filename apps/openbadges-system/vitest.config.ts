import { defineConfig } from 'vitest/config'
import vue from '@vitejs/plugin-vue'
import { dirname, resolve } from 'path'
import { fileURLToPath } from 'url'

const __dirname = dirname(fileURLToPath(import.meta.url))

// Client-focused config; server tests use vitest.server.config.ts
export default defineConfig({
  plugins: [vue()],
  resolve: {
    alias: {
      '@': resolve(__dirname, './src/client'),
    },
  },
  test: {
    globals: true,
    environment: 'jsdom',
    setupFiles: ['./src/test/setup.ts'],
    include: ['src/client/**/*.{test,spec}.ts?(x)', 'src/test/integration/**/*.{test,spec}.ts?(x)'],
    exclude: ['src/server/**'],
    coverage: {
      provider: 'istanbul',
      reporter: ['text', 'json', 'html'],
      exclude: [
        'node_modules/',
        'src/test/**',
        'src/server/**',
        '**/*.d.ts',
        '**/*.config.{js,ts}',
        // App entry point: imports `vue-router/auto-routes`, a virtual module
        // provided by unplugin-vue-router. Bun's resolver hits vue-router 5's
        // strict exports map before the plugin can intercept, so istanbul
        // instrumentation fails when it walks main.ts.
        'src/client/main.ts',
      ],
    },
  },
})
