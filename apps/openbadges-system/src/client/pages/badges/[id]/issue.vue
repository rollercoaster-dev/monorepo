<template>
  <div class="max-w-4xl mx-auto mt-8 bg-white shadow rounded-lg p-6">
    <h1 class="text-2xl font-bold text-gray-900 mb-6">Issue Badge</h1>

    <!-- Badge Display -->
    <div v-if="badge" class="mb-8 bg-gray-50 rounded-lg p-6">
      <h2 class="text-lg font-semibold text-gray-900 mb-4">Badge to Issue</h2>
      <BadgeDisplay :badge="badge" :theme="'default'" :accessible="true" :show-details="true" />
    </div>

    <!-- Loading State -->
    <div v-if="isLoading && !badge" class="text-center py-8">
      <div class="animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-600 mx-auto"></div>
      <p class="mt-2 text-gray-600">Loading badge...</p>
    </div>

    <!-- Error State -->
    <div
      v-if="error && !badge"
      class="bg-red-50 border border-red-200 rounded-lg p-4 mb-6"
      role="alert"
    >
      <div class="flex items-center">
        <svg
          class="w-5 h-5 mr-3 text-red-600"
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
        >
          <path
            stroke-linecap="round"
            stroke-linejoin="round"
            stroke-width="2"
            d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
          />
        </svg>
        <div>
          <p class="text-red-800 font-medium">Error</p>
          <p class="text-red-700">{{ error }}</p>
        </div>
      </div>
    </div>

    <!-- Issue Form -->
    <form v-if="badge" class="space-y-6" @submit.prevent="handleIssue">
      <!-- Recipient Email -->
      <div>
        <label for="recipient-email" class="block text-sm font-medium text-gray-700 mb-2">
          Recipient Email *
        </label>
        <input
          id="recipient-email"
          v-model="issueForm.recipientEmail"
          type="email"
          required
          class="w-full px-3 py-2 border rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500"
          :class="
            getFieldError('recipientEmail')
              ? 'border-red-300 focus:border-red-500 focus:ring-red-500'
              : 'border-gray-300'
          "
          placeholder="recipient@example.com"
          aria-describedby="recipient-email-help recipient-email-error"
          @blur="validateField('recipientEmail')"
          @input="clearFieldError('recipientEmail')"
        />
        <p
          v-if="getFieldError('recipientEmail')"
          id="recipient-email-error"
          class="mt-1 text-sm text-red-600"
        >
          {{ getFieldError('recipientEmail') }}
        </p>
        <p id="recipient-email-help" class="mt-1 text-sm text-gray-500">
          The email address of the person receiving this badge.
        </p>
      </div>

      <!-- Evidence URL -->
      <div>
        <label for="evidence-url" class="block text-sm font-medium text-gray-700 mb-2">
          Evidence URL (optional)
        </label>
        <input
          id="evidence-url"
          v-model="issueForm.evidence"
          type="url"
          class="w-full px-3 py-2 border rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500"
          :class="
            getFieldError('evidence')
              ? 'border-red-300 focus:border-red-500 focus:ring-red-500'
              : 'border-gray-300'
          "
          placeholder="https://example.com/evidence"
          aria-describedby="evidence-url-help evidence-url-error"
          @blur="validateField('evidence')"
          @input="clearFieldError('evidence')"
        />
        <p
          v-if="getFieldError('evidence')"
          id="evidence-url-error"
          class="mt-1 text-sm text-red-600"
        >
          {{ getFieldError('evidence') }}
        </p>
        <p id="evidence-url-help" class="mt-1 text-sm text-gray-500">
          Link to evidence supporting this badge award (portfolio, project, etc.).
        </p>
      </div>

      <!-- Narrative -->
      <div>
        <label for="narrative" class="block text-sm font-medium text-gray-700 mb-2">
          Narrative (optional)
        </label>
        <textarea
          id="narrative"
          v-model="issueForm.narrative"
          rows="4"
          class="w-full px-3 py-2 border rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500"
          :class="
            getFieldError('narrative')
              ? 'border-red-300 focus:border-red-500 focus:ring-red-500'
              : 'border-gray-300'
          "
          placeholder="Describe why this badge is being awarded..."
          aria-describedby="narrative-help narrative-error"
          @blur="validateField('narrative')"
          @input="clearFieldError('narrative')"
        ></textarea>
        <p v-if="getFieldError('narrative')" id="narrative-error" class="mt-1 text-sm text-red-600">
          {{ getFieldError('narrative') }}
        </p>
        <p id="narrative-help" class="mt-1 text-sm text-gray-500">
          Additional context or explanation for why this badge is being awarded.
        </p>
      </div>

      <!-- Valid From -->
      <div>
        <label for="valid-from" class="block text-sm font-medium text-gray-700 mb-2">
          Valid From (optional)
        </label>
        <input
          id="valid-from"
          v-model="issueForm.validFrom"
          type="datetime-local"
          class="w-full px-3 py-2 border rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500"
          :class="
            getFieldError('validFrom')
              ? 'border-red-300 focus:border-red-500 focus:ring-red-500'
              : 'border-gray-300'
          "
          :max="issueForm.validUntil || undefined"
          aria-describedby="valid-from-help valid-from-error"
          @blur="validateField('validFrom')"
          @input="clearFieldError('validFrom')"
        />
        <p
          v-if="getFieldError('validFrom')"
          id="valid-from-error"
          class="mt-1 text-sm text-red-600"
        >
          {{ getFieldError('validFrom') }}
        </p>
        <p id="valid-from-help" class="mt-1 text-sm text-gray-500">
          When this badge becomes valid (defaults to issuance time if not specified).
        </p>
      </div>

      <!-- Valid Until -->
      <div>
        <label for="valid-until" class="block text-sm font-medium text-gray-700 mb-2">
          Valid Until (optional)
        </label>
        <input
          id="valid-until"
          v-model="issueForm.validUntil"
          type="datetime-local"
          class="w-full px-3 py-2 border rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500"
          :class="
            getFieldError('validUntil')
              ? 'border-red-300 focus:border-red-500 focus:ring-red-500'
              : 'border-gray-300'
          "
          :min="issueForm.validFrom || undefined"
          aria-describedby="valid-until-help valid-until-error"
          @blur="validateField('validUntil')"
          @input="clearFieldError('validUntil')"
        />
        <p
          v-if="getFieldError('validUntil')"
          id="valid-until-error"
          class="mt-1 text-sm text-red-600"
        >
          {{ getFieldError('validUntil') }}
        </p>
        <p id="valid-until-help" class="mt-1 text-sm text-gray-500">
          When this badge expires (leave blank for no expiration).
        </p>
      </div>

      <!-- Form Actions -->
      <div class="flex items-center justify-end space-x-4 pt-6 border-t border-gray-200">
        <button
          type="button"
          class="px-4 py-2 border border-gray-300 rounded-md shadow-sm text-sm font-medium text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500"
          @click="handleCancel"
        >
          Cancel
        </button>
        <button
          type="submit"
          class="px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 disabled:opacity-50 disabled:cursor-not-allowed"
          :disabled="isSubmitting || !isFormValid"
        >
          <span v-if="isSubmitting" class="flex items-center">
            <svg class="w-4 h-4 mr-2 animate-spin" fill="none" viewBox="0 0 24 24">
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
            Issuing...
          </span>
          <span v-else>Issue Badge</span>
        </button>
      </div>
    </form>

    <!-- Success Message -->
    <div
      v-if="successMessage"
      class="mt-6 p-4 bg-green-50 border border-green-200 rounded-lg"
      role="alert"
    >
      <div class="flex items-center">
        <svg
          class="w-5 h-5 mr-3 text-green-600"
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
        >
          <path
            stroke-linecap="round"
            stroke-linejoin="round"
            stroke-width="2"
            d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"
          />
        </svg>
        <div>
          <p class="text-green-800 font-medium">Success</p>
          <p class="text-green-700">{{ successMessage }}</p>
          <p v-if="issuedAssertion" class="text-green-700 text-sm mt-1">
            Assertion ID: {{ issuedAssertion.id }}
          </p>
          <div v-if="issuedAssertion" class="mt-3 flex space-x-3">
            <router-link
              :to="`/backpack`"
              class="text-sm text-green-700 hover:text-green-800 underline"
            >
              View in Backpack
            </router-link>
            <button
              type="button"
              class="text-sm text-green-700 hover:text-green-800 underline"
              :disabled="isVerifying"
              @click="verifyIssuedBadge"
            >
              <span v-if="isVerifying" class="flex items-center">
                <svg class="w-3 h-3 mr-1 animate-spin" fill="none" viewBox="0 0 24 24">
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
                Verifying...
              </span>
              <span v-else>Verify Badge</span>
            </button>
          </div>
          <p v-if="verificationStatus" class="text-green-700 text-sm mt-2">
            ✓ Badge verified and retrievable from backpack
          </p>
        </div>
      </div>
    </div>

    <!-- Error Message -->
    <div v-if="issueError" class="mt-6 p-4 bg-red-50 border border-red-200 rounded-lg" role="alert">
      <div class="flex items-center">
        <svg
          class="w-5 h-5 mr-3 text-red-600"
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
        >
          <path
            stroke-linecap="round"
            stroke-linejoin="round"
            stroke-width="2"
            d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
          />
        </svg>
        <div>
          <p class="text-red-800 font-medium">Error</p>
          <p class="text-red-700">{{ issueError }}</p>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { BadgeDisplay } from 'openbadges-ui'
import type { OB2 } from 'openbadges-types'
import { useAuth } from '@/composables/useAuth'
import { useBadges, type IssueBadgeData, type BadgeAssertion } from '@/composables/useBadges'
import { openBadgesService } from '@/services/openbadges'

const route = useRoute()
const router = useRouter()
const { user, token, isTokenValid } = useAuth()
const { getBadgeById, issueBadge } = useBadges()

// Component state
const badge = ref<OB2.BadgeClass | null>(null)
const isLoading = ref(false)
const error = ref<string | null>(null)
const isSubmitting = ref(false)
const successMessage = ref<string | null>(null)
const issueError = ref<string | null>(null)
const issuedAssertion = ref<BadgeAssertion | null>(null)
const isVerifying = ref(false)
const verificationStatus = ref<boolean | null>(null)

// Form data
const issueForm = ref({
  recipientEmail: '',
  evidence: '',
  narrative: '',
  validFrom: '',
  validUntil: '',
})

// Form validation
const validationErrors = ref<Record<string, string>>({})

const isFormValid = computed(() => {
  return (
    issueForm.value.recipientEmail.trim() !== '' && Object.keys(validationErrors.value).length === 0
  )
})

// Get field error
const getFieldError = (field: string): string => {
  return validationErrors.value[field] || ''
}

// Clear field error
const clearFieldError = (field: string) => {
  if (validationErrors.value[field]) {
    delete validationErrors.value[field]
  }
}

// Validate field
const validateField = (field: string) => {
  clearFieldError(field)

  switch (field) {
    case 'recipientEmail':
      if (!issueForm.value.recipientEmail.trim()) {
        validationErrors.value[field] = 'Recipient email is required'
      } else if (
        !/^[a-zA-Z0-9.!#$%&'*+/=?^_`{|}~-]+@[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?(?:\.[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?)*$/.test(
          issueForm.value.recipientEmail
        )
      ) {
        validationErrors.value[field] = 'Please enter a valid email address'
      }
      break
    case 'evidence':
      if (issueForm.value.evidence) {
        try {
          new URL(issueForm.value.evidence)
        } catch {
          validationErrors.value[field] = 'Please enter a valid URL'
          break
        }
        if (!/^https?:\/\//.test(issueForm.value.evidence)) {
          validationErrors.value[field] =
            'Please enter a valid URL (must start with http:// or https://)'
        }
      }
      break
    case 'validFrom':
      if (issueForm.value.validFrom) {
        // Validate that if validUntil is also set, validFrom must be before it
        if (issueForm.value.validUntil) {
          const validFromDate = new Date(issueForm.value.validFrom)
          const validUntilDate = new Date(issueForm.value.validUntil)
          if (validFromDate >= validUntilDate) {
            validationErrors.value[field] = 'Valid From must be before Valid Until'
          }
        }
      }
      break
    case 'validUntil':
      if (issueForm.value.validUntil) {
        const now = new Date()
        const validUntilDate = new Date(issueForm.value.validUntil)

        // Must be in the future
        if (validUntilDate <= now) {
          validationErrors.value[field] = 'Valid Until must be in the future'
        }

        // If validFrom is set, validUntil must be after it
        if (issueForm.value.validFrom) {
          const validFromDate = new Date(issueForm.value.validFrom)
          if (validUntilDate <= validFromDate) {
            validationErrors.value[field] = 'Valid Until must be after Valid From'
          }
        }
      }
      break
  }
}

// Load badge data
const loadBadge = async () => {
  const params = route.params as { id?: string | string[] }
  const badgeId = Array.isArray(params.id) ? params.id[0] : params.id || ''
  if (!badgeId) {
    error.value = 'Badge ID is required'
    return
  }

  isLoading.value = true
  error.value = null

  try {
    const badgeData = await getBadgeById(badgeId)
    if (badgeData) {
      badge.value = badgeData
    } else {
      error.value = 'Badge not found'
    }
  } catch (err) {
    console.error('Error loading badge:', err)
    error.value = err instanceof Error ? err.message : 'Failed to load badge'
  } finally {
    isLoading.value = false
  }
}

// Handle form submission
const handleIssue = async () => {
  if (!user.value) {
    issueError.value = 'You must be logged in to issue badges'
    return
  }

  // Validate that the user session is still active
  if (!user.value.email || !user.value.id || !token.value || !isTokenValid(token.value)) {
    issueError.value = 'Session expired. Please log in again.'
    return
  }

  if (!badge.value) {
    issueError.value = 'Badge information is required'
    return
  }

  // Validate all fields
  validateField('recipientEmail')
  validateField('evidence')
  validateField('validFrom')
  validateField('validUntil')

  if (!isFormValid.value) {
    issueError.value = 'Please fix the errors in the form'
    return
  }

  isSubmitting.value = true
  issueError.value = null
  successMessage.value = null

  try {
    const issueData: IssueBadgeData = {
      badgeClassId: badge.value.id,
      recipientEmail: issueForm.value.recipientEmail.trim(),
      evidence: issueForm.value.evidence.trim() || undefined,
      narrative: issueForm.value.narrative.trim() || undefined,
      validFrom: issueForm.value.validFrom
        ? new Date(issueForm.value.validFrom).toISOString()
        : undefined,
      validUntil: issueForm.value.validUntil
        ? new Date(issueForm.value.validUntil).toISOString()
        : undefined,
    }

    const assertion = await issueBadge(user.value, issueData)

    if (assertion) {
      issuedAssertion.value = assertion
      successMessage.value = `Badge successfully issued to ${issueForm.value.recipientEmail}`

      // Reset form
      issueForm.value = {
        recipientEmail: '',
        evidence: '',
        narrative: '',
        validFrom: '',
        validUntil: '',
      }
    } else {
      issueError.value = 'Failed to issue badge. Please try again.'
    }
  } catch (err) {
    console.error('Badge issuance error:', err)

    if (err instanceof Error) {
      if (err.message.includes('network') || err.message.includes('fetch')) {
        issueError.value = 'Network error. Please check your connection and try again.'
      } else if (err.message.includes('unauthorized') || err.message.includes('auth')) {
        issueError.value = 'Authentication error. Please log in again.'
      } else if (err.message.includes('409') || err.message.includes('conflict')) {
        issueError.value = 'This badge has already been issued to this recipient.'
      } else if (err.message.includes('400') || err.message.includes('bad request')) {
        issueError.value = 'Invalid badge data. Please check all fields and try again.'
      } else if (err.message.includes('validation')) {
        issueError.value = 'Please check your input and try again.'
      } else {
        issueError.value = err.message
      }
    } else {
      issueError.value = 'An unexpected error occurred. Please try again.'
    }
  } finally {
    isSubmitting.value = false
  }
}

// Verify issued badge appears in backpack
const verifyIssuedBadge = async () => {
  if (!user.value || !issuedAssertion.value) {
    return
  }

  isVerifying.value = true
  verificationStatus.value = null

  try {
    // Get user's backpack to confirm the badge appears
    const backpack = await openBadgesService.getUserBackpack(user.value)

    // Check if the issued assertion appears in the backpack
    const foundAssertion = backpack.assertions.find(
      assertion => String(assertion.id) === String(issuedAssertion.value?.id)
    )

    verificationStatus.value = !!foundAssertion
  } catch (err) {
    console.error('Error verifying issued badge:', err)
    verificationStatus.value = false
  } finally {
    isVerifying.value = false
  }
}

// Handle cancel
const handleCancel = () => {
  if (badge.value) {
    router.push(`/badges/${badge.value.id}`)
  } else {
    router.push('/badges')
  }
}

// Initialize component
onMounted(() => {
  loadBadge()
})
</script>
