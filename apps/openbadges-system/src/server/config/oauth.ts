export interface OAuthConfig {
  enabled: boolean
  providers: {
    github: {
      enabled: boolean
      clientId: string
      clientSecret: string
      callbackUrl: string
      scope: string[]
    }
  }
  session: {
    secret: string
    maxAge: number
  }
}

export const oauthConfig: OAuthConfig = {
  enabled: process.env.OAUTH_ENABLED !== 'false',
  providers: {
    github: {
      enabled: process.env.OAUTH_GITHUB_ENABLED !== 'false',
      clientId: process.env.OAUTH_GITHUB_CLIENT_ID || '',
      clientSecret: process.env.OAUTH_GITHUB_CLIENT_SECRET || '',
      callbackUrl:
        process.env.OAUTH_GITHUB_CALLBACK_URL || 'http://localhost:8888/api/oauth/github/callback',
      scope: ['user:email', 'read:user'],
    },
  },
  session: {
    secret: process.env.OAUTH_SESSION_SECRET || 'change-in-production',
    maxAge: 24 * 60 * 60 * 1000, // 24 hours
  },
}

// Validate OAuth configuration
export function validateOAuthConfig(): void {
  if (!oauthConfig.enabled) {
    return
  }

  const errors: string[] = []

  // Validate GitHub configuration
  if (oauthConfig.providers.github.enabled) {
    if (!oauthConfig.providers.github.clientId) {
      errors.push('OAUTH_GITHUB_CLIENT_ID is required when GitHub OAuth is enabled')
    }
    if (!oauthConfig.providers.github.clientSecret) {
      errors.push('OAUTH_GITHUB_CLIENT_SECRET is required when GitHub OAuth is enabled')
    }
  }

  // Validate session configuration
  if (
    oauthConfig.session.secret === 'change-in-production' &&
    process.env.NODE_ENV === 'production'
  ) {
    errors.push('OAUTH_SESSION_SECRET must be set in production')
  }

  if (errors.length > 0) {
    throw new Error(`OAuth configuration errors:\n${errors.join('\n')}`)
  }
}

// Get OAuth provider configuration
export function getOAuthProviderConfig(provider: string) {
  switch (provider) {
    case 'github':
      return oauthConfig.providers.github
    default:
      throw new Error(`Unknown OAuth provider: ${provider}`)
  }
}
