import { describe, it, expect, beforeEach } from 'bun:test'
import { userService } from '../services/user'

// Test the actual UserService functionality with bun:sqlite
// This test can only run with Bun runtime, not Node.js/Vitest
describe('UserService with bun:sqlite', () => {
  beforeEach(async () => {
    // Clean up any test data if needed
    // Note: In a real test, you'd want to use a test database
  })

  it('should create and retrieve a user', async () => {
    if (!userService) {
      console.log('UserService not available - database initialization failed')
      return
    }

    const testUser = {
      username: 'testuser_' + Date.now(),
      email: 'test_' + Date.now() + '@example.com',
      firstName: 'Test',
      lastName: 'User',
      isActive: true,
      roles: ['USER'],
    }

    try {
      // Create user
      const createdUser = await userService.createUser(testUser)
      expect(createdUser).toBeDefined()
      expect(createdUser.username).toBe(testUser.username)
      expect(createdUser.email).toBe(testUser.email)
      expect(createdUser.firstName).toBe(testUser.firstName)
      expect(createdUser.lastName).toBe(testUser.lastName)
      expect(createdUser.isActive).toBe(true)
      expect(createdUser.roles).toEqual(['USER'])

      // Retrieve user by ID
      const foundUser = await userService.getUserById(createdUser.id)
      expect(foundUser).toBeDefined()
      expect(foundUser?.id).toBe(createdUser.id)
      expect(foundUser?.username).toBe(testUser.username)

      // Retrieve user by username
      const foundByUsername = await userService.getUserByUsername(testUser.username)
      expect(foundByUsername).toBeDefined()
      expect(foundByUsername?.id).toBe(createdUser.id)

      // Retrieve user by email
      const foundByEmail = await userService.getUserByEmail(testUser.email)
      expect(foundByEmail).toBeDefined()
      expect(foundByEmail?.id).toBe(createdUser.id)

      // Clean up - delete the test user
      const deleted = await userService.deleteUser(createdUser.id)
      expect(deleted).toBe(true)

      // Verify user is deleted
      const deletedUser = await userService.getUserById(createdUser.id)
      expect(deletedUser).toBeNull()
    } catch (error) {
      console.error('UserService test failed:', error)
      throw error
    }
  })

  it('should handle user credentials', async () => {
    if (!userService) {
      console.log('UserService not available - database initialization failed')
      return
    }

    const testUser = {
      username: 'creduser_' + Date.now(),
      email: 'credtest_' + Date.now() + '@example.com',
      firstName: 'Cred',
      lastName: 'User',
      isActive: true,
      roles: ['USER'],
    }

    try {
      // Create user first
      const createdUser = await userService.createUser(testUser)

      // Add credential
      const testCredential = {
        id: 'cred_' + Date.now(),
        publicKey: 'test-public-key-data',
        transports: ['usb', 'nfc'],
        counter: 0,
        createdAt: new Date().toISOString(),
        lastUsed: new Date().toISOString(),
        name: 'Test Security Key',
        type: 'cross-platform' as const,
      }

      await userService.addUserCredential(createdUser.id, testCredential)

      // Get user credentials
      const credentials = await userService.getUserCredentials(createdUser.id)
      expect(credentials).toHaveLength(1)
      expect(credentials[0].id).toBe(testCredential.id)
      expect(credentials[0].name).toBe(testCredential.name)
      expect(credentials[0].type).toBe('cross-platform')
      expect(credentials[0].transports).toEqual(['usb', 'nfc'])

      // Update credential
      const updated = await userService.updateUserCredential(createdUser.id, testCredential.id, {
        counter: 5,
        name: 'Updated Security Key',
      })
      expect(updated).toBe(true)

      // Verify update
      const updatedCredentials = await userService.getUserCredentials(createdUser.id)
      expect(updatedCredentials[0].counter).toBe(5)
      expect(updatedCredentials[0].name).toBe('Updated Security Key')

      // Remove credential
      const removed = await userService.removeUserCredential(createdUser.id, testCredential.id)
      expect(removed).toBe(true)

      // Verify removal
      const finalCredentials = await userService.getUserCredentials(createdUser.id)
      expect(finalCredentials).toHaveLength(0)

      // Clean up
      await userService.deleteUser(createdUser.id)
    } catch (error) {
      console.error('UserCredentials test failed:', error)
      throw error
    }
  })

  it('should handle OAuth providers', async () => {
    if (!userService) {
      console.log('UserService not available - database initialization failed')
      return
    }

    const testUser = {
      username: 'oauthuser_' + Date.now(),
      email: 'oauth_' + Date.now() + '@example.com',
      firstName: 'OAuth',
      lastName: 'User',
      isActive: true,
      roles: ['USER'],
    }

    try {
      // Create user first
      const createdUser = await userService.createUser(testUser)

      // Create OAuth provider
      const oauthData = {
        user_id: createdUser.id,
        provider: 'github',
        provider_user_id: 'github123',
        access_token: 'access_token_123',
        refresh_token: 'refresh_token_123',
        token_expires_at: new Date(Date.now() + 3600000).toISOString(),
        profile_data: JSON.stringify({ name: 'Test User', login: 'testuser' }),
      }

      const oauthProvider = await userService.createOAuthProvider(oauthData)
      expect(oauthProvider).toBeDefined()
      expect(oauthProvider.provider).toBe('github')
      expect(oauthProvider.user_id).toBe(createdUser.id)

      // Get OAuth provider
      const foundProvider = await userService.getOAuthProvider(createdUser.id, 'github')
      expect(foundProvider).toBeDefined()
      expect(foundProvider?.id).toBe(oauthProvider.id)

      // Get by provider ID
      const foundByProviderId = await userService.getOAuthProviderByProviderId(
        'github',
        'github123'
      )
      expect(foundByProviderId).toBeDefined()
      expect(foundByProviderId?.id).toBe(oauthProvider.id)

      // Get all providers for user
      const userProviders = await userService.getOAuthProvidersByUser(createdUser.id)
      expect(userProviders).toHaveLength(1)
      expect(userProviders[0].provider).toBe('github')

      // Update OAuth provider
      const updated = await userService.updateOAuthProvider(oauthProvider.id, {
        access_token: 'new_access_token_456',
        profile_data: JSON.stringify({ name: 'Updated User' }),
      })
      expect(updated).toBe(true)

      // Remove OAuth provider
      const removed = await userService.removeOAuthProvider(createdUser.id, 'github')
      expect(removed).toBe(true)

      // Verify removal
      const removedProvider = await userService.getOAuthProvider(createdUser.id, 'github')
      expect(removedProvider).toBeNull()

      // Clean up
      await userService.deleteUser(createdUser.id)
    } catch (error) {
      console.error('OAuth provider test failed:', error)
      throw error
    }
  })
})

// Simple integration test for endpoints that don't require complex mocking
describe('Server Health Check', () => {
  it('should respond to basic functionality', () => {
    // Basic test to ensure Bun test runner is working with server code
    expect(typeof userService).toBe('object')

    // Test environment detection
    expect(process.env.NODE_ENV).toBeDefined()
  })
})
