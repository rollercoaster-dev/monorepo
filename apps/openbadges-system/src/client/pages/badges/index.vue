<script setup lang="ts">
import { ref, onMounted } from 'vue'
import { useRouter } from 'vue-router'
import { BadgeClassList } from 'openbadges-ui'
import { badgeApi, type BadgeClass } from '@/services/badgeApi'

const router = useRouter()

// State
const badgeClasses = ref<BadgeClass[]>([])
const loading = ref(true)
const error = ref<string | null>(null)

// Load badge classes
async function loadBadgeClasses() {
  loading.value = true
  error.value = null

  try {
    badgeClasses.value = await badgeApi.getBadgeClasses()
  } catch (err) {
    error.value = err instanceof Error ? err.message : 'Failed to load badges'
  } finally {
    loading.value = false
  }
}

// Handle badge class click - navigate to detail page
function handleBadgeClassClick(badgeClass: BadgeClass) {
  const id = encodeURIComponent(badgeClass.id)
  router.push(`/badges/${id}`)
}

// Load data on mount
onMounted(() => {
  loadBadgeClasses()
})
</script>

<template>
  <div class="max-w-6xl mx-auto mt-8 px-4">
    <div class="flex justify-between items-center mb-6">
      <h1 class="font-headline text-2xl font-bold text-foreground">Badge Directory</h1>
      <RouterLink to="/badges/create" class="btn btn-primary">Create Badge</RouterLink>
    </div>

    <!-- Error state -->
    <div v-if="error" class="alert alert-error mb-6" role="alert">
      <p>{{ error }}</p>
      <button class="mt-2 text-sm underline hover:opacity-80" @click="loadBadgeClasses">
        Try again
      </button>
    </div>

    <!-- Badge Class List -->
    <BadgeClassList
      :badge-classes="badgeClasses"
      :loading="loading"
      :show-pagination="badgeClasses.length > 9"
      :page-size="9"
      layout="grid"
      aria-label="Available badge classes"
      @badge-class-click="handleBadgeClassClick"
    >
      <template #empty>
        <div class="text-center py-8">
          <p class="text-muted-foreground mb-4">No badges found.</p>
          <RouterLink to="/badges/create" class="text-primary hover:text-primary-dark underline">
            Create your first badge
          </RouterLink>
        </div>
      </template>
    </BadgeClassList>
  </div>
</template>
