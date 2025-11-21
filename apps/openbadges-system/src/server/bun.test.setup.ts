// Setup file for Bun tests
// This replaces the Vitest setup for server tests

// Mock fetch for server tests (similar to vitest setup)
if (!globalThis.fetch) {
  globalThis.fetch = async () => new Response()
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
