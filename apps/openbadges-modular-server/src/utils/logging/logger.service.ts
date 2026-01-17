/**
 * Logger service using @rollercoaster-dev/rd-logger
 *
 * Exports Logger instance directly for use throughout the application.
 */
import type { LogLevel } from "@rollercoaster-dev/rd-logger";
import {
  Logger,
  QueryLogger,
  DEFAULT_QUERY_LOGGER_CONFIG,
} from "@rollercoaster-dev/rd-logger";
import { config } from "../../config/config";

// Export Logger instance directly
export const logger = new Logger({
  level: config.logging.level as LogLevel,
  prettyPrint: config.logging.prettyPrint || false,
});

// Export QueryLogger instance
const queryLoggerInstance = new QueryLogger(logger, {
  slowQueryThreshold: config.database.slowQueryThreshold,
  logDebugQueries: config.logging.logDebugQueries,
  enabled: DEFAULT_QUERY_LOGGER_CONFIG.enabled,
  maxLogs: DEFAULT_QUERY_LOGGER_CONFIG.maxLogs,
});

export const queryLogger = queryLoggerInstance;

/**
 * Get the Logger instance for external use (e.g., middleware integration)
 * @returns The Logger instance
 */
export const getLogger = (): Logger => {
  return logger;
};

// Re-export type for backward compatibility
export type LogContext = Record<string, unknown>;
