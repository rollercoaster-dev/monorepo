<template>
  <div class="max-w-6xl mx-auto mt-8 px-4">
    <div class="flex justify-between items-center mb-6">
      <h1 class="text-2xl font-bold text-gray-900">Badge Directory</h1>
      <RouterLink
        to="/badges/create"
        class="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg transition-colors"
      >
        Create Badge
      </RouterLink>
    </div>

    <!-- Error state -->
    <div
      v-if="error"
      class="bg-red-50 border border-red-200 rounded-lg p-4 mb-6"
      role="alert"
    >
      <p class="text-red-800">{{ error }}</p>
      <button
        class="mt-2 text-sm text-red-600 hover:text-red-800 underline"
        @click="loadBadgeClasses"
      >
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
          <p class="text-gray-500 mb-4">No badges found.</p>
          <RouterLink
            to="/badges/create"
            class="text-blue-600 hover:text-blue-800 underline"
          >
            Create your first badge
          </RouterLink>
        </div>
      </template>
    </BadgeClassList>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted } from 'vue';
import { useRouter } from 'vue-router';
import { BadgeClassList } from 'openbadges-ui';
import { badgeApi, type BadgeClass } from '@/services/badgeApi';

const router = useRouter();

// State
const badgeClasses = ref<BadgeClass[]>([]);
const loading = ref(true);
const error = ref<string | null>(null);

// Load badge classes
async function loadBadgeClasses() {
  loading.value = true;
  error.value = null;

  try {
    badgeClasses.value = await badgeApi.getBadgeClasses();
  } catch (err) {
    error.value = err instanceof Error ? err.message : 'Failed to load badges';
  } finally {
    loading.value = false;
  }
}

// Handle badge class click - navigate to detail page
function handleBadgeClassClick(badgeClass: BadgeClass) {
  const id = encodeURIComponent(badgeClass.id);
  router.push(`/badges/${id}`);
}

// Load data on mount
onMounted(() => {
  loadBadgeClasses();
});
</script>
