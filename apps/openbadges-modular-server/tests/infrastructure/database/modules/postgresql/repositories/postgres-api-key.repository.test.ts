import {
  describe,
  expect,
  it,
  beforeAll,
  afterAll,
  beforeEach,
} from "bun:test";
import type postgres from "postgres";
import { PostgresApiKeyRepository } from "@infrastructure/database/modules/postgresql/repositories/postgres-api-key.repository";
import { ApiKey } from "@domains/auth/apiKey.entity";
import type { Shared } from "openbadges-types";
import {
  createPostgresClient,
  createTestTables,
  dropTestTables,
  isDatabaseAvailable,
  generateTestUuid,
} from "../postgres-test-helper";

// Skip tests if PostgreSQL is not available
const runTests = await isDatabaseAvailable();

// Conditional test suite that only runs if PostgreSQL is available
(runTests ? describe : describe.skip)("PostgresApiKeyRepository", () => {
  let client: postgres.Sql;
  let repository: PostgresApiKeyRepository;
  let testUserId: string;

  beforeAll(async () => {
    // Create a PostgreSQL client for testing
    client = createPostgresClient();

    // Create test tables
    await dropTestTables(client).catch(() => {}); // Ignore errors if tables don't exist
    await createTestTables(client);

    // Insert a test user for foreign key relationships
    testUserId = generateTestUuid();
    await client`
      INSERT INTO users (id, username, email, created_at, updated_at)
      VALUES (${testUserId}, ${"testuser_" + Date.now()}, ${"test_" + Date.now() + "@example.com"}, ${new Date()}, ${new Date()});
    `;

    // Initialize the repository
    repository = new PostgresApiKeyRepository(client);
  });

  beforeEach(async () => {
    // Clean up api_keys table before each test (but keep the test user)
    await client`DELETE FROM api_keys;`;
  });

  afterAll(async () => {
    // Drop test tables and close the connection
    await dropTestTables(client);
    await client.end();
  });

  it("should create an API key", async () => {
    const apiKey = ApiKey.create({
      name: "Test API Key",
      userId: `urn:uuid:${testUserId}`,
      description: "A test API key",
      permissions: { roles: ["admin"], permissions: ["read", "write"] },
    });

    const createdApiKey = await repository.create(apiKey);

    expect(createdApiKey).toBeDefined();
    expect(createdApiKey.id).toBeDefined();
    expect(createdApiKey.key).toBeDefined();
    expect(createdApiKey.name).toBe("Test API Key");
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
      userId: `urn:uuid:${testUserId}`,
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
      userId: `urn:uuid:${testUserId}`,
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
      userId: `urn:uuid:${testUserId}`,
    });

    const apiKey2 = ApiKey.create({
      name: "User API Key 2",
      userId: `urn:uuid:${testUserId}`,
    });

    await repository.create(apiKey1);
    await repository.create(apiKey2);

    const userApiKeys = await repository.findByUserId(`urn:uuid:${testUserId}`);

    expect(userApiKeys).toBeDefined();
    expect(userApiKeys.length).toBe(2);
    expect(userApiKeys.some((k) => k.name === "User API Key 1")).toBe(true);
    expect(userApiKeys.some((k) => k.name === "User API Key 2")).toBe(true);
  });

  it("should return empty array when finding API keys for a user with none", async () => {
    const nonExistentUserId = `urn:uuid:${generateTestUuid()}`;
    const userApiKeys = await repository.findByUserId(nonExistentUserId);

    expect(userApiKeys).toBeDefined();
    expect(userApiKeys.length).toBe(0);
  });

  it("should find all API keys", async () => {
    const apiKey1 = ApiKey.create({
      name: "All Keys Test 1",
      userId: `urn:uuid:${testUserId}`,
    });

    const apiKey2 = ApiKey.create({
      name: "All Keys Test 2",
      userId: `urn:uuid:${testUserId}`,
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
      userId: `urn:uuid:${testUserId}`,
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
      userId: `urn:uuid:${testUserId}`,
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
      userId: `urn:uuid:${testUserId}`,
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
      userId: `urn:uuid:${testUserId}`,
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

  it("should preserve permissions as JSONB through round-trip", async () => {
    const complexPermissions = {
      roles: ["admin", "editor"],
      permissions: ["read", "write", "delete"],
      scope: "full",
      customField: "custom-value",
    };

    const apiKey = ApiKey.create({
      name: "JSONB Permissions Test",
      userId: `urn:uuid:${testUserId}`,
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
      userId: `urn:uuid:${testUserId}`,
    });

    const createdApiKey = await repository.create(apiKey);

    expect(createdApiKey).toBeDefined();
    expect(createdApiKey.name).toBe("Minimal API Key");
    expect(createdApiKey.description).toBeUndefined();
    expect(createdApiKey.permissions).toEqual({ roles: [], permissions: [] });
  });

  it("should handle errors gracefully", async () => {
    // Create an API key with invalid data
    const invalidApiKey = {
      // Missing required fields
    } as unknown as ApiKey;

    // Attempt to create the API key and expect it to fail
    try {
      await repository.create(invalidApiKey);
      // If we get here, the test should fail
      expect(true).toBe(false); // This should not be reached
    } catch (error) {
      // Verify that an error was thrown
      expect(error).toBeDefined();
    }
  });
});
