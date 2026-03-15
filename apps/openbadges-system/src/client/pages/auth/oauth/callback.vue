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
const { processOAuthCallback, completeOAuthExchange } = useAuth()

// State
const isProcessing = ref(true)
const isSuccess = ref(false)
const error = ref<string | null>(null)

// Process OAuth callback
const processCallback = async () => {
  try {
    const successParam = route.query.success as string
    const exchangeCodeParam = route.query.code as string | undefined
    const errorParam = route.query.error as string

    // Check for OAuth errors
    if (errorParam) {
      throw new Error(`OAuth error: ${errorParam}`)
    }

    // Handle backend redirect with a one-time exchange code.
    if (successParam === 'true' && exchangeCodeParam) {
      const redirectTo = await completeOAuthExchange(exchangeCodeParam)
      isSuccess.value = true
      isProcessing.value = false

      setTimeout(() => {
        router.push(redirectTo)
      }, 2000)

      return
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
  <div class="min-h-screen flex items-center justify-center bg-background">
    <div class="max-w-md w-full">
      <div class="card card-body">
        <!-- Processing State -->
        <div v-if="isProcessing" class="text-center">
          <div
            class="w-16 h-16 bg-primary rounded-md border-2 border-border shadow-hard-sm flex items-center justify-center mx-auto mb-4"
          >
            <svg
              class="animate-spin h-8 w-8 text-primary-foreground"
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
          <h2 class="text-2xl font-bold text-foreground mb-2">Processing Authentication</h2>
          <p class="text-muted-foreground">Please wait while we complete your sign-in...</p>
        </div>

        <!-- Success State -->
        <div v-else-if="isSuccess" class="text-center">
          <div
            class="w-16 h-16 bg-success/10 border-2 border-success rounded-md flex items-center justify-center mx-auto mb-4"
          >
            <svg class="w-8 h-8 text-success" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path
                stroke-linecap="round"
                stroke-linejoin="round"
                stroke-width="2"
                d="M5 13l4 4L19 7"
              />
            </svg>
          </div>
          <h2 class="text-2xl font-bold text-foreground mb-2">Authentication Successful</h2>
          <p class="text-muted-foreground mb-4">
            You have been successfully signed in. Redirecting...
          </p>
          <div class="text-sm text-muted-foreground">
            If you're not redirected automatically,
            <RouterLink to="/" class="text-primary hover:text-primary-dark">click here</RouterLink>
          </div>
        </div>

        <!-- Error State -->
        <div v-else-if="error" class="text-center">
          <div
            class="w-16 h-16 bg-destructive/10 border-2 border-destructive rounded-md flex items-center justify-center mx-auto mb-4"
          >
            <svg
              class="w-8 h-8 text-destructive"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                stroke-linecap="round"
                stroke-linejoin="round"
                stroke-width="2"
                d="M6 18L18 6M6 6l12 12"
              />
            </svg>
          </div>
          <h2 class="text-2xl font-bold text-foreground mb-2">Authentication Failed</h2>
          <p class="text-destructive mb-4">
            {{ error }}
          </p>
          <div class="space-y-2">
            <RouterLink to="/auth/login" class="btn btn-primary w-full inline-flex justify-center">
              Try Again
            </RouterLink>
            <RouterLink to="/" class="btn btn-secondary w-full inline-flex justify-center">
              Go Home
            </RouterLink>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>
