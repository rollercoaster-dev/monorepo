/**
 * Transport interface for the logger
 * Transports are responsible for outputting log messages to different destinations
 */
export interface Transport {
  /**
   * Name of the transport
   */
  name: string;

  /**
   * Log a message using this transport
   * @param level Log level
   * @param message Log message
   * @param timestamp Timestamp of the log
   * @param context Additional context
   */
  log(level: string, message: string, timestamp: string, context: Record<string, any>): void;

  /**
   * Initialize the transport
   */
  initialize?(): void;

  /**
   * Clean up resources used by the transport
   */
  cleanup?(): void;
}
