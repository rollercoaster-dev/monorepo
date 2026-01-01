import { describe, it, expect, vi, beforeEach } from 'vitest'
import { UserSyncService } from '../userSync'
import type { User } from '../user'

describe('UserSyncService', () => {
  let service: UserSyncService
  let mockUser: User
  let mockFetch: ReturnType<typeof vi.fn>

  beforeEach(() => {
    vi.clearAllMocks()

    // Mock environment variables
    process.env.BADGE_SERVER_URL = 'http://localhost:3000'
    process.env.BADGE_SERVER_API_KEY = 'test-api-key'

    service = new UserSyncService()
    mockUser = {
      id: 'user-123',
      username: 'testuser',
      email: 'test@example.com',
      firstName: 'Test',
      lastName: 'User',
      avatar: 'https://example.com/avatar.jpg',
      isActive: true,
      roles: ['USER'],
      createdAt: '2023-01-01T00:00:00Z',
      updatedAt: '2023-01-01T00:00:00Z',
    }

    mockFetch = vi.fn()
    mockFetch.mockReset() // Ensure clean slate - no leftover implementations
    // Cast to unknown first to avoid Bun's fetch.preconnect type requirement
    global.fetch = mockFetch as unknown as typeof fetch
  })

  describe('getBadgeServerUser', () => {
    it('should find user by username', async () => {
      const mockBadgeServerUser = {
        id: 'badge-server-user-123',
        username: 'testuser',
        email: 'test@example.com',
        firstName: 'Test',
        lastName: 'User',
        isActive: true,
        roles: ['USER'],
        createdAt: '2023-01-01T00:00:00Z',
        updatedAt: '2023-01-01T00:00:00Z',
      }

      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve([mockBadgeServerUser]),
      })

      const result = await service.getBadgeServerUser('testuser')

      expect(result).toEqual(mockBadgeServerUser)
      expect(mockFetch).toHaveBeenCalledWith(
        'http://localhost:3000/api/v1/users?username=testuser',
        {
          headers: {
            'Content-Type': 'application/json',
            Authorization: 'Bearer test-api-key',
          },
        }
      )
    })

    it('should find user by email if not found by username', async () => {
      const mockBadgeServerUser = {
        id: 'badge-server-user-123',
        username: 'testuser',
        email: 'test@example.com',
        firstName: 'Test',
        lastName: 'User',
        isActive: true,
        roles: ['USER'],
        createdAt: '2023-01-01T00:00:00Z',
        updatedAt: '2023-01-01T00:00:00Z',
      }

      mockFetch
        .mockResolvedValueOnce({
          ok: true,
          json: () => Promise.resolve([]), // No users found by username
        })
        .mockResolvedValueOnce({
          ok: true,
          json: () => Promise.resolve([mockBadgeServerUser]),
        })

      const result = await service.getBadgeServerUser('test@example.com')

      expect(result).toEqual(mockBadgeServerUser)
      expect(mockFetch).toHaveBeenCalledTimes(2)
    })

    it('should return null if user not found', async () => {
      mockFetch
        .mockResolvedValueOnce({
          ok: true,
          json: () => Promise.resolve([]), // No users found by username
        })
        .mockResolvedValueOnce({
          ok: true,
          json: () => Promise.resolve([]), // No users found by email
        })

      const result = await service.getBadgeServerUser('nonexistent@example.com')

      expect(result).toBeNull()
      expect(mockFetch).toHaveBeenCalledTimes(2)
    })

    it('should return null on API error', async () => {
      mockFetch
        .mockResolvedValueOnce({
          ok: false,
          status: 500,
        })
        .mockResolvedValueOnce({
          ok: false,
          status: 500,
        })

      const result = await service.getBadgeServerUser('testuser')

      expect(result).toBeNull()
    })
  })

  describe('createBadgeServerUser', () => {
    it('should create user successfully', async () => {
      const mockCreatedUser = {
        id: 'badge-server-user-123',
        username: 'testuser',
        email: 'test@example.com',
        firstName: 'Test',
        lastName: 'User',
        isActive: true,
        roles: ['USER'],
        avatar: 'https://example.com/avatar.jpg',
        createdAt: '2023-01-01T00:00:00Z',
        updatedAt: '2023-01-01T00:00:00Z',
      }

      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve(mockCreatedUser),
      })

      const result = await service.createBadgeServerUser(mockUser)

      expect(result).toEqual(mockCreatedUser)
      expect(mockFetch).toHaveBeenCalledWith('http://localhost:3000/api/v1/users', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: 'Bearer test-api-key',
        },
        body: JSON.stringify({
          username: 'testuser',
          email: 'test@example.com',
          firstName: 'Test',
          lastName: 'User',
          isActive: true,
          roles: ['USER'],
          avatar: 'https://example.com/avatar.jpg',
        }),
      })
    })

    it('should return null on API error', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: false,
        status: 400,
        text: () => Promise.resolve('Bad request'),
      })

      const result = await service.createBadgeServerUser(mockUser)

      expect(result).toBeNull()
    })
  })

  describe('syncUser', () => {
    it('should create new user when not exists', async () => {
      const mockCreatedUser = {
        id: 'badge-server-user-123',
        username: 'testuser',
        email: 'test@example.com',
        firstName: 'Test',
        lastName: 'User',
        isActive: true,
        roles: ['USER'],
        avatar: 'https://example.com/avatar.jpg',
        createdAt: '2023-01-01T00:00:00Z',
        updatedAt: '2023-01-01T00:00:00Z',
      }

      // Mock calls for getBadgeServerUser(username) - 2 calls (username search, email search)
      mockFetch
        .mockResolvedValueOnce({
          ok: true,
          json: () => Promise.resolve([]), // No users found by username in first search
        } as Response)
        .mockResolvedValueOnce({
          ok: true,
          json: () => Promise.resolve([]), // No users found by email in first search
        } as Response)
        // Mock calls for getBadgeServerUser(email) - 2 calls (username search, email search)
        .mockResolvedValueOnce({
          ok: true,
          json: () => Promise.resolve([]), // No users found by username in second search
        } as Response)
        .mockResolvedValueOnce({
          ok: true,
          json: () => Promise.resolve([]), // No users found by email in second search
        } as Response)
        // Mock call for createBadgeServerUser
        .mockResolvedValueOnce({
          ok: true,
          json: () => Promise.resolve(mockCreatedUser), // Create user response
        } as Response)

      const result = await service.syncUser(mockUser)

      expect(result).toEqual({
        success: true,
        user: mockCreatedUser,
        created: true,
      })
      expect(mockFetch).toHaveBeenCalledTimes(5)
    })

    it('should update existing user when data differs', async () => {
      const mockExistingUser = {
        id: 'badge-server-user-123',
        username: 'testuser',
        email: 'old@example.com', // Different email
        firstName: 'Test',
        lastName: 'User',
        isActive: true,
        roles: ['USER'],
        avatar: 'https://example.com/avatar.jpg',
        createdAt: '2023-01-01T00:00:00Z',
        updatedAt: '2023-01-01T00:00:00Z',
      }

      const mockUpdatedUser = {
        ...mockExistingUser,
        email: 'test@example.com',
        updatedAt: '2023-01-02T00:00:00Z',
      }

      mockFetch
        .mockResolvedValueOnce({
          ok: true,
          json: () => Promise.resolve([mockExistingUser]),
        })
        .mockResolvedValueOnce({
          ok: true,
          json: () => Promise.resolve(mockUpdatedUser),
        })

      const result = await service.syncUser(mockUser)

      expect(result).toEqual({
        success: true,
        user: mockUpdatedUser,
        updated: true,
      })
      expect(mockFetch).toHaveBeenCalledTimes(2)
    })

    it('should return existing user when no update needed', async () => {
      const mockExistingUser = {
        id: 'badge-server-user-123',
        username: 'testuser',
        email: 'test@example.com',
        firstName: 'Test',
        lastName: 'User',
        isActive: true,
        roles: ['USER'],
        avatar: 'https://example.com/avatar.jpg',
        createdAt: '2023-01-01T00:00:00Z',
        updatedAt: '2023-01-01T00:00:00Z',
      }

      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve([mockExistingUser]),
      })

      const result = await service.syncUser(mockUser)

      expect(result).toEqual({
        success: true,
        user: mockExistingUser,
        updated: false,
      })
      expect(mockFetch).toHaveBeenCalledTimes(1)
    })

    it('should return error when sync fails', async () => {
      // Mock calls for getBadgeServerUser(username) - 2 calls (username search, email search)
      mockFetch
        .mockResolvedValueOnce({
          ok: true,
          json: () => Promise.resolve([]), // No users found by username in first search
        } as Response)
        .mockResolvedValueOnce({
          ok: true,
          json: () => Promise.resolve([]), // No users found by email in first search
        } as Response)
        // Mock calls for getBadgeServerUser(email) - 2 calls (username search, email search)
        .mockResolvedValueOnce({
          ok: true,
          json: () => Promise.resolve([]), // No users found by username in second search
        } as Response)
        .mockResolvedValueOnce({
          ok: true,
          json: () => Promise.resolve([]), // No users found by email in second search
        } as Response)
        // Mock createBadgeServerUser to fail
        .mockRejectedValueOnce(new Error('Network error'))

      const result = await service.syncUser(mockUser)

      expect(result).toEqual({
        success: false,
        error: 'Failed to create user in badge server',
      })
    })
  })

  describe('syncUserPermissions', () => {
    it('should sync user permissions successfully', async () => {
      const mockExistingUser = {
        id: 'badge-server-user-123',
        username: 'testuser',
        email: 'test@example.com',
        firstName: 'Test',
        lastName: 'User',
        isActive: true,
        roles: ['USER'],
        avatar: 'https://example.com/avatar.jpg',
        createdAt: '2023-01-01T00:00:00Z',
        updatedAt: '2023-01-01T00:00:00Z',
      }

      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve([mockExistingUser]),
      })

      const result = await service.syncUserPermissions(mockUser)

      expect(result).toBe(true)
    })

    it('should return false when sync fails', async () => {
      // Mock ALL fetch calls to fail consistently (not just the first one)
      // getBadgeServerUser makes 2 calls (username search, then email search)
      mockFetch.mockImplementation(() => {
        throw new Error('Network error')
      })

      const result = await service.syncUserPermissions(mockUser)

      expect(result).toBe(false)
    })
  })

  describe('getBadgeServerUserProfile', () => {
    it('should get user profile successfully', async () => {
      const mockProfile = {
        id: 'badge-server-user-123',
        username: 'testuser',
        email: 'test@example.com',
        firstName: 'Test',
        lastName: 'User',
        isActive: true,
        roles: ['USER'],
        avatar: 'https://example.com/avatar.jpg',
        createdAt: '2023-01-01T00:00:00Z',
        updatedAt: '2023-01-01T00:00:00Z',
      }

      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve(mockProfile),
      })

      const result = await service.getBadgeServerUserProfile('badge-server-user-123')

      expect(result).toEqual(mockProfile)
      expect(mockFetch).toHaveBeenCalledWith(
        'http://localhost:3000/api/v1/users/badge-server-user-123',
        {
          headers: {
            'Content-Type': 'application/json',
            Authorization: 'Bearer test-api-key',
          },
        }
      )
    })

    it('should return null when profile not found', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: false,
        status: 404,
      })

      const result = await service.getBadgeServerUserProfile('nonexistent-user')

      expect(result).toBeNull()
    })

    it('should return null on API error', async () => {
      // Use mockImplementation instead of mockRejectedValueOnce for consistent behavior
      mockFetch.mockImplementation(() => {
        throw new Error('Network error')
      })

      const result = await service.getBadgeServerUserProfile('user-123')

      expect(result).toBeNull()
    })
  })
})
