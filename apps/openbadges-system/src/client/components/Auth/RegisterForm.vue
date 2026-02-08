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

<template>
  <div class="max-w-md mx-auto">
    <div class="card p-6">
      <!-- Header -->
      <div class="text-center mb-8">
        <div class="w-12 h-12 bg-primary rounded-sm flex items-center justify-center mx-auto mb-4">
          <UserPlusIcon class="w-6 h-6 text-primary-foreground" />
        </div>
        <h2 class="text-2xl font-bold text-foreground">Create your account</h2>
        <p class="mt-2 text-sm text-muted-foreground">
          Already have an account?
          <RouterLink
            to="/auth/login"
            class="font-medium text-primary hover:text-primary-dark transition-colors"
          >
            Sign in
          </RouterLink>
        </p>
      </div>

      <!-- WebAuthn Support Info -->
      <div class="alert alert-info mb-6">
        <div class="flex items-center">
          <ShieldCheckIcon class="w-5 h-5 text-info mr-2" />
          <div>
            <h3 class="text-sm font-medium text-foreground">Passwordless Authentication</h3>
            <p class="text-sm text-info">
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
      <div v-if="authError" class="alert alert-error mb-6">
        <div class="flex">
          <ExclamationTriangleIcon class="w-5 h-5 text-destructive mr-2 flex-shrink-0" />
          <p class="text-sm text-destructive">
            {{ authError }}
          </p>
        </div>
      </div>

      <!-- Registration Form -->
      <form class="space-y-6" @submit.prevent="handleSubmit">
        <!-- Name Fields -->
        <div class="grid grid-cols-2 gap-4">
          <div>
            <label for="firstName" class="block text-sm font-medium text-foreground mb-1">
              First Name
            </label>
            <input
              id="firstName"
              :value="getFieldValue('firstName')"
              type="text"
              autocomplete="given-name"
              :class="[
                'form-input px-3 py-2 placeholder-muted-foreground transition-colors',
                getFieldError('firstName') ? 'border-destructive' : '',
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
              class="mt-1 text-sm text-destructive"
            >
              {{ getFieldError('firstName') }}
            </p>
          </div>

          <div>
            <label for="lastName" class="block text-sm font-medium text-foreground mb-1">
              Last Name
            </label>
            <input
              id="lastName"
              :value="getFieldValue('lastName')"
              type="text"
              autocomplete="family-name"
              :class="[
                'form-input px-3 py-2 placeholder-muted-foreground transition-colors',
                getFieldError('lastName') ? 'border-destructive' : '',
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
              class="mt-1 text-sm text-destructive"
            >
              {{ getFieldError('lastName') }}
            </p>
          </div>
        </div>

        <!-- Username Field -->
        <div>
          <label for="username" class="block text-sm font-medium text-foreground mb-1">
            Username
          </label>
          <div class="relative">
            <input
              id="username"
              :value="getFieldValue('username')"
              type="text"
              autocomplete="username"
              :class="[
                'form-input px-3 py-2 placeholder-muted-foreground transition-colors',
                getFieldError('username') ? 'border-destructive' : '',
              ]"
              placeholder="johndoe"
              :aria-invalid="!!getFieldError('username')"
              :aria-describedby="getFieldError('username') ? 'username-error' : undefined"
              @input="updateField('username', ($event.target as HTMLInputElement).value)"
              @blur="touchField('username')"
            />
            <AtSymbolIcon class="absolute right-3 top-2.5 w-5 h-5 text-muted-foreground" />
          </div>
          <p
            v-if="getFieldError('username')"
            id="username-error"
            class="mt-1 text-sm text-destructive"
          >
            {{ getFieldError('username') }}
          </p>
        </div>

        <!-- Email Field -->
        <div>
          <label for="email" class="block text-sm font-medium text-foreground mb-1">
            Email Address
          </label>
          <div class="relative">
            <input
              id="email"
              :value="getFieldValue('email')"
              type="email"
              autocomplete="email"
              :class="[
                'form-input px-3 py-2 placeholder-muted-foreground transition-colors',
                getFieldError('email') ? 'border-destructive' : '',
              ]"
              placeholder="john@example.com"
              :aria-invalid="!!getFieldError('email')"
              :aria-describedby="getFieldError('email') ? 'email-error' : undefined"
              @input="updateField('email', ($event.target as HTMLInputElement).value)"
              @blur="touchField('email')"
            />
            <EnvelopeIcon class="absolute right-3 top-2.5 w-5 h-5 text-muted-foreground" />
          </div>
          <p v-if="getFieldError('email')" id="email-error" class="mt-1 text-sm text-destructive">
            {{ getFieldError('email') }}
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

        <!-- Terms and Conditions -->
        <div class="flex items-start">
          <input
            id="terms"
            v-model="acceptTerms"
            type="checkbox"
            class="h-4 w-4 text-primary border-input rounded focus:ring-ring mt-1"
            :aria-describedby="!acceptTerms && attemptedSubmit ? 'terms-error' : undefined"
          />
          <label for="terms" class="ml-2 block text-sm text-foreground">
            I agree to the
            <button
              type="button"
              class="text-primary hover:text-primary-dark underline"
              @click="$emit('showTerms')"
            >
              Terms of Service
            </button>
            and
            <button
              type="button"
              class="text-primary hover:text-primary-dark underline"
              @click="$emit('showPrivacy')"
            >
              Privacy Policy
            </button>
          </label>
        </div>
        <p v-if="!acceptTerms && attemptedSubmit" id="terms-error" class="text-sm text-destructive">
          You must accept the terms and conditions
        </p>

        <!-- Submit Button -->
        <button
          type="submit"
          :disabled="isLoading || !isFormValid || !acceptTerms || !isWebAuthnSupported"
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
