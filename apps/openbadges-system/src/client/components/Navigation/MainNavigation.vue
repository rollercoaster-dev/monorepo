<template>
  <nav
    class="bg-white shadow-sm border-b border-gray-200"
    role="navigation"
    aria-label="Main navigation"
  >
    <div class="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
      <div class="flex justify-between items-center h-16">
        <!-- Logo/Brand -->
        <div class="flex items-center">
          <RouterLink
            to="/"
            class="flex items-center space-x-2 hover:opacity-80 transition-opacity"
            aria-label="OpenBadges Demo - Home"
          >
            <div
              class="w-8 h-8 bg-gradient-to-br from-blue-500 to-purple-600 rounded-lg flex items-center justify-center"
            >
              <svg class="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path
                  stroke-linecap="round"
                  stroke-linejoin="round"
                  stroke-width="2"
                  d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"
                />
              </svg>
            </div>
            <span class="text-xl font-bold text-gray-900">OpenBadges</span>
          </RouterLink>
        </div>

        <!-- Desktop Navigation -->
        <div class="hidden md:flex items-center space-x-1">
          <template v-for="item in navigationItems" :key="item.id">
            <!-- Simple link -->
            <RouterLink
              v-if="!item.children"
              :to="item.to"
              class="px-3 py-2 text-sm font-medium rounded-md transition-colors duration-200 hover:bg-gray-100 hover:text-gray-900"
              :class="getNavItemClass(item)"
              :aria-current="isActiveRoute(item.to) ? 'page' : undefined"
            >
              <component :is="item.icon" class="w-4 h-4 mr-1.5 inline" aria-hidden="true" />
              {{ item.label }}
            </RouterLink>

            <!-- Dropdown menu -->
            <div v-else ref="dropdownRefs" class="relative">
              <button
                :id="`menu-button-${item.id}`"
                class="flex items-center px-3 py-2 text-sm font-medium rounded-md transition-colors duration-200 hover:bg-gray-100 hover:text-gray-900"
                :class="getNavItemClass(item)"
                :aria-expanded="openDropdowns.has(item.id)"
                :aria-haspopup="true"
                @click="toggleDropdown(item.id)"
                @keydown.escape="closeDropdown(item.id)"
              >
                <component :is="item.icon" class="w-4 h-4 mr-1.5" aria-hidden="true" />
                {{ item.label }}
                <ChevronDownIcon
                  class="w-4 h-4 ml-1 transition-transform duration-200"
                  :class="{ 'rotate-180': openDropdowns.has(item.id) }"
                  aria-hidden="true"
                />
              </button>

              <Transition
                enter-active-class="transition ease-out duration-200"
                enter-from-class="transform opacity-0 scale-95"
                enter-to-class="transform opacity-100 scale-100"
                leave-active-class="transition ease-in duration-75"
                leave-from-class="transform opacity-100 scale-100"
                leave-to-class="transform opacity-0 scale-95"
              >
                <div
                  v-if="openDropdowns.has(item.id)"
                  class="absolute right-0 mt-2 w-48 bg-white rounded-md shadow-lg py-1 z-50 border border-gray-200"
                  role="menu"
                  :aria-labelledby="`menu-button-${item.id}`"
                  @click="closeDropdown(item.id)"
                >
                  <RouterLink
                    v-for="child in item.children"
                    :key="child.id"
                    :to="child.to"
                    class="flex items-center px-4 py-2 text-sm text-gray-700 hover:bg-gray-100 hover:text-gray-900 transition-colors duration-200"
                    :class="{ 'bg-gray-50 text-gray-900': isActiveRoute(child.to) }"
                    role="menuitem"
                    :aria-current="isActiveRoute(child.to) ? 'page' : undefined"
                  >
                    <component :is="child.icon" class="w-4 h-4 mr-2" aria-hidden="true" />
                    {{ child.label }}
                  </RouterLink>
                </div>
              </Transition>
            </div>
          </template>
        </div>

        <!-- User Menu & Mobile Menu Button -->
        <div class="flex items-center space-x-2">
          <!-- User Menu (Desktop) -->
          <UserMenu v-if="!isMobile" />

          <!-- Mobile menu button -->
          <button
            class="md:hidden inline-flex items-center justify-center p-2 rounded-md text-gray-700 hover:text-gray-900 hover:bg-gray-100 focus:outline-none focus:ring-2 focus:ring-inset focus:ring-blue-500 transition-colors duration-200"
            :aria-expanded="isMobileMenuOpen"
            aria-controls="mobile-menu"
            aria-label="Toggle navigation menu"
            @click="toggleMobileMenu"
          >
            <span class="sr-only">{{ isMobileMenuOpen ? 'Close' : 'Open' }} main menu</span>
            <Bars3Icon v-if="!isMobileMenuOpen" class="w-6 h-6" aria-hidden="true" />
            <XMarkIcon v-else class="w-6 h-6" aria-hidden="true" />
          </button>
        </div>
      </div>
    </div>

    <!-- Mobile Navigation Menu -->
    <Transition
      enter-active-class="transition ease-out duration-200"
      enter-from-class="transform opacity-0 scale-95"
      enter-to-class="transform opacity-100 scale-100"
      leave-active-class="transition ease-in duration-75"
      leave-from-class="transform opacity-100 scale-100"
      leave-to-class="transform opacity-0 scale-95"
    >
      <div v-if="isMobileMenuOpen" id="mobile-menu" class="md:hidden">
        <div class="px-2 pt-2 pb-3 space-y-1 bg-white border-t border-gray-200">
          <template v-for="item in navigationItems" :key="`mobile-${item.id}`">
            <!-- Simple mobile link -->
            <RouterLink
              v-if="!item.children"
              :to="item.to"
              class="flex items-center px-3 py-2 text-base font-medium rounded-md transition-colors duration-200 hover:bg-gray-100 hover:text-gray-900"
              :class="getMobileNavItemClass(item)"
              :aria-current="isActiveRoute(item.to) ? 'page' : undefined"
              @click="closeMobileMenu"
            >
              <component :is="item.icon" class="w-5 h-5 mr-3" aria-hidden="true" />
              {{ item.label }}
            </RouterLink>

            <!-- Mobile dropdown section -->
            <div v-else class="space-y-1">
              <button
                class="flex items-center justify-between w-full px-3 py-2 text-base font-medium rounded-md transition-colors duration-200 hover:bg-gray-100 hover:text-gray-900"
                :class="getMobileNavItemClass(item)"
                :aria-expanded="openMobileDropdowns.has(item.id)"
                @click="toggleMobileDropdown(item.id)"
              >
                <div class="flex items-center">
                  <component :is="item.icon" class="w-5 h-5 mr-3" aria-hidden="true" />
                  {{ item.label }}
                </div>
                <ChevronDownIcon
                  class="w-4 h-4 transition-transform duration-200"
                  :class="{ 'rotate-180': openMobileDropdowns.has(item.id) }"
                  aria-hidden="true"
                />
              </button>

              <Transition
                enter-active-class="transition ease-out duration-200"
                enter-from-class="transform opacity-0 -translate-y-1"
                enter-to-class="transform opacity-100 translate-y-0"
                leave-active-class="transition ease-in duration-150"
                leave-from-class="transform opacity-100 translate-y-0"
                leave-to-class="transform opacity-0 -translate-y-1"
              >
                <div v-if="openMobileDropdowns.has(item.id)" class="pl-6 space-y-1">
                  <RouterLink
                    v-for="child in item.children"
                    :key="`mobile-${child.id}`"
                    :to="child.to"
                    class="flex items-center px-3 py-2 text-sm font-medium rounded-md transition-colors duration-200 hover:bg-gray-100 hover:text-gray-900"
                    :class="{
                      'bg-gray-50 text-gray-900': isActiveRoute(child.to),
                      'text-gray-700': !isActiveRoute(child.to),
                    }"
                    :aria-current="isActiveRoute(child.to) ? 'page' : undefined"
                    @click="closeMobileMenu"
                  >
                    <component :is="child.icon" class="w-4 h-4 mr-2" aria-hidden="true" />
                    {{ child.label }}
                  </RouterLink>
                </div>
              </Transition>
            </div>
          </template>

          <!-- Mobile User Menu -->
          <div class="pt-4 pb-3 border-t border-gray-200">
            <UserMenu :is-mobile="true" @close="closeMobileMenu" />
          </div>
        </div>
      </div>
    </Transition>
  </nav>
</template>

<script setup lang="ts">
import { ref, onMounted, onUnmounted } from 'vue'
import { useRoute } from 'vue-router'
import {
  Bars3Icon,
  XMarkIcon,
  ChevronDownIcon,
  HomeIcon,
  AcademicCapIcon,
  UserGroupIcon,
  RectangleStackIcon,
  ClipboardDocumentListIcon,
  Cog6ToothIcon,
} from '@heroicons/vue/24/outline'
import UserMenu from './UserMenu.vue'

// Navigation items configuration
const navigationItems = [
  {
    id: 'home',
    label: 'Dashboard',
    to: '/',
    icon: HomeIcon,
  },
  {
    id: 'badges',
    label: 'Badges',
    icon: AcademicCapIcon,
    children: [
      { id: 'browse-badges', label: 'Browse Badges', to: '/badges', icon: AcademicCapIcon },
      { id: 'create-badge', label: 'Create Badge', to: '/badges/create', icon: AcademicCapIcon },
      {
        id: 'issued-badges',
        label: 'Issued Badges',
        to: '/badges/issued',
        icon: ClipboardDocumentListIcon,
      },
    ],
  },
  {
    id: 'issuers',
    label: 'Issuers',
    icon: UserGroupIcon,
    children: [
      { id: 'browse-issuers', label: 'Browse Issuers', to: '/issuers', icon: UserGroupIcon },
      { id: 'create-issuer', label: 'Create Issuer', to: '/issuers/create', icon: UserGroupIcon },
      { id: 'manage-issuers', label: 'Manage Issuers', to: '/issuers/manage', icon: Cog6ToothIcon },
    ],
  },
  {
    id: 'backpack',
    label: 'My Backpack',
    to: '/backpack',
    icon: RectangleStackIcon,
  },
]

// Reactive state
const route = useRoute()
const isMobileMenuOpen = ref(false)
const openDropdowns = ref(new Set<string>())
const openMobileDropdowns = ref(new Set<string>())
const isMobile = ref(false)

// Methods
const toggleMobileMenu = () => {
  isMobileMenuOpen.value = !isMobileMenuOpen.value
}

const closeMobileMenu = () => {
  isMobileMenuOpen.value = false
  openMobileDropdowns.value.clear()
}

const toggleDropdown = (id: string) => {
  if (openDropdowns.value.has(id)) {
    openDropdowns.value.delete(id)
  } else {
    openDropdowns.value.clear()
    openDropdowns.value.add(id)
  }
}

const closeDropdown = (id: string) => {
  openDropdowns.value.delete(id)
}

const toggleMobileDropdown = (id: string) => {
  if (openMobileDropdowns.value.has(id)) {
    openMobileDropdowns.value.delete(id)
  } else {
    openMobileDropdowns.value.add(id)
  }
}

const isActiveRoute = (path: string) => {
  if (path === '/') {
    return route.path === '/'
  }
  return route.path.startsWith(path)
}

const getNavItemClass = (item: any) => {
  const isActive = item.to
    ? isActiveRoute(item.to)
    : item.children?.some((child: any) => isActiveRoute(child.to))
  return {
    'text-blue-600 bg-blue-50': isActive,
    'text-gray-700': !isActive,
  }
}

const getMobileNavItemClass = (item: any) => {
  const isActive = item.to
    ? isActiveRoute(item.to)
    : item.children?.some((child: any) => isActiveRoute(child.to))
  return {
    'text-blue-600 bg-blue-50': isActive,
    'text-gray-700': !isActive,
  }
}

// Handle clicks outside dropdowns
const handleClickOutside = (event: Event) => {
  if (openDropdowns.value.size > 0) {
    const target = event.target as HTMLElement
    if (!target.closest('[role="menu"]') && !target.closest('[aria-haspopup="true"]')) {
      openDropdowns.value.clear()
    }
  }
}

// Handle escape key
const handleEscapeKey = (event: KeyboardEvent) => {
  if (event.key === 'Escape') {
    openDropdowns.value.clear()
    if (isMobileMenuOpen.value) {
      closeMobileMenu()
    }
  }
}

// Handle window resize
const handleResize = () => {
  isMobile.value = window.innerWidth < 768
  if (window.innerWidth >= 768) {
    closeMobileMenu()
  }
}

// Lifecycle
onMounted(() => {
  document.addEventListener('click', handleClickOutside)
  document.addEventListener('keydown', handleEscapeKey)
  window.addEventListener('resize', handleResize)
  handleResize()
})

onUnmounted(() => {
  document.removeEventListener('click', handleClickOutside)
  document.removeEventListener('keydown', handleEscapeKey)
  window.removeEventListener('resize', handleResize)
})
</script>
