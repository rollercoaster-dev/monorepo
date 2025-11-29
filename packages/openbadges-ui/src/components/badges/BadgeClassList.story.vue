<script setup lang="ts">
import { ref } from "vue";
import BadgeClassList from "./BadgeClassList.vue";
import type { OB2, OB3 } from "openbadges-types";

/**
 * # BadgeClassList
 *
 * The `BadgeClassList` component displays a collection of badge classes with search,
 * filtering by issuer/tags, and pagination capabilities.
 *
 * ## Features
 *
 * - Displays badges in grid or list layout
 * - Built-in search by name and description
 * - Filter by issuer dropdown
 * - Filter by tag dropdown
 * - Clear filters button
 * - Density controls for different display contexts
 * - Pagination for large collections
 * - Loading and empty state handling
 * - Supports both OB2 BadgeClass and OB3 Achievement formats
 *
 * ## Props
 *
 * | Name | Type | Default | Description |
 * |------|------|---------|-------------|
 * | `badgeClasses` | `(OB2.BadgeClass \| OB3.Achievement)[]` | Required | Array of badge classes |
 * | `layout` | `'grid' \| 'list'` | `'grid'` | Layout mode |
 * | `loading` | `boolean` | `false` | Show loading state |
 * | `pageSize` | `number` | `9` | Items per page |
 * | `currentPage` | `number` | `1` | Current page number |
 * | `showPagination` | `boolean` | `false` | Show pagination controls |
 * | `density` | `'compact' \| 'normal' \| 'spacious'` | `'normal'` | Display density |
 * | `ariaLabel` | `string` | `'List of badge classes'` | Accessibility label |
 *
 * ## Events
 *
 * | Name | Payload | Description |
 * |------|---------|-------------|
 * | `badge-class-click` | `OB2.BadgeClass \| OB3.Achievement` | Emitted when a badge is clicked |
 * | `page-change` | `number` | Emitted when page changes |
 * | `update:density` | `'compact' \| 'normal' \| 'spacious'` | Emitted when density changes |
 */

// Mock badge classes for stories
const mockBadgeClasses: (OB2.BadgeClass | OB3.Achievement)[] = [
  {
    id: "https://example.org/badges/1",
    type: "BadgeClass",
    name: "Web Developer Certificate",
    description: "Demonstrates proficiency in modern web development.",
    image: "https://placehold.co/200x200/3182ce/white?text=WD",
    criteria: { narrative: "Complete all web dev courses." },
    issuer: { id: "https://example.org/issuers/1", name: "Tech Academy" },
    tags: ["web", "javascript", "html", "css"],
  } as OB2.BadgeClass,
  {
    id: "https://example.org/badges/2",
    type: ["Achievement"] as [string, ...string[]],
    name: "Data Science Fundamentals",
    description: "Understanding of core data science concepts.",
    image: {
      id: "https://placehold.co/200x200/805ad5/white?text=DS",
      type: "Image" as const,
    },
    criteria: { narrative: "Pass the data science assessment." },
    creator: { id: "https://example.org/issuers/2", name: "Data Institute" },
  } as OB3.Achievement,
  {
    id: "https://example.org/badges/3",
    type: "BadgeClass",
    name: "Cloud Architecture",
    description: "Expertise in cloud computing architectures.",
    image: "https://placehold.co/200x200/38a169/white?text=CA",
    criteria: { narrative: "Design and deploy cloud solutions." },
    issuer: { id: "https://example.org/issuers/1", name: "Tech Academy" },
    tags: ["cloud", "aws", "architecture"],
  } as OB2.BadgeClass,
  {
    id: "https://example.org/badges/4",
    type: "BadgeClass",
    name: "Cybersecurity Essentials",
    description: "Foundational cybersecurity knowledge and skills.",
    image: "https://placehold.co/200x200/e53e3e/white?text=CS",
    criteria: { narrative: "Complete security assessment." },
    issuer: { id: "https://example.org/issuers/3", name: "Security Institute" },
    tags: ["security", "networking"],
  } as OB2.BadgeClass,
  {
    id: "https://example.org/badges/5",
    type: "BadgeClass",
    name: "Machine Learning Practitioner",
    description: "Practical machine learning implementation skills.",
    image: "https://placehold.co/200x200/d53f8c/white?text=ML",
    criteria: { narrative: "Build and deploy ML models." },
    issuer: { id: "https://example.org/issuers/2", name: "Data Institute" },
    tags: ["ml", "python", "ai"],
  } as OB2.BadgeClass,
  {
    id: "https://example.org/badges/6",
    type: "BadgeClass",
    name: "DevOps Engineer",
    description: "CI/CD pipelines and infrastructure automation.",
    image: "https://placehold.co/200x200/2c5282/white?text=DO",
    criteria: { narrative: "Implement CI/CD workflows." },
    issuer: { id: "https://example.org/issuers/1", name: "Tech Academy" },
    tags: ["devops", "docker", "kubernetes", "ci-cd"],
  } as OB2.BadgeClass,
  {
    id: "https://example.org/badges/7",
    type: "BadgeClass",
    name: "UI/UX Design",
    description: "User interface and user experience design principles.",
    image: "https://placehold.co/200x200/ed8936/white?text=UX",
    criteria: { narrative: "Create a design portfolio." },
    issuer: { id: "https://example.org/issuers/4", name: "Design School" },
    tags: ["design", "ux", "ui", "figma"],
  } as OB2.BadgeClass,
];

const state = ref({
  badgeClasses: mockBadgeClasses,
  layout: "grid" as "grid" | "list",
  loading: false,
  pageSize: 4,
  currentPage: 1,
  showPagination: false,
  density: "normal" as "compact" | "normal" | "spacious",
  ariaLabel: "List of available badges",
});

function onBadgeClassClick(badgeClass: OB2.BadgeClass | OB3.Achievement): void {
  console.log("Badge class clicked:", badgeClass);
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
    title="Components/Directory/BadgeClassList"
    :layout="{ type: 'single', iframe: true }"
  >
    <template #docs>
      <div class="histoire-docs">
        <h1>BadgeClassList</h1>

        <p>
          The <code>BadgeClassList</code> component displays a searchable,
          filterable collection of badge classes with support for grid and list
          layouts.
        </p>

        <h2>When To Use</h2>
        <ul>
          <li>When building a badge catalog or directory page</li>
          <li>When allowing users to browse and select badges to earn</li>
          <li>When displaying search results for badges</li>
        </ul>

        <h2>Examples</h2>

        <h3>Basic Usage</h3>
        <pre><code>&lt;BadgeClassList :badge-classes="myBadges" @badge-class-click="handleClick" /&gt;</code></pre>

        <h3>With Pagination</h3>
        <pre><code>&lt;BadgeClassList
  :badge-classes="myBadges"
  :page-size="9"
  show-pagination
  @badge-class-click="handleClick"
  @page-change="handlePageChange"
/&gt;</code></pre>

        <h2>Filtering</h2>
        <p>The component provides built-in filtering by:</p>
        <ul>
          <li><strong>Search</strong> - Filter by name or description</li>
          <li><strong>Issuer</strong> - Dropdown to filter by issuer</li>
          <li><strong>Tags</strong> - Dropdown to filter by tag</li>
        </ul>
        <p>A "Clear Filters" button appears when any filter is active.</p>

        <h2>Accessibility</h2>
        <ul>
          <li>Search and filter inputs have appropriate labels</li>
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
      <BadgeClassList
        :badge-classes="state.badgeClasses"
        layout="grid"
        :loading="state.loading"
        :page-size="state.pageSize"
        :current-page="state.currentPage"
        :show-pagination="state.showPagination"
        :density="state.density"
        :aria-label="state.ariaLabel"
        @badge-class-click="onBadgeClassClick"
        @page-change="onPageChange"
        @update:density="onDensityChange"
      />
    </Variant>

    <Variant title="List Layout">
      <BadgeClassList
        :badge-classes="state.badgeClasses"
        layout="list"
        :loading="state.loading"
        :page-size="state.pageSize"
        :current-page="state.currentPage"
        :show-pagination="state.showPagination"
        :density="state.density"
        :aria-label="state.ariaLabel"
        @badge-class-click="onBadgeClassClick"
        @page-change="onPageChange"
        @update:density="onDensityChange"
      />
    </Variant>

    <Variant title="With Pagination">
      <BadgeClassList
        :badge-classes="state.badgeClasses"
        :layout="state.layout"
        :loading="state.loading"
        :page-size="3"
        :current-page="state.currentPage"
        show-pagination
        :density="state.density"
        :aria-label="state.ariaLabel"
        @badge-class-click="onBadgeClassClick"
        @page-change="onPageChange"
        @update:density="onDensityChange"
      />
    </Variant>

    <Variant title="Loading State">
      <BadgeClassList
        :badge-classes="[]"
        :layout="state.layout"
        loading
        :page-size="state.pageSize"
        :current-page="state.currentPage"
        :show-pagination="state.showPagination"
        :density="state.density"
        :aria-label="state.ariaLabel"
        @badge-class-click="onBadgeClassClick"
        @page-change="onPageChange"
        @update:density="onDensityChange"
      />
    </Variant>

    <Variant title="Empty State">
      <BadgeClassList
        :badge-classes="[]"
        :layout="state.layout"
        :loading="false"
        :page-size="state.pageSize"
        :current-page="state.currentPage"
        :show-pagination="state.showPagination"
        :density="state.density"
        :aria-label="state.ariaLabel"
        @badge-class-click="onBadgeClassClick"
        @page-change="onPageChange"
        @update:density="onDensityChange"
      />
    </Variant>

    <Variant title="Custom Empty Slot">
      <BadgeClassList
        :badge-classes="[]"
        :layout="state.layout"
        :loading="false"
        :page-size="state.pageSize"
        :current-page="state.currentPage"
        :show-pagination="state.showPagination"
        :density="state.density"
        :aria-label="state.ariaLabel"
        @badge-class-click="onBadgeClassClick"
        @page-change="onPageChange"
        @update:density="onDensityChange"
      >
        <template #empty>
          <div style="padding: 2rem; text-align: center">
            <p style="font-size: 1.25rem; margin-bottom: 1rem">
              No badges available
            </p>
            <p style="color: #666">
              Check back later or explore other categories!
            </p>
          </div>
        </template>
      </BadgeClassList>
    </Variant>
  </Story>
</template>
