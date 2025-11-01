/**
 * Formatter interface for the logger
 * Formatters are responsible for formatting log messages
 */
export interface Formatter {
  /**
   * Format a log message
   * @param level Log level
   * @param message Log message
   * @param timestamp Timestamp of the log
   * @param context Additional context
   * @returns Formatted log message
   */
  format(level: string, message: string, timestamp: string, context: Record<string, any>): string;
}
