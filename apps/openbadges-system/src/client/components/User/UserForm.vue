<template>
  <div class="bg-white rounded-lg shadow-md p-6">
    <div class="flex items-center justify-between mb-6">
      <h2 class="text-xl font-semibold text-gray-900">
        {{ isEditMode ? 'Edit User' : 'Create New User' }}
      </h2>
      <button class="text-gray-400 hover:text-gray-600" @click="$emit('close')">
        <XMarkIcon class="w-6 h-6" />
      </button>
    </div>

    <form class="space-y-6" @submit.prevent="handleSubmit">
      <div class="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div>
          <label for="firstName" class="block text-sm font-medium text-gray-700 mb-2">
            First Name *
          </label>
          <input
            id="firstName"
            v-model="formData.firstName"
            type="text"
            required
            class="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            :class="{ 'border-red-500': errors.firstName }"
          />
          <p v-if="errors.firstName" class="mt-1 text-sm text-red-600">
            {{ errors.firstName }}
          </p>
        </div>

        <div>
          <label for="lastName" class="block text-sm font-medium text-gray-700 mb-2">
            Last Name *
          </label>
          <input
            id="lastName"
            v-model="formData.lastName"
            type="text"
            required
            class="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            :class="{ 'border-red-500': errors.lastName }"
          />
          <p v-if="errors.lastName" class="mt-1 text-sm text-red-600">
            {{ errors.lastName }}
          </p>
        </div>
      </div>

      <div>
        <label for="username" class="block text-sm font-medium text-gray-700 mb-2">
          Username *
        </label>
        <input
          id="username"
          v-model="formData.username"
          type="text"
          required
          :disabled="isEditMode"
          class="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent disabled:bg-gray-100 disabled:cursor-not-allowed"
          :class="{ 'border-red-500': errors.username }"
        />
        <p v-if="errors.username" class="mt-1 text-sm text-red-600">
          {{ errors.username }}
        </p>
        <p v-if="isEditMode" class="mt-1 text-sm text-gray-500">
          Username cannot be changed after account creation
        </p>
      </div>

      <div>
        <label for="email" class="block text-sm font-medium text-gray-700 mb-2">Email *</label>
        <input
          id="email"
          v-model="formData.email"
          type="email"
          required
          class="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          :class="{ 'border-red-500': errors.email }"
        />
        <p v-if="errors.email" class="mt-1 text-sm text-red-600">
          {{ errors.email }}
        </p>
      </div>

      <div>
        <label for="avatar" class="block text-sm font-medium text-gray-700 mb-2">Avatar URL</label>
        <input
          id="avatar"
          v-model="formData.avatar"
          type="url"
          class="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          placeholder="https://example.com/avatar.jpg"
        />
      </div>

      <div>
        <label class="block text-sm font-medium text-gray-700 mb-2">Role</label>
        <div class="flex items-center space-x-4">
          <label class="flex items-center">
            <input
              v-model="formData.isAdmin"
              type="checkbox"
              class="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
            />
            <span class="ml-2 text-sm text-gray-700">Administrator</span>
          </label>
        </div>
        <p class="mt-1 text-sm text-gray-500">
          Administrators have access to user management and system settings
        </p>
      </div>

      <div v-if="isEditMode" class="border-t pt-6">
        <h3 class="text-lg font-medium text-gray-900 mb-4">WebAuthn Credentials</h3>
        <div v-if="formData.credentials && formData.credentials.length > 0" class="space-y-3">
          <div
            v-for="credential in formData.credentials"
            :key="credential.id"
            class="flex items-center justify-between p-3 bg-gray-50 rounded-lg"
          >
            <div>
              <p class="font-medium text-gray-900">
                {{ credential.name }}
              </p>
              <p class="text-sm text-gray-600">
                {{ credential.type }}
              </p>
              <p class="text-xs text-gray-500">Last used: {{ formatDate(credential.lastUsed) }}</p>
            </div>
            <button
              type="button"
              class="text-red-600 hover:text-red-800"
              @click="removeCredential(credential.id)"
            >
              <TrashIcon class="w-4 h-4" />
            </button>
          </div>
        </div>
        <div v-else class="text-sm text-gray-500">No WebAuthn credentials configured</div>
      </div>

      <div class="flex justify-end space-x-3 pt-6 border-t">
        <button
          type="button"
          class="px-4 py-2 text-gray-700 bg-gray-100 hover:bg-gray-200 rounded-md transition-colors"
          @click="$emit('close')"
        >
          Cancel
        </button>
        <button
          type="submit"
          :disabled="isSubmitting"
          class="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
        >
          {{ isSubmitting ? 'Saving...' : isEditMode ? 'Update User' : 'Create User' }}
        </button>
      </div>
    </form>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, watch } from 'vue'
import { XMarkIcon, TrashIcon } from '@heroicons/vue/24/outline'
import type { User } from '@/composables/useAuth'

interface Props {
  user?: User
  isSubmitting?: boolean
}

interface FormData {
  firstName: string
  lastName: string
  username: string
  email: string
  avatar: string
  isAdmin: boolean
  credentials?: Array<{
    id: string
    name: string
    type: string
    lastUsed: string
  }>
}

const props = defineProps<Props>()

const emits = defineEmits<{
  close: []
  submit: [data: FormData]
  removeCredential: [userId: string, credentialId: string]
}>()

const isEditMode = computed(() => !!props.user)

const formData = ref<FormData>({
  firstName: '',
  lastName: '',
  username: '',
  email: '',
  avatar: '',
  isAdmin: false,
  credentials: [],
})

const errors = ref<Partial<Record<keyof FormData, string>>>({})

watch(
  () => props.user,
  newUser => {
    if (newUser) {
      formData.value = {
        firstName: newUser.firstName,
        lastName: newUser.lastName,
        username: newUser.username,
        email: newUser.email,
        avatar: newUser.avatar || '',
        isAdmin: newUser.isAdmin,
        credentials: newUser.credentials || [],
      }
    } else {
      resetForm()
    }
  },
  { immediate: true }
)

function resetForm() {
  formData.value = {
    firstName: '',
    lastName: '',
    username: '',
    email: '',
    avatar: '',
    isAdmin: false,
    credentials: [],
  }
  errors.value = {}
}

function validateForm(): boolean {
  errors.value = {}

  if (!formData.value.firstName.trim()) {
    errors.value.firstName = 'First name is required'
  }

  if (!formData.value.lastName.trim()) {
    errors.value.lastName = 'Last name is required'
  }

  if (!formData.value.username.trim()) {
    errors.value.username = 'Username is required'
  } else if (formData.value.username.length < 3) {
    errors.value.username = 'Username must be at least 3 characters'
  }

  if (!formData.value.email.trim()) {
    errors.value.email = 'Email is required'
  } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.value.email)) {
    errors.value.email = 'Please enter a valid email address'
  }

  return Object.keys(errors.value).length === 0
}

function handleSubmit() {
  if (validateForm()) {
    emits('submit', formData.value)
  }
}

function removeCredential(credentialId: string) {
  if (props.user && confirm('Are you sure you want to remove this credential?')) {
    emits('removeCredential', props.user.id, credentialId)
  }
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
