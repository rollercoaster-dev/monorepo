import {
  LogLevel,
  LoggerConfig,
  DEFAULT_LOGGER_CONFIG,
  LOG_LEVEL_PRIORITY,
} from './logger.config';
import { Transport, ConsoleTransport, FileTransport } from './transports';
import { Formatter, TextFormatter } from './formatters';
import { formatError } from './utils';
import { SensitiveLoggingApproval } from './sensitive';

/**
 * Enhanced neuro-friendly logger class
 */
export class Logger {
  private config: LoggerConfig;
  private transports: Transport[] = [];
  private formatter: Formatter;

  constructor(options?: Partial<LoggerConfig>) {
    this.config = { ...DEFAULT_LOGGER_CONFIG, ...options };
    this.formatter = this.config.formatter || new TextFormatter();

    // Initialize transports
    this.initializeTransports();
  }

  /**
   * Initialize transports based on configuration
   */
  private initializeTransports(): void {
    // Clear existing transports
    this.transports = [];

    // Use custom transports if provided
    if (this.config.transports && this.config.transports.length > 0) {
      this.transports = [...this.config.transports];
    } else {
      // Otherwise, set up default transports based on config
      // Always add console transport by default
      this.transports.push(
        new ConsoleTransport({
          prettyPrint: this.config.prettyPrint,
          colorize: this.config.colorize,
          use24HourFormat: this.config.use24HourFormat,
          levelColors: this.config.levelColors,
          levelIcons: this.config.levelIcons,
        })
      );

      // Add file transport if enabled
      if (this.config.logToFile) {
        const fileTransport = new FileTransport({
          filePath: this.config.logFilePath,
        });

        // Add the transport; initialization will happen lazily on first log
        this.transports.push(fileTransport);
      }
    }
  }

  /**
   * Main logging function
   * @param level Log level
   * @param message Log message
   * @param context Additional context (optional)
   */
  public log(
    level: LogLevel,
    message: string,
    context: Record<string, any> = {}
  ): void {
    // Check if this log level should be shown based on configuration
    // In LOG_LEVEL_PRIORITY, higher values mean less verbose (debug=0, fatal=4)
    // So we only log if the message level value is >= the configured level value
    // For example, if config.level is 'info' (1), we log 'info' (1), 'warn' (2), 'error' (3), 'fatal' (4), but not 'debug' (0)
    if (LOG_LEVEL_PRIORITY[level] < LOG_LEVEL_PRIORITY[this.config.level]) {
      return;
    }

    // Process context - handle errors specially
    let processedContext = { ...context };
    if (context.error instanceof Error) {
      processedContext = {
        ...processedContext,
        ...formatError(context.error, this.config.includeStackTrace),
      };
      delete processedContext.error;
    }

    // Get timestamp
    const timestamp = new Date().toISOString();

    // Send to all transports
    for (const transport of this.transports) {
      transport.log(level, message, timestamp, processedContext);
    }
  }

  // Convenience wrappers
  public debug(msg: string, ctx?: Record<string, any>): void {
    this.log('debug', msg, ctx);
  }

  public info(msg: string, ctx?: Record<string, any>): void {
    this.log('info', msg, ctx);
  }

  public warn(msg: string, ctx?: Record<string, any>): void {
    this.log('warn', msg, ctx);
  }

  public error(msg: string, ctx?: Record<string, any>): void {
    this.log('error', msg, ctx);
  }

  public fatal(msg: string, ctx?: Record<string, any>): void {
    this.log('fatal', msg, ctx);
  }

  /**
   * Logs an error object directly
   * @param msg Prefix message
   * @param error Error object
   * @param additionalContext Additional context (optional)
   */
  public logError(
    msg: string,
    error: Error,
    additionalContext: Record<string, any> = {}
  ): void {
    this.log('error', msg, { ...additionalContext, error });
  }

  /**
   * Explicitly log sensitive data with approval information
   * This method should only be used in exceptional circumstances where logging sensitive data is necessary
   * @param level Log level
   * @param message Log message
   * @param data Data containing sensitive information
   * @param approval Approval information for logging sensitive data
   */
  public logWithSensitiveData(
    level: LogLevel,
    message: string,
    data: Record<string, any>,
    approval: SensitiveLoggingApproval
  ): void {
    // Validate approval
    if (!approval.reason || !approval.approvedBy) {
      this.warn('Attempted to log sensitive data without proper approval', {
        message:
          'Missing required approval information. Sensitive data will not be logged.',
      });
      return;
    }

    // Check if approval has expired
    if (approval.expiresAt && new Date() > approval.expiresAt) {
      this.warn('Attempted to log sensitive data with expired approval', {
        message: 'Approval has expired. Sensitive data will not be logged.',
        expiredAt: approval.expiresAt,
      });
      return;
    }

    // Add approval information to the context
    const contextWithApproval = {
      ...data,
      __sensitive_data_approval__: {
        reason: approval.reason,
        approvedBy: approval.approvedBy,
        approvedAt: new Date().toISOString(),
        expiresAt: approval.expiresAt
          ? approval.expiresAt.toISOString()
          : undefined,
      },
    };

    // Log with a warning prefix to make it stand out
    const warningPrefix = '⚠️ SENSITIVE DATA ⚠️ ';
    this.log(level, `${warningPrefix}${message}`, contextWithApproval);
  }

  /**
   * Convenience method for logging sensitive data with info level
   */
  public infoWithSensitiveData(
    message: string,
    data: Record<string, any>,
    approval: SensitiveLoggingApproval
  ): void {
    this.logWithSensitiveData('info', message, data, approval);
  }

  /**
   * Convenience method for logging sensitive data with error level
   */
  public errorWithSensitiveData(
    message: string,
    data: Record<string, any>,
    approval: SensitiveLoggingApproval
  ): void {
    this.logWithSensitiveData('error', message, data, approval);
  }

  /**
   * Update the logger's configuration dynamically
   * @param options Partial configuration options to update
   */
  public configure(options: Partial<LoggerConfig>): void {
    // We don't need oldConfig for now, but it might be useful for future comparisons
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    const oldConfig = { ...this.config };
    this.config = { ...this.config, ...options };

    // Update formatter if provided
    if (options.formatter) {
      this.formatter = options.formatter;
    }

    // Reinitialize transports if relevant config changed
    const transportConfigChanged =
      options.transports !== undefined ||
      options.logToFile !== undefined ||
      options.logFilePath !== undefined ||
      options.prettyPrint !== undefined ||
      options.colorize !== undefined ||
      options.use24HourFormat !== undefined ||
      options.levelColors !== undefined ||
      options.levelIcons !== undefined;

    if (transportConfigChanged) {
      this.initializeTransports();
    }
  }

  /**
   * Set the log level dynamically
   * @param level New log level to set
   */
  public setLevel(level: LogLevel): void {
    this.configure({ level });
  }

  /**
   * Update configuration options dynamically
   * @param options Partial configuration options to update
   * @alias configure - Provided for API consistency
   */
  public updateConfig(options: Partial<LoggerConfig>): void {
    this.configure(options);
  }

  /**
   * Add a transport to the logger
   * @param transport Transport to add
   */
  public addTransport(transport: Transport): void {
    this.transports.push(transport);
  }

  /**
   * Remove a transport from the logger by name
   * @param name Name of the transport to remove
   * @returns Whether the transport was found and removed
   */
  public removeTransport(name: string): boolean {
    const initialLength = this.transports.length;
    this.transports = this.transports.filter((t) => t.name !== name);
    return this.transports.length < initialLength;
  }

  /**
   * Set the formatter for the logger
   * @param formatter Formatter to use
   */
  public setFormatter(formatter: Formatter): void {
    this.formatter = formatter;
  }

  /**
   * Clean up resources used by the logger
   * Should be called when the logger is no longer needed
   */
  public cleanup(): void {
    // Clean up all transports
    for (const transport of this.transports) {
      if (transport.cleanup) {
        transport.cleanup();
      }
    }

    // Clear transports array
    this.transports = [];
  }
}
