import { ref, computed } from 'vue'
import { useAuth } from './useAuth'

export interface OAuthProvider {
  name: string
  enabled: boolean
  displayName: string
}

export interface OAuthSession {
  state: string
  provider: string
  redirectUri: string
  authUrl: string
}

export interface OAuthUser {
  id: string
  username: string
  email: string
  firstName: string
  lastName: string
  avatar?: string
  isAdmin: boolean
  roles: string[]
}

export interface OAuthCallback {
  success: boolean
  user?: OAuthUser
  token?: string
  redirectUri?: string
  error?: string
}

export const useOAuth = () => {
  const { user: currentUser, token: currentToken } = useAuth()

  // State
  const isLoading = ref(false)
  const error = ref<string | null>(null)
  const availableProviders = ref<string[]>([])

  // Computed
  const hasOAuthProviders = computed(() => availableProviders.value.length > 0)

  // API call helper
  const apiCall = async (endpoint: string, options: RequestInit = {}) => {
    const response = await fetch(`/api/oauth${endpoint}`, {
      headers: {
        'Content-Type': 'application/json',
        ...(currentToken.value && { Authorization: `Bearer ${currentToken.value}` }),
        ...options.headers,
      },
      ...options,
    })

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({ error: 'Unknown error' }))
      throw new Error(errorData.error || `API call failed: ${response.status}`)
    }

    return response.json()
  }

  // Load available OAuth providers
  const loadProviders = async () => {
    try {
      const response = await apiCall('/providers')
      if (response.success) {
        availableProviders.value = response.providers || []
      }
    } catch (err) {
      console.error('Failed to load OAuth providers:', err)
      error.value = 'Failed to load OAuth providers'
    }
  }

  // Initiate OAuth flow
  const initiateOAuth = async (provider: string, redirectUri: string = '/') => {
    isLoading.value = true
    error.value = null

    try {
      const response = await apiCall(`/${provider}?redirect_uri=${encodeURIComponent(redirectUri)}`)

      if (response.success && response.authUrl) {
        // Redirect to OAuth provider
        window.location.href = response.authUrl
      } else {
        throw new Error('Failed to get OAuth authorization URL')
      }
    } catch (err) {
      console.error('OAuth initiation failed:', err)
      error.value = err instanceof Error ? err.message : 'OAuth initiation failed'
      throw err
    } finally {
      isLoading.value = false
    }
  }

  // Handle OAuth callback
  const handleOAuthCallback = async (code: string, state: string): Promise<OAuthCallback> => {
    isLoading.value = true
    error.value = null

    try {
      // The callback is typically handled by the backend route
      // This would be called if we need to process the callback on the frontend
      const response = await apiCall(`/github/callback?code=${code}&state=${state}`)

      if (response.success) {
        return {
          success: true,
          user: response.user,
          token: response.token,
          redirectUri: response.redirectUri,
        }
      } else {
        return {
          success: false,
          error: response.error || 'OAuth callback failed',
        }
      }
    } catch (err) {
      console.error('OAuth callback failed:', err)
      const errorMessage = err instanceof Error ? err.message : 'OAuth callback failed'
      error.value = errorMessage
      return {
        success: false,
        error: errorMessage,
      }
    } finally {
      isLoading.value = false
    }
  }

  // Get user's linked OAuth providers
  const getUserOAuthProviders = async (userId: string) => {
    try {
      const response = await apiCall(`/user/${userId}/providers`)
      return response.success ? response.providers : []
    } catch (err) {
      console.error('Failed to get user OAuth providers:', err)
      error.value = 'Failed to get OAuth providers'
      return []
    }
  }

  // Unlink OAuth provider
  const unlinkOAuthProvider = async (provider: string) => {
    if (!currentUser.value) {
      throw new Error('User not authenticated')
    }

    isLoading.value = true
    error.value = null

    try {
      const response = await apiCall(`/${provider}?user_id=${currentUser.value.id}`, {
        method: 'DELETE',
      })

      if (response.success) {
        return true
      } else {
        throw new Error(response.error || 'Failed to unlink OAuth provider')
      }
    } catch (err) {
      console.error('Failed to unlink OAuth provider:', err)
      error.value = err instanceof Error ? err.message : 'Failed to unlink OAuth provider'
      throw err
    } finally {
      isLoading.value = false
    }
  }

  // Link OAuth provider to existing account
  const linkOAuthProvider = async (provider: string, redirectUri: string = '/') => {
    if (!currentUser.value) {
      throw new Error('User not authenticated')
    }

    // Same as initiateOAuth but for linking existing account
    return initiateOAuth(provider, redirectUri)
  }

  // Clear error
  const clearError = () => {
    error.value = null
  }

  // Initialize - load providers
  loadProviders()

  return {
    // State
    isLoading,
    error,
    availableProviders,

    // Computed
    hasOAuthProviders,

    // Actions
    initiateOAuth,
    handleOAuthCallback,
    getUserOAuthProviders,
    unlinkOAuthProvider,
    linkOAuthProvider,
    loadProviders,
    clearError,
  }
}
