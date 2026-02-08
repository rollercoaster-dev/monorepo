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

<template>
  <div class="card">
    <div class="px-6 py-4 border-b-2 border-border">
      <div class="flex items-center justify-between">
        <h2 class="text-lg font-semibold text-foreground">Users ({{ totalUsers }})</h2>
        <div class="flex items-center space-x-2">
          <select
            v-model="itemsPerPage"
            class="form-input px-3 py-1 text-sm"
            @change="handleItemsPerPageChange"
          >
            <option value="10">10 per page</option>
            <option value="25">25 per page</option>
            <option value="50">50 per page</option>
            <option value="100">100 per page</option>
          </select>
          <button class="btn btn-secondary px-3 py-1 text-sm" @click="toggleViewMode">
            {{ viewMode === 'grid' ? 'List View' : 'Grid View' }}
          </button>
        </div>
      </div>
    </div>

    <div v-if="loading" class="p-8 text-center">
      <div class="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto"></div>
      <p class="mt-2 text-muted-foreground">Loading users...</p>
    </div>

    <div v-else-if="users.length === 0" class="p-8 text-center">
      <UserGroupIcon class="w-16 h-16 text-muted-foreground mx-auto mb-4" />
      <p class="text-muted-foreground">No users found</p>
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
          <thead class="bg-muted">
            <tr>
              <th
                class="px-6 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider"
              >
                User
              </th>
              <th
                class="px-6 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider"
              >
                Role
              </th>
              <th
                class="px-6 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider"
              >
                Status
              </th>
              <th
                class="px-6 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider"
              >
                Credentials
              </th>
              <th
                class="px-6 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider"
              >
                Created
              </th>
              <th
                class="px-6 py-3 text-right text-xs font-medium text-muted-foreground uppercase tracking-wider"
              >
                Actions
              </th>
            </tr>
          </thead>
          <tbody class="bg-card divide-y divide-border">
            <tr v-for="user in users" :key="user.id" class="hover:bg-muted">
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
                      class="w-10 h-10 rounded-full bg-primary flex items-center justify-center text-primary-foreground font-semibold text-sm"
                    >
                      {{ getInitials(user.firstName, user.lastName) }}
                    </div>
                  </div>
                  <div class="ml-4">
                    <div class="text-sm font-medium text-foreground">
                      {{ user.firstName }} {{ user.lastName }}
                    </div>
                    <div class="text-sm text-muted-foreground">@{{ user.username }}</div>
                    <div class="text-sm text-muted-foreground">
                      {{ user.email }}
                    </div>
                  </div>
                </div>
              </td>
              <td class="px-6 py-4 whitespace-nowrap">
                <span
                  v-if="user.isAdmin"
                  class="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-accent text-accent-foreground"
                >
                  Admin
                </span>
                <span
                  v-else
                  class="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-muted text-muted-foreground"
                >
                  User
                </span>
              </td>
              <td class="px-6 py-4 whitespace-nowrap">
                <span
                  class="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-success-light text-success"
                >
                  Active
                </span>
              </td>
              <td class="px-6 py-4 whitespace-nowrap text-sm text-foreground">
                <div class="flex items-center space-x-1">
                  <KeyIcon class="w-4 h-4 text-muted-foreground" />
                  <span>{{ user.credentials?.length || 0 }}</span>
                </div>
              </td>
              <td class="px-6 py-4 whitespace-nowrap text-sm text-muted-foreground">
                {{ formatDate(user.createdAt) }}
              </td>
              <td class="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                <div class="flex items-center justify-end space-x-2">
                  <button class="text-primary hover:text-primary-dark" @click="$emit('view', user)">
                    View
                  </button>
                  <button class="text-primary hover:text-primary-dark" @click="$emit('edit', user)">
                    Edit
                  </button>
                  <button class="text-destructive hover:opacity-80" @click="$emit('delete', user)">
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
    <div v-if="totalPages > 1" class="px-6 py-4 border-t-2 border-border">
      <div class="flex items-center justify-between">
        <div class="text-sm text-foreground">
          Showing {{ (currentPage - 1) * itemsPerPage + 1 }} to
          {{ Math.min(currentPage * itemsPerPage, totalUsers) }} of {{ totalUsers }} results
        </div>
        <div class="flex items-center space-x-2">
          <button
            :disabled="currentPage === 1"
            class="px-3 py-1 text-sm text-muted-foreground hover:text-foreground disabled:opacity-50 disabled:cursor-not-allowed"
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
                  ? 'bg-primary text-primary-foreground'
                  : 'text-muted-foreground hover:text-foreground hover:bg-muted',
              ]"
              @click="changePage(page)"
            >
              {{ page }}
            </button>
          </div>

          <button
            :disabled="currentPage === totalPages"
            class="px-3 py-1 text-sm text-muted-foreground hover:text-foreground disabled:opacity-50 disabled:cursor-not-allowed"
            @click="changePage(currentPage + 1)"
          >
            Next
          </button>
        </div>
      </div>
    </div>
  </div>
</template>
