import { ref, computed } from 'vue'
import type { User, WebAuthnCredential } from '@/composables/useAuth'

export interface UserSearchFilters {
  role: string
  status: string
  dateFrom: string
  dateTo: string
  credentials: string
  lastLogin: string
  sortBy: string
  sortOrder: 'asc' | 'desc'
}

export interface UsersPaginationData {
  users: User[]
  totalUsers: number
  currentPage: number
  itemsPerPage: number
  totalPages: number
}

export interface CreateUserData {
  username: string
  email: string
  firstName: string
  lastName: string
  avatar?: string
  isAdmin: boolean
}

export interface UpdateUserData {
  email?: string
  firstName?: string
  lastName?: string
  avatar?: string
  isAdmin?: boolean
  roles?: string[]
}

interface BackendUser {
  id: string
  username: string
  email: string
  firstName: string
  lastName: string
  avatar?: string
  isActive: boolean
  roles: string[]
  createdAt: string
  updatedAt: string
  credentials: WebAuthnCredential[]
}

export const useUsers = () => {
  const users = ref<User[]>([])
  const totalUsers = ref(0)
  const currentPage = ref(1)
  const itemsPerPage = ref(10)
  const isLoading = ref(false)
  const error = ref<string | null>(null)
  const searchQuery = ref('')
  const filters = ref<UserSearchFilters>({
    role: '',
    status: '',
    dateFrom: '',
    dateTo: '',
    credentials: '',
    lastLogin: '',
    sortBy: 'createdAt',
    sortOrder: 'desc',
  })

  const totalPages = computed(() => Math.ceil(totalUsers.value / itemsPerPage.value))

  const hasFilters = computed(() => {
    return (
      searchQuery.value.trim() !== '' ||
      filters.value.role !== '' ||
      filters.value.status !== '' ||
      filters.value.dateFrom !== '' ||
      filters.value.dateTo !== '' ||
      filters.value.credentials !== '' ||
      filters.value.lastLogin !== '' ||
      filters.value.sortBy !== 'createdAt' ||
      filters.value.sortOrder !== 'desc'
    )
  })

  // API calls
  const apiCall = async (endpoint: string, options: RequestInit = {}) => {
    const response = await fetch(`/api/bs${endpoint}`, {
      headers: {
        'Content-Type': 'application/json',
        ...options.headers,
      },
      ...options,
    })

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({ message: 'Unknown error' }))
      throw new Error(errorData.message || `API call failed: ${response.status}`)
    }

    return response.json()
  }

  // Fetch users with pagination and filters
  const fetchUsers = async (
    page: number = 1,
    perPage: number = 10,
    query: string = '',
    searchFilters: UserSearchFilters = filters.value
  ) => {
    isLoading.value = true
    error.value = null

    try {
      const params = new URLSearchParams({
        page: page.toString(),
        limit: perPage.toString(),
        ...(query && { search: query }),
        ...(searchFilters.role && { role: searchFilters.role }),
        ...(searchFilters.status && { status: searchFilters.status }),
        ...(searchFilters.dateFrom && { dateFrom: searchFilters.dateFrom }),
        ...(searchFilters.dateTo && { dateTo: searchFilters.dateTo }),
        ...(searchFilters.credentials && { credentials: searchFilters.credentials }),
        ...(searchFilters.lastLogin && { lastLogin: searchFilters.lastLogin }),
        sortBy: searchFilters.sortBy,
        sortOrder: searchFilters.sortOrder,
      })

      const response = await apiCall(`/users?${params}`)

      // Transform backend user data to frontend User interface
      const transformedUsers = response.users.map(
        (backendUser: BackendUser): User => ({
          id: backendUser.id,
          username: backendUser.username,
          email: backendUser.email,
          firstName: backendUser.firstName || '',
          lastName: backendUser.lastName || '',
          avatar: backendUser.avatar,
          isAdmin: backendUser.roles?.includes('ADMIN') || false,
          createdAt: backendUser.createdAt,
          credentials: backendUser.credentials || [],
        })
      )

      users.value = transformedUsers
      totalUsers.value = response.total
      currentPage.value = page
      itemsPerPage.value = perPage
    } catch (err) {
      error.value = err instanceof Error ? err.message : 'Failed to fetch users'
      console.error('Error fetching users:', err)
    } finally {
      isLoading.value = false
    }
  }

  // Create new user
  const createUser = async (userData: CreateUserData): Promise<User | null> => {
    isLoading.value = true
    error.value = null

    try {
      const response = await apiCall('/users', {
        method: 'POST',
        body: JSON.stringify({
          username: userData.username,
          email: userData.email,
          firstName: userData.firstName,
          lastName: userData.lastName,
          avatar: userData.avatar,
          isActive: true,
          roles: userData.isAdmin ? ['ADMIN', 'USER'] : ['USER'],
        }),
      })

      const newUser: User = {
        id: response.id,
        username: response.username,
        email: response.email,
        firstName: response.firstName || '',
        lastName: response.lastName || '',
        avatar: response.avatar,
        isAdmin: response.roles?.includes('ADMIN') || false,
        createdAt: response.createdAt,
        credentials: [],
      }

      // Add to local users array if we're on the first page
      if (currentPage.value === 1) {
        users.value.unshift(newUser)
        totalUsers.value++
      }

      return newUser
    } catch (err) {
      error.value = err instanceof Error ? err.message : 'Failed to create user'
      console.error('Error creating user:', err)
      return null
    } finally {
      isLoading.value = false
    }
  }

  // Update user
  const updateUser = async (userId: string, userData: UpdateUserData): Promise<User | null> => {
    isLoading.value = true
    error.value = null

    try {
      const updateData = {
        ...(userData.email && { email: userData.email }),
        ...(userData.firstName && { firstName: userData.firstName }),
        ...(userData.lastName && { lastName: userData.lastName }),
        ...(userData.avatar !== undefined && { avatar: userData.avatar }),
        ...(userData.isAdmin !== undefined && {
          roles: userData.isAdmin ? ['ADMIN', 'USER'] : ['USER'],
        }),
      }

      const response = await apiCall(`/users/${userId}`, {
        method: 'PUT',
        body: JSON.stringify(updateData),
      })

      const updatedUser: User = {
        id: response.id,
        username: response.username,
        email: response.email,
        firstName: response.firstName || '',
        lastName: response.lastName || '',
        avatar: response.avatar,
        isAdmin: response.roles?.includes('ADMIN') || false,
        createdAt: response.createdAt,
        credentials: response.credentials || [],
      }

      // Update local users array
      const index = users.value.findIndex(u => u.id === userId)
      if (index !== -1) {
        users.value[index] = updatedUser
      }

      return updatedUser
    } catch (err) {
      error.value = err instanceof Error ? err.message : 'Failed to update user'
      console.error('Error updating user:', err)
      return null
    } finally {
      isLoading.value = false
    }
  }

  // Delete user
  const deleteUser = async (userId: string): Promise<boolean> => {
    isLoading.value = true
    error.value = null

    try {
      await apiCall(`/users/${userId}`, {
        method: 'DELETE',
      })

      // Remove from local users array
      users.value = users.value.filter(u => u.id !== userId)
      totalUsers.value--

      return true
    } catch (err) {
      error.value = err instanceof Error ? err.message : 'Failed to delete user'
      console.error('Error deleting user:', err)
      return false
    } finally {
      isLoading.value = false
    }
  }

  // Get user by ID
  const getUserById = async (userId: string): Promise<User | null> => {
    isLoading.value = true
    error.value = null

    try {
      const response = await apiCall(`/users/${userId}`)

      return {
        id: response.id,
        username: response.username,
        email: response.email,
        firstName: response.firstName || '',
        lastName: response.lastName || '',
        avatar: response.avatar,
        isAdmin: response.roles?.includes('ADMIN') || false,
        createdAt: response.createdAt,
        credentials: response.credentials || [],
      }
    } catch (err) {
      error.value = err instanceof Error ? err.message : 'Failed to fetch user'
      console.error('Error fetching user:', err)
      return null
    } finally {
      isLoading.value = false
    }
  }

  // Remove user credential
  const removeUserCredential = async (userId: string, credentialId: string): Promise<boolean> => {
    isLoading.value = true
    error.value = null

    try {
      await apiCall(`/users/${userId}/credentials/${credentialId}`, {
        method: 'DELETE',
      })

      // Update local user's credentials
      const userIndex = users.value.findIndex(u => u.id === userId)
      if (userIndex !== -1 && users.value[userIndex]?.credentials) {
        users.value[userIndex].credentials = users.value[userIndex].credentials.filter(
          c => c.id !== credentialId
        )
      }

      return true
    } catch (err) {
      error.value = err instanceof Error ? err.message : 'Failed to remove credential'
      console.error('Error removing credential:', err)
      return false
    } finally {
      isLoading.value = false
    }
  }

  // Search users
  const searchUsers = (query: string, searchFilters: UserSearchFilters) => {
    searchQuery.value = query
    filters.value = searchFilters
    fetchUsers(1, itemsPerPage.value, query, searchFilters)
  }

  // Change page
  const changePage = (page: number) => {
    if (page >= 1 && page <= totalPages.value) {
      fetchUsers(page, itemsPerPage.value, searchQuery.value, filters.value)
    }
  }

  // Change items per page
  const changeItemsPerPage = (perPage: number) => {
    itemsPerPage.value = perPage
    fetchUsers(1, perPage, searchQuery.value, filters.value)
  }

  // Export users
  const exportUsers = async (searchFilters: UserSearchFilters): Promise<Blob | null> => {
    isLoading.value = true
    error.value = null

    try {
      const params = new URLSearchParams({
        format: 'csv',
        ...(searchFilters.role && { role: searchFilters.role }),
        ...(searchFilters.status && { status: searchFilters.status }),
        ...(searchFilters.dateFrom && { dateFrom: searchFilters.dateFrom }),
        ...(searchFilters.dateTo && { dateTo: searchFilters.dateTo }),
        ...(searchFilters.credentials && { credentials: searchFilters.credentials }),
        ...(searchFilters.lastLogin && { lastLogin: searchFilters.lastLogin }),
        sortBy: searchFilters.sortBy,
        sortOrder: searchFilters.sortOrder,
      })

      const response = await fetch(`/api/bs/users/export?${params}`)
      if (!response.ok) {
        throw new Error('Export failed')
      }

      return await response.blob()
    } catch (err) {
      error.value = err instanceof Error ? err.message : 'Failed to export users'
      console.error('Error exporting users:', err)
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
    users,
    totalUsers,
    currentPage,
    itemsPerPage,
    totalPages,
    isLoading,
    error,
    searchQuery,
    filters,
    hasFilters,

    // Actions
    fetchUsers,
    createUser,
    updateUser,
    deleteUser,
    getUserById,
    removeUserCredential,
    searchUsers,
    changePage,
    changeItemsPerPage,
    exportUsers,
    clearError,
  }
}
