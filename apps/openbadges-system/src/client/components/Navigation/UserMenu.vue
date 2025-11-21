<template>
  <div class="relative">
    <!-- Desktop User Menu -->
    <div v-if="!isMobile" class="flex items-center space-x-3">
      <!-- Authentication state - not logged in -->
      <div v-if="!isAuthenticated" class="flex items-center space-x-2">
        <RouterLink
          to="/auth/login"
          class="text-gray-700 hover:text-gray-900 px-3 py-2 text-sm font-medium rounded-md transition-colors duration-200 hover:bg-gray-100"
        >
          Sign In
        </RouterLink>
        <RouterLink
          to="/auth/register"
          class="bg-blue-600 hover:bg-blue-700 text-white px-3 py-2 text-sm font-medium rounded-md transition-colors duration-200"
        >
          Sign Up
        </RouterLink>
      </div>

      <!-- Authentication state - logged in -->
      <div v-else class="flex items-center space-x-3">
        <!-- Notifications -->
        <button
          class="relative p-2 text-gray-700 hover:text-gray-900 hover:bg-gray-100 rounded-md transition-colors duration-200 focus:outline-none focus:ring-2 focus:ring-blue-500"
          aria-label="Notifications"
        >
          <BellIcon class="w-5 h-5" aria-hidden="true" />
          <span
            v-if="notificationCount > 0"
            class="absolute -top-0.5 -right-0.5 w-4 h-4 bg-red-500 text-white text-xs rounded-full flex items-center justify-center"
          >
            {{ notificationCount > 9 ? '9+' : notificationCount }}
          </span>
        </button>

        <!-- User avatar and dropdown -->
        <div class="relative">
          <button
            class="flex items-center space-x-2 p-1 rounded-full hover:bg-gray-100 transition-colors duration-200 focus:outline-none focus:ring-2 focus:ring-blue-500"
            :aria-expanded="isUserDropdownOpen"
            aria-haspopup="true"
            aria-label="User menu"
            @click="toggleUserDropdown"
          >
            <img
              :src="user?.avatar || '/api/placeholder/32/32'"
              :alt="`${user?.firstName} ${user?.lastName} avatar`"
              class="w-8 h-8 rounded-full bg-gray-200"
            />
            <span class="text-sm font-medium text-gray-700">
              {{ user?.firstName }} {{ user?.lastName }}
            </span>
            <ChevronDownIcon
              class="w-4 h-4 text-gray-500 transition-transform duration-200"
              :class="{ 'rotate-180': isUserDropdownOpen }"
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
              v-if="isUserDropdownOpen"
              class="absolute right-0 mt-2 w-56 bg-white rounded-md shadow-lg py-1 z-50 border border-gray-200"
              role="menu"
              aria-labelledby="user-menu-button"
            >
              <!-- User info -->
              <div class="px-4 py-3 border-b border-gray-200">
                <p class="text-sm font-medium text-gray-900">
                  {{ user?.firstName }} {{ user?.lastName }}
                </p>
                <p class="text-sm text-gray-500">
                  {{ user?.email }}
                </p>
              </div>

              <!-- Menu items -->
              <div class="py-1">
                <RouterLink
                  v-for="item in userMenuItems"
                  :key="item.id"
                  :to="item.to"
                  class="flex items-center px-4 py-2 text-sm text-gray-700 hover:bg-gray-100 hover:text-gray-900 transition-colors duration-200"
                  role="menuitem"
                  :class="{ 'bg-gray-50 text-gray-900': isActiveRoute(item.to) }"
                  :aria-current="isActiveRoute(item.to) ? 'page' : undefined"
                  @click="closeUserDropdown"
                >
                  <component :is="item.icon" class="w-4 h-4 mr-3" aria-hidden="true" />
                  {{ item.label }}
                </RouterLink>
              </div>

              <!-- Admin section (if user is admin) -->
              <div v-if="isAdmin" class="border-t border-gray-200 py-1">
                <div class="px-4 py-2 text-xs font-semibold text-gray-500 uppercase tracking-wider">
                  Administration
                </div>
                <RouterLink
                  v-for="item in adminMenuItems"
                  :key="item.id"
                  :to="item.to"
                  class="flex items-center px-4 py-2 text-sm text-gray-700 hover:bg-gray-100 hover:text-gray-900 transition-colors duration-200"
                  role="menuitem"
                  :class="{ 'bg-gray-50 text-gray-900': isActiveRoute(item.to) }"
                  :aria-current="isActiveRoute(item.to) ? 'page' : undefined"
                  @click="closeUserDropdown"
                >
                  <component :is="item.icon" class="w-4 h-4 mr-3" aria-hidden="true" />
                  {{ item.label }}
                </RouterLink>
              </div>

              <!-- Logout -->
              <div class="border-t border-gray-200 py-1">
                <button
                  class="flex items-center w-full px-4 py-2 text-sm text-gray-700 hover:bg-gray-100 hover:text-gray-900 transition-colors duration-200"
                  role="menuitem"
                  @click="handleLogout"
                >
                  <ArrowRightOnRectangleIcon class="w-4 h-4 mr-3" aria-hidden="true" />
                  Sign Out
                </button>
              </div>
            </div>
          </Transition>
        </div>
      </div>
    </div>

    <!-- Mobile User Menu -->
    <div v-else class="space-y-3">
      <!-- Authentication state - not logged in -->
      <div v-if="!isAuthenticated" class="space-y-2">
        <RouterLink
          to="/auth/login"
          class="flex items-center px-3 py-2 text-base font-medium text-gray-700 rounded-md hover:bg-gray-100 hover:text-gray-900 transition-colors duration-200"
          @click="$emit('close')"
        >
          <ArrowRightOnRectangleIcon class="w-5 h-5 mr-3" aria-hidden="true" />
          Sign In
        </RouterLink>
        <RouterLink
          to="/auth/register"
          class="flex items-center px-3 py-2 text-base font-medium text-white bg-blue-600 rounded-md hover:bg-blue-700 transition-colors duration-200"
          @click="$emit('close')"
        >
          <UserPlusIcon class="w-5 h-5 mr-3" aria-hidden="true" />
          Sign Up
        </RouterLink>
      </div>

      <!-- Authentication state - logged in -->
      <div v-else class="space-y-2">
        <!-- User info -->
        <div class="flex items-center px-3 py-2 bg-gray-50 rounded-md">
          <img
            :src="user?.avatar || '/api/placeholder/40/40'"
            :alt="`${user?.firstName} ${user?.lastName} avatar`"
            class="w-10 h-10 rounded-full bg-gray-200"
          />
          <div class="ml-3">
            <p class="text-sm font-medium text-gray-900">
              {{ user?.firstName }} {{ user?.lastName }}
            </p>
            <p class="text-sm text-gray-500">
              {{ user?.email }}
            </p>
          </div>
        </div>

        <!-- Menu items -->
        <div class="space-y-1">
          <RouterLink
            v-for="item in userMenuItems"
            :key="item.id"
            :to="item.to"
            class="flex items-center px-3 py-2 text-sm font-medium rounded-md transition-colors duration-200 hover:bg-gray-100 hover:text-gray-900"
            :class="{
              'bg-gray-50 text-gray-900': isActiveRoute(item.to),
              'text-gray-700': !isActiveRoute(item.to),
            }"
            :aria-current="isActiveRoute(item.to) ? 'page' : undefined"
            @click="$emit('close')"
          >
            <component :is="item.icon" class="w-4 h-4 mr-3" aria-hidden="true" />
            {{ item.label }}
          </RouterLink>
        </div>

        <!-- Admin section (if user is admin) -->
        <div v-if="isAdmin" class="border-t border-gray-200 pt-2 space-y-1">
          <div class="px-3 py-1 text-xs font-semibold text-gray-500 uppercase tracking-wider">
            Administration
          </div>
          <RouterLink
            v-for="item in adminMenuItems"
            :key="item.id"
            :to="item.to"
            class="flex items-center px-3 py-2 text-sm font-medium rounded-md transition-colors duration-200 hover:bg-gray-100 hover:text-gray-900"
            :class="{
              'bg-gray-50 text-gray-900': isActiveRoute(item.to),
              'text-gray-700': !isActiveRoute(item.to),
            }"
            :aria-current="isActiveRoute(item.to) ? 'page' : undefined"
            @click="$emit('close')"
          >
            <component :is="item.icon" class="w-4 h-4 mr-3" aria-hidden="true" />
            {{ item.label }}
          </RouterLink>
        </div>

        <!-- Logout -->
        <div class="border-t border-gray-200 pt-2">
          <button
            class="flex items-center w-full px-3 py-2 text-sm font-medium text-gray-700 rounded-md hover:bg-gray-100 hover:text-gray-900 transition-colors duration-200"
            @click="handleLogout"
          >
            <ArrowRightOnRectangleIcon class="w-4 h-4 mr-3" aria-hidden="true" />
            Sign Out
          </button>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted, onUnmounted } from 'vue'
import { useRoute } from 'vue-router'
import {
  BellIcon,
  ChevronDownIcon,
  UserIcon,
  CogIcon,
  ArrowRightOnRectangleIcon,
  UserPlusIcon,
  RectangleStackIcon,
  ClipboardDocumentListIcon,
  UsersIcon,
  ChartBarIcon,
  ShieldCheckIcon,
} from '@heroicons/vue/24/outline'
import { useAuth } from '@/composables/useAuth'

interface Props {
  isMobile?: boolean
}

const props = withDefaults(defineProps<Props>(), {
  isMobile: false,
})

const emit = defineEmits<{
  close: []
}>()

const route = useRoute()

// Use actual auth state
const { user, isAuthenticated, isAdmin, logout } = useAuth()

const notificationCount = ref(3)
const isUserDropdownOpen = ref(false)

// Menu items
const userMenuItems = [
  { id: 'profile', label: 'Profile', to: '/auth/profile', icon: UserIcon },
  { id: 'backpack', label: 'My Backpack', to: '/backpack', icon: RectangleStackIcon },
  { id: 'issued', label: 'Issued Badges', to: '/badges/issued', icon: ClipboardDocumentListIcon },
  { id: 'settings', label: 'Settings', to: '/settings', icon: CogIcon },
]

const adminMenuItems = [
  { id: 'admin-dashboard', label: 'Dashboard', to: '/admin', icon: ChartBarIcon },
  { id: 'admin-users', label: 'Users', to: '/admin/users', icon: UsersIcon },
  { id: 'admin-badges', label: 'Badges', to: '/admin/badges', icon: ShieldCheckIcon },
  { id: 'admin-system', label: 'System', to: '/admin/system', icon: CogIcon },
]

// Methods
const toggleUserDropdown = () => {
  isUserDropdownOpen.value = !isUserDropdownOpen.value
}

const closeUserDropdown = () => {
  isUserDropdownOpen.value = false
}

const isActiveRoute = (path: string) => {
  if (path === '/') {
    return route.path === '/'
  }
  return route.path.startsWith(path)
}

const handleLogout = async () => {
  logout()
  closeUserDropdown()
  emit('close')
}

// Handle clicks outside user dropdown
const handleClickOutside = (event: Event) => {
  if (isUserDropdownOpen.value && !props.isMobile) {
    const target = event.target as HTMLElement
    if (!target.closest('[aria-haspopup="true"]') && !target.closest('[role="menu"]')) {
      closeUserDropdown()
    }
  }
}

// Lifecycle
onMounted(() => {
  document.addEventListener('click', handleClickOutside)
})

onUnmounted(() => {
  document.removeEventListener('click', handleClickOutside)
})
</script>
