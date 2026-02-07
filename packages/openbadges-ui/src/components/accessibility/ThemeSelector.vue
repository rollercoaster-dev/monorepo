<script setup lang="ts">
import { ref, computed, watch } from "vue";

/**
 * Props for the ThemeSelector component
 */
interface ThemeSelectorProps {
  /**
   * The currently selected theme
   * @default 'default'
   */
  modelValue?: string;

  /**
   * The available theme options to display
   * @default all themes
   */
  availableThemes?: Array<{
    id: string;
    name: string;
    description?: string;
    className: string;
  }>;

  /**
   * The label for the theme selector
   * @default 'Theme'
   */
  themeLabel?: string;
}

const props = withDefaults(defineProps<ThemeSelectorProps>(), {
  modelValue: "default",
  themeLabel: "Theme",
  availableThemes: () => [
    {
      id: "default",
      name: "The Full Ride",
      description: "Standard theme with balanced colors and spacing",
      className: "ob-default-theme",
    },
    {
      id: "dark",
      name: "Night Ride",
      description:
        "Reduced light emission for comfortable viewing in low light",
      className: "ob-dark-theme",
    },
    {
      id: "high-contrast",
      name: "Bold Ink",
      description: "Maximum contrast for better visibility",
      className: "ob-high-contrast-theme",
    },
    {
      id: "large-text",
      name: "Same Ride, Bigger Seat",
      description: "Larger text sizes for improved readability",
      className: "ob-large-text-theme",
    },
    {
      id: "dyslexia-friendly",
      name: "Warm Studio",
      description:
        "Optimized for readers with dyslexia, with improved spacing and readability",
      className: "ob-dyslexia-friendly-theme",
    },
    {
      id: "low-vision",
      name: "Loud & Clear",
      description: "High contrast theme with larger text for low vision users",
      className: "ob-low-vision-theme",
    },
    {
      id: "low-info",
      name: "Clean Signal",
      description: "Reduced visual complexity for easier focus",
      className: "ob-low-info-theme",
    },
    {
      id: "autism-friendly",
      name: "Still Water",
      description: "Predictable layouts with reduced sensory stimulation",
      className: "ob-autism-friendly-theme",
    },
  ],
});

/**
 * Emits for the ThemeSelector component
 */
const emit = defineEmits<{
  /**
   * Emitted when the selected theme changes
   * @param value The new theme value
   */
  (e: "update:modelValue", value: string): void;
}>();

// Internal state
const selectedTheme = ref(props.modelValue);

// Computed properties
const currentThemeClass = computed(() => {
  const theme = props.availableThemes.find((t) => t.id === selectedTheme.value);
  return theme ? theme.className : "ob-default-theme";
});

const currentThemeDescription = computed(() => {
  const theme = props.availableThemes.find((t) => t.id === selectedTheme.value);
  return theme?.description || "";
});

// Watch for changes in props
watch(
  () => props.modelValue,
  (newValue) => {
    selectedTheme.value = newValue;
  },
);

// Methods
const handleThemeChange = (event: Event) => {
  const target = event.target as HTMLSelectElement;
  selectedTheme.value = target.value;
  emit("update:modelValue", target.value);
};
</script>

<template>
  <div class="ob-theme-selector">
    <div class="ob-theme-selector-group">
      <label :for="'ob-theme-select'" class="ob-theme-selector-label">{{
        themeLabel
      }}</label>
      <select
        :id="'ob-theme-select'"
        class="ob-theme-selector-select"
        :value="selectedTheme"
        @change="handleThemeChange"
      >
        <option
          v-for="theme in availableThemes"
          :key="theme.id"
          :value="theme.id"
        >
          {{ theme.name }}
        </option>
      </select>
      <p v-if="currentThemeDescription" class="ob-theme-selector-description">
        {{ currentThemeDescription }}
      </p>
    </div>

    <div class="ob-theme-selector-preview" :class="currentThemeClass">
      <div class="ob-theme-preview-header">Theme Preview</div>
      <div class="ob-theme-preview-content">
        <div class="ob-theme-preview-text">
          <h3 class="ob-theme-preview-title">Sample Badge</h3>
          <p class="ob-theme-preview-description">
            This is how content will appear with this theme.
          </p>
        </div>
        <div class="ob-theme-preview-button">View</div>
      </div>
    </div>
  </div>
</template>

<style>
.ob-theme-selector {
  display: flex;
  flex-direction: column;
  gap: var(--ob-space-4);
  padding: var(--ob-space-4);
  border: var(--ob-border-width) solid var(--ob-border-color);
  border-radius: var(--ob-border-radius-md);
  background-color: var(--ob-bg-secondary);
}

.ob-theme-selector-group {
  display: flex;
  flex-direction: column;
  gap: var(--ob-space-2);
}

.ob-theme-selector-label {
  font-weight: var(--ob-font-weight-medium);
  color: var(--ob-text-primary);
}

.ob-theme-selector-select {
  padding: var(--ob-space-2);
  border: var(--ob-border-width) solid var(--ob-border-color);
  border-radius: var(--ob-border-radius-md);
  background-color: var(--ob-bg-primary);
  min-height: 44px; /* Minimum touch target size */
}

.ob-theme-selector-description {
  font-size: var(--ob-font-size-sm);
  color: var(--ob-text-secondary);
  margin: 0;
}

.ob-theme-selector-preview {
  margin-top: var(--ob-space-2);
  border: var(--ob-border-width) solid var(--ob-border-color);
  border-radius: var(--ob-border-radius-md);
  overflow: hidden;
}

.ob-theme-preview-header {
  padding: var(--ob-space-2) var(--ob-space-4);
  background-color: var(--ob-primary);
  color: var(--ob-text-inverse);
  font-weight: var(--ob-font-weight-medium);
}

.ob-theme-preview-content {
  padding: var(--ob-space-4);
  background-color: var(--ob-bg-primary);
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.ob-theme-preview-title {
  margin: 0 0 var(--ob-space-2) 0;
  font-size: var(--ob-font-size-md);
  color: var(--ob-text-primary);
}

.ob-theme-preview-description {
  margin: 0;
  font-size: var(--ob-font-size-sm);
  color: var(--ob-text-secondary);
}

.ob-theme-preview-button {
  padding: var(--ob-space-2) var(--ob-space-4);
  background-color: var(--ob-primary);
  color: var(--ob-text-inverse);
  border-radius: var(--ob-border-radius-md);
  font-weight: var(--ob-font-weight-medium);
  cursor: pointer;
}
</style>
