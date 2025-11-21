import type { Context, Next } from 'hono'
import { jwtService } from '../services/jwt'

export interface AuthPayload {
  sub: string
  platformId: string
  displayName: string
  email: string
  metadata?: {
    firstName?: string
    lastName?: string
    isAdmin?: boolean
  }
}

export function extractBearerToken(c: Context): string | null {
  const authHeader = c.req.header('authorization') ?? c.req.header('Authorization')
  if (!authHeader || !authHeader.startsWith('Bearer ')) return null
  return authHeader.slice('Bearer '.length).trim()
}

export function getAuthPayload(c: Context): AuthPayload | null {
  const token = extractBearerToken(c)
  if (!token) return null
  try {
    const payload = jwtService.verifyToken(token)
    return (payload as AuthPayload) || null
  } catch {
    return null
  }
}

export async function requireAuth(c: Context, next: Next) {
  const payload = getAuthPayload(c)
  if (!payload) {
    return c.json({ error: 'Unauthorized' }, 401)
  }
  return next()
}

export async function requireAdmin(c: Context, next: Next) {
  const payload = getAuthPayload(c)
  if (!payload) {
    return c.json({ error: 'Unauthorized' }, 401)
  }
  if (payload.metadata?.isAdmin !== true) {
    return c.json({ error: 'Forbidden' }, 403)
  }
  return next()
}

export function requireSelfOrAdminFromParam(paramName: string) {
  return async (c: Context, next: Next) => {
    const payload = getAuthPayload(c)
    if (!payload) {
      return c.json({ error: 'Unauthorized' }, 401)
    }
    const requestedId = c.req.param(paramName)
    if (payload.sub !== requestedId && payload.metadata?.isAdmin !== true) {
      return c.json({ error: 'Forbidden' }, 403)
    }
    return next()
  }
}

export function isSelfOrAdmin(c: Context, userId: string): boolean {
  const payload = getAuthPayload(c)
  if (!payload) return false
  return payload.sub === userId || payload.metadata?.isAdmin === true
}
