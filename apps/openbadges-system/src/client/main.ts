import { createApp } from 'vue'
import { createRouter, createWebHistory } from 'vue-router'
import { createHead } from '@unhead/vue/client'
import { createPinia } from 'pinia'
import App from '@/App.vue'
import 'openbadges-ui/dist/style.css'
import { routes } from 'vue-router/auto-routes'

// Import global styles
import '@/assets/styles/main.css'

// Create Vue app
const app = createApp(App)

// Configure router
const router = createRouter({
  history: createWebHistory(import.meta.env.BASE_URL),
  routes,
  scrollBehavior(to, from, savedPosition) {
    if (savedPosition) {
      return savedPosition
    } else {
      return { top: 0 }
    }
  },
})

// Create Pinia store
const pinia = createPinia()

// Add head management
const head = createHead()

// Use plugins
app.use(router)
app.use(pinia)
app.use(head)

// Global error handler
app.config.errorHandler = (err, instance, info) => {
  console.error('Vue error:', err)
  console.error('Error in component:', instance?.$options.name)
  console.error('Error info:', info)
}

// Global properties
app.config.globalProperties.$filters = {
  formatDate(date: Date, _format = 'YYYY-MM-DD'): string {
    return new Intl.DateTimeFormat('en-US', {
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
    }).format(new Date(date))
  },
}

// Mount the app
router.isReady().then(() => {
  app.mount('#app')
})

// Export for testing
if (import.meta.env.DEV) {
  // @ts-ignore
  window.__app__ = app
}
