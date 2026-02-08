<script setup lang="ts">
import { onMounted, ref } from 'vue'
import { useRouter } from 'vue-router'
import { UserIcon, ExclamationTriangleIcon, ShieldCheckIcon } from '@heroicons/vue/24/outline'
import { useFormValidation } from '@/composables/useFormValidation'
import { useAuth } from '@/composables/useAuth'
import { useOAuth } from '@/composables/useOAuth'
import OAuthProviderButton from './OAuthProviderButton.vue'

const router = useRouter()

// Form validation
const {
  createField,
  updateField,
  touchField,
  validateAll,
  getFieldError,
  getFieldValue,
  isFormValid,
} = useFormValidation()

// Auth composable
const {
  authenticateWithWebAuthn,
  setupPasskeyForUser,
  isLoading,
  error: authError,
  clearError,
  isWebAuthnSupported,
  isPlatformAuthAvailable,
} = useAuth()

// OAuth composable
const { availableProviders, initiateOAuth } = useOAuth()

// OAuth state
const oauthLoading = ref<string | null>(null)

// Initialize form fields
onMounted(() => {
  createField('usernameOrEmail', '', [
    { validate: value => value.trim().length > 0, message: 'Username or email is required' },
  ])
})

// Handle OAuth login
const handleOAuthLogin = async (provider: string) => {
  clearError()
  oauthLoading.value = provider

  try {
    const redirectPath = (router.currentRoute.value.query.redirect as string) || '/'
    await initiateOAuth(provider, redirectPath)
  } catch (error) {
    console.error('OAuth login failed:', error)
  } finally {
    oauthLoading.value = null
  }
}

// Handle form submission
const handleSubmit = async () => {
  clearError()

  if (!validateAll()) {
    return
  }

  if (!isWebAuthnSupported.value) {
    return
  }

  const success = await authenticateWithWebAuthn(getFieldValue('usernameOrEmail'))

  if (success) {
    // Redirect to dashboard or intended page
    const redirectPath = (router.currentRoute.value.query.redirect as string) || '/'
    router.push(redirectPath)
  }
}

// Setup passkey CTA handler
const handleSetupPasskey = async () => {
  clearError()
  const identifier = getFieldValue('usernameOrEmail')
  if (!identifier || !identifier.trim()) return

  const success = await setupPasskeyForUser(identifier)
  if (success) {
    const redirectPath = (router.currentRoute.value.query.redirect as string) || '/'
    router.push(redirectPath)
  }
}
</script>

<template>
  <div class="max-w-md mx-auto">
    <div class="card p-6">
      <!-- Header -->
      <div class="text-center mb-8">
        <div class="w-12 h-12 bg-primary rounded-sm flex items-center justify-center mx-auto mb-4">
          <ShieldCheckIcon class="w-6 h-6 text-primary-foreground" />
        </div>
        <h2 class="text-2xl font-bold text-foreground">Sign in to your account</h2>
        <p class="mt-2 text-sm text-muted-foreground">
          Don't have an account?
          <RouterLink
            to="/auth/register"
            class="font-medium text-primary hover:text-primary-dark transition-colors"
          >
            Create one now
          </RouterLink>
        </p>
      </div>

      <!-- WebAuthn Support Info -->
      <div class="alert alert-success mb-6">
        <div class="flex items-center">
          <ShieldCheckIcon class="w-5 h-5 text-success mr-2" />
          <div>
            <h3 class="text-sm font-medium text-foreground">Passwordless Sign In</h3>
            <p class="text-sm text-success">
              {{
                isPlatformAuthAvailable
                  ? "Use your device's built-in security (Face ID, Touch ID, or Windows Hello)"
                  : 'Secure authentication without passwords'
              }}
            </p>
          </div>
        </div>
      </div>

      <!-- Error Message / Recovery CTA -->
      <div v-if="authError" class="alert alert-error mb-6">
        <div class="flex items-start justify-between gap-4">
          <div class="flex-1 flex">
            <ExclamationTriangleIcon class="w-5 h-5 text-destructive mr-2 flex-shrink-0" />
            <p class="text-sm text-destructive">
              {{ authError }}
            </p>
          </div>
          <button
            v-if="authError.includes('No credentials found')"
            type="button"
            class="text-sm font-medium text-destructive underline hover:text-destructive"
            @click="handleSetupPasskey"
          >
            Set up a passkey
          </button>
        </div>
      </div>

      <!-- Login Form -->
      <form class="space-y-6" @submit.prevent="handleSubmit">
        <!-- Username/Email Field -->
        <div>
          <label for="usernameOrEmail" class="block text-sm font-medium text-foreground mb-1">
            Username or Email
          </label>
          <div class="relative">
            <input
              id="usernameOrEmail"
              :value="getFieldValue('usernameOrEmail')"
              type="text"
              autocomplete="username"
              :class="[
                'form-input px-3 py-2 placeholder-muted-foreground transition-colors',
                getFieldError('usernameOrEmail') ? 'border-destructive' : '',
              ]"
              placeholder="Enter your username or email"
              :aria-invalid="!!getFieldError('usernameOrEmail')"
              :aria-describedby="
                getFieldError('usernameOrEmail') ? 'usernameOrEmail-error' : undefined
              "
              @input="updateField('usernameOrEmail', ($event.target as HTMLInputElement).value)"
              @blur="touchField('usernameOrEmail')"
            />
            <UserIcon class="absolute right-3 top-2.5 w-5 h-5 text-muted-foreground" />
          </div>
          <p
            v-if="getFieldError('usernameOrEmail')"
            id="usernameOrEmail-error"
            class="mt-1 text-sm text-destructive"
          >
            {{ getFieldError('usernameOrEmail') }}
          </p>
        </div>

        <!-- WebAuthn Status -->
        <div v-if="!isWebAuthnSupported" class="alert alert-warning">
          <div class="flex">
            <ExclamationTriangleIcon class="w-5 h-5 text-warning mr-2 flex-shrink-0" />
            <div>
              <h3 class="text-sm font-medium text-foreground">Browser Not Supported</h3>
              <p class="text-sm text-warning mt-1">
                Your browser doesn't support secure authentication. Please use a modern browser like
                Chrome, Firefox, Safari, or Edge.
              </p>
            </div>
          </div>
        </div>

        <!-- OAuth Options -->
        <div v-if="availableProviders.length > 0" class="space-y-3">
          <div class="relative">
            <div class="absolute inset-0 flex items-center">
              <div class="w-full border-t-2 border-border"></div>
            </div>
            <div class="relative flex justify-center text-sm">
              <span class="px-2 bg-card text-muted-foreground">Or continue with</span>
            </div>
          </div>

          <div class="space-y-2">
            <OAuthProviderButton
              v-for="provider in availableProviders"
              :key="provider"
              :provider="provider"
              :is-loading="oauthLoading === provider"
              @click="handleOAuthLogin"
            />
          </div>
        </div>

        <!-- WebAuthn Divider -->
        <div class="relative">
          <div class="absolute inset-0 flex items-center">
            <div class="w-full border-t-2 border-border"></div>
          </div>
          <div class="relative flex justify-center text-sm">
            <span class="px-2 bg-card text-muted-foreground">Or use passwordless</span>
          </div>
        </div>

        <!-- Submit Button -->
        <button
          type="submit"
          :disabled="isLoading || !isFormValid || !isWebAuthnSupported"
          class="btn btn-primary w-full justify-center disabled:opacity-50 disabled:cursor-not-allowed"
        >
          <span v-if="isLoading" class="flex items-center">
            <svg
              class="animate-spin -ml-1 mr-2 h-4 w-4 text-primary-foreground"
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
            {{ isPlatformAuthAvailable ? 'Authenticating...' : 'Signing in...' }}
          </span>
          <span v-else class="flex items-center">
            <ShieldCheckIcon class="w-4 h-4 mr-2" />
            {{ isPlatformAuthAvailable ? 'Sign in with biometrics' : 'Sign in securely' }}
          </span>
        </button>
      </form>

      <!-- Demo Instructions -->
      <div class="mt-8 pt-6 border-t-2 border-border">
        <div class="bg-muted rounded-md p-4">
          <h3 class="text-sm font-medium text-foreground mb-2">Demo Instructions</h3>
          <div class="space-y-2 text-sm text-muted-foreground">
            <div>
              <strong>New users:</strong>
              Create an account first - no passwords needed!
            </div>
            <div>
              <strong>Existing users:</strong>
              Enter your username, then authenticate with your device
            </div>
            <div>
              <strong>Security:</strong>
              Your device's biometrics (Face ID, Touch ID, etc.) replace passwords
            </div>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>
