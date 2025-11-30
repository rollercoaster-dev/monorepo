import { Hono } from 'hono'
import { jwtService } from '../services/jwt'
import { logger } from '../utils/logger'

const badgesRoutes = new Hono()

// Define a simpler JSON value type to avoid deep type recursion
type JSONValue =
  | string
  | number
  | boolean
  | null
  | undefined
  | { [key: string]: unknown }
  | unknown[]

// Reusable HTTP status codes type for Hono responses
type HttpStatusCode = 200 | 201 | 400 | 401 | 403 | 404 | 500

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

// Public verification endpoint (no authentication required)
badgesRoutes.post('/verify', async c => {
  const openbadgesUrl = process.env.OPENBADGES_SERVER_URL || 'http://localhost:3000'

  try {
    let body: unknown
    try {
      body = await c.req.json()
    } catch {
      return c.json({ error: 'Invalid JSON body' }, 400)
    }

    // Forward verification request to OpenBadges server
    const response = await fetch(`${openbadgesUrl}/api/v1/verify`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(body),
    })

    const contentType = response.headers.get('content-type')
    if (!contentType || !contentType.includes('application/json')) {
      const text = await response.text()
      return c.text(text, response.status as HttpStatusCode)
    }

    const data = await safeJsonResponse(response)
    return c.json(data, response.status as HttpStatusCode)
  } catch (error) {
    logger.error('Error processing verification request', { error })
    return c.json(
      {
        valid: false,
        errors: ['Verification service temporarily unavailable'],
        verifiedAt: new Date().toISOString(),
      },
      500
    )
  }
})

// Public assertion retrieval endpoint (no authentication required)
badgesRoutes.get('/assertions/:id', async c => {
  const openbadgesUrl = process.env.OPENBADGES_SERVER_URL || 'http://localhost:3000'
  const assertionId = decodeURIComponent(c.req.param('id') || '')

  if (!assertionId) {
    return c.json({ error: 'Assertion ID is required' }, 400)
  }

  try {
    // Re-encode the assertion ID for the URL path
    const response = await fetch(
      `${openbadgesUrl}/api/v1/assertions/${encodeURIComponent(assertionId)}`,
      {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
        },
      }
    )

    if (!response.ok) {
      if (response.status === 404) {
        return c.json({ error: 'Assertion not found' }, 404)
      }
      return c.json({ error: 'Failed to retrieve assertion' }, response.status as HttpStatusCode)
    }

    const contentType = response.headers.get('content-type')
    if (!contentType || !contentType.includes('application/json')) {
      const text = await response.text()
      return c.text(text, response.status as HttpStatusCode)
    }

    const data = await safeJsonResponse(response)
    return c.json(data, response.status as HttpStatusCode)
  } catch (error) {
    logger.error('Error retrieving assertion', { error, assertionId })
    return c.json({ error: 'Failed to retrieve assertion' }, 500)
  }
})

// Public badge class listing endpoint (no authentication required)
badgesRoutes.get('/badge-classes', async c => {
  const openbadgesUrl = process.env.OPENBADGES_SERVER_URL || 'http://localhost:3000'

  try {
    const response = await fetch(`${openbadgesUrl}/api/v2/badge-classes`, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
      },
    })

    if (!response.ok) {
      return new Response(JSON.stringify({ error: 'Failed to retrieve badge classes' }), {
        status: response.status,
        headers: { 'Content-Type': 'application/json' },
      })
    }

    const contentType = response.headers.get('content-type')
    if (!contentType || !contentType.includes('application/json')) {
      const text = await response.text()
      return c.text(text, response.status as HttpStatusCode)
    }

    const data = await safeJsonResponse(response)
    return c.json(data, response.status as HttpStatusCode)
  } catch (error) {
    logger.error('Error retrieving badge classes', { error })
    return c.json({ error: 'Failed to retrieve badge classes' }, 500)
  }
})

// Public badge class retrieval endpoint (no authentication required)
badgesRoutes.get('/badge-classes/:id', async c => {
  const openbadgesUrl = process.env.OPENBADGES_SERVER_URL || 'http://localhost:3000'
  const badgeClassId = decodeURIComponent(c.req.param('id') || '')

  if (!badgeClassId) {
    return c.json({ error: 'Badge class ID is required' }, 400)
  }

  try {
    const response = await fetch(`${openbadgesUrl}/api/v2/badge-classes/${badgeClassId}`, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
      },
    })

    if (!response.ok) {
      if (response.status === 404) {
        return c.json({ error: 'Badge class not found' }, 404)
      }
      return new Response(JSON.stringify({ error: 'Failed to retrieve badge class' }), {
        status: response.status,
        headers: { 'Content-Type': 'application/json' },
      })
    }

    const contentType = response.headers.get('content-type')
    if (!contentType || !contentType.includes('application/json')) {
      const text = await response.text()
      return c.text(text, response.status as HttpStatusCode)
    }

    const data = await safeJsonResponse(response)
    return c.json(data, response.status as HttpStatusCode)
  } catch (error) {
    logger.error('Error retrieving badge class', { error, badgeClassId })
    return c.json({ error: 'Failed to retrieve badge class' }, 500)
  }
})

// Public revocation list endpoint (no authentication required)
badgesRoutes.get('/revocation-list', async c => {
  const openbadgesUrl = process.env.OPENBADGES_SERVER_URL || 'http://localhost:3000'

  try {
    const response = await fetch(`${openbadgesUrl}/api/v1/revocation-list`, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
      },
    })

    if (!response.ok) {
      // If revocation list is not available, return empty list
      return c.json([])
    }

    const contentType = response.headers.get('content-type')
    if (!contentType || !contentType.includes('application/json')) {
      return c.json([])
    }

    const data = await safeJsonResponse(response)
    return c.json(data, response.status as 200)
  } catch (error) {
    logger.warn('Error retrieving revocation list, returning empty list', { error })
    // If revocation service is unavailable, return empty list (fail open)
    return c.json([])
  }
})

// Handle missing assertion ID explicitly to avoid falling through to auth proxy
badgesRoutes.get('/assertions', c => c.json({ error: 'Assertion not found' }, 404))
// Some clients may include a trailing slash
badgesRoutes.get('/assertions/', c => c.json({ error: 'Assertion not found' }, 404))

// OpenBadges API proxy with platform authentication
badgesRoutes.all('/*', async c => {
  const openbadgesUrl = process.env.OPENBADGES_SERVER_URL || 'http://localhost:3000'
  const path = c.req.path.replace('/api/badges', '')
  const url = new URL(path, openbadgesUrl)

  try {
    // Get platform token from Authorization header
    const authHeader = c.req.header('Authorization')
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return c.json({ error: 'Platform token required' }, 401)
    }

    // Verify platform token before proxying
    const token = authHeader.slice('Bearer '.length)
    const payload = jwtService.verifyToken(token)
    if (!payload) {
      return c.json({ error: 'Invalid platform token' }, 401)
    }

    // Build plain headers object to match tests (not a Headers instance)
    const headersObj: Record<string, string> = {}
    c.req.raw.headers.forEach((value, key) => {
      headersObj[key] = value
    })
    headersObj['Authorization'] = authHeader

    // OB2 validation for creation/issuance endpoints
    const method = c.req.method.toUpperCase()
    const isJsonMethod = method !== 'GET' && method !== 'HEAD'

    let bodyToForward: globalThis.BodyInit | null | undefined = undefined
    if (isJsonMethod) {
      // Only parse and validate for specific OB2 endpoints
      const isCreateBadgeClass = method === 'POST' && path.startsWith('/api/v2/badge-classes')
      const isIssueAssertion = method === 'POST' && path.startsWith('/api/v2/assertions')

      if (isCreateBadgeClass || isIssueAssertion) {
        try {
          const incoming = await c.req.json()
          if (isCreateBadgeClass) {
            const { validateBadgeClassPayload } = await import('../middleware/ob2Validation')
            const result = validateBadgeClassPayload(incoming)
            if (!result.valid) {
              return c.json({ error: 'Invalid OB2 BadgeClass payload', report: result.report }, 400)
            }
            bodyToForward = JSON.stringify(result.data)
          } else if (isIssueAssertion) {
            const { validateAssertionPayload } = await import('../middleware/ob2Validation')
            const result = validateAssertionPayload(incoming)
            if (!result.valid) {
              return c.json({ error: 'Invalid OB2 Assertion payload', report: result.report }, 400)
            }
            bodyToForward = JSON.stringify(result.data)
          }
        } catch {
          return c.json({ error: 'Invalid JSON body' }, 400)
        }
      } else {
        // Pass raw body as-is for other endpoints
        bodyToForward = c.req.raw.body as globalThis.BodyInit | null | undefined
      }
    }

    const init: globalThis.RequestInit = {
      method,
      headers: headersObj,
      ...(isJsonMethod ? { body: bodyToForward } : {}),
    }

    const response = await fetch(url.toString(), init)

    const contentType = response.headers.get('content-type')
    if (!contentType || !contentType.includes('application/json')) {
      const text = await response.text()
      return c.text(text, response.status as HttpStatusCode)
    }

    const data = await safeJsonResponse(response)
    return c.json(data, response.status as HttpStatusCode)
  } catch (error) {
    logger.error('Error proxying badges request', { error, path: c.req.path })
    return c.json({ error: 'Failed to communicate with OpenBadges server' }, 500)
  }
})

export { badgesRoutes }
