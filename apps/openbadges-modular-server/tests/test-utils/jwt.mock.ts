/**
 * JWT Service Mock Utilities
 *
 * This file provides proper test isolation for JwtService mocking using Bun's mock.module().
 * Using mock.module() ensures each test file gets its own isolated mock instance,
 * preventing race conditions and global state pollution that caused flaky tests.
 *
 * @see https://bun.sh/docs/test/mocks#mock-module
 */

import { mock, type Mock } from "bun:test";
import { TEST_TOKENS } from "./constants";

/**
 * JWT payload returned by mock verifyToken
 */
interface MockJwtPayload {
  sub: string;
  provider: string;
  claims: { roles: string[] };
}

/**
 * Mock JwtService type for type safety
 */
interface MockJwtService {
  generateToken: Mock<(payload: unknown) => Promise<string>>;
  verifyToken: Mock<(token: string) => Promise<MockJwtPayload>>;
  extractTokenFromHeader: Mock<(header?: string | null) => string | null>;
}

/**
 * Default mock implementation for JwtService.verifyToken
 * Returns appropriate payloads based on the test token used
 */
export function createMockVerifyToken(): Mock<
  (token: string) => Promise<MockJwtPayload>
> {
  return mock(async (token: string): Promise<MockJwtPayload> => {
    if (
      token === TEST_TOKENS.MOCK_JWT_TOKEN ||
      token === TEST_TOKENS.VALID_TOKEN
    ) {
      return {
        sub: "test-user-id",
        provider: "test-provider",
        claims: { roles: ["user"] },
      };
    } else if (token === TEST_TOKENS.ADMIN_TOKEN) {
      return {
        sub: "admin-user-id",
        provider: "test-provider",
        claims: { roles: ["admin", "user"] },
      };
    } else if (token === TEST_TOKENS.ISSUER_TOKEN) {
      return {
        sub: "issuer-user-id",
        provider: "test-provider",
        claims: { roles: ["issuer", "user"] },
      };
    } else {
      throw new Error("Invalid token");
    }
  });
}

/**
 * Default mock implementation for JwtService.generateToken
 * Returns a static mock token
 */
export function createMockGenerateToken(): Mock<
  (payload: unknown) => Promise<string>
> {
  return mock(async (_payload: unknown): Promise<string> => {
    return TEST_TOKENS.MOCK_JWT_TOKEN;
  });
}

/**
 * Default mock implementation for JwtService.extractTokenFromHeader
 * Extracts token from Bearer header
 */
export function createMockExtractTokenFromHeader(): Mock<
  (header?: string | null) => string | null
> {
  return mock((header?: string | null): string | null => {
    if (header?.startsWith("Bearer ")) {
      return header.substring(7);
    }
    return null;
  });
}

/**
 * Creates a complete mock JwtService object with all methods mocked
 * Use this with mock.module() for proper test isolation
 */
export function createMockJwtService(): { JwtService: MockJwtService } {
  return {
    JwtService: {
      generateToken: createMockGenerateToken(),
      verifyToken: createMockVerifyToken(),
      extractTokenFromHeader: createMockExtractTokenFromHeader(),
    },
  };
}

/**
 * Sets up module mocking for JwtService.
 * Call this at the TOP of your test file, BEFORE any imports that depend on JwtService.
 *
 * @example
 * ```typescript
 * import { mock } from "bun:test";
 * import { setupJwtServiceMock } from "../test-utils/jwt.mock";
 *
 * // Must be called before importing modules that use JwtService
 * setupJwtServiceMock();
 *
 * // Now import the module under test
 * import { createAuthMiddleware } from "@/auth/middleware/auth.middleware";
 * ```
 */
export function setupJwtServiceMock(): void {
  mock.module("@/auth/services/jwt.service", () => createMockJwtService());
}
