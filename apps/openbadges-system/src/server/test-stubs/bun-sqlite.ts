// Test stub for `bun:sqlite` to allow running server tests in Node
// Provides a minimal Database implementation used by src/server/services/user.ts

export class Database {
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  constructor(filename?: string) {}

  exec(_sql: string): void {}

  prepare(_sql: string) {
    return {
      run: (..._params: unknown[]) => {},
      get: (..._params: unknown[]) => undefined,
      all: (..._params: unknown[]) => [],
      finalize: () => {},
    }
  }

  close(): void {}
}
