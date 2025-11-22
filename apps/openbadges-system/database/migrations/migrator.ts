import type { Kysely} from 'kysely';
import { Migrator, FileMigrationProvider } from 'kysely';
import { promises as fs } from 'fs';
import path from 'path';
import { getDatabaseInstance, getDatabaseConfig } from '../factory';
import type { DatabaseSchema } from '../schema';

export interface MigrationResult {
  success: boolean;
  error?: string;
  results?: Array<{
    migrationName: string;
    direction: 'Up' | 'Down';
    status: 'Success' | 'Error';
  }>;
}

export class DatabaseMigrator {
  private db: Kysely<DatabaseSchema>;
  private migrator: Migrator;
  
  constructor() {
    this.db = getDatabaseInstance();
    this.migrator = new Migrator({
      db: this.db,
      provider: new FileMigrationProvider({
        fs,
        path,
        migrationFolder: path.join(__dirname, '../migrations'),
      }),
    });
  }

  /**
   * Run all pending migrations
   */
  async migrateToLatest(): Promise<MigrationResult> {
    try {
      const { error, results } = await this.migrator.migrateToLatest();
      
      if (error) {
        return {
          success: false,
          error: error.message,
        };
      }
      
      return {
        success: true,
        results: results?.map(result => ({
          migrationName: result.migrationName,
          direction: result.direction,
          status: result.status,
        })),
      };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
      };
    }
  }

  /**
   * Rollback the last migration
   */
  async migrateDown(): Promise<MigrationResult> {
    try {
      const { error, results } = await this.migrator.migrateDown();
      
      if (error) {
        return {
          success: false,
          error: error.message,
        };
      }
      
      return {
        success: true,
        results: results?.map(result => ({
          migrationName: result.migrationName,
          direction: result.direction,
          status: result.status,
        })),
      };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
      };
    }
  }

  /**
   * Migrate to a specific migration
   */
  async migrateTo(migrationName: string): Promise<MigrationResult> {
    try {
      const { error, results } = await this.migrator.migrateTo(migrationName);
      
      if (error) {
        return {
          success: false,
          error: error.message,
        };
      }
      
      return {
        success: true,
        results: results?.map(result => ({
          migrationName: result.migrationName,
          direction: result.direction,
          status: result.status,
        })),
      };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
      };
    }
  }

  /**
   * Get list of executed migrations
   */
  async getExecutedMigrations(): Promise<string[]> {
    const migrations = await this.db
      .selectFrom('kysely_migration')
      .select('name')
      .orderBy('timestamp', 'asc')
      .execute();
    
    return migrations.map(m => m.name);
  }

  /**
   * Get list of pending migrations
   */
  async getPendingMigrations(): Promise<string[]> {
    const allMigrations = await this.getAllMigrations();
    const executedMigrations = await this.getExecutedMigrations();
    
    return allMigrations.filter(migration => !executedMigrations.includes(migration));
  }

  /**
   * Get list of all available migrations
   */
  private async getAllMigrations(): Promise<string[]> {
    const migrationsPath = path.join(__dirname, '../migrations');
    const files = await fs.readdir(migrationsPath);
    
    return files
      .filter(file => file.endsWith('.sql'))
      .map(file => file.replace('.sql', ''))
      .sort();
  }

  /**
   * Create a new migration file
   */
  async createMigration(name: string, content: string): Promise<string> {
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    const filename = `${timestamp}_${name}.sql`;
    const filepath = path.join(__dirname, '../migrations', filename);
    
    await fs.writeFile(filepath, content);
    
    return filename;
  }

  /**
   * Reset database (drop all tables and re-run migrations)
   */
  async resetDatabase(): Promise<MigrationResult> {
    const config = getDatabaseConfig();
    
    try {
      // Drop all tables
      if (config.type === 'postgres') {
        await this.db.schema.raw('DROP SCHEMA public CASCADE').execute();
        await this.db.schema.raw('CREATE SCHEMA public').execute();
      } else {
        // For SQLite, we need to drop tables individually
        const tables = await this.db.introspection.getTables();
        for (const table of tables) {
          await this.db.schema.dropTable(table.name).ifExists().execute();
        }
      }
      
      // Re-run all migrations
      return await this.migrateToLatest();
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
      };
    }
  }

  /**
   * Validate migration files for cross-database compatibility
   */
  async validateMigrations(): Promise<{ valid: boolean; issues: string[] }> {
    const issues: string[] = [];
    const migrations = await this.getAllMigrations();
    
    for (const migration of migrations) {
      const filepath = path.join(__dirname, '../migrations', `${migration}.sql`);
      const content = await fs.readFile(filepath, 'utf-8');
      
      // Check for database-specific syntax
      const postgresOnlyFeatures = [
        'SERIAL',
        'BIGSERIAL',
        'SMALLSERIAL',
        'JSONB',
        'ARRAY',
        'ENUM',
        'BYTEA',
        'INTERVAL',
        'POINT',
        'POLYGON',
        'INET',
        'CIDR',
        'MACADDR',
        'UUID',
        'TSVECTOR',
        'TSQUERY',
      ];
      
      const sqliteOnlyFeatures = [
        'AUTOINCREMENT',
        'WITHOUT ROWID',
        'GENERATED ALWAYS',
        'STRICT',
      ];
      
      for (const feature of postgresOnlyFeatures) {
        if (content.toUpperCase().includes(feature)) {
          issues.push(`Migration ${migration} uses PostgreSQL-specific feature: ${feature}`);
        }
      }
      
      for (const feature of sqliteOnlyFeatures) {
        if (content.toUpperCase().includes(feature)) {
          issues.push(`Migration ${migration} uses SQLite-specific feature: ${feature}`);
        }
      }
      
      // Check for potentially incompatible syntax
      if (content.includes('ALTER TABLE') && content.includes('DROP COLUMN')) {
        issues.push(`Migration ${migration} uses DROP COLUMN which may not work in older SQLite versions`);
      }
    }
    
    return {
      valid: issues.length === 0,
      issues,
    };
  }
}

// Convenience functions
export async function migrateToLatest(): Promise<MigrationResult> {
  const migrator = new DatabaseMigrator();
  return await migrator.migrateToLatest();
}

export async function migrateDown(): Promise<MigrationResult> {
  const migrator = new DatabaseMigrator();
  return await migrator.migrateDown();
}

export async function resetDatabase(): Promise<MigrationResult> {
  const migrator = new DatabaseMigrator();
  return await migrator.resetDatabase();
}

export async function validateMigrations(): Promise<{ valid: boolean; issues: string[] }> {
  const migrator = new DatabaseMigrator();
  return await migrator.validateMigrations();
}
