import type { Router } from 'vue-router'
import { getAuthState } from '@/composables/useAuth'

export function setupAuthGuard(router: Router) {
  router.beforeEach(to => {
    const { isAuthenticated, isAdmin } = getAuthState()

    if (to.meta.requiresAdmin && !isAdmin) {
      return { path: '/' }
    }

    if (to.meta.requiresAuth && !isAuthenticated) {
      return { path: '/auth/login', query: { redirect: to.fullPath } }
    }
  })
}
