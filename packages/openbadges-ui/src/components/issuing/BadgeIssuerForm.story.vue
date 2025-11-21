<script setup lang="ts">
import { ref } from 'vue';
import BadgeIssuerForm from './BadgeIssuerForm.vue';
import { mockBadgeClasses } from '../../services/mockData';
import type { OB2 } from '@/types';

const state = ref({
  initialBadgeClass: {},
  initialRecipientEmail: '',
});

const livePreview = ref<Partial<OB2.BadgeClass>>({});

const prefilledState = {
  initialBadgeClass: {
    ...mockBadgeClasses[0],
    name: 'Programming Excellence',
    description: 'Awarded for demonstrating exceptional programming skills',
    issuer: {
      id: 'https://example.org/issuer',
      type: 'Profile',
      name: 'Rollercoaster.dev',
    },
  },
  initialRecipientEmail: 'recipient@example.org',
};

const validationErrorState = {
  initialBadgeClass: {
    name: '', // Empty name to trigger validation error
    description: 'This badge will show validation errors',
    issuer: {
      id: 'https://example.org/issuer',
      type: 'Profile',
      name: 'Rollercoaster.dev',
    },
  },
  initialRecipientEmail: 'invalid-email', // Invalid email to trigger validation error
};

function onBadgeIssued(assertion) {
  console.log('Badge issued:', assertion);
}

function onReset() {
  console.log('Form reset');
}
</script>

<template>
  <Story
    title="Components/Issuing/BadgeIssuerForm"
    :layout="{ type: 'single', iframe: true }"
  >
    <Variant title="Empty">
      <div style="display:flex; gap: 1rem; align-items:flex-start;">
        <BadgeIssuerForm
          :initial-badge-class="state.initialBadgeClass"
          :initial-recipient-email="state.initialRecipientEmail"
          @badge-issued="onBadgeIssued"
          @reset="onReset"
          @update="(p) => (livePreview = p.badge)"
        />
        <div style="flex:1; border:1px solid #e2e8f0; border-radius:8px; padding:12px;">
          <h4 style="margin-top:0;">Live Preview</h4>
          <div><strong>Name:</strong> {{ livePreview.name || '—' }}</div>
          <div><strong>Description:</strong> {{ livePreview.description || '—' }}</div>
          <div><strong>Issuer:</strong> {{ typeof livePreview.issuer === 'object' ? livePreview.issuer?.name : '—' }}</div>
          <div><strong>Image URL:</strong> {{ typeof livePreview.image === 'object' ? livePreview.image?.id : (typeof livePreview.image === 'string' ? livePreview.image : '—') }}</div>
          <div><strong>Tags:</strong> {{ (livePreview.tags || []).join(', ') }}</div>
        </div>
      </div>
    </Variant>

    <Variant title="Prefilled">
      <BadgeIssuerForm
        :initial-badge-class="prefilledState.initialBadgeClass"
        :initial-recipient-email="prefilledState.initialRecipientEmail"
        @badge-issued="onBadgeIssued"
        @reset="onReset"
        @update="(p) => (livePreview = p.badge)"
      />
    </Variant>

    <Variant title="With Validation Errors">
      <div class="story-description">
        This story demonstrates the form with validation errors.
      </div>
      <BadgeIssuerForm
        :initial-badge-class="validationErrorState.initialBadgeClass"
        :initial-recipient-email="validationErrorState.initialRecipientEmail"
        @badge-issued="onBadgeIssued"
        @reset="onReset"
        @update="(p) => (livePreview = p.badge)"
      />
    </Variant>

    <template #docs>
      <div class="histoire-docs">
        <h1>BadgeIssuerForm</h1>
        <p>
          The <code>BadgeIssuerForm</code> component provides a form for creating and issuing new badges. It supports validation, prefilled values, and accessibility features for all users.
        </p>
        <h2>When To Use</h2>
        <ul>
          <li>To allow issuers to create and issue badges to recipients</li>
          <li>To provide a user-friendly, accessible badge issuance workflow</li>
        </ul>
        <h2>Examples</h2>
        <p>Use the controls and variants to see different form states.</p>
        <h3>Basic Usage</h3>
        <pre><code>&lt;BadgeIssuerForm @badge-issued="handleBadgeIssued" /&gt;</code></pre>
        <h3>Prefilled Form</h3>
        <pre><code>&lt;BadgeIssuerForm :initial-badge-class="myBadgeClass" :initial-recipient-email="email" /&gt;</code></pre>
        <h2>Props</h2>
        <table>
          <thead>
            <tr><th>Name</th><th>Type</th><th>Default</th><th>Description</th></tr>
          </thead>
          <tbody>
            <tr><td><code>initial-badge-class</code></td><td><code>object</code></td><td><code>{}</code></td><td>Initial badge class data</td></tr>
            <tr><td><code>initial-recipient-email</code></td><td><code>string</code></td><td><code>''</code></td><td>Initial recipient email</td></tr>
          </tbody>
        </table>
        <h2>Events</h2>
        <table>
          <thead>
            <tr><th>Name</th><th>Payload</th><th>Description</th></tr>
          </thead>
          <tbody>
            <tr><td><code>badge-issued</code></td><td><code>object</code></td><td>Emitted when a badge is successfully issued</td></tr>
            <tr><td><code>reset</code></td><td><code>-</code></td><td>Emitted when the form is reset</td></tr>
          </tbody>
        </table>
        <h2>Accessibility</h2>
        <ul>
          <li>Form fields have associated labels and ARIA attributes</li>
          <li>Validation errors are announced to screen readers</li>
          <li>Keyboard navigation is fully supported</li>
          <li>Works with high contrast and accessible themes</li>
        </ul>
        <h2>Theme Example</h2>
        <pre><code>// To apply a theme:
import { AccessibilityService } from 'openbadges-ui';
AccessibilityService.applyTheme('high-contrast');
</code></pre>
      </div>
    </template>
  </Story>
</template>

<style>
.story-description {
  margin-bottom: 1rem;
  padding: 0.5rem;
  background-color: #f0f0f0;
  border-radius: 4px;
}
</style>
