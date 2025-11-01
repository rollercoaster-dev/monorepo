import { Formatter } from './formatter.interface';
import { safeStringify } from '../utils';

/**
 * Text formatter for the logger
 */
export class TextFormatter implements Formatter {
  /**
   * Format a log message as plain text
   */
  public format(level: string, message: string, timestamp: string, context: Record<string, any>): string {
    let output = `[${timestamp}] ${level.toUpperCase()}: ${message}`;
    
    if (Object.keys(context).length > 0) {
      output += ` | ${safeStringify(context)}`;
    }
    
    return output;
  }
}
