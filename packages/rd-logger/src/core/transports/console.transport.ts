import chalk from 'chalk';
import { Transport } from './transport.interface';
import {
  LogLevel,
  DEFAULT_LEVEL_COLORS,
  DEFAULT_LEVEL_ICONS,
} from '../logger.config';
import { formatDate, safeStringify } from '../utils';

export interface ConsoleTransportOptions {
  /**
   * Whether to use pretty printing
   */
  prettyPrint?: boolean;

  /**
   * Whether to colorize output
   */
  colorize?: boolean;

  /**
   * Whether to use 24-hour format for timestamps
   */
  use24HourFormat?: boolean;

  /**
   * Custom colors for log levels
   */
  levelColors?: Partial<Record<LogLevel, (text: string) => string>>;

  /**
   * Custom icons for log levels
   */
  levelIcons?: Partial<Record<LogLevel, string>>;
}

/**
 * Console transport for the logger
 */
export class ConsoleTransport implements Transport {
  public name = 'console';
  private prettyPrint: boolean;
  private colorize: boolean;
  private use24HourFormat: boolean;
  private levelColors: Record<LogLevel, (text: string) => string>;
  private levelIcons: Record<LogLevel, string>;

  constructor(options: ConsoleTransportOptions = {}) {
    this.prettyPrint = options.prettyPrint ?? true;
    this.colorize = options.colorize ?? true;
    this.use24HourFormat = options.use24HourFormat ?? true;
    this.levelColors = {
      ...DEFAULT_LEVEL_COLORS,
      ...(options.levelColors || {}),
    };
    this.levelIcons = { ...DEFAULT_LEVEL_ICONS, ...(options.levelIcons || {}) };
  }

  /**
   * Log a message to the console
   */
  public log(
    level: string,
    message: string,
    timestamp: string,
    context: Record<string, any>
  ): void {
    const logLevel = level as LogLevel;
    const icon = this.levelIcons[logLevel];

    // Format timestamp
    const now = new Date(timestamp);
    const readableTimestamp = formatDate(now, this.use24HourFormat);
    const displayTimestamp = this.prettyPrint ? readableTimestamp : timestamp;
    const colorizedTimestamp = this.colorize
      ? chalk.gray(displayTimestamp)
      : displayTimestamp;

    // Format level and message
    const colorizedLevel = this.colorize
      ? this.levelColors[logLevel](level.toUpperCase())
      : level.toUpperCase();
    const colorizedMessage = this.colorize
      ? chalk.whiteBright(message)
      : message;

    // Construct console output
    let consoleOutput = `\n${icon}  ${colorizedLevel}  ${colorizedTimestamp}\n  ➤ ${colorizedMessage}`;

    // Add context if available
    if (Object.keys(context).length) {
      for (const [key, value] of Object.entries(context)) {
        const formattedValue =
          typeof value === 'object' && value !== null
            ? safeStringify(value)
            : String(value);
        const colorizedKey = this.colorize ? chalk.gray(key) : key;
        const colorizedValue = this.colorize
          ? chalk.cyan(formattedValue)
          : formattedValue;
        consoleOutput += `\n    • ${colorizedKey}: ${colorizedValue}`;
      }
    }

    const divider = this.colorize
      ? chalk.dim('\n────────────────────────────────────')
      : '\n────────────────────────────────────';
    consoleOutput += divider;

    // Output to console
    console.log(consoleOutput);
  }
}
