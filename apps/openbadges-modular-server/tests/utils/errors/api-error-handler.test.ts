/**
 * Tests for the centralized API error handling utility
 */

import { describe, expect, it } from "bun:test";
import { Hono } from "hono";
import {
  sendApiError,
  sendNotFoundError,
  sendAuthError,
  sendValidationError,
  createErrorResponse,
  OB3ErrorCode,
} from "@/utils/errors/api-error-handler";
import { BadRequestError } from "@/infrastructure/errors/bad-request.error";
import { ValidationError } from "@/utils/errors/validation.errors";

describe("API Error Handler", () => {
  describe("sendApiError", () => {
    it("should handle permission errors with 403 status", async () => {
      const app = new Hono();

      app.get("/test", async (c) => {
        const error = new Error(
          "User does not have permission to access this resource",
        );
        return sendApiError(c, error, { endpoint: "GET /test" });
      });

      const response = await app.request("/test");
      expect(response.status).toBe(403);

      const body = (await response.json()) as {
        error: string;
        message: string;
      };
      expect(body.error).toBe("Forbidden");
      expect(body.message).toBe(
        "User does not have permission to access this resource",
      );
    });

    it("should handle Invalid IRI errors with 400 status", async () => {
      const app = new Hono();

      app.get("/test", async (c) => {
        const error = new Error("Invalid IRI format for issuer");
        return sendApiError(c, error, { endpoint: "GET /test" });
      });

      const response = await app.request("/test");
      expect(response.status).toBe(400);

      const body = (await response.json()) as {
        error: string;
        message: string;
      };
      expect(body.error).toBe("Bad Request");
      expect(body.message).toBe("Invalid issuer ID");
    });

    it("should handle BadRequestError with 400 status", async () => {
      const app = new Hono();

      app.get("/test", async (c) => {
        const error = new BadRequestError("Invalid input data");
        return sendApiError(c, error, { endpoint: "GET /test" });
      });

      const response = await app.request("/test");
      expect(response.status).toBe(400);

      const body = (await response.json()) as {
        error: string;
        message: string;
      };
      expect(body.error).toBe("Bad Request");
      expect(body.message).toBe("Invalid input data");
    });

    it("should handle ValidationError with 400 status", async () => {
      const app = new Hono();

      app.get("/test", async (c) => {
        const error = new ValidationError("Validation failed");
        return sendApiError(c, error, { endpoint: "GET /test" });
      });

      const response = await app.request("/test");
      expect(response.status).toBe(400);

      const body = (await response.json()) as {
        error: string;
        message: string;
      };
      expect(body.error).toBe("Bad Request");
      expect(body.message).toBe("Validation failed");
    });

    it("should handle generic errors with 500 status", async () => {
      const app = new Hono();

      app.get("/test", async (c) => {
        const error = new Error("Database connection failed");
        return sendApiError(c, error, { endpoint: "GET /test" });
      });

      const response = await app.request("/test");
      expect(response.status).toBe(500);

      const body = (await response.json()) as {
        error: string;
        message: string;
      };
      expect(body.error).toBe("Internal Server Error");
      expect(body.message).toBe("Database connection failed");
    });

    it("should handle string errors", async () => {
      const app = new Hono();

      app.get("/test", async (c) => {
        return sendApiError(c, "Something went wrong", {
          endpoint: "GET /test",
        });
      });

      const response = await app.request("/test");
      expect(response.status).toBe(500);

      const body = (await response.json()) as {
        error: string;
        message: string;
      };
      expect(body.error).toBe("Internal Server Error");
      expect(body.message).toBe("Something went wrong");
    });
  });

  describe("sendNotFoundError", () => {
    it("should return 404 with proper message", async () => {
      const app = new Hono();

      app.get("/test", async (c) => {
        return sendNotFoundError(c, "Issuer", {
          endpoint: "GET /test",
          id: "test-id",
        });
      });

      const response = await app.request("/test");
      expect(response.status).toBe(404);

      const body = (await response.json()) as {
        error: string;
        message: string;
      };
      expect(body.error).toBe("Not Found");
      expect(body.message).toBe("Issuer not found");
    });

    it("should handle different resource types", async () => {
      const app = new Hono();

      app.get("/test", async (c) => {
        return sendNotFoundError(c, "Badge class", {
          endpoint: "GET /test",
          id: "test-id",
        });
      });

      const response = await app.request("/test");
      expect(response.status).toBe(404);

      const body = (await response.json()) as {
        error: string;
        message: string;
      };
      expect(body.error).toBe("Not Found");
      expect(body.message).toBe("Badge class not found");
    });

    it("should include OB3 error code for credential not found", async () => {
      const app = new Hono();

      app.get("/test", async (c) => {
        return sendNotFoundError(c, "Credential", {
          endpoint: "GET /test",
          id: "test-id",
        });
      });

      const response = await app.request("/test");
      expect(response.status).toBe(404);

      const body = (await response.json()) as {
        error: string;
        message: string;
        code: string;
      };
      expect(body.error).toBe("Not Found");
      expect(body.message).toBe("Credential not found");
      expect(body.code).toBe(OB3ErrorCode.CREDENTIAL_NOT_FOUND);
    });
  });

  describe("sendAuthError", () => {
    it("should return 401 with default message", async () => {
      const app = new Hono();

      app.get("/test", async (c) => {
        return sendAuthError(c);
      });

      const response = await app.request("/test");
      expect(response.status).toBe(401);

      const body = (await response.json()) as {
        error: string;
        message: string;
        code: string;
      };
      expect(body.error).toBe("Unauthorized");
      expect(body.message).toBe("Authentication required");
      expect(body.code).toBe(OB3ErrorCode.AUTH_REQUIRED);
    });

    it("should return 401 with custom message", async () => {
      const app = new Hono();

      app.get("/test", async (c) => {
        return sendAuthError(c, "Token expired");
      });

      const response = await app.request("/test");
      expect(response.status).toBe(401);

      const body = (await response.json()) as {
        error: string;
        message: string;
        code: string;
      };
      expect(body.error).toBe("Unauthorized");
      expect(body.message).toBe("Token expired");
      expect(body.code).toBe(OB3ErrorCode.AUTH_REQUIRED);
    });
  });

  describe("sendValidationError", () => {
    it("should return 400 with validation details", async () => {
      const app = new Hono();

      app.get("/test", async (c) => {
        return sendValidationError(c, "Validation failed", [
          "name is required",
          "url must be valid",
        ]);
      });

      const response = await app.request("/test");
      expect(response.status).toBe(400);

      const body = (await response.json()) as {
        error: string;
        message: string;
        code: string;
        details: string[];
      };
      expect(body.error).toBe("Bad Request");
      expect(body.message).toBe("Validation failed");
      expect(body.code).toBe(OB3ErrorCode.VALIDATION_FAILED);
      expect(body.details).toEqual(["name is required", "url must be valid"]);
    });

    it("should return 400 without details when not provided", async () => {
      const app = new Hono();

      app.get("/test", async (c) => {
        return sendValidationError(c, "Invalid format");
      });

      const response = await app.request("/test");
      expect(response.status).toBe(400);

      const body = (await response.json()) as {
        error: string;
        message: string;
        code: string;
        details?: string[];
      };
      expect(body.error).toBe("Bad Request");
      expect(body.message).toBe("Invalid format");
      expect(body.code).toBe(OB3ErrorCode.VALIDATION_FAILED);
      expect(body.details).toBeUndefined();
    });
  });

  describe("createErrorResponse", () => {
    it("should create error response with all fields", () => {
      const response = createErrorResponse("Not Found", "Resource not found", {
        code: OB3ErrorCode.NOT_FOUND,
        details: ["Resource ID: 123"],
      });

      expect(response.error).toBe("Not Found");
      expect(response.message).toBe("Resource not found");
      expect(response.code).toBe(OB3ErrorCode.NOT_FOUND);
      expect(response.details).toEqual(["Resource ID: 123"]);
    });

    it("should create error response with minimal fields", () => {
      const response = createErrorResponse("Bad Request", "Invalid input");

      expect(response.error).toBe("Bad Request");
      expect(response.message).toBe("Invalid input");
      expect(response.code).toBeUndefined();
      expect(response.details).toBeUndefined();
    });
  });

  describe("OB3ErrorCode", () => {
    it("should have credential-related error codes", () => {
      expect(OB3ErrorCode.CREDENTIAL_NOT_FOUND).toBe(
        OB3ErrorCode.CREDENTIAL_NOT_FOUND,
      );
      expect(OB3ErrorCode.CREDENTIAL_REVOKED).toBe(
        OB3ErrorCode.CREDENTIAL_REVOKED,
      );
      expect(OB3ErrorCode.CREDENTIAL_INVALID).toBe(
        OB3ErrorCode.CREDENTIAL_INVALID,
      );
    });

    it("should have issuer-related error codes", () => {
      expect(OB3ErrorCode.ISSUER_NOT_FOUND).toBe(OB3ErrorCode.ISSUER_NOT_FOUND);
      expect(OB3ErrorCode.ISSUER_INVALID).toBe(OB3ErrorCode.ISSUER_INVALID);
    });

    it("should have authentication error codes", () => {
      expect(OB3ErrorCode.AUTH_REQUIRED).toBe(OB3ErrorCode.AUTH_REQUIRED);
      expect(OB3ErrorCode.AUTH_INVALID).toBe(OB3ErrorCode.AUTH_INVALID);
      expect(OB3ErrorCode.AUTH_FORBIDDEN).toBe(OB3ErrorCode.AUTH_FORBIDDEN);
    });

    it("should have validation error codes", () => {
      expect(OB3ErrorCode.VALIDATION_FAILED).toBe(
        OB3ErrorCode.VALIDATION_FAILED,
      );
      expect(OB3ErrorCode.INVALID_ID_FORMAT).toBe(
        OB3ErrorCode.INVALID_ID_FORMAT,
      );
    });

    it("should have string values matching enum names", () => {
      // Verify enum values are the string representations we expect
      expect(String(OB3ErrorCode.CREDENTIAL_NOT_FOUND)).toBe(
        "CREDENTIAL_NOT_FOUND",
      );
      expect(String(OB3ErrorCode.AUTH_REQUIRED)).toBe("AUTH_REQUIRED");
      expect(String(OB3ErrorCode.NOT_FOUND)).toBe("NOT_FOUND");
    });
  });
});
