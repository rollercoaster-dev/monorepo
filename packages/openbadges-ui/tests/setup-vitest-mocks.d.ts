// tests/setup-vitest-mocks.d.ts

// Add TS declarations for the mock methods of vi.fn()
declare namespace vi {
  interface Mock<T extends (...args: unknown[]) => unknown> {
    mockResolvedValue(value: Awaited<ReturnType<T>>): this;
    mockResolvedValueOnce(value: Awaited<ReturnType<T>>): this;
    mockRejectedValue(err: unknown): this;
    mockRejectedValueOnce(err: unknown): this;
  }
}
