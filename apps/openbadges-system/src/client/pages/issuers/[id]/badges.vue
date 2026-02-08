<script setup lang="ts">
import { ref, onMounted } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { IssuerCard, BadgeClassList } from 'openbadges-ui'
import { badgeApi, type Issuer, type BadgeClass } from '@/services/badgeApi'

const route = useRoute()
const router = useRouter()

// State
const issuer = ref<Issuer | null>(null)
const badgeClasses = ref<BadgeClass[]>([])
const issuerLoading = ref(true)
const badgesLoading = ref(true)
const error = ref<string | null>(null)

// Get issuer ID from route (always present due to file-based routing)
const issuerId = decodeURIComponent(String((route.params as { id: string }).id))

// Load issuer details
async function loadIssuer() {
  issuerLoading.value = true
  try {
    issuer.value = await badgeApi.getIssuerById(issuerId)
  } catch (err) {
    error.value = err instanceof Error ? err.message : 'Failed to load issuer'
  } finally {
    issuerLoading.value = false
  }
}

// Load badge classes for this issuer (uses server-side filtering)
async function loadBadgeClasses() {
  badgesLoading.value = true
  try {
    badgeClasses.value = await badgeApi.getBadgeClassesByIssuer(issuerId)
  } catch (err) {
    error.value = err instanceof Error ? err.message : 'Failed to load badge classes'
  } finally {
    badgesLoading.value = false
  }
}

// Load all data
async function loadData() {
  error.value = null
  await Promise.all([loadIssuer(), loadBadgeClasses()])
}

// Handle badge click - navigate to badge detail page
function handleBadgeClick(badge: BadgeClass) {
  const id = encodeURIComponent(badge.id)
  router.push(`/badges/${id}`)
}

// Load data on mount
onMounted(() => {
  loadData()
})
</script>

<template>
  <div class="max-w-6xl mx-auto mt-8 px-4">
    <div class="flex justify-between items-center mb-6">
      <h1 class="font-headline text-2xl font-bold text-foreground">Badges by Issuer</h1>
      <RouterLink to="/badges/create" class="btn btn-primary">Create Badge</RouterLink>
    </div>

    <!-- Error state -->
    <div v-if="error" class="alert alert-error mb-6" role="alert">
      <p class="text-destructive">{{ error }}</p>
      <button class="mt-2 text-sm text-destructive hover:opacity-80 underline" @click="loadData">
        Try again
      </button>
    </div>

    <div class="space-y-6">
      <!-- Issuer info section -->
      <div class="card card-body">
        <h2 class="text-lg font-semibold mb-4 text-foreground">Issuer Information</h2>
        <div v-if="issuerLoading" class="animate-pulse">
          <div class="flex items-center gap-4">
            <div class="w-16 h-16 bg-muted rounded-md border-2 border-border"></div>
            <div class="flex-1">
              <div class="h-5 bg-muted rounded-sm w-1/3 mb-2"></div>
              <div class="h-4 bg-muted rounded-sm w-2/3"></div>
            </div>
          </div>
        </div>
        <IssuerCard
          v-else-if="issuer"
          :issuer="issuer"
          :show-description="true"
          :show-contact="true"
          density="spacious"
          :interactive="false"
        />
        <p v-else class="text-muted-foreground">Issuer not found</p>
      </div>

      <!-- Badge Classes Grid -->
      <div>
        <h2 class="text-lg font-semibold mb-4 text-foreground">Badge Classes</h2>
        <BadgeClassList
          :badge-classes="badgeClasses"
          :loading="badgesLoading"
          :show-pagination="badgeClasses.length > 9"
          :page-size="9"
          layout="grid"
          aria-label="Badge classes from this issuer"
          @badge-click="handleBadgeClick"
        >
          <template #empty>
            <div class="text-center py-8">
              <p class="text-muted-foreground mb-4">No badge classes found for this issuer.</p>
              <RouterLink
                to="/badges/create"
                class="text-primary hover:text-primary-dark underline"
              >
                Create a badge class
              </RouterLink>
            </div>
          </template>
        </BadgeClassList>
      </div>
    </div>
  </div>
</template>
