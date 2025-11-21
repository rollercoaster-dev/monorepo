// Type definitions for Bun test APIs
declare module 'bun:test' {
  interface TestContext {
    skip(): void
    todo(): void
    only(): void
  }

  interface MockFunction<T extends (...args: any[]) => any = (...args: any[]) => any> {
    (...args: Parameters<T>): ReturnType<T>
    mockReturnValue(value: ReturnType<T>): this
    mockReturnValueOnce(value: ReturnType<T>): this
    mockImplementation(impl: T): this
    mockResolvedValue(value: any): this
    mockRejectedValue(value: any): this
    mockClear(): this
    mockReset(): this
  }

  export function describe(name: string, fn: () => void | Promise<void>): void
  export function it(name: string, fn: (ctx?: TestContext) => void | Promise<void>): void
  export function test(name: string, fn: (ctx?: TestContext) => void | Promise<void>): void
  export function beforeEach(fn: () => void | Promise<void>): void
  export function afterEach(fn: () => void | Promise<void>): void
  export function beforeAll(fn: () => void | Promise<void>): void
  export function afterAll(fn: () => void | Promise<void>): void

  export const expect: {
    (actual: any): {
      toBe(expected: any): void
      toEqual(expected: any): void
      toBeNull(): void
      toBeDefined(): void
      toBeUndefined(): void
      toBeTruthy(): void
      toBeFalsy(): void
      toHaveLength(length: number): void
      toContain(item: any): void
      toThrow(error?: string | RegExp | Error): void
      toBeInstanceOf(constructor: any): void
      toBeCloseTo(number: number, precision?: number): void
      toBeGreaterThan(number: number): void
      toBeGreaterThanOrEqual(number: number): void
      toBeLessThan(number: number): void
      toBeLessThanOrEqual(number: number): void
      toMatch(regexp: RegExp | string): void
      toMatchObject(object: object): void
      toHaveProperty(propertyPath: string, value?: any): void
      toBeCalledWith(...args: any[]): void
      toHaveBeenCalledWith(...args: any[]): void
      toHaveBeenCalled(): void
      toHaveBeenCalledTimes(times: number): void
      not: any
    }
    any(constructor: any): any
    anything(): any
    arrayContaining(array: any[]): any
    objectContaining(object: object): any
    stringContaining(string: string): any
    stringMatching(regexp: RegExp | string): any
  }

  export const mock: {
    <T extends (...args: any[]) => any>(fn?: T): MockFunction<T>
    module(moduleName: string, factory: () => any): void
  }
}
