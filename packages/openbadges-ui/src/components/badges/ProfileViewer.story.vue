<script setup lang="ts">
import { ref } from 'vue';
import ProfileViewer from './ProfileViewer.vue';
import { mockProfiles } from '../../services/mockData';

const state = ref({
  profile: mockProfiles.alice,
  badges: mockProfiles.alice.badges,
  loading: false,
  badgesLayout: 'grid',
  badgesInteractive: true,
  showPagination: false,
  pageSize: 6,
});

function onBadgeClick(badge) {
  console.log('Badge clicked:', badge);
}
</script>

<template>
  <Story
    title="Components/Badges/ProfileViewer"
    :layout="{ type: 'single', iframe: true }"
  >
    <template #docs>
      <div class="histoire-docs">
        <h1>ProfileViewer</h1>
        <p>
          The <code>ProfileViewer</code> component displays a user or issuer profile along with their badges. It supports grid and list layouts, pagination, and interactive badge actions. The component is designed with accessibility and theme customization in mind.
        </p>
        <h2>When To Use</h2>
        <ul>
          <li>To display a profile (recipient or issuer) with associated badges</li>
          <li>To provide interactive badge viewing and actions</li>
          <li>To support different layouts and accessibility needs</li>
        </ul>
        <h2>Examples</h2>
        <p>Use the controls in the right panel to customize the component behavior.</p>
        <h3>Basic Usage</h3>
        <pre><code>&lt;ProfileViewer :profile="myProfile" :badges="myBadges" /&gt;</code></pre>
        <h3>List Layout</h3>
        <pre><code>&lt;ProfileViewer :profile="myProfile" :badges="myBadges" badges-layout="list" /&gt;</code></pre>
        <h3>Interactive Badges</h3>
        <pre><code>&lt;ProfileViewer :profile="myProfile" :badges="myBadges" :badges-interactive="true" @badge-click="handleBadgeClick" /&gt;</code></pre>
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
            <tr><td><code>profile</code></td><td><code>object</code></td><td>Required</td><td>The profile data (recipient or issuer)</td></tr>
            <tr><td><code>badges</code></td><td><code>array</code></td><td>Required</td><td>Array of badges to display</td></tr>
            <tr><td><code>loading</code></td><td><code>boolean</code></td><td><code>false</code></td><td>Show loading state</td></tr>
            <tr><td><code>badges-layout</code></td><td><code>'grid' | 'list'</code></td><td><code>'grid'</code></td><td>Layout for badges</td></tr>
            <tr><td><code>badges-interactive</code></td><td><code>boolean</code></td><td><code>true</code></td><td>Whether badges are clickable</td></tr>
            <tr><td><code>show-pagination</code></td><td><code>boolean</code></td><td><code>false</code></td><td>Show pagination controls</td></tr>
            <tr><td><code>page-size</code></td><td><code>number</code></td><td><code>6</code></td><td>Badges per page</td></tr>
          </tbody>
        </table>
        <h2>Events</h2>
        <table>
          <thead>
            <tr><th>Name</th><th>Payload</th><th>Description</th></tr>
          </thead>
          <tbody>
            <tr><td><code>badge-click</code></td><td><code>object</code></td><td>Emitted when a badge is clicked</td></tr>
          </tbody>
        </table>
        <h2>Slots</h2>
        <table>
          <thead>
            <tr><th>Name</th><th>Description</th></tr>
          </thead>
          <tbody>
            <tr><td><code>profile-header</code></td><td>Custom content for the profile header</td></tr>
            <tr><td><code>badge</code></td><td>Custom rendering for each badge</td></tr>
          </tbody>
        </table>
        <h2>Accessibility</h2>
        <ul>
          <li>Profile and badges are grouped with appropriate ARIA roles</li>
          <li>Keyboard navigation is supported for badge actions</li>
          <li>Supports high contrast and dyslexia-friendly themes</li>
          <li>Screen reader labels for profile and badge sections</li>
        </ul>
        <h2>Theme & Accessibility Example</h2>
        <pre><code>&lt;ProfileViewer :profile="myProfile" :badges="myBadges" badges-layout="grid" :badges-interactive="true" /&gt;

// To apply a theme:
import { AccessibilityService } from 'openbadges-ui';
AccessibilityService.applyTheme('dyslexia');
</code></pre>
      </div>
    </template>

    <template #controls>
      <HstSelect
        v-model="state.badgesLayout"
        title="Badges Layout"
      >
        <option value="grid">
          Grid
        </option>
        <option value="list">
          List
        </option>
      </HstSelect>
      <HstCheckbox
        v-model="state.badgesInteractive"
        title="Badges Interactive"
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
    </template>

    <Variant title="Recipient Profile">
      <ProfileViewer
        :profile="mockProfiles.alice"
        :badges="mockProfiles.alice.badges"
        :loading="state.loading"
        :badges-layout="state.badgesLayout"
        :badges-interactive="state.badgesInteractive"
        :show-pagination="state.showPagination"
        :page-size="state.pageSize"
        @badge-click="onBadgeClick"
      />
    </Variant>

    <Variant title="Issuer Profile">
      <ProfileViewer
        :profile="mockProfiles.manus"
        :badges="mockProfiles.manus.badges"
        :loading="state.loading"
        :badges-layout="state.badgesLayout"
        :badges-interactive="state.badgesInteractive"
        :show-pagination="state.showPagination"
        :page-size="state.pageSize"
        @badge-click="onBadgeClick"
      />
    </Variant>

    <Variant title="With List Layout">
      <ProfileViewer
        :profile="mockProfiles.alice"
        :badges="mockProfiles.alice.badges"
        :loading="state.loading"
        badges-layout="list"
        :badges-interactive="state.badgesInteractive"
        :show-pagination="state.showPagination"
        :page-size="state.pageSize"
        @badge-click="onBadgeClick"
      />
    </Variant>

    <Variant title="With Pagination">
      <ProfileViewer
        :profile="mockProfiles.alice"
        :badges="mockProfiles.alice.badges"
        :loading="state.loading"
        :badges-layout="state.badgesLayout"
        :badges-interactive="state.badgesInteractive"
        show-pagination
        :page-size="2"
        @badge-click="onBadgeClick"
      />
    </Variant>

    <Variant title="Loading">
      <ProfileViewer
        :profile="mockProfiles.alice"
        :badges="[]"
        loading
        :badges-layout="state.badgesLayout"
        :badges-interactive="state.badgesInteractive"
        :show-pagination="state.showPagination"
        :page-size="state.pageSize"
        @badge-click="onBadgeClick"
      />
    </Variant>
  </Story>
</template>
