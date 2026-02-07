<script setup lang="ts">
import { ref } from "vue";

const copiedVar = ref("");

function copyVar(varName: string) {
  navigator.clipboard.writeText(`var(${varName})`);
  copiedVar.value = varName;
  setTimeout(() => {
    copiedVar.value = "";
  }, 1500);
}

const spaceScale = [
  { label: "1", varName: "--ob-space-1", rem: "0.25rem", px: "4px" },
  { label: "2", varName: "--ob-space-2", rem: "0.5rem", px: "8px" },
  { label: "3", varName: "--ob-space-3", rem: "0.75rem", px: "12px" },
  { label: "4", varName: "--ob-space-4", rem: "1rem", px: "16px" },
  { label: "5", varName: "--ob-space-5", rem: "1.25rem", px: "20px" },
  { label: "6", varName: "--ob-space-6", rem: "1.5rem", px: "24px" },
  { label: "8", varName: "--ob-space-8", rem: "2rem", px: "32px" },
  { label: "10", varName: "--ob-space-10", rem: "2.5rem", px: "40px" },
  { label: "12", varName: "--ob-space-12", rem: "3rem", px: "48px" },
  { label: "16", varName: "--ob-space-16", rem: "4rem", px: "64px" },
];

const radii = [
  { label: "sm", varName: "--ob-radius-sm", value: "0.125rem", px: "2px" },
  { label: "md", varName: "--ob-radius-md", value: "0.25rem", px: "4px" },
  { label: "lg", varName: "--ob-radius-lg", value: "0.5rem", px: "8px" },
  { label: "xl", varName: "--ob-radius-xl", value: "0.75rem", px: "12px" },
  { label: "pill", varName: "--ob-radius-pill", value: "9999px", px: "pill" },
];

const borderWidths = [
  { label: "Thin", varName: "--ob-borderWidth-thin", value: "1px" },
  { label: "Default", varName: "--ob-borderWidth-default", value: "1px" },
  {
    label: "Medium",
    varName: "--ob-borderWidth-medium",
    value: "2px",
    desc: "Neo-brutalist standard",
  },
  { label: "Thick", varName: "--ob-borderWidth-thick", value: "3px" },
];

const shadows = [
  { label: "sm", varName: "--ob-shadow-sm", value: "none" },
  { label: "md", varName: "--ob-shadow-md", value: "none" },
  {
    label: "lg",
    varName: "--ob-shadow-lg",
    value: "0 4px 12px rgba(0,0,0,0.08)",
  },
  {
    label: "hard-sm",
    varName: "--ob-shadow-hard-sm",
    value: "2px 2px 0 rgba(0,0,0,0.15)",
  },
  {
    label: "hard-md",
    varName: "--ob-shadow-hard-md",
    value: "3px 3px 0 rgba(0,0,0,0.15)",
  },
  {
    label: "hard-lg",
    varName: "--ob-shadow-hard-lg",
    value: "4px 4px 0 rgba(0,0,0,0.15)",
  },
  {
    label: "focus",
    varName: "--ob-shadow-focus",
    value: "0 0 0 3px rgba(10,10,10,0.4)",
  },
];
</script>

<template>
  <Story
    title="Design System/Spacing"
    :layout="{ type: 'single', iframe: true }"
  >
    <template #docs>
      <div class="histoire-docs">
        <h1>Spacing & Layout Tokens</h1>
        <p>
          Space scale, border radius, border widths, and shadow tokens. The
          shadow system favors hard offsets (neo-brutalist) over blurred
          shadows.
        </p>
        <p>Click any token name to copy its CSS variable reference.</p>
      </div>
    </template>

    <Variant title="Space Scale">
      <div class="ds-page">
        <h2 class="ds-title">Space Scale</h2>
        <p class="ds-desc">
          10-step spacing scale for margins, padding, and gaps.
        </p>
        <div class="ds-space-list">
          <button
            v-for="space in spaceScale"
            :key="space.varName"
            class="ds-space-item"
            @click="copyVar(space.varName)"
          >
            <div
              class="ds-space-bar"
              :style="{ width: `var(${space.varName})` }"
            />
            <div class="ds-space-meta">
              <span>{{ space.varName }}</span>
              <span class="ds-space-detail"
                >{{ space.rem }} / {{ space.px }}</span
              >
              <span v-if="copiedVar === space.varName" class="ds-copied-inline"
                >Copied!</span
              >
            </div>
          </button>
        </div>
      </div>
    </Variant>

    <Variant title="Border Radius">
      <div class="ds-page">
        <h2 class="ds-title">Border Radius</h2>
        <p class="ds-desc">
          Five radius steps from subtle rounding to full pill.
        </p>
        <div class="ds-radius-grid">
          <button
            v-for="r in radii"
            :key="r.varName"
            class="ds-radius-box"
            @click="copyVar(r.varName)"
          >
            <div
              class="ds-radius-preview"
              :style="{ borderRadius: `var(${r.varName})` }"
            />
            <div class="ds-radius-meta">
              <strong>{{ r.label }}</strong>
              <span>{{ r.value }}</span>
              <code>{{ r.varName }}</code>
              <span v-if="copiedVar === r.varName" class="ds-copied-inline"
                >Copied!</span
              >
            </div>
          </button>
        </div>
      </div>
    </Variant>

    <Variant title="Border Widths">
      <div class="ds-page">
        <h2 class="ds-title">Border Widths</h2>
        <p class="ds-desc">
          Four border width steps. Medium (2px) is the neo-brutalist standard.
        </p>
        <div class="ds-border-grid">
          <button
            v-for="bw in borderWidths"
            :key="bw.varName"
            class="ds-border-card"
            @click="copyVar(bw.varName)"
          >
            <div
              class="ds-border-preview"
              :style="{ borderWidth: `var(${bw.varName})` }"
            />
            <div class="ds-border-meta">
              <strong>{{ bw.label }}</strong>
              <span>{{ bw.value }}</span>
              <span v-if="bw.desc" class="ds-border-note">{{ bw.desc }}</span>
              <code>{{ bw.varName }}</code>
              <span v-if="copiedVar === bw.varName" class="ds-copied-inline"
                >Copied!</span
              >
            </div>
          </button>
        </div>
      </div>
    </Variant>

    <Variant title="Shadows">
      <div class="ds-page">
        <h2 class="ds-title">Shadows</h2>
        <p class="ds-desc">
          Soft shadows (sm, md, lg), neo-brutalist hard offsets (hard-sm/md/lg),
          and a focus ring.
        </p>
        <div class="ds-shadow-grid">
          <button
            v-for="s in shadows"
            :key="s.varName"
            class="ds-shadow-box"
            @click="copyVar(s.varName)"
          >
            <div
              class="ds-shadow-preview"
              :style="{ boxShadow: `var(${s.varName})` }"
            />
            <div class="ds-shadow-meta">
              <strong>{{ s.label }}</strong>
              <code>{{ s.value }}</code>
              <code>{{ s.varName }}</code>
              <span v-if="copiedVar === s.varName" class="ds-copied-inline"
                >Copied!</span
              >
            </div>
          </button>
        </div>
      </div>
    </Variant>
  </Story>
</template>

<style scoped>
/* ── Page layout ── */
.ds-page {
  padding: var(--ob-space-8, 2rem) var(--ob-space-12, 3rem);
  font-family: var(--ob-font-family, system-ui, sans-serif);
  color: var(--ob-foreground, #262626);
  background: var(--ob-background, #fafafa);
  max-width: 1200px;
}

.ds-title {
  font-size: var(--ob-font-size-xl, 1.25rem);
  font-weight: var(--ob-font-weight-bold, 700);
  margin: 0 0 var(--ob-space-1, 0.25rem);
}

.ds-desc {
  font-size: var(--ob-font-size-sm, 0.875rem);
  color: var(--ob-muted-foreground, #737373);
  margin: 0 0 var(--ob-space-5, 1.25rem);
}

.ds-copied-inline {
  font-size: var(--ob-font-size-2xs, 0.625rem);
  font-weight: var(--ob-font-weight-bold, 700);
  color: var(--ob-color-success, #059669);
  margin-left: var(--ob-space-2, 0.5rem);
}

/* ── Space scale (matches shared.css .space-item) ── */
.ds-space-list {
  display: flex;
  flex-direction: column;
  gap: var(--ob-space-2, 0.5rem);
}

.ds-space-item {
  all: unset;
  cursor: pointer;
  display: flex;
  align-items: center;
  gap: var(--ob-space-4, 1rem);
  transition: opacity var(--ob-transition-fast, 150ms);
}

.ds-space-item:hover {
  opacity: 0.8;
}

.ds-space-bar {
  height: 24px;
  background: var(--ob-primary, #0a0a0a);
  border-radius: var(--ob-border-radius-md, 0.25rem);
  opacity: 0.8;
  min-width: 2px;
  transition: opacity var(--ob-transition-fast, 150ms);
}

.ds-space-item:hover .ds-space-bar {
  opacity: 1;
}

.ds-space-meta {
  font-size: var(--ob-font-size-xs, 0.75rem);
  font-family: var(--ob-font-mono, monospace);
  color: var(--ob-foreground, #262626);
  white-space: nowrap;
  min-width: 200px;
  display: flex;
  align-items: center;
  gap: var(--ob-space-3, 0.75rem);
}

.ds-space-detail {
  color: var(--ob-muted-foreground, #737373);
}

/* ── Border radius (matches shared.css .radius-box) ── */
.ds-radius-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(140px, 1fr));
  gap: var(--ob-space-3, 0.75rem);
}

.ds-radius-box {
  all: unset;
  cursor: pointer;
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: var(--ob-space-2, 0.5rem);
  padding: var(--ob-space-4, 1rem);
  background: var(--ob-card, #fff);
  border: var(--ob-borderWidth-thin, 1px) solid var(--ob-border, #e5e5e5);
  border-radius: var(--ob-border-radius-lg, 0.5rem);
  transition: transform var(--ob-transition-fast, 150ms);
}

.ds-radius-box:hover {
  transform: translate(-1px, -1px);
}

.ds-radius-preview {
  width: 72px;
  height: 72px;
  background: var(--ob-muted, #fafafa);
  border: var(--ob-borderWidth-medium, 2px) solid var(--ob-primary, #0a0a0a);
}

.ds-radius-meta {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 0.125rem;
  font-size: var(--ob-font-size-xs, 0.75rem);
  font-family: var(--ob-font-mono, monospace);
  color: var(--ob-foreground, #262626);
  text-align: center;
}

.ds-radius-meta span {
  color: var(--ob-muted-foreground, #737373);
}

.ds-radius-meta code {
  font-size: var(--ob-font-size-2xs, 0.625rem);
  color: var(--ob-muted-foreground, #737373);
}

/* ── Border widths ── */
.ds-border-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(180px, 1fr));
  gap: var(--ob-space-3, 0.75rem);
}

.ds-border-card {
  all: unset;
  cursor: pointer;
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: var(--ob-space-3, 0.75rem);
  padding: var(--ob-space-4, 1rem);
  background: var(--ob-card, #fff);
  border: var(--ob-borderWidth-thin, 1px) solid var(--ob-border, #e5e5e5);
  border-radius: var(--ob-border-radius-lg, 0.5rem);
  transition: transform var(--ob-transition-fast, 150ms);
}

.ds-border-card:hover {
  transform: translate(-1px, -1px);
}

.ds-border-preview {
  width: 100%;
  height: 60px;
  border-style: solid;
  border-color: var(--ob-primary, #0a0a0a);
  border-radius: var(--ob-border-radius-sm, 0.125rem);
  background: var(--ob-card, #fff);
}

.ds-border-meta {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 0.125rem;
  font-size: var(--ob-font-size-xs, 0.75rem);
  font-family: var(--ob-font-mono, monospace);
  color: var(--ob-foreground, #262626);
  text-align: center;
}

.ds-border-meta span {
  color: var(--ob-muted-foreground, #737373);
}

.ds-border-note {
  font-style: italic;
  font-size: var(--ob-font-size-2xs, 0.625rem);
}

.ds-border-meta code {
  font-size: var(--ob-font-size-2xs, 0.625rem);
  color: var(--ob-muted-foreground, #737373);
}

/* ── Shadows (matches shared.css .shadow-box) ── */
.ds-shadow-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(180px, 1fr));
  gap: var(--ob-space-4, 1rem);
}

.ds-shadow-box {
  all: unset;
  cursor: pointer;
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: var(--ob-space-2, 0.5rem);
  padding: var(--ob-space-6, 1.5rem) var(--ob-space-4, 1rem)
    var(--ob-space-4, 1rem);
  background: var(--ob-card, #fff);
  border-radius: var(--ob-border-radius-xl, 0.75rem);
  transition: transform var(--ob-transition-fast, 150ms);
}

.ds-shadow-box:hover {
  transform: translateY(-2px);
}

.ds-shadow-preview {
  width: 80px;
  height: 80px;
  background: var(--ob-background, #fafafa);
  border-radius: var(--ob-border-radius-lg, 0.5rem);
}

.ds-shadow-meta {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 0.125rem;
  font-size: var(--ob-font-size-xs, 0.75rem);
  font-family: var(--ob-font-mono, monospace);
  color: var(--ob-foreground, #262626);
  text-align: center;
}

.ds-shadow-meta code {
  font-size: var(--ob-font-size-2xs, 0.625rem);
  color: var(--ob-muted-foreground, #737373);
  word-break: break-all;
}
</style>
