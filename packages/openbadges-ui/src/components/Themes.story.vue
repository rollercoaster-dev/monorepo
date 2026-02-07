<script setup lang="ts">
import { ref, computed, watch, onMounted } from "vue";

const selectedTheme = ref("default");

const themes = [
  { id: "default", name: "The Full Ride", className: "" },
  { id: "dark", name: "Night Ride", className: "ob-dark-theme" },
  {
    id: "high-contrast",
    name: "Bold Ink",
    className: "ob-high-contrast-theme",
  },
  { id: "large-text", name: "Bigger Seat", className: "ob-large-text-theme" },
  {
    id: "dyslexia-friendly",
    name: "Warm Studio",
    className: "ob-dyslexia-friendly-theme",
  },
  { id: "low-vision", name: "Loud & Clear", className: "ob-low-vision-theme" },
  { id: "low-info", name: "Clean Signal", className: "ob-low-info-theme" },
  {
    id: "autism-friendly",
    name: "Still Water",
    className: "ob-autism-friendly-theme",
  },
];

const currentThemeClass = computed(() => {
  const theme = themes.find((t) => t.id === selectedTheme.value);
  return theme?.className || "";
});

function applyTheme(themeClass: string) {
  const body = document.body;
  themes.forEach((t) => {
    if (t.className) body.classList.remove(t.className);
  });
  if (themeClass) body.classList.add(themeClass);
}

watch(currentThemeClass, (cls) => applyTheme(cls));
onMounted(() => applyTheme(currentThemeClass.value));
</script>

<template>
  <Story
    title="Design System/Themes"
    :layout="{ type: 'single', iframe: true, iframeHeight: 2400 }"
  >
    <Variant title="Overview">
      <div class="dt-page" :class="currentThemeClass">
        <!-- Theme Switcher -->
        <div class="dt-controls">
          <label for="dt-theme-select" class="dt-controls-label"
            >Active Theme</label
          >
          <select
            id="dt-theme-select"
            v-model="selectedTheme"
            class="dt-controls-select"
          >
            <option v-for="theme in themes" :key="theme.id" :value="theme.id">
              {{ theme.name }}
            </option>
          </select>
        </div>

        <!-- Narrative Sections -->
        <section class="dt-section">
          <h2 class="dt-section-title">Narrative Sections</h2>
          <p class="dt-section-desc">
            The rollercoaster.dev brand story unfolds in four sections, each
            with its own color palette.
          </p>
          <div class="playful-row" style="grid-template-columns: 1fr 1fr">
            <div class="section-block climb">
              <h3 class="dt-narrative-heading">The Climb</h3>
              <p class="dt-narrative-token">
                <code>--ob-narrative-climb-bg</code>
              </p>
              <p class="dt-narrative-token">
                <code>--ob-narrative-climb-text</code>
              </p>
            </div>
            <div class="section-block drop">
              <h3 class="dt-narrative-heading">The Drop</h3>
              <p class="dt-narrative-token">
                <code>--ob-narrative-drop-bg</code>
              </p>
              <p class="dt-narrative-token">
                <code>--ob-narrative-drop-text</code>
              </p>
              <span
                class="badge-label"
                style="
                  background: var(--ob-narrative-drop-accent);
                  color: var(--ob-narrative-drop-text);
                  margin-top: var(--ob-space-2);
                "
                >Accent</span
              >
            </div>
            <div class="section-block stories">
              <h3 class="dt-narrative-heading">The Stories</h3>
              <p class="dt-narrative-token">
                <code>--ob-narrative-stories-bg</code>
              </p>
              <p class="dt-narrative-token">
                <code>--ob-narrative-stories-text</code>
              </p>
              <div class="dt-accent-row">
                <span
                  class="badge-label"
                  style="
                    background: var(--ob-narrative-stories-accent-1);
                    color: var(--ob-narrative-stories-accent-foreground);
                  "
                  >Teal</span
                >
                <span
                  class="badge-label"
                  style="
                    background: var(--ob-narrative-stories-accent-2);
                    color: var(--ob-narrative-stories-accent-foreground);
                  "
                  >Orange</span
                >
                <span
                  class="badge-label"
                  style="
                    background: var(--ob-narrative-stories-accent-3);
                    color: var(--ob-narrative-stories-accent-foreground);
                  "
                  >Purple</span
                >
                <span
                  class="badge-label"
                  style="
                    background: var(--ob-narrative-stories-accent-4);
                    color: var(--ob-narrative-stories-accent-foreground);
                  "
                  >Sky</span
                >
              </div>
            </div>
            <div class="section-block relief">
              <h3 class="dt-narrative-heading">The Relief</h3>
              <p class="dt-narrative-token">
                <code>--ob-narrative-relief-bg</code>
              </p>
              <p class="dt-narrative-token">
                <code>--ob-narrative-relief-text</code>
              </p>
              <span
                class="badge-label"
                style="
                  background: var(--ob-narrative-relief-accent);
                  color: white;
                  margin-top: var(--ob-space-2);
                "
                >Emerald</span
              >
            </div>
          </div>
        </section>

        <!-- Semantic Colors -->
        <section class="dt-section">
          <h2 class="dt-section-title">Semantic Colors</h2>
          <p class="dt-section-desc">
            Background/foreground pairs that adapt to every theme.
          </p>
          <h3 class="dt-subsection">Surface Pairs</h3>
          <div class="dt-pair-grid">
            <div class="dt-pair">
              <div
                class="dt-pair-preview"
                style="
                  background: var(--ob-background);
                  color: var(--ob-foreground);
                "
              >
                Background
              </div>
              <div class="dt-pair-info">
                <span class="dt-pair-label">background / foreground</span>
              </div>
            </div>
            <div class="dt-pair">
              <div
                class="dt-pair-preview"
                style="
                  background: var(--ob-card);
                  color: var(--ob-card-foreground);
                "
              >
                Card
              </div>
              <div class="dt-pair-info">
                <span class="dt-pair-label">card / card-foreground</span>
              </div>
            </div>
            <div class="dt-pair">
              <div
                class="dt-pair-preview"
                style="
                  background: var(--ob-muted);
                  color: var(--ob-muted-foreground);
                "
              >
                Muted
              </div>
              <div class="dt-pair-info">
                <span class="dt-pair-label">muted / muted-foreground</span>
              </div>
            </div>
            <div class="dt-pair">
              <div
                class="dt-pair-preview"
                style="
                  background: var(--ob-accent);
                  color: var(--ob-accent-foreground);
                "
              >
                Accent
              </div>
              <div class="dt-pair-info">
                <span class="dt-pair-label">accent / accent-foreground</span>
              </div>
            </div>
          </div>

          <h3 class="dt-subsection">Interactive Pairs</h3>
          <div class="dt-pair-grid">
            <div class="dt-pair">
              <div
                class="dt-pair-preview"
                style="
                  background: var(--ob-primary);
                  color: var(--ob-primary-foreground);
                "
              >
                Primary
              </div>
              <div class="dt-pair-info">
                <span class="dt-pair-label">primary / primary-foreground</span>
              </div>
            </div>
            <div class="dt-pair">
              <div
                class="dt-pair-preview"
                style="
                  background: var(--ob-secondary);
                  color: var(--ob-secondary-foreground);
                "
              >
                Secondary
              </div>
              <div class="dt-pair-info">
                <span class="dt-pair-label"
                  >secondary / secondary-foreground</span
                >
              </div>
            </div>
            <div class="dt-pair">
              <div
                class="dt-pair-preview"
                style="
                  background: var(--ob-highlight);
                  color: var(--ob-highlight-foreground);
                "
              >
                Highlight
              </div>
              <div class="dt-pair-info">
                <span class="dt-pair-label"
                  >highlight / highlight-foreground</span
                >
              </div>
            </div>
          </div>

          <h3 class="dt-subsection">Status Colors</h3>
          <div class="dt-pair-grid">
            <div class="dt-pair">
              <div
                class="dt-pair-preview"
                style="background: var(--ob-success); color: white"
              >
                Success
              </div>
              <div class="dt-pair-info">
                <span class="dt-pair-label">success</span>
              </div>
            </div>
            <div class="dt-pair">
              <div
                class="dt-pair-preview"
                style="background: var(--ob-warning); color: black"
              >
                Warning
              </div>
              <div class="dt-pair-info">
                <span class="dt-pair-label">warning</span>
              </div>
            </div>
            <div class="dt-pair">
              <div
                class="dt-pair-preview"
                style="background: var(--ob-destructive); color: white"
              >
                Destructive
              </div>
              <div class="dt-pair-info">
                <span class="dt-pair-label">destructive</span>
              </div>
            </div>
            <div class="dt-pair">
              <div
                class="dt-pair-preview"
                style="background: var(--ob-info); color: white"
              >
                Info
              </div>
              <div class="dt-pair-info">
                <span class="dt-pair-label">info</span>
              </div>
            </div>
          </div>
        </section>

        <!-- Typography -->
        <section class="dt-section">
          <h2 class="dt-section-title">Typography</h2>
          <p class="dt-section-desc">
            Three font families define the hierarchy.
          </p>
          <div class="type-samples">
            <div class="dt-type-row">
              <span
                class="dt-type-sample"
                style="
                  font-family: var(--ob-font-headline);
                  font-size: var(--ob-font-size-2xl);
                  font-weight: var(--ob-font-weight-bold);
                  letter-spacing: var(--ob-font-letterSpacing-tight);
                "
                >Anybody Headline</span
              >
              <code class="dt-type-meta">--ob-font-headline</code>
            </div>
            <div class="dt-type-row">
              <span
                class="dt-type-sample"
                style="
                  font-family: var(--ob-font-family);
                  font-size: var(--ob-font-size-md);
                "
                >Instrument Sans body copy, calm and readable.</span
              >
              <code class="dt-type-meta">--ob-font-family</code>
            </div>
            <div class="dt-type-row">
              <span
                class="dt-type-sample"
                style="
                  font-family: var(--ob-font-mono);
                  font-size: var(--ob-font-size-sm);
                "
                >DM Mono for code and metadata</span
              >
              <code class="dt-type-meta">--ob-font-mono</code>
            </div>
          </div>
        </section>

        <!-- Shadows -->
        <section class="dt-section">
          <h2 class="dt-section-title">Hard Shadows</h2>
          <p class="dt-section-desc">
            Flat, graphic-style drop shadows at three scales.
          </p>
          <div class="dt-shadow-grid">
            <div class="dt-shadow-item">
              <div
                class="dt-shadow-box"
                style="box-shadow: var(--ob-shadow-hard-sm)"
              />
              <code class="dt-shadow-label">--ob-shadow-hard-sm</code>
            </div>
            <div class="dt-shadow-item">
              <div
                class="dt-shadow-box"
                style="box-shadow: var(--ob-shadow-hard-md)"
              />
              <code class="dt-shadow-label">--ob-shadow-hard-md</code>
            </div>
            <div class="dt-shadow-item">
              <div
                class="dt-shadow-box"
                style="box-shadow: var(--ob-shadow-hard-lg)"
              />
              <code class="dt-shadow-label">--ob-shadow-hard-lg</code>
            </div>
          </div>
        </section>

        <!-- Spacing -->
        <section class="dt-section">
          <h2 class="dt-section-title">Spacing Scale</h2>
          <div class="dt-space-list">
            <div
              v-for="n in [1, 2, 3, 4, 5, 6, 8, 10, 12]"
              :key="n"
              class="dt-space-item"
            >
              <div
                class="dt-space-bar"
                :style="{ width: `var(--ob-space-${n})` }"
              />
              <code class="dt-space-meta">--ob-space-{{ n }}</code>
            </div>
          </div>
        </section>

        <!-- Border & Radius -->
        <section class="dt-section">
          <h2 class="dt-section-title">Borders & Radius</h2>
          <div class="dt-radius-grid">
            <div class="dt-radius-item">
              <div
                class="dt-radius-box"
                style="border-radius: var(--ob-border-radius-sm)"
              />
              <code>--ob-border-radius-sm</code>
            </div>
            <div class="dt-radius-item">
              <div
                class="dt-radius-box"
                style="border-radius: var(--ob-border-radius-md)"
              />
              <code>--ob-border-radius-md</code>
            </div>
            <div class="dt-radius-item">
              <div
                class="dt-radius-box"
                style="border-radius: var(--ob-border-radius-lg)"
              />
              <code>--ob-border-radius-lg</code>
            </div>
            <div class="dt-radius-item">
              <div
                class="dt-radius-box"
                style="border-radius: var(--ob-border-radius-pill)"
              />
              <code>--ob-border-radius-pill</code>
            </div>
          </div>
        </section>
      </div>
    </Variant>
  </Story>
</template>

<style>
.dt-page {
  padding: var(--ob-space-8);
  background: var(--ob-background);
  color: var(--ob-foreground);
  font-family: var(--ob-font-family);
  min-height: 100%;
}

.dt-controls {
  display: flex;
  align-items: center;
  gap: var(--ob-space-3);
  margin-bottom: var(--ob-space-8);
  padding: var(--ob-space-3) var(--ob-space-4);
  background: var(--ob-card);
  border: var(--ob-border-width-medium) solid var(--ob-border);
  border-radius: var(--ob-border-radius-sm);
  box-shadow: var(--ob-shadow-hard-sm);
}

.dt-controls-label {
  font-family: var(--ob-font-headline);
  font-weight: var(--ob-font-weight-bold);
  font-size: var(--ob-font-size-sm);
  letter-spacing: var(--ob-font-letterSpacing-tight);
}

.dt-controls-select {
  padding: var(--ob-space-2) var(--ob-space-3);
  border: var(--ob-border-width-medium) solid var(--ob-border);
  border-radius: var(--ob-border-radius-sm);
  background: var(--ob-background);
  color: var(--ob-foreground);
  font-size: var(--ob-font-size-sm);
}

.dt-section {
  margin-bottom: var(--ob-space-10);
}

.dt-section-title {
  font-family: var(--ob-font-headline);
  font-size: var(--ob-font-size-xl);
  font-weight: var(--ob-font-weight-bold);
  letter-spacing: var(--ob-font-letterSpacing-tight);
  margin: 0 0 var(--ob-space-1);
}

.dt-subsection {
  font-family: var(--ob-font-headline);
  font-size: var(--ob-font-size-md);
  font-weight: var(--ob-font-weight-bold);
  letter-spacing: var(--ob-font-letterSpacing-tight);
  margin: var(--ob-space-4) 0 var(--ob-space-2);
  color: var(--ob-foreground);
}

.dt-section-desc {
  color: var(--ob-muted-foreground);
  font-size: var(--ob-font-size-sm);
  margin: 0 0 var(--ob-space-4);
}

.dt-narrative-heading {
  font-family: var(--ob-font-headline);
  font-size: var(--ob-font-size-lg);
  font-weight: var(--ob-font-weight-bold);
  margin: 0 0 var(--ob-space-2);
  color: inherit;
}

.dt-narrative-token {
  margin: var(--ob-space-1) 0;
  font-size: var(--ob-font-size-xs);
  color: inherit;
  opacity: 0.8;
}

.dt-narrative-token code {
  font-family: var(--ob-font-mono);
  color: inherit;
}

.dt-accent-row {
  display: flex;
  flex-wrap: wrap;
  gap: var(--ob-space-2);
  margin-top: var(--ob-space-2);
}

/* Semantic color pairs */
.dt-pair-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(200px, 1fr));
  gap: var(--ob-space-3);
}

.dt-pair {
  border: var(--ob-border-width-medium) solid var(--ob-border);
  border-radius: var(--ob-border-radius-sm);
  overflow: hidden;
  box-shadow: var(--ob-shadow-hard-md);
}

.dt-pair-preview {
  height: 56px;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: var(--ob-font-size-sm);
  font-weight: var(--ob-font-weight-semibold);
  border-bottom: var(--ob-border-width-medium) solid var(--ob-border);
}

.dt-pair-info {
  padding: var(--ob-space-2) var(--ob-space-3);
  background: var(--ob-card);
}

.dt-pair-label {
  font-size: var(--ob-font-size-xs);
  font-family: var(--ob-font-mono);
  font-weight: var(--ob-font-weight-semibold);
}

/* Typography rows */
.dt-type-row {
  display: flex;
  align-items: baseline;
  justify-content: space-between;
  gap: var(--ob-space-4);
  padding: var(--ob-space-3) var(--ob-space-4);
  background: var(--ob-card);
  border: var(--ob-border-width-medium) solid var(--ob-border);
  border-radius: var(--ob-border-radius-sm);
  margin-bottom: var(--ob-space-2);
}

.dt-type-sample {
  color: var(--ob-foreground);
}

.dt-type-meta {
  font-family: var(--ob-font-mono);
  font-size: var(--ob-font-size-xs);
  color: var(--ob-muted-foreground);
  white-space: nowrap;
}

/* Shadow showcase */
.dt-shadow-grid {
  display: flex;
  gap: var(--ob-space-6);
  flex-wrap: wrap;
}

.dt-shadow-item {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: var(--ob-space-3);
}

.dt-shadow-box {
  width: 100px;
  height: 100px;
  background: var(--ob-card);
  border: var(--ob-border-width-medium) solid var(--ob-border);
  border-radius: var(--ob-border-radius-sm);
}

.dt-shadow-label {
  font-family: var(--ob-font-mono);
  font-size: var(--ob-font-size-xs);
  color: var(--ob-muted-foreground);
}

/* Spacing bars */
.dt-space-list {
  display: flex;
  flex-direction: column;
  gap: var(--ob-space-2);
}

.dt-space-item {
  display: flex;
  align-items: center;
  gap: var(--ob-space-4);
}

.dt-space-bar {
  height: 24px;
  background: var(--ob-accent);
  border-radius: var(--ob-border-radius-sm);
  min-width: 4px;
}

.dt-space-meta {
  font-family: var(--ob-font-mono);
  font-size: var(--ob-font-size-xs);
  color: var(--ob-muted-foreground);
  white-space: nowrap;
}

/* Radius grid */
.dt-radius-grid {
  display: flex;
  gap: var(--ob-space-4);
  flex-wrap: wrap;
}

.dt-radius-item {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: var(--ob-space-2);
  padding: var(--ob-space-4);
  background: var(--ob-card);
  border: var(--ob-border-width-medium) solid var(--ob-border);
  border-radius: var(--ob-border-radius-sm);
}

.dt-radius-box {
  width: 72px;
  height: 72px;
  background: var(--ob-muted);
  border: var(--ob-border-width-medium) solid var(--ob-accent);
}

.dt-radius-item code {
  font-family: var(--ob-font-mono);
  font-size: var(--ob-font-size-xs);
  color: var(--ob-muted-foreground);
}
</style>
