import { Hono } from 'hono'
import { z } from 'zod'
import { verifyAuthenticationResponse, verifyRegistrationResponse } from '@simplewebauthn/server'
import type { AuthenticatorTransportFuture } from '@simplewebauthn/server'
import { userService } from '../services/user'
import { jwtService } from '../services/jwt'
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

// RP configuration — derive from environment or fall back to sensible defaults
function getRpConfig() {
  const rpId = process.env.WEBAUTHN_RP_ID || 'localhost'
  const origin = process.env.WEBAUTHN_ORIGIN || `http://${rpId}:7777`
  return { rpId, origin }
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
  if (!userService) {
    return c.json({ error: 'User service unavailable' }, 503)
  }

  const userId = c.req.param('id')
  const user = await userService.getUserById(userId)
  if (!user) {
    return c.json({ error: 'User not found' }, 404)
  }

  const { rpId } = getRpConfig()
  const challenge = generateChallenge(userId, 'authentication')

  return c.json({ challenge, rpId, timeout: 60000 })
})

// Generate a challenge for WebAuthn registration
publicAuthRoutes.get('/users/:id/challenge/registration', async c => {
  if (!userService) {
    return c.json({ error: 'User service unavailable' }, 503)
  }

  const userId = c.req.param('id')
  const user = await userService.getUserById(userId)
  if (!user) {
    return c.json({ error: 'User not found' }, 404)
  }

  const { rpId } = getRpConfig()
  const challenge = generateChallenge(userId, 'registration')

  return c.json({ challenge, rpId, timeout: 60000 })
})

// --- Credential registration (secured with server challenge) ---

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
    if (!consumeChallenge(parsed.data.challenge, userId, 'registration')) {
      return c.json({ error: 'Invalid or expired challenge' }, 403)
    }

    const { rpId, origin } = getRpConfig()

    // Verify the registration response using @simplewebauthn/server
    const verification = await verifyRegistrationResponse({
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

// Public endpoint to update credential last used time (for WebAuthn authentication)
publicAuthRoutes.patch('/users/:userId/credentials/:credentialId', async c => {
  if (!userService) {
    return c.json({ error: 'User service unavailable' }, 503)
  }

  try {
    const userId = c.req.param('userId')
    const credentialId = c.req.param('credentialId')

    // Verify user exists
    const user = await userService.getUserById(userId)
    if (!user) {
      return c.json({ error: 'User not found' }, 404)
    }

    let body: unknown
    try {
      body = await c.req.json()
    } catch {
      return c.json({ error: 'Invalid JSON body' }, 400)
    }

    const updateSchema = z.object({
      lastUsed: z.string(),
    })

    const parsed = updateSchema.safeParse(body)
    if (!parsed.success) {
      return c.json({ error: 'Invalid update data' }, 400)
    }

    // Update credential last used time
    await userService.updateUserCredential(userId, credentialId, { lastUsed: parsed.data.lastUsed })
    return c.json({ success: true })
  } catch (err) {
    logger.error('Error updating credential', { error: err })
    return c.json({ error: 'Failed to update credential' }, 500)
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
    if (!consumeChallenge(parsed.data.challenge, userId, 'authentication')) {
      return c.json({ error: 'Invalid or expired challenge' }, 403)
    }

    // Look up the credential's public key from the database
    const credentials = await userService.getUserCredentials(userId)
    const credential = credentials.find(c => c.id === parsed.data.credentialId)
    if (!credential) {
      return c.json({ error: 'Credential not found' }, 404)
    }

    const { rpId, origin } = getRpConfig()

    // Verify the authentication response
    const verification = await verifyAuthenticationResponse({
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

    if (!verification.verified) {
      return c.json({ error: 'Authentication verification failed' }, 403)
    }

    // Update counter for replay protection
    const { authenticationInfo } = verification
    await userService.updateUserCredential(userId, credential.id, {
      counter: authenticationInfo.newCounter,
      lastUsed: new Date().toISOString(),
    })

    // Generate JWT token
    const platformUser = {
      id: user.id,
      username: user.username,
      email: user.email,
      firstName: user.firstName,
      lastName: user.lastName,
      isAdmin: user.roles.includes('ADMIN'),
    }

    const token = jwtService.generatePlatformToken(platformUser)

    return c.json({
      success: true,
      token,
      platformId: 'urn:uuid:a504d862-bd64-4e0d-acff-db7955955bc1',
    })
  } catch (err) {
    logger.error('Error generating token', { error: err })
    return c.json({ error: 'Failed to generate token' }, 500)
  }
})

export { publicAuthRoutes }
