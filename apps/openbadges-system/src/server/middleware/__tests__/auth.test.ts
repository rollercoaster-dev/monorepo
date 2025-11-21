import { describe, it, expect, vi, beforeEach } from 'vitest'
import { Hono } from 'hono'
import { requireAuth, requireAdmin, requireSelfOrAdminFromParam } from '../auth'

// Mock jwtService used by middleware to control verification behavior
vi.mock('../../services/jwt', () => {
  return {
    jwtService: {
      verifyToken: vi.fn(),
    },
  }
})

import { jwtService } from '../../services/jwt'

function createAppWith(handler: (app: Hono) => void) {
  const app = new Hono()
  handler(app)
  return app
}

describe('Auth middleware', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  describe('requireAuth', () => {
    it('returns 401 when Authorization header is missing', async () => {
      const app = createAppWith(app => {
        app.get('/secure', requireAuth, c => c.text('ok'))
      })

      const res = await app.request('/secure')
      expect(res.status).toBe(401)
    })

    it('returns 401 when token verification fails', async () => {
      jwtService.verifyToken = vi.fn().mockReturnValue(null)
      const app = createAppWith(app => {
        app.get('/secure', requireAuth, c => c.text('ok'))
      })

      const res = await app.request('/secure', {
        headers: { Authorization: 'Bearer bad-token' },
      })
      expect(res.status).toBe(401)
    })

    it('allows request when token is valid', async () => {
      jwtService.verifyToken = vi.fn().mockReturnValue({ sub: 'user-1' })
      const app = createAppWith(app => {
        app.get('/secure', requireAuth, c => c.text('ok'))
      })

      const res = await app.request('/secure', {
        headers: { Authorization: 'Bearer good' },
      })
      expect(res.status).toBe(200)
      expect(await res.text()).toBe('ok')
    })
  })

  describe('requireAdmin', () => {
    it('returns 401 if not authenticated', async () => {
      const app = createAppWith(app => {
        app.get('/admin', requireAdmin, c => c.text('ok'))
      })

      const res = await app.request('/admin')
      expect(res.status).toBe(401)
    })

    it('returns 403 for non-admin users', async () => {
      jwtService.verifyToken = vi
        .fn()
        .mockReturnValue({ sub: 'user-1', metadata: { isAdmin: false } })
      const app = createAppWith(app => {
        app.get('/admin', requireAdmin, c => c.text('ok'))
      })

      const res = await app.request('/admin', {
        headers: { Authorization: 'Bearer user' },
      })
      expect(res.status).toBe(403)
    })

    it('allows admin users', async () => {
      jwtService.verifyToken = vi
        .fn()
        .mockReturnValue({ sub: 'admin-1', metadata: { isAdmin: true } })
      const app = createAppWith(app => {
        app.get('/admin', requireAdmin, c => c.text('ok'))
      })

      const res = await app.request('/admin', {
        headers: { Authorization: 'Bearer admin' },
      })
      expect(res.status).toBe(200)
    })
  })

  describe('requireSelfOrAdminFromParam', () => {
    it('allows when path id matches token sub', async () => {
      jwtService.verifyToken = vi
        .fn()
        .mockReturnValue({ sub: 'user-123', metadata: { isAdmin: false } })
      const app = createAppWith(app => {
        app.get('/users/:id', requireSelfOrAdminFromParam('id'), c => c.text('ok'))
      })
      const res = await app.request('/users/user-123', {
        headers: { Authorization: 'Bearer user' },
      })
      expect(res.status).toBe(200)
    })

    it('denies when path id differs and user is not admin', async () => {
      jwtService.verifyToken = vi
        .fn()
        .mockReturnValue({ sub: 'user-123', metadata: { isAdmin: false } })
      const app = createAppWith(app => {
        app.get('/users/:id', requireSelfOrAdminFromParam('id'), c => c.text('ok'))
      })
      const res = await app.request('/users/other-id', {
        headers: { Authorization: 'Bearer user' },
      })
      expect(res.status).toBe(403)
    })

    it('allows when user is admin even if id differs', async () => {
      jwtService.verifyToken = vi
        .fn()
        .mockReturnValue({ sub: 'admin-1', metadata: { isAdmin: true } })
      const app = createAppWith(app => {
        app.get('/users/:id', requireSelfOrAdminFromParam('id'), c => c.text('ok'))
      })
      const res = await app.request('/users/other-id', {
        headers: { Authorization: 'Bearer admin' },
      })
      expect(res.status).toBe(200)
    })
  })
})
