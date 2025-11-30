import { Hono } from 'hono'
import { getCurrentRequestId } from '@rollercoaster-dev/rd-logger'
import { oauthService } from '../services/oauth'
import { userService } from '../services/user'
import { userSyncService } from '../services/userSync'
import { jwtService } from '../services/jwt'
import { logger } from '../utils/logger'

const oauthRoutes = new Hono()

// Get available OAuth providers
oauthRoutes.get('/providers', async c => {
  try {
    const providers = ['github'] // Add more providers as they are implemented

    return c.json({
      success: true,
      providers,
    })
  } catch (error) {
    logger.logError('Failed to get OAuth providers', error as Error, {
      requestId: getCurrentRequestId(),
    })
    return c.json(
      {
        success: false,
        error: 'Failed to get OAuth providers',
      },
      500
    )
  }
})

// Initialize GitHub OAuth flow
oauthRoutes.get('/github', async c => {
  try {
    const redirectUri = c.req.query('redirect_uri') || '/'

    // Create OAuth session with PKCE
    const codeVerifier = oauthService.generateCodeVerifier()
    const codeChallenge = await oauthService.createCodeChallenge(codeVerifier)

    const { state } = await oauthService.createOAuthSession('github', redirectUri, codeVerifier)

    // Get GitHub authorization URL
    const authUrl = oauthService.getGitHubAuthUrl(state, codeChallenge)

    return c.json({
      success: true,
      authUrl,
      state,
    })
  } catch (error) {
    logger.logError('GitHub OAuth initialization failed', error as Error, {
      requestId: getCurrentRequestId(),
    })
    return c.json(
      {
        success: false,
        error: 'Failed to initialize GitHub OAuth',
      },
      500
    )
  }
})

// Handle GitHub OAuth callback
oauthRoutes.get('/github/callback', async c => {
  try {
    const code = c.req.query('code')
    const state = c.req.query('state')
    const error = c.req.query('error')

    if (error) {
      logger.warn('GitHub OAuth error from provider', {
        error,
        requestId: getCurrentRequestId(),
      })
      return c.json(
        {
          success: false,
          error: `GitHub OAuth error: ${error}`,
        },
        400
      )
    }

    if (!code || !state) {
      return c.json(
        {
          success: false,
          error: 'Missing code or state parameter',
        },
        400
      )
    }

    // Verify OAuth session
    const session = await oauthService.getOAuthSession(state)
    if (!session) {
      return c.json(
        {
          success: false,
          error: 'Invalid or expired OAuth session',
        },
        400
      )
    }

    // Exchange code for access token
    const tokens = await oauthService.exchangeCodeForToken('github', code, session.code_verifier)

    // Get user profile from GitHub
    const profile = await oauthService.getUserProfile('github', tokens.access_token)

    // Check if user already exists with this GitHub account
    let user = await oauthService.findUserByOAuthProvider('github', profile.id)
    if (user) {
      // User exists, update OAuth provider tokens
      const existingProvider = await userService?.getOAuthProvider(user.id, 'github')
      if (existingProvider) {
        const expiresAt = tokens.expires_in
          ? new Date(Date.now() + tokens.expires_in * 1000).toISOString()
          : undefined

        await userService?.updateOAuthProvider(existingProvider.id, {
          access_token: tokens.access_token,
          refresh_token: tokens.refresh_token,
          token_expires_at: expiresAt,
          profile_data: JSON.stringify(profile),
        })
      }
    } else {
      // Check if user exists with same email
      user = (await userService?.getUserByEmail(profile.email)) || null

      if (user) {
        // Link OAuth provider to existing user
        await oauthService.linkOAuthProvider(user.id, 'github', profile.id, tokens, profile)
      } else {
        // Create new user from OAuth profile
        const result = await oauthService.createUserFromOAuth('github', profile.id, tokens, profile)
        user = result.user
        // OAuth provider is created within the service, no need to store reference
      }
    }

    // Clean up OAuth session
    await oauthService.removeOAuthSession(state)

    // Sync user with badge server
    try {
      const syncResult = await userSyncService.syncUser(user)
      if (syncResult.success) {
        logger.info('User synced with badge server', {
          userId: user.id,
          action: syncResult.created ? 'created' : 'updated',
        })
      } else {
        logger.warn('Failed to sync user with badge server', {
          userId: user.id,
          error: syncResult.error,
        })
      }
    } catch (syncError) {
      logger.logError('Error syncing user with badge server', syncError as Error, {
        userId: user.id,
        requestId: getCurrentRequestId(),
      })
    }

    // Generate JWT token for authentication
    const jwtToken = jwtService.generatePlatformToken({
      id: user.id,
      username: user.username,
      email: user.email,
      firstName: user.firstName,
      lastName: user.lastName,
      isAdmin: user.roles?.includes('ADMIN') || false,
    })

    // Check if this is an API request or browser redirect
    const acceptHeader = c.req.header('Accept')
    const isApiRequest = acceptHeader && acceptHeader.includes('application/json')

    if (isApiRequest) {
      // Return JSON response for API requests
      return c.json({
        success: true,
        user: {
          id: user.id,
          username: user.username,
          email: user.email,
          firstName: user.firstName,
          lastName: user.lastName,
          avatar: user.avatar,
          isAdmin: user.roles.includes('ADMIN'),
          roles: user.roles,
        },
        token: jwtToken,
        redirectUri: session.redirect_uri || '/',
      })
    } else {
      // Redirect to frontend callback page with authentication data
      const userData = {
        id: user.id,
        username: user.username,
        email: user.email,
        firstName: user.firstName,
        lastName: user.lastName,
        avatar: user.avatar,
        isAdmin: user.roles.includes('ADMIN'),
        roles: user.roles,
      }

      // Create a secure way to pass auth data to frontend
      // For now, we'll use URL params (in production, consider using encrypted cookies or session storage)
      const frontendUrl = process.env.VITE_PORT
        ? `http://localhost:${process.env.VITE_PORT}`
        : 'http://localhost:7777'
      const callbackUrl = new URL('/auth/oauth/callback', frontendUrl)
      callbackUrl.searchParams.set('success', 'true')
      callbackUrl.searchParams.set('token', jwtToken)
      callbackUrl.searchParams.set('user', encodeURIComponent(JSON.stringify(userData)))
      callbackUrl.searchParams.set('redirect_uri', session.redirect_uri || '/')

      return c.redirect(callbackUrl.toString())
    }
  } catch (error) {
    logger.logError('GitHub OAuth callback failed', error as Error, {
      requestId: getCurrentRequestId(),
    })

    // Provide more specific error messages for debugging
    let errorMessage = 'OAuth authentication failed'
    if (error instanceof Error) {
      if (error.message.includes('GitHub token exchange failed')) {
        errorMessage = 'GitHub token exchange failed - check client credentials'
      } else if (error.message.includes('GitHub API error')) {
        errorMessage = 'GitHub API error - check access token'
      } else if (error.message.includes('User service not available')) {
        errorMessage = 'User service not available'
      } else {
        errorMessage = `OAuth error: ${error.message}`
      }
    }

    return c.json(
      {
        success: false,
        error: errorMessage,
      },
      500
    )
  }
})

// Unlink OAuth provider
oauthRoutes.delete('/:provider', async c => {
  try {
    const provider = c.req.param('provider')
    const userId = c.req.query('user_id')

    if (!userId) {
      return c.json(
        {
          success: false,
          error: 'User ID required',
        },
        400
      )
    }

    // Remove OAuth provider
    await userService?.removeOAuthProvider(userId, provider)

    return c.json({
      success: true,
      message: `${provider} account unlinked successfully`,
    })
  } catch (error) {
    logger.logError('Failed to unlink OAuth provider', error as Error, {
      provider: c.req.param('provider'),
      requestId: getCurrentRequestId(),
    })
    return c.json(
      {
        success: false,
        error: 'Failed to unlink OAuth provider',
      },
      500
    )
  }
})

// Get user's linked OAuth providers
oauthRoutes.get('/user/:userId/providers', async c => {
  try {
    const userId = c.req.param('userId')

    if (!userService) {
      return c.json(
        {
          success: false,
          error: 'User service not available',
        },
        500
      )
    }

    // Get all OAuth providers for user
    const providers = []

    const githubProvider = await userService.getOAuthProvider(userId, 'github')
    if (githubProvider) {
      providers.push({
        provider: 'github',
        linked: true,
        profile: githubProvider.profile_data ? JSON.parse(githubProvider.profile_data) : null,
        linked_at: githubProvider.created_at,
      })
    }

    return c.json({
      success: true,
      providers,
    })
  } catch (error) {
    logger.logError('Failed to get user OAuth providers', error as Error, {
      userId: c.req.param('userId'),
      requestId: getCurrentRequestId(),
    })
    return c.json(
      {
        success: false,
        error: 'Failed to get OAuth providers',
      },
      500
    )
  }
})

// Clean up expired OAuth sessions (admin endpoint)
oauthRoutes.post('/cleanup', async c => {
  try {
    await oauthService.cleanupExpiredSessions()

    return c.json({
      success: true,
      message: 'Expired OAuth sessions cleaned up',
    })
  } catch (error) {
    logger.logError('Failed to cleanup OAuth sessions', error as Error, {
      requestId: getCurrentRequestId(),
    })
    return c.json(
      {
        success: false,
        error: 'Failed to cleanup OAuth sessions',
      },
      500
    )
  }
})

export { oauthRoutes }
