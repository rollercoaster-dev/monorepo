/**
 * Database Reset Helper for E2E Tests
 *
 * This helper provides methods for resetting the database between tests
 * to ensure a clean state for each test.
 */

import { DatabaseFactory } from "@/infrastructure/database/database.factory";
import { logger } from "@/utils/logging/logger.service";

/**
 * Reset a SQLite database by deleting all data
 *
 * This version uses the RepositoryFactory's connection manager to ensure
 * we're operating on the same database instance used by the tests.
 * This is critical for :memory: databases where each connection is separate.
 */
async function resetSqliteDatabase(): Promise<void> {
  try {
    logger.info("Resetting SQLite database...");

    // Tables to clean up (in order to avoid foreign key constraints)
    const tables = [
      "credential_status_entries",
      "status_lists",
      "user_assertions",
      "user_roles",
      "platform_users",
      "assertions",
      "badge_classes",
      "issuers",
      "platforms",
      "roles",
      "api_keys",
      "users",
    ];

    logger.info("Resetting database tables", { tables });

    // Import RepositoryFactory to get the same connection used by tests
    const { RepositoryFactory } =
      await import("@/infrastructure/repository.factory");

    // Get the SQLite connection manager from RepositoryFactory
    // This ensures we use the SAME database connection as the test server
    const connectionManager = RepositoryFactory.getSqliteConnectionManager();
    if (!connectionManager) {
      logger.warn(
        "SQLite connection manager not available, database may not be initialized yet",
      );
      return;
    }

    // Get the underlying database client
    const sqliteDb = connectionManager.getClient();

    // Disable foreign key constraints temporarily
    sqliteDb.run("PRAGMA foreign_keys = OFF");

    // Delete all data from each table
    for (const table of tables) {
      try {
        // Use direct SQL to delete all data
        sqliteDb.run(`DELETE FROM ${table}`);

        // Verify the deletion by counting rows
        try {
          const count = sqliteDb
            .query(`SELECT COUNT(*) as count FROM ${table}`)
            .get() as { count: number } | null;
          logger.debug(
            `Deleted all data from ${table}, remaining rows: ${
              count?.count || 0
            }`,
          );
        } catch (countError) {
          logger.debug(`Could not count rows in ${table}`, {
            error:
              countError instanceof Error
                ? countError.message
                : String(countError),
          });
        }
      } catch (error) {
        // Table might not exist, which is fine
        logger.debug(`Error deleting from ${table}`, {
          error: error instanceof Error ? error.message : String(error),
        });
      }
    }

    // Re-enable foreign key constraints
    sqliteDb.run("PRAGMA foreign_keys = ON");

    logger.info("SQLite database reset successfully");
  } catch (error) {
    logger.error("Failed to reset SQLite database", {
      error: error instanceof Error ? error.message : String(error),
      stack: error instanceof Error ? error.stack : undefined,
    });
    throw error;
  }
}

/**
 * Reset a PostgreSQL database by truncating all tables
 *
 * This is a simplified version that doesn't try to access the internal client directly.
 * Instead, it uses the database interface methods to delete data from each table.
 */
async function resetPostgresDatabase(): Promise<void> {
  try {
    logger.info("Resetting PostgreSQL database...");

    // Get database instance - this line establishes connection and ensures DB is available
    await DatabaseFactory.createDatabase("postgresql");

    // Tables to clean up (in order to avoid foreign key constraints)
    const tables = [
      "credential_status_entries",
      "status_lists",
      "user_assertions",
      "user_roles",
      "platform_users",
      "assertions",
      "badge_classes",
      "issuers",
      "platforms",
      "roles",
      "api_keys",
      "users",
    ];

    // Get direct access to the PostgreSQL database
    const postgres = await import("postgres");
    const connectionString =
      process.env.DATABASE_URL ||
      "postgresql://postgres:postgres@localhost:5432/openbadges_test";

    try {
      const pgClient = postgres.default(connectionString, {
        max: 1,
        connect_timeout: 10,
        idle_timeout: 10,
        max_lifetime: 60,
      });

      try {
        // Disable triggers to avoid foreign key constraint issues
        await pgClient.unsafe(`SET session_replication_role = 'replica'`);

        // Delete all data from each table
        for (const table of tables) {
          try {
            // Use direct SQL to delete all data
            await pgClient.unsafe(`DELETE FROM ${table}`);
            logger.debug(`Deleted all data from ${table}`);
          } catch (error) {
            // Table might not exist, which is fine
            logger.debug(`Error deleting from ${table}`, {
              error: error instanceof Error ? error.message : String(error),
            });
          }
        }

        // Re-enable triggers
        await pgClient.unsafe(`SET session_replication_role = 'origin'`);
      } finally {
        // Always close the connection, even if there's an error
        try {
          await pgClient.end();
        } catch (closeError) {
          logger.warn("Error closing PostgreSQL connection", {
            error:
              closeError instanceof Error
                ? closeError.message
                : String(closeError),
          });
        }
      }
    } catch (error) {
      logger.error("Failed to connect to PostgreSQL database", {
        error: error instanceof Error ? error.message : String(error),
        stack: error instanceof Error ? error.stack : undefined,
      });
      // Re-throw the error to ensure test failures are visible
      throw error;
    }

    logger.info("PostgreSQL database reset successfully");
  } catch (error) {
    logger.error("Failed to reset PostgreSQL database", {
      error: error instanceof Error ? error.message : String(error),
      stack: error instanceof Error ? error.stack : undefined,
    });
    throw error;
  }
}

/**
 * Reset the database to a clean state
 */
export async function resetDatabase(): Promise<void> {
  // Use DB_TYPE environment variable to determine which database to reset
  const dbType = process.env.DB_TYPE || "sqlite";

  logger.info("Resetting database", {
    dbType,
  });

  try {
    if (dbType === "sqlite") {
      await resetSqliteDatabase();
    } else if (dbType === "postgresql") {
      await resetPostgresDatabase();
    } else {
      throw new Error(`Unsupported database type: ${dbType}`);
    }
    logger.info("Database reset completed successfully");
  } catch (error) {
    logger.error("Failed to reset database", {
      // Changed from warn to error
      error: error instanceof Error ? error.message : String(error),
      stack: error instanceof Error ? error.stack : undefined,
    });
    // Re-throw the error to ensure test failures are visible
    throw error;
  }
}
