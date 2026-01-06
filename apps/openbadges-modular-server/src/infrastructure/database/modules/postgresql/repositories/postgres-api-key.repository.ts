/**
 * PostgreSQL implementation of the API Key repository
 *
 * This class implements the ApiKeyRepository interface using PostgreSQL
 * and the Data Mapper pattern with Drizzle ORM.
 */

import { eq } from "drizzle-orm";
import { drizzle } from "drizzle-orm/postgres-js";
import type postgres from "postgres";
import { ApiKey, type ApiKeyPermissions } from "@domains/auth/apiKey.entity";
import type { ApiKeyRepository } from "@domains/auth/apiKey.repository";
import type { Shared } from "openbadges-types";
import { logger } from "@utils/logging/logger.service";
import { convertUuid } from "@infrastructure/database/utils/type-conversion";
import { apiKeys } from "../schema";

/**
 * PostgreSQL implementation of the API Key repository
 */
export class PostgresApiKeyRepository implements ApiKeyRepository {
  private db;

  /**
   * Constructor
   * @param client PostgreSQL client
   */
  constructor(client: postgres.Sql) {
    this.db = drizzle(client);
  }

  /**
   * Creates a new API key
   * @param apiKey The API key to create
   * @returns The created API key
   */
  async create(apiKey: ApiKey): Promise<ApiKey> {
    try {
      // Convert URN to UUID for PostgreSQL
      const dbId = convertUuid(apiKey.id as string, "postgresql", "to");
      const dbUserId = convertUuid(apiKey.userId, "postgresql", "to");

      // Insert into database
      await this.db.insert(apiKeys).values({
        id: dbId,
        key: apiKey.key,
        name: apiKey.name,
        userId: dbUserId,
        description: apiKey.description ?? null,
        permissions: apiKey.permissions,
        revoked: apiKey.revoked,
        revokedAt: null,
        lastUsed: apiKey.lastUsedAt ?? null,
        createdAt: apiKey.createdAt,
        updatedAt: apiKey.updatedAt,
      });

      return apiKey;
    } catch (error) {
      logger.error("Error creating API Key in PostgreSQL repository", {
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
      const dbId = convertUuid(id as string, "postgresql", "to");

      const result = await this.db
        .select()
        .from(apiKeys)
        .where(eq(apiKeys.id, dbId));

      if (!result.length) {
        return null;
      }

      return this.toDomain(result[0]);
    } catch (error) {
      logger.error("Error finding API Key by ID in PostgreSQL repository", {
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
      const result = await this.db
        .select()
        .from(apiKeys)
        .where(eq(apiKeys.key, key));

      if (!result.length) {
        return null;
      }

      return this.toDomain(result[0]);
    } catch (error) {
      logger.error("Error finding API Key by key in PostgreSQL repository", {
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
      const dbUserId = convertUuid(userId, "postgresql", "to");

      const result = await this.db
        .select()
        .from(apiKeys)
        .where(eq(apiKeys.userId, dbUserId));

      return result.map((record) => this.toDomain(record));
    } catch (error) {
      logger.error("Error finding API Keys by user ID in PostgreSQL repository", {
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
      const result = await this.db.select().from(apiKeys);
      return result.map((record) => this.toDomain(record));
    } catch (error) {
      logger.error("Error finding all API Keys in PostgreSQL repository", {
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

      const dbId = convertUuid(id as string, "postgresql", "to");

      // Build update values
      const updateValues: Record<string, unknown> = {
        updatedAt: new Date(),
      };

      if (data.name !== undefined) updateValues.name = data.name;
      if (data.description !== undefined) updateValues.description = data.description;
      if (data.permissions !== undefined) updateValues.permissions = data.permissions;
      if (data.revoked !== undefined) updateValues.revoked = data.revoked;
      if (data.lastUsedAt !== undefined) updateValues.lastUsed = data.lastUsedAt;

      await this.db.update(apiKeys).set(updateValues).where(eq(apiKeys.id, dbId));

      // Fetch and return updated record
      return this.findById(id);
    } catch (error) {
      logger.error("Error updating API Key in PostgreSQL repository", {
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
      const dbId = convertUuid(id as string, "postgresql", "to");

      const result = await this.db
        .delete(apiKeys)
        .where(eq(apiKeys.id, dbId))
        .returning({ id: apiKeys.id });

      return result.length > 0;
    } catch (error) {
      logger.error("Error deleting API Key in PostgreSQL repository", {
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

      const dbId = convertUuid(id as string, "postgresql", "to");

      await this.db
        .update(apiKeys)
        .set({
          revoked: true,
          revokedAt: new Date(),
          updatedAt: new Date(),
        })
        .where(eq(apiKeys.id, dbId));

      return this.findById(id);
    } catch (error) {
      logger.error("Error revoking API Key in PostgreSQL repository", {
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

      const dbId = convertUuid(id as string, "postgresql", "to");

      await this.db
        .update(apiKeys)
        .set({
          lastUsed: new Date(),
          updatedAt: new Date(),
        })
        .where(eq(apiKeys.id, dbId));

      return this.findById(id);
    } catch (error) {
      logger.error("Error updating API Key last used in PostgreSQL repository", {
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

    apiKey.id = convertUuid(
      record.id as string,
      "postgresql",
      "from"
    ) as Shared.IRI;
    apiKey.key = record.key as string;
    apiKey.name = record.name as string;
    apiKey.userId = convertUuid(
      record.userId as string,
      "postgresql",
      "from"
    );
    apiKey.description = record.description as string | undefined;
    apiKey.permissions = record.permissions as ApiKeyPermissions;
    apiKey.revoked = Boolean(record.revoked);
    apiKey.lastUsedAt = record.lastUsed as Date | undefined;
    apiKey.createdAt = record.createdAt as Date;
    apiKey.updatedAt = record.updatedAt as Date;

    return apiKey;
  }
}
