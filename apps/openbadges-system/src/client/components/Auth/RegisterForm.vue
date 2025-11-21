<template>
  <div class="max-w-md mx-auto">
    <div class="bg-white shadow-sm rounded-lg p-6 border border-gray-200">
      <!-- Header -->
      <div class="text-center mb-8">
        <div
          class="w-12 h-12 bg-gradient-to-br from-green-500 to-blue-600 rounded-lg flex items-center justify-center mx-auto mb-4"
        >
          <UserPlusIcon class="w-6 h-6 text-white" />
        </div>
        <h2 class="text-2xl font-bold text-gray-900">Create your account</h2>
        <p class="mt-2 text-sm text-gray-600">
          Already have an account?
          <RouterLink
            to="/auth/login"
            class="font-medium text-blue-600 hover:text-blue-500 transition-colors"
          >
            Sign in
          </RouterLink>
        </p>
      </div>

      <!-- WebAuthn Support Info -->
      <div class="mb-6 p-4 bg-blue-50 border border-blue-200 rounded-md">
        <div class="flex items-center">
          <ShieldCheckIcon class="w-5 h-5 text-blue-500 mr-2" />
          <div>
            <h3 class="text-sm font-medium text-blue-900">Passwordless Authentication</h3>
            <p class="text-sm text-blue-700">
              {{
                isPlatformAuthAvailable
                  ? "Use your device's built-in security (Face ID, Touch ID, or Windows Hello)"
                  : 'Secure authentication without passwords'
              }}
            </p>
          </div>
        </div>
      </div>

      <!-- Error Message -->
      <div v-if="authError" class="mb-6 p-4 bg-red-50 border border-red-200 rounded-md">
        <div class="flex">
          <ExclamationTriangleIcon class="w-5 h-5 text-red-400 mr-2 flex-shrink-0" />
          <p class="text-sm text-red-700">
            {{ authError }}
          </p>
        </div>
      </div>

      <!-- Registration Form -->
      <form class="space-y-6" @submit.prevent="handleSubmit">
        <!-- Name Fields -->
        <div class="grid grid-cols-2 gap-4">
          <div>
            <label for="firstName" class="block text-sm font-medium text-gray-700 mb-1">
              First Name
            </label>
            <input
              id="firstName"
              :value="getFieldValue('firstName')"
              type="text"
              autocomplete="given-name"
              :class="[
                'block w-full px-3 py-2 border rounded-md shadow-sm placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors',
                getFieldError('firstName') ? 'border-red-300 text-red-900' : 'border-gray-300',
              ]"
              placeholder="John"
              :aria-invalid="!!getFieldError('firstName')"
              :aria-describedby="getFieldError('firstName') ? 'firstName-error' : undefined"
              @input="updateField('firstName', ($event.target as HTMLInputElement).value)"
              @blur="touchField('firstName')"
            />
            <p
              v-if="getFieldError('firstName')"
              id="firstName-error"
              class="mt-1 text-sm text-red-600"
            >
              {{ getFieldError('firstName') }}
            </p>
          </div>

          <div>
            <label for="lastName" class="block text-sm font-medium text-gray-700 mb-1">
              Last Name
            </label>
            <input
              id="lastName"
              :value="getFieldValue('lastName')"
              type="text"
              autocomplete="family-name"
              :class="[
                'block w-full px-3 py-2 border rounded-md shadow-sm placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors',
                getFieldError('lastName') ? 'border-red-300 text-red-900' : 'border-gray-300',
              ]"
              placeholder="Doe"
              :aria-invalid="!!getFieldError('lastName')"
              :aria-describedby="getFieldError('lastName') ? 'lastName-error' : undefined"
              @input="updateField('lastName', ($event.target as HTMLInputElement).value)"
              @blur="touchField('lastName')"
            />
            <p
              v-if="getFieldError('lastName')"
              id="lastName-error"
              class="mt-1 text-sm text-red-600"
            >
              {{ getFieldError('lastName') }}
            </p>
          </div>
        </div>

        <!-- Username Field -->
        <div>
          <label for="username" class="block text-sm font-medium text-gray-700 mb-1">
            Username
          </label>
          <div class="relative">
            <input
              id="username"
              :value="getFieldValue('username')"
              type="text"
              autocomplete="username"
              :class="[
                'block w-full px-3 py-2 border rounded-md shadow-sm placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors',
                getFieldError('username') ? 'border-red-300 text-red-900' : 'border-gray-300',
              ]"
              placeholder="johndoe"
              :aria-invalid="!!getFieldError('username')"
              :aria-describedby="getFieldError('username') ? 'username-error' : undefined"
              @input="updateField('username', ($event.target as HTMLInputElement).value)"
              @blur="touchField('username')"
            />
            <AtSymbolIcon class="absolute right-3 top-2.5 w-5 h-5 text-gray-400" />
          </div>
          <p v-if="getFieldError('username')" id="username-error" class="mt-1 text-sm text-red-600">
            {{ getFieldError('username') }}
          </p>
        </div>

        <!-- Email Field -->
        <div>
          <label for="email" class="block text-sm font-medium text-gray-700 mb-1">
            Email Address
          </label>
          <div class="relative">
            <input
              id="email"
              :value="getFieldValue('email')"
              type="email"
              autocomplete="email"
              :class="[
                'block w-full px-3 py-2 border rounded-md shadow-sm placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors',
                getFieldError('email') ? 'border-red-300 text-red-900' : 'border-gray-300',
              ]"
              placeholder="john@example.com"
              :aria-invalid="!!getFieldError('email')"
              :aria-describedby="getFieldError('email') ? 'email-error' : undefined"
              @input="updateField('email', ($event.target as HTMLInputElement).value)"
              @blur="touchField('email')"
            />
            <EnvelopeIcon class="absolute right-3 top-2.5 w-5 h-5 text-gray-400" />
          </div>
          <p v-if="getFieldError('email')" id="email-error" class="mt-1 text-sm text-red-600">
            {{ getFieldError('email') }}
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

        <!-- Terms and Conditions -->
        <div class="flex items-start">
          <input
            id="terms"
            v-model="acceptTerms"
            type="checkbox"
            class="h-4 w-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500 mt-1"
            :aria-describedby="!acceptTerms && attemptedSubmit ? 'terms-error' : undefined"
          />
          <label for="terms" class="ml-2 block text-sm text-gray-700">
            I agree to the
            <button
              type="button"
              class="text-blue-600 hover:text-blue-500 underline"
              @click="$emit('showTerms')"
            >
              Terms of Service
            </button>
            and
            <button
              type="button"
              class="text-blue-600 hover:text-blue-500 underline"
              @click="$emit('showPrivacy')"
            >
              Privacy Policy
            </button>
          </label>
        </div>
        <p v-if="!acceptTerms && attemptedSubmit" id="terms-error" class="text-sm text-red-600">
          You must accept the terms and conditions
        </p>

        <!-- Submit Button -->
        <button
          type="submit"
          :disabled="isLoading || !isFormValid || !acceptTerms || !isWebAuthnSupported"
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
            {{
              isPlatformAuthAvailable
                ? 'Setting up secure authentication...'
                : 'Creating account...'
            }}
          </span>
          <span v-else class="flex items-center">
            <ShieldCheckIcon class="w-4 h-4 mr-2" />
            {{
              isPlatformAuthAvailable ? 'Create account with biometrics' : 'Create secure account'
            }}
          </span>
        </button>
      </form>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted } from 'vue'
import { useRouter } from 'vue-router'
import {
  UserPlusIcon,
  AtSymbolIcon,
  EnvelopeIcon,
  ExclamationTriangleIcon,
  ShieldCheckIcon,
} from '@heroicons/vue/24/outline'
import { useFormValidation } from '@/composables/useFormValidation'
import { useAuth } from '@/composables/useAuth'

defineEmits<{
  showTerms: []
  showPrivacy: []
}>()

const router = useRouter()

// Form validation
const {
  rules,
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
  registerWithWebAuthn,
  isLoading,
  error: authError,
  clearError,
  isWebAuthnSupported,
  isPlatformAuthAvailable,
} = useAuth()

// Local state
const acceptTerms = ref(false)
const attemptedSubmit = ref(false)

// Initialize form fields
onMounted(() => {
  createField('firstName', '', [
    rules.required('First name is required'),
    rules.minLength(2, 'First name must be at least 2 characters'),
  ])

  createField('lastName', '', [
    rules.required('Last name is required'),
    rules.minLength(2, 'Last name must be at least 2 characters'),
  ])

  createField('username', '', [rules.required('Username is required'), rules.username()])

  createField('email', '', [rules.required('Email is required'), rules.email()])
})

// Handle form submission
const handleSubmit = async () => {
  attemptedSubmit.value = true
  clearError()

  if (!acceptTerms.value) {
    return
  }

  if (!validateAll()) {
    return
  }

  if (!isWebAuthnSupported.value) {
    return
  }

  const success = await registerWithWebAuthn({
    username: getFieldValue('username'),
    email: getFieldValue('email'),
    firstName: getFieldValue('firstName'),
    lastName: getFieldValue('lastName'),
  })

  if (success) {
    // Redirect to dashboard
    router.push('/')
  }
}
</script>
