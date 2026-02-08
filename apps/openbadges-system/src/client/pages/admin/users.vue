<script setup lang="ts">
import { ref, onMounted, watch } from 'vue'
import {
  PlusIcon,
  XMarkIcon,
  ExclamationTriangleIcon,
  CheckCircleIcon,
} from '@heroicons/vue/24/outline'
import { useUsers } from '@/composables/useUsers'
import type { User } from '@/composables/useAuth'
import type { UserSearchFilters } from '@/composables/useUsers'
import UserSearch from '@/components/User/UserSearch.vue'
import UserList from '@/components/User/UserList.vue'
import UserForm from '@/components/User/UserForm.vue'

const {
  users,
  totalUsers,
  currentPage,
  itemsPerPage,
  isLoading,
  error,
  searchQuery,
  filters,
  fetchUsers,
  createUser,
  updateUser,
  deleteUser,
  removeUserCredential,
  changePage,
  changeItemsPerPage,
  exportUsers,
  clearError,
} = useUsers()

// Component state
const showCreateForm = ref(false)
const showEditForm = ref(false)
const showViewModal = ref(false)
const selectedUser = ref<User | null>(null)
const successMessage = ref<string | null>(null)

// Load users on component mount
onMounted(() => {
  fetchUsers()
})

// Auto-clear success message
watch(successMessage, message => {
  if (message) {
    setTimeout(() => {
      successMessage.value = null
    }, 5000)
  }
})

function handleSearch(query: string, searchFilters: UserSearchFilters) {
  searchQuery.value = query
  filters.value = searchFilters
  fetchUsers(1, itemsPerPage.value, query, searchFilters)
}

function handleExport(searchFilters: UserSearchFilters) {
  exportUsers(searchFilters).then(blob => {
    if (blob) {
      const url = window.URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = `users_export_${new Date().toISOString().split('T')[0]}.csv`
      document.body.appendChild(a)
      a.click()
      document.body.removeChild(a)
      window.URL.revokeObjectURL(url)
      successMessage.value = 'Users exported successfully'
    }
  })
}

function handleEditUser(user: User) {
  selectedUser.value = user
  showEditForm.value = true
}

function handleViewUser(user: User) {
  selectedUser.value = user
  showViewModal.value = true
}

function handleDeleteUser(user: User) {
  if (confirm(`Are you sure you want to delete user "${user.username}"?`)) {
    deleteUser(user.id).then(success => {
      if (success) {
        successMessage.value = `User "${user.username}" deleted successfully`
      }
    })
  }
}

function handleSubmitUser(formData: any) {
  if (selectedUser.value) {
    // Update existing user
    updateUser(selectedUser.value.id, formData).then(updatedUser => {
      if (updatedUser) {
        closeForm()
        successMessage.value = `User "${updatedUser.username}" updated successfully`
      }
    })
  } else {
    // Create new user
    createUser(formData).then(newUser => {
      if (newUser) {
        closeForm()
        successMessage.value = `User "${newUser.username}" created successfully`
      }
    })
  }
}

function handleRemoveCredential(userId: string, credentialId: string) {
  removeUserCredential(userId, credentialId).then(success => {
    if (success) {
      successMessage.value = 'Credential removed successfully'
    }
  })
}

function closeForm() {
  showCreateForm.value = false
  showEditForm.value = false
  selectedUser.value = null
}

function closeViewModal() {
  showViewModal.value = false
  selectedUser.value = null
}

function getInitials(firstName: string, lastName: string): string {
  return `${firstName.charAt(0)}${lastName.charAt(0)}`.toUpperCase()
}

function formatDate(dateString: string): string {
  const date = new Date(dateString)
  return date.toLocaleDateString('en-US', {
    month: 'long',
    day: 'numeric',
    year: 'numeric',
  })
}
</script>

<template>
  <div class="max-w-7xl mx-auto mt-8">
    <div class="flex justify-between items-center mb-6">
      <h1 class="font-headline text-2xl font-bold text-foreground">User Management</h1>
      <button class="btn btn-primary flex items-center space-x-2" @click="showCreateForm = true">
        <PlusIcon class="w-5 h-5" />
        <span>Create User</span>
      </button>
    </div>

    <div class="space-y-6">
      <!-- Search and Filters -->
      <UserSearch
        :initial-query="searchQuery"
        :initial-filters="filters"
        @search="handleSearch"
        @export="handleExport"
      />

      <!-- User List -->
      <UserList
        :users="users"
        :loading="isLoading"
        :current-page="currentPage"
        :total-users="totalUsers"
        :items-per-page="itemsPerPage"
        @edit="handleEditUser"
        @view="handleViewUser"
        @delete="handleDeleteUser"
        @change-page="changePage"
        @change-items-per-page="changeItemsPerPage"
      />
    </div>

    <!-- Create/Edit User Modal -->
    <div
      v-if="showCreateForm || showEditForm"
      class="fixed inset-0 bg-black/50 flex items-center justify-center z-50"
    >
      <div class="card max-w-2xl w-full mx-4 max-h-[90vh] overflow-y-auto">
        <UserForm
          :user="selectedUser || undefined"
          :is-submitting="isLoading"
          @close="closeForm"
          @submit="handleSubmitUser"
          @remove-credential="handleRemoveCredential"
        />
      </div>
    </div>

    <!-- View User Modal -->
    <div
      v-if="showViewModal"
      class="fixed inset-0 bg-black/50 flex items-center justify-center z-50"
    >
      <div class="card max-w-2xl w-full mx-4 max-h-[90vh] overflow-y-auto">
        <div class="card-body">
          <div class="flex items-center justify-between mb-6">
            <h2 class="text-xl font-semibold text-foreground">User Details</h2>
            <button class="text-muted-foreground hover:text-foreground" @click="closeViewModal">
              <XMarkIcon class="w-6 h-6" />
            </button>
          </div>

          <div v-if="selectedUser" class="space-y-6">
            <div class="flex items-center space-x-4">
              <div class="flex-shrink-0">
                <div
                  v-if="selectedUser.avatar"
                  class="w-20 h-20 rounded-md border-2 border-border bg-cover bg-center"
                  :style="{ backgroundImage: `url(${selectedUser.avatar})` }"
                ></div>
                <div
                  v-else
                  class="w-20 h-20 rounded-md border-2 border-border bg-primary flex items-center justify-center text-primary-foreground font-semibold text-2xl"
                >
                  {{ getInitials(selectedUser.firstName, selectedUser.lastName) }}
                </div>
              </div>

              <div>
                <h3 class="text-2xl font-bold text-foreground">
                  {{ selectedUser.firstName }} {{ selectedUser.lastName }}
                </h3>
                <p class="text-muted-foreground">@{{ selectedUser.username }}</p>
                <p class="text-muted-foreground">
                  {{ selectedUser.email }}
                </p>
              </div>
            </div>

            <div class="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <h4 class="font-semibold text-foreground mb-2">Role</h4>
                <span
                  v-if="selectedUser.isAdmin"
                  class="inline-flex items-center px-3 py-1 rounded-sm border-2 border-accent text-sm font-medium bg-accent/10 text-accent"
                >
                  Administrator
                </span>
                <span
                  v-else
                  class="inline-flex items-center px-3 py-1 rounded-sm border-2 border-border text-sm font-medium bg-muted text-foreground"
                >
                  User
                </span>
              </div>

              <div>
                <h4 class="font-semibold text-foreground mb-2">Status</h4>
                <span
                  class="inline-flex items-center px-3 py-1 rounded-sm border-2 border-success text-sm font-medium bg-success/10 text-success"
                >
                  Active
                </span>
              </div>

              <div>
                <h4 class="font-semibold text-foreground mb-2">Registration Date</h4>
                <p class="text-muted-foreground">
                  {{ formatDate(selectedUser.createdAt) }}
                </p>
              </div>

              <div>
                <h4 class="font-semibold text-foreground mb-2">Credentials</h4>
                <p class="text-muted-foreground">
                  {{ selectedUser.credentials?.length || 0 }} registered
                </p>
              </div>
            </div>

            <div v-if="selectedUser.credentials && selectedUser.credentials.length > 0">
              <h4 class="font-semibold text-foreground mb-4">WebAuthn Credentials</h4>
              <div class="space-y-3">
                <div
                  v-for="credential in selectedUser.credentials"
                  :key="credential.id"
                  class="flex items-center justify-between p-3 bg-muted rounded-md border-2 border-border"
                >
                  <div>
                    <p class="font-medium text-foreground">
                      {{ credential.name }}
                    </p>
                    <p class="text-sm text-muted-foreground">
                      {{ credential.type }}
                    </p>
                    <p class="text-xs text-muted-foreground">
                      Last used: {{ formatDate(credential.lastUsed) }}
                    </p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>

    <!-- Error Message -->
    <div
      v-if="error"
      class="fixed bottom-4 right-4 bg-destructive text-destructive-foreground px-4 py-3 border-2 border-border rounded-md shadow-hard-md z-50"
    >
      <div class="flex items-center space-x-2">
        <ExclamationTriangleIcon class="w-5 h-5" />
        <span>{{ error }}</span>
        <button class="ml-2 hover:opacity-80" @click="clearError">
          <XMarkIcon class="w-4 h-4" />
        </button>
      </div>
    </div>

    <!-- Success Message -->
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
