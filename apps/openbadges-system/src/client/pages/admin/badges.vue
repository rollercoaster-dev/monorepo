<script setup lang="ts">
import { ref, onMounted, watch } from 'vue'
import {
  PlusIcon,
  XMarkIcon,
  PencilIcon,
  ShareIcon,
  TrashIcon,
  TrophyIcon,
  CheckBadgeIcon,
  ExclamationTriangleIcon,
  CheckCircleIcon,
} from '@heroicons/vue/24/outline'
import { BadgeList, BadgeDisplay, BadgeIssuerForm } from 'openbadges-ui'
import { useBadges } from '@/composables/useBadges'
import { useAuth } from '@/composables/useAuth'
import type { BadgeAssertion } from '@/composables/useBadges'
import type { OB2 } from 'openbadges-types'

const { user } = useAuth()

const {
  badges,
  assertions,
  totalBadges,
  totalAssertions,
  currentPage,
  itemsPerPage,
  totalPages,
  isLoading,
  error,
  searchQuery,
  filters,
  fetchBadges,
  fetchAssertions,
  issueBadge,
  revokeBadge,
  deleteBadge,
  changePage,
  changeItemsPerPage,
  clearError,
} = useBadges()

// Component state
const activeTab = ref<'classes' | 'assertions'>('classes')
const layout = ref<'grid' | 'list'>('grid')
const showCreateForm = ref(false)
const showIssueForm = ref(false)
const selectedBadge = ref<OB2.BadgeClass | null>(null)
const successMessage = ref<string | null>(null)
const availableIssuers = ref<string[]>([])

const issueForm = ref({
  recipientEmail: '',
  evidence: '',
  narrative: '',
})

// Load data on component mount
onMounted(() => {
  fetchBadges()
  fetchAssertions()
})

// Watch for tab changes
watch(activeTab, newTab => {
  if (newTab === 'classes') {
    fetchBadges()
  } else {
    fetchAssertions()
  }
})

// Watch for search changes
watch(
  [searchQuery, filters],
  () => {
    if (activeTab.value === 'classes') {
      fetchBadges(1, itemsPerPage.value, searchQuery.value, filters.value)
    }
  },
  { deep: true }
)

// Populate available issuers from badges for filter dropdown
watch(
  badges,
  newBadges => {
    if (newBadges && newBadges.length > 0) {
      const issuers = new Set<string>()
      for (const badge of newBadges) {
        if (badge.issuer) {
          // Handle issuer as string (URL) or object with name
          const issuerName =
            typeof badge.issuer === 'string'
              ? badge.issuer
              : (badge.issuer as { name?: string }).name || String(badge.issuer)
          if (issuerName) issuers.add(issuerName)
        }
      }
      availableIssuers.value = Array.from(issuers).sort()
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

function toggleLayout() {
  layout.value = layout.value === 'grid' ? 'list' : 'grid'
}

function clearFilters() {
  searchQuery.value = ''
  filters.value = {
    issuer: '',
    status: '',
    dateFrom: '',
    dateTo: '',
    tags: [],
    sortBy: 'createdAt',
    sortOrder: 'desc',
  }
}

function handleBadgeClick(badge: OB2.BadgeClass) {
  selectedBadge.value = badge
  // Could show a detailed view modal here
}

function handleEditBadge(badge: OB2.BadgeClass) {
  selectedBadge.value = badge
  // Navigate to badge edit page
  window.location.href = `/badges/${badge.id}/edit`
}

function handleIssueBadge(badge: OB2.BadgeClass) {
  selectedBadge.value = badge
  showIssueForm.value = true
  issueForm.value = {
    recipientEmail: '',
    evidence: '',
    narrative: '',
  }
}

function handleDeleteBadge(badge: OB2.BadgeClass) {
  if (confirm(`Are you sure you want to delete the badge "${badge.name}"?`)) {
    if (user.value) {
      deleteBadge(user.value, badge.id).then(success => {
        if (success) {
          successMessage.value = `Badge "${badge.name}" deleted successfully`
        }
      })
    }
  }
}

function handleBadgeCreated(badge: OB2.BadgeClass) {
  showCreateForm.value = false
  successMessage.value = `Badge "${badge.name}" created successfully`
  fetchBadges() // Refresh the list
}

function handleSubmitIssue() {
  if (!selectedBadge.value || !user.value) return

  issueBadge(user.value, {
    badgeClassId: selectedBadge.value.id,
    recipientEmail: issueForm.value.recipientEmail,
    evidence: issueForm.value.evidence || undefined,
    narrative: issueForm.value.narrative || undefined,
  }).then(assertion => {
    if (assertion) {
      showIssueForm.value = false
      successMessage.value = `Badge issued successfully to ${issueForm.value.recipientEmail}`
      if (activeTab.value === 'assertions') {
        fetchAssertions() // Refresh assertions if on that tab
      }
    }
  })
}

function handleViewAssertion(assertion: BadgeAssertion) {
  // Navigate to assertion verification page
  window.location.href = `/verify/${assertion.id}`
}

function handleRevokeAssertion(assertion: BadgeAssertion) {
  const reason = prompt('Please provide a reason for revoking this badge:')
  if (reason && user.value) {
    revokeBadge(user.value, assertion.id, reason).then(success => {
      if (success) {
        successMessage.value = `Badge assertion revoked successfully`
        fetchAssertions() // Refresh the list
      }
    })
  }
}

function formatDate(dateString: string): string {
  const date = new Date(dateString)
  return date.toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  })
}

function getImageSrc(image: string | OB2.Image | undefined): string | undefined {
  if (!image) return undefined
  if (typeof image === 'string') return image
  return image.id || undefined
}

function getBadgeImage(badge: string | OB2.BadgeClass): string | undefined {
  if (typeof badge === 'string') return undefined
  return getImageSrc(badge.image)
}

function getBadgeName(badge: string | OB2.BadgeClass): string {
  if (typeof badge === 'string') return badge
  return badge.name || 'Unknown Badge'
}
</script>

<template>
  <div class="max-w-7xl mx-auto mt-8">
    <div class="flex justify-between items-center mb-6">
      <h1 class="text-2xl font-bold text-gray-900">Badge Management</h1>
      <div class="flex items-center space-x-3">
        <button
          :class="[
            'px-4 py-2 rounded-md text-sm font-medium transition-colors',
            activeTab === 'classes'
              ? 'bg-blue-600 text-white'
              : 'bg-gray-100 text-gray-700 hover:bg-gray-200',
          ]"
          @click="activeTab = 'classes'"
        >
          Badge Classes
        </button>
        <button
          :class="[
            'px-4 py-2 rounded-md text-sm font-medium transition-colors',
            activeTab === 'assertions'
              ? 'bg-blue-600 text-white'
              : 'bg-gray-100 text-gray-700 hover:bg-gray-200',
          ]"
          @click="activeTab = 'assertions'"
        >
          Issued Badges
        </button>
        <button
          class="bg-green-600 hover:bg-green-700 text-white px-4 py-2 rounded-md flex items-center space-x-2"
          @click="showCreateForm = true"
        >
          <PlusIcon class="w-5 h-5" />
          <span>Create Badge</span>
        </button>
      </div>
    </div>

    <!-- Badge Classes Tab -->
    <div v-if="activeTab === 'classes'" class="space-y-6">
      <!-- Search and Filters -->
      <div class="bg-white rounded-lg shadow-md p-6">
        <div class="flex items-center justify-between mb-4">
          <h2 class="text-lg font-semibold text-gray-900">Search & Filter Badge Classes</h2>
          <button class="text-sm text-gray-600 hover:text-gray-900" @click="clearFilters">
            Clear Filters
          </button>
        </div>

        <div class="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div>
            <label class="block text-sm font-medium text-gray-700 mb-2">Search</label>
            <input
              v-model="searchQuery"
              type="text"
              placeholder="Search badges..."
              class="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>
          <div>
            <label class="block text-sm font-medium text-gray-700 mb-2">Issuer</label>
            <select
              v-model="filters.issuer"
              class="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="">All Issuers</option>
              <option v-for="issuer in availableIssuers" :key="issuer" :value="issuer">
                {{ issuer }}
              </option>
            </select>
          </div>
          <div>
            <label class="block text-sm font-medium text-gray-700 mb-2">Sort By</label>
            <select
              v-model="filters.sortBy"
              class="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="createdAt">Created Date</option>
              <option value="name">Name</option>
              <option value="issuer">Issuer</option>
            </select>
          </div>
        </div>
      </div>

      <!-- Badge Classes List -->
      <div class="bg-white rounded-lg shadow-md">
        <div class="px-6 py-4 border-b border-gray-200">
          <div class="flex items-center justify-between">
            <h2 class="text-lg font-semibold text-gray-900">Badge Classes ({{ totalBadges }})</h2>
            <div class="flex items-center space-x-2">
              <select
                v-model="itemsPerPage"
                class="px-3 py-1 border border-gray-300 rounded-md text-sm"
                @change="changeItemsPerPage(itemsPerPage)"
              >
                <option value="10">10 per page</option>
                <option value="25">25 per page</option>
                <option value="50">50 per page</option>
              </select>
              <button
                class="px-3 py-1 text-sm text-gray-600 hover:text-gray-900 border border-gray-300 rounded-md"
                @click="toggleLayout"
              >
                {{ layout === 'grid' ? 'List View' : 'Grid View' }}
              </button>
            </div>
          </div>
        </div>

        <div v-if="isLoading" class="p-8 text-center">
          <div class="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500 mx-auto"></div>
          <p class="mt-2 text-gray-600">Loading badges...</p>
        </div>

        <div v-else-if="badges.length === 0" class="p-8 text-center">
          <TrophyIcon class="w-16 h-16 text-gray-300 mx-auto mb-4" />
          <p class="text-gray-600">No badge classes found</p>
        </div>

        <div v-else class="p-6">
          <BadgeList
            :badges="badges"
            :layout="layout"
            :interactive="true"
            :loading="isLoading"
            :page-size="itemsPerPage"
            :current-page="currentPage"
            :show-pagination="totalPages > 1"
            @badge-click="handleBadgeClick"
            @page-change="changePage"
          >
            <template #badge="{ badge }">
              <div class="relative">
                <div class="absolute top-2 right-2 flex items-center space-x-1">
                  <button
                    class="p-1 text-gray-400 hover:text-blue-600 bg-white rounded-full shadow-sm"
                    title="Edit badge"
                    @click.stop="handleEditBadge(badge)"
                  >
                    <PencilIcon class="w-4 h-4" />
                  </button>
                  <button
                    class="p-1 text-gray-400 hover:text-green-600 bg-white rounded-full shadow-sm"
                    title="Issue badge"
                    @click.stop="handleIssueBadge(badge)"
                  >
                    <ShareIcon class="w-4 h-4" />
                  </button>
                  <button
                    class="p-1 text-gray-400 hover:text-red-600 bg-white rounded-full shadow-sm"
                    title="Delete badge"
                    @click.stop="handleDeleteBadge(badge)"
                  >
                    <TrashIcon class="w-4 h-4" />
                  </button>
                </div>
              </div>
            </template>
          </BadgeList>
        </div>
      </div>
    </div>

    <!-- Badge Assertions Tab -->
    <div v-if="activeTab === 'assertions'" class="space-y-6">
      <!-- Assertions List -->
      <div class="bg-white rounded-lg shadow-md">
        <div class="px-6 py-4 border-b border-gray-200">
          <h2 class="text-lg font-semibold text-gray-900">Issued Badges ({{ totalAssertions }})</h2>
        </div>

        <div v-if="isLoading" class="p-8 text-center">
          <div class="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500 mx-auto"></div>
          <p class="mt-2 text-gray-600">Loading assertions...</p>
        </div>

        <div v-else-if="assertions.length === 0" class="p-8 text-center">
          <CheckBadgeIcon class="w-16 h-16 text-gray-300 mx-auto mb-4" />
          <p class="text-gray-600">No badge assertions found</p>
        </div>

        <div v-else class="overflow-x-auto">
          <table class="w-full">
            <thead class="bg-gray-50">
              <tr>
                <th
                  class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider"
                >
                  Badge
                </th>
                <th
                  class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider"
                >
                  Recipient
                </th>
                <th
                  class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider"
                >
                  Issued Date
                </th>
                <th
                  class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider"
                >
                  Status
                </th>
                <th
                  class="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider"
                >
                  Actions
                </th>
              </tr>
            </thead>
            <tbody class="bg-white divide-y divide-gray-200">
              <tr v-for="assertion in assertions" :key="assertion.id" class="hover:bg-gray-50">
                <td class="px-6 py-4 whitespace-nowrap">
                  <div class="flex items-center">
                    <img
                      :src="getBadgeImage(assertion.badge)"
                      :alt="getBadgeName(assertion.badge)"
                      class="w-10 h-10 rounded-lg object-cover"
                    />
                    <div class="ml-4">
                      <div class="text-sm font-medium text-gray-900">
                        {{ getBadgeName(assertion.badge) }}
                      </div>
                    </div>
                  </div>
                </td>
                <td class="px-6 py-4 whitespace-nowrap">
                  <div class="text-sm text-gray-900">
                    {{ assertion.recipient.identity }}
                  </div>
                </td>
                <td class="px-6 py-4 whitespace-nowrap">
                  <div class="text-sm text-gray-900">
                    {{ formatDate(assertion.issuedOn) }}
                  </div>
                </td>
                <td class="px-6 py-4 whitespace-nowrap">
                  <span
                    :class="[
                      'inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium',
                      assertion.revoked ? 'bg-red-100 text-red-800' : 'bg-green-100 text-green-800',
                    ]"
                  >
                    {{ assertion.revoked ? 'Revoked' : 'Active' }}
                  </span>
                </td>
                <td class="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                  <div class="flex items-center justify-end space-x-2">
                    <button
                      class="text-blue-600 hover:text-blue-900"
                      @click="handleViewAssertion(assertion)"
                    >
                      View
                    </button>
                    <button
                      v-if="!assertion.revoked"
                      class="text-red-600 hover:text-red-900"
                      @click="handleRevokeAssertion(assertion)"
                    >
                      Revoke
                    </button>
                  </div>
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>
    </div>

    <!-- Create Badge Modal -->
    <div
      v-if="showCreateForm"
      class="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50"
    >
      <div class="bg-white rounded-lg shadow-xl max-w-4xl w-full mx-4 max-h-[90vh] overflow-y-auto">
        <div class="p-6">
          <div class="flex items-center justify-between mb-6">
            <h2 class="text-xl font-semibold text-gray-900">Create New Badge</h2>
            <button class="text-gray-400 hover:text-gray-600" @click="showCreateForm = false">
              <XMarkIcon class="w-6 h-6" />
            </button>
          </div>

          <BadgeIssuerForm @badge-issued="handleBadgeCreated" @reset="showCreateForm = false" />
        </div>
      </div>
    </div>

    <!-- Issue Badge Modal -->
    <div
      v-if="showIssueForm && selectedBadge"
      class="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50"
    >
      <div class="bg-white rounded-lg shadow-xl max-w-2xl w-full mx-4 max-h-[90vh] overflow-y-auto">
        <div class="p-6">
          <div class="flex items-center justify-between mb-6">
            <h2 class="text-xl font-semibold text-gray-900">Issue Badge</h2>
            <button class="text-gray-400 hover:text-gray-600" @click="showIssueForm = false">
              <XMarkIcon class="w-6 h-6" />
            </button>
          </div>

          <div class="mb-6">
            <BadgeDisplay :badge="selectedBadge" :show-description="true" :simplified-view="true" />
          </div>

          <form class="space-y-4" @submit.prevent="handleSubmitIssue">
            <div>
              <label class="block text-sm font-medium text-gray-700 mb-2">Recipient Email *</label>
              <input
                v-model="issueForm.recipientEmail"
                type="email"
                required
                class="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>

            <div>
              <label class="block text-sm font-medium text-gray-700 mb-2">
                Evidence (Optional)
              </label>
              <textarea
                v-model="issueForm.evidence"
                rows="3"
                class="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                placeholder="URL or description of evidence"
              ></textarea>
            </div>

            <div>
              <label class="block text-sm font-medium text-gray-700 mb-2">
                Narrative (Optional)
              </label>
              <textarea
                v-model="issueForm.narrative"
                rows="3"
                class="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                placeholder="Additional context or narrative"
              ></textarea>
            </div>

            <div class="flex justify-end space-x-3 pt-4">
              <button
                type="button"
                class="px-4 py-2 text-gray-700 bg-gray-100 hover:bg-gray-200 rounded-md"
                @click="showIssueForm = false"
              >
                Cancel
              </button>
              <button
                type="submit"
                :disabled="isLoading"
                class="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:opacity-50"
              >
                {{ isLoading ? 'Issuing...' : 'Issue Badge' }}
              </button>
            </div>
          </form>
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
        <button class="ml-2 hover:text-gray-200" @click="clearError">
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
