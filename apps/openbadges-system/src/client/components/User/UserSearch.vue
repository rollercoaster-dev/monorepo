<template>
  <div class="bg-white rounded-lg shadow-md p-6">
    <div class="flex items-center justify-between mb-6">
      <h2 class="text-lg font-semibold text-gray-900">Search & Filter Users</h2>
      <button class="text-sm text-gray-600 hover:text-gray-900" @click="clearFilters">
        Clear Filters
      </button>
    </div>

    <div class="space-y-4">
      <!-- Search Input -->
      <div>
        <label for="search" class="block text-sm font-medium text-gray-700 mb-2">Search</label>
        <div class="relative">
          <input
            id="search"
            v-model="searchQuery"
            type="text"
            placeholder="Search by name, username, or email..."
            class="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          />
          <MagnifyingGlassIcon class="absolute left-3 top-2.5 h-5 w-5 text-gray-400" />
        </div>
      </div>

      <!-- Filters Row -->
      <div class="grid grid-cols-1 md:grid-cols-4 gap-4">
        <!-- Role Filter -->
        <div>
          <label for="role" class="block text-sm font-medium text-gray-700 mb-2">Role</label>
          <select
            id="role"
            v-model="filters.role"
            class="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          >
            <option value="">All Roles</option>
            <option value="admin">Admin</option>
            <option value="user">User</option>
          </select>
        </div>

        <!-- Status Filter -->
        <div>
          <label for="status" class="block text-sm font-medium text-gray-700 mb-2">Status</label>
          <select
            id="status"
            v-model="filters.status"
            class="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          >
            <option value="">All Status</option>
            <option value="active">Active</option>
            <option value="inactive">Inactive</option>
          </select>
        </div>

        <!-- Registration Date Filter -->
        <div>
          <label for="dateFrom" class="block text-sm font-medium text-gray-700 mb-2">
            Registered From
          </label>
          <input
            id="dateFrom"
            v-model="filters.dateFrom"
            type="date"
            class="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          />
        </div>

        <div>
          <label for="dateTo" class="block text-sm font-medium text-gray-700 mb-2">
            Registered To
          </label>
          <input
            id="dateTo"
            v-model="filters.dateTo"
            type="date"
            class="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          />
        </div>
      </div>

      <!-- Advanced Filters (Collapsible) -->
      <div class="border-t pt-4">
        <button
          class="flex items-center space-x-2 text-sm text-gray-600 hover:text-gray-900"
          @click="showAdvanced = !showAdvanced"
        >
          <span>Advanced Filters</span>
          <ChevronDownIcon
            :class="['w-4 h-4 transition-transform', showAdvanced && 'rotate-180']"
          />
        </button>

        <div v-if="showAdvanced" class="mt-4 space-y-4">
          <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
            <!-- Credentials Filter -->
            <div>
              <label for="credentials" class="block text-sm font-medium text-gray-700 mb-2">
                Credentials
              </label>
              <select
                id="credentials"
                v-model="filters.credentials"
                class="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              >
                <option value="">Any</option>
                <option value="none">No Credentials</option>
                <option value="platform">Platform Authenticator</option>
                <option value="cross-platform">Cross-Platform Authenticator</option>
              </select>
            </div>

            <!-- Last Login Filter -->
            <div>
              <label for="lastLogin" class="block text-sm font-medium text-gray-700 mb-2">
                Last Login
              </label>
              <select
                id="lastLogin"
                v-model="filters.lastLogin"
                class="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              >
                <option value="">Any Time</option>
                <option value="today">Today</option>
                <option value="week">This Week</option>
                <option value="month">This Month</option>
                <option value="never">Never</option>
              </select>
            </div>
          </div>

          <!-- Sort Options -->
          <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label for="sortBy" class="block text-sm font-medium text-gray-700 mb-2">
                Sort By
              </label>
              <select
                id="sortBy"
                v-model="filters.sortBy"
                class="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              >
                <option value="createdAt">Registration Date</option>
                <option value="firstName">First Name</option>
                <option value="lastName">Last Name</option>
                <option value="username">Username</option>
                <option value="email">Email</option>
                <option value="lastLogin">Last Login</option>
              </select>
            </div>

            <div>
              <label for="sortOrder" class="block text-sm font-medium text-gray-700 mb-2">
                Sort Order
              </label>
              <select
                id="sortOrder"
                v-model="filters.sortOrder"
                class="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              >
                <option value="desc">Newest First</option>
                <option value="asc">Oldest First</option>
              </select>
            </div>
          </div>
        </div>
      </div>

      <!-- Action Buttons -->
      <div class="flex justify-end space-x-3 pt-4 border-t">
        <button
          class="px-4 py-2 text-gray-700 bg-gray-100 hover:bg-gray-200 rounded-md transition-colors"
          @click="exportUsers"
        >
          <div class="flex items-center space-x-2">
            <ArrowDownTrayIcon class="w-4 h-4" />
            <span>Export</span>
          </div>
        </button>
        <button
          class="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors"
          @click="applyFilters"
        >
          Apply Filters
        </button>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, watch } from 'vue'
import { useDebounceFn } from '@vueuse/core'
import { MagnifyingGlassIcon, ChevronDownIcon, ArrowDownTrayIcon } from '@heroicons/vue/24/outline'

interface SearchFilters {
  role: string
  status: string
  dateFrom: string
  dateTo: string
  credentials: string
  lastLogin: string
  sortBy: string
  sortOrder: 'asc' | 'desc'
}

interface Props {
  initialQuery?: string
  initialFilters?: Partial<SearchFilters>
}

const props = withDefaults(defineProps<Props>(), {
  initialQuery: '',
  initialFilters: () => ({}),
})

const emits = defineEmits<{
  search: [query: string, filters: SearchFilters]
  export: [filters: SearchFilters]
}>()

const searchQuery = ref(props.initialQuery)
const showAdvanced = ref(false)

const filters = ref<SearchFilters>({
  role: '',
  status: '',
  dateFrom: '',
  dateTo: '',
  credentials: '',
  lastLogin: '',
  sortBy: 'createdAt',
  sortOrder: 'desc',
  ...props.initialFilters,
})

const hasActiveFilters = computed(() => {
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

// Debounced search function to prevent excessive API calls
const debouncedSearch = useDebounceFn(() => {
  if (searchQuery.value.trim() !== '' || hasActiveFilters.value) {
    emits('search', searchQuery.value, filters.value)
  }
}, 300)

// Watch for changes and trigger debounced search
watch([searchQuery, filters], debouncedSearch, { deep: true })

function clearFilters() {
  searchQuery.value = ''
  filters.value = {
    role: '',
    status: '',
    dateFrom: '',
    dateTo: '',
    credentials: '',
    lastLogin: '',
    sortBy: 'createdAt',
    sortOrder: 'desc',
  }
}

function applyFilters() {
  emits('search', searchQuery.value, filters.value)
}

function exportUsers() {
  emits('export', filters.value)
}
</script>
