import { Kysely, PostgresDialect, SqliteDialect } from 'kysely';
import { Pool } from 'pg';
import Database from 'better-sqlite3';
import type { DatabaseSchema } from './schema';

export type DatabaseType = 'sqlite' | 'postgres';

export interface DatabaseConfig {
  type: DatabaseType;
  sqlite?: {
    filename: string;
    options?: {
      verbose?: boolean;
      readonly?: boolean;
      fileMustExist?: boolean;
      timeout?: number;
    };
  };
  postgres?: {
    host: string;
    port: number;
    database: string;
    username: string;
    password: string;
    ssl?: boolean;
    pool?: {
      min?: number;
      max?: number;
      idleTimeoutMillis?: number;
      connectionTimeoutMillis?: number;
    };
  };
}

class DatabaseFactory {
  private static instance: Kysely<DatabaseSchema> | null = null;
  private static config: DatabaseConfig | null = null;

  static getConfig(): DatabaseConfig {
    if (this.config) {
      return this.config;
    }

    const dbType = (process.env.DB_TYPE as DatabaseType) || 'sqlite';

    if (dbType === 'sqlite') {
      this.config = {
        type: 'sqlite',
        sqlite: {
          filename: process.env.SQLITE_PATH || './database/app.db',
          options: {
            verbose: process.env.NODE_ENV === 'development',
            timeout: parseInt(process.env.SQLITE_TIMEOUT || '5000'),
          },
        },
      };
    } else if (dbType === 'postgres') {
      this.config = {
        type: 'postgres',
        postgres: {
          host: process.env.POSTGRES_HOST || 'localhost',
          port: parseInt(process.env.POSTGRES_PORT || '5432'),
          database: process.env.POSTGRES_DB || 'app',
          username: process.env.POSTGRES_USER || 'postgres',
          password: process.env.POSTGRES_PASSWORD || 'postgres',
          ssl: process.env.POSTGRES_SSL === 'true',
          pool: {
            min: parseInt(process.env.POSTGRES_POOL_MIN || '2'),
            max: parseInt(process.env.POSTGRES_POOL_MAX || '10'),
            idleTimeoutMillis: parseInt(process.env.POSTGRES_IDLE_TIMEOUT || '30000'),
            connectionTimeoutMillis: parseInt(process.env.POSTGRES_CONNECTION_TIMEOUT || '2000'),
          },
        },
      };
    } else {
      throw new Error(`Unsupported database type: ${dbType}`);
    }

    return this.config;
  }

  static createDatabase(config: DatabaseConfig): Kysely<DatabaseSchema> {
    if (config.type === 'sqlite') {
      const sqliteConfig = config.sqlite!;
      const sqlite = new Database(sqliteConfig.filename, sqliteConfig.options);
      
      // Enable foreign key constraints
      sqlite.pragma('foreign_keys = ON');
      
      // Enable WAL mode for better concurrent access
      sqlite.pragma('journal_mode = WAL');
      
      // Optimize SQLite settings
      sqlite.pragma('synchronous = NORMAL');
      sqlite.pragma('cache_size = 1000');
      sqlite.pragma('temp_store = MEMORY');
      
      return new Kysely<DatabaseSchema>({
        dialect: new SqliteDialect({
          database: sqlite,
        }),
        log: process.env.NODE_ENV === 'development' ? ['query', 'error'] : ['error'],
      });
    }

    if (config.type === 'postgres') {
      const pgConfig = config.postgres!;
      const pool = new Pool({
        host: pgConfig.host,
        port: pgConfig.port,
        database: pgConfig.database,
        user: pgConfig.username,
        password: pgConfig.password,
        ssl: pgConfig.ssl,
        min: pgConfig.pool?.min,
        max: pgConfig.pool?.max,
        idleTimeoutMillis: pgConfig.pool?.idleTimeoutMillis,
        connectionTimeoutMillis: pgConfig.pool?.connectionTimeoutMillis,
      });

      return new Kysely<DatabaseSchema>({
        dialect: new PostgresDialect({
          pool,
        }),
        log: process.env.NODE_ENV === 'development' ? ['query', 'error'] : ['error'],
      });
    }

    throw new Error(`Unsupported database type: ${config.type}`);
  }

  static getInstance(): Kysely<DatabaseSchema> {
    if (!this.instance) {
      const config = this.getConfig();
      this.instance = this.createDatabase(config);
    }
    return this.instance;
  }

  static async closeConnection(): Promise<void> {
    if (this.instance) {
      await this.instance.destroy();
      this.instance = null;
    }
  }

  static resetInstance(): void {
    this.instance = null;
    this.config = null;
  }
}

// Convenience function for getting database instance
export function getDatabaseInstance(): Kysely<DatabaseSchema> {
  return DatabaseFactory.getInstance();
}

// Convenience function for getting database config
export function getDatabaseConfig(): DatabaseConfig {
  return DatabaseFactory.getConfig();
}

// Graceful shutdown
export async function closeDatabaseConnection(): Promise<void> {
  await DatabaseFactory.closeConnection();
}

// Reset for testing
export function resetDatabaseFactory(): void {
  DatabaseFactory.resetInstance();
}
