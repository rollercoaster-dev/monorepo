<script setup lang="ts">
import { ref } from "vue";
import IssuerDashboard from "./IssuerDashboard.vue";
import { mockAssertions } from "../../services/mockData";

const state = ref({
  issuerProfile: {
    id: "https://example.org/issuer",
    name: "Rollercoaster.dev",
    url: "https://example.org",
    email: "badges@example.org",
    image:
      "https://ui-avatars.com/api/?name=Manus+AI&background=0D8ABC&color=fff",
  },
  initialBadges: mockAssertions,
  loading: false,
});

function onBadgeIssued(assertion) {
  console.log("Badge issued:", assertion);
}

function onBadgeClick(badge) {
  console.log("Badge clicked:", badge);
}
</script>

<template>
  <Story
    title="Components/Issuing/IssuerDashboard"
    :layout="{ type: 'single', iframe: true }"
  >
    <template #controls>
      <HstCheckbox v-model="state.loading" title="Loading" />
    </template>

    <Variant title="Default">
      <IssuerDashboard
        :issuer-profile="state.issuerProfile"
        :initial-badges="state.initialBadges"
        :loading="state.loading"
        @badge-issued="onBadgeIssued"
        @badge-click="onBadgeClick"
      />
    </Variant>

    <Variant title="Empty Badges">
      <IssuerDashboard
        :issuer-profile="state.issuerProfile"
        :initial-badges="[]"
        :loading="state.loading"
        @badge-issued="onBadgeIssued"
        @badge-click="onBadgeClick"
      />
    </Variant>

    <template #docs>
      <div class="histoire-docs">
        <h1>IssuerDashboard</h1>
        <p>
          The <code>IssuerDashboard</code> component provides a dashboard
          interface for badge issuers to manage and review issued badges. It
          supports filtering, loading states, and accessibility features.
        </p>
        <h2>When To Use</h2>
        <ul>
          <li>To provide issuers with an overview of all issued badges</li>
          <li>To allow management and review of badge issuance</li>
        </ul>
        <h2>Examples</h2>
        <p>Use the controls and variants to see different dashboard states.</p>
        <h3>Basic Usage</h3>
        <pre><code>&lt;IssuerDashboard :issuer-profile="myIssuer" :initial-badges="myBadges" /&gt;</code></pre>
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
              <td><code>issuer-profile</code></td>
              <td><code>object</code></td>
              <td>Required</td>
              <td>Issuer profile data</td>
            </tr>
            <tr>
              <td><code>initial-badges</code></td>
              <td><code>array</code></td>
              <td><code>[]</code></td>
              <td>Initial list of badges</td>
            </tr>
            <tr>
              <td><code>loading</code></td>
              <td><code>boolean</code></td>
              <td><code>false</code></td>
              <td>Show loading state</td>
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
              <td><code>badge-issued</code></td>
              <td><code>object</code></td>
              <td>Emitted when a badge is issued from the dashboard</td>
            </tr>
            <tr>
              <td><code>badge-click</code></td>
              <td><code>object</code></td>
              <td>Emitted when a badge is clicked</td>
            </tr>
          </tbody>
        </table>
        <h2>Accessibility</h2>
        <ul>
          <li>Dashboard and badge lists have ARIA roles and labels</li>
          <li>Keyboard navigation is fully supported</li>
          <li>Works with high contrast and accessible themes</li>
        </ul>
        <h2>Theme Example</h2>
        <pre><code>// To apply a theme:
import { AccessibilityService } from 'openbadges-ui';
AccessibilityService.applyTheme('dark');
</code></pre>
      </div>
    </template>
  </Story>
</template>
