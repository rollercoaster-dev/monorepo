<script setup lang="ts">
import { ref, computed, watch, onMounted } from 'vue';
import type { OB2, OB3, Shared } from '@/types';
import BadgeIssuerForm from '@components/issuing/BadgeIssuerForm.vue';
import BadgeList from '@components/badges/BadgeList.vue';
import { BadgeService } from '@services/BadgeService';

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
  (e: 'badge-issued', assertion: OB2.Assertion): void;
  (e: 'badge-click', badge: OB2.Assertion | OB3.VerifiableCredential): void;
}>();

// State
const activeTab = ref<'issue' | 'badges'>('issue');
const badges = ref<(OB2.Assertion | OB3.VerifiableCredential)[]>([...props.initialBadges]);
const filterText = ref('');
const sortOption = ref<'newest' | 'oldest' | 'name-asc' | 'name-desc'>('newest');

// Create initial badge class with issuer info if available
const initialBadgeClass = computed<Partial<OB2.BadgeClass>>(() => {
  if (!props.issuerProfile) {
    return {} as Partial<OB2.BadgeClass>;
  }
  return {
    issuer: {
      id: props.issuerProfile.id as Shared.IRI,
      type: 'Profile',
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
    if (sortOption.value === 'newest' || sortOption.value === 'oldest') {
      // Handle OB2 Assertion
      const getDateValue = (badge: OB2.Assertion | OB3.VerifiableCredential): number => {
        if ('issuedOn' in badge && badge.issuedOn) {
          return new Date(badge.issuedOn as string).getTime();
        } else if ('issuanceDate' in badge && badge.issuanceDate) {
          return new Date(badge.issuanceDate as string).getTime();
        }
        return 0;
      };

      const dateA = getDateValue(a);
      const dateB = getDateValue(b);

      return sortOption.value === 'newest' ? dateB - dateA : dateA - dateB;
    } else {
      // Sort by normalized badge name
      const nameA = BadgeService.normalizeBadge(a).name;
      const nameB = BadgeService.normalizeBadge(b).name;
      return sortOption.value === 'name-asc'
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
  { deep: true }
);

// Methods
const setActiveTab = (tab: 'issue' | 'badges') => {
  activeTab.value = tab;
};

const handleBadgeIssued = (assertion: OB2.Assertion) => {
  // Add the new badge to the list
  badges.value.unshift(assertion);

  // Switch to the badges tab to show the newly issued badge
  setActiveTab('badges');

  // Emit the event to parent
  emit('badge-issued', assertion);
};

const handleFormReset = () => {
  // Any additional reset logic can go here
};

const handleBadgeClick = (badge: OB2.Assertion | OB3.VerifiableCredential) => {
  emit('badge-click', badge);
};

// Initialize
onMounted(() => {
  // If there are badges, start on the badges tab
  if (badges.value.length > 0) {
    setActiveTab('badges');
  }
});
</script>

<template>
  <div class="manus-issuer-dashboard">
    <!-- Dashboard Header -->
    <header class="manus-dashboard-header">
      <h1 class="manus-dashboard-title">Badge Issuer Dashboard</h1>

      <div class="manus-dashboard-tabs">
        <button
          id="issue-tab"
          class="manus-tab-button"
          :class="{ active: activeTab === 'issue' }"
          aria-controls="issue-tab-panel"
          :aria-selected="activeTab === 'issue'"
          role="tab"
          @click="setActiveTab('issue')"
        >
          Issue New Badge
        </button>
        <button
          id="badges-tab"
          class="manus-tab-button"
          :class="{ active: activeTab === 'badges' }"
          aria-controls="badges-tab-panel"
          :aria-selected="activeTab === 'badges'"
          role="tab"
          @click="setActiveTab('badges')"
        >
          My Badges
        </button>
      </div>
    </header>

    <!-- Tab Panels -->
    <div class="manus-dashboard-content">
      <!-- Issue New Badge Tab -->
      <div
        v-show="activeTab === 'issue'"
        id="issue-tab-panel"
        class="manus-tab-panel"
        role="tabpanel"
        aria-labelledby="issue-tab"
        tabindex="0"
      >
        <BadgeIssuerForm
          :initial-badge-class="initialBadgeClass"
          @badge-issued="handleBadgeIssued"
          @reset="handleFormReset"
        />
      </div>

      <!-- My Badges Tab -->
      <div
        v-show="activeTab === 'badges'"
        id="badges-tab-panel"
        class="manus-tab-panel"
        role="tabpanel"
        aria-labelledby="badges-tab"
        tabindex="0"
      >
        <div class="manus-dashboard-controls">
          <div class="manus-dashboard-filter">
            <label for="badge-filter" class="manus-filter-label">Filter:</label>
            <input
              id="badge-filter"
              v-model="filterText"
              type="text"
              class="manus-filter-input"
              placeholder="Search badges..."
            />
          </div>

          <div class="manus-dashboard-sort">
            <label for="badge-sort" class="manus-sort-label">Sort by:</label>
            <select id="badge-sort" v-model="sortOption" class="manus-sort-select">
              <option value="newest">Newest first</option>
              <option value="oldest">Oldest first</option>
              <option value="name-asc">Name (A-Z)</option>
              <option value="name-desc">Name (Z-A)</option>
            </select>
          </div>
        </div>

        <div v-if="loading" class="manus-dashboard-loading" role="status" aria-live="polite">
          <span>Loading badges...</span>
        </div>

        <div v-else-if="filteredBadges.length === 0" class="manus-dashboard-empty" role="status">
          <p v-if="filterText">No badges match your search.</p>
          <p v-else>You haven't issued any badges yet.</p>
          <button class="manus-button manus-button-primary" @click="setActiveTab('issue')">
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
.manus-issuer-dashboard {
  --dashboard-border-color: #e2e8f0;
  --dashboard-background: #ffffff;
  --dashboard-text-color: #1a202c;
  --dashboard-secondary-color: #4a5568;
  --dashboard-accent-color: #3182ce;
  --dashboard-tab-active-border: #3182ce;
  --dashboard-tab-hover-bg: #f7fafc;
  --dashboard-empty-color: #718096;

  display: flex;
  flex-direction: column;
  background-color: var(--dashboard-background);
  border: 1px solid var(--dashboard-border-color);
  border-radius: 8px;
  overflow: hidden;
  color: var(--dashboard-text-color);
}

.manus-dashboard-header {
  padding: 24px;
  border-bottom: 1px solid var(--dashboard-border-color);
}

.manus-dashboard-title {
  margin: 0 0 16px;
  font-size: 1.5rem;
  font-weight: 600;
}

.manus-dashboard-tabs {
  display: flex;
  gap: 2px;
  border-bottom: 1px solid var(--dashboard-border-color);
  margin: 0 -24px -1px;
}

.manus-tab-button {
  padding: 12px 24px;
  background: none;
  border: none;
  border-bottom: 2px solid transparent;
  font-size: 1rem;
  font-weight: 500;
  color: var(--dashboard-secondary-color);
  cursor: pointer;
  transition: all 0.2s ease;
}

.manus-tab-button:hover {
  background-color: var(--dashboard-tab-hover-bg);
}

.manus-tab-button.active {
  color: var(--dashboard-accent-color);
  border-bottom-color: var(--dashboard-tab-active-border);
}

.manus-dashboard-content {
  padding: 24px;
}

.manus-tab-panel {
  outline: none;
}

.manus-tab-panel:focus {
  box-shadow: 0 0 0 2px var(--dashboard-accent-color);
  border-radius: 4px;
}

.manus-dashboard-controls {
  display: flex;
  flex-wrap: wrap;
  gap: 16px;
  margin-bottom: 24px;
}

.manus-dashboard-filter,
.manus-dashboard-sort {
  display: flex;
  align-items: center;
  gap: 8px;
}

.manus-filter-label,
.manus-sort-label {
  font-weight: 500;
  color: var(--dashboard-secondary-color);
}

.manus-filter-input,
.manus-sort-select {
  padding: 8px 12px;
  border: 1px solid var(--dashboard-border-color);
  border-radius: 4px;
  font-size: 0.875rem;
}

.manus-filter-input {
  width: 200px;
}

.manus-dashboard-loading,
.manus-dashboard-empty {
  padding: 48px 24px;
  text-align: center;
  color: var(--dashboard-empty-color);
}

.manus-dashboard-empty button {
  margin-top: 16px;
}

.manus-button {
  padding: 8px 16px;
  border: none;
  border-radius: 4px;
  font-size: 1rem;
  font-weight: 500;
  cursor: pointer;
  transition: background-color 0.2s ease;
}

.manus-button-primary {
  background-color: var(--dashboard-accent-color);
  color: white;
}

.manus-button-primary:hover {
  background-color: #2c5282;
}

/* Responsive adjustments */
@media (max-width: 640px) {
  .manus-dashboard-header,
  .manus-dashboard-content {
    padding: 16px;
  }

  .manus-dashboard-tabs {
    margin: 0 -16px -1px;
  }

  .manus-tab-button {
    padding: 10px 16px;
    font-size: 0.875rem;
  }

  .manus-dashboard-controls {
    flex-direction: column;
    gap: 12px;
  }

  .manus-filter-input {
    width: 100%;
  }
}
</style>
