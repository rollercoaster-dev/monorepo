<script setup lang="ts">
import { ref } from "vue";
import BadgeClassCard from "./BadgeClassCard.vue";
import type { OB2, OB3 } from "openbadges-types";

/**
 * # BadgeClassCard
 *
 * The `BadgeClassCard` component displays information about a badge class (OB2) or
 * achievement (OB3). It shows the badge image, name, description, issuer, criteria, and tags.
 *
 * ## Features
 *
 * - Displays badge image, name, and description
 * - Shows issuer/creator information
 * - Displays criteria when enabled
 * - Shows tags with overflow indicator (max 5 visible)
 * - Supports interactive mode for clickable cards
 * - Provides density options for different display contexts
 * - Accessible fallback for missing images
 *
 * ## Props
 *
 * | Name | Type | Default | Description |
 * |------|------|---------|-------------|
 * | `badgeClass` | `OB2.BadgeClass \| OB3.Achievement \| OB3.Achievement[]` | Required | The badge class to display (arrays show first with indicator) |
 * | `interactive` | `boolean` | `false` | Whether the card is clickable |
 * | `showDescription` | `boolean` | `true` | Show the badge description |
 * | `showCriteria` | `boolean` | `false` | Show the badge criteria |
 * | `showIssuer` | `boolean` | `true` | Show the issuer/creator name |
 * | `showTags` | `boolean` | `true` | Show badge tags |
 * | `density` | `'compact' \| 'normal' \| 'spacious'` | `'normal'` | Display density |
 *
 * ## Events
 *
 * | Name | Payload | Description |
 * |------|---------|-------------|
 * | `click` | `OB2.BadgeClass \| OB3.Achievement \| OB3.Achievement[]` | Emitted when the card is clicked (if interactive) |
 *
 * ## Slots
 *
 * | Name | Description |
 * |------|-------------|
 * | `badge-class-actions` | Additional actions below the badge content |
 */

// Mock OB2 BadgeClass data
const mockOB2BadgeClass: OB2.BadgeClass = {
  id: "https://example.org/badges/1",
  type: "BadgeClass",
  name: "Web Developer Certificate",
  description:
    "Demonstrates proficiency in modern web development technologies including HTML5, CSS3, JavaScript, and responsive design patterns.",
  image: "https://placehold.co/200x200/3182ce/white?text=WD",
  criteria: {
    narrative:
      "Complete all required courses, pass the final exam with 80% or higher, and submit a portfolio project.",
  },
  issuer: {
    id: "https://example.org/issuers/1",
    name: "Tech Academy",
  },
  tags: ["web", "development", "javascript", "html", "css", "frontend"],
};

// Mock OB3 Achievement data
const mockOB3Achievement = {
  id: "https://example.org/achievements/2",
  type: ["Achievement"] as [string, ...string[]],
  name: "Data Science Fundamentals",
  description:
    "Understanding of core data science concepts including statistical analysis, machine learning basics, and data visualization.",
  image: {
    id: "https://placehold.co/200x200/805ad5/white?text=DS",
    type: "Image" as const,
  },
  criteria: {
    narrative:
      "Pass the data science assessment with 75% or higher and complete the capstone project.",
  },
  creator: {
    id: "https://example.org/issuers/2",
    name: "Data Institute",
  },
} as OB3.Achievement;

// Badge without image
const badgeNoImage: OB2.BadgeClass = {
  id: "https://example.org/badges/3",
  type: "BadgeClass",
  name: "Project Management Basics",
  description:
    "Foundational knowledge in project management methodologies and tools.",
  criteria: {
    narrative: "Complete the PM fundamentals course.",
  },
  issuer: {
    id: "https://example.org/issuers/3",
    name: "Business School",
  },
  tags: ["management", "leadership"],
};

// Badge with many tags
const badgeManyTags: OB2.BadgeClass = {
  id: "https://example.org/badges/4",
  type: "BadgeClass",
  name: "Full Stack Developer",
  description: "Comprehensive full-stack development skills.",
  image: "https://placehold.co/200x200/38a169/white?text=FS",
  criteria: {
    narrative: "Build and deploy a full-stack application.",
  },
  issuer: {
    id: "https://example.org/issuers/1",
    name: "Tech Academy",
  },
  tags: [
    "javascript",
    "typescript",
    "react",
    "node",
    "postgresql",
    "docker",
    "aws",
    "testing",
  ],
};

// Mock OB3 Achievement array (multi-achievement credential per OB3 spec)
const mockOB3AchievementArray: OB3.Achievement[] = [
  {
    id: "https://example.org/achievements/multi-1",
    type: ["Achievement"] as [string, ...string[]],
    name: "Cloud Architecture Fundamentals",
    description:
      "Core understanding of cloud computing principles, including IaaS, PaaS, SaaS, and hybrid architectures.",
    image: {
      id: "https://placehold.co/200x200/e53e3e/white?text=CA",
      type: "Image" as const,
    },
    criteria: {
      narrative:
        "Complete all cloud architecture modules and pass the certification exam.",
    },
    creator: {
      id: "https://example.org/issuers/cloud",
      name: "Cloud Academy",
    },
  } as OB3.Achievement,
  {
    id: "https://example.org/achievements/multi-2",
    type: ["Achievement"] as [string, ...string[]],
    name: "Container Orchestration",
    description: "Proficiency in Kubernetes and Docker container management.",
    image: {
      id: "https://placehold.co/200x200/3182ce/white?text=CO",
      type: "Image" as const,
    },
    criteria: {
      narrative:
        "Deploy and manage a multi-container application in Kubernetes.",
    },
    creator: {
      id: "https://example.org/issuers/cloud",
      name: "Cloud Academy",
    },
  } as OB3.Achievement,
  {
    id: "https://example.org/achievements/multi-3",
    type: ["Achievement"] as [string, ...string[]],
    name: "Infrastructure as Code",
    description: "Skills in Terraform, CloudFormation, and Pulumi.",
    criteria: {
      narrative: "Build and deploy infrastructure using IaC tools.",
    },
    creator: {
      id: "https://example.org/issuers/cloud",
      name: "Cloud Academy",
    },
  } as OB3.Achievement,
];

const state = ref({
  badgeClass: mockOB2BadgeClass,
  interactive: false,
  showDescription: true,
  showCriteria: false,
  showIssuer: true,
  showTags: true,
  density: "normal" as "compact" | "normal" | "spacious",
});

function onBadgeClassClick(
  badgeClass: OB2.BadgeClass | OB3.Achievement | OB3.Achievement[],
): void {
  console.log("Badge class clicked:", badgeClass);
}
</script>

<template>
  <Story
    title="Components/Directory/BadgeClassCard"
    :layout="{ type: 'single', iframe: true }"
  >
    <template #docs>
      <div class="histoire-docs">
        <h1>BadgeClassCard</h1>

        <p>
          The <code>BadgeClassCard</code> component displays a badge class (OB2)
          or achievement (OB3) with its image, description, issuer, criteria,
          and tags.
        </p>

        <h2>When To Use</h2>
        <ul>
          <li>When displaying available badges in a directory</li>
          <li>When showing badge details in a catalog</li>
          <li>When building a badge selection interface</li>
        </ul>

        <h2>Examples</h2>

        <h3>Basic Usage</h3>
        <pre><code>&lt;BadgeClassCard :badge-class="myBadge" /&gt;</code></pre>

        <h3>Interactive Card</h3>
        <pre><code>&lt;BadgeClassCard :badge-class="myBadge" interactive @click="handleClick" /&gt;</code></pre>

        <h3>With Criteria</h3>
        <pre><code>&lt;BadgeClassCard :badge-class="myBadge" show-criteria /&gt;</code></pre>

        <h2>Tag Overflow</h2>
        <p>
          When a badge has more than 5 tags, only the first 5 are displayed with
          a "+N" indicator showing how many additional tags exist.
        </p>

        <h2>Multi-Achievement Credentials (OB3)</h2>
        <p>
          Per the OB3 spec, <code>credentialSubject.achievement</code> can be an
          array. When an array is provided, the component displays the first
          achievement with a "+N more achievements" indicator. This approach was
          chosen because badge cards are typically displayed in lists, and
          showing all achievements would break the visual consistency.
        </p>

        <h2>Design Tokens</h2>
        <p>
          This component follows the neo-brutalist design language using
          <code>@rollercoaster-dev/design-tokens</code>. Key visual traits:
        </p>
        <ul>
          <li>
            <strong>2px borders</strong> via
            <code>--ob-border-width-medium</code>
          </li>
          <li>
            <strong>Hard offset shadows</strong> via
            <code>--ob-shadow-hard-md</code> (hover:
            <code>--ob-shadow-hard-lg</code>)
          </li>
          <li>
            <strong>Anybody font</strong> for titles via
            <code>--ob-font-headline</code>
          </li>
          <li>
            <strong>Sticker-style tags</strong> via
            <code>--ob-badge-sticker-bg/foreground</code>
          </li>
        </ul>
        <p>
          All 8 accessibility themes are supported. Use Histoire's theme
          switcher to preview each theme.
        </p>

        <h2>Accessibility</h2>
        <ul>
          <li>Uses semantic HTML with appropriate ARIA attributes</li>
          <li>Interactive cards receive <code>tabindex="0"</code></li>
          <li>Responds to keyboard events (Enter/Space) when interactive</li>
          <li>Provides emoji fallback when image is missing</li>
          <li>
            Focus states use <code>:focus-visible</code> (keyboard only, not
            mouse clicks)
          </li>
        </ul>
      </div>
    </template>

    <template #controls>
      <HstCheckbox v-model="state.showDescription" title="Show Description" />
      <HstCheckbox v-model="state.showCriteria" title="Show Criteria" />
      <HstCheckbox v-model="state.showIssuer" title="Show Issuer" />
      <HstCheckbox v-model="state.showTags" title="Show Tags" />
      <HstCheckbox v-model="state.interactive" title="Interactive" />
      <HstSelect
        v-model="state.density"
        title="Density"
        :options="[
          { label: 'Compact', value: 'compact' },
          { label: 'Normal', value: 'normal' },
          { label: 'Spacious', value: 'spacious' },
        ]"
      />
    </template>

    <Variant title="Default (OB2)">
      <BadgeClassCard
        :badge-class="mockOB2BadgeClass"
        :show-description="state.showDescription"
        :show-criteria="state.showCriteria"
        :show-issuer="state.showIssuer"
        :show-tags="state.showTags"
        :interactive="state.interactive"
        :density="state.density"
        @click="onBadgeClassClick"
      />
    </Variant>

    <Variant title="OB3 Achievement">
      <BadgeClassCard
        :badge-class="mockOB3Achievement"
        :show-description="state.showDescription"
        :show-criteria="state.showCriteria"
        :show-issuer="state.showIssuer"
        :show-tags="state.showTags"
        :interactive="state.interactive"
        :density="state.density"
        @click="onBadgeClassClick"
      />
    </Variant>

    <Variant title="OB3 Achievement Array (Multi-Achievement)">
      <div class="story-description">
        <p>
          Per OB3 spec, <code>credentialSubject.achievement</code> can be an
          array. When passed an array, the component displays the first
          achievement with a "+N more" indicator.
        </p>
      </div>
      <BadgeClassCard
        :badge-class="mockOB3AchievementArray"
        :show-description="state.showDescription"
        :show-criteria="state.showCriteria"
        :show-issuer="state.showIssuer"
        :show-tags="state.showTags"
        :interactive="state.interactive"
        :density="state.density"
        @click="onBadgeClassClick"
      />
    </Variant>

    <Variant title="Interactive">
      <BadgeClassCard
        :badge-class="mockOB2BadgeClass"
        :show-description="state.showDescription"
        :show-criteria="state.showCriteria"
        :show-issuer="state.showIssuer"
        :show-tags="state.showTags"
        interactive
        :density="state.density"
        @click="onBadgeClassClick"
      />
    </Variant>

    <Variant title="With Criteria">
      <BadgeClassCard
        :badge-class="mockOB2BadgeClass"
        :show-description="state.showDescription"
        show-criteria
        :show-issuer="state.showIssuer"
        :show-tags="state.showTags"
        :interactive="state.interactive"
        :density="state.density"
        @click="onBadgeClassClick"
      />
    </Variant>

    <Variant title="No Image (Fallback)">
      <BadgeClassCard
        :badge-class="badgeNoImage"
        :show-description="state.showDescription"
        :show-criteria="state.showCriteria"
        :show-issuer="state.showIssuer"
        :show-tags="state.showTags"
        :interactive="state.interactive"
        :density="state.density"
        @click="onBadgeClassClick"
      />
    </Variant>

    <Variant title="Many Tags (Overflow)">
      <BadgeClassCard
        :badge-class="badgeManyTags"
        :show-description="state.showDescription"
        :show-criteria="state.showCriteria"
        :show-issuer="state.showIssuer"
        show-tags
        :interactive="state.interactive"
        :density="state.density"
        @click="onBadgeClassClick"
      />
    </Variant>

    <Variant title="Compact Density">
      <BadgeClassCard
        :badge-class="mockOB2BadgeClass"
        :show-description="state.showDescription"
        :show-criteria="state.showCriteria"
        :show-issuer="state.showIssuer"
        :show-tags="state.showTags"
        :interactive="state.interactive"
        density="compact"
        @click="onBadgeClassClick"
      />
    </Variant>

    <Variant title="Spacious Density">
      <BadgeClassCard
        :badge-class="mockOB2BadgeClass"
        :show-description="state.showDescription"
        :show-criteria="state.showCriteria"
        :show-issuer="state.showIssuer"
        :show-tags="state.showTags"
        :interactive="state.interactive"
        density="spacious"
        @click="onBadgeClassClick"
      />
    </Variant>
  </Story>
</template>
