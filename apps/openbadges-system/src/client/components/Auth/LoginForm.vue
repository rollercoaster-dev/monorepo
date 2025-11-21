<template>
  <div class="max-w-md mx-auto">
    <div class="bg-white shadow-sm rounded-lg p-6 border border-gray-200">
      <!-- Header -->
      <div class="text-center mb-8">
        <div
          class="w-12 h-12 bg-gradient-to-br from-blue-500 to-purple-600 rounded-lg flex items-center justify-center mx-auto mb-4"
        >
          <ShieldCheckIcon class="w-6 h-6 text-white" />
        </div>
        <h2 class="text-2xl font-bold text-gray-900">Sign in to your account</h2>
        <p class="mt-2 text-sm text-gray-600">
          Don't have an account?
          <RouterLink
            to="/auth/register"
            class="font-medium text-blue-600 hover:text-blue-500 transition-colors"
          >
            Create one now
          </RouterLink>
        </p>
      </div>

      <!-- WebAuthn Support Info -->
      <div class="mb-6 p-4 bg-green-50 border border-green-200 rounded-md">
        <div class="flex items-center">
          <ShieldCheckIcon class="w-5 h-5 text-green-500 mr-2" />
          <div>
            <h3 class="text-sm font-medium text-green-900">Passwordless Sign In</h3>
            <p class="text-sm text-green-700">
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
      <div v-if="authError" class="mb-6 p-4 bg-red-50 border border-red-200 rounded-md">
        <div class="flex items-start justify-between gap-4">
          <div class="flex-1 flex">
            <ExclamationTriangleIcon class="w-5 h-5 text-red-400 mr-2 flex-shrink-0" />
            <p class="text-sm text-red-700">
              {{ authError }}
            </p>
          </div>
          <button
            v-if="authError.includes('No credentials found')"
            type="button"
            class="text-sm font-medium text-red-700 underline hover:text-red-800"
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
          <label for="usernameOrEmail" class="block text-sm font-medium text-gray-700 mb-1">
            Username or Email
          </label>
          <div class="relative">
            <input
              id="usernameOrEmail"
              :value="getFieldValue('usernameOrEmail')"
              type="text"
              autocomplete="username"
              :class="[
                'block w-full px-3 py-2 border rounded-md shadow-sm placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors',
                getFieldError('usernameOrEmail')
                  ? 'border-red-300 text-red-900'
                  : 'border-gray-300',
              ]"
              placeholder="Enter your username or email"
              :aria-invalid="!!getFieldError('usernameOrEmail')"
              :aria-describedby="
                getFieldError('usernameOrEmail') ? 'usernameOrEmail-error' : undefined
              "
              @input="updateField('usernameOrEmail', ($event.target as HTMLInputElement).value)"
              @blur="touchField('usernameOrEmail')"
            />
            <UserIcon class="absolute right-3 top-2.5 w-5 h-5 text-gray-400" />
          </div>
          <p
            v-if="getFieldError('usernameOrEmail')"
            id="usernameOrEmail-error"
            class="mt-1 text-sm text-red-600"
          >
            {{ getFieldError('usernameOrEmail') }}
          </p>
        </div>

        <!-- WebAuthn Status -->
        <div
          v-if="!isWebAuthnSupported"
          class="p-4 bg-yellow-50 border border-yellow-200 rounded-md"
        >
          <div class="flex">
            <ExclamationTriangleIcon class="w-5 h-5 text-yellow-400 mr-2 flex-shrink-0" />
            <div>
              <h3 class="text-sm font-medium text-yellow-800">Browser Not Supported</h3>
              <p class="text-sm text-yellow-700 mt-1">
                Your browser doesn't support secure authentication. Please use a modern browser like
                Chrome, Firefox, Safari, or Edge.
              </p>
            </div>
          </div>
        </div>

        <!-- OAuth Options -->
        <div class="space-y-3">
          <div class="relative">
            <div class="absolute inset-0 flex items-center">
              <div class="w-full border-t border-gray-300"></div>
            </div>
            <div class="relative flex justify-center text-sm">
              <span class="px-2 bg-white text-gray-500">Or continue with</span>
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
            <div class="w-full border-t border-gray-300"></div>
          </div>
          <div class="relative flex justify-center text-sm">
            <span class="px-2 bg-white text-gray-500">Or use passwordless</span>
          </div>
        </div>

        <!-- Submit Button -->
        <button
          type="submit"
          :disabled="isLoading || !isFormValid || !isWebAuthnSupported"
          class="w-full flex justify-center py-2 px-4 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
        >
          <span v-if="isLoading" class="flex items-center">
            <svg
              class="animate-spin -ml-1 mr-2 h-4 w-4 text-white"
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
      <div class="mt-8 pt-6 border-t border-gray-200">
        <div class="bg-gray-50 rounded-md p-4">
          <h3 class="text-sm font-medium text-gray-900 mb-2">Demo Instructions</h3>
          <div class="space-y-2 text-sm text-gray-600">
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
