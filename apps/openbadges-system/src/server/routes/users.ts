import { Hono } from 'hono'
import { z } from 'zod'
import { userService } from '../services/user'
import { requireAdmin, requireSelfOrAdminFromParam } from '../middleware/auth'

const userRoutes = new Hono()

// Schemas
const paginationSchema = z.object({
  page: z.coerce.number().int().positive().default(1),
  limit: z.coerce.number().int().positive().max(100).default(10),
  search: z.string().optional(),
  role: z.string().optional(),
  status: z.string().optional(),
  dateFrom: z.string().optional(),
  dateTo: z.string().optional(),
})

const userCreateSchema = z.object({
  username: z.string().min(3),
  email: z.string().email(),
  firstName: z.string().min(1),
  lastName: z.string().min(1),
  avatar: z.string().url().optional(),
  isActive: z.boolean().default(true),
  roles: z.array(z.string()).default(['USER']),
})

const userUpdateSchema = userCreateSchema.partial()

const credentialSchema = z.object({
  id: z.string().min(1),
  publicKey: z.string().min(1),
  transports: z.array(z.string()).default([]),
  counter: z.number().int().nonnegative().default(0),
  createdAt: z.string().default(() => new Date().toISOString()),
  lastUsed: z.string().default(() => new Date().toISOString()),
  name: z.string().min(1),
  type: z.enum(['platform', 'cross-platform']),
})

// Get all users with pagination and filtering
userRoutes.get('/', requireAdmin, async c => {
  if (!userService) {
    return c.json({ error: 'User service unavailable' }, 503)
  }
  try {
    const parsed = paginationSchema.safeParse(c.req.query())
    if (!parsed.success) {
      return c.json({ error: 'Invalid query parameters' }, 400)
    }
    const { page, limit, search = '', role, status, dateFrom, dateTo } = parsed.data
    const filters = {
      role,
      status,
      dateFrom,
      dateTo,
    }

    const { users, total } = await userService.getUsers(page, limit, search, filters)
    return c.json({ users, total })
  } catch (err) {
    console.error('Error fetching users:', err)
    return c.json({ error: 'Failed to fetch users' }, 500)
  }
})

// Create new user
userRoutes.post('/', requireAdmin, async c => {
  if (!userService) {
    return c.json({ error: 'User service unavailable' }, 503)
  }
  try {
    let body: unknown
    try {
      body = await c.req.json()
    } catch {
      return c.json({ error: 'Invalid JSON body' }, 400)
    }
    const parsed = userCreateSchema.safeParse(body)
    if (!parsed.success) {
      return c.json({ error: 'Invalid user data' }, 400)
    }
    const newUser = await userService.createUser(parsed.data)
    return c.json(newUser, 201)
  } catch (err) {
    console.error('Error creating user:', err)
    return c.json({ error: 'Failed to create user' }, 500)
  }
})

// Get user by ID
userRoutes.get('/:id', requireSelfOrAdminFromParam('id'), async c => {
  if (!userService) {
    return c.json({ error: 'User service unavailable' }, 503)
  }
  try {
    const userId = c.req.param('id')
    const user = await userService.getUserById(userId)
    if (!user) return c.json({ error: 'User not found' }, 404)
    return c.json(user)
  } catch (err) {
    console.error('Error fetching user by ID:', err)
    return c.json({ error: 'Failed to fetch user' }, 500)
  }
})

// Update user
userRoutes.put('/:id', requireSelfOrAdminFromParam('id'), async c => {
  if (!userService) {
    return c.json({ error: 'User service unavailable' }, 503)
  }
  try {
    const userId = c.req.param('id')
    let body: unknown
    try {
      body = await c.req.json()
    } catch {
      return c.json({ error: 'Invalid JSON body' }, 400)
    }
    const parsed = userUpdateSchema.safeParse(body)
    if (!parsed.success) {
      return c.json({ error: 'Invalid user data' }, 400)
    }
    const updatedUser = await userService.updateUser(userId, parsed.data)
    if (!updatedUser) return c.json({ error: 'User not found' }, 404)
    return c.json(updatedUser)
  } catch (err) {
    console.error('Error updating user:', err)
    return c.json({ error: 'Failed to update user' }, 500)
  }
})

// Delete user
userRoutes.delete('/:id', requireAdmin, async c => {
  if (!userService) {
    return c.json({ error: 'User service unavailable' }, 503)
  }
  try {
    const userId = c.req.param('id')
    await userService.deleteUser(userId)
    return c.json({ success: true })
  } catch (err) {
    console.error('Error deleting user:', err)
    return c.json({ error: 'Failed to delete user' }, 500)
  }
})

// Add user credential
userRoutes.post('/:id/credentials', requireSelfOrAdminFromParam('id'), async c => {
  if (!userService) {
    return c.json({ error: 'User service unavailable' }, 503)
  }
  try {
    const userId = c.req.param('id')
    let body: unknown
    try {
      body = await c.req.json()
    } catch {
      return c.json({ error: 'Invalid JSON body' }, 400)
    }
    const parsed = credentialSchema.safeParse(body)
    if (!parsed.success) {
      return c.json({ error: 'Invalid credential data' }, 400)
    }
    await userService.addUserCredential(userId, parsed.data)
    return c.json({ success: true })
  } catch (err) {
    console.error('Error adding user credential:', err)
    return c.json({ error: 'Failed to add credential' }, 500)
  }
})

// Get user credentials
userRoutes.get('/:id/credentials', requireSelfOrAdminFromParam('id'), async c => {
  if (!userService) {
    return c.json({ error: 'User service unavailable' }, 503)
  }
  try {
    const userId = c.req.param('id')
    const credentials = await userService.getUserCredentials(userId)
    return c.json(credentials)
  } catch (err) {
    console.error('Error fetching user credentials:', err)
    return c.json({ error: 'Failed to fetch credentials' }, 500)
  }
})

// Remove user credential
userRoutes.delete('/:id/credentials/:credentialId', requireSelfOrAdminFromParam('id'), async c => {
  if (!userService) {
    return c.json({ error: 'User service unavailable' }, 503)
  }
  try {
    const userId = c.req.param('id')
    const credentialId = c.req.param('credentialId')
    await userService.removeUserCredential(userId, credentialId)
    return c.json({ success: true })
  } catch (err) {
    console.error('Error removing user credential:', err)
    return c.json({ error: 'Failed to remove credential' }, 500)
  }
})

export { userRoutes }
