/**
 * Rate limiting middleware for Open Badges API
 *
 * This middleware applies rate limiting to API endpoints to prevent abuse.
 */

import type { Context } from "hono";
import type { MiddlewareHandler } from "hono";
import { rateLimiter } from "hono-rate-limiter";
import { logger } from "../../logging/logger.service";

// Get environment-specific configurations
const isDevelopment = process.env.NODE_ENV !== "production";

/**
 * Resolve the client IP from request headers with proxy support.
 */
function resolveClientIp(c: Context): string {
  const forwardedFor = c.req.header("x-forwarded-for");
  if (forwardedFor && !isDevelopment) {
    return forwardedFor.split(",")[0]?.trim() || "unknown-ip";
  }

  try {
    return (
      c.req.raw.headers.get("cf-connecting-ip") || // Cloudflare
      c.req.raw.headers.get("x-real-ip") || // Nginx
      c.req.raw.headers.get("x-forwarded-for")?.split(",")[0] || // Generic proxy
      "unknown-ip"
    );
  } catch (error) {
    logger.error("Error getting IP address for rate limiting", { error });
    return "unknown-ip";
  }
}

/**
 * Rate limiting configuration
 *
 * In development:
 * - Higher limits (500 requests per minute)
 *
 * In production:
 * - Stricter limits (100 requests per minute)
 * - IP-based rate limiting with proxy support
 */
export function createRateLimitMiddleware(): MiddlewareHandler {
  return rateLimiter({
    windowMs: 60 * 1000,
    limit: isDevelopment ? 500 : 100,
    standardHeaders: "draft-6",
    keyGenerator: resolveClientIp,
    handler: (c) => {
      return c.json(
        {
          error: "Too Many Requests",
          message: "You have exceeded the rate limit. Please try again later.",
          status: 429,
        },
        429,
        { "Retry-After": "60" },
      );
    },
  });
}

/**
 * Stricter rate limit for image-processing endpoints
 *
 * Image baking/verification is memory-intensive, so apply a lower
 * limit (20 req/min in production) to prevent resource abuse.
 */
export function createImageProcessingRateLimitMiddleware(): MiddlewareHandler {
  return rateLimiter({
    windowMs: 60 * 1000,
    limit: isDevelopment ? 100 : 20,
    standardHeaders: "draft-6",
    keyGenerator: resolveClientIp,
    handler: (c) => {
      return c.json(
        {
          error: "Too Many Requests",
          message:
            "Image processing rate limit exceeded. Please try again later.",
          status: 429,
        },
        429,
        { "Retry-After": "60" },
      );
    },
  });
}
