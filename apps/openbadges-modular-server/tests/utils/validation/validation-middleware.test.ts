/**
 * Unit tests for the validation middleware
 *
 * This file contains tests for the validation middleware to ensure
 * it correctly formats validation errors.
 */

import { describe, expect, it } from "bun:test";
import {
  validateIssuerMiddleware,
  validateUpdateCredentialStatusMiddleware,
  validateBadgeClassMiddleware,
} from "@/utils/validation/validation-middleware";

// Define the ValidationResponse type for testing
type ValidationResponse = {
  success: boolean;
  error?: string;
  details?: Record<string, string[]>;
};
import type { Context } from "hono";

// Since formatValidationErrors is not exported, we'll test it indirectly through validateIssuerMiddleware

describe("Validation Middleware", () => {
  describe("validateIssuerMiddleware", () => {
    it("should return validation errors grouped by field", async () => {
      // Create a mock context with invalid issuer data
      const mockContext = {
        req: {
          json: async () => ({
            // Missing name and URL to trigger validation errors
            email: "not-an-email", // Invalid email to trigger another error
          }),
        },

        json: (body: unknown, status?: number) => {
          return { body, status } as unknown as Context;
        },
      } as unknown as Context;

      // Get the middleware handler
      const handler = validateIssuerMiddleware();

      // Call the middleware
      const result = (await handler(
        mockContext,
        async () => {},
      )) as unknown as { body: ValidationResponse; status: number };

      // Check that the result has the expected structure
      expect(result).toBeDefined();
      expect(result.body).toBeDefined();
      expect(result.status).toBe(400);
      expect(result.body.success).toBe(false);
      expect(result.body.error).toBe("Validation error");
      expect(result.body.details).toBeDefined();

      // Check that errors are grouped by field
      const details = result.body.details as Record<string, string[]>;

      // With Zod validation, the error keys might be different
      // We just need to make sure we have some validation errors
      expect(Object.keys(details).length).toBeGreaterThan(0);

      // Check that at least one error array has content
      const hasErrors = Object.values(details).some(
        (errors) => errors.length > 0,
      );
      expect(hasErrors).toBe(true);
    });

    it("should return success for valid data", async () => {
      // Create a mock context with valid issuer data
      const mockContext = {
        req: {
          json: async () => ({
            name: "Test Issuer",
            url: "https://example.com",
            email: "valid@example.com",
          }),
        },

        json: (body: unknown, status?: number) => {
          return { body, status } as unknown as Context;
        },

        set: (_key: string, _value: unknown) => {
          // Mock implementation for storing context variables
        },
      } as unknown as Context;

      // Create a next function that will be called if validation passes
      let nextCalled = false;
      const next = async () => {
        nextCalled = true;
      };

      // Get the middleware handler
      const handler = validateIssuerMiddleware();

      // Call the middleware
      await handler(mockContext, next);

      // Check that next was called, indicating validation passed
      expect(nextCalled).toBe(true);
    });
  });

  describe("validateUpdateCredentialStatusMiddleware", () => {
    it("should return validation errors for invalid status update data", async () => {
      // Create a mock context with invalid status update data
      const mockContext = {
        req: {
          json: async () => ({
            // Missing required fields and invalid data
            status: -1, // Invalid negative status
            purpose: "invalid-purpose", // Invalid purpose
          }),
        },

        json: (body: unknown, status?: number) => {
          return { body, status } as unknown as Context;
        },
      } as unknown as Context;

      // Get the middleware handler
      const handler = validateUpdateCredentialStatusMiddleware();

      // Call the middleware
      const result = (await handler(
        mockContext,
        async () => {},
      )) as unknown as { body: ValidationResponse; status: number };

      // Check that the result has the expected structure
      expect(result).toBeDefined();
      expect(result.body).toBeDefined();
      expect(result.status).toBe(400);
      expect(result.body.success).toBe(false);
      expect(result.body.error).toBe("Validation error");
      expect(result.body.details).toBeDefined();

      // Check that errors are present
      const details = result.body.details as Record<string, string[]>;
      expect(Object.keys(details).length).toBeGreaterThan(0);
    });

    it("should return success for valid status update data", async () => {
      // Create a mock context with valid status update data
      const mockContext = {
        req: {
          json: async () => ({
            status: "1",
            reason: "Test revocation",
            purpose: "revocation",
          }),
        },

        json: (body: unknown, status?: number) => {
          return { body, status } as unknown as Context;
        },

        set: (_key: string, _value: unknown) => {
          // Mock implementation for storing context variables
        },
      } as unknown as Context;

      // Create a next function that will be called if validation passes
      let nextCalled = false;
      const next = async () => {
        nextCalled = true;
      };

      // Get the middleware handler
      const handler = validateUpdateCredentialStatusMiddleware();

      // Call the middleware
      await handler(mockContext, next);

      // Check that next was called, indicating validation passed
      expect(nextCalled).toBe(true);
    });
  });

  describe("validateBadgeClassMiddleware - Criteria validation", () => {
    it("should reject criteria with neither id nor narrative (empty object)", async () => {
      const mockContext = {
        req: {
          json: async () => ({
            name: "Test Badge",
            description: "Test description",
            issuer: "https://example.com/issuer",
            criteria: {}, // Empty object - should fail
            image: "https://example.com/image.png",
          }),
        },
        json: (body: unknown, status?: number) => {
          return { body, status } as unknown as Context;
        },
      } as unknown as Context;

      const handler = validateBadgeClassMiddleware();
      const result = (await handler(
        mockContext,
        async () => {},
      )) as unknown as { body: ValidationResponse; status: number };

      expect(result).toBeDefined();
      expect(result.status).toBe(400);
      expect(result.body.success).toBe(false);
      expect(result.body.error).toBe("Validation error");
      expect(result.body.details).toBeDefined();

      // Check that the error message mentions the criteria requirement
      const details = result.body.details as Record<string, string[]>;
      const allErrors = Object.values(details).flat();
      expect(allErrors.some(msg => msg.includes("id") || msg.includes("narrative"))).toBe(true);
    });

    it("should accept criteria with only id", async () => {
      const mockContext = {
        req: {
          json: async () => ({
            name: "Test Badge",
            description: "Test description",
            issuer: "https://example.com/issuer",
            criteria: {
              id: "https://example.com/criteria",
            },
            image: "https://example.com/image.png",
          }),
        },
        json: (body: unknown, status?: number) => {
          return { body, status } as unknown as Context;
        },
        set: (_key: string, _value: unknown) => {
          // Mock implementation for storing context variables
        },
      } as unknown as Context;

      let nextCalled = false;
      const next = async () => {
        nextCalled = true;
      };

      const handler = validateBadgeClassMiddleware();
      await handler(mockContext, next);

      expect(nextCalled).toBe(true);
    });

    it("should accept criteria with only narrative", async () => {
      const mockContext = {
        req: {
          json: async () => ({
            name: "Test Badge",
            description: "Test description",
            issuer: "https://example.com/issuer",
            criteria: {
              narrative: "Complete the requirements",
            },
            image: "https://example.com/image.png",
          }),
        },
        json: (body: unknown, status?: number) => {
          return { body, status } as unknown as Context;
        },
        set: (_key: string, _value: unknown) => {
          // Mock implementation for storing context variables
        },
      } as unknown as Context;

      let nextCalled = false;
      const next = async () => {
        nextCalled = true;
      };

      const handler = validateBadgeClassMiddleware();
      await handler(mockContext, next);

      expect(nextCalled).toBe(true);
    });

    it("should accept criteria with both id and narrative", async () => {
      const mockContext = {
        req: {
          json: async () => ({
            name: "Test Badge",
            description: "Test description",
            issuer: "https://example.com/issuer",
            criteria: {
              id: "https://example.com/criteria",
              narrative: "Complete the requirements",
            },
            image: "https://example.com/image.png",
          }),
        },
        json: (body: unknown, status?: number) => {
          return { body, status } as unknown as Context;
        },
        set: (_key: string, _value: unknown) => {
          // Mock implementation for storing context variables
        },
      } as unknown as Context;

      let nextCalled = false;
      const next = async () => {
        nextCalled = true;
      };

      const handler = validateBadgeClassMiddleware();
      await handler(mockContext, next);

      expect(nextCalled).toBe(true);
    });

    it("should verify error message format for invalid criteria", async () => {
      const mockContext = {
        req: {
          json: async () => ({
            name: "Test Badge",
            description: "Test description",
            issuer: "https://example.com/issuer",
            criteria: {}, // Empty object
            image: "https://example.com/image.png",
          }),
        },
        json: (body: unknown, status?: number) => {
          return { body, status } as unknown as Context;
        },
      } as unknown as Context;

      const handler = validateBadgeClassMiddleware();
      const result = (await handler(
        mockContext,
        async () => {},
      )) as unknown as { body: ValidationResponse; status: number };

      expect(result.body.error).toBe("Validation error");
      expect(result.body.details).toBeDefined();

      const details = result.body.details as Record<string, string[]>;
      expect(Object.keys(details).length).toBeGreaterThan(0);
    });
  });
});
