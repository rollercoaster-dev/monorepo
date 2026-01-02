<script setup lang="ts">
import { computed } from 'vue'
import { useRoute } from 'vue-router'
import { HomeIcon, ChevronRightIcon } from '@heroicons/vue/24/outline'

interface BreadcrumbItem {
  label: string
  to?: string
}

const route = useRoute()

// Route to breadcrumb mapping
const routeBreadcrumbs: Record<string, BreadcrumbItem[]> = {
  '/': [],
  '/auth/login': [{ label: 'Authentication' }, { label: 'Sign In' }],
  '/auth/register': [{ label: 'Authentication' }, { label: 'Sign Up' }],
  '/auth/profile': [{ label: 'Authentication' }, { label: 'Profile' }],

  '/badges': [{ label: 'Badges' }],
  '/badges/create': [{ label: 'Badges', to: '/badges' }, { label: 'Create Badge' }],
  '/badges/issued': [{ label: 'Badges', to: '/badges' }, { label: 'Issued Badges' }],

  '/backpack': [{ label: 'My Backpack' }],

  '/issuers': [{ label: 'Issuers' }],
  '/issuers/create': [{ label: 'Issuers', to: '/issuers' }, { label: 'Create Issuer' }],
  '/issuers/manage': [{ label: 'Issuers', to: '/issuers' }, { label: 'Manage Issuers' }],

  '/admin': [{ label: 'Administration' }],
  '/admin/users': [{ label: 'Administration', to: '/admin' }, { label: 'Users' }],
  '/admin/badges': [{ label: 'Administration', to: '/admin' }, { label: 'Badges' }],
  '/admin/system': [{ label: 'Administration', to: '/admin' }, { label: 'System' }],
}

// Generate breadcrumbs based on current route
const breadcrumbs = computed(() => {
  const path = route.path
  const routeParams = route.params

  // Handle dynamic routes
  if (
    path.startsWith('/badges/') &&
    'id' in routeParams &&
    routeParams.id &&
    typeof routeParams.id === 'string'
  ) {
    const badgeId = routeParams.id
    const baseBreadcrumbs = [{ label: 'Badges', to: '/badges' }]

    if (path.endsWith('/edit')) {
      return [
        ...baseBreadcrumbs,
        { label: `Badge ${badgeId}`, to: `/badges/${badgeId}` },
        { label: 'Edit' },
      ]
    } else if (path.endsWith('/issue')) {
      return [
        ...baseBreadcrumbs,
        { label: `Badge ${badgeId}`, to: `/badges/${badgeId}` },
        { label: 'Issue Badge' },
      ]
    } else {
      return [...baseBreadcrumbs, { label: `Badge ${badgeId}` }]
    }
  }

  if (
    path.startsWith('/issuers/') &&
    'id' in routeParams &&
    routeParams.id &&
    typeof routeParams.id === 'string'
  ) {
    const issuerId = routeParams.id
    const baseBreadcrumbs = [{ label: 'Issuers', to: '/issuers' }]

    if (path.endsWith('/edit')) {
      return [
        ...baseBreadcrumbs,
        { label: `Issuer ${issuerId}`, to: `/issuers/${issuerId}` },
        { label: 'Edit' },
      ]
    } else if (path.endsWith('/badges')) {
      return [
        ...baseBreadcrumbs,
        { label: `Issuer ${issuerId}`, to: `/issuers/${issuerId}` },
        { label: 'Badges' },
      ]
    } else {
      return [...baseBreadcrumbs, { label: `Issuer ${issuerId}` }]
    }
  }

  if (
    path.startsWith('/backpack/') &&
    'id' in routeParams &&
    routeParams.id &&
    typeof routeParams.id === 'string'
  ) {
    const badgeId = routeParams.id
    return [{ label: 'My Backpack', to: '/backpack' }, { label: `Badge ${badgeId}` }]
  }

  if (
    path.startsWith('/verify/') &&
    'id' in routeParams &&
    routeParams.id &&
    typeof routeParams.id === 'string'
  ) {
    const badgeId = routeParams.id
    return [{ label: 'Verification' }, { label: `Badge ${badgeId}` }]
  }

  // Return static breadcrumbs for known routes
  return routeBreadcrumbs[path] || []
})

// Only show breadcrumbs if we have any
const shouldShowBreadcrumbs = computed(() => breadcrumbs.value.length > 0)
</script>

<template>
  <nav v-if="shouldShowBreadcrumbs" class="flex" aria-label="Breadcrumb">
    <ol class="flex items-center space-x-2 text-sm">
      <li>
        <RouterLink
          to="/"
          class="text-gray-500 hover:text-gray-700 transition-colors duration-200"
          aria-label="Home"
        >
          <HomeIcon class="w-4 h-4" aria-hidden="true" />
          <span class="sr-only">Home</span>
        </RouterLink>
      </li>

      <li v-for="(crumb, index) in breadcrumbs" :key="index" class="flex items-center">
        <ChevronRightIcon class="w-4 h-4 text-gray-400 mx-2" aria-hidden="true" />

        <RouterLink
          v-if="crumb.to && index < breadcrumbs.length - 1"
          :to="crumb.to"
          class="text-gray-500 hover:text-gray-700 transition-colors duration-200 max-w-[200px] truncate"
          :title="crumb.label"
        >
          {{ crumb.label }}
        </RouterLink>

        <span
          v-else
          class="text-gray-900 font-medium max-w-[200px] truncate"
          :title="crumb.label"
          aria-current="page"
        >
          {{ crumb.label }}
        </span>
      </li>
    </ol>
  </nav>
</template>
