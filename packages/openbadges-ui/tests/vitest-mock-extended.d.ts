// tests/vitest-mock-extended.d.ts

declare global {
  namespace jest {
    interface Mock<T = unknown, Y extends unknown[] = unknown[]> {
      mockImplementation: (fn: (...args: Y) => T) => this;
      mockImplementationOnce: (fn: (...args: Y) => T) => this;
      mockReturnValue: (value: T) => this;
      mockReturnValueOnce: (value: T) => this;
      mockResolvedValue: (value: Awaited<T>) => this;
      mockResolvedValueOnce: (value: Awaited<T>) => this;
      mockRejectedValue: (reason?: unknown) => this;
      mockRejectedValueOnce: (reason?: unknown) => this;
      mockName: (name: string) => this;
    }
  }
}
