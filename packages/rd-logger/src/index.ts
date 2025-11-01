/**
 * @rollercoaster-dev/rd-logger
 * Main entry point
 */

import { Logger } from './core/logger.service.js';

// Export core logger class
export { Logger } from './core/logger.service.js';

// Export config types and defaults
export {
  LogLevel,
  LoggerConfig,
  DEFAULT_LOGGER_CONFIG,
  LOG_LEVEL_PRIORITY,
  DEFAULT_LEVEL_COLORS,
  DEFAULT_LEVEL_ICONS
} from './core/logger.config.js';

// Export a default logger instance with default configuration
// Users can import this directly for simple use cases
export const defaultLogger = new Logger();

// Export core Request Context functions
export {
  runWithRequestContext,
  getRequestStore,
  getCurrentRequestId,
  getCurrentRequestStartTime
} from './core/request-context.js';
export type { RequestStore } from './core/request-context.js'; // Export type

// Export core Query Logger class and types/defaults
export { QueryLogger } from './core/query-logger.js';
export {
  QueryLogEntry,
  QueryLoggerConfig,
  DEFAULT_QUERY_LOGGER_CONFIG
} from './core/query-logger.js';

// Export Transports
export { Transport, ConsoleTransport, FileTransport } from './core/transports/index.js';
export type { ConsoleTransportOptions, FileTransportOptions } from './core/transports/index.js';

// Export Formatters
export { Formatter, JsonFormatter, TextFormatter } from './core/formatters/index.js';

// Export Sensitive Data Protection
export { SensitiveValue, SensitiveLoggingApproval } from './core/sensitive/index.js';
export { containsSensitiveData, redactSensitiveData, SENSITIVE_PATTERNS } from './core/sensitive/index.js';

// Export Utilities
export { formatDate, formatError, safeStringify } from './core/utils.js';

// Export Framework Adapters
export { honoLogger, honoErrorHandler } from './adapters/hono.js';
export type { HonoLoggerOptions } from './adapters/hono.js';
export { expressLogger, expressErrorHandler } from './adapters/express.js';
export type { ExpressLoggerOptions } from './adapters/express.js';
export { runWithGenericContext } from './adapters/generic.js';
export type { GenericContextOptions } from './adapters/generic.js';

// TODO: Export other framework adapters once implemented
