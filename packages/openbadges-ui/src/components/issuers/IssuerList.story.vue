<script setup lang="ts">
import { ref } from "vue";
import IssuerList from "./IssuerList.vue";
import type { OB2, OB3 } from "openbadges-types";

/**
 * # IssuerList
 *
 * The `IssuerList` component displays a collection of badge issuers with search,
 * filtering, and pagination capabilities.
 *
 * ## Features
 *
 * - Displays issuers in grid or list layout
 * - Built-in search by name and description
 * - Density controls for different display contexts
 * - Pagination for large collections
 * - Loading and empty state handling
 * - Supports both OB2 and OB3 profile formats
 *
 * ## Props
 *
 * | Name | Type | Default | Description |
 * |------|------|---------|-------------|
 * | `issuers` | `(OB2.Profile \| OB3.Profile)[]` | Required | Array of issuers to display |
 * | `layout` | `'grid' \| 'list'` | `'grid'` | Layout mode |
 * | `loading` | `boolean` | `false` | Show loading state |
 * | `pageSize` | `number` | `9` | Items per page |
 * | `currentPage` | `number` | `1` | Current page number |
 * | `showPagination` | `boolean` | `false` | Show pagination controls |
 * | `density` | `'compact' \| 'normal' \| 'spacious'` | `'normal'` | Display density |
 * | `ariaLabel` | `string` | `'List of issuers'` | Accessibility label |
 *
 * ## Events
 *
 * | Name | Payload | Description |
 * |------|---------|-------------|
 * | `issuer-click` | `OB2.Profile \| OB3.Profile` | Emitted when an issuer is clicked |
 * | `page-change` | `number` | Emitted when page changes |
 * | `update:density` | `'compact' \| 'normal' \| 'spacious'` | Emitted when density changes |
 */

// Mock issuers for stories
const mockIssuers: (OB2.Profile | OB3.Profile)[] = [
  {
    id: "https://example.org/issuers/1",
    type: "Profile",
    name: "Tech Academy",
    url: "https://tech-academy.edu",
    email: "badges@tech-academy.edu",
    description: "A leading technology education institution.",
    image: "https://placehold.co/200x200/3182ce/white?text=TA",
  } as OB2.Profile,
  {
    id: "https://example.org/issuers/2",
    type: ["Profile"] as [string, ...string[]],
    name: "Digital Skills Institute",
    url: "https://digital-skills.org",
    description: "Empowering professionals with verified digital competencies.",
    image: {
      id: "https://placehold.co/200x200/38a169/white?text=DSI",
      type: "Image" as const,
    },
  } as OB3.Profile,
  {
    id: "https://example.org/issuers/3",
    type: "Profile",
    name: "Open Learning Foundation",
    url: "https://open-learning.org",
    description: "Promoting open education and accessible credentials.",
  } as OB2.Profile,
  {
    id: "https://example.org/issuers/4",
    type: "Profile",
    name: "Cloud Certifications Inc",
    url: "https://cloud-certs.com",
    description: "Industry-recognized cloud computing certifications.",
    image: "https://placehold.co/200x200/805ad5/white?text=CC",
  } as OB2.Profile,
  {
    id: "https://example.org/issuers/5",
    type: "Profile",
    name: "Data Science Academy",
    url: "https://ds-academy.io",
    description: "Comprehensive data science and analytics training.",
    image: "https://placehold.co/200x200/d53f8c/white?text=DSA",
  } as OB2.Profile,
  {
    id: "https://example.org/issuers/6",
    type: "Profile",
    name: "Cybersecurity Institute",
    url: "https://cyber-institute.net",
    description: "Professional cybersecurity certifications and training.",
    image: "https://placehold.co/200x200/2c5282/white?text=CI",
  } as OB2.Profile,
];

const state = ref({
  issuers: mockIssuers,
  layout: "grid" as "grid" | "list",
  loading: false,
  pageSize: 4,
  currentPage: 1,
  showPagination: false,
  density: "normal" as "compact" | "normal" | "spacious",
  ariaLabel: "List of badge issuers",
});

function onIssuerClick(issuer: OB2.Profile | OB3.Profile): void {
  console.log("Issuer clicked:", issuer);
}

function onPageChange(page: number): void {
  console.log("Page changed:", page);
  state.value.currentPage = page;
}

function onDensityChange(density: "compact" | "normal" | "spacious"): void {
  console.log("Density changed:", density);
  state.value.density = density;
}
</script>

<template>
  <Story
    title="Components/Directory/IssuerList"
    :layout="{ type: 'single', iframe: true }"
  >
    <template #docs>
      <div class="histoire-docs">
        <h1>IssuerList</h1>

        <p>
          The <code>IssuerList</code> component displays a searchable,
          filterable collection of badge issuers with support for both grid and
          list layouts.
        </p>

        <h2>When To Use</h2>
        <ul>
          <li>When building an issuer directory page</li>
          <li>When allowing users to browse and select issuers</li>
          <li>When displaying search results for issuers</li>
        </ul>

        <h2>Examples</h2>

        <h3>Basic Usage</h3>
        <pre><code>&lt;IssuerList :issuers="myIssuers" @issuer-click="handleClick" /&gt;</code></pre>

        <h3>With Pagination</h3>
        <pre><code>&lt;IssuerList
  :issuers="myIssuers"
  :page-size="9"
  show-pagination
  @issuer-click="handleClick"
  @page-change="handlePageChange"
/&gt;</code></pre>

        <h2>Accessibility</h2>
        <ul>
          <li>Search input has appropriate label</li>
          <li>Loading and empty states are announced to screen readers</li>
          <li>Pagination controls are keyboard accessible</li>
          <li>Density selector has ARIA label</li>
        </ul>
      </div>
    </template>

    <template #controls>
      <HstSelect
        v-model="state.layout"
        title="Layout"
        :options="[
          { label: 'Grid', value: 'grid' },
          { label: 'List', value: 'list' },
        ]"
      />
      <HstSelect
        v-model="state.density"
        title="Density"
        :options="[
          { label: 'Compact', value: 'compact' },
          { label: 'Normal', value: 'normal' },
          { label: 'Spacious', value: 'spacious' },
        ]"
      />
      <HstCheckbox v-model="state.loading" title="Loading" />
      <HstCheckbox v-model="state.showPagination" title="Show Pagination" />
      <HstNumber v-model="state.pageSize" title="Page Size" />
    </template>

    <Variant title="Grid Layout">
      <IssuerList
        :issuers="state.issuers"
        layout="grid"
        :loading="state.loading"
        :page-size="state.pageSize"
        :current-page="state.currentPage"
        :show-pagination="state.showPagination"
        :density="state.density"
        :aria-label="state.ariaLabel"
        @issuer-click="onIssuerClick"
        @page-change="onPageChange"
        @update:density="onDensityChange"
      />
    </Variant>

    <Variant title="List Layout">
      <IssuerList
        :issuers="state.issuers"
        layout="list"
        :loading="state.loading"
        :page-size="state.pageSize"
        :current-page="state.currentPage"
        :show-pagination="state.showPagination"
        :density="state.density"
        :aria-label="state.ariaLabel"
        @issuer-click="onIssuerClick"
        @page-change="onPageChange"
        @update:density="onDensityChange"
      />
    </Variant>

    <Variant title="With Pagination">
      <IssuerList
        :issuers="state.issuers"
        :layout="state.layout"
        :loading="state.loading"
        :page-size="3"
        :current-page="state.currentPage"
        show-pagination
        :density="state.density"
        :aria-label="state.ariaLabel"
        @issuer-click="onIssuerClick"
        @page-change="onPageChange"
        @update:density="onDensityChange"
      />
    </Variant>

    <Variant title="Loading State">
      <IssuerList
        :issuers="[]"
        :layout="state.layout"
        loading
        :page-size="state.pageSize"
        :current-page="state.currentPage"
        :show-pagination="state.showPagination"
        :density="state.density"
        :aria-label="state.ariaLabel"
        @issuer-click="onIssuerClick"
        @page-change="onPageChange"
        @update:density="onDensityChange"
      />
    </Variant>

    <Variant title="Empty State">
      <IssuerList
        :issuers="[]"
        :layout="state.layout"
        :loading="false"
        :page-size="state.pageSize"
        :current-page="state.currentPage"
        :show-pagination="state.showPagination"
        :density="state.density"
        :aria-label="state.ariaLabel"
        @issuer-click="onIssuerClick"
        @page-change="onPageChange"
        @update:density="onDensityChange"
      />
    </Variant>

    <Variant title="Custom Empty Slot">
      <IssuerList
        :issuers="[]"
        :layout="state.layout"
        :loading="false"
        :page-size="state.pageSize"
        :current-page="state.currentPage"
        :show-pagination="state.showPagination"
        :density="state.density"
        :aria-label="state.ariaLabel"
        @issuer-click="onIssuerClick"
        @page-change="onPageChange"
        @update:density="onDensityChange"
      >
        <template #empty>
          <div style="padding: 2rem; text-align: center">
            <p style="font-size: 1.25rem; margin-bottom: 1rem">
              No issuers found
            </p>
            <p style="color: #666">
              Try adjusting your search or become an issuer yourself!
            </p>
          </div>
        </template>
      </IssuerList>
    </Variant>
  </Story>
</template>
