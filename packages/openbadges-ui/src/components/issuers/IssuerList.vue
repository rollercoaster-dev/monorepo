<script setup lang="ts">
import { computed, ref, watch } from 'vue';
import type { OB2, OB3 } from '@/types';
import IssuerCard from '@components/issuers/IssuerCard.vue';

interface Props {
  issuers: (OB2.Profile | OB3.Profile)[];
  layout?: 'grid' | 'list';
  loading?: boolean;
  pageSize?: number;
  currentPage?: number;
  showPagination?: boolean;
  density?: 'compact' | 'normal' | 'spacious';
  ariaLabel?: string;
}

const props = withDefaults(defineProps<Props>(), {
  layout: 'grid',
  loading: false,
  pageSize: 9,
  currentPage: 1,
  showPagination: false,
  density: 'normal',
  ariaLabel: 'List of issuers',
});

const emit = defineEmits<{
  (e: 'issuer-click', issuer: OB2.Profile | OB3.Profile): void;
  (e: 'page-change', page: number): void;
  (e: 'update:density', density: 'compact' | 'normal' | 'spacious'): void;
}>();

// Internal state for pagination
const internalCurrentPage = ref(props.currentPage);

// Internal state for density
const internalDensity = ref<'compact' | 'normal' | 'spacious'>(props.density);

// Watch for external currentPage changes
watch(
  () => props.currentPage,
  (newPage) => {
    internalCurrentPage.value = newPage;
  }
);

// Watch for external density changes
watch(
  () => props.density,
  (newValue) => {
    internalDensity.value = newValue;
  }
);

// Search filter state
const searchText = ref('');

// Normalize issuer for search/display
const normalizeIssuer = (issuer: OB2.Profile | OB3.Profile) => {
  const name = issuer.name || 'Unknown Issuer';
  const description = issuer.description || '';
  const id = issuer.id || '';

  let image = '';
  if (issuer.image) {
    if (typeof issuer.image === 'string') {
      image = issuer.image;
    } else if (typeof issuer.image === 'object' && 'id' in issuer.image) {
      image = issuer.image.id;
    }
  }

  return { id, name, description, image, original: issuer };
};

// Filter issuers based on search
const filteredIssuers = computed(() => {
  if (!searchText.value.trim()) {
    return props.issuers;
  }

  const search = searchText.value.toLowerCase();
  return props.issuers.filter((issuer) => {
    const name = (issuer.name || '').toLowerCase();
    const description = (issuer.description || '').toLowerCase();
    return name.includes(search) || description.includes(search);
  });
});

// Compute total pages
const totalPages = computed(() => {
  return Math.ceil(filteredIssuers.value.length / props.pageSize);
});

// Watch for filteredIssuers changes to clamp current page
watch(
  () => [filteredIssuers.value.length, props.pageSize],
  () => {
    if (!props.showPagination) return;
    const total = totalPages.value;
    if (total < 1) {
      internalCurrentPage.value = 1;
      return;
    }
    if (internalCurrentPage.value > total) {
      internalCurrentPage.value = total;
    }
  }
);

// Get current page of issuers
const paginatedIssuers = computed(() => {
  if (!props.showPagination) {
    return filteredIssuers.value;
  }

  const start = (internalCurrentPage.value - 1) * props.pageSize;
  const end = start + props.pageSize;
  return filteredIssuers.value.slice(start, end);
});

// Normalize issuers for display
const normalizedIssuers = computed(() => {
  return paginatedIssuers.value.map(normalizeIssuer);
});

// Handle issuer click
const handleIssuerClick = (issuer: OB2.Profile | OB3.Profile) => {
  emit('issuer-click', issuer);
};

// Handle page change
const handlePageChange = (page: number) => {
  if (page < 1 || page > totalPages.value) return;
  internalCurrentPage.value = page;
  emit('page-change', page);
};

// Handle density change
const handleDensityChange = (event: Event) => {
  const target = event.target as HTMLSelectElement;
  const value = target.value as 'compact' | 'normal' | 'spacious';
  internalDensity.value = value;
  emit('update:density', value);
};
</script>

<template>
  <div
    class="manus-issuer-list"
    :class="[`density-${internalDensity}`, { 'grid-layout': layout === 'grid' }]"
  >
    <!-- Search and density controls -->
    <div class="manus-issuer-list-controls" role="region" aria-label="Issuer list controls">
      <input
        v-model="searchText"
        class="manus-issuer-list-search"
        type="search"
        placeholder="Search issuers..."
        aria-label="Search issuers by name or description"
      />
      <select
        :value="internalDensity"
        class="manus-issuer-list-density-select"
        aria-label="Display density"
        @change="handleDensityChange"
      >
        <option value="compact">Compact</option>
        <option value="normal">Normal</option>
        <option value="spacious">Spacious</option>
      </select>
    </div>

    <!-- Loading state -->
    <div
      v-if="loading"
      class="manus-issuer-list-loading"
      role="status"
      aria-live="polite"
    >
      <span>Loading issuers...</span>
    </div>

    <!-- Empty state -->
    <div
      v-else-if="normalizedIssuers.length === 0"
      class="manus-issuer-list-empty"
      role="status"
    >
      <slot name="empty">
        <p>No issuers found.</p>
      </slot>
    </div>

    <!-- Issuer list -->
    <ul
      v-else
      class="manus-issuer-list-items"
      :aria-label="ariaLabel"
    >
      <li
        v-for="issuer in normalizedIssuers"
        :key="issuer.id"
        class="manus-issuer-list-item"
      >
        <slot
          name="issuer"
          :issuer="issuer.original"
          :normalized="issuer"
        >
          <IssuerCard
            :issuer="issuer.original"
            :density="internalDensity"
            interactive
            @click="handleIssuerClick(issuer.original)"
          />
        </slot>
      </li>
    </ul>

    <!-- Pagination -->
    <div
      v-if="showPagination && totalPages > 1"
      class="manus-issuer-list-pagination"
      role="navigation"
      aria-label="Pagination"
    >
      <button
        class="manus-pagination-button"
        :disabled="internalCurrentPage === 1"
        aria-label="Previous page"
        @click="handlePageChange(internalCurrentPage - 1)"
      >
        Previous
      </button>

      <span class="manus-pagination-info">
        Page {{ internalCurrentPage }} of {{ totalPages }}
      </span>

      <button
        class="manus-pagination-button"
        :disabled="internalCurrentPage === totalPages"
        aria-label="Next page"
        @click="handlePageChange(internalCurrentPage + 1)"
      >
        Next
      </button>
    </div>
  </div>
</template>

<style>
.manus-issuer-list {
  --issuer-list-gap: 16px;
  --issuer-list-empty-color: #718096;
  --issuer-list-pagination-gap: 8px;
  --issuer-list-button-bg: #e2e8f0;
  --issuer-list-button-color: #4a5568;
  --issuer-list-button-hover-bg: #cbd5e0;
  --issuer-list-button-disabled-bg: #edf2f7;
  --issuer-list-button-disabled-color: #a0aec0;

  display: flex;
  flex-direction: column;
  gap: 24px;
}

.manus-issuer-list.density-compact {
  --issuer-list-gap: 8px;
}

.manus-issuer-list.density-normal {
  --issuer-list-gap: 16px;
}

.manus-issuer-list.density-spacious {
  --issuer-list-gap: 24px;
}

.manus-issuer-list-controls {
  display: flex;
  gap: 12px;
  align-items: center;
  flex-wrap: wrap;
}

.manus-issuer-list-search,
.manus-issuer-list-density-select {
  padding: 8px 12px;
  border: 1px solid #e2e8f0;
  border-radius: 4px;
  font-size: 1rem;
}

.manus-issuer-list-search {
  flex: 1;
  min-width: 200px;
}

.manus-issuer-list-loading,
.manus-issuer-list-empty {
  padding: 24px;
  text-align: center;
  color: var(--issuer-list-empty-color);
}

.manus-issuer-list-items {
  list-style: none;
  padding: 0;
  margin: 0;
  display: flex;
  flex-direction: column;
  gap: var(--issuer-list-gap);
}

.manus-issuer-list.grid-layout .manus-issuer-list-items {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(320px, 1fr));
  gap: var(--issuer-list-gap);
  align-items: stretch;
}

.manus-issuer-list-item {
  display: flex;
}

.manus-issuer-list.grid-layout .manus-issuer-list-item {
  display: flex;
}

/* Make cards stretch to fill grid cell */
.manus-issuer-list.grid-layout .manus-issuer-list-item :deep(.manus-issuer-card) {
  width: 100%;
  max-width: none;
}

.manus-issuer-list-pagination {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: var(--issuer-list-pagination-gap);
  margin-top: 16px;
  flex-wrap: wrap;
}

.manus-pagination-button {
  padding: 8px 16px;
  background-color: var(--issuer-list-button-bg);
  color: var(--issuer-list-button-color);
  border: none;
  border-radius: 4px;
  cursor: pointer;
  font-size: 0.875rem;
  transition: background-color 0.2s ease;
}

.manus-pagination-button:hover:not(:disabled) {
  background-color: var(--issuer-list-button-hover-bg);
}

.manus-pagination-button:disabled {
  background-color: var(--issuer-list-button-disabled-bg);
  color: var(--issuer-list-button-disabled-color);
  cursor: not-allowed;
}

.manus-pagination-button:focus-visible {
  outline: 3px solid #ff9800;
  outline-offset: 2px;
}

.manus-pagination-info {
  font-size: 0.875rem;
  color: var(--issuer-list-button-color);
}

/* Responsive adjustments */
@media (max-width: 639px) {
  .manus-issuer-list.grid-layout .manus-issuer-list-items {
    grid-template-columns: 1fr;
  }

  .manus-issuer-list-controls {
    flex-direction: column;
    align-items: stretch;
  }

  .manus-issuer-list-search {
    width: 100%;
  }
}
</style>
