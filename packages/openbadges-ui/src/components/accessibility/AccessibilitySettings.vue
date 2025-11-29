<script setup lang="ts">
import { ref, watch, onUnmounted } from "vue";
import FontSelector from "./FontSelector.vue";
import ThemeSelector from "./ThemeSelector.vue";

/**
 * Props for the AccessibilitySettings component
 */
interface AccessibilitySettingsProps {
  /**
   * The currently selected theme
   * @default 'default'
   */
  theme?: string;

  /**
   * The currently selected font
   * @default 'system'
   */
  font?: string;

  /**
   * Whether the settings are open
   * @default false
   */
  open?: boolean;

  /**
   * The title of the settings panel
   * @default 'Accessibility Settings'
   */
  title?: string;

  /**
   * Whether to show the motion reduction option
   * @default true
   */
  showMotionReduction?: boolean;

  /**
   * Whether to show the focus mode option
   * @default true
   */
  showFocusMode?: boolean;
}

const props = withDefaults(defineProps<AccessibilitySettingsProps>(), {
  theme: "default",
  font: "system",
  open: false,
  title: "Accessibility Settings",
  showMotionReduction: true,
  showFocusMode: true,
});

/**
 * Emits for the AccessibilitySettings component
 */
const emit = defineEmits<{
  /**
   * Emitted when the selected theme changes
   * @param value The new theme value
   */
  (e: "update:theme", value: string): void;

  /**
   * Emitted when the selected font changes
   * @param value The new font value
   */
  (e: "update:font", value: string): void;

  /**
   * Emitted when the open state changes
   * @param value The new open state
   */
  (e: "update:open", value: boolean): void;

  /**
   * Emitted when the motion reduction setting changes
   * @param value The new motion reduction state
   */
  (e: "motionReductionChange", value: boolean): void;

  /**
   * Emitted when the focus mode setting changes
   * @param value The new focus mode state
   */
  (e: "focusModeChange", value: boolean): void;

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

  /**
   * Emitted when all settings are reset to defaults
   */
  (e: "resetSettings"): void;
}>();

// Internal state
const isOpen = ref(props.open);
const selectedTheme = ref(props.theme);
const selectedFont = ref(props.font);
const reduceMotion = ref(false);
const focusMode = ref(false);

// Watch for changes in props
watch(
  () => props.open,
  (newValue) => {
    isOpen.value = newValue;
  },
);

watch(
  () => props.theme,
  (newValue) => {
    selectedTheme.value = newValue;
  },
);

watch(
  () => props.font,
  (newValue) => {
    selectedFont.value = newValue;
  },
);

// Methods
const toggleOpen = () => {
  isOpen.value = !isOpen.value;
  emit("update:open", isOpen.value);
};

const handleThemeChange = (value: string) => {
  selectedTheme.value = value;
  emit("update:theme", value);
};

const handleFontChange = (value: string) => {
  selectedFont.value = value;
  emit("update:font", value);
};

const handleMotionReductionChange = (event: Event) => {
  const target = event.target as HTMLInputElement;
  reduceMotion.value = target.checked;
  emit("motionReductionChange", target.checked);

  // Apply the class to the document body
  if (reduceMotion.value) {
    document.body.classList.add("ob-animations-none");
  } else {
    document.body.classList.remove("ob-animations-none");
  }
};

const handleFocusModeChange = (event: Event) => {
  const target = event.target as HTMLInputElement;
  focusMode.value = target.checked;
  emit("focusModeChange", target.checked);

  // Apply the class to the document body
  if (focusMode.value) {
    document.body.classList.add("ob-focus-mode");
  } else {
    document.body.classList.remove("ob-focus-mode");
  }
};

const handleFontSizeChange = (value: string) => {
  emit("fontSizeChange", value);
};

const handleTextSpacingChange = (value: boolean) => {
  emit("textSpacingChange", value);
};

const resetSettings = () => {
  selectedTheme.value = "default";
  selectedFont.value = "system";
  reduceMotion.value = false;
  focusMode.value = false;

  // Remove classes from the document body
  document.body.classList.remove("ob-animations-none", "ob-focus-mode");

  // Emit events
  emit("update:theme", "default");
  emit("update:font", "system");
  emit("motionReductionChange", false);
  emit("focusModeChange", false);
  emit("resetSettings");
};

// Cleanup on unmount - remove classes that were added to document.body
// This prevents class leakage when component is removed (e.g., route change)
onUnmounted(() => {
  if (reduceMotion.value) {
    document.body.classList.remove("ob-animations-none");
  }
  if (focusMode.value) {
    document.body.classList.remove("ob-focus-mode");
  }
});
</script>

<template>
  <div class="ob-accessibility-settings">
    <button
      class="ob-accessibility-toggle"
      :aria-expanded="isOpen"
      :aria-label="
        isOpen ? 'Close accessibility settings' : 'Open accessibility settings'
      "
      @click="toggleOpen"
    >
      <span class="ob-accessibility-icon">
        <svg
          xmlns="http://www.w3.org/2000/svg"
          width="24"
          height="24"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          stroke-width="2"
          stroke-linecap="round"
          stroke-linejoin="round"
        >
          <circle cx="12" cy="12" r="10" />
          <path d="M12 8v4" />
          <path d="M12 16h.01" />
        </svg>
      </span>
      <span class="ob-accessibility-toggle-text">Accessibility</span>
    </button>

    <div v-if="isOpen" class="ob-accessibility-panel">
      <div class="ob-accessibility-panel-header">
        <h2 class="ob-accessibility-panel-title">
          {{ title }}
        </h2>
        <button
          class="ob-accessibility-panel-close"
          aria-label="Close accessibility settings"
          @click="toggleOpen"
        >
          <svg
            xmlns="http://www.w3.org/2000/svg"
            width="24"
            height="24"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            stroke-width="2"
            stroke-linecap="round"
            stroke-linejoin="round"
          >
            <line x1="18" y1="6" x2="6" y2="18" />
            <line x1="6" y1="6" x2="18" y2="18" />
          </svg>
        </button>
      </div>

      <div class="ob-accessibility-panel-content">
        <ThemeSelector
          v-model="selectedTheme"
          @update:model-value="handleThemeChange"
        />

        <FontSelector
          v-model="selectedFont"
          @update:model-value="handleFontChange"
          @font-size-change="handleFontSizeChange"
          @text-spacing-change="handleTextSpacingChange"
        />

        <div
          v-if="showMotionReduction || showFocusMode"
          class="ob-accessibility-options"
        >
          <h3 class="ob-accessibility-options-title">Additional Options</h3>

          <div v-if="showMotionReduction" class="ob-accessibility-option">
            <div class="ob-accessibility-checkbox-group">
              <input
                id="ob-reduce-motion"
                type="checkbox"
                class="ob-accessibility-checkbox"
                :checked="reduceMotion"
                @change="handleMotionReductionChange"
              />
              <label
                for="ob-reduce-motion"
                class="ob-accessibility-checkbox-label"
              >
                Reduce Motion
              </label>
            </div>
            <p class="ob-accessibility-option-description">
              Minimizes animations and transitions for users with vestibular
              disorders
            </p>
          </div>

          <div v-if="showFocusMode" class="ob-accessibility-option">
            <div class="ob-accessibility-checkbox-group">
              <input
                id="ob-focus-mode"
                type="checkbox"
                class="ob-accessibility-checkbox"
                :checked="focusMode"
                @change="handleFocusModeChange"
              />
              <label
                for="ob-focus-mode"
                class="ob-accessibility-checkbox-label"
              >
                Focus Mode
              </label>
            </div>
            <p class="ob-accessibility-option-description">
              Reduces visual distractions to help maintain focus
            </p>
          </div>
        </div>

        <div class="ob-accessibility-panel-footer">
          <button class="ob-accessibility-reset-button" @click="resetSettings">
            Reset to Defaults
          </button>
        </div>
      </div>
    </div>
  </div>
</template>

<style>
.ob-accessibility-settings {
  position: relative;
  font-family: var(--ob-font-family, system-ui, sans-serif);
}

.ob-accessibility-toggle {
  display: flex;
  align-items: center;
  gap: var(--ob-space-2, 0.5rem);
  padding: var(--ob-space-2, 0.5rem) var(--ob-space-3, 0.75rem);
  background-color: var(--ob-primary, #3182ce);
  color: white;
  border: none;
  border-radius: var(--ob-border-radius-md, 4px);
  cursor: pointer;
  font-weight: var(--ob-font-weight-medium, 500);
  min-height: 44px; /* Minimum touch target size */
}

.ob-accessibility-toggle:hover {
  background-color: var(--ob-primary-dark, #2c5282);
}

.ob-accessibility-toggle:focus-visible {
  outline: 3px solid var(--ob-border-color-focus, #63b3ed);
  outline-offset: 2px;
}

.ob-accessibility-icon {
  display: flex;
  align-items: center;
  justify-content: center;
}

.ob-accessibility-panel {
  position: absolute;
  top: calc(100% + var(--ob-space-2, 0.5rem));
  right: 0;
  width: 350px;
  background-color: var(--ob-bg-primary, #ffffff);
  border: 1px solid var(--ob-border-color, #e2e8f0);
  border-radius: var(--ob-border-radius-lg, 8px);
  box-shadow: var(
    --ob-shadow-lg,
    0 10px 15px -3px rgba(0, 0, 0, 0.1),
    0 4px 6px -2px rgba(0, 0, 0, 0.05)
  );
  z-index: var(--ob-z-index-modal, 1000);
  max-height: 80vh;
  overflow-y: auto;
}

.ob-accessibility-panel-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: var(--ob-space-3, 0.75rem) var(--ob-space-4, 1rem);
  border-bottom: 1px solid var(--ob-border-color, #e2e8f0);
}

.ob-accessibility-panel-title {
  margin: 0;
  font-size: var(--ob-font-size-lg, 1.25rem);
  font-weight: var(--ob-font-weight-medium, 500);
  color: var(--ob-text-primary, #1a202c);
}

.ob-accessibility-panel-close {
  background: transparent;
  border: none;
  color: var(--ob-text-secondary, #4a5568);
  cursor: pointer;
  padding: var(--ob-space-1, 0.25rem);
  display: flex;
  align-items: center;
  justify-content: center;
  border-radius: var(--ob-border-radius-md, 4px);
}

.ob-accessibility-panel-close:hover {
  background-color: var(--ob-bg-secondary, #f8f9fa);
}

.ob-accessibility-panel-close:focus-visible {
  outline: 2px solid var(--ob-border-color-focus, #3182ce);
  outline-offset: 2px;
}

.ob-accessibility-panel-content {
  padding: var(--ob-space-4, 1rem);
  display: flex;
  flex-direction: column;
  gap: var(--ob-space-6, 1.5rem);
}

.ob-accessibility-options {
  display: flex;
  flex-direction: column;
  gap: var(--ob-space-4, 1rem);
  padding: var(--ob-space-4, 1rem);
  border: 1px solid var(--ob-border-color, #e2e8f0);
  border-radius: var(--ob-border-radius-md, 4px);
  background-color: var(--ob-bg-secondary, #f8f9fa);
}

.ob-accessibility-options-title {
  margin: 0 0 var(--ob-space-2, 0.5rem) 0;
  font-size: var(--ob-font-size-md, 1rem);
  font-weight: var(--ob-font-weight-medium, 500);
  color: var(--ob-text-primary, #1a202c);
}

.ob-accessibility-option {
  display: flex;
  flex-direction: column;
  gap: var(--ob-space-1, 0.25rem);
}

.ob-accessibility-checkbox-group {
  display: flex;
  align-items: center;
  gap: var(--ob-space-2, 0.5rem);
}

.ob-accessibility-checkbox {
  width: 20px;
  height: 20px;
}

.ob-accessibility-checkbox-label {
  font-weight: var(--ob-font-weight-medium, 500);
  color: var(--ob-text-primary, #1a202c);
}

.ob-accessibility-option-description {
  font-size: var(--ob-font-size-sm, 0.875rem);
  color: var(--ob-text-secondary, #4a5568);
  margin: 0;
}

.ob-accessibility-panel-footer {
  display: flex;
  justify-content: center;
  margin-top: var(--ob-space-4, 1rem);
}

.ob-accessibility-reset-button {
  padding: var(--ob-space-2, 0.5rem) var(--ob-space-4, 1rem);
  background-color: var(--ob-bg-secondary, #f8f9fa);
  color: var(--ob-text-primary, #1a202c);
  border: 1px solid var(--ob-border-color, #e2e8f0);
  border-radius: var(--ob-border-radius-md, 4px);
  cursor: pointer;
  font-weight: var(--ob-font-weight-medium, 500);
  min-height: 44px; /* Minimum touch target size */
}

.ob-accessibility-reset-button:hover {
  background-color: var(--ob-bg-tertiary, #edf2f7);
}

.ob-accessibility-reset-button:focus-visible {
  outline: 2px solid var(--ob-border-color-focus, #3182ce);
  outline-offset: 2px;
}

/* Responsive adjustments */
@media (max-width: 480px) {
  .ob-accessibility-toggle-text {
    display: none;
  }

  .ob-accessibility-panel {
    width: 100%;
    max-width: 100%;
    position: fixed;
    top: auto;
    bottom: 0;
    left: 0;
    right: 0;
    border-radius: var(--ob-border-radius-lg, 8px)
      var(--ob-border-radius-lg, 8px) 0 0;
    max-height: 80vh;
  }
}
</style>
