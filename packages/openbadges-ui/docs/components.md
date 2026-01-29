# Component Documentation

## Badge Display Components

### BadgeDisplay

The `BadgeDisplay` component renders a single badge with its image, name, description, issuer information, and dates.

#### Props

| Name             | Type                                        | Default  | Description                                              |
| ---------------- | ------------------------------------------- | -------- | -------------------------------------------------------- |
| badge            | `OB2.Assertion \| OB3.VerifiableCredential` | Required | The badge to display                                     |
| showDescription  | `boolean`                                   | `true`   | Whether to show the badge description                    |
| showIssuedDate   | `boolean`                                   | `true`   | Whether to show the badge issue date                     |
| showExpiryDate   | `boolean`                                   | `false`  | Whether to show the badge expiry date                    |
| interactive      | `boolean`                                   | `false`  | Whether the badge is clickable                           |
| showVerification | `boolean`                                   | `false`  | Whether to show badge verification controls              |
| autoVerify       | `boolean`                                   | `false`  | Whether to automatically verify the badge when displayed |

#### Events

| Name     | Payload                                     | Description                                                          |
| -------- | ------------------------------------------- | -------------------------------------------------------------------- |
| click    | `OB2.Assertion \| OB3.VerifiableCredential` | Emitted when the badge is clicked (if interactive)                   |
| verified | `boolean`                                   | Emitted when a badge has been verified, with the verification result |

#### Slots

| Name          | Description                                           |
| ------------- | ----------------------------------------------------- |
| badge-actions | Additional actions to display below the badge content |

#### Example

```vue
<template>
  <BadgeDisplay
    :badge="myBadge"
    :interactive="true"
    @click="handleBadgeClick"
  />
</template>

<script setup>
import { BadgeDisplay } from "openbadges-ui";
import { ref } from "vue";

// Example badge (OB2 format)
const myBadge = ref({
  "@context": "https://w3id.org/openbadges/v2",
  id: "https://example.org/assertions/123",
  type: "Assertion",
  recipient: {
    identity: "alice@example.org",
    type: "email",
    hashed: false,
  },
  badge: {
    id: "https://example.org/badges/1",
    type: "BadgeClass",
    name: "AI Ethics Fundamentals",
    description:
      "Awarded for demonstrating understanding of core AI ethics principles.",
    image: "https://example.org/badges/ai-ethics.png",
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

const handleBadgeClick = (badge) => {
  console.log("Badge clicked:", badge);
};
</script>
```

### BadgeList

The `BadgeList` component displays a collection of badges with support for grid/list layouts and pagination.

#### Props

| Name           | Type                                               | Default            | Description                                          |
| -------------- | -------------------------------------------------- | ------------------ | ---------------------------------------------------- |
| badges         | `Array<OB2.Assertion \| OB3.VerifiableCredential>` | Required           | Array of badges to display                           |
| layout         | `'grid' \| 'list'`                                 | `'grid'`           | Layout style for the badges                          |
| interactive    | `boolean`                                          | `true`             | Whether badges are clickable                         |
| loading        | `boolean`                                          | `false`            | Whether to show loading state                        |
| pageSize       | `number`                                           | `9`                | Number of badges per page when pagination is enabled |
| currentPage    | `number`                                           | `1`                | Current page number                                  |
| showPagination | `boolean`                                          | `false`            | Whether to show pagination controls                  |
| ariaLabel      | `string`                                           | `'List of badges'` | Accessible label for the badge list                  |

#### Events

| Name        | Payload                                     | Description                      |
| ----------- | ------------------------------------------- | -------------------------------- |
| badge-click | `OB2.Assertion \| OB3.VerifiableCredential` | Emitted when a badge is clicked  |
| page-change | `number`                                    | Emitted when the page is changed |

#### Slots

| Name  | Scope                   | Description                                 |
| ----- | ----------------------- | ------------------------------------------- |
| badge | `{ badge, normalized }` | Custom rendering for each badge             |
| empty | None                    | Content to display when no badges are found |

#### Example

```vue
<template>
  <BadgeList
    :badges="badges"
    layout="grid"
    :show-pagination="true"
    :page-size="6"
    @badge-click="handleBadgeClick"
    @page-change="handlePageChange"
  >
    <template #empty>
      <p>No badges found. Earn your first badge!</p>
    </template>
  </BadgeList>
</template>

<script setup>
import { BadgeList } from "openbadges-ui";
import { ref } from "vue";
import { mockAssertions } from "./mockData";

const badges = ref(mockAssertions);
const currentPage = ref(1);

const handleBadgeClick = (badge) => {
  console.log("Badge clicked:", badge);
};

const handlePageChange = (page) => {
  currentPage.value = page;
};
</script>
```

### ProfileViewer

The `ProfileViewer` component displays a user or issuer profile along with their badges.

#### Props

| Name              | Type                                               | Default  | Description                           |
| ----------------- | -------------------------------------------------- | -------- | ------------------------------------- |
| profile           | `Profile`                                          | Required | Profile data (issuer or recipient)    |
| badges            | `Array<OB2.Assertion \| OB3.VerifiableCredential>` | Required | Badges associated with the profile    |
| loading           | `boolean`                                          | `false`  | Whether to show loading state         |
| badgesLayout      | `'grid' \| 'list'`                                 | `'grid'` | Layout for the badges list            |
| badgesInteractive | `boolean`                                          | `true`   | Whether badges are clickable          |
| showPagination    | `boolean`                                          | `false`  | Whether to show pagination for badges |
| pageSize          | `number`                                           | `6`      | Number of badges per page             |

#### Events

| Name        | Payload                                     | Description                     |
| ----------- | ------------------------------------------- | ------------------------------- |
| badge-click | `OB2.Assertion \| OB3.VerifiableCredential` | Emitted when a badge is clicked |

#### Slots

| Name        | Scope        | Description                          |
| ----------- | ------------ | ------------------------------------ |
| badges-list | `{ badges }` | Custom rendering for the badges list |

#### Example

```vue
<template>
  <ProfileViewer
    :profile="profile"
    :badges="badges"
    badges-layout="grid"
    :show-pagination="true"
    @badge-click="handleBadgeClick"
  />
</template>

<script setup>
import { ProfileViewer } from "openbadges-ui";
import { ref } from "vue";
import { mockProfiles } from "./mockData";

const profile = ref(mockProfiles.alice);
const badges = ref(mockProfiles.alice.badges);

const handleBadgeClick = (badge) => {
  console.log("Badge clicked:", badge);
};
</script>
```

## Badge Issuing Components

### BadgeIssuerForm

The `BadgeIssuerForm` component provides a form for creating and issuing badges.

#### Props

| Name                  | Type                      | Default | Description                                   |
| --------------------- | ------------------------- | ------- | --------------------------------------------- |
| initialBadgeClass     | `Partial<OB2.BadgeClass>` | `{}`    | Initial badge class data                      |
| initialRecipientEmail | `string`                  | `''`    | Initial recipient email                       |
| updateDebounceMs      | `number`                  | `300`   | Debounce duration (ms) for the `update` event |

#### Events

| Name         | Payload                              | Description                                                 |
| ------------ | ------------------------------------ | ----------------------------------------------------------- |
| badge-issued | `OB2.Assertion`                      | Emitted when a badge is successfully issued                 |
| reset        | None                                 | Emitted when the form is reset                              |
| update       | `{ badge: Partial<OB2.BadgeClass> }` | Emitted on form field changes for live previews (debounced) |

#### Example

```vue
<template>
  <BadgeIssuerForm
    :initial-badge-class="initialBadge"
    @badge-issued="handleBadgeIssued"
    @update="handleFormUpdate"
  />
</template>

<script setup lang="ts">
import type { OB2 } from "openbadges-types";

function handleFormUpdate(payload: { badge: Partial<OB2.BadgeClass> }) {
  // Update local preview data
}
</script>
```

### IssuerDashboard

The `IssuerDashboard` component provides a complete dashboard for badge issuers.

#### Props

| Name          | Type                                                                          | Default  | Description                   |
| ------------- | ----------------------------------------------------------------------------- | -------- | ----------------------------- |
| issuerProfile | `{ id: string; name: string; url?: string; email?: string; image?: string; }` | Optional | Issuer profile information    |
| initialBadges | `Array<OB2.Assertion \| OB3.VerifiableCredential>`                            | `[]`     | Initial list of issued badges |
| loading       | `boolean`                                                                     | `false`  | Whether to show loading state |

#### Events

| Name         | Payload                                     | Description                     |
| ------------ | ------------------------------------------- | ------------------------------- |
| badge-issued | `OB2.Assertion`                             | Emitted when a badge is issued  |
| badge-click  | `OB2.Assertion \| OB3.VerifiableCredential` | Emitted when a badge is clicked |

#### Example

```vue
<template>
  <IssuerDashboard
    :issuer-profile="issuerProfile"
    :initial-badges="issuedBadges"
    @badge-issued="handleBadgeIssued"
    @badge-click="handleBadgeClick"
  />
</template>

<script setup>
import { IssuerDashboard } from "openbadges-ui";
import { ref } from "vue";
import { mockProfiles, mockAssertions } from "./mockData";

const issuerProfile = ref({
  id: "https://example.org/issuer",
  name: "Academy",
  url: "https://example.org",
  email: "badges@example.org",
  image: "https://example.org/logo.png",
});

const issuedBadges = ref(mockAssertions);

const handleBadgeIssued = (assertion) => {
  console.log("Badge issued:", assertion);
  // Here you would typically send the assertion to your backend
  // and then refresh the list of badges
};

const handleBadgeClick = (badge) => {
  console.log("Badge clicked:", badge);
};
</script>
```

### BadgeVerification

The `BadgeVerification` component displays verification status and details for a badge, including verification method, expiration status, and revocation status.

#### Props

| Name             | Type                                        | Default  | Description                                            |
| ---------------- | ------------------------------------------- | -------- | ------------------------------------------------------ |
| badge            | `OB2.Assertion \| OB3.VerifiableCredential` | Required | The badge to verify                                    |
| showStatus       | `boolean`                                   | `true`   | Whether to show verification status                    |
| showDetails      | `boolean`                                   | `true`   | Whether to show verification details                   |
| showLastVerified | `boolean`                                   | `true`   | Whether to show when the badge was last verified       |
| autoVerify       | `boolean`                                   | `false`  | Whether to automatically verify the badge when mounted |

#### Events

| Name     | Payload   | Description                                                         |
| -------- | --------- | ------------------------------------------------------------------- |
| verified | `boolean` | Emitted when verification is complete, with the verification result |

#### Example

```vue
<template>
  <BadgeVerification
    :badge="myBadge"
    :auto-verify="true"
    @verified="handleVerified"
  />
</template>

<script setup>
import { BadgeVerification } from "openbadges-ui";
import { ref } from "vue";

// Example badge (OB2 format)
const myBadge = ref({
  "@context": "https://w3id.org/openbadges/v2",
  id: "https://example.org/assertions/123",
  type: "Assertion",
  recipient: {
    identity: "alice@example.org",
    type: "email",
    hashed: false,
  },
  badge: {
    id: "https://example.org/badges/1",
    type: "BadgeClass",
    name: "AI Ethics Fundamentals",
    description:
      "Awarded for demonstrating understanding of core AI ethics principles.",
    image: "https://example.org/badges/ai-ethics.png",
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

const handleVerified = (isValid) => {
  console.log("Badge verification result:", isValid);
};
</script>
```

## Composables

### useBadgeVerification

The `useBadgeVerification` composable provides functionality for verifying badges.

#### Returns

| Name               | Type                                                                                | Description                                                   |
| ------------------ | ----------------------------------------------------------------------------------- | ------------------------------------------------------------- |
| state              | `BadgeVerificationState`                                                            | Reactive state object containing verification data and status |
| isValid            | `ComputedRef<boolean>`                                                              | Whether the badge is valid                                    |
| errors             | `ComputedRef<string[]>`                                                             | Array of verification errors                                  |
| warnings           | `ComputedRef<string[]>`                                                             | Array of verification warnings                                |
| verificationMethod | `ComputedRef<'hosted' \| 'signed' \| undefined>`                                    | Method used for verification                                  |
| expirationStatus   | `ComputedRef<'valid' \| 'expired' \| 'not-applicable' \| undefined>`                | Badge expiration status                                       |
| revocationStatus   | `ComputedRef<'valid' \| 'revoked' \| 'unknown' \| undefined>`                       | Badge revocation status                                       |
| hasBeenVerified    | `ComputedRef<boolean>`                                                              | Whether the badge has been verified                           |
| verifyBadge        | `(badge: OB2.Assertion \| OB3.VerifiableCredential) => Promise<VerificationResult>` | Function to verify a badge                                    |
| clearVerification  | `() => void`                                                                        | Function to clear verification state                          |

#### Example

```vue
<template>
  <div>
    <button @click="handleVerify" :disabled="state.isVerifying">
      {{ state.isVerifying ? "Verifying..." : "Verify Badge" }}
    </button>

    <div v-if="hasBeenVerified">
      <p>Valid: {{ isValid ? "Yes" : "No" }}</p>
      <p v-if="verificationMethod">Method: {{ verificationMethod }}</p>

      <div v-if="errors.length > 0">
        <h4>Errors:</h4>
        <ul>
          <li v-for="(error, index) in errors" :key="index">{{ error }}</li>
        </ul>
      </div>
    </div>
  </div>
</template>

<script setup>
import { useBadgeVerification } from "openbadges-ui";
import { ref } from "vue";

const badge = ref({
  // Badge data
});

const {
  state,
  isValid,
  errors,
  warnings,
  verificationMethod,
  hasBeenVerified,
  verifyBadge,
} = useBadgeVerification();

const handleVerify = async () => {
  await verifyBadge(badge.value);
};
</script>
```

### useBadgeIssuer

The `useBadgeIssuer` composable provides functionality for creating and issuing badges.

#### Returns

| Name         | Type                                   | Description                                           |
| ------------ | -------------------------------------- | ----------------------------------------------------- |
| state        | `BadgeIssuerState`                     | Reactive state object containing form data and status |
| isValid      | `ComputedRef<boolean>`                 | Whether the current form data is valid                |
| resetForm    | `() => void`                           | Function to reset the form                            |
| validateForm | `() => boolean`                        | Function to validate the form                         |
| issueBadge   | `() => Promise<OB2.Assertion \| null>` | Function to issue a badge                             |

#### Example

```vue
<template>
  <form @submit.prevent="handleSubmit">
    <input v-model="state.badgeClass.name" placeholder="Badge Name" />
    <input v-model="state.badgeClass.description" placeholder="Description" />
    <input v-model="state.recipientEmail" placeholder="Recipient Email" />
    <button type="submit" :disabled="!isValid">Issue Badge</button>
  </form>
</template>

<script setup>
import { useBadgeIssuer } from "openbadges-ui";

const { state, isValid, issueBadge } = useBadgeIssuer();

const handleSubmit = async () => {
  const assertion = await issueBadge();
  if (assertion) {
    console.log("Badge issued:", assertion);
  }
};
</script>
```

### useBadges

The `useBadges` composable provides functionality for managing a collection of badges.

#### Parameters

| Name          | Type                                               | Default | Description              |
| ------------- | -------------------------------------------------- | ------- | ------------------------ |
| initialBadges | `Array<OB2.Assertion \| OB3.VerifiableCredential>` | `[]`    | Initial badges to manage |

#### Returns

| Name             | Type                                                                    | Description                                         |
| ---------------- | ----------------------------------------------------------------------- | --------------------------------------------------- |
| badges           | `Ref<Array<OB2.Assertion \| OB3.VerifiableCredential>>`                 | Reactive array of badges                            |
| filterText       | `Ref<string>`                                                           | Text to filter badges by                            |
| sortBy           | `Ref<'issuedOn' \| 'name'>`                                             | Property to sort badges by                          |
| sortDirection    | `Ref<'asc' \| 'desc'>`                                                  | Sort direction                                      |
| filteredBadges   | `ComputedRef<Array<OB2.Assertion \| OB3.VerifiableCredential>>`         | Badges filtered by filterText                       |
| sortedBadges     | `ComputedRef<Array<OB2.Assertion \| OB3.VerifiableCredential>>`         | Badges sorted according to sortBy and sortDirection |
| normalizedBadges | `ComputedRef<Array<NormalizedBadge>>`                                   | Badges normalized to a common format                |
| badgesByIssuer   | `ComputedRef<Record<string, Array<NormalizedBadge>>>`                   | Badges grouped by issuer                            |
| addBadge         | `(badge: OB2.Assertion \| OB3.VerifiableCredential) => void`            | Function to add a badge                             |
| removeBadge      | `(badgeId: string) => void`                                             | Function to remove a badge                          |
| setBadges        | `(newBadges: Array<OB2.Assertion \| OB3.VerifiableCredential>) => void` | Function to set all badges                          |
| setFilter        | `(text: string) => void`                                                | Function to set the filter text                     |
| setSorting       | `(by: 'issuedOn' \| 'name', direction?: 'asc' \| 'desc') => void`       | Function to set sorting                             |

#### Example

```vue
<template>
  <div>
    <input v-model="filterText" placeholder="Filter badges..." />
    <select v-model="sortBy">
      <option value="issuedOn">Issue Date</option>
      <option value="name">Name</option>
    </select>
    <select v-model="sortDirection">
      <option value="asc">Ascending</option>
      <option value="desc">Descending</option>
    </select>

    <div v-for="badge in normalizedBadges" :key="badge.id">
      {{ badge.name }} - {{ badge.issuer.name }}
    </div>
  </div>
</template>

<script setup>
import { useBadges } from "openbadges-ui";
import { mockAssertions } from "./mockData";

const { filterText, sortBy, sortDirection, normalizedBadges, setBadges } =
  useBadges();

// Initialize with mock data
setBadges(mockAssertions);
</script>
```

### useProfile

The `useProfile` composable provides functionality for managing profile data.

#### Parameters

| Name           | Type      | Default  | Description          |
| -------------- | --------- | -------- | -------------------- |
| initialProfile | `Profile` | Optional | Initial profile data |

#### Returns

| Name                   | Type                                                                    | Description                                     |
| ---------------------- | ----------------------------------------------------------------------- | ----------------------------------------------- |
| profile                | `Ref<Profile \| null>`                                                  | Reactive profile data                           |
| isLoading              | `Ref<boolean>`                                                          | Whether profile data is loading                 |
| error                  | `Ref<string \| null>`                                                   | Error message if loading failed                 |
| isIssuer               | `ComputedRef<boolean>`                                                  | Whether the profile is an issuer                |
| isRecipient            | `ComputedRef<boolean>`                                                  | Whether the profile is a recipient              |
| displayName            | `ComputedRef<string>`                                                   | Profile display name                            |
| setProfile             | `(newProfile: Profile) => void`                                         | Function to set the profile                     |
| loadProfile            | `(profileId: string, type?: 'Issuer' \| 'Recipient') => Promise<void>`  | Function to load a profile                      |
| clearProfile           | `() => void`                                                            | Function to clear the profile                   |
| extractIssuerFromBadge | `(badge: OB2.Assertion \| OB3.VerifiableCredential) => Profile \| null` | Function to extract issuer profile from a badge |

#### Example

```vue
<template>
  <div v-if="isLoading">Loading profile...</div>
  <div v-else-if="profile">
    <h2>{{ displayName }}</h2>
    <p>Type: {{ isIssuer ? "Issuer" : "Recipient" }}</p>
  </div>
</template>

<script setup>
import { useProfile } from "openbadges-ui";
import { onMounted } from "vue";

const { profile, isLoading, error, isIssuer, displayName, loadProfile } =
  useProfile();

onMounted(async () => {
  await loadProfile("profile-123", "Issuer");
});
</script>
```

## Accessibility and Theming

### Themes

The library includes several built-in themes:

- Default theme
- Dark theme
- High contrast theme
- Large text theme
- Dyslexia-friendly theme

#### Applying Themes

```javascript
import { AccessibilityService } from "openbadges-ui";

// Apply dark theme
AccessibilityService.applyTheme("dark");

// Apply high contrast theme
AccessibilityService.applyTheme("high-contrast");

// Apply large text theme
AccessibilityService.applyTheme("large-text");

// Apply dyslexia-friendly theme
AccessibilityService.applyTheme("dyslexia-friendly");

// Reset to default theme
AccessibilityService.applyTheme("default");
```

Or use CSS classes directly:

```html
<body class="ob-dark-theme">
  <!-- Your app content -->
</body>
```

### Accessibility Services

The library provides utility services for accessibility:

#### AccessibilityService

```javascript
import { AccessibilityService } from "openbadges-ui";

// Generate alt text for badge images
const altText = AccessibilityService.generateBadgeAltText("AI Ethics Badge");

// Format dates accessibly
const formattedDate = AccessibilityService.formatDate("2025-01-15T12:00:00Z");

// Get initials for avatar placeholders
const initials = AccessibilityService.getInitials("John Doe"); // Returns "JD"

// Check if reduced motion is preferred
const reducedMotion = AccessibilityService.prefersReducedMotion();
```

#### AccessibilityAudit

For developers to check their implementations:

```javascript
import { AccessibilityAudit } from "openbadges-ui";

// Audit an element for accessibility issues
const element = document.querySelector(".my-component");
const issues = AccessibilityAudit.auditElement(element);

// Check ARIA attributes
const ariaIssues = AccessibilityAudit.checkAriaAttributes(element);

// Check keyboard navigation
const keyboardIssues = AccessibilityAudit.checkKeyboardNavigation(element);
```
