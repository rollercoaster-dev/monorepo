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
  return `ob-issuer-card--density-${props.density}`;
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
    class="ob-issuer-card"
    :class="[densityClass, { 'is-interactive': interactive }]"
    :tabindex="interactive ? 0 : undefined"
    :role="interactive ? 'button' : 'article'"
    :aria-label="`Issuer: ${normalizedIssuer.name}`"
    @click="handleClick"
    @keydown.enter.prevent="handleClick"
    @keydown.space.prevent="handleClick"
    @focus="onFocus"
    @blur="onBlur"
  >
    <div class="ob-issuer-card__image">
      <img
        v-if="normalizedIssuer.image"
        :src="normalizedIssuer.image"
        :alt="generateAltText(normalizedIssuer.name)"
        class="ob-issuer-card__img"
      />
      <div
        v-else
        class="ob-issuer-card__img-fallback"
        :aria-label="generateAltText(normalizedIssuer.name)"
      >
        <span class="ob-issuer-card__initials">
          {{ normalizedIssuer.name.charAt(0).toUpperCase() }}
        </span>
      </div>
    </div>
    <div class="ob-issuer-card__content">
      <h3 class="ob-issuer-card__name">
        {{ normalizedIssuer.name }}
      </h3>
      <p
        v-if="showDescription && truncatedDescription"
        class="ob-issuer-card__description"
      >
        {{ truncatedDescription }}
      </p>
      <div
        v-if="showContact && normalizedIssuer.url"
        class="ob-issuer-card__url"
      >
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
        class="ob-issuer-card__email"
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
.ob-issuer-card {
  --issuer-border-color: var(--ob-border-color);
  --issuer-border-radius: var(--ob-border-radius-lg);
  --issuer-padding: var(--ob-space-4);
  --issuer-background: var(--ob-bg-primary);
  --issuer-shadow: var(--ob-shadow-sm);
  --issuer-name-color: var(--ob-text-primary);
  --issuer-text-color: var(--ob-text-secondary);
  --issuer-link-color: var(--ob-primary);
  --issuer-hover-shadow: var(--ob-shadow-md);
  --issuer-focus-outline-color: var(--ob-primary);
  --issuer-fallback-bg: var(--ob-gray-200);
  --issuer-fallback-color: var(--ob-text-secondary);

  display: flex;
  flex-direction: row;
  align-items: flex-start;
  border: 1px solid var(--issuer-border-color);
  border-radius: var(--issuer-border-radius);
  padding: var(--issuer-padding);
  background-color: var(--issuer-background);
  box-shadow: var(--issuer-shadow);
  transition: box-shadow var(--ob-transition-fast) ease;
  max-width: 400px;
  font-family: var(--ob-font-family);
  color: var(--issuer-text-color);
}

.ob-issuer-card.is-interactive {
  cursor: pointer;
}

.ob-issuer-card.is-interactive:hover {
  box-shadow: var(--issuer-hover-shadow);
}

.ob-issuer-card.is-interactive:focus {
  outline: 2px solid var(--issuer-focus-outline-color);
  outline-offset: var(--ob-space-1);
}

.ob-issuer-card__image {
  flex: 0 0 64px;
  margin-right: var(--ob-space-4);
}

.ob-issuer-card__img {
  width: 64px;
  height: 64px;
  border-radius: 50%;
  object-fit: cover;
}

.ob-issuer-card__img-fallback {
  width: 64px;
  height: 64px;
  border-radius: 50%;
  background-color: var(--issuer-fallback-bg);
  display: flex;
  align-items: center;
  justify-content: center;
}

.ob-issuer-card__initials {
  font-size: var(--ob-font-size-xl);
  font-weight: var(--ob-font-weight-semibold);
  color: var(--issuer-fallback-color);
}

.ob-issuer-card__content {
  flex: 1;
  display: flex;
  flex-direction: column;
  gap: var(--ob-space-1);
  min-width: 0;
}

.ob-issuer-card__name {
  margin: 0;
  font-size: var(--ob-font-size-lg);
  font-weight: var(--ob-font-weight-semibold);
  color: var(--issuer-name-color);
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.ob-issuer-card__description {
  margin: 0;
  font-size: var(--ob-font-size-sm);
  color: var(--issuer-text-color);
  line-height: var(--ob-line-height-normal);
}

.ob-issuer-card__url,
.ob-issuer-card__email {
  font-size: var(--ob-font-size-xs);
}

.ob-issuer-card__url a,
.ob-issuer-card__email a {
  color: var(--issuer-link-color);
  text-decoration: none;
  word-break: break-all;
}

.ob-issuer-card__url a:hover,
.ob-issuer-card__email a:hover {
  text-decoration: underline;
}

/* Content density styles */
.ob-issuer-card.ob-issuer-card--density-compact {
  padding: var(--ob-space-2);
  max-width: 300px;
}

.ob-issuer-card.ob-issuer-card--density-compact .ob-issuer-card__image {
  flex: 0 0 40px;
  margin-right: var(--ob-space-2);
}

.ob-issuer-card.ob-issuer-card--density-compact .ob-issuer-card__img,
.ob-issuer-card.ob-issuer-card--density-compact .ob-issuer-card__img-fallback {
  width: 40px;
  height: 40px;
}

.ob-issuer-card.ob-issuer-card--density-compact .ob-issuer-card__initials {
  font-size: var(--ob-font-size-md);
}

.ob-issuer-card.ob-issuer-card--density-compact .ob-issuer-card__name {
  font-size: var(--ob-font-size-md);
}

.ob-issuer-card.ob-issuer-card--density-compact .ob-issuer-card__description {
  font-size: var(--ob-font-size-xs);
}

.ob-issuer-card.ob-issuer-card--density-normal {
  padding: var(--ob-space-4);
}

.ob-issuer-card.ob-issuer-card--density-spacious {
  padding: var(--ob-space-6);
  max-width: 500px;
}

.ob-issuer-card.ob-issuer-card--density-spacious .ob-issuer-card__image {
  flex: 0 0 80px;
  margin-right: var(--ob-space-5);
}

.ob-issuer-card.ob-issuer-card--density-spacious .ob-issuer-card__img,
.ob-issuer-card.ob-issuer-card--density-spacious .ob-issuer-card__img-fallback {
  width: 80px;
  height: 80px;
}

.ob-issuer-card.ob-issuer-card--density-spacious .ob-issuer-card__initials {
  font-size: var(--ob-font-size-2xl);
}

.ob-issuer-card.ob-issuer-card--density-spacious .ob-issuer-card__name {
  font-size: var(--ob-font-size-xl);
}

.ob-issuer-card.ob-issuer-card--density-spacious .ob-issuer-card__content {
  gap: var(--ob-space-2);
}

/* Accessibility focus styles */
.ob-issuer-card:focus-visible,
.ob-issuer-card.is-interactive:focus-visible {
  outline: 3px solid var(--ob-border-color-focus);
  outline-offset: var(--ob-space-1);
  box-shadow: var(--ob-shadow-focus);
}

.ob-issuer-card__url a:focus-visible,
.ob-issuer-card__email a:focus-visible {
  outline: 2px solid var(--ob-border-color-focus);
  outline-offset: var(--ob-space-1);
  background: var(--ob-warning-light);
}
</style>
