/**
 * SQLite implementation of the API Key repository
 *
 * This class implements the ApiKeyRepository interface using SQLite
 * and the Data Mapper pattern with Drizzle ORM.
 */

import { eq } from "drizzle-orm";
import { ApiKey, type ApiKeyPermissions } from "@domains/auth/apiKey.entity";
import type { ApiKeyRepository } from "@domains/auth/apiKey.repository";
import type { Shared } from "openbadges-types";
import { logger } from "@utils/logging/logger.service";
import type { SqliteConnectionManager } from "../connection/sqlite-connection.manager";
import { apiKeys } from "../schema";
import type { drizzle as DrizzleFn } from "drizzle-orm/bun-sqlite";

// Create compile-time type alias to avoid runtime import dependency
type DrizzleDB = ReturnType<typeof DrizzleFn>;

/**
 * SQLite implementation of the API Key repository
 */
export class SqliteApiKeyRepository implements ApiKeyRepository {
  /**
   * Constructor
   * @param connectionManager SQLite connection manager
   */
  constructor(private readonly connectionManager: SqliteConnectionManager) {}

  /**
   * Gets the database instance with connection validation
   */
  private getDatabase(): DrizzleDB {
    this.connectionManager.ensureConnected();
    return this.connectionManager.getDatabase();
  }

  /**
   * Creates a new API key
   * @param apiKey The API key to create
   * @returns The created API key
   */
  async create(apiKey: ApiKey): Promise<ApiKey> {
    try {
      const db = this.getDatabase();

      // Convert dates to integers for SQLite
      const createdAt = apiKey.createdAt.getTime();
      const updatedAt = apiKey.updatedAt.getTime();
      const lastUsed = apiKey.lastUsedAt?.getTime() ?? null;

      // Use type assertion to satisfy Drizzle's strict type inference
      await db.insert(apiKeys).values({
        id: apiKey.id as string,
        key: apiKey.key,
        name: apiKey.name,
        userId: apiKey.userId,
        description: apiKey.description ?? null,
        permissions: JSON.stringify(apiKey.permissions),
        revoked: apiKey.revoked ? 1 : 0,
        revokedAt: null,
        lastUsed,
        createdAt,
        updatedAt,
      } as typeof apiKeys.$inferInsert);

      return apiKey;
    } catch (error) {
      logger.error("Error creating API Key in SQLite repository", {
        error: error instanceof Error ? error.stack : String(error),
        apiKeyId: apiKey.id,
      });
      throw error;
    }
  }

  /**
   * Finds an API key by ID
   * @param id The API key ID
   * @returns The API key if found, null otherwise
   */
  async findById(id: Shared.IRI): Promise<ApiKey | null> {
    try {
      const db = this.getDatabase();

      const result = await db
        .select()
        .from(apiKeys)
        .where(eq(apiKeys.id, id as string));

      if (!result.length) {
        return null;
      }

      return this.toDomain(result[0]);
    } catch (error) {
      logger.error("Error finding API Key by ID in SQLite repository", {
        error: error instanceof Error ? error.stack : String(error),
        id,
      });
      throw error;
    }
  }

  /**
   * Finds an API key by its key value
   * @param key The API key value
   * @returns The API key if found, null otherwise
   */
  async findByKey(key: string): Promise<ApiKey | null> {
    try {
      const db = this.getDatabase();

      const result = await db
        .select()
        .from(apiKeys)
        .where(eq(apiKeys.key, key));

      if (!result.length) {
        return null;
      }

      return this.toDomain(result[0]);
    } catch (error) {
      logger.error("Error finding API Key by key in SQLite repository", {
        error: error instanceof Error ? error.stack : String(error),
      });
      throw error;
    }
  }

  /**
   * Finds all API keys for a user
   * @param userId The user ID
   * @returns Array of API keys for the user
   */
  async findByUserId(userId: string): Promise<ApiKey[]> {
    try {
      const db = this.getDatabase();

      const result = await db
        .select()
        .from(apiKeys)
        .where(eq(apiKeys.userId, userId));

      return result.map((record) => this.toDomain(record));
    } catch (error) {
      logger.error("Error finding API Keys by user ID in SQLite repository", {
        error: error instanceof Error ? error.stack : String(error),
        userId,
      });
      throw error;
    }
  }

  /**
   * Finds all API keys
   * @returns Array of all API keys
   */
  async findAll(): Promise<ApiKey[]> {
    try {
      const db = this.getDatabase();
      const result = await db.select().from(apiKeys);
      return result.map((record) => this.toDomain(record));
    } catch (error) {
      logger.error("Error finding all API Keys in SQLite repository", {
        error: error instanceof Error ? error.stack : String(error),
      });
      throw error;
    }
  }

  /**
   * Updates an API key
   * @param id The API key ID
   * @param data The data to update
   * @returns The updated API key if found, null otherwise
   */
  async update(id: Shared.IRI, data: Partial<ApiKey>): Promise<ApiKey | null> {
    try {
      const existing = await this.findById(id);
      if (!existing) {
        return null;
      }

      const db = this.getDatabase();

      // Build update values
      const updateValues: Record<string, unknown> = {
        updatedAt: Date.now(),
      };

      if (data.name !== undefined) updateValues.name = data.name;
      if (data.description !== undefined)
        updateValues.description = data.description;
      if (data.permissions !== undefined)
        updateValues.permissions = JSON.stringify(data.permissions);
      if (data.revoked !== undefined)
        updateValues.revoked = data.revoked ? 1 : 0;
      if (data.lastUsedAt !== undefined)
        updateValues.lastUsed = data.lastUsedAt.getTime();

      await db
        .update(apiKeys)
        .set(updateValues)
        .where(eq(apiKeys.id, id as string));

      // Fetch and return updated record
      return this.findById(id);
    } catch (error) {
      logger.error("Error updating API Key in SQLite repository", {
        error: error instanceof Error ? error.stack : String(error),
        id,
      });
      throw error;
    }
  }

  /**
   * Deletes an API key
   * @param id The API key ID
   * @returns True if deleted, false otherwise
   */
  async delete(id: Shared.IRI): Promise<boolean> {
    try {
      const existing = await this.findById(id);
      if (!existing) {
        return false;
      }

      const db = this.getDatabase();
      await db.delete(apiKeys).where(eq(apiKeys.id, id as string));

      return true;
    } catch (error) {
      logger.error("Error deleting API Key in SQLite repository", {
        error: error instanceof Error ? error.stack : String(error),
        id,
      });
      throw error;
    }
  }

  /**
   * Revokes an API key
   * @param id The API key ID
   * @returns The revoked API key if found, null otherwise
   */
  async revoke(id: Shared.IRI): Promise<ApiKey | null> {
    try {
      const existing = await this.findById(id);
      if (!existing) {
        return null;
      }

      const db = this.getDatabase();

      await db
        .update(apiKeys)
        .set({
          revoked: 1,
          revokedAt: Date.now(),
          updatedAt: Date.now(),
        } as Partial<typeof apiKeys.$inferInsert>)
        .where(eq(apiKeys.id, id as string));

      return this.findById(id);
    } catch (error) {
      logger.error("Error revoking API Key in SQLite repository", {
        error: error instanceof Error ? error.stack : String(error),
        id,
      });
      throw error;
    }
  }

  /**
   * Updates the last used timestamp for an API key
   * @param id The API key ID
   * @returns The updated API key if found, null otherwise
   */
  async updateLastUsed(id: Shared.IRI): Promise<ApiKey | null> {
    try {
      const existing = await this.findById(id);
      if (!existing) {
        return null;
      }

      const db = this.getDatabase();

      await db
        .update(apiKeys)
        .set({
          lastUsed: Date.now(),
          updatedAt: Date.now(),
        } as Partial<typeof apiKeys.$inferInsert>)
        .where(eq(apiKeys.id, id as string));

      return this.findById(id);
    } catch (error) {
      logger.error("Error updating API Key last used in SQLite repository", {
        error: error instanceof Error ? error.stack : String(error),
        id,
      });
      throw error;
    }
  }

  /**
   * Converts a database record to a domain entity
   * @param record The database record
   * @returns The domain entity
   */
  private toDomain(record: Record<string, unknown>): ApiKey {
    const apiKey = new ApiKey();

    apiKey.id = record.id as Shared.IRI;
    apiKey.key = record.key as string;
    apiKey.name = record.name as string;
    apiKey.userId = record.userId as string;
    apiKey.description = record.description as string | undefined;

    // Parse permissions from JSON string
    const permissions = record.permissions as string;
    apiKey.permissions = JSON.parse(permissions) as ApiKeyPermissions;

    apiKey.revoked = Boolean(record.revoked);

    // Convert integer timestamps to Date objects
    if (record.lastUsed) {
      apiKey.lastUsedAt = new Date(record.lastUsed as number);
    }
    apiKey.createdAt = new Date(record.createdAt as number);
    apiKey.updatedAt = new Date(record.updatedAt as number);

    return apiKey;
  }
}
