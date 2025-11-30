import { describe, it, expect, vi, beforeEach } from 'vitest'
import { OpenBadgesService } from '../openbadges'
import type { User } from '@/composables/useAuth'

// Mock localStorage
Object.defineProperty(global, 'localStorage', {
  value: {
    getItem: vi.fn(() => 'mock-auth-token'),
    setItem: vi.fn(),
    removeItem: vi.fn(),
  },
})

describe('OpenBadgesService', () => {
  let service: OpenBadgesService
  let mockUser: User
  let mockFetch: ReturnType<typeof vi.fn>

  beforeEach(() => {
    vi.clearAllMocks()
    service = new OpenBadgesService()
    mockUser = {
      id: 'test-user',
      username: 'testuser',
      email: 'test@example.com',
      firstName: 'Test',
      lastName: 'User',
      avatar: undefined,
      isAdmin: false,
      createdAt: new Date().toISOString(),
      credentials: [],
    }

    mockFetch = vi.fn()
    // Cast to unknown first to avoid Bun's fetch.preconnect type requirement
    global.fetch = mockFetch as unknown as typeof fetch
  })

  describe('getOAuthToken', () => {
    it('should get OAuth token successfully', async () => {
      const mockToken = 'test-oauth-token'
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve({ access_token: mockToken }),
      })

      const token = await service.getOAuthToken(mockUser)

      expect(token).toBe(mockToken)
      expect(mockFetch).toHaveBeenCalledWith('/api/auth/oauth-token', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: 'Bearer mock-auth-token',
        },
        body: JSON.stringify({ userId: mockUser.id }),
      })
    })

    it('should throw error when OAuth token request fails', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: false,
        status: 500,
        json: vi.fn().mockResolvedValue({ error: 'Internal server error' }),
      })

      await expect(service.getOAuthToken(mockUser)).rejects.toThrow('Internal server error')
    })

    it('should throw authentication error for 401 status', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: false,
        status: 401,
      })

      await expect(service.getOAuthToken(mockUser)).rejects.toThrow(
        'Authentication required. Please log in again.'
      )
    })
  })

  describe('refreshOAuthToken', () => {
    it('should refresh OAuth token successfully', async () => {
      const oauthMock = 'oauth-refreshed'
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve({ access_token: oauthMock }),
      })

      const token = await service.refreshOAuthToken(mockUser)

      expect(token).toBe(oauthMock)
      expect(mockFetch).toHaveBeenCalledWith('/api/auth/oauth-token/refresh', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: 'Bearer mock-auth-token',
        },
        body: JSON.stringify({ userId: mockUser.id }),
      })
    })

    it('should throw error when token refresh fails', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: false,
        status: 500,
        json: vi.fn().mockResolvedValue({ error: 'Internal server error' }),
      })

      await expect(service.refreshOAuthToken(mockUser)).rejects.toThrow('Internal server error')
    })
  })

  describe('createApiClient', () => {
    it('should create API client with correct headers', async () => {
      const oauthMock = 'oauth-test'
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve({ access_token: oauthMock }),
      })

      const client = await service.createApiClient(mockUser)

      expect(client.token).toBe(oauthMock)
      expect(client.headers).toEqual({
        Authorization: `Bearer ${oauthMock}`,
        'Content-Type': 'application/json',
      })
    })
  })

  describe('getUserBackpack', () => {
    it('should get user backpack successfully', async () => {
      const oauthMock = 'oauth-test'
      const mockBackpack = {
        assertions: [{ id: 'assertion-1', badgeClass: 'badge-1', recipient: 'test@example.com' }],
        total: 1,
      }

      mockFetch
        .mockResolvedValueOnce({
          ok: true,
          json: () => Promise.resolve({ access_token: oauthMock }),
        })
        .mockResolvedValueOnce({
          ok: true,
          json: () => Promise.resolve(mockBackpack),
        })

      const backpack = await service.getUserBackpack(mockUser)

      expect(backpack).toEqual(mockBackpack)
      expect(mockFetch).toHaveBeenCalledWith('http://localhost:3000/api/v1/assertions', {
        headers: {
          Authorization: `Bearer ${oauthMock}`,
          'Content-Type': 'application/json',
        },
      })
    })

    it('should throw error when backpack request fails', async () => {
      const oauthMock = 'oauth-test'
      mockFetch
        .mockResolvedValueOnce({
          ok: true,
          json: () => Promise.resolve({ access_token: oauthMock }),
        })
        .mockResolvedValueOnce({
          ok: false,
          status: 500,
        })

      await expect(service.getUserBackpack(mockUser)).rejects.toThrow(
        'Badge server error. Please try again later.'
      )
    })

    it('should refresh token and retry on 401 error', async () => {
      const oauthMock = 'oauth-test'
      const oauthRefreshed = 'oauth-refreshed'
      const mockBackpack = {
        assertions: [{ id: 'assertion-1', badgeClass: 'badge-1', recipient: 'test@example.com' }],
        total: 1,
      }

      mockFetch
        .mockResolvedValueOnce({
          ok: true,
          json: () => Promise.resolve({ access_token: oauthMock }),
        })
        .mockResolvedValueOnce({
          ok: false,
          status: 401,
        })
        .mockResolvedValueOnce({
          ok: true,
          json: () => Promise.resolve({ access_token: oauthRefreshed }),
        })
        .mockResolvedValueOnce({
          ok: true,
          json: () => Promise.resolve(mockBackpack),
        })

      const backpack = await service.getUserBackpack(mockUser)

      expect(backpack).toEqual(mockBackpack)
      expect(mockFetch).toHaveBeenNthCalledWith(2, 'http://localhost:3000/api/v1/assertions', {
        headers: {
          Authorization: `Bearer ${oauthMock}`,
          'Content-Type': 'application/json',
        },
      })
      expect(mockFetch).toHaveBeenNthCalledWith(4, 'http://localhost:3000/api/v1/assertions', {
        headers: {
          Authorization: `Bearer ${oauthRefreshed}`,
          'Content-Type': 'application/json',
        },
      })
    })
  })

  describe('addBadgeToBackpack', () => {
    it('should add badge to backpack successfully', async () => {
      const mockToken = 'test-oauth-token'
      const mockAssertion = {
        id: 'new-assertion',
        badgeClass: 'badge-class-1',
        recipient: 'test@example.com',
      }

      mockFetch
        .mockResolvedValueOnce({
          ok: true,
          json: () => Promise.resolve({ access_token: mockToken }),
        })
        .mockResolvedValueOnce({
          ok: true,
          json: () => Promise.resolve(mockAssertion),
        })

      const result = await service.addBadgeToBackpack(
        mockUser,
        'badge-class-1',
        'evidence',
        'narrative'
      )

      expect(result).toEqual(mockAssertion)
      expect(mockFetch).toHaveBeenCalledWith('http://localhost:3000/api/v1/assertions', {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${mockToken}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          badgeClass: 'badge-class-1',
          recipient: 'test@example.com',
          evidence: 'evidence',
          narrative: 'narrative',
        }),
      })
    })

    it('should throw error when add badge request fails', async () => {
      const mockToken = 'test-oauth-token'
      mockFetch
        .mockResolvedValueOnce({
          ok: true,
          json: () => Promise.resolve({ access_token: mockToken }),
        })
        .mockResolvedValueOnce({
          ok: false,
          status: 400,
        })

      await expect(service.addBadgeToBackpack(mockUser, 'badge-class-1')).rejects.toThrow(
        'Invalid request. Please check your input and try again.'
      )
    })
  })

  describe('removeBadgeFromBackpack', () => {
    it('should remove badge from backpack successfully', async () => {
      const mockToken = 'test-jwt-token'
      mockFetch
        .mockResolvedValueOnce({
          ok: true,
          json: () => Promise.resolve({ access_token: mockToken }),
        })
        .mockResolvedValueOnce({
          ok: true,
        })

      await service.removeBadgeFromBackpack(mockUser, 'assertion-1')

      expect(mockFetch).toHaveBeenCalledWith('/api/auth/oauth-token', {
        method: 'POST',
        headers: {
          Authorization: 'Bearer mock-auth-token',
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ userId: 'test-user' }),
      })
      expect(mockFetch).toHaveBeenCalledWith(
        'http://localhost:3000/api/v1/assertions/assertion-1',
        {
          method: 'DELETE',
          headers: {
            Authorization: `Bearer ${mockToken}`,
            'Content-Type': 'application/json',
          },
        }
      )
    })

    it('should throw error when remove badge request fails', async () => {
      const mockToken = 'test-jwt-token'
      mockFetch
        .mockResolvedValueOnce({
          ok: true,
          json: () => Promise.resolve({ access_token: mockToken }),
        })
        .mockResolvedValueOnce({
          ok: false,
          status: 404,
        })

      await expect(service.removeBadgeFromBackpack(mockUser, 'assertion-1')).rejects.toThrow(
        'Resource not found. The requested item may not exist.'
      )
    })
  })

  describe('getBadgeClasses', () => {
    it('should get badge classes successfully with user authentication', async () => {
      const mockToken = 'test-oauth-token'
      const mockBadgeClasses = [
        { id: 'badge-1', name: 'Badge 1' },
        { id: 'badge-2', name: 'Badge 2' },
      ]

      mockFetch
        .mockResolvedValueOnce({
          ok: true,
          json: () => Promise.resolve({ access_token: mockToken }),
        })
        .mockResolvedValueOnce({
          ok: true,
          json: () => Promise.resolve(mockBadgeClasses),
        })

      const badgeClasses = await service.getBadgeClasses(mockUser)

      expect(badgeClasses).toEqual(mockBadgeClasses)
      expect(mockFetch).toHaveBeenCalledWith('http://localhost:3000/api/v2/badge-classes', {
        headers: {
          Authorization: `Bearer ${mockToken}`,
          'Content-Type': 'application/json',
        },
      })
    })

    it('should get badge classes successfully without authentication', async () => {
      const mockBadgeClasses = [
        { id: 'badge-1', name: 'Badge 1' },
        { id: 'badge-2', name: 'Badge 2' },
      ]

      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve(mockBadgeClasses),
      })

      const badgeClasses = await service.getBadgeClasses()

      expect(badgeClasses).toEqual(mockBadgeClasses)
      // Note: Unauthenticated reads go through the platform proxy endpoints
      // (/api/badges/*) rather than direct badge server routes (/api/v2/*).
      // This keeps CORS and error handling centralized on the platform API.
      expect(mockFetch).toHaveBeenCalledWith(
        '/api/badges/badge-classes',
        expect.objectContaining({
          headers: { 'Content-Type': 'application/json' },
        })
      )
    })

    it('should throw error when badge classes request fails', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: false,
        status: 500,
      })

      await expect(service.getBadgeClasses()).rejects.toThrow(
        'Badge server error. Please try again later.'
      )
    })
  })

  describe('createBadgeClass', () => {
    it('should create badge class successfully', async () => {
      const mockToken = 'test-jwt-token'
      const mockBadgeClass = { name: 'New Badge', description: 'A new badge' }
      const mockCreatedBadge = { id: 'new-badge-id', ...mockBadgeClass }

      mockFetch
        .mockResolvedValueOnce({
          ok: true,
          json: () => Promise.resolve({ access_token: mockToken }),
        })
        .mockResolvedValueOnce({
          ok: true,
          json: () => Promise.resolve(mockCreatedBadge),
        })

      const result = await service.createBadgeClass(mockUser, mockBadgeClass)

      expect(result).toEqual(mockCreatedBadge)
      expect(mockFetch).toHaveBeenCalledWith('/api/auth/oauth-token', {
        method: 'POST',
        headers: {
          Authorization: 'Bearer mock-auth-token',
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ userId: 'test-user' }),
      })
      expect(mockFetch).toHaveBeenCalledWith('http://localhost:3000/api/v2/badge-classes', {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${mockToken}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(mockBadgeClass),
      })
    })

    it('should throw error when create badge class request fails', async () => {
      const mockToken = 'test-jwt-token'
      mockFetch
        .mockResolvedValueOnce({
          ok: true,
          json: () => Promise.resolve({ access_token: mockToken }),
        })
        .mockResolvedValueOnce({
          ok: false,
          status: 400,
        })

      await expect(service.createBadgeClass(mockUser, { name: 'Test Badge' })).rejects.toThrow(
        'Invalid request. Please check your input and try again.'
      )
    })
  })

  describe('issueBadge', () => {
    it('should issue badge successfully', async () => {
      const mockToken = 'test-jwt-token'
      const mockIssuedBadge = {
        id: 'issued-badge-id',
        badgeClass: 'badge-class-1',
        recipient: 'recipient@example.com',
      }

      mockFetch
        .mockResolvedValueOnce({
          ok: true,
          json: () => Promise.resolve({ access_token: mockToken }),
        })
        .mockResolvedValueOnce({
          ok: true,
          json: () => Promise.resolve(mockIssuedBadge),
        })

      const result = await service.issueBadge(
        mockUser,
        'badge-class-1',
        'recipient@example.com',
        'evidence',
        'narrative'
      )

      expect(result).toEqual(mockIssuedBadge)
      expect(mockFetch).toHaveBeenCalledWith('/api/auth/oauth-token', {
        method: 'POST',
        headers: {
          Authorization: 'Bearer mock-auth-token',
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ userId: 'test-user' }),
      })
      expect(mockFetch).toHaveBeenCalledWith('http://localhost:3000/api/v2/assertions', {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${mockToken}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          badgeClass: 'badge-class-1',
          recipient: 'recipient@example.com',
          evidence: 'evidence',
          narrative: 'narrative',
        }),
      })
    })

    it('should throw error when issue badge request fails', async () => {
      const mockToken = 'test-jwt-token'
      mockFetch
        .mockResolvedValueOnce({
          ok: true,
          json: () => Promise.resolve({ access_token: mockToken }),
        })
        .mockResolvedValueOnce({
          ok: false,
          status: 403,
        })

      await expect(
        service.issueBadge(mockUser, 'badge-class-1', 'recipient@example.com')
      ).rejects.toThrow('Permission denied. You do not have access to this resource.')
    })
  })
})
