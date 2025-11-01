import chalk from 'chalk';
import { Transport } from './transports';
import { Formatter } from './formatters';

// Define log levels and their priority (lower number = higher priority)
export type LogLevel = 'debug' | 'info' | 'warn' | 'error' | 'fatal';

export const LOG_LEVEL_PRIORITY: Record<LogLevel, number> = {
  debug: 0,
  info: 1,
  warn: 2,
  error: 3,
  fatal: 4,
};

// Define colors for each log level
export const DEFAULT_LEVEL_COLORS: Record<LogLevel, (text: string) => string> =
  {
    debug: chalk.blue,
    info: chalk.green,
    warn: chalk.yellow,
    error: chalk.red,
    fatal: chalk.magenta,
  };

// Define icons for each log level
export const DEFAULT_LEVEL_ICONS: Record<LogLevel, string> = {
  debug: '🔍',
  info: '🟢',
  warn: '🟡',
  error: '🔴',
  fatal: '💀',
};

export interface LoggerConfig {
  level: LogLevel;
  prettyPrint: boolean;
  colorize: boolean;
  includeStackTrace: boolean;
  logToFile: boolean;
  logFilePath: string;
  use24HourFormat: boolean;
  levelColors?: Partial<Record<LogLevel, (text: string) => string>>; // Allow overriding defaults
  levelIcons?: Partial<Record<LogLevel, string>>; // Allow overriding defaults
  transports?: Transport[]; // Custom transports
  formatter?: Formatter; // Custom formatter
}

export const DEFAULT_LOGGER_CONFIG: LoggerConfig = {
  level: (process.env.LOG_LEVEL as LogLevel) || 'info', // Default level
  prettyPrint: process.env.NODE_ENV !== 'production', // Pretty print in dev, plain in prod
  colorize: true, // Only colorize if output is a TTY
  includeStackTrace: process.env.NODE_ENV !== 'production', // Show stack trace in dev
  logToFile: false, // Default to console logging
  logFilePath: './app.log', // Default log file path
  use24HourFormat: true, // Default to 24-hour format
};
