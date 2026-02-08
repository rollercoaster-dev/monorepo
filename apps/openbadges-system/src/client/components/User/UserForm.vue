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

<template>
  <div class="card p-6">
    <div class="flex items-center justify-between mb-6">
      <h2 class="text-xl font-semibold text-foreground">
        {{ isEditMode ? 'Edit User' : 'Create New User' }}
      </h2>
      <button class="text-muted-foreground hover:text-foreground" @click="$emit('close')">
        <XMarkIcon class="w-6 h-6" />
      </button>
    </div>

    <form class="space-y-6" @submit.prevent="handleSubmit">
      <div class="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div>
          <label for="firstName" class="block text-sm font-medium text-foreground mb-2">
            First Name *
          </label>
          <input
            id="firstName"
            v-model="formData.firstName"
            type="text"
            required
            class="form-input px-3 py-2"
            :class="{ 'border-destructive': errors.firstName }"
          />
          <p v-if="errors.firstName" class="mt-1 text-sm text-destructive">
            {{ errors.firstName }}
          </p>
        </div>

        <div>
          <label for="lastName" class="block text-sm font-medium text-foreground mb-2">
            Last Name *
          </label>
          <input
            id="lastName"
            v-model="formData.lastName"
            type="text"
            required
            class="form-input px-3 py-2"
            :class="{ 'border-destructive': errors.lastName }"
          />
          <p v-if="errors.lastName" class="mt-1 text-sm text-destructive">
            {{ errors.lastName }}
          </p>
        </div>
      </div>

      <div>
        <label for="username" class="block text-sm font-medium text-foreground mb-2">
          Username *
        </label>
        <input
          id="username"
          v-model="formData.username"
          type="text"
          required
          :disabled="isEditMode"
          class="form-input px-3 py-2 disabled:bg-muted disabled:opacity-50 disabled:cursor-not-allowed"
          :class="{ 'border-destructive': errors.username }"
        />
        <p v-if="errors.username" class="mt-1 text-sm text-destructive">
          {{ errors.username }}
        </p>
        <p v-if="isEditMode" class="mt-1 text-sm text-muted-foreground">
          Username cannot be changed after account creation
        </p>
      </div>

      <div>
        <label for="email" class="block text-sm font-medium text-foreground mb-2">Email *</label>
        <input
          id="email"
          v-model="formData.email"
          type="email"
          required
          class="form-input px-3 py-2"
          :class="{ 'border-destructive': errors.email }"
        />
        <p v-if="errors.email" class="mt-1 text-sm text-destructive">
          {{ errors.email }}
        </p>
      </div>

      <div>
        <label for="avatar" class="block text-sm font-medium text-foreground mb-2">
          Avatar URL
        </label>
        <input
          id="avatar"
          v-model="formData.avatar"
          type="url"
          class="form-input px-3 py-2"
          placeholder="https://example.com/avatar.jpg"
        />
      </div>

      <div>
        <label class="block text-sm font-medium text-foreground mb-2">Role</label>
        <div class="flex items-center space-x-4">
          <label class="flex items-center">
            <input
              v-model="formData.isAdmin"
              type="checkbox"
              class="rounded border-input text-primary focus-visible:ring-2 focus-visible:ring-ring"
            />
            <span class="ml-2 text-sm text-foreground">Administrator</span>
          </label>
        </div>
        <p class="mt-1 text-sm text-muted-foreground">
          Administrators have access to user management and system settings
        </p>
      </div>

      <div v-if="isEditMode" class="border-t-2 border-border pt-6">
        <h3 class="text-lg font-medium text-foreground mb-4">WebAuthn Credentials</h3>
        <div v-if="formData.credentials && formData.credentials.length > 0" class="space-y-3">
          <div
            v-for="credential in formData.credentials"
            :key="credential.id"
            class="flex items-center justify-between p-3 bg-muted rounded-sm"
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
            <button
              type="button"
              class="text-destructive hover:opacity-80"
              @click="removeCredential(credential.id)"
            >
              <TrashIcon class="w-4 h-4" />
            </button>
          </div>
        </div>
        <div v-else class="text-sm text-muted-foreground">No WebAuthn credentials configured</div>
      </div>

      <div class="flex justify-end space-x-3 pt-6 border-t-2 border-border">
        <button type="button" class="btn btn-secondary" @click="$emit('close')">Cancel</button>
        <button
          type="submit"
          :disabled="isSubmitting"
          class="btn btn-primary disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {{ isSubmitting ? 'Saving...' : isEditMode ? 'Update User' : 'Create User' }}
        </button>
      </div>
    </form>
  </div>
</template>
