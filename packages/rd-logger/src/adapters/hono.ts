import type { Context, MiddlewareHandler } from 'hono';
import { Logger } from '../core/logger.service';
import { type LoggerConfig } from '../core/logger.config';
import {
  runWithRequestContext,
  getRequestStore,
} from '../core/request-context';

// Define Hono-specific variables type if needed for c.set/c.get
type HonoVariables = {
  requestId: string;
};

export interface HonoLoggerOptions {
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
   * Function to determine if a request should be skipped for logging.
   * @param c Hono context
   * @returns true to skip logging, false otherwise
   */
  skip?: (c: Context) => boolean;
  /**
   * Customize the log message for incoming requests.
   * @param c Hono context
   * @param store Request context store
   * @returns Log message string
   */
  requestMessage?: (c: Context, store: { requestId: string }) => string;
  /**
   * Customize the log message for completed requests.
   * @param c Hono context
   * @param store Request context store
   * @param duration Request duration in ms
   * @param status Response status code
   * @returns Log message string
   */
  responseMessage?: (
    c: Context,
    store: { requestId: string },
    duration: number,
    status: number
  ) => string;
}

/**
 * Hono middleware for neuro-friendly logging and request context management.
 *
 * @param options Configuration options for the logger middleware.
 * @returns Hono MiddlewareHandler.
 */
export const honoLogger = (options: HonoLoggerOptions = {}): MiddlewareHandler<{
  Variables: HonoVariables;
}> => {
  const logger = options.loggerInstance || new Logger(options.loggerOptions);

  return async (c, next) => {
    const existingRequestId = c.req.header('x-request-id');

    await runWithRequestContext(async () => {
      const store = getRequestStore()!;
      const requestId = store.requestId;
      const startTime = store.requestStartTime;

      // Set requestId in Hono context for access in handlers
      c.set('requestId', requestId);

      // Set response header
      c.res.headers.set('x-request-id', requestId);

      // Check if logging should be skipped
      if (options.skip?.(c)) {
        await next();
        return;
      }

      // Log incoming request
      const method = c.req.method;
      const path = new URL(c.req.url).pathname;
      const requestMsg = options.requestMessage
        ? options.requestMessage(c, store)
        : `▶ Incoming request`;

      logger.info(requestMsg, {
        method,
        path,
        requestId,
      });

      // Proceed with the request handling
      try {
        await next();
      } catch (error) {
        // Log uncaught errors that might bypass Hono's default error handler
        // Note: It's generally better to rely on Hono's built-in .onError
        if (error instanceof Error) {
           logger.error(`Middleware error: ${error.message}`, {
            error: error, // Pass the raw error object
            requestId,
          });
        }
        // Re-throw the error to let Hono handle the response
        throw error;
      }

      // Log outgoing response
      const duration = Date.now() - startTime;
      const status = c.res.status;

      const responseMsg = options.responseMessage
        ? options.responseMessage(c, store, duration, status)
        : `◀ Request completed`;

      const logLevel = status >= 500 ? 'error' : status >= 400 ? 'warn' : 'info';

      logger[logLevel](responseMsg, {
        method,
        path,
        status,
        duration: `${duration}ms`,
        requestId,
      });

    }, existingRequestId);
  };
};

/**
 * Hono error handler that logs errors using the logger and request context.
 *
 * Usage:
 * ```typescript
 * import { Hono } from 'hono';
 * import { honoErrorHandler } from './path/to/honoErrorHandler';
 * import { Logger } from './path/to/logger';
 *
 * const app = new Hono();
 * const logger = new Logger();
 *
 * app.onError(honoErrorHandler(logger));
 * // ... other middleware and routes
 * ```
 *
 * @param loggerInstance An instance of the Logger.
 * @returns Hono ErrorHandler.
 */
export const honoErrorHandler = (loggerInstance: Logger) => {
  return (err: Error, c: Context) => {
    const store = getRequestStore(); // Get context established by honoLogger middleware
    const requestId = store?.requestId || c.req.header('x-request-id') || 'unknown';

    loggerInstance.error(`Unhandled Hono error: ${err.message}`, {
      error: err,
      requestId,
      method: c.req.method,
      path: new URL(c.req.url).pathname,
    });

    // Default Hono error response
    console.error(err); // Log the raw error for visibility
    const message = 'Internal Server Error';
    return c.json({ ok: false, message }, 500);
  };
};
