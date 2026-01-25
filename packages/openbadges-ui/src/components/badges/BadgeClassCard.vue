<script setup lang="ts">
import { computed, ref } from "vue";
import type { OB2, OB3 } from "@/types";

/**
 * BadgeClassCard accepts OB2 BadgeClass, single OB3 Achievement, or an array of OB3 Achievements.
 * When an array is provided, the first achievement is displayed with an indicator for additional achievements.
 */
interface Props {
  badgeClass: OB2.BadgeClass | OB3.Achievement | OB3.Achievement[];
  interactive?: boolean;
  showDescription?: boolean;
  showCriteria?: boolean;
  showIssuer?: boolean;
  showTags?: boolean;
  density?: "compact" | "normal" | "spacious";
}

const props = withDefaults(defineProps<Props>(), {
  interactive: false,
  showDescription: true,
  showCriteria: false,
  showIssuer: true,
  showTags: true,
  density: "normal",
});

const emit = defineEmits<{
  (
    e: "click",
    badgeClass: OB2.BadgeClass | OB3.Achievement | OB3.Achievement[],
  ): void;
}>();

// Extract primary badge for display (first achievement if array)
const primaryBadge = computed<OB2.BadgeClass | OB3.Achievement | null>(() => {
  if (Array.isArray(props.badgeClass)) {
    // Guard against empty array to prevent runtime errors
    if (props.badgeClass.length === 0) {
      return null;
    }
    return props.badgeClass[0];
  }
  return props.badgeClass;
});

// Count of additional achievements when array is provided
const additionalAchievementsCount = computed(() => {
  if (Array.isArray(props.badgeClass)) {
    return props.badgeClass.length - 1;
  }
  return 0;
});

// Helper to get string from MultiLanguageString
const getLocalizedString = (
  value: string | { [key: string]: string } | undefined,
): string => {
  if (!value) return "";
  if (typeof value === "string") return value;
  // For MultiLanguageString, prefer 'en' or first available
  return value["en"] || Object.values(value)[0] || "";
};

// Normalize badge class data between OB2 and OB3 formats
const normalizedBadgeClass = computed(() => {
  const badge = primaryBadge.value;

  // Return empty data if no badge available
  if (!badge) {
    return {
      id: "",
      name: "",
      description: "",
      image: "",
      criteria: "",
      issuerName: "",
      tags: [],
    };
  }

  // Get ID
  const id = badge.id || "";

  // Get name - required in both OB2 and OB3
  const name = getLocalizedString(badge.name) || "Unnamed Badge";

  // Get description
  const description = getLocalizedString(badge.description) || "";

  // Get image - OB2 can be string or Image object, OB3 uses Image object
  let image = "";
  if (badge.image) {
    if (typeof badge.image === "string") {
      image = badge.image;
    } else if (typeof badge.image === "object" && "id" in badge.image) {
      image = badge.image.id ?? "";
    }
  }

  // Get criteria
  let criteria = "";
  if (badge.criteria) {
    if (typeof badge.criteria === "string") {
      criteria = badge.criteria;
    } else if (
      typeof badge.criteria === "object" &&
      "narrative" in badge.criteria
    ) {
      criteria = getLocalizedString(badge.criteria.narrative as string);
    }
  }

  // Get issuer name - OB2 uses 'issuer', OB3 uses 'creator'
  let issuerName = "";
  const issuerField =
    "issuer" in badge
      ? badge.issuer
      : "creator" in badge
        ? badge.creator
        : null;
  if (issuerField) {
    if (typeof issuerField === "string") {
      issuerName = issuerField;
    } else if (typeof issuerField === "object" && "name" in issuerField) {
      issuerName = getLocalizedString(issuerField.name as string);
    }
  }

  // Get tags - OB2 has tags, OB3 might have different structure
  const tags: string[] = [];
  if ("tags" in badge && Array.isArray(badge.tags)) {
    tags.push(...badge.tags);
  }

  return {
    id,
    name,
    description,
    image,
    criteria,
    issuerName,
    tags,
  };
});

// Generate accessible alt text for badge image
const generateAltText = (badgeName: string): string => {
  return `Badge: ${badgeName}`;
};

// Handle click events when card is interactive
const handleClick = () => {
  if (props.interactive) {
    emit("click", props.badgeClass);
  }
};

// Focus state for accessibility
const isFocused = ref(false);
const onFocus = () => {
  isFocused.value = true;
};
const onBlur = () => {
  isFocused.value = false;
};

// Computed classes for content density
const densityClass = computed(() => {
  return `density-${props.density}`;
});

// Truncate description for display
const truncatedDescription = computed(() => {
  const desc = normalizedBadgeClass.value.description;
  if (!desc) return "";
  const maxLength = props.density === "compact" ? 60 : 120;
  if (desc.length <= maxLength) return desc;
  return desc.slice(0, maxLength).trim() + "...";
});

// Truncate criteria for display
const truncatedCriteria = computed(() => {
  const crit = normalizedBadgeClass.value.criteria;
  if (!crit) return "";
  const maxLength = props.density === "compact" ? 50 : 100;
  if (crit.length <= maxLength) return crit;
  return crit.slice(0, maxLength).trim() + "...";
});
</script>

<template>
  <div
    class="manus-badge-class-card"
    :class="[densityClass, { 'is-interactive': interactive }]"
    :tabindex="interactive ? 0 : undefined"
    role="article"
    :aria-label="`Badge: ${normalizedBadgeClass.name}`"
    @click="handleClick"
    @keydown.enter.prevent="handleClick"
    @keydown.space.prevent="handleClick"
    @focus="onFocus"
    @blur="onBlur"
  >
    <div class="manus-badge-class-image">
      <img
        v-if="normalizedBadgeClass.image"
        :src="normalizedBadgeClass.image"
        :alt="generateAltText(normalizedBadgeClass.name)"
        class="manus-badge-class-img"
      />
      <div
        v-else
        class="manus-badge-class-img-fallback"
        :aria-label="generateAltText(normalizedBadgeClass.name)"
      >
        <span class="manus-badge-class-icon" aria-hidden="true">🏅</span>
      </div>
    </div>
    <div class="manus-badge-class-content">
      <h3 class="manus-badge-class-name">
        {{ normalizedBadgeClass.name }}
      </h3>
      <p
        v-if="showDescription && truncatedDescription"
        class="manus-badge-class-description"
      >
        {{ truncatedDescription }}
      </p>
      <div
        v-if="showIssuer && normalizedBadgeClass.issuerName"
        class="manus-badge-class-issuer"
      >
        <span>By: {{ normalizedBadgeClass.issuerName }}</span>
      </div>
      <div
        v-if="showCriteria && truncatedCriteria"
        class="manus-badge-class-criteria"
      >
        <span class="manus-badge-class-criteria-label">Criteria:</span>
        {{ truncatedCriteria }}
      </div>
      <div
        v-if="showTags && normalizedBadgeClass.tags.length > 0"
        class="manus-badge-class-tags"
      >
        <span
          v-for="tag in normalizedBadgeClass.tags.slice(0, 5)"
          :key="tag"
          class="manus-badge-class-tag"
        >
          {{ tag }}
        </span>
        <span
          v-if="normalizedBadgeClass.tags.length > 5"
          class="manus-badge-class-tag manus-badge-class-tag-more"
        >
          +{{ normalizedBadgeClass.tags.length - 5 }}
        </span>
      </div>
      <div
        v-if="additionalAchievementsCount > 0"
        class="manus-badge-class-multi"
        :aria-label="`This credential includes ${additionalAchievementsCount} more achievement${additionalAchievementsCount > 1 ? 's' : ''}`"
      >
        <span class="manus-badge-class-multi-badge">
          +{{ additionalAchievementsCount }} more achievement{{
            additionalAchievementsCount > 1 ? "s" : ""
          }}
        </span>
      </div>
      <slot name="badge-class-actions" />
    </div>
  </div>
</template>

<style>
.manus-badge-class-card {
  --badge-class-border-color: var(--ob-border-color, #e2e8f0);
  --badge-class-border-radius: var(--ob-border-radius-lg, 8px);
  --badge-class-padding: var(--ob-space-4, 16px);
  --badge-class-background: var(--ob-bg-primary, #ffffff);
  --badge-class-shadow: var(--ob-shadow-sm, 0 2px 4px rgba(0, 0, 0, 0.1));
  --badge-class-name-color: var(--ob-text-primary, #1a202c);
  --badge-class-text-color: var(--ob-text-secondary, #4a5568);
  --badge-class-hover-shadow: var(
    --ob-shadow-md,
    0 4px 8px rgba(0, 0, 0, 0.15)
  );
  --badge-class-focus-outline-color: var(--ob-primary, #3182ce);
  --badge-class-tag-bg: var(--ob-gray-200, #e2e8f0);
  --badge-class-tag-color: var(--ob-text-secondary, #4a5568);
  --badge-class-fallback-bg: var(--ob-bg-secondary, #f7fafc);

  display: flex;
  flex-direction: column;
  border: 1px solid var(--badge-class-border-color);
  border-radius: var(--badge-class-border-radius);
  padding: var(--badge-class-padding);
  background-color: var(--badge-class-background);
  box-shadow: var(--badge-class-shadow);
  transition: box-shadow var(--ob-transition-fast, 0.2s) ease;
  max-width: 300px;
  font-family: var(--ob-font-family, inherit);
  color: var(--badge-class-text-color);
}

.manus-badge-class-card.is-interactive {
  cursor: pointer;
}

.manus-badge-class-card.is-interactive:hover {
  box-shadow: var(--badge-class-hover-shadow);
}

.manus-badge-class-card.is-interactive:focus {
  outline: 2px solid var(--badge-class-focus-outline-color);
  outline-offset: var(--ob-space-1, 2px);
}

.manus-badge-class-image {
  display: flex;
  justify-content: center;
  margin-bottom: var(--ob-space-3, 12px);
}

.manus-badge-class-img {
  max-width: 100%;
  height: auto;
  max-height: 120px;
  border-radius: var(--ob-border-radius-sm, 4px);
  object-fit: contain;
}

.manus-badge-class-img-fallback {
  width: 80px;
  height: 80px;
  border-radius: var(--ob-border-radius-lg, 8px);
  background-color: var(--badge-class-fallback-bg);
  display: flex;
  align-items: center;
  justify-content: center;
}

.manus-badge-class-icon {
  font-size: var(--ob-font-size-3xl, 2.5rem);
}

.manus-badge-class-content {
  display: flex;
  flex-direction: column;
  gap: var(--ob-space-2, 6px);
}

.manus-badge-class-name {
  margin: 0;
  font-size: var(--ob-font-size-lg, 1.125rem);
  font-weight: var(--ob-font-weight-semibold, 600);
  color: var(--badge-class-name-color);
  line-height: var(--ob-line-height-tight, 1.3);
}

.manus-badge-class-description {
  margin: 0;
  font-size: var(--ob-font-size-sm, 0.875rem);
  color: var(--badge-class-text-color);
  line-height: var(--ob-line-height-normal, 1.4);
}

.manus-badge-class-issuer {
  font-size: var(--ob-font-size-xs, 0.75rem);
  color: var(--badge-class-text-color);
}

.manus-badge-class-criteria {
  font-size: var(--ob-font-size-xs, 0.75rem);
  color: var(--badge-class-text-color);
  font-style: italic;
}

.manus-badge-class-criteria-label {
  font-weight: var(--ob-font-weight-medium, 500);
  font-style: normal;
}

.manus-badge-class-tags {
  display: flex;
  flex-wrap: wrap;
  gap: var(--ob-space-1, 4px);
  margin-top: var(--ob-space-1, 4px);
}

.manus-badge-class-tag {
  display: inline-block;
  padding: var(--ob-space-1, 2px) var(--ob-space-2, 8px);
  background-color: var(--badge-class-tag-bg);
  color: var(--badge-class-tag-color);
  border-radius: var(--ob-border-radius-pill, 12px);
  font-size: var(--ob-font-size-xs, 0.7rem);
  font-weight: var(--ob-font-weight-medium, 500);
}

.manus-badge-class-tag-more {
  background-color: var(--ob-gray-300, #cbd5e0);
}

/* Content density styles */
.manus-badge-class-card.density-compact {
  padding: var(--ob-space-2, 10px);
  max-width: 240px;
}

.manus-badge-class-card.density-compact .manus-badge-class-img {
  max-height: 80px;
}

.manus-badge-class-card.density-compact .manus-badge-class-img-fallback {
  width: 60px;
  height: 60px;
}

.manus-badge-class-card.density-compact .manus-badge-class-icon {
  font-size: 1.75rem;
}

.manus-badge-class-card.density-compact .manus-badge-class-name {
  font-size: var(--ob-font-size-md, 0.975rem);
}

.manus-badge-class-card.density-compact .manus-badge-class-description {
  font-size: var(--ob-font-size-xs, 0.75rem);
}

.manus-badge-class-card.density-compact .manus-badge-class-content {
  gap: var(--ob-space-1, 4px);
}

.manus-badge-class-card.density-normal {
  padding: var(--ob-space-4, 16px);
}

.manus-badge-class-card.density-spacious {
  padding: var(--ob-space-6, 24px);
  max-width: 350px;
}

.manus-badge-class-card.density-spacious .manus-badge-class-img {
  max-height: 150px;
}

.manus-badge-class-card.density-spacious .manus-badge-class-img-fallback {
  width: 100px;
  height: 100px;
}

.manus-badge-class-card.density-spacious .manus-badge-class-icon {
  font-size: 3rem;
}

.manus-badge-class-card.density-spacious .manus-badge-class-name {
  font-size: var(--ob-font-size-xl, 1.25rem);
}

.manus-badge-class-card.density-spacious .manus-badge-class-content {
  gap: var(--ob-space-2, 8px);
}

/* Multi-achievement indicator */
.manus-badge-class-multi {
  margin-top: var(--ob-space-1, 4px);
}

.manus-badge-class-multi-badge {
  display: inline-block;
  padding: var(--ob-space-1, 2px) var(--ob-space-2, 8px);
  background-color: var(--ob-gray-100, #edf2f7);
  color: var(--ob-text-secondary, #4a5568);
  border-radius: var(--ob-border-radius-pill, 12px);
  font-size: var(--ob-font-size-xs, 0.7rem);
  font-weight: var(--ob-font-weight-medium, 500);
  border: 1px dashed var(--ob-border-color-muted, #a0aec0);
}

/* Accessibility focus styles */
.manus-badge-class-card:focus-visible,
.manus-badge-class-card.is-interactive:focus-visible {
  outline: 3px solid var(--ob-border-color-focus, #ff9800);
  outline-offset: var(--ob-space-1, 3px);
  box-shadow: var(--ob-shadow-focus, 0 0 0 4px #ffe0b2);
}
</style>
