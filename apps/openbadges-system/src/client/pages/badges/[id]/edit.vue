<script setup lang="ts">
import { ref, computed, onMounted } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { BadgeIssuerForm, BadgeDisplay } from 'openbadges-ui'
import type { OB2, Shared } from 'openbadges-types'
import { createIRI } from 'openbadges-types'
import { useAuth } from '@/composables/useAuth'
import { useBadges, type UpdateBadgeData } from '@/composables/useBadges'
import { useFormValidation } from '@/composables/useFormValidation'
import { useImageUpload } from '@/composables/useImageUpload'

const route = useRoute()
const router = useRouter()
const { user } = useAuth()
const { updateBadge, getBadgeById } = useBadges()
const { createField, updateField, touchField, validateAll, getFieldError, rules } =
  useFormValidation()

// Helper function to ensure criteria is always an object with proper IRI types
function ensureCriteriaObject(
  c: string | OB2.Criteria | { narrative?: string; id?: string } | undefined
): OB2.Criteria {
  if (typeof c === 'string') {
    return { id: createIRI(c), narrative: '' }
  }
  if (c) {
    const id = 'id' in c && c.id ? createIRI(c.id) : undefined
    const narrative =
      'narrative' in c && typeof (c as any).narrative === 'string' ? (c as any).narrative : ''
    return { narrative, id }
  }
  return { narrative: 'Badge criteria' }
}

const {
  uploadImage,
  isUploading,
  error: uploadError,
  clearError,
} = useImageUpload({
  maxSize: 2 * 1024 * 1024, // 2MB
  allowedTypes: ['image/jpeg', 'image/png', 'image/gif', 'image/webp'],
})

// Component state
const error = ref<string | null>(null)
const successMessage = ref<string | null>(null)
const isSubmitting = ref(false)
const isFormDirty = ref(false)
const isInitialized = ref(false)

// Badge data
const originalBadge = ref<OB2.BadgeClass | null>(null)
const badgeData = ref<Partial<UpdateBadgeData>>({
  name: '',
  description: '',
  image: '',
  criteria: {
    narrative: '',
  },
  tags: [],
  alignment: [],
})

// Available issuers
const availableIssuers = ref<OB2.Profile[]>([])
const criteriaUrl = ref('')
const badgeId = computed(() => {
  if ('id' in route.params && typeof route.params.id === 'string') {
    return route.params.id
  }
  return ''
})

// Create preview badge for display
const previewBadge = computed(
  (): OB2.BadgeClass => ({
    ...(originalBadge.value || {
      id: badgeId.value as Shared.IRI,
      type: 'BadgeClass',
      issuer: {
        id: 'default-issuer' as Shared.IRI,
        type: 'Profile',
        name: 'Default Issuer',
        url: window.location.origin as Shared.IRI,
        email: user.value?.email || 'admin@example.com',
      },
    }),
    name: badgeData.value.name || originalBadge.value?.name || 'Badge Name',
    description:
      badgeData.value.description || originalBadge.value?.description || 'Badge description',
    image: (badgeData.value.image ||
      getImageSrc(originalBadge.value?.image) ||
      '/placeholder-badge.png') as Shared.IRI,
    criteria: ensureCriteriaObject(
      badgeData.value.criteria ?? originalBadge.value?.criteria ?? { narrative: 'Badge criteria' }
    ),
    tags: badgeData.value.tags || originalBadge.value?.tags || [],
    alignment: badgeData.value.alignment || originalBadge.value?.alignment || [],
  })
)

// Initialize component
onMounted(async () => {
  try {
    // Load existing badge data
    const badge = await getBadgeById(badgeId.value)
    if (!badge) {
      error.value = 'Badge not found'
      return
    }

    originalBadge.value = badge

    // Initialize form with existing data
    badgeData.value = {
      name: badge.name,
      description: badge.description,
      image: getImageSrc(badge.image) || '',
      criteria:
        typeof badge.criteria === 'string'
          ? { narrative: '', id: createIRI(badge.criteria) }
          : {
              narrative: badge.criteria?.narrative || '',
              id: (badge.criteria as any)?.id ? createIRI((badge.criteria as any).id) : undefined,
            },
      tags: badge.tags || [],
      alignment: Array.isArray(badge.alignment)
        ? badge.alignment
        : badge.alignment
          ? [badge.alignment]
          : [],
    }

    // Set criteria URL if it exists
    if (badge.criteria && typeof badge.criteria === 'object' && 'id' in badge.criteria) {
      criteriaUrl.value = badge.criteria.id as string
    }

    // Initialize form validation fields
    createField('name', badge.name, [rules.required('Badge name is required'), rules.minLength(3)])
    createField('description', badge.description, [
      rules.required('Badge description is required'),
      rules.minLength(10),
    ])
    createField(
      'criteria',
      (typeof badge.criteria === 'object' ? badge.criteria?.narrative : '') || '',
      [rules.required('Badge criteria is required'), rules.minLength(10)]
    )
    createField('criteriaUrl', criteriaUrl.value, [rules.url('Please enter a valid URL')])

    // Create default issuer
    if (user.value) {
      availableIssuers.value = [
        {
          id: `issuer-${user.value.id}` as Shared.IRI,
          type: 'Profile',
          name: `${user.value.firstName} ${user.value.lastName}`,
          url: window.location.origin as Shared.IRI,
          email: user.value.email,
          description: `Badge issuer profile for ${user.value.firstName} ${user.value.lastName}`,
        },
      ]
    }

    isInitialized.value = true
  } catch (err) {
    error.value = err instanceof Error ? err.message : 'Failed to load badge'
  }
})

// Handle form submission
const handleSubmit = async (formData: UpdateBadgeData) => {
  if (!user.value) {
    error.value = 'You must be logged in to edit a badge'
    return
  }

  error.value = null
  successMessage.value = null
  isSubmitting.value = true

  try {
    // Update form fields with current values
    updateField('name', badgeData.value.name || '')
    updateField('description', badgeData.value.description || '')
    updateField('criteria', badgeData.value.criteria?.narrative || '')
    updateField('criteriaUrl', criteriaUrl.value)

    // Validate all fields
    if (!validateAll()) {
      error.value = 'Please fix the errors in the form'
      return
    }

    // Additional validation for required fields
    if (
      !badgeData.value.name ||
      !badgeData.value.description ||
      !badgeData.value.criteria?.narrative
    ) {
      error.value = 'Please fill in all required fields'
      return
    }

    // Update criteria with URL if provided (OB2: criteria.id?: string is supported)
    if (criteriaUrl.value && formData.criteria) {
      formData.criteria.id = criteriaUrl.value
    }

    // Update the badge
    const updatedBadge = await updateBadge(user.value, badgeId.value, formData)

    if (updatedBadge) {
      successMessage.value = 'Badge updated successfully!'
      isFormDirty.value = false

      // Update original badge reference
      originalBadge.value = updatedBadge

      // Redirect to badge detail page after a short delay
      setTimeout(() => {
        router.push(`/badges/${updatedBadge.id}`)
      }, 2000)
    } else {
      error.value = 'Failed to update badge. Please try again.'
    }
  } catch (err) {
    console.error('Badge update error:', err)

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

// Handle cancel
const handleCancel = () => {
  if (isFormDirty.value) {
    const confirmed = confirm('You have unsaved changes. Are you sure you want to leave?')
    if (!confirmed) return
  }
  router.push(`/badges/${badgeId.value}`)
}

// Handle image upload
const handleImageUpload = async (event: Event) => {
  clearError()
  clearMessages()

  const target = event.target as globalThis.HTMLInputElement
  const file = target.files?.[0]

  if (!file) return

  const result = await uploadImage(file)
  if (result) {
    badgeData.value.image = result.dataUrl
    isFormDirty.value = true
  } else if (uploadError.value) {
    error.value = uploadError.value
  }
}

// Handle drag and drop for image
const handleImageDrop = async (event: globalThis.DragEvent) => {
  event.preventDefault()
  clearError()
  clearMessages()

  const file = event.dataTransfer?.files[0]
  if (!file) return

  const result = await uploadImage(file)
  if (result) {
    badgeData.value.image = result.dataUrl
    isFormDirty.value = true
  } else if (uploadError.value) {
    error.value = uploadError.value
  }
}

// Prevent default drag behaviors
const handleDragOver = (event: globalThis.DragEvent) => {
  event.preventDefault()
}

// Add alignment object
const addAlignment = () => {
  badgeData.value.alignment = badgeData.value.alignment || []
  badgeData.value.alignment.push({
    targetName: '',
    targetUrl: '' as Shared.IRI,
    targetDescription: '',
  })
  isFormDirty.value = true
}

// Remove alignment object
const removeAlignment = (index: number) => {
  if (badgeData.value.alignment) {
    badgeData.value.alignment.splice(index, 1)
    isFormDirty.value = true
  }
}

// Handle field updates with validation
const handleFieldUpdate = (fieldName: string, value: string) => {
  isFormDirty.value = true
  updateField(fieldName, value)

  // Update badgeData reactive values
  if (fieldName === 'name') {
    badgeData.value.name = value
  } else if (fieldName === 'description') {
    badgeData.value.description = value
  } else if (fieldName === 'criteria') {
    badgeData.value.criteria = { narrative: value }
  } else if (fieldName === 'criteriaUrl') {
    criteriaUrl.value = value
  }

  clearMessages()
}

// Handle field blur (touch)
const handleFieldBlur = (fieldName: string) => {
  touchField(fieldName)
}

// Clear messages when user starts typing
const clearMessages = () => {
  error.value = null
  successMessage.value = null
}

// Helper function to extract image source from IRI or Image object
function getImageSrc(image: string | OB2.Image | undefined): string | undefined {
  if (!image) return undefined
  if (typeof image === 'string') return image
  return image.id || undefined
}

// Reset image to original
function resetImage() {
  badgeData.value.image = getImageSrc(originalBadge.value?.image) || ''
  isFormDirty.value = true
}

// Handle alignment input changes
function handleAlignmentInput() {
  isFormDirty.value = true
  clearMessages()
}

// Handle criteria textarea input
function handleCriteriaInput(event: any) {
  handleFieldUpdate('criteria', event.target.value)
}

// Handle criteria URL input
function handleCriteriaUrlInput(event: any) {
  handleFieldUpdate('criteriaUrl', event.target.value)
}
</script>

<template>
  <div class="max-w-4xl mx-auto mt-8 bg-white shadow rounded-lg p-6">
    <!-- Loading state -->
    <div v-if="!isInitialized" class="text-center py-8">
      <svg class="w-8 h-8 mx-auto mb-4 animate-spin text-gray-400" fill="none" viewBox="0 0 24 24">
        <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4" />
        <path
          class="opacity-75"
          fill="currentColor"
          d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
        />
      </svg>
      <p class="text-gray-600">Loading badge...</p>
    </div>

    <!-- Main content -->
    <div v-else>
      <div class="flex items-center justify-between mb-6">
        <h1 class="text-2xl font-bold text-gray-900">Edit Badge Class</h1>
        <div class="flex items-center space-x-2">
          <span v-if="isFormDirty" class="text-sm text-yellow-600">Unsaved changes</span>
          <button
            class="px-3 py-1 text-sm text-gray-600 hover:text-gray-800"
            @click="router.push(`/badges/${badgeId}`)"
          >
            View Badge
          </button>
        </div>
      </div>

      <div class="grid grid-cols-1 lg:grid-cols-2 gap-8">
        <!-- Badge Edit Form -->
        <div class="space-y-6">
          <!-- Image Upload Section -->
          <div class="bg-gray-50 rounded-lg p-6">
            <h3 class="text-lg font-semibold text-gray-900 mb-4">Badge Image</h3>

            <!-- Image Preview -->
            <div v-if="badgeData.image" class="mb-4">
              <img
                :src="badgeData.image"
                :alt="badgeData.name || 'Badge image preview'"
                class="w-32 h-32 object-cover rounded-lg border border-gray-300"
              />
              <button
                class="mt-2 mr-2 text-sm text-blue-600 hover:text-blue-800"
                aria-label="Reset to original image"
                @click="resetImage"
              >
                Reset to original
              </button>
            </div>

            <!-- Upload Area -->
            <div
              class="border-2 border-dashed border-gray-300 rounded-lg p-8 text-center hover:border-gray-400 transition-colors"
              :class="{ 'border-blue-400 bg-blue-50': isUploading }"
              @drop="handleImageDrop"
              @dragover="handleDragOver"
              @dragenter="handleDragOver"
            >
              <div v-if="isUploading" class="text-blue-600">
                <svg class="w-8 h-8 mx-auto mb-2 animate-spin" fill="none" viewBox="0 0 24 24">
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
                <p>Uploading image...</p>
              </div>
              <div v-else>
                <svg
                  class="w-8 h-8 mx-auto mb-2 text-gray-400"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                >
                  <path
                    stroke-linecap="round"
                    stroke-linejoin="round"
                    stroke-width="2"
                    d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z"
                  />
                </svg>
                <p class="text-gray-600 mb-2">Drop an image here or click to browse</p>
                <p class="text-sm text-gray-500">PNG, JPG, GIF, WebP up to 2MB</p>
              </div>
            </div>

            <!-- Hidden file input -->
            <input
              id="badge-image-upload"
              type="file"
              accept="image/jpeg,image/png,image/gif,image/webp"
              class="hidden"
              aria-label="Upload badge image"
              @change="handleImageUpload"
            />

            <!-- Upload button -->
            <label
              for="badge-image-upload"
              class="mt-4 inline-flex items-center px-4 py-2 border border-gray-300 rounded-md shadow-sm text-sm font-medium text-gray-700 bg-white hover:bg-gray-50 cursor-pointer focus-within:ring-2 focus-within:ring-offset-2 focus-within:ring-indigo-500"
            >
              <svg class="w-4 h-4 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path
                  stroke-linecap="round"
                  stroke-linejoin="round"
                  stroke-width="2"
                  d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z"
                />
              </svg>
              Change Image
            </label>
          </div>

          <!-- Criteria Definition Section -->
          <div class="bg-gray-50 rounded-lg p-6">
            <h3 class="text-lg font-semibold text-gray-900 mb-4">Badge Criteria</h3>

            <div class="space-y-4">
              <!-- Criteria Narrative -->
              <div>
                <label
                  for="criteria-narrative"
                  class="block text-sm font-medium text-gray-700 mb-2"
                >
                  Criteria Description *
                </label>
                <textarea
                  id="criteria-narrative"
                  :value="badgeData.criteria?.narrative"
                  rows="4"
                  class="w-full px-3 py-2 border rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500"
                  :class="
                    getFieldError('criteria')
                      ? 'border-red-300 focus:border-red-500 focus:ring-red-500'
                      : 'border-gray-300'
                  "
                  placeholder="Describe what someone needs to do to earn this badge..."
                  aria-describedby="criteria-help criteria-error"
                  required
                  @input="handleCriteriaInput"
                  @blur="handleFieldBlur('criteria')"
                ></textarea>
                <p
                  v-if="getFieldError('criteria')"
                  id="criteria-error"
                  class="mt-1 text-sm text-red-600"
                >
                  {{ getFieldError('criteria') }}
                </p>
                <p id="criteria-help" class="mt-1 text-sm text-gray-500">
                  Clearly describe the requirements, skills, or achievements needed to earn this
                  badge.
                </p>
              </div>

              <!-- Criteria URL (optional) -->
              <div>
                <label for="criteria-url" class="block text-sm font-medium text-gray-700 mb-2">
                  Criteria URL (optional)
                </label>
                <input
                  id="criteria-url"
                  :value="criteriaUrl"
                  type="url"
                  class="w-full px-3 py-2 border rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500"
                  :class="
                    getFieldError('criteriaUrl')
                      ? 'border-red-300 focus:border-red-500 focus:ring-red-500'
                      : 'border-gray-300'
                  "
                  placeholder="https://example.com/badge-criteria"
                  aria-describedby="criteria-url-help criteria-url-error"
                  @input="handleCriteriaUrlInput"
                  @blur="handleFieldBlur('criteriaUrl')"
                />
                <p
                  v-if="getFieldError('criteriaUrl')"
                  id="criteria-url-error"
                  class="mt-1 text-sm text-red-600"
                >
                  {{ getFieldError('criteriaUrl') }}
                </p>
                <p id="criteria-url-help" class="mt-1 text-sm text-gray-500">
                  Optional link to detailed criteria documentation.
                </p>
              </div>

              <!-- Alignment Objects -->
              <div>
                <label class="block text-sm font-medium text-gray-700 mb-2">
                  Educational Alignment (optional)
                </label>
                <div class="space-y-3">
                  <div
                    v-for="(alignment, index) in badgeData.alignment"
                    :key="index"
                    class="flex gap-3 items-start"
                  >
                    <div class="flex-1">
                      <input
                        v-model="alignment.targetName"
                        type="text"
                        class="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500"
                        placeholder="Standard or skill name"
                        :aria-label="`Alignment ${index + 1} name`"
                        @input="handleAlignmentInput"
                      />
                    </div>
                    <div class="flex-1">
                      <input
                        v-model="alignment.targetUrl"
                        type="url"
                        class="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500"
                        placeholder="https://example.com/standard"
                        :aria-label="`Alignment ${index + 1} URL`"
                        @input="handleAlignmentInput"
                      />
                    </div>
                    <button
                      type="button"
                      class="p-2 text-red-600 hover:text-red-800"
                      :aria-label="`Remove alignment ${index + 1}`"
                      @click="removeAlignment(index)"
                    >
                      <svg class="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path
                          stroke-linecap="round"
                          stroke-linejoin="round"
                          stroke-width="2"
                          d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"
                        />
                      </svg>
                    </button>
                  </div>
                  <button
                    type="button"
                    class="inline-flex items-center px-3 py-2 border border-gray-300 rounded-md shadow-sm text-sm font-medium text-gray-700 bg-white hover:bg-gray-50"
                    aria-label="Add new alignment"
                    @click="addAlignment"
                  >
                    <svg class="w-4 h-4 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path
                        stroke-linecap="round"
                        stroke-linejoin="round"
                        stroke-width="2"
                        d="M12 6v6m0 0v6m0-6h6m-6 0H6"
                      />
                    </svg>
                    Add Alignment
                  </button>
                </div>
                <p class="mt-1 text-sm text-gray-500">
                  Link this badge to educational standards or competency frameworks.
                </p>
              </div>
            </div>
          </div>

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
              :badge="previewBadge"
              :theme="'default'"
              :accessible="true"
              :show-details="true"
            />
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
          <p class="text-blue-800">Updating badge...</p>
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

      <!-- Upload Error Display -->
      <div
        v-if="uploadError"
        class="mt-6 p-4 bg-yellow-50 border border-yellow-200 rounded-lg"
        role="alert"
      >
        <div class="flex items-center">
          <svg
            class="w-5 h-5 mr-3 text-yellow-600"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
          >
            <path
              stroke-linecap="round"
              stroke-linejoin="round"
              stroke-width="2"
              d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.732-.833-2.5 0L4.313 16.5c-.77.833.192 2.5 1.732 2.5z"
            />
          </svg>
          <div>
            <p class="text-yellow-800 font-medium">Upload Error</p>
            <p class="text-yellow-700">
              {{ uploadError }}
            </p>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>
