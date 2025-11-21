declare module 'bun:sqlite' {
  export interface Database {
    close(): void
    exec(sql: string): void
    prepare(sql: string): Statement
    query(sql: string): unknown[]
    run(sql: string): void
  }

  export interface Statement {
    run(...params: unknown[]): void
    get(...params: unknown[]): unknown
    all(...params: unknown[]): unknown[]
    finalize(): void
  }

  export class Database {
    constructor(filename?: string)
    close(): void
    exec(sql: string): void
    prepare(sql: string): Statement
    query(sql: string): unknown[]
    run(sql: string): void
  }
}
