/**
 * JWT Service Unit Tests
 *
 * This file contains unit tests for the JWT service.
 * Tests the real JwtService implementation without mocking.
 *
 * IMPORTANT: Run this test separately from tests that mock JwtService
 * using mock.module(), as Bun's module mocking affects the global module cache.
 *
 * Run with: bun run test:jwt-service
 */

import { describe, test, expect, beforeAll, afterAll } from "bun:test";
import { JwtService, type JwtPayload } from "@/auth/services/jwt.service";

describe("JWT Service", () => {
  // Save original environment variables
  const originalEnv = { ...process.env };

  beforeAll(() => {
    // Set environment variables for testing
    process.env.JWT_SECRET = "test-secret-for-jwt-service-tests";
    process.env.JWT_TOKEN_EXPIRY_SECONDS = "3600";
    process.env.JWT_ISSUER = "test-issuer";
  });

  afterAll(() => {
    // Restore original environment variables
    process.env = originalEnv;
  });

  test("should generate a JWT token", async () => {
    const payload: JwtPayload = {
      sub: "test-user",
      provider: "test-provider",
      claims: { roles: ["user"] },
    };

    const token = await JwtService.generateToken(payload);

    expect(token).toBeDefined();
    expect(typeof token).toBe("string");
    expect(token.split(".").length).toBe(3); // JWT has 3 parts
  });

  test("should verify a valid JWT token", async () => {
    // Generate a token using the real service
    const payload: JwtPayload = {
      sub: "test-user",
      provider: "test-provider",
      claims: { roles: ["user"] },
    };

    const token = await JwtService.generateToken(payload);

    // Verify it using the real service
    const decoded = await JwtService.verifyToken(token);

    expect(decoded).toBeDefined();
    expect(decoded.sub).toBe(payload.sub);
    expect(decoded.provider).toBe(payload.provider);
    expect(decoded.claims).toEqual(payload.claims);
    expect(decoded.iss).toBeDefined();
    expect(decoded.exp).toBeDefined();
  });

  test("should reject an invalid JWT token", async () => {
    // Try to verify a malformed token
    const invalidToken = "invalid.token.signature";

    await expect(JwtService.verifyToken(invalidToken)).rejects.toThrow();
  });

  test("should extract token from Authorization header", () => {
    const token = "test-token";
    const authHeader = `Bearer ${token}`;

    const extractedToken = JwtService.extractTokenFromHeader(authHeader);

    expect(extractedToken).toBe(token);
  });

  test("should return null for invalid Authorization header", () => {
    const invalidHeader = "Basic dXNlcjpwYXNz";

    const extractedToken = JwtService.extractTokenFromHeader(invalidHeader);

    expect(extractedToken).toBeNull();
  });

  test("should return null for null Authorization header", () => {
    const extractedToken = JwtService.extractTokenFromHeader(null);

    expect(extractedToken).toBeNull();
  });

  test("should extract token from Authorization header with Bearer prefix", () => {
    // Create a token
    const token = "test-token";

    // Create an Authorization header
    const authHeader = `Bearer ${token}`;

    // Extract token from Authorization header
    const extractedToken = JwtService.extractTokenFromHeader(authHeader);

    // Check the result
    expect(extractedToken).toBe(token);
  });

  test("should return null for missing Authorization header", () => {
    // Create a request with no Authorization header
    const request = new Request("http://localhost/api/protected");

    // Extract token from Authorization header
    const extractedToken = JwtService.extractTokenFromHeader(
      request.headers.get("Authorization"),
    );

    // Check the result
    expect(extractedToken).toBeNull();
  });
});
