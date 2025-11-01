import { SensitiveValue } from './sensitive';
import { containsSensitiveData, redactSensitiveData } from './sensitive';

/**
 * Safely stringify objects for logging, handling circular references and sensitive data
 * @param obj Object to stringify
 * @param detectPatterns Whether to detect and redact sensitive data patterns
 * @returns String representation of the object
 */
export function safeStringify(obj: any, detectPatterns = true): string {
  const seen = new Set();
  return JSON.stringify(
    obj,
    (_key, value) => {
      // Handle circular references
      if (typeof value === 'object' && value !== null) {
        if (seen.has(value)) {
          return '[Circular]';
        }
        seen.add(value);

        // Handle SensitiveValue instances
        if (value instanceof SensitiveValue) {
          return value.toString();
        }
      }

      // Handle string values that might contain sensitive data
      if (
        detectPatterns &&
        typeof value === 'string' &&
        containsSensitiveData(value)
      ) {
        return redactSensitiveData(value);
      }

      return value;
    },
    2
  );
}

/**
 * Format error objects for logging, including stack traces
 * @param error Error object
 * @param includeStackTrace Whether to include stack traces
 * @returns Formatted error context
 */
export function formatError(
  error: Error,
  includeStackTrace = true
): Record<string, string> {
  const errorContext: Record<string, string> = {
    message: error.message,
  };

  if (includeStackTrace && error.stack) {
    // Format stack trace for better readability
    errorContext.stack = error.stack
      .split('\n')
      .slice(1) // Remove the first line (error message)
      .map((line) => line.trim())
      .join('\n');
  }

  return errorContext;
}

/**
 * Format a date in a human-readable format
 * @param date Date to format
 * @param use24HourFormat Whether to use 24-hour format
 * @returns Formatted date string
 */
export function formatDate(date: Date, use24HourFormat = true): string {
  // Format as date and time
  const months = [
    'Jan',
    'Feb',
    'Mar',
    'Apr',
    'May',
    'Jun',
    'Jul',
    'Aug',
    'Sep',
    'Oct',
    'Nov',
    'Dec',
  ];
  const month = months[date.getMonth()];
  const day = date.getDate();
  const hours = date.getHours();
  const minutes = date.getMinutes().toString().padStart(2, '0');
  const seconds = date.getSeconds().toString().padStart(2, '0');
  const milliseconds = date.getMilliseconds().toString().padStart(3, '0');

  if (use24HourFormat) {
    // 24-hour format
    return `${month} ${day}, ${hours
      .toString()
      .padStart(2, '0')}:${minutes}:${seconds}.${milliseconds}`;
  } else {
    // 12-hour format with AM/PM
    const ampm = hours >= 12 ? 'PM' : 'AM';
    const hour12 = hours % 12 || 12;
    return `${month} ${day}, ${hour12}:${minutes}:${seconds}.${milliseconds} ${ampm}`;
  }
}
