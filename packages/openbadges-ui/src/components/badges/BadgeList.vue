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
    class="ob-badge-list"
    :class="[
      `ob-badge-list--density-${internalDensity}`,
      { 'ob-badge-list--grid-layout': layout === 'grid' },
    ]"
  >
    <!-- Neurodiversity filter and density controls -->
    <div
      class="ob-badge-list__controls"
      role="region"
      aria-label="Badge list controls"
    >
      <input
        v-model="filterText"
        class="ob-badge-list__filter-input"
        type="search"
        :placeholder="'Filter badges by keyword'"
        aria-label="Filter badges by keyword"
      />
      <select
        v-model="filterEarned"
        class="ob-badge-list__filter-select"
        aria-label="Filter by earned status"
      >
        <option value="all">All</option>
        <option value="earned">Earned</option>
        <option value="not-earned">Not Earned</option>
      </select>
      <select
        :value="internalDensity"
        class="ob-badge-list__density-select"
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
      class="ob-badge-list__loading"
      role="status"
      aria-live="polite"
    >
      <span>Loading badges...</span>
    </div>

    <div
      v-else-if="normalizedBadges.length === 0"
      class="ob-badge-list__empty"
      role="status"
    >
      <slot name="empty">
        <p>No badges found.</p>
      </slot>
    </div>

    <ul v-else class="ob-badge-list__items" :aria-label="ariaLabel">
      <li
        v-for="badge in normalizedBadges"
        :key="badge.id"
        class="ob-badge-list__item"
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
      class="ob-badge-list__pagination"
      role="navigation"
      aria-label="Pagination"
    >
      <button
        class="ob-badge-list__pagination-button"
        :disabled="internalCurrentPage === 1"
        aria-label="Previous page"
        tabindex="0"
        @click="handlePageChange(internalCurrentPage - 1)"
      >
        Previous
      </button>

      <span class="ob-badge-list__pagination-info">
        Page {{ internalCurrentPage }} of {{ totalPages }}
      </span>

      <button
        class="ob-badge-list__pagination-button"
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
.ob-badge-list {
  --badge-list-gap: var(--ob-badge-list-gap, var(--ob-space-4));
  --badge-list-empty-color: var(
    --ob-badge-list__empty-color,
    var(--ob-text-secondary)
  );
  --badge-list-pagination-gap: var(
    --ob-badge-list__pagination-gap,
    var(--ob-space-2)
  );
  --badge-list-button-bg: var(--ob-badge-list-button-bg, var(--ob-gray-200));
  --badge-list-button-color: var(
    --ob-badge-list-button-color,
    var(--ob-text-secondary)
  );
  --badge-list-button-hover-bg: var(
    --ob-badge-list-button-hover-bg,
    var(--ob-gray-300)
  );
  --badge-list-button-disabled-bg: var(
    --ob-badge-list-button-disabled-bg,
    var(--ob-gray-100)
  );
  --badge-list-button-disabled-color: var(
    --ob-badge-list-button-disabled-color,
    var(--ob-text-disabled)
  );

  display: flex;
  flex-direction: column;
  gap: var(--badge-list-gap, var(--ob-space-6));
  font-family: var(--ob-font-family);
  color: var(--ob-text-primary);
}

.ob-badge-list.ob-badge-list--density-compact {
  --badge-list-gap: var(--ob-space-1);
}

.ob-badge-list.ob-badge-list--density-normal {
  --badge-list-gap: var(--ob-space-4);
}

.ob-badge-list.ob-badge-list--density-spacious {
  --badge-list-gap: var(--ob-space-8);
}

.ob-badge-list__controls {
  display: flex;
  gap: var(--ob-space-3);
  align-items: center;
  margin-bottom: var(--ob-space-3);
  flex-wrap: wrap;
}

.ob-badge-list__filter-input,
.ob-badge-list__filter-select,
.ob-badge-list__density-select {
  padding: var(--ob-space-2) var(--ob-space-3);
  border: 1px solid var(--ob-border-color);
  border-radius: var(--ob-border-radius-sm);
  font-size: var(--ob-font-size-md);
  color: var(--ob-text-primary);
  background: var(--ob-bg-primary);
}

.ob-badge-list__loading,
.ob-badge-list__empty {
  padding: var(--ob-space-6);
  text-align: center;
  color: var(--badge-list-empty-color);
}

.ob-badge-list__items {
  list-style: none;
  padding: 0;
  margin: 0;
  display: flex;
  flex-direction: column;
  gap: var(--badge-list-gap);
}

.ob-badge-list.ob-badge-list--grid-layout .ob-badge-list__items {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(260px, 1fr));
  gap: var(--badge-list-gap);
  align-items: stretch;
}

/* Make grid items look like cards and avoid content squashing */
.ob-badge-list.ob-badge-list--grid-layout .ob-badge-list__item {
  display: flex;
  flex-direction: column;
  background: var(--ob-bg-primary);
  border: 1px solid var(--ob-border-color);
  border-radius: var(--ob-border-radius-lg);
  padding: var(--ob-space-3);
}

.ob-badge-list__pagination {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: var(--badge-list-pagination-gap);
  margin-top: var(--ob-space-4);
  flex-wrap: wrap;
}

.ob-badge-list__pagination-button {
  padding: var(--ob-space-2) var(--ob-space-4);
  background-color: var(--badge-list-button-bg);
  color: var(--badge-list-button-color);
  border: none;
  border-radius: var(--ob-border-radius-sm);
  cursor: pointer;
  font-size: var(--ob-font-size-sm);
  font-weight: var(--ob-font-weight-medium);
  transition: background-color var(--ob-transition-fast);
}

.ob-badge-list__pagination-button:hover:not(:disabled) {
  background-color: var(--badge-list-button-hover-bg);
}

.ob-badge-list__pagination-button:disabled {
  background-color: var(--badge-list-button-disabled-bg);
  color: var(--badge-list-button-disabled-color);
  cursor: not-allowed;
}

.ob-badge-list__pagination-info {
  font-size: var(--ob-font-size-sm);
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
.ob-badge-list.ob-badge-list--grid-layout .badge-summary {
  flex-direction: column;
  align-items: stretch;
  gap: var(--ob-space-2);
}

.badge-expand-btn {
  margin-left: var(--ob-space-4);
  padding: var(--ob-space-1) var(--ob-space-3);
  border: none;
  border-radius: var(--ob-border-radius-sm);
  background: var(--badge-list-button-bg);
  color: var(--badge-list-button-color);
  font-size: var(--ob-font-size-sm);
  cursor: pointer;
  align-self: flex-end;
}

.badge-summary:focus-visible,
.ob-badge-list__item:focus-visible {
  outline: 3px solid var(--ob-border-color-focus);
  outline-offset: var(--ob-space-1);
}

.badge-details {
  background: var(--ob-bg-secondary);
  border-radius: var(--ob-border-radius-sm);
  margin-top: var(--ob-space-2);
  padding: var(--ob-space-3);
  font-size: var(--ob-font-size-sm);
  color: var(--ob-text-primary);
}

.ob-badge-list__item.is-expanded {
  background: var(--ob-bg-secondary);
  border-radius: var(--ob-border-radius-md);
}

/* Responsive adjustments */
@media (max-width: 639px) {
  .ob-badge-list.ob-badge-list--grid-layout .ob-badge-list__items {
    grid-template-columns: 1fr;
  }

  /* On small screens, make summary row-friendly again if needed */
  .ob-badge-list.ob-badge-list--grid-layout .badge-summary {
    flex-direction: column;
    align-items: stretch;
    gap: var(--ob-space-2);
  }
}

/* Medium screens: slightly smaller min card width to fit more columns */
@media (min-width: 640px) and (max-width: 1023px) {
  .ob-badge-list.ob-badge-list--grid-layout .ob-badge-list__items {
    grid-template-columns: repeat(auto-fill, minmax(250px, 1fr));
  }
}
</style>
