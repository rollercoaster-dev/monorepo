// tests/integration/setup.ts
import { vi, beforeAll, afterAll, beforeEach } from 'vitest';
import { config } from '@vue/test-utils';

// Global test setup for integration tests
beforeAll(() => {
  // Any global setup needed for integration tests
});

afterAll(() => {
  // Any global teardown needed for integration tests
});

// Reset mocks between tests
beforeEach(() => {
  vi.clearAllMocks();
});

// Configure Vue Test Utils
config.global.stubs = {};
