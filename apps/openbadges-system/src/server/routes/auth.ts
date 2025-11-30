import { Hono } from 'hono'
import { jwtService } from '../services/jwt'
import { userService } from '../services/user'
import { userSyncService } from '../services/userSync'
import { z } from 'zod'
import { requireAuth, requireSelfOrAdminFromParam, requireAdmin } from '../middleware/auth'
import { logger } from '../utils/logger'

const authRoutes = new Hono()

// Validate current JWT (Authorization: Bearer <token>)
authRoutes.get('/validate', async c => {
  try {
    const authHeader = c.req.header('Authorization')
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return c.json({ success: false, error: 'Missing token' }, 401)
    }

    const token = authHeader.slice('Bearer '.length)
    const payload = jwtService.verifyToken(token)

    if (!payload) {
      return c.json({ success: false, error: 'Invalid token' }, 401)
    }

    return c.json({ success: true, payload })
  } catch (error) {
    logger.error('Token validation failed', { error })
    return c.json({ success: false, error: 'Validation error' }, 500)
  }
})

const platformTokenSchema = z.object({
  user: z.object({
    id: z.string().min(1),
    email: z.string().email(),
    username: z.string().min(1).optional(),
    firstName: z.string().min(1).optional(),
    lastName: z.string().min(1).optional(),
    isAdmin: z.boolean().optional(),
  }),
})

// Generate platform token for OpenBadges API
authRoutes.post('/platform-token', requireAdmin, async c => {
  try {
    let body: unknown
    try {
      body = await c.req.json()
    } catch {
      return c.json({ error: 'Invalid JSON body' }, 400)
    }
    const parsed = platformTokenSchema.safeParse(body)
    if (!parsed.success) {
      return c.json({ error: 'Invalid user data' }, 400)
    }
    const { user } = parsed.data
    const platformUser = {
      id: user.id,
      email: user.email,
      username: user.username ?? '',
      firstName: user.firstName ?? '',
      lastName: user.lastName ?? '',
      isAdmin: user.isAdmin ?? false,
    }

    const apiClient = jwtService.createOpenBadgesApiClient(platformUser)

    return c.json({
      success: true,
      token: apiClient.token,
      platformId: 'urn:uuid:a504d862-bd64-4e0d-acff-db7955955bc1',
    })
  } catch (error) {
    logger.error('Platform token generation failed', { error })
    return c.json({ error: 'Failed to generate platform token' }, 500)
  }
})

const oauthTokenSchema = z.object({ userId: z.string().min(1) })

// Get OAuth access token for badge server
authRoutes.post('/oauth-token', requireAuth, async c => {
  try {
    let body: unknown
    try {
      body = await c.req.json()
    } catch {
      return c.json({ error: 'Invalid JSON body' }, 400)
    }
    const parsed = oauthTokenSchema.safeParse(body)
    if (!parsed.success) {
      return c.json({ error: 'User ID is required' }, 400)
    }
    const { userId } = parsed.data

    // Get user's OAuth providers
    const oauthProviders = await userService?.getOAuthProvidersByUser(userId)

    if (!oauthProviders || oauthProviders.length === 0) {
      return c.json({ error: 'No OAuth providers found for user' }, 404)
    }

    // For now, use the first available provider (typically GitHub)
    const provider = oauthProviders[0]
    if (!provider) {
      return c.json({ error: 'No OAuth provider available' }, 404)
    }

    // Check if token is still valid (not expired)
    if (provider.token_expires_at && new Date(provider.token_expires_at) <= new Date()) {
      return c.json({ error: 'OAuth token expired' }, 401)
    }

    return c.json({
      success: true,
      access_token: provider.access_token,
      provider: provider.provider,
      expires_at: provider.token_expires_at,
    })
  } catch (error) {
    logger.error('OAuth token retrieval failed', { error })
    return c.json({ error: 'Failed to get OAuth token' }, 500)
  }
})

// Refresh OAuth access token
authRoutes.post('/oauth-token/refresh', requireAuth, async c => {
  try {
    let body: unknown
    try {
      body = await c.req.json()
    } catch {
      return c.json({ error: 'Invalid JSON body' }, 400)
    }
    const parsed = oauthTokenSchema.safeParse(body)
    if (!parsed.success) {
      return c.json({ error: 'User ID is required' }, 400)
    }
    const { userId } = parsed.data

    // Get user's OAuth providers
    const oauthProviders = await userService?.getOAuthProvidersByUser(userId)

    if (!oauthProviders || oauthProviders.length === 0) {
      return c.json({ error: 'No OAuth providers found for user' }, 404)
    }

    // For now, use the first available provider (typically GitHub)
    const provider = oauthProviders[0]
    if (!provider) {
      return c.json({ error: 'No OAuth provider available' }, 404)
    }

    if (!provider.refresh_token) {
      return c.json({ error: 'No refresh token available' }, 400)
    }

    // Refresh the token with the OAuth provider
    // Note: GitHub doesn't provide refresh tokens, so this is more relevant for other providers
    // For GitHub, users would need to re-authenticate if token expires
    if (provider.provider === 'github') {
      return c.json({ error: 'GitHub tokens cannot be refreshed. Please re-authenticate.' }, 400)
    }

    // For other providers, implement token refresh logic here
    return c.json({ error: 'Token refresh not implemented for this provider' }, 501)
  } catch (error) {
    logger.error('OAuth token refresh failed', { error })
    return c.json({ error: 'Failed to refresh OAuth token' }, 500)
  }
})

const syncUserSchema = z.object({ userId: z.string().min(1) })

// Sync user data with badge server
authRoutes.post('/sync-user', requireAuth, async c => {
  try {
    let body: unknown
    try {
      body = await c.req.json()
    } catch {
      return c.json({ error: 'Invalid JSON body' }, 400)
    }
    const parsed = syncUserSchema.safeParse(body)
    if (!parsed.success) {
      return c.json({ error: 'User ID is required' }, 400)
    }
    const { userId } = parsed.data

    // Get user from local database
    const user = await userService?.getUserById(userId)
    if (!user) {
      return c.json({ error: 'User not found' }, 404)
    }

    // Sync user with badge server
    const syncResult = await userSyncService.syncUser(user)

    if (syncResult.success) {
      return c.json({
        success: true,
        user: syncResult.user,
        created: syncResult.created,
        updated: syncResult.updated,
      })
    } else {
      return c.json(
        {
          success: false,
          error: syncResult.error,
        },
        500
      )
    }
  } catch (error) {
    logger.error('User sync failed', { error })
    return c.json({ error: 'Failed to sync user' }, 500)
  }
})

// Get badge server user profile
authRoutes.get(
  '/badge-server-profile/:userId',
  requireAuth,
  requireSelfOrAdminFromParam('userId'),
  async c => {
    try {
      const userId = c.req.param('userId')

      if (!userId) {
        return c.json({ error: 'User ID is required' }, 400)
      }

      const profile = await userSyncService.getBadgeServerUserProfile(userId)

      if (profile) {
        return c.json({
          success: true,
          profile,
        })
      } else {
        return c.json(
          {
            success: false,
            error: 'Profile not found',
          },
          404
        )
      }
    } catch (error) {
      logger.error('Failed to get badge server profile', { error, userId: c.req.param('userId') })
      return c.json({ error: 'Failed to get profile' }, 500)
    }
  }
)

export { authRoutes }
