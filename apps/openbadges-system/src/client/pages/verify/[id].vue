<script setup lang="ts">
import { ref, computed, onMounted } from 'vue'
import { useRoute } from 'vue-router'
import {
  ChevronLeftIcon,
  CheckCircleIcon,
  XCircleIcon,
  ExclamationTriangleIcon,
  BuildingOfficeIcon,
  CheckBadgeIcon,
  CalendarDaysIcon,
  LinkIcon,
  ArrowTopRightOnSquareIcon,
} from '@heroicons/vue/24/outline'
import { openBadgesService, type VerificationResult } from '@/services/openbadges'

const route = useRoute()
const loading = ref(true)
const error = ref<string | null>(null)
const verificationResult = ref<VerificationResult | null>(null)
const revocationStatus = ref<{
  revoked: boolean
  reason?: string
  revokedAt?: string
} | null>(null)
const urlCopied = ref(false)

// Extract assertion ID from route parameter
const assertionId = computed(() => {
  if ('id' in route.params && typeof route.params.id === 'string') {
    return route.params.id
  }
  if ('id' in route.params && Array.isArray(route.params.id)) {
    return route.params.id[0] || ''
  }
  return ''
})

// Formatted dates
const formattedVerificationDate = computed(() => {
  if (!verificationResult.value) return ''
  return new Date(verificationResult.value.verifiedAt).toLocaleString()
})

const formattedIssuedDate = computed(() => {
  if (!verificationResult.value?.assertion.issuedOn) return ''
  return new Date(verificationResult.value.assertion.issuedOn as string).toLocaleString()
})

const formattedValidFromDate = computed(() => {
  if (!verificationResult.value?.assertion.validFrom) return ''
  return new Date(verificationResult.value.assertion.validFrom as string).toLocaleString()
})

const formattedExpiryDate = computed(() => {
  const assertion = verificationResult.value?.assertion
  if (!assertion) return ''
  // OB3 field takes precedence, fallback to OB2 for backward compatibility
  const expiryDate = (assertion.validUntil || assertion.expires) as string | undefined
  if (!expiryDate) return ''
  return new Date(expiryDate).toLocaleString()
})

// Safely extract badge image URL
const badgeImageUrl = computed(() => {
  if (!verificationResult.value?.badgeClass.image) return undefined
  const image = verificationResult.value.badgeClass.image
  return typeof image === 'string' ? image : undefined
})

// Verify the badge when component mounts
onMounted(async () => {
  if (!assertionId.value) {
    error.value = 'No assertion ID provided'
    loading.value = false
    return
  }

  try {
    loading.value = true
    error.value = null

    // Perform verification
    const result = await openBadgesService.verifyBadge(assertionId.value)
    verificationResult.value = result

    // Check revocation status
    const revocationResult = await openBadgesService.checkRevocationStatus(assertionId.value)
    revocationStatus.value = revocationResult

    // Add revocation warning if badge is revoked
    if (revocationResult.revoked && result.valid) {
      result.valid = false
      result.errors = result.errors || []
      result.errors.push('This badge has been revoked')
    }
  } catch (err) {
    console.error('Failed to verify badge:', err)
    error.value = err instanceof Error ? err.message : 'Failed to verify badge'
  } finally {
    loading.value = false
  }
})

// Copy verification URL to clipboard
const copyVerificationUrl = async () => {
  try {
    const url = window.location.href
    await navigator.clipboard.writeText(url)
    urlCopied.value = true
    setTimeout(() => {
      urlCopied.value = false
    }, 3000)
  } catch (err) {
    console.error('Failed to copy URL:', err)
  }
}
</script>

<template>
  <div class="max-w-4xl mx-auto mt-8 px-4">
    <div class="mb-6">
      <router-link
        to="/"
        class="inline-flex items-center text-blue-600 hover:text-blue-800 transition-colors duration-200"
      >
        <ChevronLeftIcon class="w-4 h-4 mr-1" />
        Back to Home
      </router-link>
    </div>

    <h1 class="text-3xl font-bold text-gray-900 mb-8">Badge Verification</h1>

    <!-- Loading State -->
    <div v-if="loading" class="flex items-center justify-center py-12">
      <div class="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      <span class="ml-3 text-lg text-gray-600">Verifying badge...</span>
    </div>

    <!-- Error State -->
    <div v-else-if="error" class="rounded-lg bg-red-50 border border-red-200 p-6">
      <div class="flex items-center">
        <ExclamationTriangleIcon class="w-6 h-6 text-red-500 mr-3" />
        <div>
          <h2 class="text-lg font-semibold text-red-800">Verification Failed</h2>
          <p class="text-red-700 mt-1">{{ error }}</p>
        </div>
      </div>
    </div>

    <!-- Verification Results -->
    <div v-else-if="verificationResult" class="space-y-6">
      <!-- Verification Status -->
      <div
        class="rounded-lg border-2 p-6"
        :class="
          verificationResult.valid ? 'bg-green-50 border-green-200' : 'bg-red-50 border-red-200'
        "
      >
        <div class="flex items-center">
          <component
            :is="verificationResult.valid ? CheckCircleIcon : XCircleIcon"
            class="w-8 h-8 mr-3"
            :class="verificationResult.valid ? 'text-green-600' : 'text-red-600'"
          />
          <div>
            <h2 class="text-xl font-semibold">
              {{ verificationResult.valid ? 'Valid Badge' : 'Invalid Badge' }}
            </h2>
            <p class="text-sm text-gray-600 mt-1">Verified on {{ formattedVerificationDate }}</p>
          </div>
        </div>

        <!-- Errors and Warnings -->
        <div v-if="verificationResult.errors?.length" class="mt-4">
          <h3 class="font-medium text-red-800 mb-2">Verification Errors:</h3>
          <ul class="list-disc list-inside space-y-1">
            <li v-for="errorMsg in verificationResult.errors" :key="errorMsg" class="text-red-700">
              {{ errorMsg }}
            </li>
          </ul>
        </div>

        <div v-if="verificationResult.warnings?.length" class="mt-4">
          <h3 class="font-medium text-yellow-800 mb-2">Warnings:</h3>
          <ul class="list-disc list-inside space-y-1">
            <li
              v-for="warning in verificationResult.warnings"
              :key="warning"
              class="text-yellow-700"
            >
              {{ warning }}
            </li>
          </ul>
        </div>
      </div>

      <!-- Badge Information -->
      <div class="bg-white rounded-lg border border-gray-200 shadow-sm p-6">
        <h2 class="text-xl font-semibold text-gray-900 mb-4">Badge Information</h2>
        <div class="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <!-- Badge Display -->
          <div class="space-y-4">
            <div v-if="badgeImageUrl" class="flex justify-center">
              <img
                :src="badgeImageUrl"
                :alt="String(verificationResult.badgeClass.name)"
                class="w-24 h-24 object-contain rounded-lg border border-gray-200"
              />
            </div>
            <div class="text-center lg:text-left">
              <h3 class="text-lg font-medium text-gray-900">
                {{ verificationResult.badgeClass.name }}
              </h3>
              <p class="text-gray-600 mt-1">
                {{ verificationResult.badgeClass.description }}
              </p>
            </div>
          </div>

          <!-- Badge Details -->
          <div class="space-y-4">
            <div>
              <label class="block text-sm font-medium text-gray-700">Badge ID</label>
              <p class="mt-1 text-sm text-gray-900 font-mono break-all">
                {{ verificationResult.badgeClass.id }}
              </p>
            </div>
            <div v-if="(verificationResult.badgeClass.tags as string[] | undefined)?.length">
              <label class="block text-sm font-medium text-gray-700">Tags</label>
              <div class="mt-1 flex flex-wrap gap-2">
                <span
                  v-for="tag in verificationResult.badgeClass.tags as string[]"
                  :key="tag"
                  class="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800"
                >
                  {{ tag }}
                </span>
              </div>
            </div>
          </div>
        </div>
      </div>

      <!-- Issuer Information -->
      <div class="bg-white rounded-lg border border-gray-200 shadow-sm p-6">
        <h2 class="text-xl font-semibold text-gray-900 mb-4">Issuer Information</h2>
        <div class="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <div>
            <div class="flex items-center mb-3">
              <BuildingOfficeIcon class="w-5 h-5 text-gray-400 mr-2" />
              <span class="font-medium text-gray-900">
                {{ verificationResult.issuer.name }}
              </span>
              <component
                :is="verificationResult.issuer.verified ? CheckBadgeIcon : XCircleIcon"
                class="w-5 h-5 ml-2"
                :class="verificationResult.issuer.verified ? 'text-green-600' : 'text-red-600'"
              />
            </div>
            <p class="text-sm text-gray-600">
              {{ verificationResult.issuer.verified ? 'Verified issuer' : 'Unverified issuer' }}
            </p>
          </div>
          <div>
            <label class="block text-sm font-medium text-gray-700">Issuer ID</label>
            <p class="mt-1 text-sm text-gray-900 font-mono break-all">
              {{ verificationResult.issuer.id }}
            </p>
          </div>
        </div>
      </div>

      <!-- Verification Details -->
      <div class="bg-white rounded-lg border border-gray-200 shadow-sm p-6">
        <h2 class="text-xl font-semibold text-gray-900 mb-4">Verification Details</h2>
        <div class="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <div>
            <div class="space-y-4">
              <div>
                <label class="block text-sm font-medium text-gray-700">Digital Signature</label>
                <div class="mt-1 flex items-center">
                  <component
                    :is="verificationResult.signature.valid ? CheckCircleIcon : XCircleIcon"
                    class="w-5 h-5 mr-2"
                    :class="verificationResult.signature.valid ? 'text-green-600' : 'text-red-600'"
                  />
                  <span class="text-sm">
                    {{ verificationResult.signature.valid ? 'Valid' : 'Invalid' }}
                  </span>
                </div>
              </div>
              <div>
                <label class="block text-sm font-medium text-gray-700">Verification Type</label>
                <p class="mt-1 text-sm text-gray-900 capitalize">
                  {{ verificationResult.signature.type }}
                </p>
              </div>
            </div>
          </div>
          <div>
            <div class="space-y-4">
              <div>
                <label class="block text-sm font-medium text-gray-700">Assertion ID</label>
                <p class="mt-1 text-sm text-gray-900 font-mono break-all">
                  {{ verificationResult.assertion.id }}
                </p>
              </div>
              <div v-if="revocationStatus">
                <label class="block text-sm font-medium text-gray-700">Revocation Status</label>
                <div class="mt-1 flex items-center">
                  <component
                    :is="revocationStatus.revoked ? XCircleIcon : CheckCircleIcon"
                    class="w-5 h-5 mr-2"
                    :class="revocationStatus.revoked ? 'text-red-600' : 'text-green-600'"
                  />
                  <span class="text-sm">
                    {{ revocationStatus.revoked ? 'Revoked' : 'Not Revoked' }}
                  </span>
                </div>
                <p v-if="revocationStatus.reason" class="mt-1 text-sm text-gray-600">
                  Reason: {{ revocationStatus.reason }}
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>

      <!-- Recipient Information -->
      <div class="bg-white rounded-lg border border-gray-200 shadow-sm p-6">
        <h2 class="text-xl font-semibold text-gray-900 mb-4">Recipient Information</h2>
        <div class="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <div class="space-y-4">
            <div>
              <label class="block text-sm font-medium text-gray-700">Issued On</label>
              <div class="mt-1 flex items-center">
                <CalendarDaysIcon class="w-5 h-5 text-gray-400 mr-2" />
                <span class="text-sm text-gray-900">
                  {{ formattedIssuedDate }}
                </span>
              </div>
            </div>
            <div v-if="verificationResult.assertion.validFrom">
              <label class="block text-sm font-medium text-gray-700">Valid From</label>
              <div class="mt-1 flex items-center">
                <CalendarDaysIcon class="w-5 h-5 text-gray-400 mr-2" />
                <span class="text-sm text-gray-900">
                  {{ formattedValidFromDate }}
                </span>
              </div>
            </div>
            <div
              v-if="verificationResult.assertion.validUntil || verificationResult.assertion.expires"
            >
              <label class="block text-sm font-medium text-gray-700">
                {{ verificationResult.assertion.validUntil ? 'Valid Until' : 'Expires On' }}
              </label>
              <div class="mt-1 flex items-center">
                <CalendarDaysIcon class="w-5 h-5 text-gray-400 mr-2" />
                <span class="text-sm text-gray-900">
                  {{ formattedExpiryDate }}
                </span>
              </div>
            </div>
          </div>
          <div class="space-y-4">
            <div v-if="verificationResult.assertion.narrative">
              <label class="block text-sm font-medium text-gray-700">Narrative</label>
              <p class="mt-1 text-sm text-gray-900">
                {{ verificationResult.assertion.narrative }}
              </p>
            </div>
            <div v-if="verificationResult.assertion.evidence">
              <label class="block text-sm font-medium text-gray-700">Evidence</label>
              <div class="mt-1">
                <a
                  v-if="typeof verificationResult.assertion.evidence === 'string'"
                  :href="verificationResult.assertion.evidence"
                  target="_blank"
                  rel="noopener noreferrer"
                  class="text-blue-600 hover:text-blue-800 text-sm"
                >
                  View Evidence
                  <ArrowTopRightOnSquareIcon class="w-4 h-4 inline ml-1" />
                </a>
                <div
                  v-else-if="Array.isArray(verificationResult.assertion.evidence)"
                  class="space-y-2"
                >
                  <div
                    v-for="(evidence, index) in verificationResult.assertion.evidence"
                    :key="index"
                    class="text-sm"
                  >
                    <a
                      v-if="typeof evidence === 'string'"
                      :href="evidence"
                      target="_blank"
                      rel="noopener noreferrer"
                      class="text-blue-600 hover:text-blue-800"
                    >
                      Evidence {{ index + 1 }}
                      <ArrowTopRightOnSquareIcon class="w-4 h-4 inline ml-1" />
                    </a>
                    <div v-else class="text-gray-900">
                      {{ evidence.narrative || 'Evidence provided' }}
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      <!-- Share Badge -->
      <div class="bg-gray-50 rounded-lg p-6">
        <h2 class="text-lg font-semibold text-gray-900 mb-3">Share This Verification</h2>
        <div class="flex items-center space-x-4">
          <button
            class="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 transition-colors duration-200"
            @click="copyVerificationUrl"
          >
            <LinkIcon class="w-4 h-4 mr-2" />
            Copy Verification URL
          </button>
          <span v-if="urlCopied" class="text-sm text-green-600 flex items-center">
            <CheckCircleIcon class="w-4 h-4 mr-1" />
            URL copied to clipboard!
          </span>
        </div>
      </div>
    </div>
  </div>
</template>
