/**
 * OpenAPI/Swagger Documentation for OpenBadges System API
 *
 * This file contains the OpenAPI 3.0 specification for the API endpoints.
 */

import type { OpenAPIObject } from 'openapi3-ts/oas30'

const PORT = process.env.PORT || '8888'

export const openApiConfig: OpenAPIObject = {
  openapi: '3.0.0',
  info: {
    title: 'OpenBadges System API',
    version: '1.0.0',
    description:
      'Platform API for the OpenBadges System - User management, authentication, OAuth integration, and badge operations proxy.',
    contact: {
      name: 'Rollercoaster.dev Team',
      url: 'https://github.com/rollercoaster-dev',
    },
    license: {
      name: 'MIT',
      url: 'https://opensource.org/licenses/MIT',
    },
  },
  servers: [
    {
      url: `http://localhost:${PORT}`,
      description: 'Development server',
    },
  ],
  tags: [
    {
      name: 'System',
      description: 'System endpoints (health check, JWKS)',
    },
    {
      name: 'Users',
      description: 'User management operations',
    },
    {
      name: 'Authentication',
      description: 'Authentication and token operations',
    },
    {
      name: 'Public Auth',
      description: 'Public authentication endpoints for WebAuthn',
    },
    {
      name: 'OAuth',
      description: 'OAuth provider integration',
    },
    {
      name: 'Badges',
      description: 'Badge operations (verification, badge classes, assertions)',
    },
    {
      name: 'Proxy',
      description: 'Proxy routes to OpenBadges server',
    },
  ],
  paths: {
    // System Endpoints
    '/api/health': {
      get: {
        tags: ['System'],
        summary: 'Health check',
        description: 'Returns the health status of the API',
        responses: {
          '200': {
            description: 'API is healthy',
            content: {
              'application/json': {
                schema: {
                  type: 'object',
                  properties: {
                    status: { type: 'string', example: 'ok' },
                    timestamp: { type: 'string', format: 'date-time' },
                  },
                },
              },
            },
          },
        },
      },
    },
    '/.well-known/jwks.json': {
      get: {
        tags: ['System'],
        summary: 'Get JWKS',
        description: 'Returns the JSON Web Key Set for OAuth2 verification',
        responses: {
          '200': {
            description: 'JWKS retrieved successfully',
            content: {
              'application/json': {
                schema: { $ref: '#/components/schemas/JWKS' },
              },
            },
          },
          '500': {
            description: 'Failed to generate JWKS',
            content: {
              'application/json': {
                schema: { $ref: '#/components/schemas/Error' },
              },
            },
          },
        },
      },
    },

    // User Management Endpoints
    '/api/bs/users': {
      get: {
        tags: ['Users'],
        summary: 'Get all users',
        description: 'Returns paginated list of users (Admin only)',
        security: [{ bearerAuth: [] }],
        parameters: [
          { name: 'page', in: 'query', schema: { type: 'integer', default: 1 } },
          { name: 'limit', in: 'query', schema: { type: 'integer', default: 10, maximum: 100 } },
          { name: 'search', in: 'query', schema: { type: 'string' } },
          { name: 'role', in: 'query', schema: { type: 'string' } },
          { name: 'status', in: 'query', schema: { type: 'string' } },
          { name: 'dateFrom', in: 'query', schema: { type: 'string', format: 'date' } },
          { name: 'dateTo', in: 'query', schema: { type: 'string', format: 'date' } },
        ],
        responses: {
          '200': {
            description: 'Users retrieved successfully',
            content: {
              'application/json': {
                schema: {
                  type: 'object',
                  properties: {
                    users: { type: 'array', items: { $ref: '#/components/schemas/User' } },
                    total: { type: 'integer' },
                  },
                },
              },
            },
          },
          '401': { $ref: '#/components/responses/Unauthorized' },
          '403': { $ref: '#/components/responses/Forbidden' },
        },
      },
      post: {
        tags: ['Users'],
        summary: 'Create a new user',
        description: 'Creates a new user (Admin only)',
        security: [{ bearerAuth: [] }],
        requestBody: {
          required: true,
          content: {
            'application/json': {
              schema: { $ref: '#/components/schemas/UserCreate' },
            },
          },
        },
        responses: {
          '201': {
            description: 'User created successfully',
            content: {
              'application/json': {
                schema: { $ref: '#/components/schemas/User' },
              },
            },
          },
          '400': { $ref: '#/components/responses/BadRequest' },
          '401': { $ref: '#/components/responses/Unauthorized' },
          '403': { $ref: '#/components/responses/Forbidden' },
        },
      },
    },
    '/api/bs/users/{id}': {
      get: {
        tags: ['Users'],
        summary: 'Get user by ID',
        description: 'Returns a single user (Self or Admin)',
        security: [{ bearerAuth: [] }],
        parameters: [
          { name: 'id', in: 'path', required: true, schema: { type: 'string' } },
        ],
        responses: {
          '200': {
            description: 'User retrieved successfully',
            content: {
              'application/json': {
                schema: { $ref: '#/components/schemas/User' },
              },
            },
          },
          '401': { $ref: '#/components/responses/Unauthorized' },
          '403': { $ref: '#/components/responses/Forbidden' },
          '404': { $ref: '#/components/responses/NotFound' },
        },
      },
      put: {
        tags: ['Users'],
        summary: 'Update user',
        description: 'Updates an existing user (Self or Admin)',
        security: [{ bearerAuth: [] }],
        parameters: [
          { name: 'id', in: 'path', required: true, schema: { type: 'string' } },
        ],
        requestBody: {
          required: true,
          content: {
            'application/json': {
              schema: { $ref: '#/components/schemas/UserUpdate' },
            },
          },
        },
        responses: {
          '200': {
            description: 'User updated successfully',
            content: {
              'application/json': {
                schema: { $ref: '#/components/schemas/User' },
              },
            },
          },
          '400': { $ref: '#/components/responses/BadRequest' },
          '401': { $ref: '#/components/responses/Unauthorized' },
          '403': { $ref: '#/components/responses/Forbidden' },
          '404': { $ref: '#/components/responses/NotFound' },
        },
      },
      delete: {
        tags: ['Users'],
        summary: 'Delete user',
        description: 'Deletes a user (Admin only)',
        security: [{ bearerAuth: [] }],
        parameters: [
          { name: 'id', in: 'path', required: true, schema: { type: 'string' } },
        ],
        responses: {
          '200': {
            description: 'User deleted successfully',
            content: {
              'application/json': {
                schema: {
                  type: 'object',
                  properties: { success: { type: 'boolean' } },
                },
              },
            },
          },
          '401': { $ref: '#/components/responses/Unauthorized' },
          '403': { $ref: '#/components/responses/Forbidden' },
        },
      },
    },
    '/api/bs/users/{id}/credentials': {
      get: {
        tags: ['Users'],
        summary: 'Get user credentials',
        description: 'Returns WebAuthn credentials for a user (Self or Admin)',
        security: [{ bearerAuth: [] }],
        parameters: [
          { name: 'id', in: 'path', required: true, schema: { type: 'string' } },
        ],
        responses: {
          '200': {
            description: 'Credentials retrieved successfully',
            content: {
              'application/json': {
                schema: {
                  type: 'array',
                  items: { $ref: '#/components/schemas/UserCredential' },
                },
              },
            },
          },
          '401': { $ref: '#/components/responses/Unauthorized' },
          '403': { $ref: '#/components/responses/Forbidden' },
        },
      },
      post: {
        tags: ['Users'],
        summary: 'Add user credential',
        description: 'Adds a WebAuthn credential to a user (Self or Admin)',
        security: [{ bearerAuth: [] }],
        parameters: [
          { name: 'id', in: 'path', required: true, schema: { type: 'string' } },
        ],
        requestBody: {
          required: true,
          content: {
            'application/json': {
              schema: { $ref: '#/components/schemas/UserCredential' },
            },
          },
        },
        responses: {
          '200': {
            description: 'Credential added successfully',
            content: {
              'application/json': {
                schema: {
                  type: 'object',
                  properties: { success: { type: 'boolean' } },
                },
              },
            },
          },
          '400': { $ref: '#/components/responses/BadRequest' },
          '401': { $ref: '#/components/responses/Unauthorized' },
          '403': { $ref: '#/components/responses/Forbidden' },
        },
      },
    },
    '/api/bs/users/{id}/credentials/{credentialId}': {
      delete: {
        tags: ['Users'],
        summary: 'Remove user credential',
        description: 'Removes a WebAuthn credential from a user (Self or Admin)',
        security: [{ bearerAuth: [] }],
        parameters: [
          { name: 'id', in: 'path', required: true, schema: { type: 'string' } },
          { name: 'credentialId', in: 'path', required: true, schema: { type: 'string' } },
        ],
        responses: {
          '200': {
            description: 'Credential removed successfully',
            content: {
              'application/json': {
                schema: {
                  type: 'object',
                  properties: { success: { type: 'boolean' } },
                },
              },
            },
          },
          '401': { $ref: '#/components/responses/Unauthorized' },
          '403': { $ref: '#/components/responses/Forbidden' },
        },
      },
    },

    // Authentication Endpoints
    '/api/auth/validate': {
      get: {
        tags: ['Authentication'],
        summary: 'Validate JWT token',
        description: 'Validates the current JWT token',
        security: [{ bearerAuth: [] }],
        responses: {
          '200': {
            description: 'Token is valid',
            content: {
              'application/json': {
                schema: {
                  type: 'object',
                  properties: {
                    success: { type: 'boolean' },
                    payload: { type: 'object' },
                  },
                },
              },
            },
          },
          '401': { $ref: '#/components/responses/Unauthorized' },
        },
      },
    },
    '/api/auth/platform-token': {
      post: {
        tags: ['Authentication'],
        summary: 'Generate platform token',
        description: 'Generates a JWT platform token for OpenBadges API (Admin only)',
        security: [{ bearerAuth: [] }],
        requestBody: {
          required: true,
          content: {
            'application/json': {
              schema: {
                type: 'object',
                required: ['user'],
                properties: {
                  user: { $ref: '#/components/schemas/PlatformTokenUser' },
                },
              },
            },
          },
        },
        responses: {
          '200': {
            description: 'Token generated successfully',
            content: {
              'application/json': {
                schema: {
                  type: 'object',
                  properties: {
                    success: { type: 'boolean' },
                    token: { type: 'string' },
                    platformId: { type: 'string' },
                  },
                },
              },
            },
          },
          '400': { $ref: '#/components/responses/BadRequest' },
          '401': { $ref: '#/components/responses/Unauthorized' },
          '403': { $ref: '#/components/responses/Forbidden' },
        },
      },
    },
    '/api/auth/oauth-token': {
      post: {
        tags: ['Authentication'],
        summary: 'Get OAuth access token',
        description: "Gets OAuth access token for a user's linked provider",
        security: [{ bearerAuth: [] }],
        requestBody: {
          required: true,
          content: {
            'application/json': {
              schema: {
                type: 'object',
                required: ['userId'],
                properties: {
                  userId: { type: 'string' },
                },
              },
            },
          },
        },
        responses: {
          '200': {
            description: 'Token retrieved successfully',
            content: {
              'application/json': {
                schema: {
                  type: 'object',
                  properties: {
                    success: { type: 'boolean' },
                    access_token: { type: 'string' },
                    provider: { type: 'string' },
                    expires_at: { type: 'string', format: 'date-time' },
                  },
                },
              },
            },
          },
          '401': { $ref: '#/components/responses/Unauthorized' },
          '404': { $ref: '#/components/responses/NotFound' },
        },
      },
    },
    '/api/auth/oauth-token/refresh': {
      post: {
        tags: ['Authentication'],
        summary: 'Refresh OAuth access token',
        description: "Refreshes OAuth access token using refresh token",
        security: [{ bearerAuth: [] }],
        requestBody: {
          required: true,
          content: {
            'application/json': {
              schema: {
                type: 'object',
                required: ['userId'],
                properties: {
                  userId: { type: 'string' },
                },
              },
            },
          },
        },
        responses: {
          '200': {
            description: 'Token refreshed successfully',
            content: {
              'application/json': {
                schema: {
                  type: 'object',
                  properties: {
                    success: { type: 'boolean' },
                    access_token: { type: 'string' },
                  },
                },
              },
            },
          },
          '400': { $ref: '#/components/responses/BadRequest' },
          '401': { $ref: '#/components/responses/Unauthorized' },
          '404': { $ref: '#/components/responses/NotFound' },
        },
      },
    },
    '/api/auth/sync-user': {
      post: {
        tags: ['Authentication'],
        summary: 'Sync user with badge server',
        description: 'Synchronizes user data with the badge server',
        security: [{ bearerAuth: [] }],
        requestBody: {
          required: true,
          content: {
            'application/json': {
              schema: {
                type: 'object',
                required: ['userId'],
                properties: {
                  userId: { type: 'string' },
                },
              },
            },
          },
        },
        responses: {
          '200': {
            description: 'User synced successfully',
            content: {
              'application/json': {
                schema: {
                  type: 'object',
                  properties: {
                    success: { type: 'boolean' },
                    user: { type: 'object' },
                    created: { type: 'boolean' },
                    updated: { type: 'boolean' },
                  },
                },
              },
            },
          },
          '401': { $ref: '#/components/responses/Unauthorized' },
          '404': { $ref: '#/components/responses/NotFound' },
        },
      },
    },
    '/api/auth/badge-server-profile/{userId}': {
      get: {
        tags: ['Authentication'],
        summary: 'Get badge server user profile',
        description: "Gets user's profile from the badge server (Self or Admin)",
        security: [{ bearerAuth: [] }],
        parameters: [
          { name: 'userId', in: 'path', required: true, schema: { type: 'string' } },
        ],
        responses: {
          '200': {
            description: 'Profile retrieved successfully',
            content: {
              'application/json': {
                schema: {
                  type: 'object',
                  properties: {
                    success: { type: 'boolean' },
                    profile: { type: 'object' },
                  },
                },
              },
            },
          },
          '401': { $ref: '#/components/responses/Unauthorized' },
          '403': { $ref: '#/components/responses/Forbidden' },
          '404': { $ref: '#/components/responses/NotFound' },
        },
      },
    },

    // Public Auth Endpoints
    '/api/auth/public/users/lookup': {
      get: {
        tags: ['Public Auth'],
        summary: 'Lookup user',
        description: 'Checks if user exists (rate limited for security)',
        parameters: [
          { name: 'username', in: 'query', schema: { type: 'string' } },
          { name: 'email', in: 'query', schema: { type: 'string', format: 'email' } },
        ],
        responses: {
          '200': {
            description: 'Lookup completed',
            content: {
              'application/json': {
                schema: {
                  type: 'object',
                  properties: {
                    exists: { type: 'boolean' },
                    user: { $ref: '#/components/schemas/UserPublic' },
                  },
                },
              },
            },
          },
          '400': { $ref: '#/components/responses/BadRequest' },
          '429': {
            description: 'Too many requests',
            content: {
              'application/json': {
                schema: { $ref: '#/components/schemas/Error' },
              },
            },
          },
        },
      },
    },
    '/api/auth/public/users/register': {
      post: {
        tags: ['Public Auth'],
        summary: 'Register new user',
        description: 'Creates a new user account (rate limited)',
        requestBody: {
          required: true,
          content: {
            'application/json': {
              schema: { $ref: '#/components/schemas/UserCreate' },
            },
          },
        },
        responses: {
          '201': {
            description: 'User created successfully',
            content: {
              'application/json': {
                schema: { $ref: '#/components/schemas/UserPublic' },
              },
            },
          },
          '400': { $ref: '#/components/responses/BadRequest' },
          '409': {
            description: 'User already exists',
            content: {
              'application/json': {
                schema: { $ref: '#/components/schemas/Error' },
              },
            },
          },
          '429': {
            description: 'Too many requests',
            content: {
              'application/json': {
                schema: { $ref: '#/components/schemas/Error' },
              },
            },
          },
        },
      },
    },
    '/api/auth/public/users/{id}/credentials': {
      post: {
        tags: ['Public Auth'],
        summary: 'Add credential to user',
        description: 'Adds a WebAuthn credential during registration',
        parameters: [
          { name: 'id', in: 'path', required: true, schema: { type: 'string' } },
        ],
        requestBody: {
          required: true,
          content: {
            'application/json': {
              schema: { $ref: '#/components/schemas/UserCredential' },
            },
          },
        },
        responses: {
          '200': {
            description: 'Credential added successfully',
            content: {
              'application/json': {
                schema: {
                  type: 'object',
                  properties: { success: { type: 'boolean' } },
                },
              },
            },
          },
          '400': { $ref: '#/components/responses/BadRequest' },
          '404': { $ref: '#/components/responses/NotFound' },
        },
      },
    },
    '/api/auth/public/users/{userId}/credentials/{credentialId}': {
      patch: {
        tags: ['Public Auth'],
        summary: 'Update credential',
        description: 'Updates credential last used time after authentication',
        parameters: [
          { name: 'userId', in: 'path', required: true, schema: { type: 'string' } },
          { name: 'credentialId', in: 'path', required: true, schema: { type: 'string' } },
        ],
        requestBody: {
          required: true,
          content: {
            'application/json': {
              schema: {
                type: 'object',
                required: ['lastUsed'],
                properties: {
                  lastUsed: { type: 'string', format: 'date-time' },
                },
              },
            },
          },
        },
        responses: {
          '200': {
            description: 'Credential updated successfully',
            content: {
              'application/json': {
                schema: {
                  type: 'object',
                  properties: { success: { type: 'boolean' } },
                },
              },
            },
          },
          '400': { $ref: '#/components/responses/BadRequest' },
          '404': { $ref: '#/components/responses/NotFound' },
        },
      },
    },
    '/api/auth/public/users/{id}/token': {
      post: {
        tags: ['Public Auth'],
        summary: 'Generate token for user',
        description: 'Generates JWT token after WebAuthn authentication',
        parameters: [
          { name: 'id', in: 'path', required: true, schema: { type: 'string' } },
        ],
        responses: {
          '200': {
            description: 'Token generated successfully',
            content: {
              'application/json': {
                schema: {
                  type: 'object',
                  properties: {
                    success: { type: 'boolean' },
                    token: { type: 'string' },
                    platformId: { type: 'string' },
                  },
                },
              },
            },
          },
          '404': { $ref: '#/components/responses/NotFound' },
        },
      },
    },

    // OAuth Endpoints
    '/api/oauth/providers': {
      get: {
        tags: ['OAuth'],
        summary: 'Get available OAuth providers',
        description: 'Returns list of available OAuth providers',
        responses: {
          '200': {
            description: 'Providers retrieved successfully',
            content: {
              'application/json': {
                schema: {
                  type: 'object',
                  properties: {
                    success: { type: 'boolean' },
                    providers: {
                      type: 'array',
                      items: { type: 'string' },
                      example: ['github'],
                    },
                  },
                },
              },
            },
          },
        },
      },
    },
    '/api/oauth/github': {
      get: {
        tags: ['OAuth'],
        summary: 'Initialize GitHub OAuth',
        description: 'Starts GitHub OAuth flow with PKCE',
        parameters: [
          { name: 'redirect_uri', in: 'query', schema: { type: 'string' } },
        ],
        responses: {
          '200': {
            description: 'OAuth session created',
            content: {
              'application/json': {
                schema: {
                  type: 'object',
                  properties: {
                    success: { type: 'boolean' },
                    authUrl: { type: 'string', format: 'uri' },
                    state: { type: 'string' },
                  },
                },
              },
            },
          },
        },
      },
    },
    '/api/oauth/github/callback': {
      get: {
        tags: ['OAuth'],
        summary: 'GitHub OAuth callback',
        description: 'Handles GitHub OAuth callback after user authorization',
        parameters: [
          { name: 'code', in: 'query', required: true, schema: { type: 'string' } },
          { name: 'state', in: 'query', required: true, schema: { type: 'string' } },
          { name: 'error', in: 'query', schema: { type: 'string' } },
        ],
        responses: {
          '200': {
            description: 'Authentication successful (JSON for API requests)',
            content: {
              'application/json': {
                schema: {
                  type: 'object',
                  properties: {
                    success: { type: 'boolean' },
                    user: { $ref: '#/components/schemas/User' },
                    token: { type: 'string' },
                    redirectUri: { type: 'string' },
                  },
                },
              },
            },
          },
          '302': {
            description: 'Redirect to frontend callback (browser requests)',
          },
          '400': { $ref: '#/components/responses/BadRequest' },
        },
      },
    },
    '/api/oauth/{provider}': {
      delete: {
        tags: ['OAuth'],
        summary: 'Unlink OAuth provider',
        description: 'Removes OAuth provider link from user account',
        parameters: [
          { name: 'provider', in: 'path', required: true, schema: { type: 'string' } },
          { name: 'user_id', in: 'query', required: true, schema: { type: 'string' } },
        ],
        responses: {
          '200': {
            description: 'Provider unlinked successfully',
            content: {
              'application/json': {
                schema: {
                  type: 'object',
                  properties: {
                    success: { type: 'boolean' },
                    message: { type: 'string' },
                  },
                },
              },
            },
          },
          '400': { $ref: '#/components/responses/BadRequest' },
        },
      },
    },
    '/api/oauth/user/{userId}/providers': {
      get: {
        tags: ['OAuth'],
        summary: "Get user's linked providers",
        description: 'Returns all OAuth providers linked to a user',
        parameters: [
          { name: 'userId', in: 'path', required: true, schema: { type: 'string' } },
        ],
        responses: {
          '200': {
            description: 'Providers retrieved successfully',
            content: {
              'application/json': {
                schema: {
                  type: 'object',
                  properties: {
                    success: { type: 'boolean' },
                    providers: {
                      type: 'array',
                      items: {
                        type: 'object',
                        properties: {
                          provider: { type: 'string' },
                          linked: { type: 'boolean' },
                          profile: { type: 'object' },
                          linked_at: { type: 'string', format: 'date-time' },
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
    '/api/oauth/cleanup': {
      post: {
        tags: ['OAuth'],
        summary: 'Cleanup expired sessions',
        description: 'Removes expired OAuth sessions (admin endpoint)',
        responses: {
          '200': {
            description: 'Sessions cleaned up',
            content: {
              'application/json': {
                schema: {
                  type: 'object',
                  properties: {
                    success: { type: 'boolean' },
                    message: { type: 'string' },
                  },
                },
              },
            },
          },
        },
      },
    },

    // Badge Endpoints
    '/api/badges/verify': {
      post: {
        tags: ['Badges'],
        summary: 'Verify badge',
        description: 'Verifies a badge assertion (public, no auth required)',
        requestBody: {
          required: true,
          content: {
            'application/json': {
              schema: {
                type: 'object',
                description: 'Badge assertion or verification request',
              },
            },
          },
        },
        responses: {
          '200': {
            description: 'Verification completed',
            content: {
              'application/json': {
                schema: {
                  type: 'object',
                  properties: {
                    valid: { type: 'boolean' },
                    errors: { type: 'array', items: { type: 'string' } },
                    verifiedAt: { type: 'string', format: 'date-time' },
                  },
                },
              },
            },
          },
          '400': { $ref: '#/components/responses/BadRequest' },
        },
      },
    },
    '/api/badges/assertions/{id}': {
      get: {
        tags: ['Badges'],
        summary: 'Get assertion by ID',
        description: 'Retrieves a badge assertion (public, no auth required)',
        parameters: [
          { name: 'id', in: 'path', required: true, schema: { type: 'string' } },
        ],
        responses: {
          '200': {
            description: 'Assertion retrieved successfully',
            content: {
              'application/json': {
                schema: { type: 'object' },
              },
            },
          },
          '404': { $ref: '#/components/responses/NotFound' },
        },
      },
    },
    '/api/badges/badge-classes': {
      get: {
        tags: ['Badges'],
        summary: 'Get all badge classes',
        description: 'Returns all badge classes (public, no auth required)',
        responses: {
          '200': {
            description: 'Badge classes retrieved successfully',
            content: {
              'application/json': {
                schema: {
                  type: 'array',
                  items: { type: 'object' },
                },
              },
            },
          },
        },
      },
    },
    '/api/badges/badge-classes/{id}': {
      get: {
        tags: ['Badges'],
        summary: 'Get badge class by ID',
        description: 'Retrieves a single badge class (public, no auth required)',
        parameters: [
          { name: 'id', in: 'path', required: true, schema: { type: 'string' } },
        ],
        responses: {
          '200': {
            description: 'Badge class retrieved successfully',
            content: {
              'application/json': {
                schema: { type: 'object' },
              },
            },
          },
          '404': { $ref: '#/components/responses/NotFound' },
        },
      },
    },
    '/api/badges/revocation-list': {
      get: {
        tags: ['Badges'],
        summary: 'Get revocation list',
        description: 'Returns list of revoked badges (public, no auth required)',
        responses: {
          '200': {
            description: 'Revocation list retrieved',
            content: {
              'application/json': {
                schema: {
                  type: 'array',
                  items: { type: 'object' },
                },
              },
            },
          },
        },
      },
    },

    // Proxy Endpoint
    '/api/bs/{path}': {
      get: {
        tags: ['Proxy'],
        summary: 'Proxy to OpenBadges server (GET)',
        description: 'Proxies GET requests to the OpenBadges server with authentication',
        security: [{ bearerAuth: [] }],
        parameters: [
          { name: 'path', in: 'path', required: true, schema: { type: 'string' } },
        ],
        responses: {
          '200': { description: 'Proxied response from OpenBadges server' },
          '401': { $ref: '#/components/responses/Unauthorized' },
        },
      },
      post: {
        tags: ['Proxy'],
        summary: 'Proxy to OpenBadges server (POST)',
        description: 'Proxies POST requests to the OpenBadges server with authentication',
        security: [{ bearerAuth: [] }],
        parameters: [
          { name: 'path', in: 'path', required: true, schema: { type: 'string' } },
        ],
        requestBody: {
          content: {
            'application/json': {
              schema: { type: 'object' },
            },
          },
        },
        responses: {
          '200': { description: 'Proxied response from OpenBadges server' },
          '201': { description: 'Resource created on OpenBadges server' },
          '401': { $ref: '#/components/responses/Unauthorized' },
        },
      },
      put: {
        tags: ['Proxy'],
        summary: 'Proxy to OpenBadges server (PUT)',
        description: 'Proxies PUT requests to the OpenBadges server with authentication',
        security: [{ bearerAuth: [] }],
        parameters: [
          { name: 'path', in: 'path', required: true, schema: { type: 'string' } },
        ],
        requestBody: {
          content: {
            'application/json': {
              schema: { type: 'object' },
            },
          },
        },
        responses: {
          '200': { description: 'Proxied response from OpenBadges server' },
          '401': { $ref: '#/components/responses/Unauthorized' },
        },
      },
      delete: {
        tags: ['Proxy'],
        summary: 'Proxy to OpenBadges server (DELETE)',
        description: 'Proxies DELETE requests to the OpenBadges server with authentication',
        security: [{ bearerAuth: [] }],
        parameters: [
          { name: 'path', in: 'path', required: true, schema: { type: 'string' } },
        ],
        responses: {
          '200': { description: 'Proxied response from OpenBadges server' },
          '204': { description: 'Resource deleted on OpenBadges server' },
          '401': { $ref: '#/components/responses/Unauthorized' },
        },
      },
    },
  },
  components: {
    securitySchemes: {
      bearerAuth: {
        type: 'http',
        scheme: 'bearer',
        bearerFormat: 'JWT',
        description: 'JWT token for authentication',
      },
    },
    schemas: {
      Error: {
        type: 'object',
        properties: {
          error: { type: 'string', description: 'Error message' },
        },
      },
      JWKS: {
        type: 'object',
        properties: {
          keys: {
            type: 'array',
            items: {
              type: 'object',
              properties: {
                kid: { type: 'string' },
                alg: { type: 'string' },
                use: { type: 'string' },
                kty: { type: 'string' },
                n: { type: 'string' },
                e: { type: 'string' },
              },
            },
          },
        },
      },
      User: {
        type: 'object',
        properties: {
          id: { type: 'string' },
          username: { type: 'string' },
          email: { type: 'string', format: 'email' },
          firstName: { type: 'string' },
          lastName: { type: 'string' },
          avatar: { type: 'string', format: 'uri' },
          isActive: { type: 'boolean' },
          roles: { type: 'array', items: { type: 'string' } },
          createdAt: { type: 'string', format: 'date-time' },
          updatedAt: { type: 'string', format: 'date-time' },
        },
      },
      UserPublic: {
        type: 'object',
        properties: {
          id: { type: 'string' },
          username: { type: 'string' },
          email: { type: 'string', format: 'email' },
          firstName: { type: 'string' },
          lastName: { type: 'string' },
          avatar: { type: 'string', format: 'uri' },
          createdAt: { type: 'string', format: 'date-time' },
          hasCredentials: { type: 'boolean' },
        },
      },
      UserCreate: {
        type: 'object',
        required: ['username', 'email', 'firstName', 'lastName'],
        properties: {
          username: { type: 'string', minLength: 3 },
          email: { type: 'string', format: 'email' },
          firstName: { type: 'string', minLength: 1 },
          lastName: { type: 'string', minLength: 1 },
          avatar: { type: 'string', format: 'uri' },
          isActive: { type: 'boolean', default: true },
          roles: { type: 'array', items: { type: 'string' }, default: ['USER'] },
        },
      },
      UserUpdate: {
        type: 'object',
        properties: {
          username: { type: 'string', minLength: 3 },
          email: { type: 'string', format: 'email' },
          firstName: { type: 'string', minLength: 1 },
          lastName: { type: 'string', minLength: 1 },
          avatar: { type: 'string', format: 'uri' },
          isActive: { type: 'boolean' },
          roles: { type: 'array', items: { type: 'string' } },
        },
      },
      UserCredential: {
        type: 'object',
        required: ['id', 'publicKey', 'name', 'type'],
        properties: {
          id: { type: 'string' },
          publicKey: { type: 'string' },
          transports: { type: 'array', items: { type: 'string' }, default: [] },
          counter: { type: 'integer', default: 0 },
          createdAt: { type: 'string', format: 'date-time' },
          lastUsed: { type: 'string', format: 'date-time' },
          name: { type: 'string' },
          type: { type: 'string', enum: ['platform', 'cross-platform'] },
        },
      },
      PlatformTokenUser: {
        type: 'object',
        required: ['id', 'email'],
        properties: {
          id: { type: 'string' },
          email: { type: 'string', format: 'email' },
          username: { type: 'string' },
          firstName: { type: 'string' },
          lastName: { type: 'string' },
          isAdmin: { type: 'boolean' },
        },
      },
    },
    responses: {
      BadRequest: {
        description: 'Bad request',
        content: {
          'application/json': {
            schema: { $ref: '#/components/schemas/Error' },
          },
        },
      },
      Unauthorized: {
        description: 'Unauthorized - Missing or invalid token',
        content: {
          'application/json': {
            schema: { $ref: '#/components/schemas/Error' },
          },
        },
      },
      Forbidden: {
        description: 'Forbidden - Insufficient permissions',
        content: {
          'application/json': {
            schema: { $ref: '#/components/schemas/Error' },
          },
        },
      },
      NotFound: {
        description: 'Resource not found',
        content: {
          'application/json': {
            schema: { $ref: '#/components/schemas/Error' },
          },
        },
      },
    },
  },
}
