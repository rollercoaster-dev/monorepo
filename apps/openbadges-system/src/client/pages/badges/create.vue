<script setup lang="ts">
import { ref, computed, onMounted } from 'vue'
import { useRouter } from 'vue-router'
import { BadgeIssuerForm, BadgeDisplay } from 'openbadges-ui'
import type { OB2 } from 'openbadges-types'
import { createIRI } from 'openbadges-types'
import { useAuth } from '@/composables/useAuth'
import { useBadges, type CreateBadgeData } from '@/composables/useBadges'
// Form validation and image upload now handled by BadgeIssuerForm

// Types now handled by BadgeIssuerForm

// Preview-specific interfaces to avoid type assertions
interface PreviewIssuer {
  id: string
  type: string | string[]
  name: string
  url?: string
  email?: string
  description?: string
}

interface PreviewBadgeData {
  id: string
  type: 'BadgeClass'
  name: string
  description: string
  image: string
  criteria: {
    narrative: string
    id?: string
  }
  issuer: PreviewIssuer
  tags: string[]
  alignment: any[]
}

const router = useRouter()
const { user } = useAuth()
const { createBadge } = useBadges()

// Component state
const error = ref<string | null>(null)
const successMessage = ref<string | null>(null)
const isSubmitting = ref(false)

// Badge form data - now managed by BadgeIssuerForm
const badgeData = ref<Partial<CreateBadgeData>>({
  name: '',
  description: '',
  image: '',
  criteria: {
    narrative: '',
  },
  tags: [],
  alignment: [],
})

// Available issuers (for now, just create a default issuer)
const availableIssuers = ref<OB2.Profile[]>([])

// Create preview badge for display
// Using PreviewBadgeData interface to avoid type assertions
const previewBadge = computed(
  (): PreviewBadgeData => ({
    id: '', // preview only - empty string for preview
    type: 'BadgeClass',
    name: badgeData.value.name || 'Badge Name',
    description: badgeData.value.description || 'Badge description will appear here',
    image: badgeData.value.image || '/placeholder-badge.png',
    criteria: {
      narrative: badgeData.value.criteria?.narrative || 'Badge criteria will appear here',
    },
    issuer: badgeData.value.issuer || {
      id: '', // preview only
      type: 'Profile',
      name: 'Default Issuer',
      url: window.location.origin,
      email: user.value?.email || 'admin@example.com',
    },
    tags: badgeData.value.tags || [],
    alignment: badgeData.value.alignment || [],
  })
)

// Initialize component
onMounted(async () => {
  // Create default issuer if user is available
  if (user.value) {
    const defaultIssuer: OB2.Profile = {
      id: createIRI(`${window.location.origin}/api/v1/profiles/${user.value.id}`),
      type: 'Profile',
      name: `${user.value.firstName} ${user.value.lastName}`,
      url: createIRI(window.location.origin),
      email: user.value.email,
      description: `Badge issuer profile for ${user.value.firstName} ${user.value.lastName}`,
    }

    availableIssuers.value = [defaultIssuer]

    // Set default issuer
    badgeData.value.issuer = defaultIssuer
  }
})

// Handle form submission
const handleSubmit = async (formData: CreateBadgeData) => {
  if (!user.value) {
    error.value = 'You must be logged in to create a badge'
    return
  }

  error.value = null
  successMessage.value = null
  isSubmitting.value = true

  try {
    // BadgeIssuerForm handles validation and OB2 compliance, so we can proceed directly
    const newBadge = await createBadge(user.value, formData)

    if (newBadge) {
      successMessage.value = 'Badge created successfully!'

      // Redirect to badge detail page after a short delay
      setTimeout(() => {
        router.push(`/badges/${newBadge.id}`)
      }, 2000)
    } else {
      error.value = 'Failed to create badge. Please try again.'
    }
  } catch (err) {
    console.error('Badge creation error:', err)

    if (err instanceof Error) {
      // Handle specific error types
      if (err.message.includes('network') || err.message.includes('fetch')) {
        error.value = 'Network error. Please check your connection and try again.'
      } else if (err.message.includes('unauthorized') || err.message.includes('auth')) {
        error.value = 'Authentication error. Please log in again.'
      } else if (err.message.includes('validation')) {
        error.value = 'Please check your input and try again.'
      } else {
        error.value = err.message
      }
    } else {
      error.value = 'An unexpected error occurred. Please try again.'
    }
  } finally {
    isSubmitting.value = false
  }
}

// Validation now handled by BadgeIssuerForm

// Handle cancel
const handleCancel = () => {
  router.push('/badges').catch(err => {
    console.error('Navigation failed:', err)
  })
}
</script>

<template>
  <div class="max-w-4xl mx-auto mt-8 bg-white shadow rounded-lg p-6">
    <h1 class="text-2xl font-bold text-gray-900 mb-6">Create New Badge Class</h1>

    <div class="grid grid-cols-1 lg:grid-cols-2 gap-8">
      <!-- Badge Creation Form -->
      <div class="space-y-6">
        <BadgeIssuerForm
          :badge="badgeData"
          :issuers="availableIssuers"
          :loading="isSubmitting"
          :accessible="true"
          @submit="handleSubmit"
          @cancel="handleCancel"
        />
      </div>

      <!-- Badge Preview -->
      <div class="space-y-6">
        <h2 class="text-lg font-semibold text-gray-900">Preview</h2>
        <div class="bg-gray-50 rounded-lg p-4">
          <BadgeDisplay
            v-if="badgeData.name || badgeData.description"
            :badge="previewBadge"
            :theme="'default'"
            :accessible="true"
            :show-details="true"
          />
          <div v-else class="text-center text-gray-500 py-8">
            <p>Badge preview will appear here as you fill out the form</p>
          </div>
        </div>
      </div>
    </div>

    <!-- Loading State -->
    <div v-if="isSubmitting" class="mt-6 p-4 bg-blue-50 border border-blue-200 rounded-lg">
      <div class="flex items-center">
        <svg class="w-5 h-5 mr-3 animate-spin text-blue-600" fill="none" viewBox="0 0 24 24">
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
        <p class="text-blue-800">Creating badge...</p>
      </div>
    </div>

    <!-- Error Display -->
    <div v-if="error" class="mt-6 p-4 bg-red-50 border border-red-200 rounded-lg" role="alert">
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
          <p class="text-red-700">
            {{ error }}
          </p>
        </div>
      </div>
    </div>

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
          <p class="text-green-700">
            {{ successMessage }}
          </p>
        </div>
      </div>
    </div>

    <!-- Upload errors now handled by BadgeIssuerForm -->
  </div>
</template>
