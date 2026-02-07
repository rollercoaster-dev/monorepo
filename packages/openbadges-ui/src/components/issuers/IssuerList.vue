<script setup lang="ts">
import { computed, ref, watch } from "vue";
import type { OB2, OB3 } from "@/types";
import IssuerCard from "@components/issuers/IssuerCard.vue";
import { getLocalizedString } from "@utils/localization";

interface Props {
  issuers: (OB2.Profile | OB3.Profile)[];
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
  ariaLabel: "List of issuers",
});

const emit = defineEmits<{
  (e: "issuer-click", issuer: OB2.Profile | OB3.Profile): void;
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

// Search filter state
const searchText = ref("");

// Normalize issuer for search/display
const normalizeIssuer = (issuer: OB2.Profile | OB3.Profile) => {
  // Use getLocalizedString to handle OB3 multi-language fields
  const name =
    getLocalizedString(issuer.name as string | Record<string, string>) ||
    "Unknown Issuer";
  const description = getLocalizedString(
    issuer.description as string | Record<string, string>,
  );
  const id = issuer.id || "";

  let image = "";
  if (issuer.image) {
    if (typeof issuer.image === "string") {
      image = issuer.image;
    } else if (typeof issuer.image === "object" && "id" in issuer.image) {
      image = issuer.image.id ?? "";
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
    // Use getLocalizedString to handle OB3 multi-language fields in search
    const name = getLocalizedString(
      issuer.name as string | Record<string, string>,
    ).toLowerCase();
    const description = getLocalizedString(
      issuer.description as string | Record<string, string>,
    ).toLowerCase();
    return name.includes(search) || description.includes(search);
  });
});

// Guard against invalid pageSize values
const effectivePageSize = computed(() => Math.max(1, props.pageSize));

// Compute total pages
const totalPages = computed(() => {
  return Math.ceil(filteredIssuers.value.length / effectivePageSize.value);
});

// Watch for filteredIssuers changes to clamp current page
watch(
  () => [filteredIssuers.value.length, effectivePageSize.value],
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

// Get current page of issuers
const paginatedIssuers = computed(() => {
  if (!props.showPagination) {
    return filteredIssuers.value;
  }

  const start = (internalCurrentPage.value - 1) * effectivePageSize.value;
  const end = start + effectivePageSize.value;
  return filteredIssuers.value.slice(start, end);
});

// Normalize issuers for display
const normalizedIssuers = computed(() => {
  return paginatedIssuers.value.map(normalizeIssuer);
});

// Handle issuer click
const handleIssuerClick = (issuer: OB2.Profile | OB3.Profile) => {
  emit("issuer-click", issuer);
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
</script>

<template>
  <div
    class="ob-issuer-list"
    :class="[
      `ob-issuer-list--density-${internalDensity}`,
      { 'ob-issuer-list--grid-layout': layout === 'grid' },
    ]"
  >
    <!-- Search and density controls -->
    <div
      class="ob-issuer-list__controls"
      role="region"
      aria-label="Issuer list controls"
    >
      <input
        v-model="searchText"
        class="ob-issuer-list__search"
        type="search"
        placeholder="Search issuers..."
        aria-label="Search issuers by name or description"
      />
      <select
        :value="internalDensity"
        class="ob-issuer-list__density-select"
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
      class="ob-issuer-list__loading"
      role="status"
      aria-live="polite"
    >
      <span>Loading issuers...</span>
    </div>

    <!-- Empty state -->
    <div
      v-else-if="normalizedIssuers.length === 0"
      class="ob-issuer-list__empty"
      role="status"
    >
      <slot name="empty">
        <p>No issuers found.</p>
      </slot>
    </div>

    <!-- Issuer list -->
    <ul v-else class="ob-issuer-list__items" :aria-label="ariaLabel">
      <li
        v-for="issuer in normalizedIssuers"
        :key="issuer.id"
        class="ob-issuer-list__item"
      >
        <slot name="issuer" :issuer="issuer.original" :normalized="issuer">
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
      class="ob-issuer-list__pagination"
      role="navigation"
      aria-label="Pagination"
    >
      <button
        class="ob-issuer-list__pagination-button"
        :disabled="internalCurrentPage === 1"
        aria-label="Previous page"
        @click="handlePageChange(internalCurrentPage - 1)"
      >
        Previous
      </button>

      <span class="ob-issuer-list__pagination-info">
        Page {{ internalCurrentPage }} of {{ totalPages }}
      </span>

      <button
        class="ob-issuer-list__pagination-button"
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
.ob-issuer-list {
  --issuer-list-gap: var(--ob-space-4);
  --issuer-list-empty-color: var(--ob-muted-foreground);
  --issuer-list-pagination-gap: var(--ob-space-2);
  --issuer-list-button-bg: var(--ob-muted);
  --issuer-list-button-color: var(--ob-foreground);
  --issuer-list-button-hover-bg: var(--ob-highlight);
  --issuer-list-button-disabled-bg: var(--ob-muted);
  --issuer-list-button-disabled-color: var(--ob-text-disabled);

  display: flex;
  flex-direction: column;
  gap: var(--ob-space-6);
  font-family: var(--ob-font-family);
  color: var(--ob-foreground);
}

.ob-issuer-list.ob-issuer-list--density-compact {
  --issuer-list-gap: var(--ob-space-2);
}

.ob-issuer-list.ob-issuer-list--density-normal {
  --issuer-list-gap: var(--ob-space-4);
}

.ob-issuer-list.ob-issuer-list--density-spacious {
  --issuer-list-gap: var(--ob-space-6);
}

.ob-issuer-list__controls {
  display: flex;
  gap: var(--ob-space-3);
  align-items: center;
  flex-wrap: wrap;
  background: var(--ob-card);
  border: var(--ob-border-width-medium) solid var(--ob-border);
  border-radius: var(--ob-border-radius-sm);
  padding: var(--ob-space-3);
  box-shadow: var(--ob-shadow-hard-sm);
}

.ob-issuer-list__search,
.ob-issuer-list__density-select {
  padding: var(--ob-space-2) var(--ob-space-3);
  border: var(--ob-border-width-medium) solid var(--ob-border);
  border-radius: var(--ob-border-radius-sm);
  font-size: var(--ob-font-size-md);
  color: var(--ob-foreground);
  background: var(--ob-background);
}

.ob-issuer-list__search {
  flex: 1;
  min-width: 200px;
}

.ob-issuer-list__loading,
.ob-issuer-list__empty {
  padding: var(--ob-space-6);
  text-align: center;
  color: var(--issuer-list-empty-color);
}

.ob-issuer-list__items {
  list-style: none;
  padding: 0;
  margin: 0;
  display: flex;
  flex-direction: column;
  gap: var(--issuer-list-gap);
}

.ob-issuer-list.ob-issuer-list--grid-layout .ob-issuer-list__items {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(320px, 1fr));
  gap: var(--issuer-list-gap);
  align-items: stretch;
}

.ob-issuer-list__item {
  display: flex;
}

/* Make cards stretch to fill grid cell */
.ob-issuer-list.ob-issuer-list--grid-layout
  .ob-issuer-list__item
  :deep(.ob-issuer-card) {
  width: 100%;
  max-width: none;
}

.ob-issuer-list__pagination {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: var(--issuer-list-pagination-gap);
  margin-top: var(--ob-space-4);
  flex-wrap: wrap;
}

.ob-issuer-list__pagination-button {
  padding: var(--ob-space-2) var(--ob-space-4);
  background-color: var(--issuer-list-button-bg);
  color: var(--issuer-list-button-color);
  border: var(--ob-border-width-medium) solid var(--ob-border);
  border-radius: var(--ob-border-radius-sm);
  cursor: pointer;
  font-size: var(--ob-font-size-sm);
  font-weight: var(--ob-font-weight-bold);
  text-transform: uppercase;
  letter-spacing: var(--ob-font-letterSpacing-wide);
  box-shadow: var(--ob-shadow-hard-sm);
  transition: background-color var(--ob-transition-fast) ease;
}

.ob-issuer-list__pagination-button:hover:not(:disabled) {
  background-color: var(--issuer-list-button-hover-bg);
}

.ob-issuer-list__pagination-button:disabled {
  background-color: var(--issuer-list-button-disabled-bg);
  color: var(--issuer-list-button-disabled-color);
  cursor: not-allowed;
}

.ob-issuer-list__pagination-button:focus-visible {
  outline: var(--ob-borderWidth-thick) solid var(--ob-border-color-focus);
  outline-offset: var(--ob-space-1);
}

.ob-issuer-list__pagination-info {
  font-size: var(--ob-font-size-sm);
  color: var(--issuer-list-button-color);
}

/* Responsive adjustments */
@media (max-width: 639px) {
  .ob-issuer-list.ob-issuer-list--grid-layout .ob-issuer-list__items {
    grid-template-columns: 1fr;
  }

  .ob-issuer-list__controls {
    flex-direction: column;
    align-items: stretch;
  }

  .ob-issuer-list__search {
    width: 100%;
  }
}
</style>
