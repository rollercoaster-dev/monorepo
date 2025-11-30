// Setup file for Bun tests
// This replaces the Vitest setup for server tests

// Mock fetch for server tests (similar to vitest setup)
// Cast to unknown first to avoid Bun's fetch.preconnect type requirement
if (!globalThis.fetch) {
  globalThis.fetch = (async () => new Response()) as unknown as typeof fetch
}

// Mock console methods if needed for cleaner test output
const originalConsoleLog = console.log
const originalConsoleError = console.error

export function mockConsole() {
  console.log = () => {}
  console.error = () => {}
}

export function restoreConsole() {
  console.log = originalConsoleLog
  console.error = originalConsoleError
}
