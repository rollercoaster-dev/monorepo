<script setup lang="ts">
import { ref, computed, watch, onMounted } from "vue";
import type { OB2, OB3, Shared } from "@/types";
import BadgeIssuerForm from "@components/issuing/BadgeIssuerForm.vue";
import BadgeList from "@components/badges/BadgeList.vue";
import { BadgeService } from "@services/BadgeService";

interface Props {
  issuerProfile?: {
    id: string;
    name: string;
    url?: string;
    email?: string;
    image?: string;
  };
  initialBadges?: (OB2.Assertion | OB3.VerifiableCredential)[];
  loading?: boolean;
}

const props = withDefaults(defineProps<Props>(), {
  issuerProfile: undefined,
  initialBadges: () => [],
  loading: false,
});

const emit = defineEmits<{
  (e: "badge-issued", assertion: OB2.Assertion): void;
  (e: "badge-click", badge: OB2.Assertion | OB3.VerifiableCredential): void;
}>();

// State
const activeTab = ref<"issue" | "badges">("issue");
const badges = ref<(OB2.Assertion | OB3.VerifiableCredential)[]>([
  ...props.initialBadges,
]);
const filterText = ref("");
const sortOption = ref<"newest" | "oldest" | "name-asc" | "name-desc">(
  "newest",
);

// Create initial badge class with issuer info if available
const initialBadgeClass = computed<Partial<OB2.BadgeClass>>(() => {
  if (!props.issuerProfile) {
    return {} as Partial<OB2.BadgeClass>;
  }
  return {
    issuer: {
      id: props.issuerProfile.id as Shared.IRI,
      type: "Profile",
      name: props.issuerProfile.name,
      url: props.issuerProfile.url as Shared.IRI | undefined,
      email: props.issuerProfile.email,
      image: props.issuerProfile.image as Shared.IRI | undefined,
    },
  } as Partial<OB2.BadgeClass>;
});

// Filter and sort badges
const filteredBadges = computed(() => {
  let result = [...badges.value];

  // Apply filter
  if (filterText.value) {
    const searchTerm = filterText.value.toLowerCase();
    result = result.filter((badge) => {
      const nb = BadgeService.normalizeBadge(badge);
      return (
        nb.name.toLowerCase().includes(searchTerm) ||
        nb.description.toLowerCase().includes(searchTerm) ||
        nb.issuer.name.toLowerCase().includes(searchTerm)
      );
    });
  }

  // Apply sort
  result.sort((a, b) => {
    if (sortOption.value === "newest" || sortOption.value === "oldest") {
      // Handle OB2 Assertion
      const getDateValue = (
        badge: OB2.Assertion | OB3.VerifiableCredential,
      ): number => {
        if ("issuedOn" in badge && badge.issuedOn) {
          return new Date(badge.issuedOn as string).getTime();
        } else if ("issuanceDate" in badge && badge.issuanceDate) {
          return new Date(badge.issuanceDate as string).getTime();
        }
        return 0;
      };

      const dateA = getDateValue(a);
      const dateB = getDateValue(b);

      return sortOption.value === "newest" ? dateB - dateA : dateA - dateB;
    } else {
      // Sort by normalized badge name
      const nameA = BadgeService.normalizeBadge(a).name;
      const nameB = BadgeService.normalizeBadge(b).name;
      return sortOption.value === "name-asc"
        ? nameA.localeCompare(nameB)
        : nameB.localeCompare(nameA);
    }
  });

  return result;
});

// Watch for changes in initialBadges prop
watch(
  () => props.initialBadges,
  (newBadges) => {
    badges.value = [...newBadges];
  },
  { deep: true },
);

// Methods
const setActiveTab = (tab: "issue" | "badges") => {
  activeTab.value = tab;
};

const handleBadgeIssued = (assertion: OB2.Assertion) => {
  // Add the new badge to the list
  badges.value.unshift(assertion);

  // Switch to the badges tab to show the newly issued badge
  setActiveTab("badges");

  // Emit the event to parent
  emit("badge-issued", assertion);
};

const handleBadgeClick = (badge: OB2.Assertion | OB3.VerifiableCredential) => {
  emit("badge-click", badge);
};

// Initialize
onMounted(() => {
  // If there are badges, start on the badges tab
  if (badges.value.length > 0) {
    setActiveTab("badges");
  }
});
</script>

<template>
  <div class="ob-issuer-dashboard">
    <!-- Dashboard Header -->
    <header class="ob-issuer-dashboard__header">
      <h1 class="ob-issuer-dashboard__title">Badge Issuer Dashboard</h1>

      <div class="ob-issuer-dashboard__tabs" role="tablist">
        <button
          id="issue-tab"
          class="ob-issuer-dashboard__tab-button"
          :class="{ active: activeTab === 'issue' }"
          aria-controls="issue-tab-panel"
          :aria-selected="activeTab === 'issue'"
          role="tab"
          @click="setActiveTab('issue')"
          @keydown.right.prevent="setActiveTab('badges')"
        >
          Issue New Badge
        </button>
        <button
          id="badges-tab"
          class="ob-issuer-dashboard__tab-button"
          :class="{ active: activeTab === 'badges' }"
          aria-controls="badges-tab-panel"
          :aria-selected="activeTab === 'badges'"
          role="tab"
          @click="setActiveTab('badges')"
          @keydown.left.prevent="setActiveTab('issue')"
        >
          My Badges
        </button>
      </div>
    </header>

    <!-- Tab Panels -->
    <div class="ob-issuer-dashboard__content">
      <!-- Issue New Badge Tab -->
      <div
        v-show="activeTab === 'issue'"
        id="issue-tab-panel"
        class="ob-issuer-dashboard__tab-panel"
        role="tabpanel"
        aria-labelledby="issue-tab"
        tabindex="0"
      >
        <BadgeIssuerForm
          :initial-badge-class="initialBadgeClass"
          @badge-issued="handleBadgeIssued"
        />
      </div>

      <!-- My Badges Tab -->
      <div
        v-show="activeTab === 'badges'"
        id="badges-tab-panel"
        class="ob-issuer-dashboard__tab-panel"
        role="tabpanel"
        aria-labelledby="badges-tab"
        tabindex="0"
      >
        <div class="ob-issuer-dashboard__controls">
          <div class="ob-issuer-dashboard__filter">
            <label for="badge-filter" class="ob-issuer-dashboard__filter-label"
              >Filter:</label
            >
            <input
              id="badge-filter"
              v-model="filterText"
              type="text"
              class="ob-issuer-dashboard__filter-input"
              placeholder="Search badges..."
            />
          </div>

          <div class="ob-issuer-dashboard__sort">
            <label for="badge-sort" class="ob-issuer-dashboard__sort-label"
              >Sort by:</label
            >
            <select
              id="badge-sort"
              v-model="sortOption"
              class="ob-issuer-dashboard__sort-select"
            >
              <option value="newest">Newest first</option>
              <option value="oldest">Oldest first</option>
              <option value="name-asc">Name (A-Z)</option>
              <option value="name-desc">Name (Z-A)</option>
            </select>
          </div>
        </div>

        <div
          v-if="loading"
          class="ob-issuer-dashboard__loading"
          role="status"
          aria-live="polite"
        >
          <span>Loading badges...</span>
        </div>

        <div
          v-else-if="filteredBadges.length === 0"
          class="ob-issuer-dashboard__empty"
          role="status"
        >
          <p v-if="filterText">No badges match your search.</p>
          <p v-else>You haven't issued any badges yet.</p>
          <button
            class="ob-issuer-dashboard__button ob-issuer-dashboard__button--primary"
            @click="setActiveTab('issue')"
          >
            Issue Your First Badge
          </button>
        </div>

        <div v-else>
          <BadgeList
            :badges="filteredBadges"
            layout="grid"
            :interactive="true"
            @badge-click="handleBadgeClick"
          />
        </div>
      </div>
    </div>
  </div>
</template>

<style>
.ob-issuer-dashboard {
  --dashboard-border-color: var(--ob-dashboard-border-color, var(--ob-border));
  --dashboard-background: var(--ob-dashboard-background, var(--ob-card));
  --dashboard-text-color: var(--ob-dashboard-text-color, var(--ob-foreground));
  --dashboard-secondary-color: var(
    --ob-dashboard-secondary-color,
    var(--ob-muted-foreground)
  );
  --dashboard-accent-color: var(--ob-dashboard-accent-color, var(--ob-primary));
  --dashboard-tab-active-border: var(
    --ob-dashboard-tab-active-border,
    var(--ob-primary)
  );
  --dashboard-tab-hover-bg: var(
    --ob-dashboard-tab-hover-bg,
    var(--ob-bg-secondary)
  );
  --dashboard-empty-color: var(
    --ob-dashboard-empty-color,
    var(--ob-muted-foreground)
  );

  display: flex;
  flex-direction: column;
  background-color: var(--dashboard-background);
  border: var(--ob-border-width-medium) solid var(--dashboard-border-color);
  border-radius: var(--ob-border-radius-sm);
  box-shadow: var(--ob-shadow-hard-lg);
  overflow: hidden;
  color: var(--dashboard-text-color);
  font-family: var(--ob-font-family);
}

.ob-issuer-dashboard__header {
  padding: var(--ob-space-6);
  border-bottom: var(--ob-border-width) solid var(--dashboard-border-color);
}

.ob-issuer-dashboard__title {
  margin: 0 0 var(--ob-space-4);
  font-family: var(--ob-font-headline);
  font-size: var(--ob-font-size-2xl);
  font-weight: var(--ob-font-weight-bold);
  letter-spacing: var(--ob-font-letterSpacing-tight);
  line-height: var(--ob-font-lineHeight-tight);
}

.ob-issuer-dashboard__tabs {
  display: flex;
  gap: var(--ob-space-1);
  border-bottom: var(--ob-border-width) solid var(--dashboard-border-color);
  margin: 0 calc(var(--ob-space-6) * -1) -1px;
}

.ob-issuer-dashboard__tab-button {
  padding: var(--ob-space-3) var(--ob-space-6);
  background: none;
  border: none;
  border-bottom: var(--ob-border-width-medium) solid transparent;
  font-size: var(--ob-font-size-sm);
  font-weight: var(--ob-font-weight-bold);
  text-transform: uppercase;
  letter-spacing: var(--ob-font-letterSpacing-label);
  color: var(--dashboard-secondary-color);
  cursor: pointer;
  transition: all var(--ob-transition-fast) ease;
}

.ob-issuer-dashboard__tab-button:hover {
  background-color: var(--dashboard-tab-hover-bg);
}

.ob-issuer-dashboard__tab-button.active {
  color: var(--dashboard-accent-color);
  border-bottom-color: var(--dashboard-tab-active-border);
}

.ob-issuer-dashboard__content {
  padding: var(--ob-space-6);
}

.ob-issuer-dashboard__tab-panel {
  outline: none;
}

.ob-issuer-dashboard__tab-panel:focus {
  box-shadow: var(--ob-shadow-focus);
  border-radius: var(--ob-border-radius-sm);
}

.ob-issuer-dashboard__controls {
  display: flex;
  flex-wrap: wrap;
  gap: var(--ob-space-4);
  margin-bottom: var(--ob-space-6);
}

.ob-issuer-dashboard__filter,
.ob-issuer-dashboard__sort {
  display: flex;
  align-items: center;
  gap: var(--ob-space-2);
}

.ob-issuer-dashboard__filter-label,
.ob-issuer-dashboard__sort-label {
  font-weight: var(--ob-font-weight-medium);
  color: var(--dashboard-secondary-color);
}

.ob-issuer-dashboard__filter-input,
.ob-issuer-dashboard__sort-select {
  padding: var(--ob-space-2) var(--ob-space-3);
  border: var(--ob-border-width-medium) solid var(--dashboard-border-color);
  border-radius: var(--ob-border-radius-sm);
  font-size: var(--ob-font-size-sm);
  color: var(--dashboard-text-color);
  background: var(--ob-background);
}

.ob-issuer-dashboard__filter-input {
  width: var(--ob-input-width-md, 12.5rem);
}

.ob-issuer-dashboard__loading,
.ob-issuer-dashboard__empty {
  padding: var(--ob-space-12) var(--ob-space-6);
  text-align: center;
  color: var(--dashboard-empty-color);
}

.ob-issuer-dashboard__empty button {
  margin-top: var(--ob-space-4);
}

.ob-issuer-dashboard__button {
  padding: var(--ob-space-2) var(--ob-space-4);
  border: var(--ob-border-width-medium) solid currentColor;
  border-radius: var(--ob-border-radius-sm);
  font-size: var(--ob-font-size-md);
  font-weight: var(--ob-font-weight-bold);
  text-transform: uppercase;
  letter-spacing: var(--ob-font-letterSpacing-wide);
  box-shadow: var(--ob-shadow-hard-sm);
  cursor: pointer;
  transition: background-color var(--ob-transition-fast) ease;
}

.ob-issuer-dashboard__button--primary {
  background-color: var(--dashboard-accent-color);
  color: var(--ob-text-inverse);
}

.ob-issuer-dashboard__button--primary:hover {
  background-color: var(--ob-primary-dark);
}

/* Responsive adjustments */
@media (max-width: 640px) {
  .ob-issuer-dashboard__header,
  .ob-issuer-dashboard__content {
    padding: var(--ob-space-4);
  }

  .ob-issuer-dashboard__tabs {
    margin: 0 calc(var(--ob-space-4) * -1) -1px;
  }

  .ob-issuer-dashboard__tab-button {
    padding: var(--ob-space-2) var(--ob-space-4);
    font-size: var(--ob-font-size-sm);
  }

  .ob-issuer-dashboard__controls {
    flex-direction: column;
    gap: var(--ob-space-3);
  }

  .ob-issuer-dashboard__filter-input {
    width: 100%;
  }
}
</style>
