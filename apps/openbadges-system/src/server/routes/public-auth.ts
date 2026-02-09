import { Hono } from 'hono'
import { z } from 'zod'
import { verifyAuthenticationResponse, verifyRegistrationResponse } from '@simplewebauthn/server'
import type { AuthenticatorTransportFuture } from '@simplewebauthn/server'
import { userService } from '../services/user'
import { jwtService } from '../services/jwt'
import { issueTokenPair, rotateRefreshToken, revokeRefreshToken } from '../services/refresh-token'
import { generateChallenge, consumeChallenge } from '../services/challenge'
import { logger } from '../utils/logger'

// Simple rate limiting for user enumeration protection
const rateLimiter = new Map<string, { count: number; resetTime: number }>()
const RATE_LIMIT_WINDOW = 15 * 60 * 1000 // 15 minutes
const MAX_REQUESTS = 10 // Max 10 requests per window per IP

function checkRateLimit(ip: string): boolean {
  const now = Date.now()
  const record = rateLimiter.get(ip)

  if (!record || now > record.resetTime) {
    // Reset or create new record
    rateLimiter.set(ip, { count: 1, resetTime: now + RATE_LIMIT_WINDOW })
    return true
  }

  if (record.count >= MAX_REQUESTS) {
    return false // Rate limit exceeded
  }

  record.count++
  return true
}

// RP configuration — derive from environment, request origin, or sensible defaults.
// When WEBAUTHN_ORIGIN is set, that takes precedence (production).
// Otherwise, use the request's Origin header if it matches a known dev pattern.
const ALLOWED_DEV_ORIGINS = [/^http:\/\/localhost:\d+$/, /^http:\/\/127\.0\.0\.1:\d+$/]

function getRpConfig(requestOrigin?: string | null) {
  const rpId = process.env.WEBAUTHN_RP_ID || 'localhost'

  // Explicit env var always wins (production)
  if (process.env.WEBAUTHN_ORIGIN) {
    return { rpId, origin: process.env.WEBAUTHN_ORIGIN }
  }

  // In dev, use the request Origin header if it matches an allowed pattern
  if (requestOrigin && ALLOWED_DEV_ORIGINS.some(re => re.test(requestOrigin))) {
    return { rpId, origin: requestOrigin }
  }

  // Fallback
  return { rpId, origin: `http://${rpId}:7777` }
}

const publicAuthRoutes = new Hono()

// Schemas
const userLookupSchema = z
  .object({
    username: z.string().optional(),
    email: z.string().email().optional(),
  })
  .refine(data => data.username || data.email, {
    message: 'Either username or email must be provided',
  })

const userCreateSchema = z.object({
  username: z.string().min(3),
  email: z.string().email(),
  firstName: z.string().min(1),
  lastName: z.string().min(1),
  avatar: z.string().url().optional(),
  isActive: z.boolean().default(true),
  roles: z.array(z.string()).default(['USER']),
})

// Public endpoint to check if user exists (for WebAuthn registration)
publicAuthRoutes.get('/users/lookup', async c => {
  // Rate limiting to prevent user enumeration attacks
  const clientIP = c.req.header('x-forwarded-for') || c.req.header('x-real-ip') || 'unknown'
  if (!checkRateLimit(clientIP)) {
    return c.json({ error: 'Too many requests. Please try again later.' }, 429)
  }

  if (!userService) {
    return c.json({ error: 'User service unavailable' }, 503)
  }

  try {
    const query = c.req.query()
    const parsed = userLookupSchema.safeParse(query)

    if (!parsed.success) {
      return c.json({ error: 'Username or email parameter required' }, 400)
    }

    const { username, email } = parsed.data
    let user = null

    if (username) {
      user = await userService.getUserByUsername(username)
    } else if (email) {
      user = await userService.getUserByEmail(email)
    }

    if (user) {
      // Return user info with credential metadata for WebAuthn authentication
      // Only include id/transports/name/type — never expose publicKey or counter
      const userCredentials = await userService.getUserCredentials(user.id)
      return c.json({
        exists: true,
        user: {
          id: user.id,
          username: user.username,
          email: user.email,
          firstName: user.firstName,
          lastName: user.lastName,
          avatar: user.avatar,
          createdAt: user.createdAt,
          hasCredentials: userCredentials.length > 0,
          credentials: userCredentials.map(cred => ({
            id: cred.id,
            transports: cred.transports,
            name: cred.name,
            type: cred.type,
          })),
        },
      })
    } else {
      return c.json({ exists: false })
    }
  } catch (err) {
    logger.error('Error looking up user', { error: err })
    return c.json({ error: 'Failed to lookup user' }, 500)
  }
})

// Public endpoint to create new user (for WebAuthn registration)
publicAuthRoutes.post('/users/register', async c => {
  // Rate limiting to prevent registration abuse
  const clientIP = c.req.header('x-forwarded-for') || c.req.header('x-real-ip') || 'unknown'
  if (!checkRateLimit(clientIP)) {
    return c.json({ error: 'Too many requests. Please try again later.' }, 429)
  }

  if (!userService) {
    return c.json({ error: 'User service unavailable' }, 503)
  }

  try {
    let body: unknown
    try {
      body = await c.req.json()
    } catch {
      return c.json({ error: 'Invalid JSON body' }, 400)
    }

    const parsed = userCreateSchema.safeParse(body)
    if (!parsed.success) {
      return c.json({ error: 'Invalid user data', details: parsed.error.issues }, 400)
    }

    // Check if user already exists
    const existingByUsername = await userService.getUserByUsername(parsed.data.username)
    if (existingByUsername) {
      return c.json({ error: 'Username already exists' }, 409)
    }

    const existingByEmail = await userService.getUserByEmail(parsed.data.email)
    if (existingByEmail) {
      return c.json({ error: 'Email already exists' }, 409)
    }

    // Create new user
    const newUser = await userService.createUser(parsed.data)

    return c.json(
      {
        id: newUser.id,
        username: newUser.username,
        email: newUser.email,
        firstName: newUser.firstName,
        lastName: newUser.lastName,
        avatar: newUser.avatar,
        createdAt: newUser.createdAt,
        hasCredentials: false,
      },
      201
    )
  } catch (err) {
    logger.error('Error creating user', { error: err })
    return c.json({ error: 'Failed to create user' }, 500)
  }
})

// --- Challenge endpoints ---

// Generate a challenge for WebAuthn authentication
publicAuthRoutes.get('/users/:id/challenge/authentication', async c => {
  const clientIP = c.req.header('x-forwarded-for') || c.req.header('x-real-ip') || 'unknown'
  if (!checkRateLimit(clientIP)) {
    return c.json({ error: 'Too many requests. Please try again later.' }, 429)
  }

  if (!userService) {
    return c.json({ error: 'User service unavailable' }, 503)
  }

  try {
    const userId = c.req.param('id')
    const user = await userService.getUserById(userId)
    if (!user) {
      return c.json({ error: 'User not found' }, 404)
    }

    const { rpId } = getRpConfig(c.req.header('origin'))
    const challenge = generateChallenge(userId, 'authentication')

    return c.json({ challenge, rpId, timeout: 60000 })
  } catch (err) {
    logger.error('Error generating authentication challenge', { error: err })
    return c.json({ error: 'Failed to generate challenge' }, 500)
  }
})

// Generate a challenge for WebAuthn registration
publicAuthRoutes.get('/users/:id/challenge/registration', async c => {
  const clientIP = c.req.header('x-forwarded-for') || c.req.header('x-real-ip') || 'unknown'
  if (!checkRateLimit(clientIP)) {
    return c.json({ error: 'Too many requests. Please try again later.' }, 429)
  }

  if (!userService) {
    return c.json({ error: 'User service unavailable' }, 503)
  }

  try {
    const userId = c.req.param('id')
    const user = await userService.getUserById(userId)
    if (!user) {
      return c.json({ error: 'User not found' }, 404)
    }

    const { rpId } = getRpConfig(c.req.header('origin'))
    const challenge = generateChallenge(userId, 'registration')

    return c.json({ challenge, rpId, timeout: 60000 })
  } catch (err) {
    logger.error('Error generating registration challenge', { error: err })
    return c.json({ error: 'Failed to generate challenge' }, 500)
  }
})

// --- Credential registration (secured with server challenge) ---
// Bootstrap case (no existing credentials): unauthenticated — allows first passkey setup
// Existing credentials: requires valid JWT belonging to this user — prevents account takeover

publicAuthRoutes.post('/users/:id/credentials', async c => {
  if (!userService) {
    return c.json({ error: 'User service unavailable' }, 503)
  }

  try {
    const userId = c.req.param('id')

    const user = await userService.getUserById(userId)
    if (!user) {
      return c.json({ error: 'User not found' }, 404)
    }

    // If user already has credentials, require authentication to add new ones
    const existingCredentials = await userService.getUserCredentials(userId)
    if (existingCredentials.length > 0) {
      const authHeader = c.req.header('authorization')
      if (!authHeader?.startsWith('Bearer ')) {
        return c.json({ error: 'Authentication required to add credentials' }, 401)
      }
      const payload = jwtService.verifyToken(authHeader.slice(7))
      if (!payload || payload.sub !== userId) {
        return c.json({ error: 'Unauthorized' }, 403)
      }
    }

    let body: unknown
    try {
      body = await c.req.json()
    } catch {
      return c.json({ error: 'Invalid JSON body' }, 400)
    }

    const registrationSchema = z.object({
      // Fields from navigator.credentials.create() response
      id: z.string().min(1),
      rawId: z.string().min(1),
      type: z.literal('public-key'),
      response: z.object({
        attestationObject: z.string().min(1),
        clientDataJSON: z.string().min(1),
      }),
      challenge: z.string().min(1),
      // Metadata for credential storage
      name: z.string().min(1),
      authenticatorAttachment: z.enum(['platform', 'cross-platform']).optional(),
      transports: z.array(z.string()).default([]),
    })

    const parsed = registrationSchema.safeParse(body)
    if (!parsed.success) {
      return c.json({ error: 'Invalid registration data', details: parsed.error.issues }, 400)
    }

    // Validate the challenge was issued by us
    const challengeResult = consumeChallenge(parsed.data.challenge, userId, 'registration')
    if (!challengeResult.valid) {
      if (challengeResult.reason !== 'expired') {
        logger.warn('Registration challenge rejected', { userId, reason: challengeResult.reason })
      }
      const message =
        challengeResult.reason === 'expired'
          ? 'Challenge expired. Please try again.'
          : 'Invalid or expired challenge'
      return c.json({ error: message }, 403)
    }

    const { rpId, origin } = getRpConfig(c.req.header('origin'))

    // Verify the registration response using @simplewebauthn/server
    let verification
    try {
      verification = await verifyRegistrationResponse({
        response: {
          id: parsed.data.id,
          rawId: parsed.data.rawId,
          type: parsed.data.type,
          response: parsed.data.response,
          clientExtensionResults: {},
          authenticatorAttachment: parsed.data.authenticatorAttachment ?? 'platform',
        },
        expectedChallenge: parsed.data.challenge,
        expectedOrigin: origin,
        expectedRPID: rpId,
      })
    } catch (verifyErr) {
      logger.warn('Registration attestation verification failed', { userId, error: verifyErr })
      return c.json({ error: 'Registration verification failed' }, 403)
    }

    if (!verification.verified || !verification.registrationInfo) {
      return c.json({ error: 'Registration verification failed' }, 403)
    }

    const { credential } = verification.registrationInfo

    // Store the verified credential
    await userService.addUserCredential(userId, {
      id: parsed.data.id,
      publicKey: Buffer.from(credential.publicKey).toString('base64url'),
      transports: parsed.data.transports,
      counter: credential.counter,
      createdAt: new Date().toISOString(),
      lastUsed: new Date().toISOString(),
      name: parsed.data.name,
      type: parsed.data.authenticatorAttachment === 'platform' ? 'platform' : 'cross-platform',
    })

    return c.json({ success: true })
  } catch (err) {
    logger.error('Error registering credential', { error: err })
    return c.json({ error: 'Failed to register credential' }, 500)
  }
})

// --- Token endpoint (secured with WebAuthn assertion verification) ---

const tokenRequestSchema = z.object({
  credentialId: z.string().min(1),
  authenticatorData: z.string().min(1),
  clientDataJSON: z.string().min(1),
  signature: z.string().min(1),
  challenge: z.string().min(1),
})

publicAuthRoutes.post('/users/:id/token', async c => {
  if (!userService) {
    return c.json({ error: 'User service unavailable' }, 503)
  }

  try {
    const userId = c.req.param('id')

    const user = await userService.getUserById(userId)
    if (!user) {
      return c.json({ error: 'User not found' }, 404)
    }

    let body: unknown
    try {
      body = await c.req.json()
    } catch {
      return c.json({ error: 'Assertion data required' }, 400)
    }

    const parsed = tokenRequestSchema.safeParse(body)
    if (!parsed.success) {
      return c.json({ error: 'Invalid assertion data', details: parsed.error.issues }, 400)
    }

    // Validate the challenge was issued by us and is single-use
    const challengeResult = consumeChallenge(parsed.data.challenge, userId, 'authentication')
    if (!challengeResult.valid) {
      if (challengeResult.reason !== 'expired') {
        logger.warn('Authentication challenge rejected', { userId, reason: challengeResult.reason })
      }
      const message =
        challengeResult.reason === 'expired'
          ? 'Challenge expired. Please try again.'
          : 'Invalid or expired challenge'
      return c.json({ error: message }, 403)
    }

    // Look up the credential's public key from the database
    const credentials = await userService.getUserCredentials(userId)
    const credential = credentials.find(c => c.id === parsed.data.credentialId)
    if (!credential) {
      return c.json({ error: 'Credential not found' }, 404)
    }

    const { rpId, origin } = getRpConfig(c.req.header('origin'))

    // Verify the authentication response
    let verification
    try {
      verification = await verifyAuthenticationResponse({
        response: {
          id: parsed.data.credentialId,
          rawId: parsed.data.credentialId,
          type: 'public-key',
          response: {
            authenticatorData: parsed.data.authenticatorData,
            clientDataJSON: parsed.data.clientDataJSON,
            signature: parsed.data.signature,
          },
          clientExtensionResults: {},
          authenticatorAttachment: credential.type,
        },
        expectedChallenge: parsed.data.challenge,
        expectedOrigin: origin,
        expectedRPID: rpId,
        credential: {
          id: credential.id,
          publicKey: Uint8Array.from(Buffer.from(credential.publicKey, 'base64url')),
          counter: credential.counter,
          transports: credential.transports as AuthenticatorTransportFuture[],
        },
      })
    } catch (verifyErr) {
      logger.warn('Authentication assertion verification failed', { userId, error: verifyErr })
      return c.json({ error: 'Authentication verification failed' }, 403)
    }

    if (!verification.verified) {
      return c.json({ error: 'Authentication verification failed' }, 403)
    }

    // Update counter for replay protection
    const { authenticationInfo } = verification
    await userService.updateUserCredential(userId, credential.id, {
      counter: authenticationInfo.newCounter,
      lastUsed: new Date().toISOString(),
    })

    // Issue access + refresh token pair
    const platformUser = {
      id: user.id,
      username: user.username,
      email: user.email,
      firstName: user.firstName,
      lastName: user.lastName,
      isAdmin: user.roles.includes('ADMIN'),
    }

    const { accessToken, refreshToken } = await issueTokenPair(platformUser)

    return c.json({
      success: true,
      token: accessToken,
      refreshToken,
      platformId: 'urn:uuid:a504d862-bd64-4e0d-acff-db7955955bc1',
    })
  } catch (err) {
    logger.error('Error generating token', { error: err })
    return c.json({ error: 'Failed to generate token' }, 500)
  }
})

// --- Refresh token endpoint ---

const refreshRequestSchema = z.object({
  refreshToken: z.string().min(1),
})

publicAuthRoutes.post('/refresh', async c => {
  const clientIP = c.req.header('x-forwarded-for') || c.req.header('x-real-ip') || 'unknown'
  if (!checkRateLimit(clientIP)) {
    return c.json({ error: 'Too many requests. Please try again later.' }, 429)
  }

  try {
    let body: unknown
    try {
      body = await c.req.json()
    } catch {
      return c.json({ error: 'Invalid JSON body' }, 400)
    }

    const parsed = refreshRequestSchema.safeParse(body)
    if (!parsed.success) {
      return c.json({ error: 'Refresh token required' }, 400)
    }

    const result = await rotateRefreshToken(parsed.data.refreshToken)
    if (!result) {
      return c.json({ error: 'Invalid or expired refresh token' }, 401)
    }

    return c.json({
      success: true,
      token: result.accessToken,
      refreshToken: result.refreshToken,
    })
  } catch (err) {
    logger.error('Error refreshing token', { error: err })
    return c.json({ error: 'Failed to refresh token' }, 500)
  }
})

// --- Logout endpoint (revoke refresh token) ---

publicAuthRoutes.post('/logout', async c => {
  try {
    let body: unknown
    try {
      body = await c.req.json()
    } catch {
      return c.json({ success: true })
    }

    const parsed = z.object({ refreshToken: z.string().optional() }).safeParse(body)
    if (parsed.success && parsed.data.refreshToken) {
      await revokeRefreshToken(parsed.data.refreshToken)
    }

    return c.json({ success: true })
  } catch (err) {
    logger.error('Error during logout', { error: err })
    return c.json({ success: true })
  }
})

export { publicAuthRoutes }
