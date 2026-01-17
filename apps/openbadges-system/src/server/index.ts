import { Hono } from 'hono'
import { cors } from 'hono/cors'
import { honoLogger, honoErrorHandler } from '@rollercoaster-dev/rd-logger'
import { userRoutes } from './routes/users'
import { authRoutes } from './routes/auth'
import { badgesRoutes } from './routes/badges'
import { oauthRoutes } from './routes/oauth'
import { publicAuthRoutes } from './routes/public-auth'
import { requireAuth } from './middleware/auth'
import { oauthConfig, validateOAuthConfig } from './config/oauth'
import { jwtService } from './services/jwt'
import { openApiConfig } from './openapi'
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
app.use(
  '*',
  honoLogger({
    loggerInstance: logger,
    skip: c => c.req.path === '/api/health',
  })
)
app.use(
  '*',
  cors({
    origin: ['http://localhost:7777'], // Vite dev server
    allowMethods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
    allowHeaders: ['Content-Type', 'Authorization'],
  })
)

// Error handler
app.onError(honoErrorHandler(logger))

// Health check endpoint
app.get('/api/health', c => {
  return c.json({ status: 'ok', timestamp: new Date().toISOString() })
})

// Root route with API information
app.get('/', c => {
  return c.json({
    name: 'OpenBadges System API',
    version: '1.0.0',
    documentation: {
      swagger: '/swagger',
      swaggerUI: '/docs',
    },
  })
})

// OpenAPI JSON endpoint
app.get('/swagger', c => c.json(openApiConfig))

// Swagger UI static assets
app.get('/swagger-ui/*', async c => {
  // Decode URL-encoded characters first to prevent bypass attacks
  let path: string
  try {
    path = decodeURIComponent(c.req.path.replace('/swagger-ui/', ''))
  } catch {
    // Invalid URL encoding
    return c.notFound()
  }

  // Prevent directory traversal attacks - check after decoding
  if (path.includes('..') || path.includes('/') || path.startsWith('.') || path.includes('\\')) {
    return c.notFound()
  }

  // Additional check: ensure filename contains no null bytes or other dangerous characters
  if (path.includes('\0') || path.includes(':')) {
    return c.notFound()
  }

  // Only allow specific file extensions for security
  const allowedExtensions = ['js', 'css', 'map', 'png', 'html', 'ico', 'svg']
  const ext = path.split('.').pop()?.toLowerCase()
  if (!ext || !allowedExtensions.includes(ext)) {
    return c.notFound()
  }

  const filePath = `./node_modules/swagger-ui-dist/${path}`

  try {
    // eslint-disable-next-line no-undef
    const file = Bun.file(filePath)

    if (await file.exists()) {
      // Set appropriate content type based on file extension
      let contentType = 'text/plain'

      switch (ext) {
        case 'js':
          contentType = 'text/javascript'
          break
        case 'css':
          contentType = 'text/css'
          break
        case 'map':
          contentType = 'application/json'
          break
        case 'png':
          contentType = 'image/png'
          break
        case 'html':
          contentType = 'text/html'
          break
        case 'ico':
          contentType = 'image/x-icon'
          break
        case 'svg':
          contentType = 'image/svg+xml'
          break
      }

      return new Response(file.stream(), {
        headers: {
          'Content-Type': contentType,
          'Cache-Control': 'public, max-age=3600',
        },
      })
    }
  } catch (error) {
    logger.error('Error serving swagger-ui asset', { path, error })
  }

  return c.notFound()
})

// Swagger UI HTML endpoint
app.get('/docs', c => {
  c.header('Content-Type', 'text/html')

  return c.html(`
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1" />
  <meta name="description" content="OpenBadges System API Documentation" />
  <title>OpenBadges System API - Swagger UI</title>
  <link rel="stylesheet" href="/swagger-ui/swagger-ui.css" />
</head>
<body>
  <div id="swagger-ui"></div>
  <script src="/swagger-ui/swagger-ui-bundle.js" onload="checkSwaggerUI();" onerror="console.error('Failed to load swagger-ui-bundle.js');"></script>
  <script src="/swagger-ui/swagger-ui-standalone-preset.js" onload="checkSwaggerUI();" onerror="console.error('Failed to load swagger-ui-standalone-preset.js');"></script>
  <script>
    function checkSwaggerUI() {
      if (typeof SwaggerUIBundle !== 'undefined' && typeof SwaggerUIStandalonePreset !== 'undefined') {
        initializeSwaggerUI();
      }
    }

    window.addEventListener('load', function() {
      setTimeout(checkSwaggerUI, 100);
    });

    function initializeSwaggerUI() {
      try {
        window.ui = SwaggerUIBundle({
          url: '/swagger',
          dom_id: '#swagger-ui',
          presets: [
            SwaggerUIBundle.presets.apis,
            SwaggerUIStandalonePreset
          ],
          layout: "StandaloneLayout",
          deepLinking: true,
          showExtensions: true,
          showCommonExtensions: true,
          onComplete: () => {
            // Swagger UI loaded successfully
          },
          onFailure: (error) => {
            console.error('Swagger UI failed to load:', error);
            const container = document.createElement('div');
            container.style.padding = '20px';
            container.style.color = 'red';
            container.style.fontFamily = 'Arial, sans-serif';
            const heading = document.createElement('h2');
            heading.textContent = 'Error loading Swagger UI';
            container.appendChild(heading);
            const desc = document.createElement('p');
            desc.textContent = 'The Swagger UI failed to initialize properly.';
            container.appendChild(desc);
            const errorMsg = document.createElement('p');
            errorMsg.textContent = 'Error: ' + (error?.message || String(error) || 'Unknown error');
            container.appendChild(errorMsg);
            const swaggerUiDiv = document.getElementById('swagger-ui');
            if (swaggerUiDiv) {
              swaggerUiDiv.innerHTML = '';
              swaggerUiDiv.appendChild(container);
            }
          }
        });
      } catch (error) {
        console.error('Error initializing Swagger UI:', error);
        const container = document.createElement('div');
        container.style.padding = '20px';
        container.style.color = 'red';
        container.style.fontFamily = 'Arial, sans-serif';
        const heading = document.createElement('h2');
        heading.textContent = 'Error initializing Swagger UI';
        container.appendChild(heading);
        const errorMsg = document.createElement('p');
        errorMsg.textContent = 'Error: ' + (error?.message || String(error) || 'Unknown error');
        container.appendChild(errorMsg);
        const swaggerUiDiv = document.getElementById('swagger-ui');
        if (swaggerUiDiv) {
          swaggerUiDiv.innerHTML = '';
          swaggerUiDiv.appendChild(container);
        }
      }
    }
  </script>
</body>
</html>
`)
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
logger.info('Server is running', {
  server: `http://localhost:${port}`,
  docs: `http://localhost:${port}/docs`,
})

// Export for Bun to pick up
export default {
  port,
  fetch: app.fetch,
}
