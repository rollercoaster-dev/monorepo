<script setup lang="ts">
import { ref, onMounted } from 'vue'
import { useRouter } from 'vue-router'
import { IssuerList } from 'openbadges-ui'
import { badgeApi, type Issuer } from '@/services/badgeApi'

const router = useRouter()

// State
const issuers = ref<Issuer[]>([])
const loading = ref(true)
const error = ref<string | null>(null)

// Load issuers
async function loadIssuers() {
  loading.value = true
  error.value = null

  try {
    issuers.value = await badgeApi.getIssuers()
  } catch (err) {
    error.value = err instanceof Error ? err.message : 'Failed to load issuers'
  } finally {
    loading.value = false
  }
}

// Handle issuer click - navigate to detail page
function handleIssuerClick(issuer: Issuer) {
  const id = encodeURIComponent(issuer.id)
  router.push(`/issuers/${id}`)
}

// Load data on mount
onMounted(() => {
  loadIssuers()
})
</script>

<template>
  <div class="max-w-6xl mx-auto mt-8 px-4">
    <div class="flex justify-between items-center mb-6">
      <h1 class="font-headline text-2xl font-bold text-foreground">Issuer Directory</h1>
      <RouterLink to="/issuers/create" class="btn btn-primary">Create Issuer</RouterLink>
    </div>

    <!-- Error state -->
    <div v-if="error" class="alert alert-error mb-6" role="alert">
      <p class="text-destructive">{{ error }}</p>
      <button class="mt-2 text-sm text-destructive hover:opacity-80 underline" @click="loadIssuers">
        Try again
      </button>
    </div>

    <!-- Issuer List -->
    <IssuerList
      :issuers="issuers"
      :loading="loading"
      :show-pagination="issuers.length > 9"
      :page-size="9"
      layout="grid"
      aria-label="Badge issuers"
      @issuer-click="handleIssuerClick"
    >
      <template #empty>
        <div class="text-center py-8">
          <p class="text-muted-foreground mb-4">No issuers found.</p>
          <RouterLink to="/issuers/create" class="text-primary hover:text-primary-dark underline">
            Register as an issuer
          </RouterLink>
        </div>
      </template>
    </IssuerList>
  </div>
</template>
