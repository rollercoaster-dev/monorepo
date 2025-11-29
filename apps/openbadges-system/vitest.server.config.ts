import { defineConfig } from 'vitest/config'
import { resolve } from 'path'

export default defineConfig({
  resolve: {
    alias: {
      'bun:sqlite': resolve(__dirname, './src/server/test-stubs/bun-sqlite.ts'),
    },
  },
  test: {
    globals: true,
    environment: 'node',
    setupFiles: ['./src/server/test.setup.ts'],
    include: ['src/server/**/*.{test,spec}.ts?(x)'],
    exclude: ['src/client/**', 'src/test/integration/**', '**/*.bun.test.ts'],
    deps: {
      // Inline zod to avoid ESM resolution issues in CI
      inline: ['zod'],
    },
  },
})
