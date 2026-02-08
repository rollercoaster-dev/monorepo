import type { Router } from 'vue-router'
import { getAuthState } from '@/composables/useAuth'

export function setupAuthGuard(router: Router) {
  router.beforeEach(to => {
    const { isAuthenticated, isAdmin } = getAuthState()

    // Check auth first — requiresAdmin implicitly requires auth
    if ((to.meta.requiresAuth || to.meta.requiresAdmin) && !isAuthenticated) {
      return { path: '/auth/login', query: { redirect: to.fullPath } }
    }

    if (to.meta.requiresAdmin && !isAdmin) {
      return { path: '/' }
    }
  })
}
