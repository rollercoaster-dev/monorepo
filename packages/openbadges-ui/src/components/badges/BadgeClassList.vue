<script setup lang="ts">
import { computed, ref, watch } from "vue";
import type { OB2, OB3 } from "@/types";
import BadgeClassCard from "@components/badges/BadgeClassCard.vue";

interface Props {
  badgeClasses: (OB2.BadgeClass | OB3.Achievement)[];
  layout?: "grid" | "list";
  loading?: boolean;
  pageSize?: number;
  currentPage?: number;
  showPagination?: boolean;
  density?: "compact" | "normal" | "spacious";
  ariaLabel?: string;
}

const props = withDefaults(defineProps<Props>(), {
  layout: "grid",
  loading: false,
  pageSize: 9,
  currentPage: 1,
  showPagination: false,
  density: "normal",
  ariaLabel: "List of badge classes",
});

const emit = defineEmits<{
  (e: "badge-class-click", badgeClass: OB2.BadgeClass | OB3.Achievement): void;
  (e: "page-change", page: number): void;
  (e: "update:density", density: "compact" | "normal" | "spacious"): void;
}>();

// Internal state for pagination
const internalCurrentPage = ref(props.currentPage);

// Internal state for density
const internalDensity = ref<"compact" | "normal" | "spacious">(props.density);

// Watch for external currentPage changes
watch(
  () => props.currentPage,
  (newPage) => {
    internalCurrentPage.value = newPage;
  },
);

// Watch for external density changes
watch(
  () => props.density,
  (newValue) => {
    internalDensity.value = newValue;
  },
);

// Search and filter state
const searchText = ref("");
const issuerFilter = ref("");
const tagFilter = ref("");

// Helper to get string from MultiLanguageString
const getLocalizedString = (
  value: string | { [key: string]: string } | undefined,
): string => {
  if (!value) return "";
  if (typeof value === "string") return value;
  return value["en"] || Object.values(value)[0] || "";
};

// Normalize badge class for search/filtering
const normalizeBadgeClass = (badge: OB2.BadgeClass | OB3.Achievement) => {
  const name = getLocalizedString(badge.name) || "Unnamed Badge";
  const description = getLocalizedString(badge.description) || "";
  const id = badge.id || "";

  // Get issuer name
  let issuerName = "";
  const issuerField =
    "issuer" in badge
      ? badge.issuer
      : "creator" in badge
        ? badge.creator
        : null;
  if (issuerField) {
    if (typeof issuerField === "string") {
      issuerName = issuerField;
    } else if (typeof issuerField === "object" && "name" in issuerField) {
      issuerName = getLocalizedString(issuerField.name as string);
    }
  }

  // Get tags
  const tags: string[] = [];
  if ("tags" in badge && Array.isArray(badge.tags)) {
    tags.push(...badge.tags);
  }

  return { id, name, description, issuerName, tags, original: badge };
};

// Get unique issuers for filter dropdown
const uniqueIssuers = computed(() => {
  const issuers = new Set<string>();
  props.badgeClasses.forEach((badge) => {
    const normalized = normalizeBadgeClass(badge);
    if (normalized.issuerName) {
      issuers.add(normalized.issuerName);
    }
  });
  return Array.from(issuers).sort();
});

// Get unique tags for filter dropdown
const uniqueTags = computed(() => {
  const tags = new Set<string>();
  props.badgeClasses.forEach((badge) => {
    const normalized = normalizeBadgeClass(badge);
    normalized.tags.forEach((tag) => tags.add(tag));
  });
  return Array.from(tags).sort();
});

// Filter badge classes
const filteredBadgeClasses = computed(() => {
  let filtered = props.badgeClasses;

  // Search filter
  if (searchText.value.trim()) {
    const search = searchText.value.toLowerCase();
    filtered = filtered.filter((badge) => {
      const normalized = normalizeBadgeClass(badge);
      return (
        normalized.name.toLowerCase().includes(search) ||
        normalized.description.toLowerCase().includes(search)
      );
    });
  }

  // Issuer filter
  if (issuerFilter.value) {
    filtered = filtered.filter((badge) => {
      const normalized = normalizeBadgeClass(badge);
      return normalized.issuerName === issuerFilter.value;
    });
  }

  // Tag filter
  if (tagFilter.value) {
    filtered = filtered.filter((badge) => {
      const normalized = normalizeBadgeClass(badge);
      return normalized.tags.includes(tagFilter.value);
    });
  }

  return filtered;
});

// Compute total pages
const totalPages = computed(() => {
  return Math.ceil(filteredBadgeClasses.value.length / props.pageSize);
});

// Watch for filteredBadgeClasses changes to clamp current page
watch(
  () => [filteredBadgeClasses.value.length, props.pageSize],
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
  },
);

// Get current page of badge classes
const paginatedBadgeClasses = computed(() => {
  if (!props.showPagination) {
    return filteredBadgeClasses.value;
  }

  const start = (internalCurrentPage.value - 1) * props.pageSize;
  const end = start + props.pageSize;
  return filteredBadgeClasses.value.slice(start, end);
});

// Normalize badge classes for display
const normalizedBadgeClasses = computed(() => {
  return paginatedBadgeClasses.value.map(normalizeBadgeClass);
});

// Handle badge class click
const handleBadgeClassClick = (
  badgeClass: OB2.BadgeClass | OB3.Achievement,
) => {
  emit("badge-class-click", badgeClass);
};

// Handle page change
const handlePageChange = (page: number) => {
  if (page < 1 || page > totalPages.value) return;
  internalCurrentPage.value = page;
  emit("page-change", page);
};

// Handle density change
const handleDensityChange = (event: Event) => {
  const target = event.target as HTMLSelectElement;
  const value = target.value as "compact" | "normal" | "spacious";
  internalDensity.value = value;
  emit("update:density", value);
};

// Clear all filters
const clearFilters = () => {
  searchText.value = "";
  issuerFilter.value = "";
  tagFilter.value = "";
};

const hasActiveFilters = computed(() => {
  return searchText.value || issuerFilter.value || tagFilter.value;
});
</script>

<template>
  <div
    class="manus-badge-class-list"
    :class="[
      `density-${internalDensity}`,
      { 'grid-layout': layout === 'grid' },
    ]"
  >
    <!-- Search and filter controls -->
    <div
      class="manus-badge-class-list-controls"
      role="region"
      aria-label="Badge list controls"
    >
      <input
        v-model="searchText"
        class="manus-badge-class-list-search"
        type="search"
        placeholder="Search badges..."
        aria-label="Search badges by name or description"
      />
      <select
        v-if="uniqueIssuers.length > 1"
        v-model="issuerFilter"
        class="manus-badge-class-list-filter"
        aria-label="Filter by issuer"
      >
        <option value="">All Issuers</option>
        <option v-for="issuer in uniqueIssuers" :key="issuer" :value="issuer">
          {{ issuer }}
        </option>
      </select>
      <select
        v-if="uniqueTags.length > 0"
        v-model="tagFilter"
        class="manus-badge-class-list-filter"
        aria-label="Filter by tag"
      >
        <option value="">All Tags</option>
        <option v-for="tag in uniqueTags" :key="tag" :value="tag">
          {{ tag }}
        </option>
      </select>
      <select
        :value="internalDensity"
        class="manus-badge-class-list-density-select"
        aria-label="Display density"
        @change="handleDensityChange"
      >
        <option value="compact">Compact</option>
        <option value="normal">Normal</option>
        <option value="spacious">Spacious</option>
      </select>
      <button
        v-if="hasActiveFilters"
        class="manus-badge-class-list-clear-btn"
        type="button"
        @click="clearFilters"
      >
        Clear Filters
      </button>
    </div>

    <!-- Loading state -->
    <div
      v-if="loading"
      class="manus-badge-class-list-loading"
      role="status"
      aria-live="polite"
    >
      <span>Loading badges...</span>
    </div>

    <!-- Empty state -->
    <div
      v-else-if="normalizedBadgeClasses.length === 0"
      class="manus-badge-class-list-empty"
      role="status"
    >
      <slot name="empty">
        <p>No badges found.</p>
      </slot>
    </div>

    <!-- Badge class list -->
    <ul v-else class="manus-badge-class-list-items" :aria-label="ariaLabel">
      <li
        v-for="badge in normalizedBadgeClasses"
        :key="badge.id"
        class="manus-badge-class-list-item"
      >
        <slot
          name="badge-class"
          :badge-class="badge.original"
          :normalized="badge"
        >
          <BadgeClassCard
            :badge-class="badge.original"
            :density="internalDensity"
            interactive
            @click="handleBadgeClassClick(badge.original)"
          />
        </slot>
      </li>
    </ul>

    <!-- Pagination -->
    <div
      v-if="showPagination && totalPages > 1"
      class="manus-badge-class-list-pagination"
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
.manus-badge-class-list {
  --badge-class-list-gap: var(--ob-space-4, 16px);
  --badge-class-list-empty-color: var(--ob-text-secondary, #718096);
  --badge-class-list-pagination-gap: var(--ob-space-2, 8px);
  --badge-class-list-button-bg: var(--ob-gray-200, #e2e8f0);
  --badge-class-list-button-color: var(--ob-text-secondary, #4a5568);
  --badge-class-list-button-hover-bg: var(--ob-gray-300, #cbd5e0);
  --badge-class-list-button-disabled-bg: var(--ob-gray-100, #edf2f7);
  --badge-class-list-button-disabled-color: var(--ob-text-disabled, #a0aec0);

  display: flex;
  flex-direction: column;
  gap: var(--ob-space-6, 24px);
  font-family: var(--ob-font-family, inherit);
  color: var(--ob-text-primary, inherit);
}

.manus-badge-class-list.density-compact {
  --badge-class-list-gap: var(--ob-space-2, 8px);
}

.manus-badge-class-list.density-normal {
  --badge-class-list-gap: var(--ob-space-4, 16px);
}

.manus-badge-class-list.density-spacious {
  --badge-class-list-gap: var(--ob-space-6, 24px);
}

.manus-badge-class-list-controls {
  display: flex;
  gap: var(--ob-space-3, 12px);
  align-items: center;
  flex-wrap: wrap;
}

.manus-badge-class-list-search,
.manus-badge-class-list-filter,
.manus-badge-class-list-density-select {
  padding: var(--ob-space-2, 8px) var(--ob-space-3, 12px);
  border: 1px solid var(--ob-border-color, #e2e8f0);
  border-radius: var(--ob-border-radius-sm, 4px);
  font-size: var(--ob-font-size-md, 1rem);
  color: var(--ob-text-primary, inherit);
  background: var(--ob-bg-primary, #ffffff);
}

.manus-badge-class-list-search {
  flex: 1;
  min-width: 180px;
}

.manus-badge-class-list-clear-btn {
  padding: var(--ob-space-2, 8px) var(--ob-space-3, 12px);
  background-color: transparent;
  border: 1px solid var(--ob-border-color, #e2e8f0);
  border-radius: var(--ob-border-radius-sm, 4px);
  font-size: var(--ob-font-size-sm, 0.875rem);
  color: var(--ob-text-secondary, #4a5568);
  cursor: pointer;
  transition: background-color var(--ob-transition-fast, 0.2s) ease;
}

.manus-badge-class-list-clear-btn:hover {
  background-color: var(--ob-bg-secondary, #f7fafc);
}

.manus-badge-class-list-loading,
.manus-badge-class-list-empty {
  padding: var(--ob-space-6, 24px);
  text-align: center;
  color: var(--badge-class-list-empty-color);
}

.manus-badge-class-list-items {
  list-style: none;
  padding: 0;
  margin: 0;
  display: flex;
  flex-direction: column;
  gap: var(--badge-class-list-gap);
}

.manus-badge-class-list.grid-layout .manus-badge-class-list-items {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(280px, 1fr));
  gap: var(--badge-class-list-gap);
  align-items: stretch;
}

.manus-badge-class-list-item {
  display: flex;
}

/* Make cards stretch to fill grid cell */
.manus-badge-class-list.grid-layout
  .manus-badge-class-list-item
  :deep(.manus-badge-class-card) {
  width: 100%;
  max-width: none;
}

.manus-badge-class-list-pagination {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: var(--badge-class-list-pagination-gap);
  margin-top: var(--ob-space-4, 16px);
  flex-wrap: wrap;
}

.manus-pagination-button {
  padding: var(--ob-space-2, 8px) var(--ob-space-4, 16px);
  background-color: var(--badge-class-list-button-bg);
  color: var(--badge-class-list-button-color);
  border: none;
  border-radius: var(--ob-border-radius-sm, 4px);
  cursor: pointer;
  font-size: var(--ob-font-size-sm, 0.875rem);
  font-weight: var(--ob-font-weight-medium, 500);
  transition: background-color var(--ob-transition-fast, 0.2s) ease;
}

.manus-pagination-button:hover:not(:disabled) {
  background-color: var(--badge-class-list-button-hover-bg);
}

.manus-pagination-button:disabled {
  background-color: var(--badge-class-list-button-disabled-bg);
  color: var(--badge-class-list-button-disabled-color);
  cursor: not-allowed;
}

.manus-pagination-button:focus-visible {
  outline: 3px solid var(--ob-border-color-focus, #ff9800);
  outline-offset: var(--ob-space-1, 2px);
}

.manus-pagination-info {
  font-size: var(--ob-font-size-sm, 0.875rem);
  color: var(--badge-class-list-button-color);
}

/* Responsive adjustments */
@media (max-width: 639px) {
  .manus-badge-class-list.grid-layout .manus-badge-class-list-items {
    grid-template-columns: 1fr;
  }

  .manus-badge-class-list-controls {
    flex-direction: column;
    align-items: stretch;
  }

  .manus-badge-class-list-search {
    width: 100%;
  }
}
</style>
