<template>
  <div class="bg-white rounded-lg shadow-md">
    <div class="px-6 py-4 border-b border-gray-200">
      <div class="flex items-center justify-between">
        <h2 class="text-lg font-semibold text-gray-900">Users ({{ totalUsers }})</h2>
        <div class="flex items-center space-x-2">
          <select
            v-model="itemsPerPage"
            class="px-3 py-1 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            @change="handleItemsPerPageChange"
          >
            <option value="10">10 per page</option>
            <option value="25">25 per page</option>
            <option value="50">50 per page</option>
            <option value="100">100 per page</option>
          </select>
          <button
            class="px-3 py-1 text-sm text-gray-600 hover:text-gray-900 border border-gray-300 rounded-md"
            @click="toggleViewMode"
          >
            {{ viewMode === 'grid' ? 'List View' : 'Grid View' }}
          </button>
        </div>
      </div>
    </div>

    <div v-if="loading" class="p-8 text-center">
      <div class="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500 mx-auto"></div>
      <p class="mt-2 text-gray-600">Loading users...</p>
    </div>

    <div v-else-if="users.length === 0" class="p-8 text-center">
      <UserGroupIcon class="w-16 h-16 text-gray-300 mx-auto mb-4" />
      <p class="text-gray-600">No users found</p>
    </div>

    <div v-else>
      <!-- Grid View -->
      <div
        v-if="viewMode === 'grid'"
        class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 p-6"
      >
        <UserCard
          v-for="user in users"
          :key="user.id"
          :user="user"
          @edit="$emit('edit', user)"
          @view="$emit('view', user)"
          @delete="$emit('delete', user)"
        />
      </div>

      <!-- Table View -->
      <div v-else class="overflow-x-auto">
        <table class="w-full">
          <thead class="bg-gray-50">
            <tr>
              <th
                class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider"
              >
                User
              </th>
              <th
                class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider"
              >
                Role
              </th>
              <th
                class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider"
              >
                Status
              </th>
              <th
                class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider"
              >
                Credentials
              </th>
              <th
                class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider"
              >
                Created
              </th>
              <th
                class="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider"
              >
                Actions
              </th>
            </tr>
          </thead>
          <tbody class="bg-white divide-y divide-gray-200">
            <tr v-for="user in users" :key="user.id" class="hover:bg-gray-50">
              <td class="px-6 py-4 whitespace-nowrap">
                <div class="flex items-center">
                  <div class="flex-shrink-0 w-10 h-10">
                    <div
                      v-if="user.avatar"
                      class="w-10 h-10 rounded-full bg-cover bg-center"
                      :style="{ backgroundImage: `url(${user.avatar})` }"
                    ></div>
                    <div
                      v-else
                      class="w-10 h-10 rounded-full bg-gradient-to-br from-blue-500 to-purple-600 flex items-center justify-center text-white font-semibold text-sm"
                    >
                      {{ getInitials(user.firstName, user.lastName) }}
                    </div>
                  </div>
                  <div class="ml-4">
                    <div class="text-sm font-medium text-gray-900">
                      {{ user.firstName }} {{ user.lastName }}
                    </div>
                    <div class="text-sm text-gray-500">@{{ user.username }}</div>
                    <div class="text-sm text-gray-500">
                      {{ user.email }}
                    </div>
                  </div>
                </div>
              </td>
              <td class="px-6 py-4 whitespace-nowrap">
                <span
                  v-if="user.isAdmin"
                  class="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-purple-100 text-purple-800"
                >
                  Admin
                </span>
                <span
                  v-else
                  class="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-gray-100 text-gray-800"
                >
                  User
                </span>
              </td>
              <td class="px-6 py-4 whitespace-nowrap">
                <span
                  class="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800"
                >
                  Active
                </span>
              </td>
              <td class="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                <div class="flex items-center space-x-1">
                  <KeyIcon class="w-4 h-4 text-gray-400" />
                  <span>{{ user.credentials?.length || 0 }}</span>
                </div>
              </td>
              <td class="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                {{ formatDate(user.createdAt) }}
              </td>
              <td class="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                <div class="flex items-center justify-end space-x-2">
                  <button class="text-blue-600 hover:text-blue-900" @click="$emit('view', user)">
                    View
                  </button>
                  <button
                    class="text-indigo-600 hover:text-indigo-900"
                    @click="$emit('edit', user)"
                  >
                    Edit
                  </button>
                  <button class="text-red-600 hover:text-red-900" @click="$emit('delete', user)">
                    Delete
                  </button>
                </div>
              </td>
            </tr>
          </tbody>
        </table>
      </div>
    </div>

    <!-- Pagination -->
    <div v-if="totalPages > 1" class="px-6 py-4 border-t border-gray-200">
      <div class="flex items-center justify-between">
        <div class="text-sm text-gray-700">
          Showing {{ (currentPage - 1) * itemsPerPage + 1 }} to
          {{ Math.min(currentPage * itemsPerPage, totalUsers) }} of {{ totalUsers }} results
        </div>
        <div class="flex items-center space-x-2">
          <button
            :disabled="currentPage === 1"
            class="px-3 py-1 text-sm text-gray-600 hover:text-gray-900 disabled:opacity-50 disabled:cursor-not-allowed"
            @click="changePage(currentPage - 1)"
          >
            Previous
          </button>

          <div class="flex items-center space-x-1">
            <button
              v-for="page in visiblePages"
              :key="page"
              :class="[
                'px-3 py-1 text-sm rounded-md',
                page === currentPage
                  ? 'bg-blue-600 text-white'
                  : 'text-gray-600 hover:text-gray-900 hover:bg-gray-100',
              ]"
              @click="changePage(page)"
            >
              {{ page }}
            </button>
          </div>

          <button
            :disabled="currentPage === totalPages"
            class="px-3 py-1 text-sm text-gray-600 hover:text-gray-900 disabled:opacity-50 disabled:cursor-not-allowed"
            @click="changePage(currentPage + 1)"
          >
            Next
          </button>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed } from 'vue'
import { UserGroupIcon, KeyIcon } from '@heroicons/vue/24/outline'
import type { User } from '@/composables/useAuth'
import UserCard from './UserCard.vue'

interface Props {
  users: User[]
  loading?: boolean
  currentPage?: number
  totalUsers?: number
  itemsPerPage?: number
}

const props = withDefaults(defineProps<Props>(), {
  loading: false,
  currentPage: 1,
  totalUsers: 0,
  itemsPerPage: 10,
})

const emits = defineEmits<{
  edit: [user: User]
  view: [user: User]
  delete: [user: User]
  changePage: [page: number]
  changeItemsPerPage: [itemsPerPage: number]
}>()

const viewMode = ref<'grid' | 'table'>('grid')
const itemsPerPage = ref(props.itemsPerPage)

const totalPages = computed(() => Math.ceil(props.totalUsers / itemsPerPage.value))

const visiblePages = computed(() => {
  const delta = 2
  const range = []
  const rangeWithDots = []

  for (
    let i = Math.max(2, props.currentPage - delta);
    i <= Math.min(totalPages.value - 1, props.currentPage + delta);
    i++
  ) {
    range.push(i)
  }

  if (props.currentPage - delta > 2) {
    rangeWithDots.push(1, '...')
  } else {
    rangeWithDots.push(1)
  }

  rangeWithDots.push(...range)

  if (props.currentPage + delta < totalPages.value - 1) {
    rangeWithDots.push('...', totalPages.value)
  } else {
    rangeWithDots.push(totalPages.value)
  }

  return rangeWithDots.filter(
    (page, index, arr) => (arr.indexOf(page) === index && page !== '...') || page === '...'
  )
})

function toggleViewMode() {
  viewMode.value = viewMode.value === 'grid' ? 'table' : 'grid'
}

function changePage(page: number | string) {
  if (typeof page === 'number' && page >= 1 && page <= totalPages.value) {
    emits('changePage', page)
  }
}

function handleItemsPerPageChange() {
  emits('changeItemsPerPage', itemsPerPage.value)
  emits('changePage', 1)
}

function getInitials(firstName: string, lastName: string): string {
  return `${firstName.charAt(0)}${lastName.charAt(0)}`.toUpperCase()
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
