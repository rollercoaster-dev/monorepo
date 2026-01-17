import {
  describe,
  expect,
  it,
  beforeAll,
  afterAll,
  beforeEach,
} from "bun:test";
import { Database } from "bun:sqlite";
import { drizzle } from "drizzle-orm/bun-sqlite";
import { SqliteApiKeyRepository } from "@/infrastructure/database/modules/sqlite/repositories/sqlite-api-key.repository";
import { SqliteConnectionManager } from "@/infrastructure/database/modules/sqlite/connection/sqlite-connection.manager";
import { ApiKey } from "@/domains/auth/apiKey.entity";
import type { Shared } from "openbadges-types";

describe("SqliteApiKeyRepository", () => {
  let db: Database;
  let connectionManager: SqliteConnectionManager;
  let repository: SqliteApiKeyRepository;

  beforeAll(async () => {
    // Create an in-memory SQLite database for testing
    db = new Database(":memory:");

    // Create the users table first (required for foreign key)
    db.exec(`
      CREATE TABLE IF NOT EXISTS users (
        id TEXT PRIMARY KEY,
        username TEXT NOT NULL UNIQUE,
        email TEXT NOT NULL UNIQUE,
        password_hash TEXT,
        first_name TEXT,
        last_name TEXT,
        roles TEXT NOT NULL DEFAULT '[]',
        permissions TEXT NOT NULL DEFAULT '[]',
        is_active INTEGER NOT NULL DEFAULT 1,
        last_login INTEGER,
        metadata TEXT,
        created_at INTEGER NOT NULL,
        updated_at INTEGER NOT NULL
      );
    `);

    // Create the api_keys table
    db.exec(`
      CREATE TABLE IF NOT EXISTS api_keys (
        id TEXT PRIMARY KEY,
        key TEXT NOT NULL UNIQUE,
        name TEXT NOT NULL,
        user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        description TEXT,
        permissions TEXT NOT NULL,
        revoked INTEGER NOT NULL DEFAULT 0,
        revoked_at INTEGER,
        last_used INTEGER,
        created_at INTEGER NOT NULL,
        updated_at INTEGER NOT NULL
      );
    `);

    // Insert a test user for foreign key relationships
    db.exec(`
      INSERT INTO users (id, username, email, roles, permissions, created_at, updated_at)
      VALUES ('test-user-id', 'testuser', 'test@example.com', '[]', '[]', ${Date.now()}, ${Date.now()});
    `);

    // Create drizzle instance
    const drizzleDb = drizzle(db);

    // Initialize the connection manager with the database instance and config
    connectionManager = new SqliteConnectionManager(db, {
      maxConnectionAttempts: 3,
      connectionRetryDelayMs: 1000,
    });

    // Set the drizzle instance and connection state directly (for testing)
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    (connectionManager as any).db = drizzleDb;
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    (connectionManager as any).client = db;
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    (connectionManager as any).connectionState = "connected";

    // Initialize the repository
    repository = new SqliteApiKeyRepository(connectionManager);
  });

  afterAll(async () => {
    // Disconnect and close the database connection
    await connectionManager.disconnect();
    db.close();
  });

  beforeEach(() => {
    // Clean up api_keys table before each test (but keep the test user)
    db.exec("DELETE FROM api_keys;");
  });

  it("should create an API key", async () => {
    const apiKey = ApiKey.create({
      name: "Test API Key",
      userId: "test-user-id",
      description: "A test API key",
      permissions: { roles: ["admin"], permissions: ["read", "write"] },
    });

    const createdApiKey = await repository.create(apiKey);

    expect(createdApiKey).toBeDefined();
    expect(createdApiKey.id).toBeDefined();
    expect(createdApiKey.key).toBeDefined();
    expect(createdApiKey.name).toBe("Test API Key");
    expect(createdApiKey.userId).toBe("test-user-id");
    expect(createdApiKey.description).toBe("A test API key");
    expect(createdApiKey.permissions).toEqual({
      roles: ["admin"],
      permissions: ["read", "write"],
    });
    expect(createdApiKey.revoked).toBe(false);

    // Verify the API key can be retrieved
    const retrievedApiKey = await repository.findById(createdApiKey.id);
    expect(retrievedApiKey).toBeDefined();
    expect(retrievedApiKey?.id).toBe(createdApiKey.id);
    expect(retrievedApiKey?.name).toBe("Test API Key");
  });

  it("should find an API key by ID", async () => {
    const apiKey = ApiKey.create({
      name: "Find By ID Test",
      userId: "test-user-id",
    });

    const createdApiKey = await repository.create(apiKey);
    const foundApiKey = await repository.findById(createdApiKey.id);

    expect(foundApiKey).toBeDefined();
    expect(foundApiKey?.id).toBe(createdApiKey.id);
    expect(foundApiKey?.name).toBe("Find By ID Test");
  });

  it("should return null when finding a non-existent API key by ID", async () => {
    const nonExistentId =
      "urn:uuid:00000000-0000-0000-0000-000000000000" as Shared.IRI;
    const foundApiKey = await repository.findById(nonExistentId);

    expect(foundApiKey).toBeNull();
  });

  it("should find an API key by key value", async () => {
    const apiKey = ApiKey.create({
      name: "Find By Key Test",
      userId: "test-user-id",
    });

    const createdApiKey = await repository.create(apiKey);
    const foundApiKey = await repository.findByKey(createdApiKey.key);

    expect(foundApiKey).toBeDefined();
    expect(foundApiKey?.id).toBe(createdApiKey.id);
    expect(foundApiKey?.key).toBe(createdApiKey.key);
    expect(foundApiKey?.name).toBe("Find By Key Test");
  });

  it("should return null when finding a non-existent API key by key value", async () => {
    const foundApiKey = await repository.findByKey("non-existent-key");

    expect(foundApiKey).toBeNull();
  });

  it("should find all API keys for a user", async () => {
    // Create multiple API keys for the same user
    const apiKey1 = ApiKey.create({
      name: "User API Key 1",
      userId: "test-user-id",
    });

    const apiKey2 = ApiKey.create({
      name: "User API Key 2",
      userId: "test-user-id",
    });

    await repository.create(apiKey1);
    await repository.create(apiKey2);

    const userApiKeys = await repository.findByUserId("test-user-id");

    expect(userApiKeys).toBeDefined();
    expect(userApiKeys.length).toBe(2);
    expect(userApiKeys.some((k) => k.name === "User API Key 1")).toBe(true);
    expect(userApiKeys.some((k) => k.name === "User API Key 2")).toBe(true);
  });

  it("should return empty array when finding API keys for a user with none", async () => {
    const userApiKeys = await repository.findByUserId("non-existent-user");

    expect(userApiKeys).toBeDefined();
    expect(userApiKeys.length).toBe(0);
  });

  it("should find all API keys", async () => {
    const apiKey1 = ApiKey.create({
      name: "All Keys Test 1",
      userId: "test-user-id",
    });

    const apiKey2 = ApiKey.create({
      name: "All Keys Test 2",
      userId: "test-user-id",
    });

    await repository.create(apiKey1);
    await repository.create(apiKey2);

    const allApiKeys = await repository.findAll();

    expect(allApiKeys).toBeDefined();
    expect(allApiKeys.length).toBeGreaterThanOrEqual(2);
    expect(allApiKeys.some((k) => k.name === "All Keys Test 1")).toBe(true);
    expect(allApiKeys.some((k) => k.name === "All Keys Test 2")).toBe(true);
  });

  it("should update an API key", async () => {
    const apiKey = ApiKey.create({
      name: "Update Test",
      userId: "test-user-id",
      description: "Original description",
    });

    const createdApiKey = await repository.create(apiKey);

    const updatedApiKey = await repository.update(createdApiKey.id, {
      name: "Updated Name",
      description: "Updated description",
      permissions: { roles: ["user"], scope: "read-only" },
    });

    expect(updatedApiKey).toBeDefined();
    expect(updatedApiKey?.id).toBe(createdApiKey.id);
    expect(updatedApiKey?.name).toBe("Updated Name");
    expect(updatedApiKey?.description).toBe("Updated description");
    expect(updatedApiKey?.permissions).toEqual({
      roles: ["user"],
      scope: "read-only",
    });
  });

  it("should return null when updating a non-existent API key", async () => {
    const nonExistentId =
      "urn:uuid:00000000-0000-0000-0000-000000000000" as Shared.IRI;
    const updatedApiKey = await repository.update(nonExistentId, {
      name: "Updated Name",
    });

    expect(updatedApiKey).toBeNull();
  });

  it("should delete an API key", async () => {
    const apiKey = ApiKey.create({
      name: "Delete Test",
      userId: "test-user-id",
    });

    const createdApiKey = await repository.create(apiKey);
    const deleted = await repository.delete(createdApiKey.id);

    expect(deleted).toBe(true);

    // Verify the API key cannot be retrieved
    const retrievedApiKey = await repository.findById(createdApiKey.id);
    expect(retrievedApiKey).toBeNull();
  });

  it("should return false when deleting a non-existent API key", async () => {
    const nonExistentId =
      "urn:uuid:00000000-0000-0000-0000-000000000000" as Shared.IRI;
    const deleted = await repository.delete(nonExistentId);

    expect(deleted).toBe(false);
  });

  it("should revoke an API key", async () => {
    const apiKey = ApiKey.create({
      name: "Revoke Test",
      userId: "test-user-id",
    });

    const createdApiKey = await repository.create(apiKey);
    expect(createdApiKey.revoked).toBe(false);

    const revokedApiKey = await repository.revoke(createdApiKey.id);

    expect(revokedApiKey).toBeDefined();
    expect(revokedApiKey?.id).toBe(createdApiKey.id);
    expect(revokedApiKey?.revoked).toBe(true);
  });

  it("should return null when revoking a non-existent API key", async () => {
    const nonExistentId =
      "urn:uuid:00000000-0000-0000-0000-000000000000" as Shared.IRI;
    const revokedApiKey = await repository.revoke(nonExistentId);

    expect(revokedApiKey).toBeNull();
  });

  it("should update last used timestamp", async () => {
    const apiKey = ApiKey.create({
      name: "Last Used Test",
      userId: "test-user-id",
    });

    const createdApiKey = await repository.create(apiKey);
    expect(createdApiKey.lastUsedAt).toBeUndefined();

    const updatedApiKey = await repository.updateLastUsed(createdApiKey.id);

    expect(updatedApiKey).toBeDefined();
    expect(updatedApiKey?.id).toBe(createdApiKey.id);
    expect(updatedApiKey?.lastUsedAt).toBeDefined();
    expect(updatedApiKey?.lastUsedAt).toBeInstanceOf(Date);
  });

  it("should return null when updating last used for a non-existent API key", async () => {
    const nonExistentId =
      "urn:uuid:00000000-0000-0000-0000-000000000000" as Shared.IRI;
    const updatedApiKey = await repository.updateLastUsed(nonExistentId);

    expect(updatedApiKey).toBeNull();
  });

  it("should preserve permissions as JSON through round-trip", async () => {
    const complexPermissions = {
      roles: ["admin", "editor"],
      permissions: ["read", "write", "delete"],
      scope: "full",
      customField: "custom-value",
    };

    const apiKey = ApiKey.create({
      name: "JSON Permissions Test",
      userId: "test-user-id",
      permissions: complexPermissions,
    });

    const createdApiKey = await repository.create(apiKey);
    const retrievedApiKey = await repository.findById(createdApiKey.id);

    expect(retrievedApiKey).toBeDefined();
    expect(retrievedApiKey?.permissions).toEqual(complexPermissions);
  });

  it("should handle API key with minimal data", async () => {
    const apiKey = ApiKey.create({
      name: "Minimal API Key",
      userId: "test-user-id",
    });

    const createdApiKey = await repository.create(apiKey);

    expect(createdApiKey).toBeDefined();
    expect(createdApiKey.name).toBe("Minimal API Key");
    expect(createdApiKey.userId).toBe("test-user-id");
    expect(createdApiKey.description).toBeUndefined();
    expect(createdApiKey.permissions).toEqual({ roles: [], permissions: [] });
  });
});
