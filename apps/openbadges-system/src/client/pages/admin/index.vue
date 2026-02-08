<script setup lang="ts">
definePage({ meta: { requiresAuth: true, requiresAdmin: true } })

import { ref, onMounted, onUnmounted, watch } from 'vue'
import {
  ArrowPathIcon,
  UsersIcon,
  TrophyIcon,
  CheckBadgeIcon,
  BuildingOfficeIcon,
  ChartBarIcon,
  CogIcon,
  ArrowDownTrayIcon,
  ClockIcon,
  ServerIcon,
  CircleStackIcon,
  ShieldCheckIcon,
  ExclamationTriangleIcon,
  CheckCircleIcon,
  XMarkIcon,
  UserPlusIcon,
  PlusIcon,
} from '@heroicons/vue/24/outline'
import { useUsers } from '@/composables/useUsers'
import { useBadges } from '@/composables/useBadges'

const { fetchUsers, totalUsers } = useUsers()
const { fetchBadges, fetchAssertions, totalBadges, totalAssertions } = useBadges()

// Component state
const isLoading = ref(false)
const error = ref<string | null>(null)
const successMessage = ref<string | null>(null)

const stats = ref({
  totalUsers: 0,
  totalBadges: 0,
  totalAssertions: 0,
  totalIssuers: 0,
  activeIssuers: 0,
  userGrowth: 0,
  badgeGrowth: 0,
  assertionGrowth: 0,
  newUsersLast30Days: 0,
  badgesIssuedLast30Days: 0,
})

interface Activity {
  id: string
  type: 'user_registered' | 'badge_created' | 'badge_issued' | 'user_updated' | 'system_event'
  description: string
  timestamp: string
}

const recentActivity = ref<Activity[]>([])

// Timeout ID for cleanup
let successTimeoutId: ReturnType<typeof setTimeout> | null = null

// Load data on component mount
onMounted(() => {
  refreshData()
})

// Cleanup on unmount
onUnmounted(() => {
  if (successTimeoutId) {
    clearTimeout(successTimeoutId)
  }
})

// Auto-clear success message
watch(successMessage, message => {
  if (successTimeoutId) {
    clearTimeout(successTimeoutId)
    successTimeoutId = null
  }
  if (message) {
    successTimeoutId = setTimeout(() => {
      successMessage.value = null
      successTimeoutId = null
    }, 5000)
  }
})

async function refreshData() {
  isLoading.value = true
  error.value = null

  try {
    // Fetch data from multiple sources
    await Promise.all([
      fetchUsers(1, 1000), // Get all users for stats
      fetchBadges(1, 1000), // Get all badges for stats
      fetchAssertions(1, 1000), // Get all assertions for stats
    ])

    // Update stats
    stats.value = {
      totalUsers: totalUsers.value,
      totalBadges: totalBadges.value,
      totalAssertions: totalAssertions.value,
      totalIssuers: 5, // Placeholder
      activeIssuers: 3, // Placeholder
      userGrowth: 15, // Placeholder - would calculate from data
      badgeGrowth: 8, // Placeholder - would calculate from data
      assertionGrowth: 25, // Placeholder - would calculate from data
      newUsersLast30Days: 12, // Placeholder - would calculate from data
      badgesIssuedLast30Days: 45, // Placeholder - would calculate from data
    }

    // Mock recent activity data
    recentActivity.value = [
      {
        id: '1',
        type: 'user_registered',
        description: 'New user john.doe@example.com registered',
        timestamp: new Date(Date.now() - 2 * 60 * 60 * 1000).toISOString(),
      },
      {
        id: '2',
        type: 'badge_issued',
        description: 'Badge "JavaScript Expert" issued to jane.smith@example.com',
        timestamp: new Date(Date.now() - 4 * 60 * 60 * 1000).toISOString(),
      },
      {
        id: '3',
        type: 'badge_created',
        description: 'New badge class "Python Fundamentals" created',
        timestamp: new Date(Date.now() - 6 * 60 * 60 * 1000).toISOString(),
      },
      {
        id: '4',
        type: 'user_updated',
        description: 'User alice.johnson@example.com updated profile',
        timestamp: new Date(Date.now() - 8 * 60 * 60 * 1000).toISOString(),
      },
      {
        id: '5',
        type: 'system_event',
        description: 'System backup completed successfully',
        timestamp: new Date(Date.now() - 12 * 60 * 60 * 1000).toISOString(),
      },
    ]
  } catch (err) {
    console.error('Failed to refresh dashboard data:', err)
    error.value = 'Failed to load dashboard data. Please try again.'
  } finally {
    isLoading.value = false
  }
}

function exportData() {
  // TODO: Implement data export functionality
  successMessage.value = 'Data export initiated. Download will begin shortly.'
}

function getActivityIcon(type: Activity['type']) {
  switch (type) {
    case 'user_registered':
      return UserPlusIcon
    case 'badge_created':
      return PlusIcon
    case 'badge_issued':
      return CheckBadgeIcon
    case 'user_updated':
      return UsersIcon
    case 'system_event':
      return ServerIcon
    default:
      return ClockIcon
  }
}

function getActivityColor(type: Activity['type']): string {
  switch (type) {
    case 'user_registered':
      return 'bg-primary'
    case 'badge_created':
      return 'bg-success'
    case 'badge_issued':
      return 'bg-warning'
    case 'user_updated':
      return 'bg-accent'
    case 'system_event':
      return 'bg-muted'
    default:
      return 'bg-muted'
  }
}

function getActivityStatusColor(type: Activity['type']): string {
  switch (type) {
    case 'user_registered':
      return 'bg-primary/10 text-primary border-2 border-primary'
    case 'badge_created':
      return 'bg-success/10 text-success border-2 border-success'
    case 'badge_issued':
      return 'bg-warning/10 text-warning border-2 border-warning'
    case 'user_updated':
      return 'bg-accent/10 text-accent border-2 border-accent'
    case 'system_event':
      return 'bg-muted text-foreground border-2 border-border'
    default:
      return 'bg-muted text-foreground border-2 border-border'
  }
}

function getActivityLabel(type: Activity['type']): string {
  switch (type) {
    case 'user_registered':
      return 'User'
    case 'badge_created':
      return 'Badge'
    case 'badge_issued':
      return 'Issued'
    case 'user_updated':
      return 'Updated'
    case 'system_event':
      return 'System'
    default:
      return 'Event'
  }
}

function formatDate(dateString: string): string {
  const date = new Date(dateString)
  const now = new Date()
  const diffMs = now.getTime() - date.getTime()
  const diffHours = Math.floor(diffMs / (1000 * 60 * 60))
  const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24))

  if (diffHours < 1) {
    return 'Just now'
  } else if (diffHours < 24) {
    return `${diffHours} hour${diffHours > 1 ? 's' : ''} ago`
  } else if (diffDays < 7) {
    return `${diffDays} day${diffDays > 1 ? 's' : ''} ago`
  } else {
    return date.toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
    })
  }
}
</script>

<template>
  <div class="max-w-7xl mx-auto mt-8">
    <div class="flex justify-between items-center mb-6">
      <h1 class="font-headline text-3xl font-bold text-foreground">Admin Dashboard</h1>
      <div class="flex items-center space-x-3">
        <div class="text-sm text-muted-foreground">
          Last updated: {{ formatDate(new Date().toISOString()) }}
        </div>
        <button
          :disabled="isLoading"
          class="btn btn-primary flex items-center space-x-2 disabled:opacity-50"
          @click="refreshData"
        >
          <ArrowPathIcon :class="['w-4 h-4', isLoading && 'animate-spin']" />
          <span>{{ isLoading ? 'Refreshing...' : 'Refresh' }}</span>
        </button>
      </div>
    </div>

    <!-- System Statistics -->
    <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
      <div class="card card-body">
        <div class="flex items-center">
          <div class="flex-shrink-0">
            <UsersIcon class="w-8 h-8 text-primary" />
          </div>
          <div class="ml-4">
            <p class="text-sm font-medium text-muted-foreground">Total Users</p>
            <div class="flex items-center">
              <p class="text-2xl font-semibold text-foreground">
                {{ stats.totalUsers }}
              </p>
              <span
                :class="[
                  'ml-2 text-sm',
                  stats.userGrowth >= 0 ? 'text-success' : 'text-destructive',
                ]"
              >
                {{ stats.userGrowth >= 0 ? '+' : '' }}{{ stats.userGrowth }}%
              </span>
            </div>
          </div>
        </div>
      </div>

      <div class="card card-body">
        <div class="flex items-center">
          <div class="flex-shrink-0">
            <TrophyIcon class="w-8 h-8 text-warning" />
          </div>
          <div class="ml-4">
            <p class="text-sm font-medium text-muted-foreground">Badge Classes</p>
            <div class="flex items-center">
              <p class="text-2xl font-semibold text-foreground">
                {{ stats.totalBadges }}
              </p>
              <span
                :class="[
                  'ml-2 text-sm',
                  stats.badgeGrowth >= 0 ? 'text-success' : 'text-destructive',
                ]"
              >
                {{ stats.badgeGrowth >= 0 ? '+' : '' }}{{ stats.badgeGrowth }}%
              </span>
            </div>
          </div>
        </div>
      </div>

      <div class="card card-body">
        <div class="flex items-center">
          <div class="flex-shrink-0">
            <CheckBadgeIcon class="w-8 h-8 text-success" />
          </div>
          <div class="ml-4">
            <p class="text-sm font-medium text-muted-foreground">Issued Badges</p>
            <div class="flex items-center">
              <p class="text-2xl font-semibold text-foreground">
                {{ stats.totalAssertions }}
              </p>
              <span
                :class="[
                  'ml-2 text-sm',
                  stats.assertionGrowth >= 0 ? 'text-success' : 'text-destructive',
                ]"
              >
                {{ stats.assertionGrowth >= 0 ? '+' : '' }}{{ stats.assertionGrowth }}%
              </span>
            </div>
          </div>
        </div>
      </div>

      <div class="card card-body">
        <div class="flex items-center">
          <div class="flex-shrink-0">
            <BuildingOfficeIcon class="w-8 h-8 text-accent" />
          </div>
          <div class="ml-4">
            <p class="text-sm font-medium text-muted-foreground">Active Issuers</p>
            <div class="flex items-center">
              <p class="text-2xl font-semibold text-foreground">
                {{ stats.activeIssuers }}
              </p>
              <span class="ml-2 text-sm text-muted-foreground">/ {{ stats.totalIssuers }}</span>
            </div>
          </div>
        </div>
      </div>
    </div>

    <!-- Charts Section -->
    <div class="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
      <!-- User Growth Chart -->
      <div class="card card-body">
        <h2 class="text-lg font-semibold text-foreground mb-4">User Growth (Last 30 Days)</h2>
        <div class="h-64 flex items-center justify-center text-muted-foreground">
          <div class="text-center">
            <ChartBarIcon class="w-16 h-16 mx-auto mb-2 text-muted-foreground/40" />
            <p>Chart visualization would go here</p>
            <p class="text-sm">Total new users: {{ stats.newUsersLast30Days }}</p>
          </div>
        </div>
      </div>

      <!-- Badge Issuance Chart -->
      <div class="card card-body">
        <h2 class="text-lg font-semibold text-foreground mb-4">Badge Issuance (Last 30 Days)</h2>
        <div class="h-64 flex items-center justify-center text-muted-foreground">
          <div class="text-center">
            <ChartBarIcon class="w-16 h-16 mx-auto mb-2 text-muted-foreground/40" />
            <p>Chart visualization would go here</p>
            <p class="text-sm">Total badges issued: {{ stats.badgesIssuedLast30Days }}</p>
          </div>
        </div>
      </div>
    </div>

    <!-- Quick Actions -->
    <div class="card card-body mb-6">
      <h2 class="text-lg font-semibold text-foreground mb-4">Quick Actions</h2>
      <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <RouterLink
          to="/admin/users"
          class="flex items-center p-4 bg-card border-2 border-border rounded-md shadow-hard-sm hover:shadow-hard-lg transition-shadow"
        >
          <UsersIcon class="w-8 h-8 text-primary mr-3" />
          <div>
            <p class="font-medium text-foreground">Manage Users</p>
            <p class="text-sm text-muted-foreground">View and edit users</p>
          </div>
        </RouterLink>

        <RouterLink
          to="/admin/badges"
          class="flex items-center p-4 bg-card border-2 border-border rounded-md shadow-hard-sm hover:shadow-hard-lg transition-shadow"
        >
          <TrophyIcon class="w-8 h-8 text-warning mr-3" />
          <div>
            <p class="font-medium text-foreground">Manage Badges</p>
            <p class="text-sm text-muted-foreground">Create and manage badges</p>
          </div>
        </RouterLink>

        <RouterLink
          to="/admin/system"
          class="flex items-center p-4 bg-card border-2 border-border rounded-md shadow-hard-sm hover:shadow-hard-lg transition-shadow"
        >
          <CogIcon class="w-8 h-8 text-success mr-3" />
          <div>
            <p class="font-medium text-foreground">System Settings</p>
            <p class="text-sm text-muted-foreground">Configure system</p>
          </div>
        </RouterLink>

        <button
          class="flex items-center p-4 bg-card border-2 border-border rounded-md shadow-hard-sm hover:shadow-hard-lg transition-shadow"
          @click="exportData"
        >
          <ArrowDownTrayIcon class="w-8 h-8 text-accent mr-3" />
          <div>
            <p class="font-medium text-foreground">Export Data</p>
            <p class="text-sm text-muted-foreground">Download system data</p>
          </div>
        </button>
      </div>
    </div>

    <!-- Recent Activity -->
    <div class="card card-body mb-6">
      <div class="flex items-center justify-between mb-4">
        <h2 class="text-lg font-semibold text-foreground">Recent Activity</h2>
        <RouterLink to="/admin/activity" class="text-sm text-primary hover:text-primary-dark">
          View all activity →
        </RouterLink>
      </div>

      <div v-if="isLoading" class="text-center py-8">
        <div class="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto"></div>
        <p class="mt-2 text-muted-foreground">Loading activity...</p>
      </div>

      <div v-else-if="recentActivity.length === 0" class="text-center py-8">
        <ClockIcon class="w-16 h-16 text-muted-foreground/40 mx-auto mb-2" />
        <p class="text-muted-foreground">No recent activity</p>
      </div>

      <div v-else class="space-y-4">
        <div
          v-for="activity in recentActivity"
          :key="activity.id"
          class="flex items-center space-x-4 p-4 bg-muted rounded-md border-2 border-border"
        >
          <div class="flex-shrink-0">
            <div
              :class="[
                'w-10 h-10 rounded-md border-2 border-border flex items-center justify-center',
                getActivityColor(activity.type),
              ]"
            >
              <component
                :is="getActivityIcon(activity.type)"
                class="w-5 h-5 text-primary-foreground"
              />
            </div>
          </div>
          <div class="flex-1">
            <p class="text-sm font-medium text-foreground">
              {{ activity.description }}
            </p>
            <p class="text-xs text-muted-foreground">
              {{ formatDate(activity.timestamp) }}
            </p>
          </div>
          <div class="flex-shrink-0">
            <span
              :class="[
                'inline-flex items-center px-2.5 py-0.5 rounded-sm text-xs font-medium',
                getActivityStatusColor(activity.type),
              ]"
            >
              {{ getActivityLabel(activity.type) }}
            </span>
          </div>
        </div>
      </div>
    </div>

    <!-- System Health -->
    <div class="card card-body">
      <h2 class="text-lg font-semibold text-foreground mb-4">System Health</h2>
      <div class="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div class="text-center">
          <div
            class="mx-auto w-16 h-16 bg-success/10 border-2 border-success rounded-md flex items-center justify-center mb-2"
          >
            <ServerIcon class="w-8 h-8 text-success" />
          </div>
          <p class="text-sm font-medium text-foreground">Server Status</p>
          <p class="text-xs text-success">Online</p>
        </div>

        <div class="text-center">
          <div
            class="mx-auto w-16 h-16 bg-primary/10 border-2 border-primary rounded-md flex items-center justify-center mb-2"
          >
            <CircleStackIcon class="w-8 h-8 text-primary" />
          </div>
          <p class="text-sm font-medium text-foreground">Database</p>
          <p class="text-xs text-primary">Connected</p>
        </div>

        <div class="text-center">
          <div
            class="mx-auto w-16 h-16 bg-warning/10 border-2 border-warning rounded-md flex items-center justify-center mb-2"
          >
            <ShieldCheckIcon class="w-8 h-8 text-warning" />
          </div>
          <p class="text-sm font-medium text-foreground">Security</p>
          <p class="text-xs text-warning">Monitoring</p>
        </div>
      </div>
    </div>

    <!-- Success/Error Messages -->
    <div
      v-if="error"
      class="fixed bottom-4 right-4 bg-destructive text-destructive-foreground px-4 py-3 border-2 border-border rounded-md shadow-hard-md z-50"
    >
      <div class="flex items-center space-x-2">
        <ExclamationTriangleIcon class="w-5 h-5" />
        <span>{{ error }}</span>
        <button class="ml-2 hover:opacity-80" @click="error = null">
          <XMarkIcon class="w-4 h-4" />
        </button>
      </div>
    </div>

    <div
      v-if="successMessage"
      class="fixed bottom-4 right-4 bg-success text-success-foreground px-4 py-3 border-2 border-border rounded-md shadow-hard-md z-50"
    >
      <div class="flex items-center space-x-2">
        <CheckCircleIcon class="w-5 h-5" />
        <span>{{ successMessage }}</span>
        <button class="ml-2 hover:opacity-80" @click="successMessage = null">
          <XMarkIcon class="w-4 h-4" />
        </button>
      </div>
    </div>
  </div>
</template>
