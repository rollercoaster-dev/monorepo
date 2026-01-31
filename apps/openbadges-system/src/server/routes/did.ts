import { Hono } from 'hono'
import { z } from 'zod'
import { didService } from '../services/did'
import { userService } from '../services/user'
import {
  requireAuth,
  requireSelfOrAdminFromParam,
  getAuthPayload,
  type AuthPayload,
} from '../middleware/auth'
import { logger } from '../utils/logger'

const didRoutes = new Hono<{ Variables: { authPayload: AuthPayload } }>()

// Schemas
const generateDIDSchema = z.object({
  method: z.enum(['key', 'web']),
  domain: z.string().optional(),
})

// POST /api/did/generate - Generate DID for current user (requires auth)
didRoutes.post('/generate', requireAuth, async c => {
  if (!userService) {
    return c.json({ error: 'User service unavailable' }, 503)
  }

  try {
    // Get authenticated user from JWT payload
    const payload = getAuthPayload(c)
    if (!payload) {
      return c.json({ error: 'Unauthorized' }, 401)
    }

    // Parse and validate request body
    let body: unknown
    try {
      body = await c.req.json()
    } catch {
      return c.json({ error: 'Invalid JSON body' }, 400)
    }

    const parsed = generateDIDSchema.safeParse(body)
    if (!parsed.success) {
      return c.json({ error: 'Invalid request data', details: parsed.error }, 400)
    }

    const { method, domain } = parsed.data

    // Validate domain for did:web
    if (method === 'web' && !domain) {
      return c.json({ error: 'Domain is required for did:web method' }, 400)
    }

    // Generate DID data
    const didData = await didService.generateUserDID(payload.sub, method, domain)

    // Store DID data in user record
    await userService.updateUserDID(payload.sub, {
      did: didData.did,
      didMethod: didData.didMethod,
      publicKey: didData.publicKey,
      privateKey: didData.privateKey,
      didDocument: JSON.stringify(didData.didDocument),
    })

    // Return DID and DID Document (without private key)
    return c.json({
      did: didData.did,
      didDocument: didData.didDocument,
    })
  } catch (err) {
    logger.error('Error generating DID', { error: err })
    return c.json({ error: 'Failed to generate DID' }, 500)
  }
})

// GET /api/did - Get current user's DID (requires auth)
didRoutes.get('/', requireAuth, async c => {
  if (!userService) {
    return c.json({ error: 'User service unavailable' }, 503)
  }

  try {
    // Get authenticated user from JWT payload
    const payload = getAuthPayload(c)
    if (!payload) {
      return c.json({ error: 'Unauthorized' }, 401)
    }

    const userRecord = await userService.getUserById(payload.sub)
    if (!userRecord) {
      return c.json({ error: 'User not found' }, 404)
    }

    if (!userRecord.did) {
      return c.json({ error: 'User does not have a DID' }, 404)
    }

    // Parse DID Document from stored JSON
    const didDocument = userRecord.didDocument ? JSON.parse(userRecord.didDocument) : null

    return c.json({
      did: userRecord.did,
      didMethod: userRecord.didMethod,
      didDocument,
    })
  } catch (err) {
    logger.error('Error fetching user DID', { error: err })
    return c.json({ error: 'Failed to fetch DID' }, 500)
  }
})

// GET /api/users/:id/did - Get public DID info for any user (no private keys)
didRoutes.get('/users/:id/did', requireSelfOrAdminFromParam('id'), async c => {
  if (!userService) {
    return c.json({ error: 'User service unavailable' }, 503)
  }

  try {
    const userId = c.req.param('id')
    const userRecord = await userService.getUserById(userId)

    if (!userRecord) {
      return c.json({ error: 'User not found' }, 404)
    }

    if (!userRecord.did) {
      return c.json({ error: 'User does not have a DID' }, 404)
    }

    // Parse DID Document from stored JSON
    const didDocument = userRecord.didDocument ? JSON.parse(userRecord.didDocument) : null

    // Return only public DID information (no private keys)
    return c.json({
      did: userRecord.did,
      didDocument,
    })
  } catch (err) {
    logger.error('Error fetching user DID', { error: err })
    return c.json({ error: 'Failed to fetch DID' }, 500)
  }
})

// GET /.well-known/did.json - Serve DID Document for did:web resolution (public endpoint)
// This must be mounted at the root level in the main server file
// Example: app.get('/.well-known/did.json', ...)
// Query param: ?userId=<id> to specify which user's DID to resolve

export { didRoutes }
