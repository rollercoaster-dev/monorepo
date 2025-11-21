<template>
  <div class="max-w-7xl mx-auto mt-8">
    <div class="flex justify-between items-center mb-6">
      <div>
        <h1 class="text-3xl font-bold text-gray-900">My Badge Backpack</h1>
        <p class="text-gray-600 mt-1">Your earned badges and achievements</p>
      </div>

      <div class="flex items-center space-x-3">
        <div class="bg-white rounded-lg shadow-md px-4 py-2">
          <div class="flex items-center space-x-2">
            <TrophyIcon class="w-5 h-5 text-yellow-500" />
            <span class="text-sm font-medium text-gray-700">
              {{ totalBadges }} {{ totalBadges === 1 ? 'Badge' : 'Badges' }}
            </span>
          </div>
        </div>

        <button
          class="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-md flex items-center space-x-2"
          @click="showShareModal = true"
        >
          <ShareIcon class="w-5 h-5" />
          <span>Share Backpack</span>
        </button>

        <div class="relative">
          <button
            class="bg-gray-100 hover:bg-gray-200 text-gray-700 px-4 py-2 rounded-md flex items-center space-x-2"
            @click="showExportMenu = !showExportMenu"
          >
            <ArrowDownTrayIcon class="w-5 h-5" />
            <span>Export</span>
            <ChevronDownIcon class="w-4 h-4" />
          </button>

          <div
            v-if="showExportMenu"
            class="absolute right-0 mt-2 w-48 bg-white rounded-md shadow-lg z-50"
          >
            <div class="py-1">
              <button
                class="block w-full text-left px-4 py-2 text-sm text-gray-700 hover:bg-gray-100"
                @click="exportBadges('json')"
              >
                Export as JSON
              </button>
              <button
                class="block w-full text-left px-4 py-2 text-sm text-gray-700 hover:bg-gray-100"
                @click="exportBadges('pdf')"
              >
                Export as PDF
              </button>
              <button
                class="block w-full text-left px-4 py-2 text-sm text-gray-700 hover:bg-gray-100"
                @click="exportBadges('png')"
              >
                Export as Images
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>

    <!-- Filter and Search -->
    <div class="bg-white rounded-lg shadow-md p-6 mb-6">
      <div class="flex flex-col md:flex-row gap-4">
        <div class="flex-1">
          <label class="block text-sm font-medium text-gray-700 mb-2">Search Badges</label>
          <div class="relative">
            <input
              v-model="searchQuery"
              type="text"
              placeholder="Search by badge name, issuer, or description..."
              class="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
            <MagnifyingGlassIcon class="absolute left-3 top-2.5 h-5 w-5 text-gray-400" />
          </div>
        </div>

        <div class="w-full md:w-48">
          <label class="block text-sm font-medium text-gray-700 mb-2">Filter by Issuer</label>
          <select
            v-model="selectedIssuer"
            class="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            <option value="">All Issuers</option>
            <option v-for="issuer in availableIssuers" :key="issuer" :value="issuer">
              {{ issuer }}
            </option>
          </select>
        </div>

        <div class="w-full md:w-48">
          <label class="block text-sm font-medium text-gray-700 mb-2">Sort by</label>
          <select
            v-model="sortBy"
            class="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            <option value="issuedOn">Date Earned</option>
            <option value="name">Badge Name</option>
            <option value="issuer">Issuer</option>
          </select>
        </div>

        <div class="w-full md:w-32">
          <label class="block text-sm font-medium text-gray-700 mb-2">View</label>
          <select
            v-model="layout"
            class="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            <option value="grid">Grid</option>
            <option value="list">List</option>
          </select>
        </div>
      </div>
    </div>

    <!-- Badge Statistics -->
    <div class="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
      <div class="bg-white rounded-lg shadow-md p-4">
        <div class="flex items-center">
          <div class="flex-shrink-0">
            <TrophyIcon class="w-8 h-8 text-yellow-500" />
          </div>
          <div class="ml-3">
            <p class="text-sm font-medium text-gray-500">Total Badges</p>
            <p class="text-2xl font-semibold text-gray-900">
              {{ totalBadges }}
            </p>
          </div>
        </div>
      </div>

      <div class="bg-white rounded-lg shadow-md p-4">
        <div class="flex items-center">
          <div class="flex-shrink-0">
            <CalendarDaysIcon class="w-8 h-8 text-blue-500" />
          </div>
          <div class="ml-3">
            <p class="text-sm font-medium text-gray-500">This Month</p>
            <p class="text-2xl font-semibold text-gray-900">
              {{ badgesThisMonth }}
            </p>
          </div>
        </div>
      </div>

      <div class="bg-white rounded-lg shadow-md p-4">
        <div class="flex items-center">
          <div class="flex-shrink-0">
            <BuildingOfficeIcon class="w-8 h-8 text-green-500" />
          </div>
          <div class="ml-3">
            <p class="text-sm font-medium text-gray-500">Issuers</p>
            <p class="text-2xl font-semibold text-gray-900">
              {{ availableIssuers.length }}
            </p>
          </div>
        </div>
      </div>

      <div class="bg-white rounded-lg shadow-md p-4">
        <div class="flex items-center">
          <div class="flex-shrink-0">
            <CheckBadgeIcon class="w-8 h-8 text-purple-500" />
          </div>
          <div class="ml-3">
            <p class="text-sm font-medium text-gray-500">Verified</p>
            <p class="text-2xl font-semibold text-gray-900">
              {{ verifiedBadges }}
            </p>
          </div>
        </div>
      </div>
    </div>

    <!-- Badges Display -->
    <div class="bg-white rounded-lg shadow-md">
      <div class="px-6 py-4 border-b border-gray-200">
        <div class="flex items-center justify-between">
          <h2 class="text-lg font-semibold text-gray-900">
            Your Badges {{ filteredBadges.length > 0 ? `(${filteredBadges.length})` : '' }}
          </h2>
          <div class="flex items-center space-x-2">
            <button class="text-sm text-gray-600 hover:text-gray-900" @click="toggleSelectMode">
              {{ selectMode ? 'Done' : 'Select' }}
            </button>
            <span v-if="selectMode && selectedBadges.length > 0" class="text-sm text-gray-600">
              {{ selectedBadges.length }} selected
            </span>
          </div>
        </div>
      </div>

      <div v-if="isLoading" class="p-12 text-center">
        <div class="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500 mx-auto"></div>
        <p class="mt-4 text-gray-600">Loading your badges...</p>
      </div>

      <div v-else-if="filteredBadges.length === 0" class="p-12 text-center">
        <TrophyIcon class="w-16 h-16 text-gray-300 mx-auto mb-4" />
        <h3 class="text-lg font-medium text-gray-900 mb-2">No badges found</h3>
        <p class="text-gray-600">
          {{
            searchQuery || selectedIssuer
              ? 'Try adjusting your search or filter.'
              : 'Start earning badges to see them here!'
          }}
        </p>
      </div>

      <div v-else class="p-6">
        <BadgeList
          :badges="paginatedBadges"
          :layout="layout"
          :interactive="true"
          :loading="isLoading"
          :show-verification="true"
          :auto-verify="true"
          :page-size="pageSize"
          :current-page="currentPage"
          :show-pagination="totalPages > 1"
          @badge-click="handleBadgeClick"
          @page-change="handlePageChange"
          @verified="handleBadgeVerified"
        >
          <template #badge="{ badge }">
            <div class="relative">
              <div v-if="selectMode" class="absolute top-2 left-2 z-10">
                <input
                  :checked="selectedBadges.includes(badge.id)"
                  type="checkbox"
                  class="w-4 h-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
                  @change="toggleBadgeSelection(badge.id)"
                />
              </div>

              <div class="absolute top-2 right-2 flex items-center space-x-1">
                <button
                  class="p-1 text-gray-400 hover:text-blue-600 bg-white rounded-full shadow-sm"
                  title="Share badge"
                  @click.stop="handleShareBadge(badge)"
                >
                  <ShareIcon class="w-4 h-4" />
                </button>
                <button
                  class="p-1 text-gray-400 hover:text-green-600 bg-white rounded-full shadow-sm"
                  title="Download badge"
                  @click.stop="handleDownloadBadge(badge)"
                >
                  <ArrowDownTrayIcon class="w-4 h-4" />
                </button>
              </div>

              <div class="absolute bottom-2 right-2">
                <span class="text-xs text-gray-500 bg-white px-2 py-1 rounded">
                  {{ formatDate(badge.issuedOn) }}
                </span>
              </div>
            </div>
          </template>
        </BadgeList>
      </div>
    </div>

    <!-- Share Modal -->
    <div
      v-if="showShareModal"
      class="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50"
    >
      <div class="bg-white rounded-lg shadow-xl max-w-md w-full mx-4">
        <div class="p-6">
          <div class="flex items-center justify-between mb-4">
            <h3 class="text-lg font-medium text-gray-900">Share Your Backpack</h3>
            <button class="text-gray-400 hover:text-gray-600" @click="showShareModal = false">
              <XMarkIcon class="w-6 h-6" />
            </button>
          </div>

          <div class="space-y-4">
            <div>
              <label class="block text-sm font-medium text-gray-700 mb-2">Public Profile URL</label>
              <div class="flex">
                <input
                  :value="shareUrl"
                  readonly
                  class="flex-1 px-3 py-2 border border-gray-300 rounded-l-md bg-gray-50 text-sm"
                />
                <button
                  class="px-3 py-2 bg-blue-600 text-white rounded-r-md hover:bg-blue-700"
                  @click="copyToClipboard(shareUrl)"
                >
                  Copy
                </button>
              </div>
            </div>

            <div class="flex justify-center space-x-4">
              <button
                class="flex items-center space-x-2 px-4 py-2 bg-blue-400 text-white rounded-md hover:bg-blue-500"
                @click="shareToSocial('twitter')"
              >
                <span>Twitter</span>
              </button>
              <button
                class="flex items-center space-x-2 px-4 py-2 bg-blue-700 text-white rounded-md hover:bg-blue-800"
                @click="shareToSocial('linkedin')"
              >
                <span>LinkedIn</span>
              </button>
              <button
                class="flex items-center space-x-2 px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700"
                @click="shareToSocial('facebook')"
              >
                <span>Facebook</span>
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>

    <!-- Badge Detail Modal -->
    <div
      v-if="showDetailModal && selectedBadge"
      class="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50"
    >
      <div class="bg-white rounded-lg shadow-xl max-w-2xl w-full mx-4 max-h-[90vh] overflow-y-auto">
        <div class="p-6">
          <div class="flex items-center justify-between mb-6">
            <h3 class="text-xl font-semibold text-gray-900">Badge Details</h3>
            <button class="text-gray-400 hover:text-gray-600" @click="showDetailModal = false">
              <XMarkIcon class="w-6 h-6" />
            </button>
          </div>

          <BadgeDisplay
            :badge="selectedBadge"
            :show-description="true"
            :show-issued-date="true"
            :show-expiry-date="true"
            :show-verification="true"
            :auto-verify="true"
            :interactive="true"
          />

          <div class="mt-6 flex justify-end space-x-3">
            <button
              class="px-4 py-2 text-gray-700 bg-gray-100 hover:bg-gray-200 rounded-md"
              @click="handleShareBadge(selectedBadge)"
            >
              Share
            </button>
            <button
              class="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700"
              @click="handleDownloadBadge(selectedBadge)"
            >
              Download
            </button>
          </div>
        </div>
      </div>
    </div>

    <!-- Success/Error Messages -->
    <div
      v-if="error"
      class="fixed bottom-4 right-4 bg-red-500 text-white px-4 py-3 rounded-lg shadow-lg z-50"
    >
      <div class="flex items-center space-x-2">
        <ExclamationTriangleIcon class="w-5 h-5" />
        <span>{{ error }}</span>
        <button class="ml-2 hover:text-gray-200" @click="error = null">
          <XMarkIcon class="w-4 h-4" />
        </button>
      </div>
    </div>

    <div
      v-if="successMessage"
      class="fixed bottom-4 right-4 bg-green-500 text-white px-4 py-3 rounded-lg shadow-lg z-50"
    >
      <div class="flex items-center space-x-2">
        <CheckCircleIcon class="w-5 h-5" />
        <span>{{ successMessage }}</span>
        <button class="ml-2 hover:text-gray-200" @click="successMessage = null">
          <XMarkIcon class="w-4 h-4" />
        </button>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted, onUnmounted, watch } from 'vue'
import {
  TrophyIcon,
  ShareIcon,
  ArrowDownTrayIcon,
  ChevronDownIcon,
  MagnifyingGlassIcon,
  CalendarDaysIcon,
  BuildingOfficeIcon,
  CheckBadgeIcon,
  XMarkIcon,
  ExclamationTriangleIcon,
  CheckCircleIcon,
} from '@heroicons/vue/24/outline'
import { BadgeList, BadgeDisplay } from 'openbadges-ui'
import { useAuth } from '@/composables/useAuth'
import type { OB2, Shared } from 'openbadges-types'

const { user, getUserBackpack } = useAuth()

// Extended badge type that includes assertion data for display
interface DisplayBadge extends OB2.BadgeClass {
  issuedOn?: Shared.DateTime
  recipient?: OB2.IdentityObject
  evidence?: OB2.Evidence | OB2.Evidence[]
  narrative?: string
  expires?: Shared.DateTime
}

// Component state
const isLoading = ref(true)
const error = ref<string | null>(null)
const successMessage = ref<string | null>(null)
const badges = ref<DisplayBadge[]>([])
const searchQuery = ref('')
const selectedIssuer = ref('')
const sortBy = ref('issuedOn')
const layout = ref<'grid' | 'list'>('grid')
const selectMode = ref(false)
const selectedBadges = ref<string[]>([])
const showShareModal = ref(false)
const showDetailModal = ref(false)
const showExportMenu = ref(false)
const selectedBadge = ref<DisplayBadge | null>(null)
const currentPage = ref(1)
const pageSize = ref(12)

// Computed properties
const availableIssuers = computed(() => {
  const issuers = new Set<string>()
  badges.value.forEach(badge => {
    if (typeof badge.issuer === 'string') {
      issuers.add(badge.issuer)
    } else if (badge.issuer && badge.issuer.name) {
      issuers.add(badge.issuer.name)
    }
  })
  return Array.from(issuers).sort()
})

const filteredBadges = computed(() => {
  let filtered = badges.value

  // Apply search filter
  if (searchQuery.value) {
    const query = searchQuery.value.toLowerCase()
    filtered = filtered.filter(
      badge =>
        badge.name.toLowerCase().includes(query) ||
        badge.description.toLowerCase().includes(query) ||
        getIssuerName(badge.issuer).toLowerCase().includes(query)
    )
  }

  // Apply issuer filter
  if (selectedIssuer.value) {
    filtered = filtered.filter(badge => getIssuerName(badge.issuer) === selectedIssuer.value)
  }

  // Apply sorting
  filtered.sort((a, b) => {
    switch (sortBy.value) {
      case 'name':
        return a.name.localeCompare(b.name)
      case 'issuer':
        return getIssuerName(a.issuer).localeCompare(getIssuerName(b.issuer))
      case 'issuedOn':
      default: {
        // Use issuedOn date from assertion data
        const aDate = new Date(a.issuedOn || 0)
        const bDate = new Date(b.issuedOn || 0)
        return bDate.getTime() - aDate.getTime()
      }
    }
  })

  return filtered
})

const paginatedBadges = computed(() => {
  const start = (currentPage.value - 1) * pageSize.value
  const end = start + pageSize.value
  return filteredBadges.value.slice(start, end)
})

const totalPages = computed(() => Math.ceil(filteredBadges.value.length / pageSize.value))

const totalBadges = computed(() => badges.value.length)

const badgesThisMonth = computed(() => {
  const now = new Date()
  const thisMonth = new Date(now.getFullYear(), now.getMonth(), 1)

  return badges.value.filter(badge => {
    const issuedDate = new Date(badge.issuedOn || 0)
    return issuedDate >= thisMonth
  }).length
})

const verifiedBadges = computed(() => {
  // This would need to be implemented based on verification status
  return badges.value.length // Placeholder
})

const shareUrl = computed(() => {
  if (!user.value) return ''
  return `${window.location.origin}/profile/${user.value.username}`
})

// Load badges on mount
onMounted(async () => {
  if (user.value) {
    await loadUserBadges()
  }
})

// Watch for user changes
watch(
  user,
  async newUser => {
    if (newUser) {
      await loadUserBadges()
    }
  },
  { immediate: true }
)

// Auto-clear success message
watch(successMessage, message => {
  if (message) {
    setTimeout(() => {
      successMessage.value = null
    }, 5000)
  }
})

async function loadUserBadges() {
  if (!user.value) return

  isLoading.value = true
  error.value = null

  try {
    const backpack = await getUserBackpack()
    if (backpack && backpack.assertions) {
      // Convert assertions to badges for display - we'll store the full assertions
      // and extract badge data when needed for display
      badges.value = backpack.assertions.map(assertion => {
        // If badge is an IRI, create a minimal BadgeClass structure
        if (typeof assertion.badge === 'string') {
          return {
            id: assertion.badge as Shared.IRI,
            type: 'BadgeClass' as const,
            name: 'Badge',
            description: 'Badge description',
            image: '/placeholder-badge.png' as Shared.IRI,
            criteria: { narrative: 'Badge criteria' },
            issuer: {
              id: 'unknown-issuer' as Shared.IRI,
              type: 'Profile' as const,
              name: 'Unknown Issuer',
            },
            // Add assertion data
            issuedOn: assertion.issuedOn,
            recipient: assertion.recipient,
            evidence: assertion.evidence,
            narrative: assertion.narrative,
            expires: assertion.expires,
          } as DisplayBadge
        } else {
          // Badge is already a BadgeClass, add assertion data
          return {
            ...assertion.badge,
            issuedOn: assertion.issuedOn,
            recipient: assertion.recipient,
            evidence: assertion.evidence,
            narrative: assertion.narrative,
            expires: assertion.expires,
          } as DisplayBadge
        }
      })
    }
  } catch (err) {
    console.error('Failed to load user backpack:', err)
    error.value = 'Failed to load your badges. Please try again.'
  } finally {
    isLoading.value = false
  }
}

function getIssuerName(issuer: OB2.Profile | string): string {
  if (typeof issuer === 'string') {
    return issuer
  }
  return issuer.name || 'Unknown Issuer'
}

function formatDate(dateString: string): string {
  const date = new Date(dateString)
  return date.toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  })
}

function toggleSelectMode() {
  selectMode.value = !selectMode.value
  if (!selectMode.value) {
    selectedBadges.value = []
  }
}

function toggleBadgeSelection(badgeId: string) {
  const index = selectedBadges.value.indexOf(badgeId)
  if (index > -1) {
    selectedBadges.value.splice(index, 1)
  } else {
    selectedBadges.value.push(badgeId)
  }
}

function handleBadgeClick(badge: DisplayBadge) {
  selectedBadge.value = badge
  showDetailModal.value = true
}

function handlePageChange(page: number) {
  currentPage.value = page
}

function handleBadgeVerified(badge: DisplayBadge) {
  console.log('Badge verified:', badge)
}

function handleShareBadge(badge: DisplayBadge) {
  // TODO: Implement individual badge sharing
  console.log('Share badge:', badge)
}

function handleDownloadBadge(badge: DisplayBadge) {
  // TODO: Implement badge download
  console.log('Download badge:', badge)
}

function exportBadges(format: 'json' | 'pdf' | 'png') {
  // TODO: Implement badge export
  console.log('Export badges as:', format)
  successMessage.value = `Badges exported as ${format.toUpperCase()}`
  showExportMenu.value = false
}

function copyToClipboard(text: string) {
  navigator.clipboard
    .writeText(text)
    .then(() => {
      successMessage.value = 'URL copied to clipboard!'
    })
    .catch(() => {
      error.value = 'Failed to copy URL'
    })
}

function shareToSocial(platform: 'twitter' | 'linkedin' | 'facebook') {
  const url = shareUrl.value
  const text = `Check out my digital badges! I've earned ${totalBadges.value} badges.`

  let socialShareUrl = ''

  switch (platform) {
    case 'twitter':
      socialShareUrl = `https://twitter.com/intent/tweet?text=${encodeURIComponent(text)}&url=${encodeURIComponent(url)}`
      break
    case 'linkedin':
      socialShareUrl = `https://www.linkedin.com/sharing/share-offsite/?url=${encodeURIComponent(url)}`
      break
    case 'facebook':
      socialShareUrl = `https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(url)}`
      break
  }

  window.open(socialShareUrl, '_blank', 'width=600,height=400')
  showShareModal.value = false
}

// Close export menu when clicking outside
const handleClickOutside = (e: Event) => {
  const target = e.target as HTMLElement | null
  if (target && target.closest && !target.closest('.relative')) {
    showExportMenu.value = false
  }
}

onMounted(() => {
  document.addEventListener('click', handleClickOutside)
})

onUnmounted(() => {
  document.removeEventListener('click', handleClickOutside)
})
</script>
