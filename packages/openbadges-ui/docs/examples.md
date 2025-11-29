# Usage Examples

This document provides practical examples of how to use the Open Badges Component Library in various scenarios.

## Basic Badge Display

This example shows how to display a single badge:

```vue
<template>
  <div class="badge-example">
    <h2>Badge Display Example</h2>
    <BadgeDisplay
      :badge="exampleBadge"
      :interactive="true"
      @click="showBadgeDetails"
    />
  </div>
</template>

<script setup>
import { BadgeDisplay } from "openbadges-ui";
import { ref } from "vue";

// Example badge in Open Badges 2.0 format
const exampleBadge = ref({
  "@context": "https://w3id.org/openbadges/v2",
  id: "https://example.org/assertions/123",
  type: "Assertion",
  recipient: {
    identity: "recipient@example.org",
    type: "email",
    hashed: false,
  },
  badge: {
    id: "https://example.org/badges/1",
    type: "BadgeClass",
    name: "AI Ethics Fundamentals",
    description:
      "Awarded for demonstrating understanding of core AI ethics principles and their application.",
    image:
      "https://ui-avatars.com/api/?name=AI+Ethics&background=2A9D8F&color=fff",
    issuer: {
      id: "https://example.org/issuer",
      type: "Profile",
      name: "Academy",
    },
  },
  issuedOn: "2025-01-15T12:00:00Z",
  verification: {
    type: "hosted",
  },
});

const showBadgeDetails = (badge) => {
  console.log("Badge clicked:", badge);
  alert(`Badge details: ${badge.badge.name}`);
};
</script>

<style>
.badge-example {
  max-width: 600px;
  margin: 0 auto;
  padding: 20px;
}
</style>
```

## Badge Collection with Filtering

This example shows how to display a collection of badges with filtering and sorting:

```vue
<template>
  <div class="badges-collection">
    <h2>My Badges</h2>

    <div class="filter-controls">
      <input
        v-model="filterText"
        placeholder="Search badges..."
        class="filter-input"
      />

      <div class="sort-controls">
        <label for="sort-select">Sort by:</label>
        <select id="sort-select" v-model="sortOption" class="sort-select">
          <option value="newest">Newest first</option>
          <option value="oldest">Oldest first</option>
          <option value="name-asc">Name (A-Z)</option>
          <option value="name-desc">Name (Z-A)</option>
        </select>
      </div>
    </div>

    <BadgeList
      :badges="badges"
      layout="grid"
      :interactive="true"
      :show-pagination="true"
      :page-size="6"
      @badge-click="handleBadgeClick"
      @page-change="handlePageChange"
    >
      <template #empty>
        <div class="empty-state">
          <p>No badges found matching your criteria.</p>
          <button @click="clearFilters" class="clear-button">
            Clear filters
          </button>
        </div>
      </template>
    </BadgeList>
  </div>
</template>

<script setup>
import { BadgeList } from "openbadges-ui";
import { ref, watch } from "vue";

// In a real app, you would fetch these from an API
const allBadges = [
  // Example badges would go here (same format as in the previous example)
  // ...
];

const badges = ref(allBadges);
const filterText = ref("");
const sortOption = ref("newest");
const currentPage = ref(1);

// Filter and sort badges when criteria change
watch([filterText, sortOption], () => {
  let filtered = [...allBadges];

  // Apply filter
  if (filterText.value) {
    const search = filterText.value.toLowerCase();
    filtered = filtered.filter((badge) => {
      const badgeClass = badge.badge;
      return (
        badgeClass.name.toLowerCase().includes(search) ||
        badgeClass.description.toLowerCase().includes(search)
      );
    });
  }

  // Apply sort
  filtered.sort((a, b) => {
    if (sortOption.value === "newest") {
      return new Date(b.issuedOn) - new Date(a.issuedOn);
    } else if (sortOption.value === "oldest") {
      return new Date(a.issuedOn) - new Date(b.issuedOn);
    } else if (sortOption.value === "name-asc") {
      return a.badge.name.localeCompare(b.badge.name);
    } else if (sortOption.value === "name-desc") {
      return b.badge.name.localeCompare(a.badge.name);
    }
    return 0;
  });

  badges.value = filtered;
  currentPage.value = 1; // Reset to first page when filters change
});

const handleBadgeClick = (badge) => {
  console.log("Badge clicked:", badge);
  // Navigate to badge details or show modal
};

const handlePageChange = (page) => {
  currentPage.value = page;
};

const clearFilters = () => {
  filterText.value = "";
  sortOption.value = "newest";
};
</script>

<style>
.badges-collection {
  max-width: 1200px;
  margin: 0 auto;
  padding: 20px;
}

.filter-controls {
  display: flex;
  flex-wrap: wrap;
  gap: 16px;
  margin-bottom: 24px;
}

.filter-input {
  flex: 1;
  min-width: 200px;
  padding: 8px 12px;
  border: 1px solid #e2e8f0;
  border-radius: 4px;
}

.sort-controls {
  display: flex;
  align-items: center;
  gap: 8px;
}

.sort-select {
  padding: 8px 12px;
  border: 1px solid #e2e8f0;
  border-radius: 4px;
}

.empty-state {
  text-align: center;
  padding: 40px;
}

.clear-button {
  margin-top: 16px;
  padding: 8px 16px;
  background-color: #3182ce;
  color: white;
  border: none;
  border-radius: 4px;
  cursor: pointer;
}

.clear-button:hover {
  background-color: #2c5282;
}
</style>
```

## User Profile with Badges

This example shows how to display a user profile with their earned badges:

```vue
<template>
  <div class="profile-page">
    <div v-if="loading" class="loading">Loading profile...</div>

    <div v-else-if="error" class="error">
      {{ error }}
      <button @click="loadUserProfile" class="retry-button">Retry</button>
    </div>

    <ProfileViewer
      v-else
      :profile="userProfile"
      :badges="userBadges"
      badges-layout="grid"
      :show-pagination="true"
      :page-size="6"
      @badge-click="handleBadgeClick"
    />
  </div>
</template>

<script setup>
import { ProfileViewer } from "openbadges-ui";
import { ref, onMounted } from "vue";

const userProfile = ref(null);
const userBadges = ref([]);
const loading = ref(true);
const error = ref(null);

// In a real app, this would fetch from an API
const loadUserProfile = async () => {
  loading.value = true;
  error.value = null;

  try {
    // Simulate API call
    await new Promise((resolve) => setTimeout(resolve, 1000));

    // Mock data
    userProfile.value = {
      id: "user-123",
      name: "Alice Johnson",
      image:
        "https://ui-avatars.com/api/?name=Alice+J&background=553C9A&color=fff",
      description: "AI researcher and machine learning enthusiast",
      email: "alice@example.org",
      type: "Recipient",
    };

    userBadges.value = [
      // Example badges would go here
      // ...
    ];
  } catch (err) {
    error.value = "Failed to load profile. Please try again.";
    console.error(err);
  } finally {
    loading.value = false;
  }
};

const handleBadgeClick = (badge) => {
  console.log("Badge clicked:", badge);
  // Navigate to badge details or show modal
};

onMounted(() => {
  loadUserProfile();
});
</script>

<style>
.profile-page {
  max-width: 1000px;
  margin: 0 auto;
  padding: 20px;
}

.loading,
.error {
  text-align: center;
  padding: 40px;
}

.error {
  color: #e53e3e;
}

.retry-button {
  margin-top: 16px;
  padding: 8px 16px;
  background-color: #3182ce;
  color: white;
  border: none;
  border-radius: 4px;
  cursor: pointer;
}
</style>
```

## Badge Issuer Dashboard

This example shows how to implement a badge issuer dashboard:

```vue
<template>
  <div class="issuer-dashboard-page">
    <h1>Badge Issuer Dashboard</h1>

    <IssuerDashboard
      :issuer-profile="issuerProfile"
      :initial-badges="issuedBadges"
      @badge-issued="handleBadgeIssued"
      @badge-click="handleBadgeClick"
    />
  </div>
</template>

<script setup>
import { IssuerDashboard } from "openbadges-ui";
import { ref, onMounted } from "vue";

const issuerProfile = ref({
  id: "issuer-123",
  name: "Academy",
  image:
    "https://ui-avatars.com/api/?name=Manus+AI&background=0D8ABC&color=fff",
  description:
    "An organization dedicated to advancing AI education and certification.",
  url: "https://example.org",
  email: "badges@example.org",
});

const issuedBadges = ref([]);

// In a real app, this would send to an API
const handleBadgeIssued = async (assertion) => {
  console.log("Badge issued:", assertion);

  try {
    // Simulate API call
    await new Promise((resolve) => setTimeout(resolve, 1000));

    // Add the new badge to the list
    issuedBadges.value = [assertion, ...issuedBadges.value];

    alert("Badge successfully issued!");
  } catch (err) {
    console.error("Failed to save badge:", err);
    alert("Failed to issue badge. Please try again.");
  }
};

const handleBadgeClick = (badge) => {
  console.log("Badge clicked:", badge);
  // Show badge details or edit modal
};

// In a real app, this would fetch from an API
const loadIssuedBadges = async () => {
  try {
    // Simulate API call
    await new Promise((resolve) => setTimeout(resolve, 1000));

    // Mock data
    issuedBadges.value = [
      // Example badges would go here
      // ...
    ];
  } catch (err) {
    console.error("Failed to load badges:", err);
  }
};

onMounted(() => {
  loadIssuedBadges();
});
</script>

<style>
.issuer-dashboard-page {
  max-width: 1200px;
  margin: 0 auto;
  padding: 20px;
}
</style>
```

## Theming Example

This example shows how to implement theme switching:

```vue
<template>
  <div class="theme-example">
    <div class="theme-controls">
      <h2>Theme Selection</h2>
      <div class="theme-buttons">
        <button
          v-for="theme in themes"
          :key="theme.value"
          @click="applyTheme(theme.value)"
          class="theme-button"
          :class="{ active: currentTheme === theme.value }"
        >
          {{ theme.label }}
        </button>
      </div>
    </div>

    <div class="theme-preview">
      <h3>Theme Preview</h3>
      <BadgeDisplay :badge="exampleBadge" :interactive="true" />
    </div>
  </div>
</template>

<script setup>
import { BadgeDisplay, AccessibilityService } from "openbadges-ui";
import { ref } from "vue";

const themes = [
  { label: "Default", value: "default" },
  { label: "Dark", value: "dark" },
  { label: "High Contrast", value: "high-contrast" },
  { label: "Large Text", value: "large-text" },
  { label: "Dyslexia Friendly", value: "dyslexia-friendly" },
];

const currentTheme = ref("default");

const applyTheme = (theme) => {
  currentTheme.value = theme;
  AccessibilityService.applyTheme(theme);
};

// Example badge for preview
const exampleBadge = ref({
  "@context": "https://w3id.org/openbadges/v2",
  id: "https://example.org/assertions/123",
  type: "Assertion",
  recipient: {
    identity: "recipient@example.org",
    type: "email",
    hashed: false,
  },
  badge: {
    id: "https://example.org/badges/1",
    type: "BadgeClass",
    name: "Theme Example Badge",
    description:
      "This badge demonstrates how different themes affect the appearance of components.",
    image:
      "https://ui-avatars.com/api/?name=Theme+Example&background=3182CE&color=fff",
    issuer: {
      id: "https://example.org/issuer",
      type: "Profile",
      name: "Academy",
    },
  },
  issuedOn: "2025-04-15T12:00:00Z",
  verification: {
    type: "hosted",
  },
});
</script>

<style>
.theme-example {
  max-width: 800px;
  margin: 0 auto;
  padding: 20px;
}

.theme-controls {
  margin-bottom: 32px;
}

.theme-buttons {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
  margin-top: 16px;
}

.theme-button {
  padding: 8px 16px;
  background-color: #e2e8f0;
  border: none;
  border-radius: 4px;
  cursor: pointer;
  transition: all 0.2s ease;
}

.theme-button:hover {
  background-color: #cbd5e0;
}

.theme-button.active {
  background-color: #3182ce;
  color: white;
}

.theme-preview {
  padding: 24px;
  border: 1px solid #e2e8f0;
  border-radius: 8px;
}
</style>
```

## Accessibility Features Example

This example demonstrates how to use the accessibility features:

```vue
<template>
  <div class="accessibility-demo">
    <h2>Accessibility Features</h2>

    <div class="feature-section">
      <h3>Skip Link</h3>
      <p>Press Tab to see the skip link appear at the top of the page.</p>
      <a href="#main-content" class="ob-skip-link">Skip to main content</a>
    </div>

    <div class="feature-section">
      <h3>Screen Reader Text</h3>
      <p>
        This link has additional context for screen readers:
        <a href="#">
          Documentation
          <span class="ob-visually-hidden">opens in a new tab</span>
        </a>
      </p>
    </div>

    <div class="feature-section">
      <h3>Focus Styles</h3>
      <p>Tab through these buttons to see enhanced focus styles:</p>
      <div class="button-group">
        <button class="ob-focus-visible">Button 1</button>
        <button class="ob-focus-visible">Button 2</button>
        <button class="ob-focus-visible">Button 3</button>
      </div>
    </div>

    <div class="feature-section">
      <h3>Status Messages</h3>
      <div class="ob-status" role="status">This is a status message</div>
      <div class="ob-status" role="alert">This is an alert message</div>
    </div>

    <div id="main-content" class="feature-section">
      <h3>Reduced Motion Detection</h3>
      <p>
        Reduced motion preference:
        <strong>{{ prefersReducedMotion ? "Enabled" : "Disabled" }}</strong>
      </p>
      <p>When enabled, animations will be minimized or disabled.</p>
    </div>
  </div>
</template>

<script setup>
import { AccessibilityService } from "openbadges-ui";
import { ref, onMounted } from "vue";

const prefersReducedMotion = ref(false);

onMounted(() => {
  prefersReducedMotion.value = AccessibilityService.prefersReducedMotion();

  // Listen for changes to the prefers-reduced-motion media query
  const mediaQuery = window.matchMedia("(prefers-reduced-motion: reduce)");
  mediaQuery.addEventListener("change", () => {
    prefersReducedMotion.value = AccessibilityService.prefersReducedMotion();
  });
});
</script>

<style>
.accessibility-demo {
  max-width: 800px;
  margin: 0 auto;
  padding: 20px;
}

.feature-section {
  margin-bottom: 32px;
  padding: 16px;
  border: 1px solid #e2e8f0;
  border-radius: 8px;
}

.button-group {
  display: flex;
  gap: 8px;
  margin-top: 16px;
}

.button-group button {
  padding: 8px 16px;
  background-color: #3182ce;
  color: white;
  border: none;
  border-radius: 4px;
  cursor: pointer;
}

/* Import the accessibility styles */
import 'openbadges-ui/dist/style.css';
</style>
```

These examples demonstrate how to use the Open Badges Component Library in various common scenarios. You can adapt them to your specific needs and integrate them into your Vue 3 applications.
