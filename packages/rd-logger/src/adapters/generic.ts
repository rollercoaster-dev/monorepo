import { Logger } from '../core/logger.service';
import { type LoggerConfig } from '../core/logger.config';
import {
  runWithRequestContext,
  getRequestStore,
} from '../core/request-context';

export interface GenericContextOptions {
  /**
   * An existing Logger instance to use.
   * If not provided, a new Logger will be created with the options below.
   */
  loggerInstance?: Logger;
  /**
   * Configuration options for the Logger.
   * Ignored if loggerInstance is provided.
   */
  loggerOptions?: Partial<LoggerConfig>;
  /**
   * An optional, predetermined request ID to use for this context.
   * If not provided, a new UUID will be generated.
   */
  requestId?: string;
  /**
   * An optional name for this context or task, used in log messages.
   */
  contextName?: string;
  /**
   * Set to true to automatically log start and end messages for the context.
   * Defaults to true.
   */
  logStartEnd?: boolean;
}

/**
 * Runs a function within a generic, uniquely identified logging context.
 * Useful for background jobs, scripts, or any non-web task where grouped logging is desired.
 *
 * @template T The return type of the function being executed.
 * @param fn The asynchronous function to execute within the context.
 * @param options Configuration options for the generic context.
 * @returns A promise that resolves with the return value of the executed function.
 */
export async function runWithGenericContext<T>(
  fn: () => Promise<T> | T,
  options: GenericContextOptions = {}
): Promise<T> {
  const logger = options.loggerInstance || new Logger(options.loggerOptions);
  const logStartEnd = options.logStartEnd !== false; // Default to true
  const contextName = options.contextName || 'GenericContext';

  // Wrap the execution in our core request context function
  return runWithRequestContext(async () => {
    const store = getRequestStore()!;
    const requestId = store.requestId;
    const startTime = store.requestStartTime;

    try {
      if (logStartEnd) {
        logger.info(`▶ Starting ${contextName}`, { contextName, requestId });
      }

      const result = await fn();

      if (logStartEnd) {
        const duration = Date.now() - startTime;
        logger.info(`◀ Finished ${contextName}`, {
          contextName,
          requestId,
          duration: `${duration}ms`,
        });
      }
      return result;
    } catch (error) {
      const duration = Date.now() - startTime;
      logger.error(`💥 Error in ${contextName}`, {
        contextName,
        requestId,
        duration: `${duration}ms`,
        error: error, // Pass the raw error object
      });
      // Re-throw the error after logging
      throw error;
    }
  }, options.requestId); // Pass optional existing request ID
}
