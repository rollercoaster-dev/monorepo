import { Hono } from 'hono'
import { cors } from 'hono/cors'
import { userRoutes } from './routes/users'
import { authRoutes } from './routes/auth'
import { badgesRoutes } from './routes/badges'
import { oauthRoutes } from './routes/oauth'
import { publicAuthRoutes } from './routes/public-auth'
import { requireAuth } from './middleware/auth'
import { requestContextMiddleware } from './middleware/request-context'
import { oauthConfig, validateOAuthConfig } from './config/oauth'
import { jwtService } from './services/jwt'
import { logger } from './utils/logger'

// Define a simpler JSON value type to avoid deep type recursion
type JSONValue =
  | string
  | number
  | boolean
  | null
  | undefined
  | { [key: string]: unknown }
  | unknown[]

// Initialize Hono app
const app = new Hono()

// Middleware
app.use('*', requestContextMiddleware)
app.use(
  '*',
  cors({
    origin: ['http://localhost:7777'], // Vite dev server
    allowMethods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
    allowHeaders: ['Content-Type', 'Authorization'],
  })
)

// Health check endpoint
app.get('/api/health', c => {
  return c.json({ status: 'ok', timestamp: new Date().toISOString() })
})

// JWKS endpoint for OAuth2 verification
app.get('/.well-known/jwks.json', async c => {
  try {
    const { readFileSync } = await import('fs')
    const { join } = await import('path')
    const crypto = await import('crypto')

    // Read the public key
    const publicKeyPem = readFileSync(join(process.cwd(), 'keys', 'platform-public.pem'), 'utf8')

    // Convert PEM to JWK format
    const publicKey = crypto.createPublicKey(publicKeyPem)
    const jwk = publicKey.export({ format: 'jwk' })

    // Add required JWK fields
    const jwks = {
      keys: [
        {
          ...jwk,
          kid: 'platform-key-1',
          alg: 'RS256',
          use: 'sig',
        },
      ],
    }

    return c.json(jwks)
  } catch (error) {
    logger.error('Error generating JWKS', { error })
    return c.json({ error: 'Failed to generate JWKS' }, 500)
  }
})

// Mount routes
app.route('/api/bs/users', userRoutes)
app.route('/api/auth', authRoutes)
app.route('/api/auth/public', publicAuthRoutes)
app.route('/api/badges', badgesRoutes)
app.route('/api/oauth', oauthRoutes)

// Helper function to safely parse JSON
async function safeJsonResponse(response: Response): Promise<JSONValue> {
  try {
    const data = await response.json()

    // Basic type checking for JSONValue
    if (
      data === null ||
      data === undefined ||
      typeof data === 'string' ||
      typeof data === 'number' ||
      typeof data === 'boolean' ||
      Array.isArray(data) ||
      (typeof data === 'object' && !Array.isArray(data))
    ) {
      return data as JSONValue
    }

    // Fallback to empty object for invalid JSON values
    return {}
  } catch (error) {
    logger.error('Error parsing JSON response', { error })
    return {}
  }
}

// Proxy endpoint for OpenBadges server (excluding user routes)
const proxyRequiresAuth = (process.env.OPENBADGES_PROXY_PUBLIC ?? 'false') !== 'true'

app.all('/api/bs/*', proxyRequiresAuth ? requireAuth : (_c, next) => next(), async c => {
  // Skip user management endpoints - they are handled by userRoutes
  if (c.req.path.startsWith('/api/bs/users')) {
    return c.json({ error: 'Route not found' }, 404)
  }

  const openbadgesUrl = process.env.OPENBADGES_SERVER_URL || 'http://localhost:3000'
  const url = new URL(c.req.path.replace('/api/bs', ''), openbadgesUrl)

  // Preserve query parameters from the original request
  const originalUrl = new URL(c.req.url)
  url.search = originalUrl.search

  try {
    // Configure headers based on environment
    const headers = new Headers(c.req.raw.headers)

    // Add authentication if enabled
    const authEnabled = process.env.OPENBADGES_AUTH_ENABLED !== 'false'
    const authMode = process.env.OPENBADGES_AUTH_MODE || 'docker'

    if (authEnabled) {
      if (authMode === 'oauth') {
        // OAuth mode: use JWT tokens for service-to-service communication
        const systemUser = {
          id: 'system-service',
          username: 'system',
          email: 'system@openbadges.local',
          firstName: 'System',
          lastName: 'Service',
          isAdmin: true,
        }
        const jwtToken = jwtService.generatePlatformToken(systemUser)
        headers.set('Authorization', `Bearer ${jwtToken}`)
      } else if (authMode === 'docker') {
        // Docker mode: use Basic Auth with environment variables
        const basicUser = process.env.OPENBADGES_BASIC_AUTH_USER || 'admin'
        const basicPass = process.env.OPENBADGES_BASIC_AUTH_PASS || 'admin-user'
        headers.set(
          'Authorization',
          'Basic ' + Buffer.from(`${basicUser}:${basicPass}`).toString('base64')
        )
      } else if (authMode === 'local') {
        // Local mode: add API key or basic auth if provided
        const apiKey = process.env.OPENBADGES_API_KEY
        const basicUser = process.env.OPENBADGES_BASIC_AUTH_USER
        const basicPass = process.env.OPENBADGES_BASIC_AUTH_PASS

        if (apiKey) {
          headers.set('X-API-Key', apiKey)
        } else if (basicUser && basicPass) {
          headers.set(
            'Authorization',
            'Basic ' + Buffer.from(`${basicUser}:${basicPass}`).toString('base64')
          )
        }
      }
    }

    const response = await fetch(url.toString(), {
      method: c.req.method,
      headers,
      body: c.req.raw.body,
    })

    // Handle non-JSON responses
    const contentType = response.headers.get('content-type')
    if (!contentType || !contentType.includes('application/json')) {
      const text = await response.text()
      return new Response(text, { status: response.status })
    }

    const data = await safeJsonResponse(response)
    return c.json(data, response.status as 200 | 201 | 400 | 401 | 403 | 404 | 500)
  } catch (error) {
    logger.error('Error proxying request to OpenBadges server', {
      error,
      serverUrl: openbadgesUrl,
      requestPath: c.req.path,
    })
    return c.json({ error: 'Failed to communicate with local OpenBadges server' }, 500)
  }
})

// Validate OAuth configuration if enabled
if (oauthConfig.enabled) {
  try {
    validateOAuthConfig()
    logger.info('OAuth configuration validated successfully')
  } catch (error) {
    logger.error('OAuth configuration validation failed', { error })
    process.exit(1)
  }
} else {
  logger.info('OAuth is disabled - skipping OAuth configuration validation')
}

// Start the server
const port = parseInt(process.env.PORT || '8888')
logger.info(`Server is running on http://localhost:${port}`)

// Export for Bun to pick up
export default {
  port,
  fetch: app.fetch,
}
