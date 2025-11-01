import type {
  Request,
  Response,
  NextFunction,
  RequestHandler,
  ErrorRequestHandler,
} from 'express';
import onFinished from 'on-finished';
import { Logger } from '../core/logger.service';
import { type LoggerConfig } from '../core/logger.config';
import {
  runWithRequestContext,
  getRequestStore,
} from '../core/request-context';

// Extend Express Request type to include our id
declare global {
  namespace Express {
    interface Request {
      id?: string;
    }
  }
}

export interface ExpressLoggerOptions {
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
   * @param req Express request
   * @param res Express response
   * @returns true to skip logging, false otherwise
   */
  skip?: (req: Request, res: Response) => boolean;
  /**
   * Customize the log message for incoming requests.
   * @param req Express request
   * @param store Request context store
   * @returns Log message string
   */
  requestMessage?: (req: Request, store: { requestId: string }) => string;
  /**
   * Customize the log message for completed requests.
   * @param req Express request
   * @param res Express response
   * @param store Request context store
   * @param duration Request duration in ms
   * @param status Response status code
   * @returns Log message string
   */
  responseMessage?: (
    req: Request,
    res: Response,
    store: { requestId: string },
    duration: number,
    status: number
  ) => string;
}

/**
 * Express middleware for neuro-friendly logging and request context management.
 *
 * @param options Configuration options for the logger middleware.
 * @returns Express RequestHandler.
 */
export const expressLogger = (options: ExpressLoggerOptions = {}): RequestHandler => {
  const logger = options.loggerInstance || new Logger(options.loggerOptions);

  return (req: Request, res: Response, next: NextFunction) => {
    const existingRequestId = req.header('x-request-id');

    // Wrap the request handling in the async context
    runWithRequestContext(() => {
      const store = getRequestStore()!;
      const requestId = store.requestId;
      const startTime = store.requestStartTime;

      // Make requestId easily accessible on the request object
      req.id = requestId;

      // Set response header
      res.setHeader('x-request-id', requestId);

      // Check if logging should be skipped
      if (options.skip?.(req, res)) {
        next();
        return;
      }

      // Log incoming request
      const method = req.method;
      const path = req.originalUrl || req.url;
      const requestMsg = options.requestMessage
        ? options.requestMessage(req, store)
        : `▶ Incoming request`;

      logger.info(requestMsg, {
        method,
        path,
        requestId,
      });

      // Log response when it finishes
      onFinished(res, (err, finishedRes) => {
        const duration = Date.now() - startTime;
        const status = finishedRes.statusCode;

        const responseMsg = options.responseMessage
          ? options.responseMessage(req, finishedRes, store, duration, status)
          : `◀ Request completed`;

        const logLevel = status >= 500 ? 'error' : status >= 400 ? 'warn' : 'info';

        const logContext: Record<string, any> = {
          method,
          path,
          status,
          duration: `${duration}ms`,
          requestId,
        };

        // Include error in log if onFinished reported one
        if (err) {
          logContext.error = err;
          logger.error(`Error during response finish: ${err.message}`, logContext);
        } else {
          logger[logLevel](responseMsg, logContext);
        }
      });

      // Continue to the next middleware
      next();

    }, existingRequestId);
  };
};

/**
 * Express error handling middleware that logs errors using the logger and request context.
 *
 * Place this AFTER your routes and other middleware, but BEFORE the default Express error handler.
 *
 * Usage:
 * ```typescript
 * import express from 'express';
 * import { expressLogger, expressErrorHandler } from './path/to/expressAdapter';
 * import { Logger } from './path/to/logger';
 *
 * const app = express();
 * const logger = new Logger();
 *
 * app.use(expressLogger({ loggerInstance: logger }));
 * // ... routes ...
 * app.use(expressErrorHandler(logger));
 * ```
 *
 * @param loggerInstance An instance of the Logger.
 * @returns Express ErrorRequestHandler.
 */
export const expressErrorHandler = (loggerInstance: Logger): ErrorRequestHandler => {
  return (
    err: any, // Express errors can be of any type
    req: Request,
    res: Response,
    next: NextFunction
  ) => {
    const store = getRequestStore(); // Get context established by expressLogger middleware
    // Fallback to req.id or header if context is somehow lost
    const requestId = store?.requestId || req.id || req.header('x-request-id') || 'unknown';

    const errorMessage = err instanceof Error ? err.message : 'Unknown error occurred';

    loggerInstance.error(`Unhandled Express error: ${errorMessage}`, {
      error: err, // Pass the raw error object
      requestId,
      method: req.method,
      path: req.originalUrl || req.url,
    });

    // Ensure the error is passed to the next error handler (e.g., Express default)
    next(err);
  };
};
