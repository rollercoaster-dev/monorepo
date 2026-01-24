<script setup lang="ts">
import { computed, ref } from "vue";
import type { OB2, OB3 } from "@/types";

interface Props {
  issuer: OB2.Profile | OB3.Profile;
  interactive?: boolean;
  showDescription?: boolean;
  showContact?: boolean;
  density?: "compact" | "normal" | "spacious";
}

const props = withDefaults(defineProps<Props>(), {
  interactive: false,
  showDescription: true,
  showContact: false,
  density: "normal",
});

const emit = defineEmits<{
  (e: "click", issuer: OB2.Profile | OB3.Profile): void;
}>();

/**
 * Get a localized string from a value that may be a plain string or a JSON-LD language map.
 * OB3 supports multi-language fields as `{ "en": "English", "es": "Spanish" }`.
 * @param value - A string or language map object
 * @param fallback - Default value if extraction fails
 * @returns The extracted string value
 */
const getLocalizedString = (
  value: string | Record<string, string> | undefined,
  fallback = "",
): string => {
  if (!value) return fallback;
  if (typeof value === "string") return value;
  if (typeof value === "object") {
    // Try common language codes in order of preference
    const preferredLangs = ["en", "en-US", "en-GB", Object.keys(value)[0]];
    for (const lang of preferredLangs) {
      if (lang && value[lang]) return value[lang];
    }
  }
  return fallback;
};

// Normalize issuer data between OB2 and OB3 formats
const normalizedIssuer = computed(() => {
  const issuer = props.issuer;

  // Get name - required in both OB2 and OB3, may be localized in OB3
  const name = getLocalizedString(
    issuer.name as string | Record<string, string>,
    "Unknown Issuer",
  );

  // Get description - may be localized in OB3
  const description = getLocalizedString(
    issuer.description as string | Record<string, string>,
    "",
  );

  // Get URL - OB2 uses url, OB3 also uses url
  const url = issuer.url || "";

  // Get email
  const email = issuer.email || "";

  // Get image - OB2 can be string or Image object, OB3 uses Image object
  let image = "";
  if (issuer.image) {
    if (typeof issuer.image === "string") {
      image = issuer.image;
    } else if (typeof issuer.image === "object" && "id" in issuer.image) {
      image = issuer.image.id ?? "";
    }
  }

  // Get ID
  const id = issuer.id || "";

  return {
    id,
    name,
    description,
    url,
    email,
    image,
  };
});

// Generate accessible alt text for issuer image
const generateAltText = (issuerName: string): string => {
  return `Logo for ${issuerName}`;
};

// Handle click events when card is interactive
const handleClick = () => {
  if (props.interactive) {
    emit("click", props.issuer);
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
  const desc = normalizedIssuer.value.description;
  if (!desc) return "";
  const maxLength = props.density === "compact" ? 80 : 150;
  if (desc.length <= maxLength) return desc;
  return desc.slice(0, maxLength).trim() + "...";
});
</script>

<template>
  <div
    class="manus-issuer-card"
    :class="[densityClass, { 'is-interactive': interactive }]"
    :tabindex="interactive ? 0 : undefined"
    role="article"
    :aria-label="`Issuer: ${normalizedIssuer.name}`"
    @click="handleClick"
    @keydown.enter.prevent="handleClick"
    @keydown.space.prevent="handleClick"
    @focus="onFocus"
    @blur="onBlur"
  >
    <div class="manus-issuer-image">
      <img
        v-if="normalizedIssuer.image"
        :src="normalizedIssuer.image"
        :alt="generateAltText(normalizedIssuer.name)"
        class="manus-issuer-img"
      />
      <div
        v-else
        class="manus-issuer-img-fallback"
        :aria-label="generateAltText(normalizedIssuer.name)"
      >
        <span class="manus-issuer-initials">
          {{ normalizedIssuer.name.charAt(0).toUpperCase() }}
        </span>
      </div>
    </div>
    <div class="manus-issuer-content">
      <h3 class="manus-issuer-name">
        {{ normalizedIssuer.name }}
      </h3>
      <p
        v-if="showDescription && truncatedDescription"
        class="manus-issuer-description"
      >
        {{ truncatedDescription }}
      </p>
      <div v-if="showContact && normalizedIssuer.url" class="manus-issuer-url">
        <a
          :href="normalizedIssuer.url"
          target="_blank"
          rel="noopener noreferrer"
          @click.stop
        >
          {{ normalizedIssuer.url }}
        </a>
      </div>
      <div
        v-if="showContact && normalizedIssuer.email"
        class="manus-issuer-email"
      >
        <a :href="`mailto:${normalizedIssuer.email}`" @click.stop>
          {{ normalizedIssuer.email }}
        </a>
      </div>
      <slot name="issuer-actions" />
    </div>
  </div>
</template>

<style>
.manus-issuer-card {
  --issuer-border-color: var(--ob-border-color, #e2e8f0);
  --issuer-border-radius: var(--ob-border-radius-lg, 8px);
  --issuer-padding: var(--ob-space-4, 16px);
  --issuer-background: var(--ob-bg-primary, #ffffff);
  --issuer-shadow: var(--ob-shadow-sm, 0 2px 4px rgba(0, 0, 0, 0.1));
  --issuer-name-color: var(--ob-text-primary, #1a202c);
  --issuer-text-color: var(--ob-text-secondary, #4a5568);
  --issuer-link-color: var(--ob-primary, #3182ce);
  --issuer-hover-shadow: var(--ob-shadow-md, 0 4px 8px rgba(0, 0, 0, 0.15));
  --issuer-focus-outline-color: var(--ob-primary, #3182ce);
  --issuer-fallback-bg: var(--ob-gray-200, #e2e8f0);
  --issuer-fallback-color: var(--ob-text-secondary, #4a5568);

  display: flex;
  flex-direction: row;
  align-items: flex-start;
  border: 1px solid var(--issuer-border-color);
  border-radius: var(--issuer-border-radius);
  padding: var(--issuer-padding);
  background-color: var(--issuer-background);
  box-shadow: var(--issuer-shadow);
  transition: box-shadow var(--ob-transition-fast, 0.2s) ease;
  max-width: 400px;
  font-family: var(--ob-font-family, inherit);
  color: var(--issuer-text-color);
}

.manus-issuer-card.is-interactive {
  cursor: pointer;
}

.manus-issuer-card.is-interactive:hover {
  box-shadow: var(--issuer-hover-shadow);
}

.manus-issuer-card.is-interactive:focus {
  outline: 2px solid var(--issuer-focus-outline-color);
  outline-offset: var(--ob-space-1, 2px);
}

.manus-issuer-image {
  flex: 0 0 64px;
  margin-right: var(--ob-space-4, 16px);
}

.manus-issuer-img {
  width: 64px;
  height: 64px;
  border-radius: 50%;
  object-fit: cover;
}

.manus-issuer-img-fallback {
  width: 64px;
  height: 64px;
  border-radius: 50%;
  background-color: var(--issuer-fallback-bg);
  display: flex;
  align-items: center;
  justify-content: center;
}

.manus-issuer-initials {
  font-size: var(--ob-font-size-xl, 1.5rem);
  font-weight: var(--ob-font-weight-semibold, 600);
  color: var(--issuer-fallback-color);
}

.manus-issuer-content {
  flex: 1;
  display: flex;
  flex-direction: column;
  gap: var(--ob-space-1, 4px);
  min-width: 0;
}

.manus-issuer-name {
  margin: 0;
  font-size: var(--ob-font-size-lg, 1.125rem);
  font-weight: var(--ob-font-weight-semibold, 600);
  color: var(--issuer-name-color);
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.manus-issuer-description {
  margin: 0;
  font-size: var(--ob-font-size-sm, 0.875rem);
  color: var(--issuer-text-color);
  line-height: var(--ob-line-height-normal, 1.4);
}

.manus-issuer-url,
.manus-issuer-email {
  font-size: var(--ob-font-size-xs, 0.75rem);
}

.manus-issuer-url a,
.manus-issuer-email a {
  color: var(--issuer-link-color);
  text-decoration: none;
  word-break: break-all;
}

.manus-issuer-url a:hover,
.manus-issuer-email a:hover {
  text-decoration: underline;
}

/* Content density styles */
.manus-issuer-card.density-compact {
  padding: var(--ob-space-2, 8px);
  max-width: 300px;
}

.manus-issuer-card.density-compact .manus-issuer-image {
  flex: 0 0 40px;
  margin-right: var(--ob-space-2, 10px);
}

.manus-issuer-card.density-compact .manus-issuer-img,
.manus-issuer-card.density-compact .manus-issuer-img-fallback {
  width: 40px;
  height: 40px;
}

.manus-issuer-card.density-compact .manus-issuer-initials {
  font-size: var(--ob-font-size-md, 1rem);
}

.manus-issuer-card.density-compact .manus-issuer-name {
  font-size: var(--ob-font-size-md, 0.975rem);
}

.manus-issuer-card.density-compact .manus-issuer-description {
  font-size: var(--ob-font-size-xs, 0.75rem);
}

.manus-issuer-card.density-normal {
  padding: var(--ob-space-4, 16px);
}

.manus-issuer-card.density-spacious {
  padding: var(--ob-space-6, 24px);
  max-width: 500px;
}

.manus-issuer-card.density-spacious .manus-issuer-image {
  flex: 0 0 80px;
  margin-right: var(--ob-space-5, 20px);
}

.manus-issuer-card.density-spacious .manus-issuer-img,
.manus-issuer-card.density-spacious .manus-issuer-img-fallback {
  width: 80px;
  height: 80px;
}

.manus-issuer-card.density-spacious .manus-issuer-initials {
  font-size: var(--ob-font-size-2xl, 2rem);
}

.manus-issuer-card.density-spacious .manus-issuer-name {
  font-size: var(--ob-font-size-xl, 1.25rem);
}

.manus-issuer-card.density-spacious .manus-issuer-content {
  gap: var(--ob-space-2, 8px);
}

/* Accessibility focus styles */
.manus-issuer-card:focus-visible,
.manus-issuer-card.is-interactive:focus-visible {
  outline: 3px solid var(--ob-border-color-focus, #ff9800);
  outline-offset: var(--ob-space-1, 3px);
  box-shadow: var(--ob-shadow-focus, 0 0 0 4px #ffe0b2);
}

.manus-issuer-url a:focus-visible,
.manus-issuer-email a:focus-visible {
  outline: 2px solid var(--ob-border-color-focus, #ff9800);
  outline-offset: var(--ob-space-1, 2px);
  background: var(--ob-warning-light, #fff3e0);
}
</style>
