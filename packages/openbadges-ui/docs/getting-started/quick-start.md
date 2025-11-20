# Quick Start

This guide will help you get started with the OpenBadges UI library by creating a simple badge display application.

## Prerequisites

Before you begin, make sure you have:
- Installed the OpenBadges UI library (see [Installation](./installation.md))
- Set up a Vue 3 project

## Creating a Simple Badge Display

Let's create a simple application that displays a badge.

### Step 1: Set Up the Vue Application

First, make sure you've imported the library and its styles in your main file:

```javascript
// main.js or main.ts
import { createApp } from 'vue';
import App from './App.vue';
import { OpenBadgesUIPlugin } from 'openbadges-ui';

// Import styles
import 'openbadges-ui/dist/style.css';

const app = createApp(App);

// Use the plugin
app.use(OpenBadgesUIPlugin);

app.mount('#app');
```

### Step 2: Create a Badge Component

Create a new component that will display a badge:

```vue
<!-- BadgeViewer.vue -->
<template>
  <div class="badge-viewer">
    <h1>My Badge</h1>
    <BadgeDisplay 
      :badge="badge" 
      :show-description="true"
      :show-issued-date="true"
      :show-verification="true"
    />
  </div>
</template>

<script setup>
import { ref } from 'vue';

// Example badge in Open Badges 2.0 format
const badge = ref({
  '@context': 'https://w3id.org/openbadges/v2',
  id: 'https://example.org/assertions/123',
  type: 'Assertion',
  recipient: {
    identity: 'jane@example.org',
    type: 'email',
    hashed: false
  },
  badge: {
    id: 'https://example.org/badges/1',
    type: 'BadgeClass',
    name: 'Web Development Fundamentals',
    description: 'This badge is awarded for demonstrating proficiency in web development fundamentals including HTML, CSS, and JavaScript.',
    image: 'https://example.org/badges/web-dev.png',
    issuer: {
      id: 'https://example.org/issuer',
      type: 'Profile',
      name: 'Web Development Academy'
    }
  },
  issuedOn: '2023-01-15T12:00:00Z',
  verification: {
    type: 'hosted'
  }
});
</script>

<style scoped>
.badge-viewer {
  max-width: 600px;
  margin: 0 auto;
  padding: 20px;
}
</style>
```

### Step 3: Use the Component in Your App

Now, use the BadgeViewer component in your App.vue file:

```vue
<!-- App.vue -->
<template>
  <div class="app">
    <BadgeViewer />
  </div>
</template>

<script setup>
import BadgeViewer from './components/BadgeViewer.vue';
</script>

<style>
.app {
  font-family: Arial, sans-serif;
  line-height: 1.6;
  color: #333;
}
</style>
```

### Step 4: Run Your Application

Start your development server:

```bash
npm run dev
# or
yarn dev
# or
pnpm dev
```

You should now see the badge displayed in your application!

## Adding Badge Verification

Let's enhance our application by adding badge verification functionality:

```vue
<!-- BadgeViewer.vue -->
<template>
  <div class="badge-viewer">
    <h1>My Badge</h1>
    <BadgeDisplay 
      :badge="badge" 
      :show-description="true"
      :show-issued-date="true"
      :show-verification="true"
      @verified="handleVerified"
    />
    
    <div v-if="verificationResult" class="verification-result">
      <h2>Verification Result</h2>
      <p>
        <strong>Status:</strong> 
        {{ verificationResult.isValid ? 'Valid' : 'Invalid' }}
      </p>
      <p v-if="verificationResult.verificationMethod">
        <strong>Method:</strong> 
        {{ verificationResult.verificationMethod }}
      </p>
    </div>
  </div>
</template>

<script setup>
import { ref } from 'vue';

// Example badge in Open Badges 2.0 format
const badge = ref({
  // ... badge data from previous example
});

// Store verification result
const verificationResult = ref(null);

// Handle verification event
const handleVerified = (isValid) => {
  verificationResult.value = {
    isValid,
    verificationMethod: badge.value.verification.type
  };
};
</script>

<style scoped>
.badge-viewer {
  max-width: 600px;
  margin: 0 auto;
  padding: 20px;
}

.verification-result {
  margin-top: 20px;
  padding: 15px;
  border: 1px solid #ddd;
  border-radius: 4px;
  background-color: #f9f9f9;
}
</style>
```

## Creating a Badge List

Now, let's create a component that displays a list of badges:

```vue
<!-- BadgeListViewer.vue -->
<template>
  <div class="badge-list-viewer">
    <h1>My Badges</h1>
    
    <div class="controls">
      <input 
        v-model="filterText" 
        placeholder="Filter badges..." 
        class="filter-input"
      />
      
      <select v-model="layout" class="layout-select">
        <option value="grid">Grid Layout</option>
        <option value="list">List Layout</option>
      </select>
    </div>
    
    <BadgeList 
      :badges="badges" 
      :layout="layout"
      :interactive="true"
      :show-pagination="true"
      :page-size="6"
      @badge-click="handleBadgeClick"
    >
      <template #empty>
        <p>No badges found. Earn your first badge!</p>
      </template>
    </BadgeList>
    
    <div v-if="selectedBadge" class="selected-badge">
      <h2>Selected Badge</h2>
      <BadgeDisplay :badge="selectedBadge" />
    </div>
  </div>
</template>

<script setup>
import { ref } from 'vue';
import { useBadges } from 'openbadges-ui';

// Create some example badges
const exampleBadges = [
  // First badge from previous example
  {
    '@context': 'https://w3id.org/openbadges/v2',
    id: 'https://example.org/assertions/123',
    type: 'Assertion',
    recipient: {
      identity: 'jane@example.org',
      type: 'email',
      hashed: false
    },
    badge: {
      id: 'https://example.org/badges/1',
      type: 'BadgeClass',
      name: 'Web Development Fundamentals',
      description: 'This badge is awarded for demonstrating proficiency in web development fundamentals including HTML, CSS, and JavaScript.',
      image: 'https://example.org/badges/web-dev.png',
      issuer: {
        id: 'https://example.org/issuer',
        type: 'Profile',
        name: 'Web Development Academy'
      }
    },
    issuedOn: '2023-01-15T12:00:00Z',
    verification: {
      type: 'hosted'
    }
  },
  // Add more example badges...
];

// Use the useBadges composable
const { 
  badges, 
  filterText, 
  filteredBadges, 
  setBadges 
} = useBadges(exampleBadges);

// Set up layout and selected badge
const layout = ref('grid');
const selectedBadge = ref(null);

// Handle badge click
const handleBadgeClick = (badge) => {
  selectedBadge.value = badge;
};
</script>

<style scoped>
.badge-list-viewer {
  max-width: 1000px;
  margin: 0 auto;
  padding: 20px;
}

.controls {
  display: flex;
  margin-bottom: 20px;
  gap: 10px;
}

.filter-input {
  flex: 1;
  padding: 8px;
  border: 1px solid #ddd;
  border-radius: 4px;
}

.layout-select {
  padding: 8px;
  border: 1px solid #ddd;
  border-radius: 4px;
}

.selected-badge {
  margin-top: 30px;
  padding: 20px;
  border: 1px solid #ddd;
  border-radius: 4px;
  background-color: #f9f9f9;
}
</style>
```

## Next Steps

Now that you've created a simple badge display application, you can:

- Explore the [API Documentation](../api/index.md) to learn about all available components and features
- Learn about [Theming and Customization](../guides/theming.md) to customize the appearance of the components
- Check out the [Examples](../examples/index.md) for more advanced usage scenarios
