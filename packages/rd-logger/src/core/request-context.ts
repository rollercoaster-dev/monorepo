import { AsyncLocalStorage } from 'async_hooks';
import { randomUUID } from 'crypto';

export interface RequestStore {
  requestId: string;
  requestStartTime: number;
}

// Create an AsyncLocalStorage instance to hold the context for each request
const requestContext = new AsyncLocalStorage<RequestStore>();

/**
 * Runs a function within an asynchronous request context.
 * Creates a new context with a unique request ID and start time.
 *
 * @param fn The function to execute within the context.
 * @param existingRequestId Optional request ID from headers (e.g., 'x-request-id')
 * @returns The return value of the executed function.
 */
export function runWithRequestContext<T>(
  fn: () => T,
  existingRequestId?: string | null
): T {
  const store: RequestStore = {
    requestId: existingRequestId || randomUUID(),
    requestStartTime: Date.now(),
  };
  return requestContext.run(store, fn);
}

/**
 * Gets the current request context store.
 * Returns undefined if called outside a context created by runWithRequestContext.
 *
 * @returns The current request store or undefined.
 */
export function getRequestStore(): RequestStore | undefined {
  return requestContext.getStore();
}

/**
 * Gets the current request ID.
 *
 * @returns The current request ID or 'unknown' if not in a request context.
 */
export function getCurrentRequestId(): string {
  return getRequestStore()?.requestId || 'unknown';
}

/**
 * Gets the start time of the current request.
 *
 * @returns The request start timestamp (milliseconds since epoch) or the current time if not in a request context.
 */
export function getCurrentRequestStartTime(): number {
  return getRequestStore()?.requestStartTime || Date.now();
}
