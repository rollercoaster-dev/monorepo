import { Logger } from './logger.service';

export interface QueryLogEntry {
  query: string;
  params?: any[];
  duration: number; // in milliseconds
  timestamp: string; // ISO format
  database?: string; // Optional: type or name of the database
  requestId?: string; // Optional: associated request ID if available
}

export interface QueryLoggerConfig {
  enabled: boolean;
  slowQueryThreshold: number; // ms
  maxLogs: number; // Max number of logs to keep in memory
  logDebugQueries: boolean; // Whether to log all queries at debug level
}

export const DEFAULT_QUERY_LOGGER_CONFIG: QueryLoggerConfig = {
  enabled: process.env.NODE_ENV !== 'production', // Enable by default in non-prod
  slowQueryThreshold: 100, // Default slow query threshold (ms)
  maxLogs: 1000, // Default max logs to store
  logDebugQueries: process.env.DEBUG_QUERIES === 'true', // Log all queries if DEBUG_QUERIES is set
};

/**
 * Logs database queries and identifies slow ones.
 */
export class QueryLogger {
  private logs: QueryLogEntry[] = [];
  private config: QueryLoggerConfig;
  private logger: Logger; // Use the main logger for output

  constructor(logger: Logger, options?: Partial<QueryLoggerConfig>) {
    this.logger = logger;
    this.config = { ...DEFAULT_QUERY_LOGGER_CONFIG, ...options };
  }

  /**
   * Logs a query execution.
   * @param query The SQL query string.
   * @param params Query parameters (optional).
   * @param duration Query execution duration in milliseconds.
   * @param database Optional database type/name.
   * @param requestId Optional associated request ID.
   */
  public logQuery(
    query: string,
    params: any[] | undefined,
    duration: number,
    database?: string,
    requestId?: string
  ): void {
    if (!this.config.enabled) return;

    const entry: QueryLogEntry = {
      query,
      params,
      duration,
      timestamp: new Date().toISOString(),
      database,
      requestId,
    };

    // Add to logs (with size limit)
    this.logs.push(entry);
    if (this.logs.length > this.config.maxLogs) {
      this.logs.shift(); // Remove oldest entry
    }

    const context: Record<string, any> = {
      duration: `${duration}ms`,
      query,
      params: params, // Let the main logger handle stringification
      database,
      requestId,
    };

    // Log slow queries
    if (duration >= this.config.slowQueryThreshold) {
      this.logger.warn(`Slow query detected`, context);
    }

    // Log all queries if debug logging for queries is enabled
    if (this.config.logDebugQueries) {
      this.logger.debug(`Database query executed`, context);
    }
  }

  /**
   * Gets all logged queries.
   * @returns Array of query log entries.
   */
  public getLogs(): QueryLogEntry[] {
    return [...this.logs]; // Return a copy
  }

  /**
   * Gets slow queries (queries that took longer than the configured threshold).
   * @param threshold Optional custom threshold in milliseconds to override config for this call.
   * @returns Array of slow query log entries.
   */
  public getSlowQueries(threshold?: number): QueryLogEntry[] {
    const actualThreshold = threshold ?? this.config.slowQueryThreshold;
    return this.logs.filter((log) => log.duration >= actualThreshold);
  }

  /**
   * Clears all stored logs.
   */
  public clearLogs(): void {
    this.logs = [];
  }

  /**
   * Updates the query logger's configuration dynamically.
   * @param options Partial configuration options to update.
   */
  public configure(options: Partial<QueryLoggerConfig>): void {
    this.config = { ...this.config, ...options };
  }

  /**
   * Gets query statistics.
   */
  public getStats(): {
    totalQueries: number;
    slowQueries: number;
    averageDuration: number;
    maxDuration: number;
    byDatabase: Record<string, { count: number; avgDuration: number }>;
  } {
    if (this.logs.length === 0) {
      return {
        totalQueries: 0,
        slowQueries: 0,
        averageDuration: 0,
        maxDuration: 0,
        byDatabase: {},
      };
    }

    const totalDuration = this.logs.reduce((sum, log) => sum + log.duration, 0);
    const maxDuration = Math.max(...this.logs.map((log) => log.duration));
    const slowQueriesCount = this.logs.filter(
      (log) => log.duration >= this.config.slowQueryThreshold
    ).length;

    // Group by database
    const byDatabase: Record<string, { count: number; totalDuration: number }> = {};
    for (const log of this.logs) {
      const dbKey = log.database || 'unknown';
      if (!byDatabase[dbKey]) {
        byDatabase[dbKey] = { count: 0, totalDuration: 0 };
      }
      byDatabase[dbKey].count++;
      byDatabase[dbKey].totalDuration += log.duration;
    }

    // Calculate average duration by database
    const byDatabaseStats: Record<string, { count: number; avgDuration: number }> = {};
    for (const [db, stats] of Object.entries(byDatabase)) {
      byDatabaseStats[db] = {
        count: stats.count,
        avgDuration: stats.totalDuration > 0 ? stats.totalDuration / stats.count : 0,
      };
    }

    return {
      totalQueries: this.logs.length,
      slowQueries: slowQueriesCount,
      averageDuration: totalDuration > 0 ? totalDuration / this.logs.length : 0,
      maxDuration,
      byDatabase: byDatabaseStats,
    };
  }
}
