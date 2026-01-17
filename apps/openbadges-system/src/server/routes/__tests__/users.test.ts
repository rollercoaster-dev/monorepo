import { describe, it, expect, vi, beforeEach } from 'vitest'
import { Hono } from 'hono'

// Mock userService
vi.mock('../../services/user', () => ({
  userService: {
    getUsers: vi.fn(),
    createUser: vi.fn(),
    getUserById: vi.fn(),
    updateUser: vi.fn(),
    deleteUser: vi.fn(),
    addUserCredential: vi.fn(),
    getUserCredentials: vi.fn(),
    removeUserCredential: vi.fn(),
  },
}))

// Mock auth middleware
vi.mock('../../middleware/auth', () => ({
  requireAdmin: vi.fn((c: any, next: any) => next()),
  requireSelfOrAdminFromParam: vi.fn(() => (c: any, next: any) => next()),
}))

import { userRoutes } from '../users'
import { userService } from '../../services/user'
import { jwtService } from '../../services/jwt'

function createApp() {
  const app = new Hono()
  app.route('/users', userRoutes)
  return app
}

describe('Users Routes', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    // Default admin token verification
    jwtService.verifyToken = vi.fn().mockReturnValue({
      sub: 'admin-1',
      metadata: { isAdmin: true },
    })
  })

  describe('GET /users', () => {
    it('should return paginated users with default pagination', async () => {
      const mockUsers = [
        {
          id: 'user-1',
          username: 'user1',
          email: 'user1@example.com',
          firstName: 'User',
          lastName: 'One',
          isActive: true,
          roles: ['USER'],
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
        },
        {
          id: 'user-2',
          username: 'user2',
          email: 'user2@example.com',
          firstName: 'User',
          lastName: 'Two',
          isActive: true,
          roles: ['USER'],
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
        },
      ]
      vi.mocked(userService!.getUsers).mockResolvedValue({
        users: mockUsers,
        total: 2,
      })

      const app = createApp()
      const res = await app.request('/users')

      expect(res.status).toBe(200)
      const data = await res.json()
      expect(data.users).toEqual(mockUsers)
      expect(data.total).toBe(2)
      expect(userService!.getUsers).toHaveBeenCalledWith(1, 10, '', {
        role: undefined,
        status: undefined,
        dateFrom: undefined,
        dateTo: undefined,
      })
    })

    it('should return paginated users with custom pagination and filters', async () => {
      const mockUsers = [
        {
          id: 'user-1',
          username: 'admin',
          email: 'admin@example.com',
          firstName: 'Admin',
          lastName: 'User',
          isActive: true,
          roles: ['ADMIN'],
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
        },
      ]
      vi.mocked(userService!.getUsers).mockResolvedValue({
        users: mockUsers,
        total: 1,
      })

      const app = createApp()
      const res = await app.request(
        '/users?page=2&limit=5&search=admin&role=ADMIN&status=active&dateFrom=2024-01-01&dateTo=2024-12-31'
      )

      expect(res.status).toBe(200)
      const data = await res.json()
      expect(data.users).toEqual(mockUsers)
      expect(userService!.getUsers).toHaveBeenCalledWith(2, 5, 'admin', {
        role: 'ADMIN',
        status: 'active',
        dateFrom: '2024-01-01',
        dateTo: '2024-12-31',
      })
    })

    it('should return 400 for invalid query parameters', async () => {
      const app = createApp()
      const res = await app.request('/users?page=0&limit=200')

      expect(res.status).toBe(400)
      const data = await res.json()
      expect(data.error).toBe('Invalid query parameters')
    })

    it('should return 500 on service errors', async () => {
      vi.mocked(userService!.getUsers).mockRejectedValue(new Error('Database error'))

      const app = createApp()
      const res = await app.request('/users')

      expect(res.status).toBe(500)
      const data = await res.json()
      expect(data.error).toBe('Failed to fetch users')
    })
  })

  describe('POST /users', () => {
    it('should create new user with valid data', async () => {
      const newUser = {
        username: 'newuser',
        email: 'newuser@example.com',
        firstName: 'New',
        lastName: 'User',
      }
      const createdUser = {
        id: 'user-new',
        ...newUser,
        isActive: true,
        roles: ['USER'],
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      }
      vi.mocked(userService!.createUser).mockResolvedValue(createdUser as any)

      const app = createApp()
      const res = await app.request('/users', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(newUser),
      })

      expect(res.status).toBe(201)
      const data = await res.json()
      expect(data).toEqual(createdUser)
      expect(userService!.createUser).toHaveBeenCalledWith({
        ...newUser,
        isActive: true,
        roles: ['USER'],
      })
    })

    it('should return 400 for invalid JSON body', async () => {
      const app = createApp()
      const res = await app.request('/users', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: 'invalid json',
      })

      expect(res.status).toBe(400)
      const data = await res.json()
      expect(data.error).toBe('Invalid JSON body')
    })

    it('should return 400 for invalid user data - missing fields', async () => {
      const app = createApp()
      const res = await app.request('/users', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username: 'test' }),
      })

      expect(res.status).toBe(400)
      const data = await res.json()
      expect(data.error).toBe('Invalid user data')
    })

    it('should return 400 for invalid email', async () => {
      const app = createApp()
      const res = await app.request('/users', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          username: 'testuser',
          email: 'not-an-email',
          firstName: 'Test',
          lastName: 'User',
        }),
      })

      expect(res.status).toBe(400)
      const data = await res.json()
      expect(data.error).toBe('Invalid user data')
    })

    it('should return 400 for short username', async () => {
      const app = createApp()
      const res = await app.request('/users', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          username: 'ab',
          email: 'test@example.com',
          firstName: 'Test',
          lastName: 'User',
        }),
      })

      expect(res.status).toBe(400)
      const data = await res.json()
      expect(data.error).toBe('Invalid user data')
    })

    it('should return 500 on service errors', async () => {
      vi.mocked(userService!.createUser).mockRejectedValue(new Error('Database error'))

      const app = createApp()
      const res = await app.request('/users', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          username: 'test',
          email: 'test@example.com',
          firstName: 'Test',
          lastName: 'User',
        }),
      })

      expect(res.status).toBe(500)
      const data = await res.json()
      expect(data.error).toBe('Failed to create user')
    })
  })

  describe('GET /users/:id', () => {
    it('should return user by ID', async () => {
      const mockUser = {
        id: 'user-123',
        username: 'testuser',
        email: 'test@example.com',
        firstName: 'Test',
        lastName: 'User',
        isActive: true,
        roles: ['USER'],
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      }
      vi.mocked(userService!.getUserById).mockResolvedValue(mockUser as any)

      const app = createApp()
      const res = await app.request('/users/user-123')

      expect(res.status).toBe(200)
      const data = await res.json()
      expect(data).toEqual(mockUser)
      expect(userService!.getUserById).toHaveBeenCalledWith('user-123')
    })

    it('should return 404 when user not found', async () => {
      vi.mocked(userService!.getUserById).mockResolvedValue(null)

      const app = createApp()
      const res = await app.request('/users/nonexistent')

      expect(res.status).toBe(404)
      const data = await res.json()
      expect(data.error).toBe('User not found')
    })

    it('should return 500 on service errors', async () => {
      vi.mocked(userService!.getUserById).mockRejectedValue(new Error('Database error'))

      const app = createApp()
      const res = await app.request('/users/user-123')

      expect(res.status).toBe(500)
      const data = await res.json()
      expect(data.error).toBe('Failed to fetch user')
    })
  })

  describe('PUT /users/:id', () => {
    it('should update user with partial data', async () => {
      const updateData = { firstName: 'Updated' }
      const updatedUser = {
        id: 'user-123',
        username: 'testuser',
        email: 'test@example.com',
        firstName: 'Updated',
        lastName: 'User',
        isActive: true,
        roles: ['USER'],
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      }
      vi.mocked(userService!.updateUser).mockResolvedValue(updatedUser as any)

      const app = createApp()
      const res = await app.request('/users/user-123', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(updateData),
      })

      expect(res.status).toBe(200)
      const data = await res.json()
      expect(data).toEqual(updatedUser)
      // The userUpdateSchema is a partial with defaults, so isActive and roles get added
      expect(userService!.updateUser).toHaveBeenCalledWith('user-123', {
        firstName: 'Updated',
        isActive: true,
        roles: ['USER'],
      })
    })

    it('should return 404 when user not found', async () => {
      vi.mocked(userService!.updateUser).mockResolvedValue(null)

      const app = createApp()
      const res = await app.request('/users/nonexistent', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ firstName: 'Test' }),
      })

      expect(res.status).toBe(404)
      const data = await res.json()
      expect(data.error).toBe('User not found')
    })

    it('should return 400 for invalid JSON body', async () => {
      const app = createApp()
      const res = await app.request('/users/user-123', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: 'invalid json',
      })

      expect(res.status).toBe(400)
      const data = await res.json()
      expect(data.error).toBe('Invalid JSON body')
    })

    it('should return 400 for invalid user data', async () => {
      const app = createApp()
      const res = await app.request('/users/user-123', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: 'not-an-email' }),
      })

      expect(res.status).toBe(400)
      const data = await res.json()
      expect(data.error).toBe('Invalid user data')
    })

    it('should return 500 on service errors', async () => {
      vi.mocked(userService!.updateUser).mockRejectedValue(new Error('Database error'))

      const app = createApp()
      const res = await app.request('/users/user-123', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ firstName: 'Test' }),
      })

      expect(res.status).toBe(500)
      const data = await res.json()
      expect(data.error).toBe('Failed to update user')
    })
  })

  describe('DELETE /users/:id', () => {
    it('should delete user successfully', async () => {
      vi.mocked(userService!.deleteUser).mockResolvedValue(true as any)

      const app = createApp()
      const res = await app.request('/users/user-123', { method: 'DELETE' })

      expect(res.status).toBe(200)
      const data = await res.json()
      expect(data.success).toBe(true)
      expect(userService!.deleteUser).toHaveBeenCalledWith('user-123')
    })

    it('should return 500 on service errors', async () => {
      vi.mocked(userService!.deleteUser).mockRejectedValue(new Error('Database error'))

      const app = createApp()
      const res = await app.request('/users/user-123', { method: 'DELETE' })

      expect(res.status).toBe(500)
      const data = await res.json()
      expect(data.error).toBe('Failed to delete user')
    })
  })

  describe('POST /users/:id/credentials', () => {
    it('should add credential to user', async () => {
      const credential = {
        id: 'cred-123',
        publicKey: 'public-key-data',
        name: 'My Authenticator',
        type: 'platform' as const,
      }
      vi.mocked(userService!.addUserCredential).mockResolvedValue(true as any)

      const app = createApp()
      const res = await app.request('/users/user-123/credentials', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(credential),
      })

      expect(res.status).toBe(200)
      const data = await res.json()
      expect(data.success).toBe(true)
      expect(userService!.addUserCredential).toHaveBeenCalledWith(
        'user-123',
        expect.objectContaining({
          id: 'cred-123',
          publicKey: 'public-key-data',
          name: 'My Authenticator',
          type: 'platform',
        })
      )
    })

    it('should return 400 for invalid JSON body', async () => {
      const app = createApp()
      const res = await app.request('/users/user-123/credentials', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: 'invalid json',
      })

      expect(res.status).toBe(400)
      const data = await res.json()
      expect(data.error).toBe('Invalid JSON body')
    })

    it('should return 400 for missing required fields', async () => {
      const app = createApp()
      const res = await app.request('/users/user-123/credentials', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id: 'cred-123' }),
      })

      expect(res.status).toBe(400)
      const data = await res.json()
      expect(data.error).toBe('Invalid credential data')
    })

    it('should return 500 on service errors', async () => {
      vi.mocked(userService!.addUserCredential).mockRejectedValue(new Error('Database error'))

      const app = createApp()
      const res = await app.request('/users/user-123/credentials', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          id: 'cred-123',
          publicKey: 'key',
          name: 'Test',
          type: 'platform',
        }),
      })

      expect(res.status).toBe(500)
      const data = await res.json()
      expect(data.error).toBe('Failed to add credential')
    })
  })

  describe('GET /users/:id/credentials', () => {
    it('should return user credentials', async () => {
      const mockCredentials = [
        { id: 'cred-1', name: 'Authenticator 1', type: 'platform' },
        { id: 'cred-2', name: 'Authenticator 2', type: 'cross-platform' },
      ]
      vi.mocked(userService!.getUserCredentials).mockResolvedValue(mockCredentials as any)

      const app = createApp()
      const res = await app.request('/users/user-123/credentials')

      expect(res.status).toBe(200)
      const data = await res.json()
      expect(data).toEqual(mockCredentials)
      expect(userService!.getUserCredentials).toHaveBeenCalledWith('user-123')
    })

    it('should return 500 on service errors', async () => {
      vi.mocked(userService!.getUserCredentials).mockRejectedValue(new Error('Database error'))

      const app = createApp()
      const res = await app.request('/users/user-123/credentials')

      expect(res.status).toBe(500)
      const data = await res.json()
      expect(data.error).toBe('Failed to fetch credentials')
    })
  })

  describe('DELETE /users/:id/credentials/:credentialId', () => {
    it('should remove credential from user', async () => {
      vi.mocked(userService!.removeUserCredential).mockResolvedValue(true as any)

      const app = createApp()
      const res = await app.request('/users/user-123/credentials/cred-123', { method: 'DELETE' })

      expect(res.status).toBe(200)
      const data = await res.json()
      expect(data.success).toBe(true)
      expect(userService!.removeUserCredential).toHaveBeenCalledWith('user-123', 'cred-123')
    })

    it('should return 500 on service errors', async () => {
      vi.mocked(userService!.removeUserCredential).mockRejectedValue(new Error('Database error'))

      const app = createApp()
      const res = await app.request('/users/user-123/credentials/cred-123', { method: 'DELETE' })

      expect(res.status).toBe(500)
      const data = await res.json()
      expect(data.error).toBe('Failed to remove credential')
    })
  })
})
