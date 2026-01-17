import { defineConfig } from 'vitest/config'
import { dirname, resolve } from 'path'
import { fileURLToPath } from 'url'

const __dirname = dirname(fileURLToPath(import.meta.url))

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
    // Clear mock call history between tests (keeps implementations)
    clearMocks: true,
    // Use forks pool for complete isolation between test files
    // This prevents mock contamination that causes flaky tests in CI
    pool: 'forks',
    // Run test files sequentially to prevent parallel mock interference
    fileParallelism: false,
    // Coverage configuration with 80% threshold for server code
    coverage: {
      provider: 'istanbul',
      enabled: false, // Only enabled when running with --coverage flag
      include: ['src/server/**/*.ts'],
      exclude: [
        'src/server/**/*.test.ts',
        'src/server/**/*.spec.ts',
        'src/server/test-stubs/**',
        'src/server/test.setup.ts',
      ],
      thresholds: {
        // Coverage thresholds - CI will fail if not met
        // Starting at 35% with plan to increase to 80% as test coverage improves
        // Related issues #553, #554, #555 add route tests that will increase coverage
        lines: 35,
        functions: 35,
        branches: 35,
        statements: 35,
      },
      reporter: ['text', 'text-summary', 'json', 'lcov'],
      reportsDirectory: './coverage/server',
    },
  },
  server: {
    deps: {
      // Inline zod to avoid ESM resolution issues in CI
      // See: https://github.com/colinhacks/zod/issues/1958
      inline: ['zod'],
    },
  },
})
