import { ref, computed } from 'vue'
import type { CompositeGuards as CompositeGuardsTypes } from 'openbadges-types'
import { OB2, OB3, OpenBadgesVersion, CompositeGuards } from 'openbadges-types'
import type { User } from '@/composables/useAuth'
import { normalizeIssueBadgeData, normalizeCreateBadgeData } from '@/utils/badgeTransform'

export interface BadgeSearchFilters {
  issuer: string
  status: string
  dateFrom: string
  dateTo: string
  tags: string[]
  sortBy: string
  sortOrder: 'asc' | 'desc'
}

// Type alias for badge classes supporting both OB2 and OB3
export type BadgeClass = OB2.BadgeClass | OB3.Achievement

export interface BadgesPaginationData {
  badges: BadgeClass[]
  totalBadges: number
  currentPage: number
  itemsPerPage: number
  totalPages: number
}

export interface CreateBadgeData {
  name: string
  description: string
  image: string
  criteria: {
    narrative: string
    id?: string
  }
  issuer: OB2.Profile
  tags?: string[]
  alignment?: OB2.AlignmentObject[]
  expires?: string
}

export interface UpdateBadgeData {
  name?: string
  description?: string
  image?: string
  criteria?: {
    narrative: string
    id?: string
  }
  tags?: string[]
  alignment?: OB2.AlignmentObject[]
  expires?: string
}

// Type alias for badge assertions supporting both OB2 and OB3
export type BadgeAssertion = CompositeGuardsTypes.Badge

export interface IssueBadgeData {
  badgeClassId: string
  recipientEmail: string
  evidence?: string
  narrative?: string
  validFrom?: string // OB3 field - when credential becomes valid
  validUntil?: string // OB3 field - when credential expires
}

/**
 * Composable for managing Open Badges with support for both OB2 and OB3 specifications
 *
 * @param initialVersion - The Open Badges specification version to use (defaults to OB3)
 * @returns Badge management functions and state
 *
 * @example
 * // Use OB3 (default)
 * const { badges, fetchBadges, specVersion } = useBadges()
 *
 * @example
 * // Use OB2 for backward compatibility
 * const { badges, fetchBadges, specVersion } = useBadges(OpenBadgesVersion.V2)
 *
 * @example
 * // Switch versions dynamically
 * const { specVersion, apiVersion, fetchBadges } = useBadges()
 * specVersion.value = OpenBadgesVersion.V2  // Switch to OB2
 * await fetchBadges()  // Now uses /v2/ endpoints
 *
 * @remarks
 * - OB2 mode: Uses /v2/badge-classes and /v2/assertions endpoints
 * - OB3 mode: Uses /v3/badge-classes and /v3/credentials endpoints
 * - All badges are typed as union types (BadgeClass, BadgeAssertion)
 * - Data transformation happens automatically based on specVersion
 * - Type guards validate API responses match expected format
 */
export const useBadges = (initialVersion: OpenBadgesVersion = OpenBadgesVersion.V3) => {
  // Version configuration
  const specVersion = ref<OpenBadgesVersion>(initialVersion)
  const apiVersion = computed(() => (specVersion.value === OpenBadgesVersion.V3 ? 'v3' : 'v2'))

  // State
  const badges = ref<BadgeClass[]>([])
  const assertions = ref<BadgeAssertion[]>([])
  const totalBadges = ref(0)
  const totalAssertions = ref(0)
  const currentPage = ref(1)
  const itemsPerPage = ref(10)
  const isLoading = ref(false)
  const error = ref<string | null>(null)
  const searchQuery = ref('')
  const filters = ref<BadgeSearchFilters>({
    issuer: '',
    status: '',
    dateFrom: '',
    dateTo: '',
    tags: [],
    sortBy: 'createdAt',
    sortOrder: 'desc',
  })

  const totalPages = computed(() => Math.ceil(totalBadges.value / itemsPerPage.value))

  const hasFilters = computed(() => {
    return (
      searchQuery.value.trim() !== '' ||
      filters.value.issuer !== '' ||
      filters.value.status !== '' ||
      filters.value.dateFrom !== '' ||
      filters.value.dateTo !== '' ||
      filters.value.tags.length > 0 ||
      filters.value.sortBy !== 'createdAt' ||
      filters.value.sortOrder !== 'desc'
    )
  })

  // API calls with platform authentication
  // eslint-disable-next-line no-undef
  const apiCall = async (endpoint: string, options: RequestInit = {}) => {
    // Compute merged headers first to ensure Content-Type isn't accidentally dropped
    const mergedHeaders: Record<string, string> = {
      'Content-Type': 'application/json',
      ...((options.headers as Record<string, string>) ?? {}),
    }
    const response = await fetch(`/api/badges${endpoint}`, {
      ...options,
      headers: mergedHeaders,
    })

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({ message: 'Unknown error' }))
      throw new Error(errorData.message || `API call failed: ${response.status}`)
    }

    // Gracefully handle no-content and non-JSON responses
    if (response.status === 204) return null
    const ct = response.headers.get('content-type') || ''
    if (!ct.includes('application/json')) return null
    return response.json()
  }

  // API calls with basic authentication (for public badge data)
  // eslint-disable-next-line no-undef
  const basicApiCall = async (endpoint: string, options: RequestInit = {}) => {
    // Compute merged headers first to ensure Content-Type isn't accidentally dropped
    const mergedHeaders: Record<string, string> = {
      'Content-Type': 'application/json',
      ...((options.headers as Record<string, string>) ?? {}),
    }
    const response = await fetch(`/api/bs${endpoint}`, {
      ...options,
      headers: mergedHeaders,
    })

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({ message: 'Unknown error' }))
      throw new Error(errorData.message || `API call failed: ${response.status}`)
    }

    if (response.status === 204) return null
    const ct = response.headers.get('content-type') || ''
    if (!ct.includes('application/json')) return null
    return response.json()
  }

  // Helper to get platform token for authenticated badge operations
  const getPlatformToken = async (user: User): Promise<string> => {
    const response = await fetch('/api/auth/platform-token', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ user }),
    })
    if (!response.ok) {
      throw new Error('Failed to get platform token')
    }
    const { token } = await response.json()
    return token
  }

  // Fetch badge classes with pagination and filters
  const fetchBadges = async (
    page: number = 1,
    perPage: number = 10,
    query: string = '',
    searchFilters: BadgeSearchFilters = filters.value
  ) => {
    isLoading.value = true
    error.value = null

    try {
      const params = new URLSearchParams({
        page: page.toString(),
        limit: perPage.toString(),
        ...(query && { search: query }),
        ...(searchFilters.issuer && { issuer: searchFilters.issuer }),
        ...(searchFilters.status && { status: searchFilters.status }),
        ...(searchFilters.dateFrom && { dateFrom: searchFilters.dateFrom }),
        ...(searchFilters.dateTo && { dateTo: searchFilters.dateTo }),
        ...(searchFilters.tags.length > 0 && { tags: searchFilters.tags.join(',') }),
        sortBy: searchFilters.sortBy,
        sortOrder: searchFilters.sortOrder,
      })

      const response = await basicApiCall(`/${apiVersion.value}/badge-classes?${params}`)

      // Guard against null/undefined response (204 or non-JSON)
      if (!response) {
        badges.value = []
        totalBadges.value = 0
        return
      }

      badges.value = response.badges || response // Handle different response formats
      totalBadges.value = response.total || badges.value.length
      currentPage.value = page
      itemsPerPage.value = perPage
    } catch (err) {
      error.value = err instanceof Error ? err.message : 'Failed to fetch badges'
      console.error('Error fetching badges:', err)
    } finally {
      isLoading.value = false
    }
  }

  // Create new badge class
  const createBadge = async (
    user: User,
    badgeData: CreateBadgeData
  ): Promise<BadgeClass | null> => {
    isLoading.value = true
    error.value = null

    try {
      const token = await getPlatformToken(user)

      // Normalize badge data for the appropriate version
      const requestBody = normalizeCreateBadgeData(badgeData, specVersion.value)

      // Create badge class
      const response = await apiCall(`/${apiVersion.value}/badge-classes`, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify(requestBody),
      })

      const newBadge = response as BadgeClass

      // Validate response using type guards (log warning if unexpected format)
      if (specVersion.value === OpenBadgesVersion.V3 && !OB3.isAchievement(newBadge)) {
        console.warn('Expected OB3 Achievement but received different format:', newBadge)
      } else if (specVersion.value === OpenBadgesVersion.V2 && !OB2.isBadgeClass(newBadge)) {
        console.warn('Expected OB2 BadgeClass but received different format:', newBadge)
      }

      // Add to local badges array if we're on the first page
      if (currentPage.value === 1) {
        badges.value.unshift(newBadge)
        totalBadges.value++
      }

      return newBadge
    } catch (err) {
      error.value = err instanceof Error ? err.message : 'Failed to create badge'
      console.error('Error creating badge:', err)
      return null
    } finally {
      isLoading.value = false
    }
  }

  // Update badge class
  const updateBadge = async (
    user: User,
    badgeId: string,
    badgeData: UpdateBadgeData
  ): Promise<BadgeClass | null> => {
    isLoading.value = true
    error.value = null

    try {
      const token = await getPlatformToken(user)

      // Update badge class
      const response = await apiCall(`/${apiVersion.value}/badge-classes/${badgeId}`, {
        method: 'PUT',
        headers: {
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify(badgeData),
      })

      const updatedBadge = response as BadgeClass

      // Update local badges array
      const index = badges.value.findIndex(b => b.id === badgeId)
      if (index !== -1) {
        badges.value[index] = updatedBadge
      }

      return updatedBadge
    } catch (err) {
      error.value = err instanceof Error ? err.message : 'Failed to update badge'
      console.error('Error updating badge:', err)
      return null
    } finally {
      isLoading.value = false
    }
  }

  // Delete badge class
  const deleteBadge = async (user: User, badgeId: string): Promise<boolean> => {
    isLoading.value = true
    error.value = null

    try {
      const token = await getPlatformToken(user)

      // Delete badge class
      await apiCall(`/${apiVersion.value}/badge-classes/${badgeId}`, {
        method: 'DELETE',
        headers: {
          Authorization: `Bearer ${token}`,
        },
      })

      // Remove from local badges array, only decrement if badge was actually present
      const originalLength = badges.value.length
      badges.value = badges.value.filter(b => b.id !== badgeId)
      if (badges.value.length < originalLength) {
        totalBadges.value = Math.max(0, totalBadges.value - 1)
      }

      return true
    } catch (err) {
      error.value = err instanceof Error ? err.message : 'Failed to delete badge'
      console.error('Error deleting badge:', err)
      return false
    } finally {
      isLoading.value = false
    }
  }

  // Get badge class by ID
  const getBadgeById = async (badgeId: string): Promise<BadgeClass | null> => {
    isLoading.value = true
    error.value = null

    try {
      const response = await basicApiCall(`/${apiVersion.value}/badge-classes/${badgeId}`)
      return response as BadgeClass
    } catch (err) {
      error.value = err instanceof Error ? err.message : 'Failed to fetch badge'
      console.error('Error fetching badge:', err)
      return null
    } finally {
      isLoading.value = false
    }
  }

  // Issue badge to recipient
  const issueBadge = async (
    user: User,
    issueData: IssueBadgeData
  ): Promise<BadgeAssertion | null> => {
    isLoading.value = true
    error.value = null

    try {
      const token = await getPlatformToken(user)

      // Normalize issue data for the appropriate version
      const requestBody = normalizeIssueBadgeData(issueData, specVersion.value)

      // Issue badge (OB3 uses /credentials instead of /assertions)
      const assertionEndpoint =
        specVersion.value === OpenBadgesVersion.V3 ? 'credentials' : 'assertions'
      const response = await apiCall(`/${apiVersion.value}/${assertionEndpoint}`, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify(requestBody),
      })

      const assertion = response as BadgeAssertion

      // Validate response using composite type guard
      if (!CompositeGuards.isBadge(assertion)) {
        console.warn('Received unexpected badge format:', assertion)
      }

      return assertion
    } catch (err) {
      error.value = err instanceof Error ? err.message : 'Failed to issue badge'
      console.error('Error issuing badge:', err)
      return null
    } finally {
      isLoading.value = false
    }
  }

  // Fetch badge assertions
  const fetchAssertions = async (page: number = 1, perPage: number = 10, badgeClassId?: string) => {
    isLoading.value = true
    error.value = null

    try {
      const params = new URLSearchParams({
        page: page.toString(),
        limit: perPage.toString(),
        ...(badgeClassId && { badgeClass: badgeClassId }),
      })

      const assertionEndpoint =
        specVersion.value === OpenBadgesVersion.V3 ? 'credentials' : 'assertions'
      const response = await basicApiCall(`/${apiVersion.value}/${assertionEndpoint}?${params}`)

      // Guard against null/undefined response (204 or non-JSON)
      if (!response) {
        assertions.value = []
        totalAssertions.value = 0
        return
      }

      assertions.value = response.assertions || response
      totalAssertions.value = response.total || assertions.value.length
      currentPage.value = page
      itemsPerPage.value = perPage
    } catch (err) {
      error.value = err instanceof Error ? err.message : 'Failed to fetch assertions'
      console.error('Error fetching assertions:', err)
    } finally {
      isLoading.value = false
    }
  }

  // Revoke badge assertion
  const revokeBadge = async (
    user: User,
    assertionId: string,
    reason?: string
  ): Promise<boolean> => {
    isLoading.value = true
    error.value = null

    try {
      const token = await getPlatformToken(user)

      // Revoke assertion (OB3 uses /credentials)
      const assertionEndpoint =
        specVersion.value === OpenBadgesVersion.V3 ? 'credentials' : 'assertions'
      await apiCall(`/${apiVersion.value}/${assertionEndpoint}/${assertionId}/revoke`, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          reason: reason || 'Badge revoked by administrator',
        }),
      })

      // Update local assertions array
      const index = assertions.value.findIndex(a => a.id === assertionId)
      if (index !== -1 && assertions.value[index]) {
        assertions.value[index].revoked = true
        assertions.value[index].revocationReason = reason
      }

      return true
    } catch (err) {
      error.value = err instanceof Error ? err.message : 'Failed to revoke badge'
      console.error('Error revoking badge:', err)
      return false
    } finally {
      isLoading.value = false
    }
  }

  // Search badges
  const searchBadges = (query: string, searchFilters: BadgeSearchFilters) => {
    searchQuery.value = query
    filters.value = searchFilters
    fetchBadges(1, itemsPerPage.value, query, searchFilters)
  }

  // Change page
  const changePage = (page: number) => {
    if (page >= 1 && page <= totalPages.value) {
      fetchBadges(page, itemsPerPage.value, searchQuery.value, filters.value)
    }
  }

  // Change items per page
  const changeItemsPerPage = (perPage: number) => {
    itemsPerPage.value = perPage
    fetchBadges(1, perPage, searchQuery.value, filters.value)
  }

  // Export badges
  const exportBadges = async (searchFilters: BadgeSearchFilters): Promise<Blob | null> => {
    isLoading.value = true
    error.value = null

    try {
      const params = new URLSearchParams({
        format: 'csv',
        ...(searchFilters.issuer && { issuer: searchFilters.issuer }),
        ...(searchFilters.status && { status: searchFilters.status }),
        ...(searchFilters.dateFrom && { dateFrom: searchFilters.dateFrom }),
        ...(searchFilters.dateTo && { dateTo: searchFilters.dateTo }),
        ...(searchFilters.tags.length > 0 && { tags: searchFilters.tags.join(',') }),
        sortBy: searchFilters.sortBy,
        sortOrder: searchFilters.sortOrder,
      })

      const response = await fetch(`/api/bs/${apiVersion.value}/badge-classes/export?${params}`)
      if (!response.ok) {
        throw new Error('Export failed')
      }

      return await response.blob()
    } catch (err) {
      error.value = err instanceof Error ? err.message : 'Failed to export badges'
      console.error('Error exporting badges:', err)
      return null
    } finally {
      isLoading.value = false
    }
  }

  // Clear error
  const clearError = () => {
    error.value = null
  }

  return {
    // Version control
    specVersion,
    apiVersion,

    // State
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
    hasFilters,

    // Actions
    fetchBadges,
    createBadge,
    updateBadge,
    deleteBadge,
    getBadgeById,
    issueBadge,
    fetchAssertions,
    revokeBadge,
    searchBadges,
    changePage,
    changeItemsPerPage,
    exportBadges,
    clearError,
  }
}
