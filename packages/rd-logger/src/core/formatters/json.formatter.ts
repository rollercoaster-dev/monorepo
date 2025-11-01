import { Formatter } from './formatter.interface';

/**
 * JSON formatter for the logger
 */
export class JsonFormatter implements Formatter {
  /**
   * Format a log message as JSON
   */
  public format(level: string, message: string, timestamp: string, context: Record<string, any>): string {
    return JSON.stringify({
      level,
      message,
      timestamp,
      ...context
    });
  }
}
