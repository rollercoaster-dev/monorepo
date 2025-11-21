<script setup lang="ts">
import { ref } from 'vue';
import BadgeList from './BadgeList.vue';
import { mockAssertions } from '../../services/mockData';

/**
 * # BadgeList
 *
 * The `BadgeList` component displays a collection of badges with filtering and sorting capabilities.
 * It supports both grid and list layouts, pagination, and loading states.
 *
 * ## Features
 *
 * - Displays a collection of badges in grid or list layout
 * - Supports pagination for large collections
 * - Shows loading state while badges are being fetched
 * - Handles empty state with customizable message
 * - Supports interactive badges that can be clicked
 * - Normalizes badges from different formats (OB2 and OB3)
 * - Includes neurodiversity-focused controls (density, filtering, earned status)
 * - Supports progressive disclosure (expand/collapse)
 *
 * ## Props
 *
 * | Name | Type | Default | Description |
 * |------|------|---------|-------------|
 * | `badges` | `(OB2.Assertion \| OB3.VerifiableCredential)[]` | Required | Array of badges to display |
 * | `layout` | `'grid' \| 'list'` | `'grid'` | Layout mode for displaying badges |
 * | `interactive` | `boolean` | `true` | Whether badges are clickable |
 * | `loading` | `boolean` | `false` | Whether to show loading state |
 * | `pageSize` | `number` | `9` | Number of badges to display per page |
 * | `currentPage` | `number` | `1` | Current page number |
 * | `showPagination` | `boolean` | `false` | Whether to show pagination controls |
 * | `ariaLabel` | `string` | `'List of badges'` | Accessibility label for the badge list |
 * | `density` | `'compact' \| 'normal' \| 'spacious'` | `'normal'` | Controls the display density for neurodiversity support |
 * | `filterText` | `string` | `''` | Text to filter badges |
 * | `filterEarned` | `'all' \| 'earned' \| 'not-earned'` | `'all'` | Filter badges by earned status |
 *
 * ## Events
 *
 * | Name | Payload | Description |
 * |------|---------|-------------|
 * | `badge-click` | `OB2.Assertion \| OB3.VerifiableCredential` | Emitted when a badge is clicked |
 * | `page-change` | `number` | Emitted when the current page changes |
 *
 * ## Slots
 *
 * | Name | Props | Description |
 * |------|-------|-------------|
 * | `empty` | None | Content to display when there are no badges |
 * | `badge` | `{ badge, normalized }` | Custom badge rendering |
 *
 * ## Accessibility
 *
 * - The badge list has an appropriate ARIA label
 * - Loading state is announced to screen readers
 * - Empty state is announced to screen readers
 * - Pagination controls are keyboard accessible
 * - Progressive disclosure (expand/collapse) reduces cognitive load
 * - Display density options for sensory needs
 * - Simple, clear filtering for cognitive accessibility
 * - Enhanced keyboard navigation and focus indicators
 */

const state = ref({
  badges: mockAssertions,
  layout: 'grid',
  interactive: true,
  loading: false,
  pageSize: 9,
  currentPage: 1,
  showPagination: false,
  ariaLabel: 'List of badges',
  density: 'normal',
  filterText: '',
  filterEarned: 'all',
});

function onBadgeClick(badge) {
  console.log('Badge clicked:', badge);
}

function onPageChange(page) {
  console.log('Page changed:', page);
  state.value.currentPage = page;
}
</script>

<template>
  <Story
    title="Components/Badges/BadgeList"
    :layout="{ type: 'single', iframe: true }"
  >
    <template #docs>
      <div class="histoire-docs">
        <h1>BadgeList</h1>

        <p>
          The <code>BadgeList</code> component displays a collection of badges with filtering, neurodiversity-focused controls, progressive disclosure, and display density options. It supports both grid and list layouts, pagination, and loading states.
        </p>

        <h2>When To Use</h2>
        <ul>
          <li>When you need to display multiple badges in a collection</li>
          <li>When you want to provide pagination for large collections of badges</li>
          <li>When you need to show a loading state while badges are being fetched</li>
          <li>When you want to provide different layout options (grid or list)</li>
          <li>When you want to support neurodiversity-focused features</li>
        </ul>

        <h2>Examples</h2>
        <p>Use the controls in the right panel to customize the component behavior.</p>

        <h3>Basic Usage</h3>
        <pre><code>&lt;BadgeList :badges="myBadges" /&gt;</code></pre>

        <h3>List Layout</h3>
        <pre><code>&lt;BadgeList :badges="myBadges" layout="list" /&gt;</code></pre>

        <h3>With Pagination</h3>
        <pre><code>&lt;BadgeList
  :badges="myBadges"
  :page-size="10"
  :current-page="1"
  :show-pagination="true"
  @page-change="handlePageChange"
/&gt;</code></pre>

        <h3>Custom Empty State</h3>
        <pre><code>&lt;BadgeList :badges="[]"&gt;
  &lt;template #empty&gt;
    &lt;p&gt;No badges found. Earn your first badge!&lt;/p&gt;
  &lt;/template&gt;
&lt;/BadgeList&gt;</code></pre>

        <h3>With Density and Neurodiversity Controls</h3>
        <pre><code>&lt;BadgeList
  :badges="myBadges"
  density="spacious"
  :filter-text="filterText"
  :filter-earned="filterEarned"
/&gt;</code></pre>

        <h3>Progressive Disclosure (Expand/Collapse)</h3>
        <p>Click a badge or press Enter to expand/collapse details for reduced cognitive load.</p>

        <h2>Props</h2>
        <table>
          <thead>
            <tr>
              <th>Name</th>
              <th>Type</th>
              <th>Default</th>
              <th>Description</th>
            </tr>
          </thead>
          <tbody>
            <tr>
              <td><code>badges</code></td>
              <td><code>(OB2.Assertion | OB3.VerifiableCredential)[]</code></td>
              <td>Required</td>
              <td>Array of badges to display</td>
            </tr>
            <tr>
              <td><code>layout</code></td>
              <td><code>'grid' | 'list'</code></td>
              <td><code>'grid'</code></td>
              <td>Layout mode for displaying badges</td>
            </tr>
            <tr>
              <td><code>interactive</code></td>
              <td><code>boolean</code></td>
              <td><code>true</code></td>
              <td>Whether badges are clickable</td>
            </tr>
            <tr>
              <td><code>loading</code></td>
              <td><code>boolean</code></td>
              <td><code>false</code></td>
              <td>Whether to show loading state</td>
            </tr>
            <tr>
              <td><code>pageSize</code></td>
              <td><code>number</code></td>
              <td><code>9</code></td>
              <td>Number of badges to display per page</td>
            </tr>
            <tr>
              <td><code>currentPage</code></td>
              <td><code>number</code></td>
              <td><code>1</code></td>
              <td>Current page number</td>
            </tr>
            <tr>
              <td><code>showPagination</code></td>
              <td><code>boolean</code></td>
              <td><code>false</code></td>
              <td>Whether to show pagination controls</td>
            </tr>
            <tr>
              <td><code>ariaLabel</code></td>
              <td><code>string</code></td>
              <td><code>'List of badges'</code></td>
              <td>Accessibility label for the badge list</td>
            </tr>
            <tr>
              <td><code>density</code></td>
              <td><code>'compact' | 'normal' | 'spacious'</code></td>
              <td><code>'normal'</code></td>
              <td>Controls the display density for neurodiversity support</td>
            </tr>
            <tr>
              <td><code>filterText</code></td>
              <td><code>string</code></td>
              <td><code>''</code></td>
              <td>Text to filter badges</td>
            </tr>
            <tr>
              <td><code>filterEarned</code></td>
              <td><code>'all' | 'earned' | 'not-earned'</code></td>
              <td><code>'all'</code></td>
              <td>Filter badges by earned status</td>
            </tr>
          </tbody>
        </table>

        <h2>Events</h2>
        <table>
          <thead>
            <tr>
              <th>Name</th>
              <th>Payload</th>
              <th>Description</th>
            </tr>
          </thead>
          <tbody>
            <tr>
              <td><code>badge-click</code></td>
              <td><code>OB2.Assertion | OB3.VerifiableCredential</code></td>
              <td>Emitted when a badge is clicked</td>
            </tr>
            <tr>
              <td><code>page-change</code></td>
              <td><code>number</code></td>
              <td>Emitted when the current page changes</td>
            </tr>
          </tbody>
        </table>

        <h2>Slots</h2>
        <table>
          <thead>
            <tr>
              <th>Name</th>
              <th>Props</th>
              <th>Description</th>
            </tr>
          </thead>
          <tbody>
            <tr>
              <td><code>empty</code></td>
              <td>None</td>
              <td>Content to display when there are no badges</td>
            </tr>
            <tr>
              <td><code>badge</code></td>
              <td><code>{ badge, normalized }</code></td>
              <td>Custom badge rendering</td>
            </tr>
          </tbody>
        </table>

        <h2>Accessibility</h2>
        <p>The component includes several accessibility features:</p>
        <ul>
          <li>The badge list has an appropriate ARIA label</li>
          <li>Loading state is announced to screen readers</li>
          <li>Empty state is announced to screen readers</li>
          <li>Pagination controls are keyboard accessible</li>
          <li>Progressive disclosure (expand/collapse) reduces cognitive load</li>
          <li>Display density options for sensory needs</li>
          <li>Simple, clear filtering for cognitive accessibility</li>
          <li>Enhanced keyboard navigation and focus indicators</li>
        </ul>
      </div>
    </template>
    <template #controls>
      <HstSelect
        v-model="state.layout"
        title="Layout"
      >
        <option value="grid">
          Grid
        </option>
        <option value="list">
          List
        </option>
      </HstSelect>
      <HstSelect
        v-model="state.density"
        title="Density"
      >
        <option value="compact">Compact</option>
        <option value="normal">Normal</option>
        <option value="spacious">Spacious</option>
      </HstSelect>
      <HstText
        v-model="state.filterText"
        title="Filter Text"
      />
      <HstSelect
        v-model="state.filterEarned"
        title="Earned Status"
      >
        <option value="all">All</option>
        <option value="earned">Earned</option>
        <option value="not-earned">Not Earned</option>
      </HstSelect>
      <HstCheckbox
        v-model="state.interactive"
        title="Interactive"
      />
      <HstCheckbox
        v-model="state.loading"
        title="Loading"
      />
      <HstCheckbox
        v-model="state.showPagination"
        title="Show Pagination"
      />
      <HstNumber
        v-model="state.pageSize"
        title="Page Size"
      />
      <HstNumber
        v-model="state.currentPage"
        title="Current Page"
      />
      <HstText
        v-model="state.ariaLabel"
        title="Aria Label"
      />
    </template>

    <Variant title="Grid Layout">
      <BadgeList
        :badges="state.badges"
        layout="grid"
        :interactive="state.interactive"
        :loading="state.loading"
        :page-size="state.pageSize"
        :current-page="state.currentPage"
        :show-pagination="state.showPagination"
        :aria-label="state.ariaLabel"
        @badge-click="onBadgeClick"
        @page-change="onPageChange"
      />
    </Variant>

    <Variant title="List Layout">
      <BadgeList
        :badges="state.badges"
        layout="list"
        :interactive="state.interactive"
        :loading="state.loading"
        :page-size="state.pageSize"
        :current-page="state.currentPage"
        :show-pagination="state.showPagination"
        :aria-label="state.ariaLabel"
        @badge-click="onBadgeClick"
        @page-change="onPageChange"
      />
    </Variant>

    <Variant title="With Pagination">
      <BadgeList
        :badges="state.badges"
        :layout="state.layout"
        :interactive="state.interactive"
        :loading="state.loading"
        :page-size="2"
        :current-page="state.currentPage"
        show-pagination
        :aria-label="state.ariaLabel"
        @badge-click="onBadgeClick"
        @page-change="onPageChange"
      />
    </Variant>

    <Variant title="Loading">
      <BadgeList
        :badges="[]"
        :layout="state.layout"
        :interactive="state.interactive"
        loading
        :page-size="state.pageSize"
        :current-page="state.currentPage"
        :show-pagination="state.showPagination"
        :aria-label="state.ariaLabel"
        @badge-click="onBadgeClick"
        @page-change="onPageChange"
      />
    </Variant>

    <Variant title="Empty">
      <BadgeList
        :badges="[]"
        :layout="state.layout"
        :interactive="state.interactive"
        :loading="false"
        :page-size="state.pageSize"
        :current-page="state.currentPage"
        :show-pagination="state.showPagination"
        :aria-label="state.ariaLabel"
        @badge-click="onBadgeClick"
        @page-change="onPageChange"
      />
    </Variant>

    <Variant title="Grid Layout with Neurodiversity Controls">
      <BadgeList
        :badges="state.badges"
        :layout="state.layout"
        :interactive="state.interactive"
        :loading="state.loading"
        :page-size="state.pageSize"
        :current-page="state.currentPage"
        :show-pagination="state.showPagination"
        :aria-label="state.ariaLabel"
        :density="state.density"
        :filter-text="state.filterText"
        :filter-earned="state.filterEarned"
        @badge-click="onBadgeClick"
        @page-change="onPageChange"
      />
    </Variant>
  </Story>
</template>
