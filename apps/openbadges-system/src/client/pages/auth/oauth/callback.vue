<script setup lang="ts">
import { onMounted, ref } from 'vue'
import { useRouter, useRoute } from 'vue-router'
import { useAuth } from '@/composables/useAuth'

// Define page metadata (if using Nuxt-style routing)
// definePageMeta({
//   layout: false,
//   auth: false,
// })

const router = useRouter()
const route = useRoute()
const { processOAuthCallback } = useAuth()

// State
const isProcessing = ref(true)
const isSuccess = ref(false)
const error = ref<string | null>(null)

// Process OAuth callback
const processCallback = async () => {
  try {
    const successParam = route.query.success as string
    const tokenParam = route.query.token as string
    const userParam = route.query.user as string
    const redirectUriParam = route.query.redirect_uri as string
    const errorParam = route.query.error as string

    // Check for OAuth errors
    if (errorParam) {
      throw new Error(`OAuth error: ${errorParam}`)
    }

    // Handle backend redirect with auth data
    if (successParam === 'true' && tokenParam && userParam) {
      try {
        // Parse user data
        const userData = JSON.parse(decodeURIComponent(userParam))

        // Set authentication state manually (similar to useAuth)
        const authUser = {
          id: userData.id,
          username: userData.username,
          email: userData.email,
          firstName: userData.firstName,
          lastName: userData.lastName,
          avatar: userData.avatar,
          isAdmin: userData.isAdmin,
          createdAt: userData.createdAt || new Date().toISOString(),
          credentials: userData.credentials || [],
        }

        // Store auth data in localStorage
        localStorage.setItem('auth_token', tokenParam)
        localStorage.setItem('user_data', JSON.stringify(authUser))

        isSuccess.value = true
        isProcessing.value = false

        // Redirect after a short delay
        setTimeout(() => {
          const redirectTo = redirectUriParam || '/'
          router.push(redirectTo)
        }, 2000)

        return
      } catch (parseError) {
        console.error('Failed to parse user data:', parseError)
        throw new Error('Invalid authentication data')
      }
    }

    // Fallback to original callback processing for API-based flow
    const code = route.query.code as string
    const state = route.query.state as string

    // Validate required parameters
    if (!code || !state) {
      throw new Error('Missing required OAuth parameters')
    }

    // Process the callback
    const success = await processOAuthCallback(code, state)

    if (success) {
      isSuccess.value = true
      isProcessing.value = false

      // Redirect after a short delay
      setTimeout(() => {
        const redirectTo = (route.query.redirect_uri as string) || '/'
        router.push(redirectTo)
      }, 2000)
    } else {
      throw new Error('OAuth authentication failed')
    }
  } catch (err) {
    console.error('OAuth callback error:', err)
    error.value = err instanceof Error ? err.message : 'Authentication failed'
    isProcessing.value = false
  }
}

// Initialize on mount
onMounted(() => {
  processCallback()
})
</script>

<template>
  <div class="min-h-screen flex items-center justify-center bg-gray-50">
    <div class="max-w-md w-full">
      <div class="bg-white shadow-sm rounded-lg p-8 border border-gray-200">
        <!-- Processing State -->
        <div v-if="isProcessing" class="text-center">
          <div
            class="w-16 h-16 bg-gradient-to-br from-blue-500 to-purple-600 rounded-full flex items-center justify-center mx-auto mb-4"
          >
            <svg
              class="animate-spin h-8 w-8 text-white"
              xmlns="http://www.w3.org/2000/svg"
              fill="none"
              viewBox="0 0 24 24"
            >
              <circle
                class="opacity-25"
                cx="12"
                cy="12"
                r="10"
                stroke="currentColor"
                stroke-width="4"
              />
              <path
                class="opacity-75"
                fill="currentColor"
                d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
              />
            </svg>
          </div>
          <h2 class="text-2xl font-bold text-gray-900 mb-2">Processing Authentication</h2>
          <p class="text-gray-600">Please wait while we complete your sign-in...</p>
        </div>

        <!-- Success State -->
        <div v-else-if="isSuccess" class="text-center">
          <div
            class="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4"
          >
            <svg
              class="w-8 h-8 text-green-600"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                stroke-linecap="round"
                stroke-linejoin="round"
                stroke-width="2"
                d="M5 13l4 4L19 7"
              />
            </svg>
          </div>
          <h2 class="text-2xl font-bold text-gray-900 mb-2">Authentication Successful</h2>
          <p class="text-gray-600 mb-4">You have been successfully signed in. Redirecting...</p>
          <div class="text-sm text-gray-500">
            If you're not redirected automatically,
            <RouterLink to="/" class="text-blue-600 hover:text-blue-500">click here</RouterLink>
          </div>
        </div>

        <!-- Error State -->
        <div v-else-if="error" class="text-center">
          <div
            class="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-4"
          >
            <svg class="w-8 h-8 text-red-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path
                stroke-linecap="round"
                stroke-linejoin="round"
                stroke-width="2"
                d="M6 18L18 6M6 6l12 12"
              />
            </svg>
          </div>
          <h2 class="text-2xl font-bold text-gray-900 mb-2">Authentication Failed</h2>
          <p class="text-red-600 mb-4">
            {{ error }}
          </p>
          <div class="space-y-2">
            <RouterLink
              to="/auth/login"
              class="w-full inline-flex justify-center px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors"
            >
              Try Again
            </RouterLink>
            <RouterLink
              to="/"
              class="w-full inline-flex justify-center px-4 py-2 bg-gray-200 text-gray-700 rounded-md hover:bg-gray-300 transition-colors"
            >
              Go Home
            </RouterLink>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>
