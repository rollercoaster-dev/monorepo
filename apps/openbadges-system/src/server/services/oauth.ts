import { nanoid } from 'nanoid'
import { URLSearchParams } from 'url'
import { webcrypto } from 'crypto'
import { TextEncoder } from 'util'
import type { User, OAuthProvider, OAuthSession } from './user';
import { userService } from './user'
import { oauthConfig } from '../config/oauth'

export interface OAuthProviderConfig {
  github?: {
    clientId: string
    clientSecret: string
    redirectUri: string
    scope: string[]
  }
}

export interface OAuthUserProfile {
  id: string
  login: string
  email: string
  name: string
  avatar_url?: string
}

export interface OAuthTokens {
  access_token: string
  refresh_token?: string
  expires_in?: number
}

export class OAuthService {
  private config: OAuthProviderConfig

  constructor(config: OAuthProviderConfig) {
    this.config = config
  }

  // Generate secure state parameter for OAuth flow
  generateState(): string {
    return nanoid(32)
  }

  // Generate code verifier for PKCE
  generateCodeVerifier(): string {
    return nanoid(128)
  }

  // Create code challenge from verifier
  async createCodeChallenge(verifier: string): Promise<string> {
    const data = new TextEncoder().encode(verifier)
    const digest = await webcrypto.subtle.digest('SHA-256', data)
    // Convert to base64 then transform to URL-safe base64 without padding
    const base64 = Buffer.from(digest).toString('base64')
    return base64.replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '')
  }

  // Create OAuth session
  async createOAuthSession(
    provider: string,
    redirectUri: string,
    codeVerifier?: string
  ): Promise<{ state: string; session: OAuthSession }> {
    if (!userService) {
      throw new Error('User service not available')
    }

    const state = this.generateState()
    const expiresAt = new Date(Date.now() + 10 * 60 * 1000) // 10 minutes

    const session = await userService.createOAuthSession({
      state,
      code_verifier: codeVerifier,
      redirect_uri: redirectUri,
      provider,
      expires_at: expiresAt.toISOString(),
    })

    return { state, session }
  }

  // Get OAuth session
  async getOAuthSession(state: string): Promise<OAuthSession | null> {
    if (!userService) {
      throw new Error('User service not available')
    }

    const session = await userService.getOAuthSession(state)

    // Check if session has expired
    if (session && new Date(session.expires_at) < new Date()) {
      await userService.removeOAuthSession(state)
      return null
    }

    return session
  }

  // Remove OAuth session
  async removeOAuthSession(state: string): Promise<void> {
    if (!userService) {
      throw new Error('User service not available')
    }

    await userService.removeOAuthSession(state)
  }

  // Get GitHub authorization URL
  getGitHubAuthUrl(state: string, codeChallenge?: string): string {
    const config = this.config.github
    if (!config) {
      throw new Error('GitHub OAuth not configured')
    }

    const params = new URLSearchParams({
      client_id: config.clientId,
      redirect_uri: config.redirectUri,
      scope: config.scope.join(' '),
      state,
      response_type: 'code',
    })

    if (codeChallenge) {
      params.append('code_challenge', codeChallenge)
      params.append('code_challenge_method', 'S256')
    }

    return `https://github.com/login/oauth/authorize?${params.toString()}`
  }

  // Exchange authorization code for access token
  async exchangeCodeForToken(
    provider: string,
    code: string,
    codeVerifier?: string
  ): Promise<OAuthTokens> {
    switch (provider) {
      case 'github':
        return this.exchangeGitHubCode(code, codeVerifier)
      default:
        throw new Error(`Unsupported OAuth provider: ${provider}`)
    }
  }

  // Exchange GitHub authorization code for access token
  private async exchangeGitHubCode(code: string, codeVerifier?: string): Promise<OAuthTokens> {
    const config = this.config.github
    if (!config) {
      throw new Error('GitHub OAuth not configured')
    }

    const params = new URLSearchParams({
      client_id: config.clientId,
      client_secret: config.clientSecret,
      code,
      redirect_uri: config.redirectUri,
    })

    if (codeVerifier) {
      params.append('code_verifier', codeVerifier)
    }

    const response = await fetch('https://github.com/login/oauth/access_token', {
      method: 'POST',
      headers: {
        Accept: 'application/json',
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: params.toString(),
    })

    if (!response.ok) {
      throw new Error(`GitHub token exchange failed: ${response.status}`)
    }

    const data = await response.json()

    if (data.error) {
      throw new Error(`GitHub OAuth error: ${data.error_description || data.error}`)
    }

    return {
      access_token: data.access_token,
      refresh_token: data.refresh_token,
      expires_in: data.expires_in,
    }
  }

  // Get user profile from OAuth provider
  async getUserProfile(provider: string, accessToken: string): Promise<OAuthUserProfile> {
    switch (provider) {
      case 'github':
        return this.getGitHubUserProfile(accessToken)
      default:
        throw new Error(`Unsupported OAuth provider: ${provider}`)
    }
  }

  // Get GitHub user profile
  private async getGitHubUserProfile(accessToken: string): Promise<OAuthUserProfile> {
    const response = await fetch('https://api.github.com/user', {
      headers: {
        Authorization: `Bearer ${accessToken}`,
        Accept: 'application/vnd.github.v3+json',
        'User-Agent': 'OpenBadges-System',
      },
    })

    if (!response.ok) {
      throw new Error(`GitHub API error: ${response.status}`)
    }

    const profile = await response.json()

    // Get user's primary email if not public
    let email = profile.email
    if (!email) {
      const emailResponse = await fetch('https://api.github.com/user/emails', {
        headers: {
          Authorization: `Bearer ${accessToken}`,
          Accept: 'application/vnd.github.v3+json',
          'User-Agent': 'OpenBadges-System',
        },
      })

      if (emailResponse.ok) {
        const emails = await emailResponse.json()
        const primaryEmail = emails.find((e: { primary: boolean; email: string }) => e.primary)
        email = primaryEmail?.email || emails[0]?.email
      }
    }

    // Fallback for missing GitHub email
    if (!email) {
      // Use GitHub's noreply pattern as fallback
      const id = profile.id?.toString() ?? nanoid(8)
      const username = profile.login
      email = `${id}+${username}@users.noreply.github.com`
    }

    return {
      id: profile.id.toString(),
      login: profile.login,
      email,
      name: profile.name || profile.login,
      avatar_url: profile.avatar_url,
    }
  }

  // Link OAuth provider to existing user
  async linkOAuthProvider(
    userId: string,
    provider: string,
    providerUserId: string,
    tokens: OAuthTokens,
    profile: OAuthUserProfile
  ): Promise<OAuthProvider> {
    if (!userService) {
      throw new Error('User service not available')
    }

    const expiresAt = tokens.expires_in
      ? new Date(Date.now() + tokens.expires_in * 1000).toISOString()
      : undefined

    return await userService.createOAuthProvider({
      user_id: userId,
      provider,
      provider_user_id: providerUserId,
      access_token: tokens.access_token,
      refresh_token: tokens.refresh_token,
      token_expires_at: expiresAt,
      profile_data: JSON.stringify(profile),
    })
  }

  // Create user from OAuth profile
  async createUserFromOAuth(
    provider: string,
    providerUserId: string,
    tokens: OAuthTokens,
    profile: OAuthUserProfile
  ): Promise<{ user: User; oauthProvider: OAuthProvider }> {
    if (!userService) {
      throw new Error('User service not available')
    }

    // Create user
    const user = await userService.createUser({
      username: profile.login,
      email: profile.email,
      firstName: profile.name.split(' ')[0] || profile.login,
      lastName: profile.name.split(' ').slice(1).join(' ') || '',
      avatar: profile.avatar_url,
      isActive: true,
      roles: ['USER'],
    })

    // Link OAuth provider
    const oauthProvider = await this.linkOAuthProvider(
      user.id,
      provider,
      providerUserId,
      tokens,
      profile
    )

    return { user, oauthProvider }
  }

  // Find user by OAuth provider
  async findUserByOAuthProvider(provider: string, providerUserId: string): Promise<User | null> {
    if (!userService) {
      throw new Error('User service not available')
    }

    const oauthProvider = await userService.getOAuthProviderByProviderId(provider, providerUserId)
    if (!oauthProvider) {
      return null
    }

    return await userService.getUserById(oauthProvider.user_id)
  }

  // Clean up expired sessions
  async cleanupExpiredSessions(): Promise<void> {
    if (!userService) {
      throw new Error('User service not available')
    }

    await userService.cleanupExpiredOAuthSessions()
  }
}

// Create OAuth service instance
export const oauthService = new OAuthService({
  github: oauthConfig.providers.github.enabled
    ? {
        clientId: oauthConfig.providers.github.clientId,
        clientSecret: oauthConfig.providers.github.clientSecret,
        redirectUri: oauthConfig.providers.github.callbackUrl,
        scope: oauthConfig.providers.github.scope,
      }
    : undefined,
})
