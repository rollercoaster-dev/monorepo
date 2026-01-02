import { ref, computed } from 'vue'
import { OB2, OB3 } from 'openbadges-types'
import type { Shared } from 'openbadges-types'
import type { User } from '@/composables/useAuth'

export interface BadgeSearchFilters {
  issuer: string
  status: string
  dateFrom: string
  dateTo: string
  tags: string[]
  sortBy: string
  sortOrder: 'asc' | 'desc'
}

export interface BadgesPaginationData {
  badges: (OB2.BadgeClass | OB3.Achievement)[]
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

// Extend OB2.Assertion with OB3 validity fields for backward compatibility
// OB3 uses validFrom/validUntil per VC Data Model 2.0, while OB2 uses expires
export type BadgeAssertion = OB2.Assertion & {
  validFrom?: string // OB3 field - when credential becomes valid
  validUntil?: string // OB3 field - when credential expires
}

export interface IssueBadgeData {
  badgeClassId: string
  recipientEmail: string
  evidence?: string
  narrative?: string
  validFrom?: string // OB3 field - when credential becomes valid
  validUntil?: string // OB3 field - when credential expires
}

/**
 * Type guards for detecting OB2 vs OB3 response formats
 * Used internally for response validation and normalization
 */

/**
 * Detect if a badge response is OB2 BadgeClass format
 */
const isBadgeOB2 = (badge: unknown): badge is OB2.BadgeClass => {
  return OB2.isBadgeClass(badge)
}

/**
 * Detect if a badge response is OB3 Achievement format
 */
const isBadgeOB3 = (badge: unknown): badge is OB3.Achievement => {
  return OB3.isAchievement(badge)
}

/**
 * Detect if an assertion response is OB2 Assertion format
 */
const isAssertionOB2 = (assertion: unknown): assertion is OB2.Assertion => {
  return OB2.isAssertion(assertion)
}

/**
 * Detect if a credential response is OB3 VerifiableCredential format
 */
const isCredentialOB3 = (credential: unknown): credential is OB3.VerifiableCredential => {
  return OB3.isVerifiableCredential(credential)
}

/**
 * Normalization helpers for consistent UI consumption
 * Handle differences between OB2 and OB3 data structures
 */

/**
 * Normalize badge data to a common format for UI consumption
 * Handles differences between OB2.BadgeClass and OB3.Achievement
 */
const normalizeBadgeData = (badge: OB2.BadgeClass | OB3.Achievement) => {
  if (isBadgeOB2(badge)) {
    return {
      id: badge.id,
      name: badge.name,
      description: badge.description,
      image: badge.image,
      criteria: badge.criteria,
      issuer: badge.issuer,
      tags: badge.tags,
      version: '2.0' as const,
    }
  } else if (isBadgeOB3(badge)) {
    return {
      id: badge.id,
      name:
        typeof badge.name === 'string'
          ? badge.name
          : badge.name?.en || Object.values(badge.name || {})[0] || '',
      description:
        typeof badge.description === 'string'
          ? badge.description
          : badge.description?.en || Object.values(badge.description || {})[0] || '',
      image: badge.image,
      criteria: badge.criteria,
      issuer: badge.creator,
      tags: [], // OB3 doesn't have tags field
      version: '3.0' as const,
    }
  }
  throw new Error('Unknown badge format')
}

/**
 * Normalize assertion/credential data for UI consumption
 * Handles differences between OB2.Assertion and OB3.VerifiableCredential
 */
const normalizeAssertionData = (data: BadgeAssertion | OB3.VerifiableCredential) => {
  if (isAssertionOB2(data)) {
    return {
      id: data.id,
      recipient: data.recipient,
      issuedOn: data.issuedOn,
      expires: data.expires,
      validFrom: data.validFrom,
      validUntil: data.validUntil,
      evidence: data.evidence,
      version: '2.0' as const,
    }
  } else if (isCredentialOB3(data)) {
    return {
      id: data.id,
      recipient: data.credentialSubject,
      issuedOn: data.validFrom,
      expires: data.validUntil,
      validFrom: data.validFrom,
      validUntil: data.validUntil,
      evidence: data.evidence,
      version: '3.0' as const,
    }
  }
  throw new Error('Unknown assertion format')
}

export const useBadges = () => {
  const badges = ref<(OB2.BadgeClass | OB3.Achievement)[]>([])
  const assertions = ref<(BadgeAssertion | OB3.VerifiableCredential)[]>([])
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

  // OB3 support: Version selection (default to 3.0 per acceptance criteria)
  const specVersion = ref<'2.0' | '3.0'>('3.0')

  // Compute API version path from spec version
  const apiVersion = computed(() => {
    return specVersion.value === '3.0' ? '/v3' : '/v2'
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
  const apiCall = async (endpoint: string, options: RequestInit = {}, version?: string) => {
    // Compute merged headers first to ensure Content-Type isn't accidentally dropped
    const mergedHeaders: Record<string, string> = {
      'Content-Type': 'application/json',
      ...((options.headers as Record<string, string>) ?? {}),
    }
    const versionPath = version || apiVersion.value
    const response = await fetch(`/api/badges${versionPath}${endpoint}`, {
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
  const basicApiCall = async (endpoint: string, options: RequestInit = {}, version?: string) => {
    // Compute merged headers first to ensure Content-Type isn't accidentally dropped
    const mergedHeaders: Record<string, string> = {
      'Content-Type': 'application/json',
      ...((options.headers as Record<string, string>) ?? {}),
    }
    const versionPath = version || apiVersion.value
    const response = await fetch(`/api/bs${versionPath}${endpoint}`, {
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

      const response = await basicApiCall(`/badge-classes?${params}`)

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
  ): Promise<OB2.BadgeClass | OB3.Achievement | null> => {
    isLoading.value = true
    error.value = null

    try {
      const token = await getPlatformToken(user)

      // Create badge class
      const response = await apiCall('/badge-classes', {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          type: 'BadgeClass',
          name: badgeData.name,
          description: badgeData.description,
          image: badgeData.image,
          criteria: badgeData.criteria,
          issuer: badgeData.issuer,
          tags: badgeData.tags,
          alignment: badgeData.alignment,
          expires: badgeData.expires,
        }),
      })

      const newBadge = response as OB2.BadgeClass | OB3.Achievement

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
  ): Promise<OB2.BadgeClass | OB3.Achievement | null> => {
    isLoading.value = true
    error.value = null

    try {
      const token = await getPlatformToken(user)

      // Update badge class
      const response = await apiCall(`/badge-classes/${badgeId}`, {
        method: 'PUT',
        headers: {
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify(badgeData),
      })

      const updatedBadge = response as OB2.BadgeClass | OB3.Achievement

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
      await apiCall(`/badge-classes/${badgeId}`, {
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
  const getBadgeById = async (
    badgeId: string
  ): Promise<OB2.BadgeClass | OB3.Achievement | null> => {
    isLoading.value = true
    error.value = null

    try {
      const response = await basicApiCall(`/badge-classes/${badgeId}`)
      return response as OB2.BadgeClass | OB3.Achievement
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
  ): Promise<BadgeAssertion | OB3.VerifiableCredential | null> => {
    isLoading.value = true
    error.value = null

    try {
      const token = await getPlatformToken(user)

      // Issue badge
      const response = await apiCall('/assertions', {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          badge: issueData.badgeClassId,
          recipient: {
            type: 'email',
            hashed: false,
            identity: issueData.recipientEmail,
          },
          issuedOn: new Date().toISOString(),
          validFrom: issueData.validFrom || new Date().toISOString(),
          validUntil: issueData.validUntil,
          evidence: issueData.evidence,
          narrative: issueData.narrative,
        }),
      })

      return response as BadgeAssertion | OB3.VerifiableCredential
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

      const response = await basicApiCall(`/assertions?${params}`)

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

      // Revoke assertion
      await apiCall(`/assertions/${assertionId}/revoke`, {
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
        const assertion = assertions.value[index]

        if (isAssertionOB2(assertion)) {
          // OB2: Set revoked flag directly on the assertion
          assertions.value[index] = {
            ...assertion,
            revoked: true,
            revocationReason: reason,
          }
        } else if (isCredentialOB3(assertion)) {
          // OB3: Revocation is handled via credentialStatus (StatusList2021)
          // Server manages the actual revocation status
          assertions.value[index] = {
            ...assertion,
            credentialStatus: assertion.credentialStatus || {
              id: `${assertion.id}/status` as Shared.IRI,
              type: 'StatusList2021Entry',
              statusPurpose: 'revocation',
            },
          }
        }
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

      const response = await fetch(`/api/bs${apiVersion.value}/badge-classes/export?${params}`)
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
    specVersion,
    apiVersion,

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

    // Type guards (exposed for testing and external use)
    isBadgeOB2,
    isBadgeOB3,
    isAssertionOB2,
    isCredentialOB3,

    // Normalization helpers (exposed for external use)
    normalizeBadgeData,
    normalizeAssertionData,
  }
}
