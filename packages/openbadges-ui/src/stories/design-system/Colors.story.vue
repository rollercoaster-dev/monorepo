<script setup lang="ts">
import { useCopyVar } from "./useCopyVar";

const { copiedVar, copyVar } = useCopyVar();

const accentColors = [
  { name: "--ob-color-accent-purple", hex: "#a78bfa", label: "Purple" },
  { name: "--ob-color-accent-mint", hex: "#d4f4e7", label: "Mint" },
  { name: "--ob-color-accent-yellow", hex: "#ffe50c", label: "Yellow" },
  { name: "--ob-color-accent-emerald", hex: "#059669", label: "Emerald" },
  { name: "--ob-color-accent-teal", hex: "#00d4aa", label: "Teal" },
  { name: "--ob-color-accent-orange", hex: "#ff6b35", label: "Orange" },
  { name: "--ob-color-accent-sky", hex: "#38bdf8", label: "Sky" },
];

const grayScale = [
  { name: "--ob-color-gray-50", hex: "#fafafa", label: "50" },
  { name: "--ob-color-gray-100", hex: "#f5f5f5", label: "100" },
  { name: "--ob-color-gray-200", hex: "#e5e5e5", label: "200" },
  { name: "--ob-color-gray-300", hex: "#d4d4d4", label: "300" },
  { name: "--ob-color-gray-400", hex: "#a3a3a3", label: "400" },
  { name: "--ob-color-gray-500", hex: "#737373", label: "500" },
  { name: "--ob-color-gray-600", hex: "#525252", label: "600" },
  { name: "--ob-color-gray-700", hex: "#404040", label: "700" },
  { name: "--ob-color-gray-800", hex: "#262626", label: "800" },
  { name: "--ob-color-gray-900", hex: "#0a0a0a", label: "900" },
];

const semanticColors = [
  {
    bg: "--ob-background",
    fg: "--ob-foreground",
    label: "Background / Foreground",
  },
  { bg: "--ob-card", fg: "--ob-card-foreground", label: "Card" },
  { bg: "--ob-muted", fg: "--ob-muted-foreground", label: "Muted" },
  { bg: "--ob-primary", fg: "--ob-primary-foreground", label: "Primary" },
  { bg: "--ob-secondary", fg: "--ob-secondary-foreground", label: "Secondary" },
  { bg: "--ob-accent", fg: "--ob-accent-foreground", label: "Accent" },
  { bg: "--ob-highlight", fg: "--ob-highlight-foreground", label: "Highlight" },
  {
    bg: "--ob-destructive",
    fg: "--ob-destructive-foreground",
    label: "Destructive",
  },
  { bg: "--ob-success", fg: "--ob-success-foreground", label: "Success" },
  { bg: "--ob-warning", fg: "--ob-warning-foreground", label: "Warning" },
  { bg: "--ob-info", fg: "--ob-info-foreground", label: "Info" },
];

const narrativeSections = [
  {
    name: "The Climb",
    cssClass: "climb",
    bg: "--ob-narrative-climb-bg",
    text: "--ob-narrative-climb-text",
    borderColor: "var(--ob-narrative-climb-text)",
    accents: [],
    bgHex: "#ffe50c",
    textHex: "#0a0a0a",
  },
  {
    name: "The Drop",
    cssClass: "drop",
    bg: "--ob-narrative-drop-bg",
    text: "--ob-narrative-drop-text",
    borderColor: "var(--ob-narrative-drop-accent)",
    accents: [
      { name: "--ob-narrative-drop-accent", hex: "#a78bfa", label: "Accent" },
    ],
    bgHex: "#0a0a0a",
    textHex: "#fafafa",
  },
  {
    name: "The Stories",
    cssClass: "stories",
    bg: "--ob-narrative-stories-bg",
    text: "--ob-narrative-stories-text",
    borderColor: "var(--ob-narrative-stories-accent-1)",
    accents: [
      {
        name: "--ob-narrative-stories-accent-1",
        hex: "#00d4aa",
        label: "Teal",
      },
      {
        name: "--ob-narrative-stories-accent-2",
        hex: "#ff6b35",
        label: "Orange",
      },
      {
        name: "--ob-narrative-stories-accent-3",
        hex: "#a855f7",
        label: "Purple",
      },
      { name: "--ob-narrative-stories-accent-4", hex: "#38bdf8", label: "Sky" },
    ],
    bgHex: "#2b1f4b",
    textHex: "#fafafa",
  },
  {
    name: "The Relief",
    cssClass: "relief",
    bg: "--ob-narrative-relief-bg",
    text: "--ob-narrative-relief-text",
    borderColor: "var(--ob-narrative-relief-accent)",
    accents: [
      {
        name: "--ob-narrative-relief-accent",
        hex: "#059669",
        label: "Emerald",
      },
    ],
    bgHex: "#d4f4e7",
    textHex: "#0a0a0a",
  },
];

function isLight(hex: string): boolean {
  const r = parseInt(hex.slice(1, 3), 16);
  const g = parseInt(hex.slice(3, 5), 16);
  const b = parseInt(hex.slice(5, 7), 16);
  return (r * 299 + g * 587 + b * 114) / 1000 > 128;
}
</script>

<template>
  <Story
    title="Design System/Colors"
    :layout="{ type: 'single', iframe: true }"
  >
    <template #docs>
      <div class="histoire-docs">
        <h1>Color Tokens</h1>
        <p>
          The design-tokens package provides a layered color system: accent
          palette, grays, a semantic layer for UI states, and narrative section
          colors for the rollercoaster.dev brand story.
        </p>
        <p>Click any swatch to copy its CSS variable reference.</p>
      </div>
    </template>

    <Variant title="Accent Colors">
      <div class="ds-page">
        <h2 class="ds-title">Accent Colors</h2>
        <p class="ds-desc">
          Vibrant accents drawn from the landing page design language.
        </p>
        <div class="ds-swatch-grid">
          <button
            v-for="color in accentColors"
            :key="color.name"
            class="ds-swatch"
            :title="`Click to copy var(${color.name})`"
            @click="copyVar(color.name)"
          >
            <div
              class="ds-swatch-color"
              :style="{ backgroundColor: `var(${color.name})` }"
            >
              <span v-if="copiedVar === color.name" class="ds-copied"
                >Copied!</span
              >
            </div>
            <div class="ds-swatch-info">
              <code class="ds-swatch-var">{{ color.name }}</code>
              <span class="ds-swatch-value">{{ color.hex }}</span>
            </div>
          </button>
        </div>
      </div>
    </Variant>

    <Variant title="Gray Scale">
      <div class="ds-page">
        <h2 class="ds-title">Gray Scale</h2>
        <p class="ds-desc">
          Neutral gray palette from 50 (lightest) to 900 (darkest).
        </p>
        <div class="ds-gray-strip">
          <button
            v-for="gray in grayScale"
            :key="gray.name"
            class="ds-gray-cell"
            :title="`Click to copy var(${gray.name})`"
            @click="copyVar(gray.name)"
          >
            <div
              class="ds-gray-fill"
              :style="{ backgroundColor: `var(${gray.name})` }"
            >
              <span v-if="copiedVar === gray.name" class="ds-copied"
                >Copied!</span
              >
            </div>
            <div class="ds-gray-meta">
              <span class="ds-gray-label">{{ gray.label }}</span>
              <span class="ds-gray-hex">{{ gray.hex }}</span>
            </div>
          </button>
        </div>
      </div>
    </Variant>

    <Variant title="Semantic Colors">
      <div class="ds-page">
        <h2 class="ds-title">Semantic Colors</h2>
        <p class="ds-desc">
          Background/foreground pairs for UI contexts. These remap across
          themes.
        </p>
        <div class="ds-pair-grid">
          <div v-for="pair in semanticColors" :key="pair.label" class="ds-pair">
            <div
              class="ds-pair-preview"
              :style="{
                backgroundColor: `var(${pair.bg})`,
                color: `var(${pair.fg})`,
              }"
            >
              Aa
            </div>
            <div class="ds-pair-info">
              <span class="ds-pair-label">{{ pair.label }}</span>
              <div class="ds-pair-vars">
                <button class="ds-var-btn" @click.stop="copyVar(pair.bg)">
                  <code>{{ pair.bg }}</code>
                  <span v-if="copiedVar === pair.bg" class="ds-copied-inline"
                    >Copied!</span
                  >
                </button>
                <button class="ds-var-btn" @click.stop="copyVar(pair.fg)">
                  <code>{{ pair.fg }}</code>
                  <span v-if="copiedVar === pair.fg" class="ds-copied-inline"
                    >Copied!</span
                  >
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </Variant>

    <Variant title="Narrative Sections">
      <div class="ds-page">
        <h2 class="ds-title">Narrative Sections</h2>
        <p class="ds-desc">
          The rollercoaster.dev brand story unfolds in four sections, each with
          its own color palette.
        </p>
        <div class="ds-narrative-list">
          <div
            v-for="section in narrativeSections"
            :key="section.name"
            class="ds-section-block"
            :style="{
              backgroundColor: `var(${section.bg})`,
              color: `var(${section.text})`,
              borderColor: section.borderColor,
            }"
          >
            <h3 class="ds-section-name">{{ section.name }}</h3>
            <div class="ds-section-tokens">
              <button class="ds-narrative-token" @click="copyVar(section.bg)">
                <code>{{ section.bg }}</code>
                <span class="ds-narrative-hex">{{ section.bgHex }}</span>
                <span v-if="copiedVar === section.bg" class="ds-copied-inline"
                  >Copied!</span
                >
              </button>
              <button class="ds-narrative-token" @click="copyVar(section.text)">
                <code>{{ section.text }}</code>
                <span class="ds-narrative-hex">{{ section.textHex }}</span>
                <span v-if="copiedVar === section.text" class="ds-copied-inline"
                  >Copied!</span
                >
              </button>
            </div>
            <div v-if="section.accents.length" class="ds-section-accents">
              <button
                v-for="accent in section.accents"
                :key="accent.name"
                class="ds-badge-label"
                :style="{
                  backgroundColor: `var(${accent.name})`,
                  color: isLight(accent.hex) ? '#0a0a0a' : '#fafafa',
                  borderColor: 'currentColor',
                }"
                @click="copyVar(accent.name)"
              >
                <span>{{ accent.label }}</span>
                <code>{{ accent.name }}</code>
                <span v-if="copiedVar === accent.name" class="ds-copied-inline"
                  >Copied!</span
                >
              </button>
            </div>
          </div>
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

/* ── Swatch grid (accent colors) ── */
.ds-swatch-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(160px, 1fr));
  gap: var(--ob-space-3, 0.75rem);
}

.ds-swatch {
  all: unset;
  cursor: pointer;
  border: var(--ob-borderWidth-medium, 2px) solid var(--ob-border, #e5e5e5);
  border-radius: var(--ob-border-radius-sm, 0.125rem);
  overflow: hidden;
  background: var(--ob-card, #fff);
  box-shadow: var(--ob-shadow-hard-md, 3px 3px 0 rgba(0, 0, 0, 0.15));
  transition: transform var(--ob-transition-fast, 150ms);
}

.ds-swatch:hover {
  transform: translate(-1px, -1px);
  box-shadow: var(--ob-shadow-hard-lg, 4px 4px 0 rgba(0, 0, 0, 0.15));
}

.ds-swatch:focus-visible {
  box-shadow: var(--ob-shadow-focus, 0 0 0 3px rgba(10, 10, 10, 0.4));
}

.ds-swatch-color {
  height: 64px;
  position: relative;
  display: flex;
  align-items: center;
  justify-content: center;
  border-bottom: var(--ob-borderWidth-medium, 2px) solid
    var(--ob-border, #e5e5e5);
}

.ds-swatch-info {
  padding: var(--ob-space-2, 0.5rem) var(--ob-space-3, 0.75rem);
}

.ds-swatch-var {
  display: block;
  font-size: var(--ob-font-size-xs, 0.75rem);
  font-family: var(--ob-font-mono, monospace);
  color: var(--ob-foreground, #262626);
  word-break: break-all;
  line-height: var(--ob-font-lineHeight-compact, 1.3);
}

.ds-swatch-value {
  display: block;
  font-size: var(--ob-font-size-2xs, 0.625rem);
  color: var(--ob-muted-foreground, #737373);
  margin-top: var(--ob-space-1, 0.25rem);
  font-family: var(--ob-font-mono, monospace);
  text-transform: uppercase;
}

/* ── Copied indicator ── */
.ds-copied {
  font-size: var(--ob-font-size-xs, 0.75rem);
  font-weight: var(--ob-font-weight-bold, 700);
  color: #fff;
  background: rgba(0, 0, 0, 0.75);
  padding: var(--ob-space-1, 0.25rem) var(--ob-space-2, 0.5rem);
  border-radius: var(--ob-border-radius-sm, 0.125rem);
}

.ds-copied-inline {
  font-size: var(--ob-font-size-2xs, 0.625rem);
  font-weight: var(--ob-font-weight-bold, 700);
  color: var(--ob-color-success, #059669);
  margin-left: var(--ob-space-2, 0.5rem);
}

/* ── Gray scale strip ── */
.ds-gray-strip {
  display: flex;
  border: var(--ob-borderWidth-medium, 2px) solid var(--ob-border, #e5e5e5);
  border-radius: var(--ob-border-radius-sm, 0.125rem);
  overflow: hidden;
  box-shadow: var(--ob-shadow-hard-md, 3px 3px 0 rgba(0, 0, 0, 0.15));
}

.ds-gray-cell {
  all: unset;
  cursor: pointer;
  flex: 1;
  display: flex;
  flex-direction: column;
  transition: opacity var(--ob-transition-fast, 150ms);
}

.ds-gray-cell:hover {
  opacity: 0.85;
}

.ds-gray-cell:focus-visible .ds-gray-fill {
  box-shadow: inset var(--ob-shadow-focus, 0 0 0 3px rgba(10, 10, 10, 0.4));
}

.ds-gray-fill {
  width: 100%;
  height: 64px;
  position: relative;
  display: flex;
  align-items: center;
  justify-content: center;
  border-bottom: var(--ob-borderWidth-medium, 2px) solid
    var(--ob-border, #e5e5e5);
}

.ds-gray-meta {
  padding: var(--ob-space-2, 0.5rem) var(--ob-space-1, 0.25rem);
  text-align: center;
  background: var(--ob-card, #fff);
}

.ds-gray-label {
  display: block;
  font-size: var(--ob-font-size-xs, 0.75rem);
  font-weight: var(--ob-font-weight-semibold, 600);
  color: var(--ob-foreground, #262626);
}

.ds-gray-hex {
  display: block;
  font-size: var(--ob-font-size-2xs, 0.625rem);
  color: var(--ob-muted-foreground, #737373);
  font-family: var(--ob-font-mono, monospace);
  text-transform: uppercase;
}

/* ── Semantic pair swatches ── */
.ds-pair-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(200px, 1fr));
  gap: var(--ob-space-3, 0.75rem);
}

.ds-pair {
  border: var(--ob-borderWidth-medium, 2px) solid var(--ob-border, #e5e5e5);
  border-radius: var(--ob-border-radius-sm, 0.125rem);
  overflow: hidden;
  background: var(--ob-card, #fff);
  box-shadow: var(--ob-shadow-hard-md, 3px 3px 0 rgba(0, 0, 0, 0.15));
}

.ds-pair-preview {
  height: 56px;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: var(--ob-font-size-sm, 0.875rem);
  font-weight: var(--ob-font-weight-semibold, 600);
  border-bottom: var(--ob-borderWidth-medium, 2px) solid
    var(--ob-border, #e5e5e5);
}

.ds-pair-info {
  padding: var(--ob-space-2, 0.5rem) var(--ob-space-3, 0.75rem);
}

.ds-pair-label {
  display: block;
  font-size: var(--ob-font-size-xs, 0.75rem);
  font-weight: var(--ob-font-weight-semibold, 600);
  color: var(--ob-foreground, #262626);
  margin-bottom: var(--ob-space-1, 0.25rem);
}

.ds-pair-vars {
  display: flex;
  flex-direction: column;
  gap: 0.125rem;
}

.ds-var-btn {
  all: unset;
  cursor: pointer;
  display: inline-flex;
  align-items: center;
}

.ds-var-btn:focus-visible {
  box-shadow: var(--ob-shadow-focus, 0 0 0 3px rgba(10, 10, 10, 0.4));
  border-radius: var(--ob-border-radius-sm, 0.125rem);
}

.ds-var-btn code {
  font-size: var(--ob-font-size-2xs, 0.625rem);
  font-family: var(--ob-font-mono, monospace);
  color: var(--ob-muted-foreground, #737373);
  line-height: var(--ob-font-lineHeight-compact, 1.3);
}

.ds-var-btn:hover code {
  color: var(--ob-foreground, #262626);
}

/* ── Narrative sections ── */
.ds-narrative-list {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(220px, 1fr));
  gap: var(--ob-space-4, 1rem);
}

.ds-section-block {
  border: var(--ob-borderWidth-medium, 2px) solid;
  padding: var(--ob-space-6, 1.5rem);
  border-radius: var(--ob-border-radius-sm, 0.125rem);
  box-shadow: var(--ob-shadow-hard-lg, 4px 4px 0 rgba(0, 0, 0, 0.15));
}

.ds-section-name {
  font-family: var(--ob-font-headline, sans-serif);
  font-size: var(--ob-font-size-xl, 1.25rem);
  font-weight: var(--ob-font-weight-bold, 700);
  letter-spacing: var(--ob-font-letterSpacing-tight, -0.03em);
  margin: 0 0 var(--ob-space-3, 0.75rem);
}

.ds-section-tokens {
  display: flex;
  flex-direction: column;
  gap: var(--ob-space-1, 0.25rem);
  margin-bottom: var(--ob-space-4, 1rem);
}

.ds-narrative-token {
  all: unset;
  cursor: pointer;
  display: flex;
  align-items: center;
  gap: var(--ob-space-3, 0.75rem);
  opacity: 0.85;
}

.ds-narrative-token:focus-visible {
  box-shadow: var(--ob-shadow-focus, 0 0 0 3px rgba(10, 10, 10, 0.4));
  border-radius: var(--ob-border-radius-sm, 0.125rem);
}

.ds-narrative-token:hover {
  opacity: 1;
}

.ds-narrative-token code {
  font-size: var(--ob-font-size-xs, 0.75rem);
  font-family: var(--ob-font-mono, monospace);
}

.ds-narrative-hex {
  font-size: var(--ob-font-size-2xs, 0.625rem);
  opacity: 0.6;
  text-transform: uppercase;
}

.ds-section-accents {
  display: flex;
  flex-wrap: wrap;
  gap: var(--ob-space-2, 0.5rem);
}

/* Badge-label style accent chips (matches narrative.css .badge-label) */
.ds-badge-label {
  all: unset;
  cursor: pointer;
  display: inline-flex;
  align-items: center;
  gap: var(--ob-space-2, 0.5rem);
  padding: var(--ob-space-1, 0.25rem) var(--ob-space-3, 0.75rem);
  font-weight: var(--ob-font-weight-bold, 700);
  text-transform: uppercase;
  letter-spacing: var(--ob-font-letterSpacing-wide, 0.1em);
  font-size: var(--ob-font-size-xs, 0.75rem);
  border: var(--ob-borderWidth-medium, 2px) solid currentColor;
  border-radius: var(--ob-border-radius-sm, 0.125rem);
  box-shadow: var(--ob-shadow-hard-sm, 2px 2px 0 rgba(0, 0, 0, 0.15));
  transition: transform var(--ob-transition-fast, 150ms);
}

.ds-badge-label:hover {
  transform: translate(-1px, -1px);
  box-shadow: var(--ob-shadow-hard-md, 3px 3px 0 rgba(0, 0, 0, 0.15));
}

.ds-badge-label:focus-visible {
  outline: 2px solid var(--ob-primary, #0a0a0a);
  outline-offset: 2px;
}

.ds-badge-label code {
  font-size: var(--ob-font-size-2xs, 0.625rem);
  font-family: var(--ob-font-mono, monospace);
  text-transform: none;
  letter-spacing: normal;
  opacity: 0.8;
}
</style>
