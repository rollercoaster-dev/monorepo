<script setup lang="ts">
import { ref, onMounted } from 'vue'
import type { OB2, Shared } from 'openbadges-types'
import { BadgeDisplay } from 'openbadges-ui'
import { useAuth } from '@/composables/useAuth'

const { token, isAuthenticated } = useAuth()

const loading = ref(true)
const serverStatus = ref(false)
const modularServerLoading = ref(true)
const modularServerStatus = ref<string | null>(null)
const featuredBadge = ref<OB2.BadgeClass | null>(null)
const badgeError = ref<string | null>(null)

// Fallback mock badge for when no real badges are available
const mockBadge: OB2.BadgeClass = {
  type: 'BadgeClass',
  id: 'urn:uuid:demobadge123-monolith-master' as Shared.IRI,
  name: 'Monolith Master Badge',
  description:
    'This badge is awarded for successfully setting up the demonstration monolith application and displaying this badge.',
  image: 'https://via.placeholder.com/150/007bff/ffffff?Text=Monolith%20Badge' as Shared.IRI,
  criteria: {
    narrative:
      'Successfully integrate Bun, Hono, Vue, Vite, and display a badge from openbadges-ui using mock data.',
  },
  issuer: {
    type: 'Profile',
    id: 'urn:uuid:issuer-demo-project' as Shared.IRI,
    name: 'OpenBadges Demo Project Issuer',
    url: 'https://example.com/issuer/demoproject' as Shared.IRI,
  },
}

// Check server status on component mount
onMounted(async () => {
  loading.value = true // Set main loading true at the start
  modularServerLoading.value = true

  const monolithHealthCheck = async () => {
    try {
      const response = await fetch('/api/health')
      if (response.ok) {
        const data = await response.json()
        serverStatus.value = data.status === 'ok'
      } else {
        serverStatus.value = false
        console.error('Monolith server status check failed:', response.status, response.statusText)
      }
    } catch (error) {
      console.error('Error checking monolith server status:', error)
      serverStatus.value = false
    }
  }

  const modularServerHealthCheck = async () => {
    try {
      // Prepare headers with authentication if available
      const headers: Record<string, string> = {
        'Content-Type': 'application/json',
      }

      if (isAuthenticated.value && token.value) {
        headers.Authorization = `Bearer ${token.value}`
      }

      const bsResponse = await fetch('/api/bs/health', { headers })

      if (bsResponse.ok) {
        const bsData = await bsResponse.json()
        // Check for valid health response structure
        if (bsData && bsData.status === 'ok') {
          const uptime = bsData.uptime ? Math.round(bsData.uptime) : 0
          const dbType = bsData.database?.type || 'unknown'
          modularServerStatus.value = `Connected (uptime: ${uptime}s, db: ${dbType})`
        } else {
          modularServerStatus.value = `Unexpected response: ${JSON.stringify(bsData).substring(0, 100)}`
        }
      } else if (bsResponse.status === 401) {
        modularServerStatus.value = 'Authentication required - please log in to view server status'
      } else {
        modularServerStatus.value = `Error: ${bsResponse.status} ${bsResponse.statusText}`
      }
    } catch (error) {
      console.error('Error checking OpenBadges Modular Server status:', error)
      modularServerStatus.value = 'Connection attempt failed'
    }
  }

  const fetchFeaturedBadge = async () => {
    try {
      // Prepare headers with authentication if available
      const headers: Record<string, string> = {
        'Content-Type': 'application/json',
      }

      if (isAuthenticated.value && token.value) {
        headers.Authorization = `Bearer ${token.value}`
      }

      // Try to fetch badge classes from the modular server
      const response = await fetch('/api/bs/v2/badge-classes', { headers })

      if (response.ok) {
        const badgeClasses = await response.json()

        // Use the first badge class if available, otherwise fall back to mock
        if (Array.isArray(badgeClasses) && badgeClasses.length > 0) {
          featuredBadge.value = badgeClasses[0] as OB2.BadgeClass
        } else {
          // No real badges available, use mock badge
          featuredBadge.value = mockBadge
        }
        badgeError.value = null
      } else if (response.status === 401) {
        console.warn('Authentication required for badge classes, using mock badge')
        featuredBadge.value = mockBadge
        badgeError.value = 'Please log in to view real badge classes'
      } else {
        console.warn('Failed to fetch badge classes, using mock badge')
        featuredBadge.value = mockBadge
        badgeError.value = `Failed to fetch badges: ${response.status}`
      }
    } catch (error) {
      console.error('Error fetching badge data:', error)
      featuredBadge.value = mockBadge
      badgeError.value = 'Connection error while fetching badges'
    }
  }

  await Promise.all([monolithHealthCheck(), modularServerHealthCheck(), fetchFeaturedBadge()])

  loading.value = false
  modularServerLoading.value = false
})
</script>

<template>
  <div class="bg-white shadow rounded-lg p-6">
    <h2 class="text-2xl font-semibold text-slate-900 mb-4">Welcome to OpenBadges Demo</h2>

    <div class="prose max-w-none">
      <p class="text-slate-600 mb-4">
        This is a demonstration of the OpenBadges system using Bun, Hono, and Vue 3.
      </p>

      <div v-if="loading" class="text-center py-8">
        <div class="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500 mx-auto"></div>
        <p class="mt-2 text-slate-600">Loading data from the server...</p>
      </div>

      <div v-else class="mt-6">
        <h3 class="text-lg font-medium text-slate-900 mb-2">Server Status</h3>
        <div class="bg-slate-50 p-4 rounded-md">
          <p v-if="serverStatus">
            <span
              class="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800"
            >
              <svg
                class="-ml-0.5 mr-1.5 h-2 w-2 text-green-400"
                fill="currentColor"
                viewBox="0 0 8 8"
              >
                <circle cx="4" cy="4" r="3" />
              </svg>
              Connected
            </span>
            <span class="ml-2">Server is up and running</span>
          </p>
          <p v-else class="text-red-600">
            Unable to connect to the server. Please make sure the backend is running.
          </p>
        </div>

        <div class="mt-6">
          <h3 class="text-lg font-medium text-slate-900 mb-2">
            OpenBadges Modular Server Status (via Proxy)
          </h3>
          <div v-if="modularServerLoading" class="text-center py-4">
            <div
              class="animate-spin rounded-full h-8 w-8 border-b-2 border-purple-500 mx-auto"
            ></div>
            <p class="mt-2 text-sm text-slate-600">Checking status...</p>
          </div>
          <div v-else class="bg-slate-50 p-4 rounded-md">
            <p v-if="modularServerStatus && modularServerStatus.startsWith('Connected')">
              <span
                class="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800"
              >
                <svg
                  class="-ml-0.5 mr-1.5 h-2 w-2 text-green-400"
                  fill="currentColor"
                  viewBox="0 0 8 8"
                >
                  <circle cx="4" cy="4" r="3" />
                </svg>
                Connected
              </span>
              <span class="ml-2">{{ modularServerStatus }}</span>
            </p>
            <p v-else class="text-red-600">
              {{ modularServerStatus || 'Failed to get status from OpenBadges Modular Server.' }}
            </p>
          </div>
        </div>

        <div class="mt-6">
          <h3 class="text-lg font-medium text-slate-900 mb-2">Featured Badge</h3>
          <div class="bg-slate-50 p-4 rounded-md">
            <div v-if="featuredBadge">
              <BadgeDisplay :badge="featuredBadge" />
              <p v-if="badgeError" class="text-sm text-orange-600 mt-2">
                Note: {{ badgeError }}. Showing fallback data.
              </p>
            </div>
            <div v-else class="text-center py-4">
              <div
                class="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500 mx-auto"
              ></div>
              <p class="mt-2 text-sm text-slate-600">Loading badge data...</p>
            </div>
          </div>
        </div>

        <div class="mt-6">
          <h3 class="text-lg font-medium text-slate-900 mb-2">Quick Actions</h3>
          <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            <RouterLink
              to="/badges"
              class="block p-4 bg-blue-50 hover:bg-blue-100 rounded-lg border border-blue-200"
            >
              <h4 class="font-semibold text-blue-900">Browse Badges</h4>
              <p class="text-sm text-blue-700">View all available badge classes</p>
            </RouterLink>
            <RouterLink
              to="/badges/create"
              class="block p-4 bg-green-50 hover:bg-green-100 rounded-lg border border-green-200"
            >
              <h4 class="font-semibold text-green-900">Create Badge</h4>
              <p class="text-sm text-green-700">Design a new badge class</p>
            </RouterLink>
            <RouterLink
              to="/backpack"
              class="block p-4 bg-purple-50 hover:bg-purple-100 rounded-lg border border-purple-200"
            >
              <h4 class="font-semibold text-purple-900">My Backpack</h4>
              <p class="text-sm text-purple-700">View earned badges</p>
            </RouterLink>
            <RouterLink
              to="/issuers"
              class="block p-4 bg-orange-50 hover:bg-orange-100 rounded-lg border border-orange-200"
            >
              <h4 class="font-semibold text-orange-900">Issuers</h4>
              <p class="text-sm text-orange-700">Browse badge issuers</p>
            </RouterLink>
            <RouterLink
              to="/badges/issued"
              class="block p-4 bg-indigo-50 hover:bg-indigo-100 rounded-lg border border-indigo-200"
            >
              <h4 class="font-semibold text-indigo-900">Issued Badges</h4>
              <p class="text-sm text-indigo-700">Manage issued badges</p>
            </RouterLink>
            <RouterLink
              to="/auth/profile"
              class="block p-4 bg-gray-50 hover:bg-gray-100 rounded-lg border border-gray-200"
            >
              <h4 class="font-semibold text-gray-900">Profile</h4>
              <p class="text-sm text-gray-700">Manage your account</p>
            </RouterLink>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>
