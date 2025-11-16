# Using OpenBadges Types in Consuming Applications

This guide provides examples and best practices for using the `openbadges-types` package in your applications, particularly for handling both Open Badges 2.0 and 3.0 formats.

## Table of Contents

- [Type Guards for Badge Validation](#type-guards-for-badge-validation)
- [Normalizing Badges for UI Components](#normalizing-badges-for-ui-components)
- [Filtering and Sorting Badges](#filtering-and-sorting-badges)
- [Examples for Common Use Cases](#examples-for-common-use-cases)
  - [Vue Components](#vue-components)
  - [Badge Services](#badge-services)

## Type Guards for Badge Validation

The package provides several type guards to validate badges at runtime:

```typescript
import { OB2, OB3, CompositeGuards } from 'openbadges-types';

// Basic type guards for specific badge versions
function processBadge(badge: unknown) {
  if (OB2.isAssertion(badge)) {
    // Handle OB2 Assertion
    console.log('OB2 Badge:', badge.id);
  } else if (OB3.isVerifiableCredential(badge)) {
    // Handle OB3 VerifiableCredential
    console.log('OB3 Badge:', badge.id);
  } else {
    console.error('Invalid badge format');
  }
}

// Composite type guard for either badge version
function processAnyBadge(badge: unknown) {
  if (CompositeGuards.isBadge(badge)) {
    // badge is now typed as OB2.Assertion | OB3.VerifiableCredential
    const name = CompositeGuards.getBadgeName(badge);
    console.log('Badge Name:', name);
  } else {
    console.error('Invalid badge format');
  }
}
```

## Normalizing Badges for UI Components

When working with UI components that need to display badge information, it's helpful to normalize badges to a common format:

```typescript
import { BadgeNormalizer } from 'openbadges-types';

// Normalize a single badge
function displayBadge(badge: unknown) {
  try {
    const normalizedBadge = BadgeNormalizer.normalizeBadge(badge);
    
    // Now you can access common properties regardless of badge version
    console.log(`Badge: ${normalizedBadge.name}`);
    console.log(`Issued by: ${normalizedBadge.issuerName}`);
    console.log(`Issued on: ${normalizedBadge.issuanceDate}`);
    
    // The original badge is still available if needed
    const rawBadge = normalizedBadge.rawBadge;
  } catch (error) {
    console.error('Invalid badge:', error);
  }
}

// Normalize an array of badges
function displayBadges(badges: unknown[]) {
  const normalizedBadges = BadgeNormalizer.normalizeBadges(badges);
  
  // Now you can work with a consistent array of badges
  normalizedBadges.forEach(badge => {
    console.log(`${badge.name} (${badge.type})`);
  });
}
```

## Filtering and Sorting Badges

The package provides utilities for filtering and sorting normalized badges:

```typescript
import { BadgeNormalizer } from 'openbadges-types';

// Sort badges by name
function sortBadgesByName(badges: unknown[], direction: 'asc' | 'desc' = 'asc') {
  const normalizedBadges = BadgeNormalizer.normalizeBadges(badges);
  return BadgeNormalizer.sortBadges(normalizedBadges, 'name', direction);
}

// Filter badges by search term
function searchBadges(badges: unknown[], searchTerm: string) {
  const normalizedBadges = BadgeNormalizer.normalizeBadges(badges);
  return BadgeNormalizer.filterBadgesBySearchTerm(normalizedBadges, searchTerm);
}

// Filter badges by type
function filterBadgesByType(badges: unknown[], type: 'OB2' | 'OB3' | 'all') {
  const normalizedBadges = BadgeNormalizer.normalizeBadges(badges);
  return BadgeNormalizer.filterBadgesByType(normalizedBadges, type);
}

// Group badges by issuer
function groupBadgesByIssuer(badges: unknown[]) {
  const normalizedBadges = BadgeNormalizer.normalizeBadges(badges);
  return BadgeNormalizer.groupBadges(normalizedBadges, 'issuerName');
}
```

## Examples for Common Use Cases

### Vue Components

Here's an example of how to use the type guards in a Vue component:

```vue
<template>
  <div class="badge-list">
    <div class="filters">
      <input v-model="searchTerm" placeholder="Search badges..." />
      <select v-model="selectedType">
        <option value="all">All Badges</option>
        <option value="OB2">Open Badges 2.0</option>
        <option value="OB3">Open Badges 3.0</option>
      </select>
      <select v-model="sortField">
        <option value="name">Name</option>
        <option value="issuanceDate">Issue Date</option>
        <option value="issuerName">Issuer</option>
      </select>
      <button @click="toggleSortDirection">
        {{ sortDirection === 'asc' ? '↑' : '↓' }}
      </button>
    </div>
    
    <div v-if="loading">Loading badges...</div>
    <div v-else-if="filteredBadges.length === 0">No badges found.</div>
    <div v-else class="badge-grid">
      <div v-for="badge in filteredBadges" :key="badge.id" class="badge-card">
        <img v-if="badge.imageUrl" :src="badge.imageUrl" alt="Badge" />
        <h3>{{ badge.name }}</h3>
        <p v-if="badge.description">{{ badge.description }}</p>
        <p>Issued by: {{ badge.issuerName || 'Unknown' }}</p>
        <p>Issued on: {{ formatDate(badge.issuanceDate) }}</p>
        <p v-if="badge.expirationDate">
          Expires on: {{ formatDate(badge.expirationDate) }}
        </p>
        <span class="badge-type" :class="badge.type.toLowerCase()">
          {{ badge.type }}
        </span>
      </div>
    </div>
  </div>
</template>

<script>
import { ref, computed, onMounted } from 'vue';
import { BadgeNormalizer } from 'openbadges-types';

export default {
  name: 'BadgeList',
  props: {
    badges: {
      type: Array,
      required: true
    }
  },
  setup(props) {
    const loading = ref(false);
    const searchTerm = ref('');
    const selectedType = ref('all');
    const sortField = ref('name');
    const sortDirection = ref('asc');
    
    // Normalize badges once on component mount
    const normalizedBadges = ref([]);
    
    onMounted(() => {
      loading.value = true;
      try {
        normalizedBadges.value = BadgeNormalizer.normalizeBadges(props.badges);
      } catch (error) {
        console.error('Error normalizing badges:', error);
      } finally {
        loading.value = false;
      }
    });
    
    // Apply filters and sorting
    const filteredBadges = computed(() => {
      let result = [...normalizedBadges.value];
      
      // Filter by type
      if (selectedType.value !== 'all') {
        result = BadgeNormalizer.filterBadgesByType(result, selectedType.value);
      }
      
      // Filter by search term
      if (searchTerm.value) {
        result = BadgeNormalizer.filterBadgesBySearchTerm(result, searchTerm.value);
      }
      
      // Sort by selected field
      result = BadgeNormalizer.sortBadges(result, sortField.value, sortDirection.value);
      
      return result;
    });
    
    const toggleSortDirection = () => {
      sortDirection.value = sortDirection.value === 'asc' ? 'desc' : 'asc';
    };
    
    const formatDate = (dateString) => {
      if (!dateString) return '';
      return new Date(dateString).toLocaleDateString();
    };
    
    return {
      loading,
      searchTerm,
      selectedType,
      sortField,
      sortDirection,
      filteredBadges,
      toggleSortDirection,
      formatDate
    };
  }
};
</script>
```

### Badge Services

Here's an example of how to use the type guards in a service class:

```typescript
import { OB2, OB3, CompositeGuards, BadgeNormalizer } from 'openbadges-types';

export class BadgeService {
  private badges: unknown[] = [];
  
  constructor() {
    // Initialize badges from API, database, etc.
  }
  
  /**
   * Fetches badges from an API
   */
  async fetchBadges(): Promise<unknown[]> {
    try {
      const response = await fetch('https://api.example.com/badges');
      const data = await response.json();
      this.badges = data;
      return data;
    } catch (error) {
      console.error('Error fetching badges:', error);
      return [];
    }
  }
  
  /**
   * Gets a normalized list of badges
   */
  getNormalizedBadges() {
    return BadgeNormalizer.normalizeBadges(this.badges);
  }
  
  /**
   * Gets a badge by ID
   */
  getBadgeById(id: string): unknown | null {
    const badge = this.badges.find(badge => {
      if (OB2.isAssertion(badge)) {
        return badge.id === id;
      } else if (OB3.isVerifiableCredential(badge)) {
        return badge.id === id;
      }
      return false;
    });
    
    return badge || null;
  }
  
  /**
   * Gets badges by issuer
   */
  getBadgesByIssuer(issuerId: string) {
    const normalizedBadges = this.getNormalizedBadges();
    return BadgeNormalizer.filterBadgesByIssuer(normalizedBadges, issuerId);
  }
  
  /**
   * Gets badges by recipient
   */
  getBadgesByRecipient(recipientId: string) {
    const normalizedBadges = this.getNormalizedBadges();
    return BadgeNormalizer.filterBadgesByRecipient(normalizedBadges, recipientId);
  }
  
  /**
   * Searches badges by term
   */
  searchBadges(term: string) {
    const normalizedBadges = this.getNormalizedBadges();
    return BadgeNormalizer.filterBadgesBySearchTerm(normalizedBadges, term);
  }
  
  /**
   * Gets the name of a badge
   */
  getBadgeName(badge: unknown): string | null {
    if (CompositeGuards.isBadge(badge)) {
      return CompositeGuards.getBadgeName(badge);
    }
    return null;
  }
  
  /**
   * Validates a badge
   */
  validateBadge(badge: unknown): { isValid: boolean; version?: string; errors?: string[] } {
    if (OB2.isAssertion(badge)) {
      return { isValid: true, version: '2.0' };
    } else if (OB3.isVerifiableCredential(badge)) {
      return { isValid: true, version: '3.0' };
    }
    
    return { isValid: false, errors: ['Invalid badge format'] };
  }
}
```

These examples demonstrate how to use the type guards and utilities in real-world applications. Adapt them to your specific needs and application architecture.
