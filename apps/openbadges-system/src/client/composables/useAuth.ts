import { ref, computed } from 'vue'
import { useRouter } from 'vue-router'
import { jwtDecode } from 'jwt-decode'
import { WebAuthnUtils, WebAuthnError, type WebAuthnCredential } from '@/utils/webauthn'

// Re-export WebAuthnCredential for use in other modules
export type { WebAuthnCredential }
import { openBadgesService } from '@/services/openbadges'

export interface User {
  id: string
  username: string
  email: string
  firstName: string
  lastName: string
  avatar?: string
  isAdmin: boolean
  createdAt: string
  credentials: WebAuthnCredential[]
}

export interface RegisterData {
  username: string
  email: string
  firstName: string
  lastName: string
}

export interface AuthResponse {
  success: boolean
  user?: User
  token?: string
  message?: string
}

export const useAuth = () => {
  const router = useRouter()

  // State
  const user = ref<User | null>(null)
  const token = ref<string | null>(localStorage.getItem('auth_token'))
  const isLoading = ref(false)
  const error = ref<string | null>(null)
  const isWebAuthnSupported = ref(WebAuthnUtils.isSupported())
  const isPlatformAuthAvailable = ref(false)

  // Helper function to check if JWT token is valid and not expired
  const isTokenValid = (tokenValue: string | null): boolean => {
    if (!tokenValue) return false
    try {
      const decoded = jwtDecode<{ exp: number }>(tokenValue)
      return decoded.exp * 1000 > Date.now()
    } catch {
      return false
    }
  }

  // Computed
  const isAuthenticated = computed(() => !!user.value && !!token.value && isTokenValid(token.value))
  const isAdmin = computed(() => user.value?.isAdmin || false)

  // Check platform authenticator availability
  const checkPlatformAuth = async () => {
    isPlatformAuthAvailable.value = await WebAuthnUtils.isPlatformAuthenticatorAvailable()
  }

  // Removed unused functions: getUsersFromStorage, saveUsersToStorage, apiCall

  // Public API calls for user lookup/registration (no auth required)
  const publicApiCall = async (endpoint: string, options: RequestInit = {}) => {
    const response = await fetch(`/api/auth/public${endpoint}`, {
      headers: {
        'Content-Type': 'application/json',
        ...options.headers,
      },
      ...options,
    })

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({ message: 'Unknown error' }))
      throw new Error(errorData.message || `API call failed: ${response.status}`)
    }

    return response.json()
  }

  // Authenticated API calls for user management (requires auth token)
  const authenticatedApiCall = async (endpoint: string, options: RequestInit = {}) => {
    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
      ...(options.headers as Record<string, string>),
    }

    if (token.value) {
      headers.Authorization = `Bearer ${token.value}`
    }

    const response = await fetch(`/api/bs${endpoint}`, {
      headers,
      ...options,
    })

    if (!response) {
      throw new Error('Network error: No response received')
    }

    if (!response.ok) {
      let errorData = { message: 'Unknown error' }
      if (response.json && typeof response.json === 'function') {
        errorData = await response.json().catch(() => ({ message: 'Unknown error' }))
      }
      throw new Error(errorData.message || `API call failed: ${response.status}`)
    }

    if (response.json && typeof response.json === 'function') {
      return response.json()
    }

    // Fallback for test environment or if response.json is not available
    return response
  }

  // Register user in backend
  const registerUser = async (data: RegisterData): Promise<User> => {
    const userData = {
      username: data.username,
      email: data.email,
      firstName: data.firstName,
      lastName: data.lastName,
      isActive: true,
      roles: ['USER'],
    }

    const response = await publicApiCall('/users/register', {
      method: 'POST',
      body: JSON.stringify(userData),
    })

    return {
      id: response.id,
      username: response.username,
      email: response.email,
      firstName: response.firstName || '',
      lastName: response.lastName || '',
      avatar: response.avatar,
      isAdmin: response.isAdmin || false,
      createdAt: response.createdAt,
      credentials: response.credentials || [],
    }
  }

  // Find user by username/email
  const findUser = async (usernameOrEmail: string): Promise<User | null> => {
    try {
      // Check if it's an email or username
      const isEmail = usernameOrEmail.includes('@')
      const queryParam = isEmail
        ? `email=${encodeURIComponent(usernameOrEmail)}`
        : `username=${encodeURIComponent(usernameOrEmail)}`

      const response = await publicApiCall(`/users/lookup?${queryParam}`)

      if (response.exists && response.user) {
        const backendUser = response.user
        return {
          id: backendUser.id,
          username: backendUser.username,
          email: backendUser.email,
          firstName: backendUser.firstName || '',
          lastName: backendUser.lastName || '',
          avatar: backendUser.avatar,
          isAdmin: backendUser.isAdmin || false,
          createdAt: backendUser.createdAt,
          credentials: backendUser.credentials || [],
        }
      }

      return null
    } catch (error) {
      console.error('Error finding user:', error)
      return null
    }
  }

  // Store WebAuthn credential in backend
  const storeCredential = async (userId: string, credential: WebAuthnCredential): Promise<void> => {
    await publicApiCall(`/users/${userId}/credentials`, {
      method: 'POST',
      body: JSON.stringify(credential),
    })
  }

  // WebAuthn Registration
  const registerWithWebAuthn = async (data: RegisterData): Promise<boolean> => {
    isLoading.value = true
    error.value = null

    try {
      // Check if user already exists
      console.log('Checking for existing user:', data.username)
      const existingUser = await findUser(data.username)
      if (existingUser) {
        console.log('User already exists:', existingUser)
        error.value = 'Username already exists'
        return false
      }

      console.log('Checking for existing email:', data.email)
      const existingEmail = await findUser(data.email)
      if (existingEmail) {
        console.log('Email already exists:', existingEmail)
        error.value = 'Email already exists'
        return false
      }

      // Create user in backend first
      console.log('Creating new user in backend:', data)
      const newUser = await registerUser(data)
      console.log('New user created:', newUser)

      // Create WebAuthn registration options
      const registrationOptions = WebAuthnUtils.createRegistrationOptions(
        newUser.id,
        newUser.username,
        `${newUser.firstName} ${newUser.lastName}`,
        []
      )

      // Use WebAuthn to create credential
      const credentialData = await WebAuthnUtils.register(registrationOptions)

      // Create credential object
      const credential: WebAuthnCredential = {
        id: credentialData.id,
        publicKey: credentialData.publicKey,
        transports: credentialData.transports,
        counter: 0,
        createdAt: new Date().toISOString(),
        lastUsed: new Date().toISOString(),
        name: WebAuthnUtils.getAuthenticatorName(
          credentialData.authenticatorAttachment,
          credentialData.transports
        ),
        type: credentialData.authenticatorAttachment === 'platform' ? 'platform' : 'cross-platform',
      }

      // Store credential in backend
      await storeCredential(newUser.id, credential)

      // Update user with credential
      newUser.credentials = [credential]

      // Request real platform token from backend for this user
      try {
        const platformRes = await publicApiCall(`/users/${newUser.id}/token`, {
          method: 'POST',
        })
        if (platformRes && platformRes.success) {
          token.value = platformRes.token
        } else {
          // Fallback: create a temporary session token
          token.value = `local-session-${Date.now()}`
        }
      } catch {
        token.value = `local-session-${Date.now()}`
      }

      // Persist session regardless of token source
      user.value = newUser
      if (token.value !== null) {
        localStorage.setItem('auth_token', token.value)
      }
      localStorage.setItem('user_data', JSON.stringify(newUser))

      return true
    } catch (err) {
      if (err instanceof WebAuthnError) {
        error.value = err.userMessage
      } else {
        error.value = 'Registration failed. Please try again.'
      }
      return false
    } finally {
      isLoading.value = false
    }
  }

  // WebAuthn Authentication
  const authenticateWithWebAuthn = async (username: string): Promise<boolean> => {
    isLoading.value = true
    error.value = null

    try {
      // Normalize input (trim) before lookup to avoid stray spaces causing misses
      const normalized = username.trim()

      // Find user in backend
      console.log('Looking for user:', normalized)
      const foundUser = await findUser(normalized)
      if (!foundUser) {
        error.value = 'User not found'
        return false
      }

      console.log('Found user:', foundUser)
      console.log('User credentials:', foundUser.credentials)

      // Check if user has credentials
      if (!foundUser.credentials || foundUser.credentials.length === 0) {
        error.value = 'No credentials found for this user. Please register first.'
        return false
      }

      // Create authentication options
      const authenticationOptions = WebAuthnUtils.createAuthenticationOptions(foundUser.credentials)

      // Use WebAuthn to authenticate
      const credentialData = await WebAuthnUtils.authenticate(authenticationOptions)

      // Verify credential exists
      const credential = foundUser.credentials.find(c => c.id === credentialData.id)
      if (!credential) {
        error.value = 'Invalid credential'
        return false
      }

      // Update credential last used time in backend
      await publicApiCall(`/users/${foundUser.id}/credentials/${credential.id}`, {
        method: 'PATCH',
        body: JSON.stringify({ lastUsed: new Date().toISOString() }),
      })

      // Exchange for real platform token
      try {
        const platformRes = await publicApiCall(`/users/${foundUser.id}/token`, {
          method: 'POST',
        })
        if (platformRes && platformRes.success) {
          token.value = platformRes.token
        } else {
          token.value = `local-session-${Date.now()}`
        }
      } catch (e) {
        console.error('Token exchange failed:', e)
        token.value = `local-session-${Date.now()}`
      }

      user.value = foundUser
      if (token.value !== null) {
        localStorage.setItem('auth_token', token.value)
      }
      localStorage.setItem('user_data', JSON.stringify(foundUser))

      return true
    } catch (err) {
      console.error('Authentication error:', err)
      if (err instanceof WebAuthnError) {
        error.value = err.userMessage
      } else {
        error.value =
          err instanceof Error ? err.message : 'Authentication failed. Please try again.'
      }
      return false
    } finally {
      isLoading.value = false
    }
  }

  // Set up a WebAuthn passkey for an existing user (used when user exists but has no credentials)
  const setupPasskeyForUser = async (usernameOrEmail: string): Promise<boolean> => {
    isLoading.value = true
    error.value = null

    try {
      const identifier = usernameOrEmail.trim()
      const existingUser = await findUser(identifier)
      if (!existingUser) {
        error.value = 'User not found'
        return false
      }

      const registrationOptions = WebAuthnUtils.createRegistrationOptions(
        existingUser.id,
        existingUser.username,
        `${existingUser.firstName} ${existingUser.lastName}`,
        existingUser.credentials
      )

      const credentialData = await WebAuthnUtils.register(registrationOptions)

      const newCredential: WebAuthnCredential = {
        id: credentialData.id,
        publicKey: credentialData.publicKey,
        transports: credentialData.transports,
        counter: 0,
        createdAt: new Date().toISOString(),
        lastUsed: new Date().toISOString(),
        name: WebAuthnUtils.getAuthenticatorName(
          credentialData.authenticatorAttachment,
          credentialData.transports
        ),
        type: credentialData.authenticatorAttachment === 'platform' ? 'platform' : 'cross-platform',
      }

      await storeCredential(existingUser.id, newCredential)

      // Try to exchange for a platform token
      try {
        const platformRes = await publicApiCall(`/users/${existingUser.id}/token`, {
          method: 'POST',
        })
        if (platformRes && platformRes.success) {
          token.value = platformRes.token
        } else {
          token.value = `local-session-${Date.now()}`
        }
      } catch (e) {
        console.error('Token exchange failed:', e)
        token.value = `local-session-${Date.now()}`
      }

      user.value = {
        ...existingUser,
        credentials: [...(existingUser.credentials || []), newCredential],
      }
      if (token.value !== null) {
        localStorage.setItem('auth_token', token.value)
      }
      localStorage.setItem('user_data', JSON.stringify(user.value))

      return true
    } catch (err) {
      console.error('Passkey setup error:', err)
      if (err instanceof WebAuthnError) {
        error.value = err.userMessage
      } else {
        error.value =
          err instanceof Error ? err.message : 'Failed to set up passkey. Please try again.'
      }
      return false
    } finally {
      isLoading.value = false
    }
  }

  // Legacy methods for compatibility
  const login = async (username: string): Promise<boolean> => {
    return await authenticateWithWebAuthn(username)
  }

  const register = async (data: RegisterData): Promise<boolean> => {
    return await registerWithWebAuthn(data)
  }

  // Logout function
  const logout = () => {
    user.value = null
    token.value = null
    localStorage.removeItem('auth_token')
    localStorage.removeItem('user_data')
    router.push('/auth/login')
  }

  // Initialize auth state from localStorage
  const initializeAuth = async () => {
    const storedToken = localStorage.getItem('auth_token')
    const storedUser = localStorage.getItem('user_data')

    if (storedToken && storedUser) {
      try {
        const parsedUser = JSON.parse(storedUser)
        token.value = storedToken
        user.value = parsedUser
        // Best-effort validation; only clear on explicit unauthorized
        try {
          const res = await fetch('/api/auth/validate', {
            headers: { Authorization: `Bearer ${storedToken}` },
          })
          if (res.status === 401 || res.status === 403) {
            throw new Error('Unauthorized')
          }
        } catch {
          // Keep local session on network/other errors; do not clear here
        }
      } catch {
        // Clear invalid JSON storage
        localStorage.removeItem('auth_token')
        localStorage.removeItem('user_data')
        token.value = null
        user.value = null
      }
    }

    // Check WebAuthn support
    await checkPlatformAuth()
  }

  // Clear error
  const clearError = () => {
    error.value = null
  }

  // Update user profile
  const updateProfile = async (updatedUser: Partial<User>) => {
    if (!user.value) return

    try {
      // Convert isAdmin to roles structure for backend
      const backendUpdate: Record<string, unknown> = { ...updatedUser }
      if ('isAdmin' in updatedUser) {
        backendUpdate.roles = updatedUser.isAdmin ? ['USER', 'ADMIN'] : ['USER']
        delete backendUpdate.isAdmin
      }

      // Update user in backend
      const response = await authenticatedApiCall(`/users/${user.value.id}`, {
        method: 'PUT',
        body: JSON.stringify(backendUpdate),
      })

      // Update local user state with backend response
      if (response && response.roles) {
        const updatedUserData = {
          ...user.value,
          ...updatedUser,
          isAdmin: response.roles.includes('ADMIN'),
        }
        user.value = updatedUserData
        localStorage.setItem('user_data', JSON.stringify(user.value))
      } else {
        // Fallback to direct update if no response
        user.value = { ...user.value, ...updatedUser }
        localStorage.setItem('user_data', JSON.stringify(user.value))
      }
    } catch (err) {
      error.value = err instanceof Error ? err.message : 'Failed to update profile'
    }
  }

  // Add a new credential to user's account
  const addCredential = async (credentialName: string): Promise<boolean> => {
    if (!user.value) return false

    isLoading.value = true
    error.value = null

    try {
      const registrationOptions = WebAuthnUtils.createRegistrationOptions(
        user.value.id,
        user.value.username,
        `${user.value.firstName} ${user.value.lastName}`,
        user.value.credentials
      )

      const credentialData = await WebAuthnUtils.register(registrationOptions)

      const newCredential: WebAuthnCredential = {
        id: credentialData.id,
        publicKey: credentialData.publicKey,
        transports: credentialData.transports,
        counter: 0,
        createdAt: new Date().toISOString(),
        lastUsed: new Date().toISOString(),
        name:
          credentialName ||
          WebAuthnUtils.getAuthenticatorName(
            credentialData.authenticatorAttachment,
            credentialData.transports
          ),
        type: credentialData.authenticatorAttachment === 'platform' ? 'platform' : 'cross-platform',
      }

      // Store credential in backend
      await storeCredential(user.value.id, newCredential)

      // Update local user state
      user.value.credentials.push(newCredential)
      localStorage.setItem('user_data', JSON.stringify(user.value))

      return true
    } catch (err) {
      if (err instanceof WebAuthnError) {
        error.value = err.userMessage
      } else {
        error.value = 'Failed to add authenticator. Please try again.'
      }
      return false
    } finally {
      isLoading.value = false
    }
  }

  // Remove a credential from user's account
  const removeCredential = async (credentialId: string) => {
    if (!user.value) return

    try {
      // Remove credential from backend
      await authenticatedApiCall(`/users/${user.value.id}/credentials/${credentialId}`, {
        method: 'DELETE',
      })

      // Update local user state
      user.value.credentials = user.value.credentials.filter(c => c.id !== credentialId)
      localStorage.setItem('user_data', JSON.stringify(user.value))
    } catch (err) {
      error.value = err instanceof Error ? err.message : 'Failed to remove credential'
    }
  }

  // OpenBadges integration
  const getUserBackpack = async () => {
    if (!user.value) return null

    try {
      return await openBadgesService.getUserBackpack(user.value)
    } catch (err) {
      console.error('Failed to get user backpack:', err)
      return null
    }
  }

  const addBadgeToBackpack = async (
    badgeClassId: string,
    evidence?: string,
    narrative?: string
  ) => {
    if (!user.value) return false

    try {
      await openBadgesService.addBadgeToBackpack(user.value, badgeClassId, evidence, narrative)
      return true
    } catch (err) {
      console.error('Failed to add badge to backpack:', err)
      error.value = 'Failed to add badge to backpack'
      return false
    }
  }

  const removeBadgeFromBackpack = async (assertionId: string) => {
    if (!user.value) return false

    try {
      await openBadgesService.removeBadgeFromBackpack(user.value, assertionId)
      return true
    } catch (err) {
      console.error('Failed to remove badge from backpack:', err)
      error.value = 'Failed to remove badge from backpack'
      return false
    }
  }

  const getBadgeClasses = async () => {
    try {
      return await openBadgesService.getBadgeClasses()
    } catch (err) {
      console.error('Failed to get badge classes:', err)
      return []
    }
  }

  const createBadgeClass = async (badgeClass: Record<string, unknown>) => {
    if (!user.value) return null

    try {
      return await openBadgesService.createBadgeClass(user.value, badgeClass)
    } catch (err) {
      console.error('Failed to create badge class:', err)
      error.value = 'Failed to create badge class'
      return null
    }
  }

  const issueBadge = async (
    badgeClassId: string,
    recipientEmail: string,
    evidence?: string,
    narrative?: string
  ) => {
    if (!user.value) return null

    try {
      return await openBadgesService.issueBadge(
        user.value,
        badgeClassId,
        recipientEmail,
        evidence,
        narrative
      )
    } catch (err) {
      console.error('Failed to issue badge:', err)
      error.value = 'Failed to issue badge'
      return null
    }
  }

  // OAuth Authentication
  const authenticateWithOAuth = async (
    provider: string,
    redirectUri: string = '/'
  ): Promise<boolean> => {
    isLoading.value = true
    error.value = null

    try {
      // Initiate OAuth flow
      const response = await fetch(
        `/api/oauth/${provider}?redirect_uri=${encodeURIComponent(redirectUri)}`
      )

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({ error: 'Unknown error' }))
        throw new Error(errorData.error || 'OAuth initiation failed')
      }

      const result = await response.json()

      if (result.success && result.authUrl) {
        // Redirect to OAuth provider
        window.location.href = result.authUrl
        return true
      } else {
        throw new Error('Failed to get OAuth authorization URL')
      }
    } catch (err) {
      console.error('OAuth authentication failed:', err)
      error.value = err instanceof Error ? err.message : 'OAuth authentication failed'
      return false
    } finally {
      isLoading.value = false
    }
  }

  // Process OAuth callback (typically handled by backend, but can be used for SPA flows)
  const processOAuthCallback = async (code: string, state: string): Promise<boolean> => {
    isLoading.value = true
    error.value = null

    try {
      const response = await fetch(`/api/oauth/github/callback?code=${code}&state=${state}`)

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({ error: 'Unknown error' }))
        throw new Error(errorData.error || 'OAuth callback failed')
      }

      const result = await response.json()

      if (result.success && result.user && result.token) {
        // Set authentication state
        const userData = {
          id: result.user.id,
          username: result.user.username,
          email: result.user.email,
          firstName: result.user.firstName,
          lastName: result.user.lastName,
          avatar: result.user.avatar,
          isAdmin: result.user.isAdmin,
          createdAt: result.user.createdAt || new Date().toISOString(),
          credentials: result.user.credentials || [],
        }

        user.value = userData
        token.value = result.token
        localStorage.setItem('auth_token', result.token)
        localStorage.setItem('user_data', JSON.stringify(userData))

        return true
      } else {
        throw new Error(result.error || 'OAuth authentication failed')
      }
    } catch (err) {
      console.error('OAuth callback processing failed:', err)
      error.value = err instanceof Error ? err.message : 'OAuth callback processing failed'
      return false
    } finally {
      isLoading.value = false
    }
  }

  // Initialize on first use
  initializeAuth()

  return {
    // State
    user,
    token,
    isLoading,
    error,
    isWebAuthnSupported,
    isPlatformAuthAvailable,

    // Computed
    isAuthenticated,
    isAdmin,

    // Actions
    login,
    register,
    authenticateWithWebAuthn,
    registerWithWebAuthn,
    setupPasskeyForUser,
    authenticateWithOAuth,
    processOAuthCallback,
    logout,
    initializeAuth,
    clearError,
    updateProfile,
    addCredential,
    removeCredential,

    // Utilities
    isTokenValid,

    // OpenBadges integration
    getUserBackpack,
    addBadgeToBackpack,
    removeBadgeFromBackpack,
    getBadgeClasses,
    createBadgeClass,
    issueBadge,
  }
}
