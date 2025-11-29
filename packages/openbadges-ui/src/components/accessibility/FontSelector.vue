<script setup lang="ts">
import { ref, computed, watch } from "vue";

/**
 * Props for the FontSelector component
 */
interface FontSelectorProps {
  /**
   * The currently selected font family
   * @default 'system'
   */
  modelValue?: string;

  /**
   * Whether to show the font size controls
   * @default true
   */
  showFontSize?: boolean;

  /**
   * Whether to show the text spacing controls
   * @default true
   */
  showTextSpacing?: boolean;

  /**
   * The available font options to display
   * @default all fonts
   */
  availableFonts?: Array<{
    id: string;
    name: string;
    description?: string;
    className: string;
  }>;

  /**
   * The label for the font selector
   * @default 'Font Family'
   */
  fontLabel?: string;

  /**
   * The label for the font size selector
   * @default 'Font Size'
   */
  fontSizeLabel?: string;

  /**
   * The label for the text spacing selector
   * @default 'Text Spacing'
   */
  textSpacingLabel?: string;
}

const props = withDefaults(defineProps<FontSelectorProps>(), {
  modelValue: "system",
  showFontSize: true,
  showTextSpacing: true,
  fontLabel: "Font Family",
  fontSizeLabel: "Font Size",
  textSpacingLabel: "Text Spacing",
  availableFonts: () => [
    {
      id: "system",
      name: "System Font",
      description: "Your device's default font",
      className: "ob-font-system",
    },
    {
      id: "atkinson",
      name: "Atkinson Hyperlegible",
      description: "Designed for low vision readers",
      className: "ob-font-accessible",
    },
    {
      id: "opendyslexic",
      name: "OpenDyslexic",
      description: "Designed for readers with dyslexia",
      className: "ob-font-dyslexic",
    },
    {
      id: "lexend",
      name: "Lexend",
      description: "Designed for improved reading fluency",
      className: "ob-font-readable",
    },
    {
      id: "inter",
      name: "Inter",
      description: "Modern, highly legible sans-serif",
      className: "ob-font-standard",
    },
  ],
});

/**
 * Emits for the FontSelector component
 */
const emit = defineEmits<{
  /**
   * Emitted when the selected font changes
   * @param value The new font value
   */
  (e: "update:modelValue", value: string): void;

  /**
   * Emitted when the font size changes
   * @param value The new font size value
   */
  (e: "fontSizeChange", value: string): void;

  /**
   * Emitted when the text spacing changes
   * @param value The new text spacing value
   */
  (e: "textSpacingChange", value: boolean): void;
}>();

// Internal state
const selectedFont = ref(props.modelValue);
const selectedFontSize = ref("base");
const enhancedSpacing = ref(false);

// Computed properties
const currentFontClass = computed(() => {
  const font = props.availableFonts.find((f) => f.id === selectedFont.value);
  return font ? font.className : "ob-font-system";
});

const currentFontSizeClass = computed(() => {
  switch (selectedFontSize.value) {
    case "large":
      return "ob-text-size-large";
    case "xl":
      return "ob-text-size-xl";
    default:
      return "ob-text-size-base";
  }
});

const spacingClass = computed(() => {
  return enhancedSpacing.value ? "ob-text-spacing-enhanced" : "";
});

// Watch for changes in props
watch(
  () => props.modelValue,
  (newValue) => {
    selectedFont.value = newValue;
  },
);

// Methods
const handleFontChange = (event: Event) => {
  const target = event.target as HTMLSelectElement;
  selectedFont.value = target.value;
  emit("update:modelValue", target.value);
};

const handleFontSizeChange = (event: Event) => {
  const target = event.target as HTMLSelectElement;
  selectedFontSize.value = target.value;
  emit("fontSizeChange", target.value);
};

const handleSpacingChange = (event: Event) => {
  const target = event.target as HTMLInputElement;
  enhancedSpacing.value = target.checked;
  emit("textSpacingChange", target.checked);
};
</script>

<template>
  <div class="ob-font-selector">
    <div class="ob-font-selector-group">
      <label :for="'ob-font-family-select'" class="ob-font-selector-label">{{
        fontLabel
      }}</label>
      <select
        :id="'ob-font-family-select'"
        class="ob-font-selector-select"
        :value="selectedFont"
        :class="currentFontClass"
        @change="handleFontChange"
      >
        <option
          v-for="font in availableFonts"
          :key="font.id"
          :value="font.id"
          :class="font.className"
        >
          {{ font.name }}
        </option>
      </select>
      <p
        v-if="
          selectedFont &&
          availableFonts.find((f) => f.id === selectedFont)?.description
        "
        class="ob-font-selector-description"
      >
        {{ availableFonts.find((f) => f.id === selectedFont)?.description }}
      </p>
    </div>

    <div v-if="showFontSize" class="ob-font-selector-group">
      <label :for="'ob-font-size-select'" class="ob-font-selector-label">{{
        fontSizeLabel
      }}</label>
      <select
        :id="'ob-font-size-select'"
        class="ob-font-selector-select"
        :value="selectedFontSize"
        :class="[currentFontClass, currentFontSizeClass]"
        @change="handleFontSizeChange"
      >
        <option value="base">Normal</option>
        <option value="large">Large</option>
        <option value="xl">Extra Large</option>
      </select>
    </div>

    <div v-if="showTextSpacing" class="ob-font-selector-group">
      <div class="ob-font-selector-checkbox-group">
        <input
          :id="'ob-text-spacing-checkbox'"
          type="checkbox"
          class="ob-font-selector-checkbox"
          :checked="enhancedSpacing"
          @change="handleSpacingChange"
        />
        <label
          :for="'ob-text-spacing-checkbox'"
          class="ob-font-selector-checkbox-label"
        >
          {{ textSpacingLabel }}
        </label>
      </div>
      <p class="ob-font-selector-description">
        Increases letter spacing and line height for easier reading
      </p>
    </div>

    <div
      class="ob-font-selector-preview"
      :class="[currentFontClass, currentFontSizeClass, spacingClass]"
    >
      <p>The quick brown fox jumps over the lazy dog.</p>
      <p>1234567890</p>
    </div>
  </div>
</template>

<style>
.ob-font-selector {
  display: flex;
  flex-direction: column;
  gap: var(--ob-space-4, 1rem);
  padding: var(--ob-space-4, 1rem);
  border: 1px solid var(--ob-border-color, #e2e8f0);
  border-radius: var(--ob-border-radius-md, 4px);
  background-color: var(--ob-bg-secondary, #f8f9fa);
}

.ob-font-selector-group {
  display: flex;
  flex-direction: column;
  gap: var(--ob-space-2, 0.5rem);
}

.ob-font-selector-label {
  font-weight: var(--ob-font-weight-medium, 500);
  color: var(--ob-text-primary, #1a202c);
}

.ob-font-selector-select {
  padding: var(--ob-space-2, 0.5rem);
  border: 1px solid var(--ob-border-color, #e2e8f0);
  border-radius: var(--ob-border-radius-md, 4px);
  background-color: var(--ob-bg-primary, #ffffff);
  min-height: 44px; /* Minimum touch target size */
}

.ob-font-selector-description {
  font-size: var(--ob-font-size-sm, 0.875rem);
  color: var(--ob-text-secondary, #4a5568);
  margin: 0;
}

.ob-font-selector-checkbox-group {
  display: flex;
  align-items: center;
  gap: var(--ob-space-2, 0.5rem);
}

.ob-font-selector-checkbox {
  width: 20px;
  height: 20px;
}

.ob-font-selector-checkbox-label {
  font-weight: var(--ob-font-weight-medium, 500);
  color: var(--ob-text-primary, #1a202c);
}

.ob-font-selector-preview {
  margin-top: var(--ob-space-4, 1rem);
  padding: var(--ob-space-4, 1rem);
  border: 1px solid var(--ob-border-color, #e2e8f0);
  border-radius: var(--ob-border-radius-md, 4px);
  background-color: var(--ob-bg-primary, #ffffff);
}

.ob-font-selector-preview p {
  margin: var(--ob-space-2, 0.5rem) 0;
}
</style>
