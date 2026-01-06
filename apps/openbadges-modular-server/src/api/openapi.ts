/**
 * API Documentation for Open Badges API
 *
 * This file contains the OpenAPI/Swagger documentation for the API endpoints.
 */

import type { OpenAPIObject } from "openapi3-ts/oas30";
import { config } from "../config/config";
import {
  EXAMPLE_EDU_EVIDENCE_URL,
  EXAMPLE_EDU_KEYS_URL,
  EXAMPLE_EDU_URL,
  GITHUB_REPO_URL,
  MIT_LICENSE_URL,
  OPENBADGES_V3_CONTEXT_EXAMPLE,
} from "@/constants/urls";
import { getAppVersion } from "../utils/version/app-version";

export const openApiConfig: OpenAPIObject = {
  openapi: "3.0.0",
  info: {
    title: "Open Badges API",
    version: getAppVersion().version,
    description:
      "A stateless, modular Open Badges API adhering to the Open Badges 3.0 specification",
    contact: {
      name: "Open Badges API Team",
      url: GITHUB_REPO_URL,
    },
    license: {
      name: "MIT",
      url: MIT_LICENSE_URL,
    },
  },
  servers: [
    {
      url: `http://localhost:${config.server.port}`,
      description: "Development server",
    },
    {
      url: `http://localhost:${config.server.port}${config.api.basePath}/${config.api.version}`,
      description: "Development server (API endpoints)",
    },
  ],
  tags: [
    {
      name: "Issuers",
      description: "Operations related to badge issuers",
    },
    {
      name: "Badge Classes",
      description: "Operations related to badge classes",
    },
    {
      name: "Assertions",
      description: "Operations related to badge assertions",
    },
    {
      name: "System",
      description:
        "System-level operations like health checks and version information",
    },
    {
      name: "Verification",
      description:
        "Credential verification operations for validating Open Badges 3.0 credentials",
    },
  ],
  paths: {
    "/version": {
      get: {
        tags: ["System"],
        summary: "Get API version information",
        description: "Returns the current version of the API",
        responses: {
          "200": {
            description: "Successful operation",
            content: {
              "application/json": {
                schema: {
                  type: "object",
                  properties: {
                    version: {
                      type: "string",
                      description: "Semantic version number",
                      example: "1.0.0",
                    },
                    formatted: {
                      type: "string",
                      description:
                        "Formatted version string with additional information",
                      example: "1.0.0 (abc1234) built on 2023-06-15",
                    },
                    details: {
                      type: "object",
                      properties: {
                        major: {
                          type: "number",
                          description: "Major version number",
                          example: 1,
                        },
                        minor: {
                          type: "number",
                          description: "Minor version number",
                          example: 0,
                        },
                        patch: {
                          type: "number",
                          description: "Patch version number",
                          example: 0,
                        },
                        preRelease: {
                          type: "string",
                          description: "Pre-release identifier",
                          example: "beta.1",
                        },
                        buildMetadata: {
                          type: "string",
                          description: "Build metadata",
                          example: "build.123",
                        },
                        gitCommit: {
                          type: "string",
                          description: "Git commit hash",
                          example: "abc1234",
                        },
                        buildDate: {
                          type: "string",
                          description: "Build date",
                          example: "2023-06-15",
                        },
                      },
                    },
                  },
                },
              },
            },
          },
        },
      },
    },
    "/issuers": {
      post: {
        tags: ["Issuers"],
        summary: "Create a new issuer",
        description: "Creates a new issuer entity",
        requestBody: {
          required: true,
          content: {
            "application/json": {
              schema: {
                $ref: "#/components/schemas/IssuerInput",
              },
            },
          },
        },
        responses: {
          "201": {
            description: "Issuer created successfully",
            content: {
              "application/json": {
                schema: {
                  $ref: "#/components/schemas/IssuerResponse",
                },
              },
            },
          },
          "400": {
            description: "Invalid input",
            content: {
              "application/json": {
                schema: {
                  $ref: "#/components/schemas/ErrorResponse",
                },
              },
            },
          },
          "500": {
            description: "Server error",
            content: {
              "application/json": {
                schema: {
                  $ref: "#/components/schemas/ErrorResponse",
                },
              },
            },
          },
        },
      },
    },
    "/issuers/{id}": {
      get: {
        tags: ["Issuers"],
        summary: "Get issuer by ID",
        description: "Returns a single issuer by ID",
        parameters: [
          {
            name: "id",
            in: "path",
            required: true,
            schema: {
              type: "string",
              format: "uri",
            },
            description: "ID of the issuer to retrieve",
          },
        ],
        responses: {
          "200": {
            description: "Successful operation",
            content: {
              "application/json": {
                schema: {
                  $ref: "#/components/schemas/IssuerResponse",
                },
              },
            },
          },
          "404": {
            description: "Issuer not found",
            content: {
              "application/json": {
                schema: {
                  $ref: "#/components/schemas/ErrorResponse",
                },
              },
            },
          },
          "500": {
            description: "Server error",
            content: {
              "application/json": {
                schema: {
                  $ref: "#/components/schemas/ErrorResponse",
                },
              },
            },
          },
        },
      },
      put: {
        tags: ["Issuers"],
        summary: "Update issuer by ID",
        description: "Updates an existing issuer",
        parameters: [
          {
            name: "id",
            in: "path",
            required: true,
            schema: {
              type: "string",
              format: "uri",
            },
            description: "ID of the issuer to update",
          },
        ],
        requestBody: {
          required: true,
          content: {
            "application/json": {
              schema: {
                $ref: "#/components/schemas/IssuerUpdateInput",
              },
            },
          },
        },
        responses: {
          "200": {
            description: "Issuer updated successfully",
            content: {
              "application/json": {
                schema: {
                  $ref: "#/components/schemas/IssuerResponse",
                },
              },
            },
          },
          "400": {
            description: "Invalid input",
            content: {
              "application/json": {
                schema: {
                  $ref: "#/components/schemas/ErrorResponse",
                },
              },
            },
          },
          "404": {
            description: "Issuer not found",
            content: {
              "application/json": {
                schema: {
                  $ref: "#/components/schemas/ErrorResponse",
                },
              },
            },
          },
          "500": {
            description: "Server error",
            content: {
              "application/json": {
                schema: {
                  $ref: "#/components/schemas/ErrorResponse",
                },
              },
            },
          },
        },
      },
      delete: {
        tags: ["Issuers"],
        summary: "Delete issuer by ID",
        description: "Deletes an issuer",
        parameters: [
          {
            name: "id",
            in: "path",
            required: true,
            schema: {
              type: "string",
              format: "uri",
            },
            description: "ID of the issuer to delete",
          },
        ],
        responses: {
          "204": {
            description: "Issuer deleted successfully",
          },
          "404": {
            description: "Issuer not found",
            content: {
              "application/json": {
                schema: {
                  $ref: "#/components/schemas/ErrorResponse",
                },
              },
            },
          },
          "500": {
            description: "Server error",
            content: {
              "application/json": {
                schema: {
                  $ref: "#/components/schemas/ErrorResponse",
                },
              },
            },
          },
        },
      },
    },
    "/badge-classes": {
      post: {
        tags: ["Badge Classes"],
        summary: "Create a new badge class",
        description: "Creates a new badge class entity",
        requestBody: {
          required: true,
          content: {
            "application/json": {
              schema: {
                $ref: "#/components/schemas/BadgeClassInput",
              },
            },
          },
        },
        responses: {
          "201": {
            description: "Badge class created successfully",
            content: {
              "application/json": {
                schema: {
                  $ref: "#/components/schemas/BadgeClassResponse",
                },
              },
            },
          },
          "400": {
            description: "Invalid input",
            content: {
              "application/json": {
                schema: {
                  $ref: "#/components/schemas/ErrorResponse",
                },
              },
            },
          },
          "500": {
            description: "Server error",
            content: {
              "application/json": {
                schema: {
                  $ref: "#/components/schemas/ErrorResponse",
                },
              },
            },
          },
        },
      },
    },
    "/badge-classes/{id}": {
      get: {
        tags: ["Badge Classes"],
        summary: "Get badge class by ID",
        description: "Returns a single badge class by ID",
        parameters: [
          {
            name: "id",
            in: "path",
            required: true,
            schema: {
              type: "string",
              format: "uri",
            },
            description: "ID of the badge class to retrieve",
          },
        ],
        responses: {
          "200": {
            description: "Successful operation",
            content: {
              "application/json": {
                schema: {
                  $ref: "#/components/schemas/BadgeClassResponse",
                },
              },
            },
          },
          "404": {
            description: "Badge class not found",
            content: {
              "application/json": {
                schema: {
                  $ref: "#/components/schemas/ErrorResponse",
                },
              },
            },
          },
          "500": {
            description: "Server error",
            content: {
              "application/json": {
                schema: {
                  $ref: "#/components/schemas/ErrorResponse",
                },
              },
            },
          },
        },
      },
      put: {
        tags: ["Badge Classes"],
        summary: "Update badge class by ID",
        description: "Updates an existing badge class",
        parameters: [
          {
            name: "id",
            in: "path",
            required: true,
            schema: {
              type: "string",
              format: "uri",
            },
            description: "ID of the badge class to update",
          },
        ],
        requestBody: {
          required: true,
          content: {
            "application/json": {
              schema: {
                $ref: "#/components/schemas/BadgeClassUpdateInput",
              },
            },
          },
        },
        responses: {
          "200": {
            description: "Badge class updated successfully",
            content: {
              "application/json": {
                schema: {
                  $ref: "#/components/schemas/BadgeClassResponse",
                },
              },
            },
          },
          "400": {
            description: "Invalid input",
            content: {
              "application/json": {
                schema: {
                  $ref: "#/components/schemas/ErrorResponse",
                },
              },
            },
          },
          "404": {
            description: "Badge class not found",
            content: {
              "application/json": {
                schema: {
                  $ref: "#/components/schemas/ErrorResponse",
                },
              },
            },
          },
          "500": {
            description: "Server error",
            content: {
              "application/json": {
                schema: {
                  $ref: "#/components/schemas/ErrorResponse",
                },
              },
            },
          },
        },
      },
      delete: {
        tags: ["Badge Classes"],
        summary: "Delete badge class by ID",
        description: "Deletes a badge class",
        parameters: [
          {
            name: "id",
            in: "path",
            required: true,
            schema: {
              type: "string",
              format: "uri",
            },
            description: "ID of the badge class to delete",
          },
        ],
        responses: {
          "204": {
            description: "Badge class deleted successfully",
          },
          "404": {
            description: "Badge class not found",
            content: {
              "application/json": {
                schema: {
                  $ref: "#/components/schemas/ErrorResponse",
                },
              },
            },
          },
          "500": {
            description: "Server error",
            content: {
              "application/json": {
                schema: {
                  $ref: "#/components/schemas/ErrorResponse",
                },
              },
            },
          },
        },
      },
    },
    "/badge-classes/issuer/{issuerId}": {
      get: {
        tags: ["Badge Classes"],
        summary: "Get badge classes by issuer ID",
        description: "Returns all badge classes for a specific issuer",
        parameters: [
          {
            name: "issuerId",
            in: "path",
            required: true,
            schema: {
              type: "string",
              format: "uri",
            },
            description: "ID of the issuer to retrieve badge classes for",
          },
        ],
        responses: {
          "200": {
            description: "Successful operation",
            content: {
              "application/json": {
                schema: {
                  type: "object",
                  properties: {
                    success: {
                      type: "boolean",
                      example: true,
                    },
                    data: {
                      type: "array",
                      items: {
                        $ref: "#/components/schemas/BadgeClass",
                      },
                    },
                  },
                },
              },
            },
          },
          "500": {
            description: "Server error",
            content: {
              "application/json": {
                schema: {
                  $ref: "#/components/schemas/ErrorResponse",
                },
              },
            },
          },
        },
      },
    },
    "/assertions": {
      post: {
        tags: ["Assertions"],
        summary: "Create a new assertion",
        description: "Creates a new assertion entity",
        requestBody: {
          required: true,
          content: {
            "application/json": {
              schema: {
                $ref: "#/components/schemas/AssertionInput",
              },
            },
          },
        },
        responses: {
          "201": {
            description: "Assertion created successfully",
            content: {
              "application/json": {
                schema: {
                  $ref: "#/components/schemas/AssertionResponse",
                },
              },
            },
          },
          "400": {
            description: "Invalid input",
            content: {
              "application/json": {
                schema: {
                  $ref: "#/components/schemas/ErrorResponse",
                },
              },
            },
          },
          "500": {
            description: "Server error",
            content: {
              "application/json": {
                schema: {
                  $ref: "#/components/schemas/ErrorResponse",
                },
              },
            },
          },
        },
      },
    },
    "/assertions/{id}": {
      get: {
        tags: ["Assertions"],
        summary: "Get assertion by ID",
        description: "Returns a single assertion by ID",
        parameters: [
          {
            name: "id",
            in: "path",
            required: true,
            schema: {
              type: "string",
              format: "uri",
            },
            description: "ID of the assertion to retrieve",
          },
        ],
        responses: {
          "200": {
            description: "Successful operation",
            content: {
              "application/json": {
                schema: {
                  $ref: "#/components/schemas/AssertionResponse",
                },
              },
            },
          },
          "404": {
            description: "Assertion not found",
            content: {
              "application/json": {
                schema: {
                  $ref: "#/components/schemas/ErrorResponse",
                },
              },
            },
          },
          "500": {
            description: "Server error",
            content: {
              "application/json": {
                schema: {
                  $ref: "#/components/schemas/ErrorResponse",
                },
              },
            },
          },
        },
      },
      put: {
        tags: ["Assertions"],
        summary: "Update assertion by ID",
        description: "Updates an existing assertion",
        parameters: [
          {
            name: "id",
            in: "path",
            required: true,
            schema: {
              type: "string",
              format: "uri",
            },
            description: "ID of the assertion to update",
          },
        ],
        requestBody: {
          required: true,
          content: {
            "application/json": {
              schema: {
                $ref: "#/components/schemas/AssertionUpdateInput",
              },
            },
          },
        },
        responses: {
          "200": {
            description: "Assertion updated successfully",
            content: {
              "application/json": {
                schema: {
                  $ref: "#/components/schemas/AssertionResponse",
                },
              },
            },
          },
          "400": {
            description: "Invalid input",
            content: {
              "application/json": {
                schema: {
                  $ref: "#/components/schemas/ErrorResponse",
                },
              },
            },
          },
          "404": {
            description: "Assertion not found",
            content: {
              "application/json": {
                schema: {
                  $ref: "#/components/schemas/ErrorResponse",
                },
              },
            },
          },
          "500": {
            description: "Server error",
            content: {
              "application/json": {
                schema: {
                  $ref: "#/components/schemas/ErrorResponse",
                },
              },
            },
          },
        },
      },
      delete: {
        tags: ["Assertions"],
        summary: "Delete assertion by ID",
        description: "Deletes an assertion",
        parameters: [
          {
            name: "id",
            in: "path",
            required: true,
            schema: {
              type: "string",
              format: "uri",
            },
            description: "ID of the assertion to delete",
          },
        ],
        responses: {
          "204": {
            description: "Assertion deleted successfully",
          },
          "404": {
            description: "Assertion not found",
            content: {
              "application/json": {
                schema: {
                  $ref: "#/components/schemas/ErrorResponse",
                },
              },
            },
          },
          "500": {
            description: "Server error",
            content: {
              "application/json": {
                schema: {
                  $ref: "#/components/schemas/ErrorResponse",
                },
              },
            },
          },
        },
      },
    },
    "/assertions/{id}/revoke": {
      post: {
        tags: ["Assertions"],
        summary: "Revoke assertion by ID",
        description: "Revokes an existing assertion",
        parameters: [
          {
            name: "id",
            in: "path",
            required: true,
            schema: {
              type: "string",
              format: "uri",
            },
            description: "ID of the assertion to revoke",
          },
        ],
        requestBody: {
          required: true,
          content: {
            "application/json": {
              schema: {
                type: "object",
                required: ["reason"],
                properties: {
                  reason: {
                    type: "string",
                    description: "Reason for revocation",
                    example: "Badge awarded in error",
                  },
                },
              },
            },
          },
        },
        responses: {
          "200": {
            description: "Assertion revoked successfully",
            content: {
              "application/json": {
                schema: {
                  $ref: "#/components/schemas/AssertionResponse",
                },
              },
            },
          },
          "404": {
            description: "Assertion not found",
            content: {
              "application/json": {
                schema: {
                  $ref: "#/components/schemas/ErrorResponse",
                },
              },
            },
          },
          "500": {
            description: "Server error",
            content: {
              "application/json": {
                schema: {
                  $ref: "#/components/schemas/ErrorResponse",
                },
              },
            },
          },
        },
      },
    },
    "/assertions/{id}/verify": {
      get: {
        tags: ["Assertions"],
        summary: "Verify assertion by ID",
        description: "Verifies an assertion's validity",
        parameters: [
          {
            name: "id",
            in: "path",
            required: true,
            schema: {
              type: "string",
              format: "uri",
            },
            description: "ID of the assertion to verify",
          },
        ],
        responses: {
          "200": {
            description: "Verification result",
            content: {
              "application/json": {
                schema: {
                  type: "object",
                  properties: {
                    success: {
                      type: "boolean",
                      example: true,
                    },
                    data: {
                      type: "object",
                      properties: {
                        isValid: {
                          type: "boolean",
                          description: "Overall validity of the assertion",
                          example: true,
                        },
                        isExpired: {
                          type: "boolean",
                          description: "Whether the assertion has expired",
                          example: false,
                        },
                        isRevoked: {
                          type: "boolean",
                          description: "Whether the assertion has been revoked",
                          example: false,
                        },
                        hasValidSignature: {
                          type: "boolean",
                          description:
                            "Whether the assertion has a valid signature",
                          example: true,
                        },
                      },
                    },
                  },
                },
              },
            },
          },
          "404": {
            description: "Assertion not found",
            content: {
              "application/json": {
                schema: {
                  $ref: "#/components/schemas/ErrorResponse",
                },
              },
            },
          },
          "500": {
            description: "Server error",
            content: {
              "application/json": {
                schema: {
                  $ref: "#/components/schemas/ErrorResponse",
                },
              },
            },
          },
        },
      },
    },
    "/assertions/badge-class/{badgeClassId}": {
      get: {
        tags: ["Assertions"],
        summary: "Get assertions by badge class ID",
        description: "Returns all assertions for a specific badge class",
        parameters: [
          {
            name: "badgeClassId",
            in: "path",
            required: true,
            schema: {
              type: "string",
              format: "uri",
            },
            description: "ID of the badge class to retrieve assertions for",
          },
        ],
        responses: {
          "200": {
            description: "Successful operation",
            content: {
              "application/json": {
                schema: {
                  type: "object",
                  properties: {
                    success: {
                      type: "boolean",
                      example: true,
                    },
                    data: {
                      type: "array",
                      items: {
                        $ref: "#/components/schemas/Assertion",
                      },
                    },
                  },
                },
              },
            },
          },
          "500": {
            description: "Server error",
            content: {
              "application/json": {
                schema: {
                  $ref: "#/components/schemas/ErrorResponse",
                },
              },
            },
          },
        },
      },
    },
    "/assertions/recipient/{recipientId}": {
      get: {
        tags: ["Assertions"],
        summary: "Get assertions by recipient ID",
        description: "Returns all assertions for a specific recipient",
        parameters: [
          {
            name: "recipientId",
            in: "path",
            required: true,
            schema: {
              type: "string",
              format: "uri",
            },
            description: "ID of the recipient to retrieve assertions for",
          },
        ],
        responses: {
          "200": {
            description: "Successful operation",
            content: {
              "application/json": {
                schema: {
                  type: "object",
                  properties: {
                    success: {
                      type: "boolean",
                      example: true,
                    },
                    data: {
                      type: "array",
                      items: {
                        $ref: "#/components/schemas/Assertion",
                      },
                    },
                  },
                },
              },
            },
          },
          "500": {
            description: "Server error",
            content: {
              "application/json": {
                schema: {
                  $ref: "#/components/schemas/ErrorResponse",
                },
              },
            },
          },
        },
      },
    },
    "/verify": {
      post: {
        tags: ["Verification"],
        summary: "Verify a credential",
        description:
          "Verifies an Open Badges 3.0 credential in JSON-LD or JWT format. Performs complete verification including proof/signature verification, issuer validation, temporal checks, and status checks. This endpoint is intentionally public to allow third parties to verify credentials.",
        requestBody: {
          required: true,
          content: {
            "application/json": {
              schema: {
                $ref: "#/components/schemas/VerifyCredentialRequest",
              },
            },
          },
        },
        responses: {
          "200": {
            description:
              "Verification completed (check isValid field for result)",
            content: {
              "application/json": {
                schema: {
                  $ref: "#/components/schemas/VerificationResult",
                },
              },
            },
          },
          "400": {
            description: "Invalid request format",
            content: {
              "application/json": {
                schema: {
                  $ref: "#/components/schemas/ErrorResponse",
                },
              },
            },
          },
          "500": {
            description: "Server error during verification",
            content: {
              "application/json": {
                schema: {
                  $ref: "#/components/schemas/ErrorResponse",
                },
              },
            },
          },
        },
      },
    },
  },
  components: {
    schemas: {
      Issuer: {
        type: "object",
        properties: {
          "@context": {
            type: "string",
            description: "JSON-LD context",
            example: OPENBADGES_V3_CONTEXT_EXAMPLE,
          },
          type: {
            type: "string",
            description: "Type of the entity",
            example: "Profile",
          },
          id: {
            type: "string",
            format: "uri",
            description: "Unique identifier for the issuer",
            example: "123e4567-e89b-12d3-a456-426614174000",
          },
          name: {
            type: "string",
            description: "Name of the issuer",
            example: "Example University",
          },
          url: {
            type: "string",
            format: "uri",
            description: "URL of the issuer",
            example: EXAMPLE_EDU_URL,
          },
          email: {
            type: "string",
            description: "Email of the issuer",
            example: "badges@example.edu",
          },
          description: {
            type: "string",
            description: "Description of the issuer",
            example: "A leading institution in online education",
          },
          image: {
            oneOf: [
              { type: "string", format: "uri" },
              { $ref: "#/components/schemas/OB3ImageObject" },
            ],
            description: "URL to the issuer's image",
            example: "https://example.edu/logo.png",
          },
          publicKey: {
            type: "object",
            description: "Public key for verification",
            properties: {
              id: {
                type: "string",
                format: "uri",
                example: EXAMPLE_EDU_KEYS_URL,
              },
              owner: {
                type: "string",
                format: "uri",
                example: EXAMPLE_EDU_URL,
              },
              publicKeyPem: {
                type: "string",
                example:
                  "-----BEGIN PUBLIC KEY-----\nMIIBIjANBgkqhkiG9w0BAQEFAAOCAQ8AMIIBCgKCAQEA...\n-----END PUBLIC KEY-----",
              },
            },
          },
        },
        required: ["@context", "type", "id", "name", "url"],
      },
      IssuerInput: {
        type: "object",
        properties: {
          name: {
            type: "string",
            description: "Name of the issuer",
            example: "Example University",
          },
          url: {
            type: "string",
            format: "uri",
            description: "URL of the issuer",
            example: EXAMPLE_EDU_URL,
          },
          email: {
            type: "string",
            description: "Email of the issuer",
            example: "badges@example.edu",
          },
          description: {
            type: "string",
            description: "Description of the issuer",
            example: "A leading institution in online education",
          },
          image: {
            oneOf: [
              { type: "string", format: "uri" },
              { $ref: "#/components/schemas/OB3ImageObject" },
            ],
            description: "URL to the issuer's image",
            example: "https://example.edu/logo.png",
          },
          publicKey: {
            type: "object",
            description: "Public key for verification",
            properties: {
              id: {
                type: "string",
                format: "uri",
                example: EXAMPLE_EDU_KEYS_URL,
              },
              owner: {
                type: "string",
                format: "uri",
                example: EXAMPLE_EDU_URL,
              },
              publicKeyPem: {
                type: "string",
                example:
                  "-----BEGIN PUBLIC KEY-----\nMIIBIjANBgkqhkiG9w0BAQEFAAOCAQ8AMIIBCgKCAQEA...\n-----END PUBLIC KEY-----",
              },
            },
          },
        },
        required: ["name", "url"],
      },
      IssuerUpdateInput: {
        type: "object",
        properties: {
          name: {
            type: "string",
            description: "Name of the issuer",
            example: "Example University",
          },
          url: {
            type: "string",
            format: "uri",
            description: "URL of the issuer",
            example: EXAMPLE_EDU_URL,
          },
          email: {
            type: "string",
            description: "Email of the issuer",
            example: "badges@example.edu",
          },
          description: {
            type: "string",
            description: "Description of the issuer",
            example: "A leading institution in online education",
          },
          image: {
            oneOf: [
              { type: "string", format: "uri" },
              { $ref: "#/components/schemas/OB3ImageObject" },
            ],
            description: "URL to the issuer's image",
            example: "https://example.edu/logo.png",
          },
          publicKey: {
            type: "object",
            description: "Public key for verification",
            properties: {
              id: {
                type: "string",
                format: "uri",
                example: EXAMPLE_EDU_KEYS_URL,
              },
              owner: {
                type: "string",
                format: "uri",
                example: EXAMPLE_EDU_URL,
              },
              publicKeyPem: {
                type: "string",
                example:
                  "-----BEGIN PUBLIC KEY-----\nMIIBIjANBgkqhkiG9w0BAQEFAAOCAQ8AMIIBCgKCAQEA...\n-----END PUBLIC KEY-----",
              },
            },
          },
        },
      },
      IssuerResponse: {
        type: "object",
        properties: {
          success: {
            type: "boolean",
            example: true,
          },
          data: {
            $ref: "#/components/schemas/Issuer",
          },
        },
      },
      BadgeClass: {
        type: "object",
        properties: {
          "@context": {
            type: "string",
            description: "JSON-LD context",
            example: OPENBADGES_V3_CONTEXT_EXAMPLE,
          },
          type: {
            type: "string",
            description: "Type of the entity",
            example: "BadgeClass",
          },
          id: {
            type: "string",
            format: "uri",
            description: "Unique identifier for the badge class",
            example: "123e4567-e89b-12d3-a456-426614174001",
          },
          issuer: {
            type: "string",
            format: "uri",
            description: "ID of the issuer",
            example: "123e4567-e89b-12d3-a456-426614174000",
          },
          name: {
            type: "string",
            description: "Name of the badge class",
            example: "Introduction to Programming",
          },
          description: {
            type: "string",
            description: "Description of the badge class",
            example:
              "This badge is awarded to students who complete the Introduction to Programming course",
          },
          image: {
            oneOf: [
              { type: "string", format: "uri" },
              { $ref: "#/components/schemas/OB3ImageObject" },
            ],
            description: "URL or object for the badge image",
            example: "https://example.edu/badges/intro-to-programming.png",
          },
          criteria: {
            type: "object",
            description: "Criteria for earning the badge",
            properties: {
              narrative: {
                type: "string",
                example:
                  "The recipient must complete all course modules with a score of at least 70%",
              },
            },
          },
          alignment: {
            type: "array",
            description: "Alignment with external standards",
            items: {
              type: "object",
              properties: {
                targetName: {
                  type: "string",
                  example: "ISTE Standard 1",
                },
                targetUrl: {
                  type: "string",
                  example:
                    "https://www.iste.org/standards/iste-standards/standards-for-students",
                },
                targetDescription: {
                  type: "string",
                  example: "Empowered Learner",
                },
              },
            },
          },
          tags: {
            type: "array",
            description: "Tags for the badge class",
            items: {
              type: "string",
              example: "programming",
            },
          },
        },
        required: [
          "@context",
          "type",
          "id",
          "issuer",
          "name",
          "description",
          "image",
          "criteria",
        ],
      },
      BadgeClassInput: {
        type: "object",
        properties: {
          issuer: {
            type: "string",
            format: "uri",
            description: "ID of the issuer",
            example: "123e4567-e89b-12d3-a456-426614174000",
          },
          name: {
            type: "string",
            description: "Name of the badge class",
            example: "Introduction to Programming",
          },
          description: {
            type: "string",
            description: "Description of the badge class",
            example:
              "This badge is awarded to students who complete the Introduction to Programming course",
          },
          image: {
            oneOf: [
              { type: "string", format: "uri" },
              { $ref: "#/components/schemas/OB3ImageObject" },
            ],
            description: "URL or object for the badge image",
            example: "https://example.edu/badges/intro-to-programming.png",
          },
          criteria: {
            type: "object",
            description: "Criteria for earning the badge",
            properties: {
              narrative: {
                type: "string",
                example:
                  "The recipient must complete all course modules with a score of at least 70%",
              },
            },
          },
          alignment: {
            type: "array",
            description: "Alignment with external standards",
            items: {
              type: "object",
              properties: {
                targetName: {
                  type: "string",
                  example: "ISTE Standard 1",
                },
                targetUrl: {
                  type: "string",
                  example:
                    "https://www.iste.org/standards/iste-standards/standards-for-students",
                },
                targetDescription: {
                  type: "string",
                  example: "Empowered Learner",
                },
              },
            },
          },
          tags: {
            type: "array",
            description: "Tags for the badge class",
            items: {
              type: "string",
              example: "programming",
            },
          },
        },
        required: ["issuer", "name", "description", "image", "criteria"],
      },
      BadgeClassUpdateInput: {
        type: "object",
        properties: {
          issuer: {
            type: "string",
            format: "uri",
            description: "ID of the issuer",
            example: "123e4567-e89b-12d3-a456-426614174000",
          },
          name: {
            type: "string",
            description: "Name of the badge class",
            example: "Introduction to Programming",
          },
          description: {
            type: "string",
            description: "Description of the badge class",
            example:
              "This badge is awarded to students who complete the Introduction to Programming course",
          },
          image: {
            oneOf: [
              { type: "string", format: "uri" },
              { $ref: "#/components/schemas/OB3ImageObject" },
            ],
            description: "URL or object for the badge image",
            example: "https://example.edu/badges/intro-to-programming.png",
          },
          criteria: {
            type: "object",
            description: "Criteria for earning the badge",
            properties: {
              narrative: {
                type: "string",
                example:
                  "The recipient must complete all course modules with a score of at least 70%",
              },
            },
          },
          alignment: {
            type: "array",
            description: "Alignment with external standards",
            items: {
              type: "object",
              properties: {
                targetName: {
                  type: "string",
                  example: "ISTE Standard 1",
                },
                targetUrl: {
                  type: "string",
                  example:
                    "https://www.iste.org/standards/iste-standards/standards-for-students",
                },
                targetDescription: {
                  type: "string",
                  example: "Empowered Learner",
                },
              },
            },
          },
          tags: {
            type: "array",
            description: "Tags for the badge class",
            items: {
              type: "string",
              example: "programming",
            },
          },
        },
      },
      BadgeClassResponse: {
        type: "object",
        properties: {
          success: {
            type: "boolean",
            example: true,
          },
          data: {
            $ref: "#/components/schemas/BadgeClass",
          },
        },
      },
      Assertion: {
        type: "object",
        properties: {
          "@context": {
            type: "string",
            description: "JSON-LD context",
            example: OPENBADGES_V3_CONTEXT_EXAMPLE,
          },
          type: {
            type: "string",
            description: "Type of the entity",
            example: "Assertion",
          },
          id: {
            type: "string",
            format: "uri",
            description: "Unique identifier for the assertion",
            example: "123e4567-e89b-12d3-a456-426614174002",
          },
          badgeClass: {
            type: "string",
            format: "uri",
            description: "ID of the badge class",
            example: "123e4567-e89b-12d3-a456-426614174001",
          },
          recipient: {
            type: "object",
            description: "Recipient of the badge",
            properties: {
              type: {
                type: "string",
                example: "email",
              },
              identity: {
                type: "string",
                example: "student@example.edu",
              },
              hashed: {
                type: "boolean",
                example: false,
              },
            },
          },
          issuedOn: {
            type: "string",
            description: "Date when the badge was issued",
            example: "2023-01-01T00:00:00Z",
          },
          expires: {
            type: "string",
            description: "Date when the badge expires",
            example: "2024-01-01T00:00:00Z",
          },
          evidence: {
            type: "array",
            description: "Evidence for the badge",
            items: {
              type: "object",
              properties: {
                type: {
                  type: "string",
                  example: "Evidence",
                },
                id: {
                  type: "string",
                  format: "uri",
                  example: EXAMPLE_EDU_EVIDENCE_URL,
                },
                name: {
                  type: "string",
                  example: "Course Completion Certificate",
                },
                description: {
                  type: "string",
                  example:
                    "Certificate of completion for the Introduction to Programming course",
                },
                genre: {
                  type: "string",
                  example: "Certificate",
                },
                audience: {
                  type: "string",
                  example: "Public",
                },
              },
            },
          },
          verification: {
            type: "object",
            description: "Verification information",
            properties: {
              type: {
                type: "string",
                example: "SignedBadge",
              },
              creator: {
                type: "string",
                format: "uri",
                example: EXAMPLE_EDU_KEYS_URL,
              },
              created: {
                type: "string",
                example: "2023-01-01T00:00:00Z",
              },
              signatureValue: {
                type: "string",
                example: "eyJhbGciOiJSUzI1NiIsInR5cCI6IkpXVCJ9...",
              },
            },
          },
          revoked: {
            type: "boolean",
            description: "Whether the badge has been revoked",
            example: false,
          },
          revocationReason: {
            type: "string",
            description: "Reason for revocation",
            example: "Badge awarded in error",
          },
        },
        required: [
          "@context",
          "type",
          "id",
          "badgeClass",
          "recipient",
          "issuedOn",
        ],
      },
      AssertionInput: {
        type: "object",
        properties: {
          badgeClass: {
            type: "string",
            format: "uri",
            description: "ID of the badge class",
            example: "123e4567-e89b-12d3-a456-426614174001",
          },
          recipient: {
            type: "object",
            description: "Recipient of the badge",
            properties: {
              type: {
                type: "string",
                example: "email",
              },
              identity: {
                type: "string",
                example: "student@example.edu",
              },
              hashed: {
                type: "boolean",
                example: false,
              },
            },
          },
          issuedOn: {
            type: "string",
            description: "Date when the badge was issued",
            example: "2023-01-01T00:00:00Z",
          },
          expires: {
            type: "string",
            description: "Date when the badge expires",
            example: "2024-01-01T00:00:00Z",
          },
          evidence: {
            type: "array",
            description: "Evidence for the badge",
            items: {
              type: "object",
              properties: {
                type: {
                  type: "string",
                  example: "Evidence",
                },
                id: {
                  type: "string",
                  format: "uri",
                  example: EXAMPLE_EDU_EVIDENCE_URL,
                },
                name: {
                  type: "string",
                  example: "Course Completion Certificate",
                },
                description: {
                  type: "string",
                  example:
                    "Certificate of completion for the Introduction to Programming course",
                },
                genre: {
                  type: "string",
                  example: "Certificate",
                },
                audience: {
                  type: "string",
                  example: "Public",
                },
              },
            },
          },
        },
        required: ["badgeClass", "recipient"],
      },
      AssertionUpdateInput: {
        type: "object",
        properties: {
          badgeClass: {
            type: "string",
            format: "uri",
            description: "ID of the badge class",
            example: "123e4567-e89b-12d3-a456-426614174001",
          },
          recipient: {
            type: "object",
            description: "Recipient of the badge",
            properties: {
              type: {
                type: "string",
                example: "email",
              },
              identity: {
                type: "string",
                example: "student@example.edu",
              },
              hashed: {
                type: "boolean",
                example: false,
              },
            },
          },
          issuedOn: {
            type: "string",
            description: "Date when the badge was issued",
            example: "2023-01-01T00:00:00Z",
          },
          expires: {
            type: "string",
            description: "Date when the badge expires",
            example: "2024-01-01T00:00:00Z",
          },
          evidence: {
            type: "array",
            description: "Evidence for the badge",
            items: {
              type: "object",
              properties: {
                type: {
                  type: "string",
                  example: "Evidence",
                },
                id: {
                  type: "string",
                  format: "uri",
                  example: EXAMPLE_EDU_EVIDENCE_URL,
                },
                name: {
                  type: "string",
                  example: "Course Completion Certificate",
                },
                description: {
                  type: "string",
                  example:
                    "Certificate of completion for the Introduction to Programming course",
                },
                genre: {
                  type: "string",
                  example: "Certificate",
                },
                audience: {
                  type: "string",
                  example: "Public",
                },
              },
            },
          },
        },
      },
      AssertionResponse: {
        type: "object",
        properties: {
          success: {
            type: "boolean",
            example: true,
          },
          data: {
            $ref: "#/components/schemas/Assertion",
          },
        },
      },
      OB3ImageObject: {
        type: "object",
        properties: {
          id: {
            type: "string",
            format: "uri",
            description: "Unique identifier for the image object",
            example: "https://example.edu/images/1",
          },
          type: {
            type: "string",
            enum: ["Image"],
            example: "Image",
          },
          caption: {
            oneOf: [{ type: "string" }, { type: "object" }],
            description: "Caption or multilingual captions for the image",
            example: "A badge image",
          },
          author: {
            type: "string",
            format: "uri",
            description: "URI of the image author",
            example: EXAMPLE_EDU_URL,
          },
        },
        required: ["id", "type"],
      },
      ErrorResponse: {
        type: "object",
        properties: {
          success: {
            type: "boolean",
            example: false,
          },
          error: {
            type: "string",
            description: "Error message",
            example: "Validation error",
          },
          details: {
            type: "array",
            description: "Detailed error information",
            items: {
              type: "string",
              example: "Issuer name is required",
            },
          },
        },
      },
      VerifyCredentialRequest: {
        type: "object",
        required: ["credential"],
        properties: {
          credential: {
            oneOf: [
              {
                type: "object",
                description: "JSON-LD credential object",
                properties: {
                  "@context": {
                    oneOf: [
                      { type: "string" },
                      { type: "array", items: { type: "string" } },
                    ],
                    description:
                      "JSON-LD context (must include VC context v1 or v2)",
                    example: [
                      "https://www.w3.org/ns/credentials/v2",
                      "https://purl.imsglobal.org/spec/ob/v3p0/context.json",
                    ],
                  },
                  type: {
                    oneOf: [
                      { type: "string" },
                      { type: "array", items: { type: "string" } },
                    ],
                    example: ["VerifiableCredential", "OpenBadgeCredential"],
                  },
                  issuer: {
                    oneOf: [
                      { type: "string", format: "uri" },
                      {
                        type: "object",
                        properties: {
                          id: { type: "string", format: "uri" },
                          type: { type: "string" },
                          name: { type: "string" },
                        },
                      },
                    ],
                  },
                  issuanceDate: {
                    type: "string",
                    format: "date-time",
                    description: "ISO 8601 datetime when the credential was issued",
                  },
                  validFrom: {
                    type: "string",
                    format: "date-time",
                    description: "ISO 8601 datetime when the credential becomes valid",
                  },
                  expirationDate: {
                    type: "string",
                    format: "date-time",
                    description: "ISO 8601 datetime when the credential expires",
                  },
                  credentialSubject: {
                    type: "object",
                    description: "The subject of the credential",
                  },
                  proof: {
                    type: "object",
                    description: "Cryptographic proof for the credential",
                  },
                },
              },
              {
                type: "string",
                description:
                  "JWT credential (compact serialization: header.payload.signature)",
                example:
                  "eyJhbGciOiJFZERTQSIsInR5cCI6InZjK2p3dCJ9.eyJpc3MiOiJkaWQ6a2V5Onp...",
              },
            ],
          },
          options: {
            type: "object",
            description: "Optional verification configuration",
            properties: {
              skipProofVerification: {
                type: "boolean",
                description: "Skip proof/signature verification",
                default: false,
              },
              skipStatusCheck: {
                type: "boolean",
                description: "Skip revocation status check",
                default: false,
              },
              skipTemporalValidation: {
                type: "boolean",
                description: "Skip issuance/expiration date validation",
                default: false,
              },
              skipIssuerVerification: {
                type: "boolean",
                description: "Skip issuer DID resolution and validation",
                default: false,
              },
              clockTolerance: {
                type: "integer",
                description: "Clock tolerance in seconds for temporal checks",
                minimum: 0,
                example: 60,
              },
              allowExpired: {
                type: "boolean",
                description:
                  "Accept expired credentials (for historical verification)",
                default: false,
              },
              allowRevoked: {
                type: "boolean",
                description: "Accept revoked credentials (for audit purposes)",
                default: false,
              },
            },
          },
        },
      },
      VerificationResult: {
        type: "object",
        properties: {
          status: {
            type: "string",
            enum: ["valid", "invalid", "indeterminate", "error"],
            description: "Overall verification status",
            example: "valid",
          },
          isValid: {
            type: "boolean",
            description: "Whether the credential is valid",
            example: true,
          },
          checks: {
            type: "object",
            description: "Detailed verification checks by category",
            properties: {
              proof: {
                type: "array",
                items: { $ref: "#/components/schemas/VerificationCheck" },
              },
              status: {
                type: "array",
                items: { $ref: "#/components/schemas/VerificationCheck" },
              },
              temporal: {
                type: "array",
                items: { $ref: "#/components/schemas/VerificationCheck" },
              },
              issuer: {
                type: "array",
                items: { $ref: "#/components/schemas/VerificationCheck" },
              },
              schema: {
                type: "array",
                items: { $ref: "#/components/schemas/VerificationCheck" },
              },
              general: {
                type: "array",
                items: { $ref: "#/components/schemas/VerificationCheck" },
              },
            },
          },
          credentialId: {
            type: "string",
            format: "uri",
            description: "ID of the verified credential",
          },
          issuer: {
            type: "string",
            format: "uri",
            description: "Issuer of the credential",
          },
          proofType: {
            type: "string",
            description: "Type of proof used in the credential",
            example: "DataIntegrityProof",
          },
          verificationMethod: {
            type: "string",
            format: "uri",
            description: "Verification method used",
          },
          verifiedAt: {
            type: "string",
            format: "date-time",
            description: "Timestamp when verification was performed",
          },
          error: {
            type: "string",
            description: "Error message if verification failed",
          },
          metadata: {
            type: "object",
            description: "Additional verification metadata",
            properties: {
              durationMs: {
                type: "number",
                description: "Verification duration in milliseconds",
              },
              verifierVersion: {
                type: "string",
                description: "Version of the verifier",
              },
              cryptosuite: {
                type: "string",
                description: "Cryptosuite used for verification",
              },
            },
          },
        },
      },
      VerificationCheck: {
        type: "object",
        properties: {
          check: {
            type: "string",
            description: "Unique identifier for the check type",
            example: "proof_verification",
          },
          description: {
            type: "string",
            description: "Human-readable description of the check",
            example: "Verify cryptographic proof signature",
          },
          passed: {
            type: "boolean",
            description: "Whether this check passed",
            example: true,
          },
          error: {
            type: "string",
            description: "Error message if the check failed",
          },
          details: {
            type: "object",
            description: "Additional details about the check result",
          },
        },
      },
    },
  },
};
