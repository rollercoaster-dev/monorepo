<template>
  <div class="bg-white rounded-lg shadow-md p-6 hover:shadow-lg transition-shadow">
    <div class="flex items-start justify-between">
      <div class="flex items-center space-x-4">
        <div class="flex-shrink-0">
          <div
            v-if="user.avatar"
            class="w-12 h-12 rounded-full bg-cover bg-center"
            :style="{ backgroundImage: `url(${user.avatar})` }"
          ></div>
          <div
            v-else
            class="w-12 h-12 rounded-full bg-gradient-to-br from-blue-500 to-purple-600 flex items-center justify-center text-white font-semibold text-lg"
          >
            {{ getInitials(user.firstName, user.lastName) }}
          </div>
        </div>

        <div class="flex-1">
          <h3 class="text-lg font-semibold text-gray-900">
            {{ user.firstName }} {{ user.lastName }}
          </h3>
          <p class="text-sm text-gray-600">@{{ user.username }}</p>
          <p class="text-sm text-gray-500">
            {{ user.email }}
          </p>
        </div>
      </div>

      <div class="flex flex-col items-end space-y-2">
        <div class="flex items-center space-x-2">
          <span
            v-if="user.isAdmin"
            class="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-purple-100 text-purple-800"
          >
            Admin
          </span>
          <span
            class="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium"
            :class="getStatusClasses(isActive)"
          >
            {{ isActive ? 'Active' : 'Inactive' }}
          </span>
        </div>

        <div class="flex items-center space-x-1">
          <button
            class="p-1 text-gray-400 hover:text-blue-600 transition-colors"
            title="Edit user"
            @click="$emit('edit', user)"
          >
            <PencilIcon class="w-4 h-4" />
          </button>
          <button
            class="p-1 text-gray-400 hover:text-green-600 transition-colors"
            title="View user"
            @click="$emit('view', user)"
          >
            <EyeIcon class="w-4 h-4" />
          </button>
          <button
            class="p-1 text-gray-400 hover:text-red-600 transition-colors"
            title="Delete user"
            @click="$emit('delete', user)"
          >
            <TrashIcon class="w-4 h-4" />
          </button>
        </div>
      </div>
    </div>

    <div class="mt-4 pt-4 border-t border-gray-200">
      <div class="flex items-center justify-between text-sm text-gray-600">
        <div class="flex items-center space-x-4">
          <div class="flex items-center space-x-1">
            <KeyIcon class="w-4 h-4" />
            <span>{{ user.credentials?.length || 0 }} credentials</span>
          </div>
          <div class="flex items-center space-x-1">
            <CalendarIcon class="w-4 h-4" />
            <span>{{ formatDate(user.createdAt) }}</span>
          </div>
        </div>

        <div v-if="lastLoginText" class="text-xs text-gray-500">
          Last login: {{ lastLoginText }}
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import { PencilIcon, EyeIcon, TrashIcon, KeyIcon, CalendarIcon } from '@heroicons/vue/24/outline'
import type { User } from '@/composables/useAuth'

interface Props {
  user: User
  lastLogin?: string
}

const props = defineProps<Props>()

defineEmits<{
  edit: [user: User]
  view: [user: User]
  delete: [user: User]
}>()

const isActive = computed(() => {
  // For now, assume all users are active since we don't have an isActive field
  // This can be enhanced when we add user status management
  return true
})

const lastLoginText = computed(() => {
  if (!props.lastLogin) return null

  const date = new Date(props.lastLogin)
  const now = new Date()
  const diffMs = now.getTime() - date.getTime()
  const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24))

  if (diffDays === 0) return 'Today'
  if (diffDays === 1) return 'Yesterday'
  if (diffDays < 7) return `${diffDays} days ago`
  return formatDate(props.lastLogin)
})

function getInitials(firstName: string, lastName: string): string {
  const first = firstName?.charAt(0) || ''
  const last = lastName?.charAt(0) || ''
  const initials = `${first}${last}`.toUpperCase()
  return initials || '??'
}

function getStatusClasses(active: boolean): string {
  return active ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'
}

function formatDate(dateString: string): string {
  const date = new Date(dateString)
  return date.toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  })
}
</script>
