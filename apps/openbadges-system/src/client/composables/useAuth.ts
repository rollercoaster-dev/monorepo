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

// Shared reactive state — module-level so all useAuth() callers share the same refs
// Eagerly restore user from localStorage so the navigation guard can read auth
// state before any component calls useAuth() / initializeAuth().
let restoredUser: User | null = null
try {
  const storedUser = localStorage.getItem('user_data')
  if (storedUser) restoredUser = JSON.parse(storedUser) as User
} catch {
  // Invalid JSON — leave as null; initializeAuth() will clean up later
}
const user = ref<User | null>(restoredUser)
const token = ref<string | null>(localStorage.getItem('auth_token'))
const refreshTokenValue = ref<string | null>(localStorage.getItem('refresh_token'))
const isLoading = ref(false)
const error = ref<string | null>(null)
const isWebAuthnSupported = ref(WebAuthnUtils.isSupported())
const isPlatformAuthAvailable = ref(false)
let refreshTimer: ReturnType<typeof setTimeout> | null = null

// Token validation helpers — module-level so they can be used by the navigation guard
const LOCAL_SESSION_PREFIX = 'local-session-'
const LOCAL_SESSION_MAX_AGE_MS = 24 * 60 * 60 * 1000

const isLocalSession = (tokenValue: string | null): boolean => {
  return tokenValue !== null && tokenValue.startsWith(LOCAL_SESSION_PREFIX)
}

const isLocalSessionValid = (tokenValue: string | null): boolean => {
  if (!tokenValue || !isLocalSession(tokenValue)) return false
  const timestamp = parseInt(tokenValue.replace(LOCAL_SESSION_PREFIX, ''), 10)
  if (isNaN(timestamp)) return false
  return Date.now() - timestamp < LOCAL_SESSION_MAX_AGE_MS
}

const isTokenValid = (tokenValue: string | null): boolean => {
  if (!tokenValue) return false
  if (isLocalSession(tokenValue)) {
    return isLocalSessionValid(tokenValue)
  }
  try {
    const decoded = jwtDecode<{ exp: number }>(tokenValue)
    return decoded.exp * 1000 > Date.now()
  } catch {
    return false
  }
}

// Refresh the access token using the stored refresh token.
// Returns true if refresh succeeded, false otherwise.
async function performTokenRefresh(): Promise<boolean> {
  const currentRefreshToken = refreshTokenValue.value
  if (!currentRefreshToken) return false

  try {
    const response = await fetch('/api/auth/public/refresh', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ refreshToken: currentRefreshToken }),
    })

    if (!response.ok) {
      // Refresh token is invalid/expired — clear auth state
      return false
    }

    const data = await response.json()
    if (data.success && data.token && data.refreshToken) {
      token.value = data.token
      refreshTokenValue.value = data.refreshToken
      localStorage.setItem('auth_token', data.token)
      localStorage.setItem('refresh_token', data.refreshToken)
      scheduleTokenRefresh(data.token)
      return true
    }
    return false
  } catch {
    // Network error — don't clear state (offline-first)
    return false
  }
}

// Schedule a proactive refresh 5 minutes before the access token expires
function scheduleTokenRefresh(accessToken: string) {
  if (refreshTimer) clearTimeout(refreshTimer)
  if (isLocalSession(accessToken)) return

  try {
    const decoded = jwtDecode<{ exp: number }>(accessToken)
    const expiresInMs = decoded.exp * 1000 - Date.now()
    // Refresh 5 minutes before expiry, or immediately if less than 5 minutes remain
    const refreshInMs = Math.max(expiresInMs - 5 * 60 * 1000, 0)
    refreshTimer = setTimeout(async () => {
      const success = await performTokenRefresh()
      if (!success) {
        // Refresh failed — clear auth state
        token.value = null
        refreshTokenValue.value = null
        user.value = null
        localStorage.removeItem('auth_token')
        localStorage.removeItem('refresh_token')
        localStorage.removeItem('user_data')
      }
    }, refreshInMs)
  } catch {
    // Invalid token — skip scheduling
  }
}

function clearRefreshTimer() {
  if (refreshTimer) {
    clearTimeout(refreshTimer)
    refreshTimer = null
  }
}

// Auth state accessor for use outside Vue component context (e.g., navigation guards)
export const getAuthState = () => ({
  isAuthenticated: !!user.value && !!token.value && isTokenValid(token.value),
  isAdmin: user.value?.isAdmin || false,
})

export const useAuth = () => {
  const router = useRouter()

  // Computed — derived from getAuthState() so logic lives in one place
  const isAuthenticated = computed(() => getAuthState().isAuthenticated)
  const isAdmin = computed(() => getAuthState().isAdmin)
  // Indicates if user is in offline/local-only mode (limited backend functionality)
  const hasLocalSession = computed(() => isLocalSession(token.value))

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
      const errorData = await response.json().catch(() => ({ error: 'Unknown error' }))
      throw new Error(errorData.error || errorData.message || `API call failed: ${response.status}`)
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
  // Throws on server errors (500, 429, network) — callers catch and show the real error.
  // Returns null only when the user genuinely doesn't exist (exists: false response).
  const findUser = async (usernameOrEmail: string): Promise<User | null> => {
    const isEmail = usernameOrEmail.includes('@')
    const queryParam = isEmail
      ? `email=${encodeURIComponent(usernameOrEmail)}`
      : `username=${encodeURIComponent(usernameOrEmail)}`

    const response = await publicApiCall(`/users/lookup?${queryParam}`)

    if (response.exists && response.user) {
      const backendUser = response.user
      // Lookup returns credential metadata (id, transports, name, type)
      // without sensitive fields (publicKey, counter). Fill defaults for
      // fields required by the WebAuthnCredential type but unused during auth.
      const credentials: WebAuthnCredential[] = (backendUser.credentials || []).map(
        (c: Pick<WebAuthnCredential, 'id' | 'transports' | 'name' | 'type'>) => ({
          id: c.id,
          transports: c.transports,
          name: c.name,
          type: c.type,
          publicKey: '',
          counter: 0,
          createdAt: '',
          lastUsed: '',
        })
      )
      return {
        id: backendUser.id,
        username: backendUser.username,
        email: backendUser.email,
        firstName: backendUser.firstName || '',
        lastName: backendUser.lastName || '',
        avatar: backendUser.avatar,
        isAdmin: backendUser.isAdmin || false,
        createdAt: backendUser.createdAt,
        credentials,
      }
    }

    return null
  }

  // Request a server-issued challenge for WebAuthn operations
  const requestChallenge = async (
    userId: string,
    type: 'registration' | 'authentication'
  ): Promise<{ challenge: string; rpId: string; timeout: number }> => {
    return await publicApiCall(`/users/${userId}/challenge/${type}`)
  }

  // Store WebAuthn credential in backend (sends attestation data for server verification)
  // When adding credentials to a user who already has some, pass authToken for auth gate.
  const storeCredential = async (
    userId: string,
    credentialData: {
      id: string
      rawId: string
      attestationObject: string
      clientDataJSON: string
      challenge: string
      name: string
      authenticatorAttachment?: string
      transports: string[]
    },
    authToken?: string
  ): Promise<void> => {
    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
    }
    if (authToken) {
      headers.Authorization = `Bearer ${authToken}`
    }

    await publicApiCall(`/users/${userId}/credentials`, {
      method: 'POST',
      headers,
      body: JSON.stringify({
        id: credentialData.id,
        rawId: credentialData.rawId,
        type: 'public-key',
        response: {
          attestationObject: credentialData.attestationObject,
          clientDataJSON: credentialData.clientDataJSON,
        },
        challenge: credentialData.challenge,
        name: credentialData.name,
        authenticatorAttachment: credentialData.authenticatorAttachment,
        transports: credentialData.transports,
      }),
    })
  }

  // WebAuthn Registration
  const registerWithWebAuthn = async (data: RegisterData): Promise<boolean> => {
    isLoading.value = true
    error.value = null

    try {
      // Check if user already exists
      const existingUser = await findUser(data.username)
      if (existingUser) {
        error.value = 'Username already exists'
        return false
      }

      const existingEmail = await findUser(data.email)
      if (existingEmail) {
        error.value = 'Email already exists'
        return false
      }

      // Create user in backend first
      const newUser = await registerUser(data)

      // Request server challenge for registration
      const { challenge, rpId, timeout } = await requestChallenge(newUser.id, 'registration')

      // Create WebAuthn registration options with server challenge
      const registrationOptions = WebAuthnUtils.createRegistrationOptions(
        newUser.id,
        newUser.username,
        `${newUser.firstName} ${newUser.lastName}`,
        [],
        challenge,
        rpId,
        timeout
      )

      // Use WebAuthn to create credential
      const credentialData = await WebAuthnUtils.register(registrationOptions)

      const credentialName = WebAuthnUtils.getAuthenticatorName(
        credentialData.authenticatorAttachment,
        credentialData.transports
      )

      // Store credential in backend with attestation data for server verification
      await storeCredential(newUser.id, {
        id: credentialData.id,
        rawId: credentialData.rawId,
        attestationObject: credentialData.attestationObject,
        clientDataJSON: credentialData.clientDataJSON,
        challenge,
        name: credentialName,
        authenticatorAttachment:
          credentialData.authenticatorAttachment === 'platform' ? 'platform' : 'cross-platform',
        transports: credentialData.transports,
      })

      // Build local credential object for state
      const credential: WebAuthnCredential = {
        id: credentialData.id,
        publicKey: credentialData.publicKey,
        transports: credentialData.transports,
        counter: 0,
        createdAt: new Date().toISOString(),
        lastUsed: new Date().toISOString(),
        name: credentialName,
        type: credentialData.authenticatorAttachment === 'platform' ? 'platform' : 'cross-platform',
      }

      // Update user with credential
      newUser.credentials = [credential]

      // Now authenticate: request auth challenge and sign it to get a JWT
      const authChallenge = await requestChallenge(newUser.id, 'authentication')
      const authOptions = WebAuthnUtils.createAuthenticationOptions(
        [credential],
        authChallenge.challenge,
        authChallenge.rpId,
        authChallenge.timeout
      )
      const assertion = await WebAuthnUtils.authenticate(authOptions)

      const platformRes = await publicApiCall(`/users/${newUser.id}/token`, {
        method: 'POST',
        body: JSON.stringify({
          credentialId: assertion.id,
          authenticatorData: assertion.authenticatorData,
          clientDataJSON: assertion.clientDataJSON,
          signature: assertion.signature,
          challenge: authChallenge.challenge,
        }),
      })
      if (!platformRes?.success || !platformRes?.token) {
        error.value = 'Registration succeeded but login failed. Please log in manually.'
        return false
      }
      token.value = platformRes.token
      if (platformRes.refreshToken) {
        refreshTokenValue.value = platformRes.refreshToken
        localStorage.setItem('refresh_token', platformRes.refreshToken)
      }

      user.value = newUser
      localStorage.setItem('auth_token', token.value!)
      localStorage.setItem('user_data', JSON.stringify(newUser))
      scheduleTokenRefresh(token.value!)

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
      const foundUser = await findUser(normalized)
      if (!foundUser) {
        error.value = 'User not found'
        return false
      }

      // Check if user has credentials
      if (!foundUser.credentials || foundUser.credentials.length === 0) {
        error.value = 'No credentials found for this user. Please register first.'
        return false
      }

      // Request server challenge for authentication
      const { challenge, rpId, timeout } = await requestChallenge(foundUser.id, 'authentication')

      // Create authentication options with server challenge
      const authenticationOptions = WebAuthnUtils.createAuthenticationOptions(
        foundUser.credentials,
        challenge,
        rpId,
        timeout
      )

      // Use WebAuthn to authenticate (signs the server challenge)
      const credentialData = await WebAuthnUtils.authenticate(authenticationOptions)

      // Exchange assertion for JWT token (server verifies the signature)
      const platformRes = await publicApiCall(`/users/${foundUser.id}/token`, {
        method: 'POST',
        body: JSON.stringify({
          credentialId: credentialData.id,
          authenticatorData: credentialData.authenticatorData,
          clientDataJSON: credentialData.clientDataJSON,
          signature: credentialData.signature,
          challenge,
        }),
      })
      if (!platformRes?.success || !platformRes?.token) {
        error.value = 'Server authentication failed. Please try again.'
        return false
      }
      token.value = platformRes.token
      if (platformRes.refreshToken) {
        refreshTokenValue.value = platformRes.refreshToken
        localStorage.setItem('refresh_token', platformRes.refreshToken)
      }

      user.value = foundUser
      localStorage.setItem('auth_token', token.value!)
      localStorage.setItem('user_data', JSON.stringify(foundUser))
      scheduleTokenRefresh(token.value!)

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

      // Request server challenge for registration
      const { challenge, rpId, timeout } = await requestChallenge(existingUser.id, 'registration')

      const registrationOptions = WebAuthnUtils.createRegistrationOptions(
        existingUser.id,
        existingUser.username,
        `${existingUser.firstName} ${existingUser.lastName}`,
        existingUser.credentials,
        challenge,
        rpId,
        timeout
      )

      const credentialData = await WebAuthnUtils.register(registrationOptions)

      const credentialName = WebAuthnUtils.getAuthenticatorName(
        credentialData.authenticatorAttachment,
        credentialData.transports
      )

      // Store credential with attestation data for server verification
      await storeCredential(existingUser.id, {
        id: credentialData.id,
        rawId: credentialData.rawId,
        attestationObject: credentialData.attestationObject,
        clientDataJSON: credentialData.clientDataJSON,
        challenge,
        name: credentialName,
        authenticatorAttachment:
          credentialData.authenticatorAttachment === 'platform' ? 'platform' : 'cross-platform',
        transports: credentialData.transports,
      })

      const newCredential: WebAuthnCredential = {
        id: credentialData.id,
        publicKey: credentialData.publicKey,
        transports: credentialData.transports,
        counter: 0,
        createdAt: new Date().toISOString(),
        lastUsed: new Date().toISOString(),
        name: credentialName,
        type: credentialData.authenticatorAttachment === 'platform' ? 'platform' : 'cross-platform',
      }

      // Authenticate to get a JWT - request auth challenge and sign it
      const authChallenge = await requestChallenge(existingUser.id, 'authentication')
      const authOptions = WebAuthnUtils.createAuthenticationOptions(
        [...(existingUser.credentials || []), newCredential],
        authChallenge.challenge,
        authChallenge.rpId,
        authChallenge.timeout
      )
      const assertion = await WebAuthnUtils.authenticate(authOptions)

      const platformRes = await publicApiCall(`/users/${existingUser.id}/token`, {
        method: 'POST',
        body: JSON.stringify({
          credentialId: assertion.id,
          authenticatorData: assertion.authenticatorData,
          clientDataJSON: assertion.clientDataJSON,
          signature: assertion.signature,
          challenge: authChallenge.challenge,
        }),
      })
      if (!platformRes?.success || !platformRes?.token) {
        error.value = 'Passkey added but login failed. Please log in manually.'
        return false
      }
      token.value = platformRes.token
      if (platformRes.refreshToken) {
        refreshTokenValue.value = platformRes.refreshToken
        localStorage.setItem('refresh_token', platformRes.refreshToken)
      }

      user.value = {
        ...existingUser,
        credentials: [...(existingUser.credentials || []), newCredential],
      }
      localStorage.setItem('auth_token', token.value!)
      localStorage.setItem('user_data', JSON.stringify(user.value))
      scheduleTokenRefresh(token.value!)

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
    clearRefreshTimer()
    // Best-effort server-side revocation
    if (refreshTokenValue.value) {
      fetch('/api/auth/public/logout', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ refreshToken: refreshTokenValue.value }),
      }).catch(() => {
        // Ignore network errors during logout
      })
    }
    user.value = null
    token.value = null
    refreshTokenValue.value = null
    localStorage.removeItem('auth_token')
    localStorage.removeItem('refresh_token')
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

        // First check if token is locally valid (handles both JWT expiration and local session age)
        if (!isTokenValid(storedToken)) {
          // Access token expired — attempt refresh before clearing state
          const refreshed = await performTokenRefresh()
          if (refreshed) {
            user.value = parsedUser
            await checkPlatformAuth()
            return
          }
          console.warn('Stored session expired and refresh failed, clearing local state')
          localStorage.removeItem('auth_token')
          localStorage.removeItem('refresh_token')
          localStorage.removeItem('user_data')
          token.value = null
          refreshTokenValue.value = null
          user.value = null
          await checkPlatformAuth()
          return
        }

        token.value = storedToken
        user.value = parsedUser

        // Skip server validation for local sessions (offline-first)
        if (isLocalSession(storedToken)) {
          console.info('Using local session (offline mode)')
          await checkPlatformAuth()
          return
        }

        // Schedule proactive refresh for valid JWT tokens
        scheduleTokenRefresh(storedToken)

        // Best-effort validation for JWT tokens; only clear on explicit unauthorized
        try {
          const res = await fetch('/api/auth/validate', {
            headers: { Authorization: `Bearer ${storedToken}` },
          })
          if (res.status === 401 || res.status === 403) {
            throw new Error('Unauthorized')
          }
        } catch (err) {
          // Keep local session on network/other errors for offline-first support
          // Log warning so developers are aware of potential stale sessions
          console.warn('Session validation failed (network error), keeping local session:', err)
        }
      } catch {
        // Clear invalid JSON storage
        localStorage.removeItem('auth_token')
        localStorage.removeItem('refresh_token')
        localStorage.removeItem('user_data')
        token.value = null
        refreshTokenValue.value = null
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
      // Request server challenge for registration
      const { challenge, rpId, timeout } = await requestChallenge(user.value.id, 'registration')

      const registrationOptions = WebAuthnUtils.createRegistrationOptions(
        user.value.id,
        user.value.username,
        `${user.value.firstName} ${user.value.lastName}`,
        user.value.credentials,
        challenge,
        rpId,
        timeout
      )

      const credentialData = await WebAuthnUtils.register(registrationOptions)

      const name =
        credentialName ||
        WebAuthnUtils.getAuthenticatorName(
          credentialData.authenticatorAttachment,
          credentialData.transports
        )

      // Store credential with attestation data for server verification
      // User is authenticated — pass token for auth gate (existing credentials require auth)
      await storeCredential(
        user.value.id,
        {
          id: credentialData.id,
          rawId: credentialData.rawId,
          attestationObject: credentialData.attestationObject,
          clientDataJSON: credentialData.clientDataJSON,
          challenge,
          name,
          authenticatorAttachment:
            credentialData.authenticatorAttachment === 'platform' ? 'platform' : 'cross-platform',
          transports: credentialData.transports,
        },
        token.value ?? undefined
      )

      const newCredential: WebAuthnCredential = {
        id: credentialData.id,
        publicKey: credentialData.publicKey,
        transports: credentialData.transports,
        counter: 0,
        createdAt: new Date().toISOString(),
        lastUsed: new Date().toISOString(),
        name,
        type: credentialData.authenticatorAttachment === 'platform' ? 'platform' : 'cross-platform',
      }

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
  const processOAuthCallback = async (
    code: string,
    state: string,
    provider: string = 'github'
  ): Promise<boolean> => {
    isLoading.value = true
    error.value = null

    try {
      const response = await fetch(`/api/oauth/${provider}/callback?code=${code}&state=${state}`)

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
        if (result.refreshToken) {
          refreshTokenValue.value = result.refreshToken
          localStorage.setItem('refresh_token', result.refreshToken)
        }
        scheduleTokenRefresh(result.token)

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
    hasLocalSession,

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
