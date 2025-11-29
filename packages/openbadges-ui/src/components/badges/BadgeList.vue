<script setup lang="ts">
import { computed, ref, watch } from "vue";
import type { OB2, OB3 } from "@/types";
import { BadgeService } from "@services/BadgeService";
import BadgeDisplay from "@components/badges/BadgeDisplay.vue";

interface Props {
  badges: (OB2.Assertion | OB3.VerifiableCredential)[];
  layout?: "grid" | "list";
  interactive?: boolean;
  loading?: boolean;
  pageSize?: number;
  currentPage?: number;
  showPagination?: boolean;
  ariaLabel?: string;
  density?: "compact" | "normal" | "spacious";
}

const props = withDefaults(defineProps<Props>(), {
  layout: "grid",
  interactive: true,
  loading: false,
  pageSize: 9,
  currentPage: 1,
  showPagination: false,
  ariaLabel: "List of badges",
  density: "normal",
});

const emit = defineEmits<{
  (e: "badge-click", badge: OB2.Assertion | OB3.VerifiableCredential): void;
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

// Neurodiversity-focused filter state
const filterText = ref("");
const filterEarned = ref("all"); // 'all' | 'earned' | 'not-earned'
const expandedBadges = ref<Set<string>>(new Set());

const toggleExpanded = (id: string) => {
  const next = new Set(expandedBadges.value);
  if (next.has(id)) {
    next.delete(id);
  } else {
    next.add(id);
  }
  expandedBadges.value = next;
};

// Filtering logic - defined before watchers that use it
const filteredBadges = computed(() => {
  let filtered = props.badges;
  if (filterText.value) {
    filtered = filtered.filter((badge) => {
      // Use type guards to check the badge structure
      const name =
        "badge" in badge &&
        badge.badge &&
        typeof badge.badge === "object" &&
        "name" in badge.badge
          ? String(badge.badge.name)
          : "name" in badge
            ? String(badge.name)
            : "";
      return name.toLowerCase().includes(filterText.value.toLowerCase());
    });
  }
  if (filterEarned.value !== "all") {
    // TODO: Implement actual earned/not-earned filtering logic
    // This requires determining badge ownership which depends on:
    // 1. Having a current user context
    // 2. Matching badge recipient to user identity
    // Currently returns all badges for 'earned', none for 'not-earned'
    filtered = filtered.filter(() => {
      if (filterEarned.value === "earned") {
        return true;
      }
      if (filterEarned.value === "not-earned") {
        return false;
      }
      return true;
    });
  }
  return filtered;
});

// Compute total pages based on filtered badges
const totalPages = computed(() => {
  return Math.ceil(filteredBadges.value.length / props.pageSize);
});

// Watch for filteredBadges or pageSize changes to clamp current page
watch(
  () => [filteredBadges.value.length, props.pageSize],
  () => {
    if (!props.showPagination) {
      return;
    }
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

// Get current page of badges
const paginatedBadges = computed(() => {
  if (!props.showPagination) {
    return filteredBadges.value;
  }

  const start = (internalCurrentPage.value - 1) * props.pageSize;
  const end = start + props.pageSize;
  return filteredBadges.value.slice(start, end);
});

// Normalize badges for display
const normalizedBadges = computed(() => {
  return paginatedBadges.value.map((badge) => ({
    original: badge,
    ...BadgeService.normalizeBadge(badge),
  }));
});

// Handle badge click
const handleBadgeClick = (badge: OB2.Assertion | OB3.VerifiableCredential) => {
  emit("badge-click", badge);
};

// Handle page change
const handlePageChange = (page: number) => {
  if (page < 1 || page > totalPages.value) {
    return;
  }

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
</script>

<template>
  <div
    class="manus-badge-list"
    :class="[
      `density-${internalDensity}`,
      { 'grid-layout': layout === 'grid' },
    ]"
  >
    <!-- Neurodiversity filter and density controls -->
    <div
      class="manus-badge-list-controls"
      role="region"
      aria-label="Badge list controls"
    >
      <input
        v-model="filterText"
        class="manus-badge-list-filter-input"
        type="search"
        :placeholder="'Filter badges by keyword'"
        aria-label="Filter badges by keyword"
      />
      <select
        v-model="filterEarned"
        class="manus-badge-list-filter-select"
        aria-label="Filter by earned status"
      >
        <option value="all">All</option>
        <option value="earned">Earned</option>
        <option value="not-earned">Not Earned</option>
      </select>
      <select
        :value="internalDensity"
        class="manus-badge-list-density-select"
        aria-label="Display density"
        @change="handleDensityChange"
      >
        <option value="compact">Compact</option>
        <option value="normal">Normal</option>
        <option value="spacious">Spacious</option>
      </select>
    </div>

    <div
      v-if="loading"
      class="manus-badge-list-loading"
      role="status"
      aria-live="polite"
    >
      <span>Loading badges...</span>
    </div>

    <div
      v-else-if="normalizedBadges.length === 0"
      class="manus-badge-list-empty"
      role="status"
    >
      <slot name="empty">
        <p>No badges found.</p>
      </slot>
    </div>

    <ul v-else class="manus-badge-list-items" :aria-label="ariaLabel">
      <li
        v-for="badge in normalizedBadges"
        :key="badge.id"
        class="manus-badge-list-item"
        tabindex="0"
        :class="{ 'is-expanded': expandedBadges.has(badge.id) }"
      >
        <div class="badge-summary" tabindex="0">
          <slot name="badge" :badge="badge.original" :normalized="badge">
            <BadgeDisplay
              :badge="badge.original"
              :interactive="interactive"
              @click="handleBadgeClick(badge.original)"
            />
          </slot>
          <button
            class="badge-expand-btn"
            type="button"
            :aria-expanded="expandedBadges.has(badge.id)"
            :aria-controls="`badge-details-${badge.id}`"
            :aria-label="
              expandedBadges.has(badge.id)
                ? 'Collapse details'
                : 'Expand details'
            "
            @click="toggleExpanded(badge.id)"
          >
            {{ expandedBadges.has(badge.id) ? "Show Less" : "Show More" }}
          </button>
        </div>
        <div
          v-if="expandedBadges.has(badge.id)"
          :id="`badge-details-${badge.id}`"
          class="badge-details"
          tabindex="0"
        >
          <pre>{{ badge }}</pre>
        </div>
      </li>
    </ul>

    <div
      v-if="showPagination && totalPages > 1"
      class="manus-badge-list-pagination"
      role="navigation"
      aria-label="Pagination"
    >
      <button
        class="manus-pagination-button"
        :disabled="internalCurrentPage === 1"
        aria-label="Previous page"
        tabindex="0"
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
        tabindex="0"
        @click="handlePageChange(internalCurrentPage + 1)"
      >
        Next
      </button>
    </div>
  </div>
</template>

<style>
.manus-badge-list {
  --badge-list-gap: 16px;
  --badge-list-empty-color: #718096;
  --badge-list-pagination-gap: 8px;
  --badge-list-button-bg: #e2e8f0;
  --badge-list-button-color: #4a5568;
  --badge-list-button-hover-bg: #cbd5e0;
  --badge-list-button-disabled-bg: #edf2f7;
  --badge-list-button-disabled-color: #a0aec0;

  display: flex;
  flex-direction: column;
  gap: 24px;
}

.manus-badge-list.density-compact {
  --badge-list-gap: 4px;
}

.manus-badge-list.density-normal {
  --badge-list-gap: 16px;
}

.manus-badge-list.density-spacious {
  --badge-list-gap: 32px;
}

.manus-badge-list-controls {
  display: flex;
  gap: 12px;
  align-items: center;
  margin-bottom: 12px;
  flex-wrap: wrap;
}

.manus-badge-list-filter-input,
.manus-badge-list-filter-select,
.manus-badge-list-density-select {
  padding: 8px 12px;
  border: 1px solid #e2e8f0;
  border-radius: 4px;
  font-size: 1rem;
}

.manus-badge-list-loading,
.manus-badge-list-empty {
  padding: 24px;
  text-align: center;
  color: var(--badge-list-empty-color);
}

.manus-badge-list-items {
  list-style: none;
  padding: 0;
  margin: 0;
  display: flex;
  flex-direction: column;
  gap: var(--badge-list-gap);
}

.manus-badge-list.grid-layout .manus-badge-list-items {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(260px, 1fr));
  gap: var(--badge-list-gap);
  align-items: stretch;
}

/* Make grid items look like cards and avoid content squashing */
.manus-badge-list.grid-layout .manus-badge-list-item {
  display: flex;
  flex-direction: column;
  background: #ffffff;
  border: 1px solid #e2e8f0;
  border-radius: 8px;
  padding: 12px;
}

.manus-badge-list-pagination {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: var(--badge-list-pagination-gap);
  margin-top: 16px;
  flex-wrap: wrap;
}

.manus-pagination-button {
  padding: 8px 16px;
  background-color: var(--badge-list-button-bg);
  color: var(--badge-list-button-color);
  border: none;
  border-radius: 4px;
  cursor: pointer;
  font-size: 0.875rem;
}

.manus-pagination-button:hover:not(:disabled) {
  background-color: var(--badge-list-button-hover-bg);
}

.manus-pagination-button:disabled {
  background-color: var(--badge-list-button-disabled-bg);
  color: var(--badge-list-button-disabled-color);
  cursor: not-allowed;
}

.manus-pagination-info {
  font-size: 0.875rem;
  color: var(--badge-list-button-color);
}

.badge-summary {
  display: flex;
  align-items: center;
  justify-content: space-between;
  cursor: pointer;
  outline: none;
}

/* In grid layout, stack summary content to keep expand button from squashing */
.manus-badge-list.grid-layout .badge-summary {
  flex-direction: column;
  align-items: stretch;
  gap: 8px;
}

.badge-expand-btn {
  margin-left: 16px;
  padding: 4px 12px;
  border: none;
  border-radius: 4px;
  background: var(--badge-list-button-bg);
  color: var(--badge-list-button-color);
  font-size: 0.9rem;
  cursor: pointer;
  align-self: flex-end;
}

.badge-summary:focus-visible,
.manus-badge-list-item:focus-visible {
  outline: 3px solid #3182ce;
  outline-offset: 2px;
}

.badge-details {
  background: #f7fafc;
  border-radius: 4px;
  margin-top: 8px;
  padding: 12px;
  font-size: 0.95em;
  color: #2d3748;
}

.manus-badge-list-item.is-expanded {
  background: #f0f4f8;
  border-radius: 6px;
}

/* Responsive adjustments */
@media (max-width: 639px) {
  .manus-badge-list.grid-layout .manus-badge-list-items {
    grid-template-columns: 1fr;
  }

  /* On small screens, make summary row-friendly again if needed */
  .manus-badge-list.grid-layout .badge-summary {
    flex-direction: column;
    align-items: stretch;
    gap: 8px;
  }
}

/* Medium screens: slightly smaller min card width to fit more columns */
@media (min-width: 640px) and (max-width: 1023px) {
  .manus-badge-list.grid-layout .manus-badge-list-items {
    grid-template-columns: repeat(auto-fill, minmax(250px, 1fr));
  }
}
</style>
