/**
 * Request context middleware for openbadges-system
 *
 * Provides request correlation IDs and timing for all HTTP requests.
 * The requestId is available via c.get('requestId') in route handlers.
 */

import { createMiddleware } from 'hono/factory'
import { randomUUID } from 'crypto'
import { logger } from '../utils/logger'

export interface RequestContextVariables {
  requestId: string
  requestStartTime: number
}

/**
 * Middleware that adds request correlation IDs and logs request completion.
 *
 * - Generates a unique requestId for each request (or reuses x-request-id header)
 * - Tracks request timing
 * - Logs request completion with method, path, status, and duration
 * - Skips logging for noisy paths like /api/health
 */
export const requestContextMiddleware = createMiddleware<{
  Variables: RequestContextVariables
}>(async (c, next) => {
  const requestId = c.req.header('x-request-id') || randomUUID()
  const requestStartTime = Date.now()

  c.set('requestId', requestId)
  c.set('requestStartTime', requestStartTime)
  c.header('x-request-id', requestId)

  await next()

  // Skip logging for noisy paths
  const path = new URL(c.req.url).pathname
  if (path === '/api/health' || path === '/favicon.ico') {
    return
  }

  const duration = Date.now() - requestStartTime
  const status = c.res.status
  const level = status >= 500 ? 'error' : status >= 400 ? 'warn' : 'info'

  logger[level]('Request completed', {
    method: c.req.method,
    path,
    status,
    duration: `${duration}ms`,
    requestId,
  })
})

/**
 * Helper to extract request ID from Hono context.
 * Returns 'unknown' if not available.
 */
export function getRequestId(c: { get: (key: string) => unknown }): string {
  return (c.get('requestId') as string) ?? 'unknown'
}
