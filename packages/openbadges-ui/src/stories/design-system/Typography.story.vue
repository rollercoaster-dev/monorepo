<script setup lang="ts">
import { ref } from "vue";

// Import fonts CSS directly so @font-face rules are injected into the iframe
import "../../styles/fonts.css";

const copiedVar = ref("");

function copyVar(varName: string) {
  navigator.clipboard.writeText(`var(${varName})`);
  copiedVar.value = varName;
  setTimeout(() => {
    copiedVar.value = "";
  }, 1500);
}

const fontFamilies = [
  {
    name: "Instrument Sans",
    varName: "--ob-font-family-instrument-sans",
    role: "Primary body font",
    weight: "400",
    size: "var(--ob-font-size-lg, 1.125rem)",
  },
  {
    name: "Anybody",
    varName: "--ob-font-family-headline",
    role: "Display / headline font — shown at weight 900",
    weight: "900",
    size: "var(--ob-font-size-2xl, 1.5rem)",
  },
  {
    name: "DM Mono",
    varName: "--ob-font-family-mono",
    role: "Monospace / code font",
    weight: "400",
    size: "var(--ob-font-size-md, 1rem)",
  },
  {
    name: "Atkinson Hyperlegible",
    varName: "--ob-font-atkinson",
    role: "High-legibility accessibility font",
    weight: "400",
    size: "var(--ob-font-size-lg, 1.125rem)",
  },
  {
    name: "Lexend",
    varName: "--ob-font-lexend",
    role: "Reading-optimized accessibility font",
    weight: "400",
    size: "var(--ob-font-size-lg, 1.125rem)",
  },
  {
    name: "OpenDyslexic",
    varName: "--ob-font-opendyslexic",
    role: "Dyslexia-friendly accessibility font",
    weight: "400",
    size: "var(--ob-font-size-lg, 1.125rem)",
  },
];

const typeScale = [
  { label: "2xs", varName: "--ob-font-size-2xs", size: "0.625rem", px: "10px" },
  { label: "xs", varName: "--ob-font-size-xs", size: "0.75rem", px: "12px" },
  { label: "sm", varName: "--ob-font-size-sm", size: "0.875rem", px: "14px" },
  { label: "md", varName: "--ob-font-size-md", size: "1rem", px: "16px" },
  { label: "lg", varName: "--ob-font-size-lg", size: "1.125rem", px: "18px" },
  { label: "xl", varName: "--ob-font-size-xl", size: "1.25rem", px: "20px" },
  { label: "2xl", varName: "--ob-font-size-2xl", size: "1.5rem", px: "24px" },
  { label: "3xl", varName: "--ob-font-size-3xl", size: "2rem", px: "32px" },
  { label: "4xl", varName: "--ob-font-size-4xl", size: "2.5rem", px: "40px" },
  { label: "5xl", varName: "--ob-font-size-5xl", size: "3rem", px: "48px" },
  { label: "6xl", varName: "--ob-font-size-6xl", size: "3.75rem", px: "60px" },
  { label: "7xl", varName: "--ob-font-size-7xl", size: "4.5rem", px: "72px" },
  {
    label: "display",
    varName: "--ob-font-size-display",
    size: "6rem",
    px: "96px",
  },
];

const fontWeights = [
  { label: "Normal", varName: "--ob-font-weight-normal", value: "400" },
  { label: "Medium", varName: "--ob-font-weight-medium", value: "500" },
  { label: "Semibold", varName: "--ob-font-weight-semibold", value: "600" },
  { label: "Bold", varName: "--ob-font-weight-bold", value: "700" },
  { label: "Black", varName: "--ob-font-weight-black", value: "900" },
];

const lineHeights = [
  {
    label: "Tight",
    varName: "--ob-font-lineHeight-tight",
    value: "1.05",
    desc: "Single-line display headlines",
  },
  {
    label: "Compact",
    varName: "--ob-font-lineHeight-compact",
    value: "1.3",
    desc: "Compact metadata",
  },
  {
    label: "Normal",
    varName: "--ob-font-lineHeight-normal",
    value: "1.6",
    desc: "Body text default",
  },
  {
    label: "Relaxed",
    varName: "--ob-font-lineHeight-relaxed",
    value: "1.8",
    desc: "Spacious reading",
  },
];

const letterSpacings = [
  {
    label: "Tight",
    varName: "--ob-font-letterSpacing-tight",
    value: "-0.03em",
    desc: "Headlines",
  },
  {
    label: "Normal",
    varName: "--ob-font-letterSpacing-normal",
    value: "0",
    desc: "Body text",
  },
  {
    label: "Label",
    varName: "--ob-font-letterSpacing-label",
    value: "0.05em",
    desc: "Uppercase labels",
  },
  {
    label: "Wide",
    varName: "--ob-font-letterSpacing-wide",
    value: "0.1em",
    desc: "Wide tracking",
  },
  {
    label: "Caps",
    varName: "--ob-font-letterSpacing-caps",
    value: "0.15em",
    desc: "All-caps text",
  },
];

const sampleText = "The quick brown fox jumps over the lazy dog";

const usageExamples = [
  {
    context: "Hero / Display",
    font: "Anybody",
    text: "Own Your Story",
    style: {
      fontFamily: "var(--ob-font-family-headline, 'Anybody', sans-serif)",
      fontSize: "var(--ob-font-size-4xl, 2.5rem)",
      fontWeight: "var(--ob-font-weight-black, 900)",
      lineHeight: "var(--ob-font-lineHeight-tight, 1.05)",
      letterSpacing: "var(--ob-font-letterSpacing-tight, -0.03em)",
    },
    tokens:
      "--ob-font-family-headline + font-size-4xl..display + weight-black + lineHeight-tight + letterSpacing-tight",
    note: "Only for large splash/display text. Not for regular headings.",
  },
  {
    context: "Page Heading (h1)",
    font: "Instrument Sans",
    text: "Badge Collection",
    style: {
      fontFamily:
        "var(--ob-font-family-instrument-sans, system-ui, sans-serif)",
      fontSize: "var(--ob-font-size-2xl, 1.5rem)",
      fontWeight: "var(--ob-font-weight-bold, 700)",
    },
    tokens: "--ob-font-family-instrument-sans + font-size-2xl + weight-bold",
    note: "Uses body font at larger size, not the headline font.",
  },
  {
    context: "Section Heading (h2)",
    font: "Instrument Sans",
    text: "Verification Status",
    style: {
      fontFamily:
        "var(--ob-font-family-instrument-sans, system-ui, sans-serif)",
      fontSize: "var(--ob-font-size-xl, 1.25rem)",
      fontWeight: "var(--ob-font-weight-bold, 700)",
    },
    tokens: "--ob-font-family-instrument-sans + font-size-xl + weight-bold",
    note: "",
  },
  {
    context: "Subsection (h3)",
    font: "Instrument Sans",
    text: "Issuer Details",
    style: {
      fontFamily:
        "var(--ob-font-family-instrument-sans, system-ui, sans-serif)",
      fontSize: "var(--ob-font-size-md, 1rem)",
      fontWeight: "var(--ob-font-weight-semibold, 600)",
    },
    tokens: "--ob-font-family-instrument-sans + font-size-md + weight-semibold",
    note: "",
  },
  {
    context: "Body Text",
    font: "Instrument Sans",
    text: "Open Badges empower learners to own and share their achievements in a portable, verifiable format.",
    style: {
      fontFamily:
        "var(--ob-font-family-instrument-sans, system-ui, sans-serif)",
      fontSize: "var(--ob-font-size-md, 1rem)",
      fontWeight: "var(--ob-font-weight-normal, 400)",
      lineHeight: "var(--ob-font-lineHeight-normal, 1.6)",
    },
    tokens:
      "--ob-font-family-instrument-sans + font-size-md + weight-normal + lineHeight-normal",
    note: "",
  },
  {
    context: "Description / Caption",
    font: "Instrument Sans",
    text: "Issued on 2024-01-15 by rollercoaster.dev",
    style: {
      fontFamily:
        "var(--ob-font-family-instrument-sans, system-ui, sans-serif)",
      fontSize: "var(--ob-font-size-sm, 0.875rem)",
      color: "var(--ob-muted-foreground, #737373)",
    },
    tokens:
      "--ob-font-family-instrument-sans + font-size-sm + muted-foreground",
    note: "",
  },
  {
    context: "Badge Label / Tag",
    font: "Instrument Sans",
    text: "VERIFIED",
    style: {
      fontFamily:
        "var(--ob-font-family-instrument-sans, system-ui, sans-serif)",
      fontSize: "var(--ob-font-size-xs, 0.75rem)",
      fontWeight: "var(--ob-font-weight-bold, 700)",
      textTransform: "uppercase" as const,
      letterSpacing: "var(--ob-font-letterSpacing-wide, 0.1em)",
    },
    tokens: "--ob-font-size-xs + weight-bold + uppercase + letterSpacing-wide",
    note: "Uppercase with wide tracking. See badge-label class in narrative.css.",
  },
  {
    context: "Code / Token Names",
    font: "DM Mono",
    text: "--ob-color-primary: #0a0a0a;",
    style: {
      fontFamily: "var(--ob-font-family-mono, monospace)",
      fontSize: "var(--ob-font-size-sm, 0.875rem)",
    },
    tokens: "--ob-font-family-mono + font-size-sm",
    note: "Also used for all metadata values and technical labels.",
  },
  {
    context: "Accessibility Override",
    font: "Atkinson / Lexend / OpenDyslexic",
    text: "These fonts replace the body font when a user selects an accessibility theme.",
    style: {
      fontFamily: "var(--ob-font-atkinson, system-ui, sans-serif)",
      fontSize: "var(--ob-font-size-md, 1rem)",
      lineHeight: "var(--ob-font-lineHeight-normal, 1.6)",
    },
    tokens: "--ob-font-atkinson / --ob-font-lexend / --ob-font-opendyslexic",
    note: "Applied via theme class. Never hard-code body font — always use --ob-font-family.",
  },
];
</script>

<template>
  <Story
    title="Design System/Typography"
    :layout="{ type: 'single', iframe: true }"
  >
    <template #docs>
      <div class="histoire-docs">
        <h1>Typography Tokens</h1>
        <p>
          Seven font families (including three accessibility-optimized options),
          a 13-step type scale from 2xs to display, five font weights, and
          line-height/letter-spacing presets.
        </p>
        <p>Click any token name to copy its CSS variable reference.</p>
      </div>
    </template>

    <Variant title="Font Usage Guide">
      <div class="ds-page">
        <h2 class="ds-title">When to Use What</h2>
        <p class="ds-desc">
          Anybody is reserved for display/hero text only. All UI headings
          (h1-h3) use Instrument Sans. DM Mono handles code and metadata.
          Accessibility fonts replace the body font via theme.
        </p>
        <div class="ds-usage-list">
          <div
            v-for="ex in usageExamples"
            :key="ex.context"
            class="ds-usage-card"
          >
            <div class="ds-usage-preview">
              <p :style="ex.style">{{ ex.text }}</p>
            </div>
            <div class="ds-usage-info">
              <div class="ds-usage-header">
                <strong>{{ ex.context }}</strong>
                <span class="ds-usage-font">{{ ex.font }}</span>
              </div>
              <code class="ds-usage-tokens">{{ ex.tokens }}</code>
              <span v-if="ex.note" class="ds-usage-note">{{ ex.note }}</span>
            </div>
          </div>
        </div>
      </div>
    </Variant>

    <Variant title="Font Families">
      <div class="ds-page">
        <h2 class="ds-title">Font Families</h2>
        <p class="ds-desc">
          Three design fonts and three accessibility-optimized alternatives.
        </p>
        <div class="ds-type-samples">
          <div
            v-for="font in fontFamilies"
            :key="font.varName"
            class="ds-type-sample"
          >
            <p
              class="ds-type-sample-text"
              :style="{
                fontFamily: `var(${font.varName}), '${font.name}', sans-serif`,
                fontWeight: font.weight,
                fontSize: font.size,
              }"
            >
              {{ sampleText }}
            </p>
            <div class="ds-type-sample-meta">
              <strong>{{ font.name }}</strong>
              <span>{{ font.role }}</span>
              <button class="ds-var-btn" @click="copyVar(font.varName)">
                <code>{{ font.varName }}</code>
                <span v-if="copiedVar === font.varName" class="ds-copied-inline"
                  >Copied!</span
                >
              </button>
            </div>
          </div>
        </div>
      </div>
    </Variant>

    <Variant title="Type Scale">
      <div class="ds-page">
        <h2 class="ds-title">Type Scale</h2>
        <p class="ds-desc">13-step scale from 2xs (10px) to display (96px).</p>
        <div class="ds-type-samples">
          <div
            v-for="step in typeScale"
            :key="step.varName"
            class="ds-type-sample"
          >
            <p
              class="ds-type-sample-text"
              :style="{ fontSize: `var(${step.varName})` }"
            >
              {{ sampleText }}
            </p>
            <div class="ds-type-sample-meta">
              <strong>{{ step.label }}</strong>
              <span>{{ step.size }} / {{ step.px }}</span>
              <button class="ds-var-btn" @click="copyVar(step.varName)">
                <code>{{ step.varName }}</code>
                <span v-if="copiedVar === step.varName" class="ds-copied-inline"
                  >Copied!</span
                >
              </button>
            </div>
          </div>
        </div>
      </div>
    </Variant>

    <Variant title="Font Weights">
      <div class="ds-page">
        <h2 class="ds-title">Font Weights</h2>
        <p class="ds-desc">
          Five weight steps from normal (400) to black (900).
        </p>
        <div class="ds-type-samples">
          <div
            v-for="weight in fontWeights"
            :key="weight.varName"
            class="ds-type-sample"
          >
            <p
              class="ds-type-sample-text"
              :style="{
                fontWeight: `var(${weight.varName})`,
                fontSize: 'var(--ob-font-size-xl, 1.25rem)',
              }"
            >
              {{ sampleText }}
            </p>
            <div class="ds-type-sample-meta">
              <strong>{{ weight.label }}</strong>
              <span>{{ weight.value }}</span>
              <button class="ds-var-btn" @click="copyVar(weight.varName)">
                <code>{{ weight.varName }}</code>
                <span
                  v-if="copiedVar === weight.varName"
                  class="ds-copied-inline"
                  >Copied!</span
                >
              </button>
            </div>
          </div>
        </div>
      </div>
    </Variant>

    <Variant title="Line Heights & Letter Spacing">
      <div class="ds-page">
        <h2 class="ds-title">Line Heights</h2>
        <p class="ds-desc">
          Four line-height presets for different content density levels.
        </p>
        <div class="ds-lh-grid">
          <div v-for="lh in lineHeights" :key="lh.varName" class="ds-lh-card">
            <div class="ds-lh-header">
              <strong>{{ lh.label }}</strong>
              <code>{{ lh.value }}</code>
            </div>
            <p
              class="ds-lh-sample"
              :style="{ lineHeight: `var(${lh.varName})` }"
            >
              Open Badges empower learners to own and share their achievements
              in a portable, verifiable format that works across platforms.
            </p>
            <span class="ds-lh-desc">{{ lh.desc }}</span>
            <button class="ds-var-btn" @click="copyVar(lh.varName)">
              <code>{{ lh.varName }}</code>
              <span v-if="copiedVar === lh.varName" class="ds-copied-inline"
                >Copied!</span
              >
            </button>
          </div>
        </div>

        <h2 class="ds-title ds-title--mt">Letter Spacing</h2>
        <p class="ds-desc">Five tracking presets for different text roles.</p>
        <div class="ds-type-samples">
          <div
            v-for="ls in letterSpacings"
            :key="ls.varName"
            class="ds-type-sample"
          >
            <p
              class="ds-type-sample-text ds-ls-text"
              :style="{ letterSpacing: `var(${ls.varName})` }"
            >
              OPEN BADGES CREDENTIAL
            </p>
            <div class="ds-type-sample-meta">
              <strong>{{ ls.label }}</strong>
              <span>{{ ls.value }} &mdash; {{ ls.desc }}</span>
              <button class="ds-var-btn" @click="copyVar(ls.varName)">
                <code>{{ ls.varName }}</code>
                <span v-if="copiedVar === ls.varName" class="ds-copied-inline"
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

.ds-title--mt {
  margin-top: var(--ob-space-12, 3rem);
}

.ds-desc {
  font-size: var(--ob-font-size-sm, 0.875rem);
  color: var(--ob-muted-foreground, #737373);
  margin: 0 0 var(--ob-space-5, 1.25rem);
}

/* ── Shared var button ── */
.ds-var-btn {
  all: unset;
  cursor: pointer;
  display: inline-flex;
  align-items: center;
}

.ds-var-btn code {
  font-size: var(--ob-font-size-xs, 0.75rem);
  font-family: var(--ob-font-mono, monospace);
  color: var(--ob-foreground, #262626);
}

.ds-var-btn:hover code {
  color: var(--ob-primary, #0a0a0a);
}

.ds-copied-inline {
  font-size: var(--ob-font-size-2xs, 0.625rem);
  font-weight: var(--ob-font-weight-bold, 700);
  color: var(--ob-color-success, #059669);
  margin-left: var(--ob-space-2, 0.5rem);
}

/* ── Type samples (matches shared.css .type-sample) ── */
.ds-type-samples {
  display: flex;
  flex-direction: column;
  gap: var(--ob-space-3, 0.75rem);
}

.ds-type-sample {
  display: flex;
  align-items: baseline;
  gap: var(--ob-space-4, 1rem);
  padding: var(--ob-space-3, 0.75rem) var(--ob-space-4, 1rem);
  background: var(--ob-card, #fff);
  border: var(--ob-borderWidth-medium, 2px) solid var(--ob-border, #e5e5e5);
  border-radius: var(--ob-border-radius-sm, 0.125rem);
}

.ds-type-sample-text {
  flex: 1;
  color: var(--ob-foreground, #262626);
  margin: 0;
  line-height: 1.3;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.ds-ls-text {
  font-weight: var(--ob-font-weight-bold, 700);
  font-size: var(--ob-font-size-sm, 0.875rem);
}

.ds-type-sample-meta {
  display: flex;
  flex-direction: column;
  gap: 0.125rem;
  font-size: var(--ob-font-size-xs, 0.75rem);
  font-family: var(--ob-font-mono, monospace);
  color: var(--ob-muted-foreground, #737373);
  white-space: nowrap;
  text-align: right;
  min-width: 180px;
}

.ds-type-sample-meta strong {
  color: var(--ob-foreground, #262626);
  font-weight: var(--ob-font-weight-semibold, 600);
}

/* ── Line heights ── */
.ds-lh-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(220px, 1fr));
  gap: var(--ob-space-3, 0.75rem);
}

.ds-lh-card {
  border: var(--ob-borderWidth-medium, 2px) solid var(--ob-border, #e5e5e5);
  border-radius: var(--ob-border-radius-sm, 0.125rem);
  padding: var(--ob-space-4, 1rem);
  display: flex;
  flex-direction: column;
  gap: var(--ob-space-2, 0.5rem);
  background: var(--ob-card, #fff);
  box-shadow: var(--ob-shadow-hard-md, 3px 3px 0 rgba(0, 0, 0, 0.15));
}

.ds-lh-header {
  display: flex;
  justify-content: space-between;
  align-items: baseline;
  font-size: var(--ob-font-size-sm, 0.875rem);
  color: var(--ob-foreground, #262626);
}

.ds-lh-header code {
  font-size: var(--ob-font-size-xs, 0.75rem);
  font-family: var(--ob-font-mono, monospace);
  color: var(--ob-muted-foreground, #737373);
}

.ds-lh-sample {
  margin: 0;
  font-size: var(--ob-font-size-sm, 0.875rem);
  color: var(--ob-foreground, #262626);
  background: var(--ob-bg-secondary, #fafafa);
  padding: var(--ob-space-3, 0.75rem);
  border: var(--ob-borderWidth-medium, 2px) solid
    var(--ob-stroke-muted, #d4d4d4);
  border-radius: var(--ob-border-radius-sm, 0.125rem);
}

.ds-lh-desc {
  font-size: var(--ob-font-size-xs, 0.75rem);
  color: var(--ob-muted-foreground, #737373);
}

/* ── Font Usage Guide ── */
.ds-usage-list {
  display: flex;
  flex-direction: column;
  gap: var(--ob-space-3, 0.75rem);
}

.ds-usage-card {
  background: var(--ob-card, #fff);
  border: var(--ob-borderWidth-medium, 2px) solid var(--ob-border, #e5e5e5);
  border-radius: var(--ob-border-radius-sm, 0.125rem);
  overflow: hidden;
}

.ds-usage-preview {
  padding: var(--ob-space-4, 1rem) var(--ob-space-5, 1.25rem);
  border-bottom: var(--ob-borderWidth-medium, 2px) solid
    var(--ob-border, #e5e5e5);
  background: var(--ob-background, #fafafa);
  overflow: hidden;
}

.ds-usage-preview p {
  margin: 0;
  color: var(--ob-foreground, #262626);
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.ds-usage-info {
  padding: var(--ob-space-3, 0.75rem) var(--ob-space-5, 1.25rem);
  display: flex;
  flex-direction: column;
  gap: 0.25rem;
}

.ds-usage-header {
  display: flex;
  justify-content: space-between;
  align-items: baseline;
}

.ds-usage-header strong {
  font-size: var(--ob-font-size-sm, 0.875rem);
  color: var(--ob-foreground, #262626);
}

.ds-usage-font {
  font-size: var(--ob-font-size-xs, 0.75rem);
  font-weight: var(--ob-font-weight-bold, 700);
  text-transform: uppercase;
  letter-spacing: var(--ob-font-letterSpacing-label, 0.05em);
  color: var(--ob-muted-foreground, #737373);
}

.ds-usage-tokens {
  font-size: var(--ob-font-size-2xs, 0.625rem);
  font-family: var(--ob-font-mono, monospace);
  color: var(--ob-muted-foreground, #737373);
  word-break: break-all;
}

.ds-usage-note {
  font-size: var(--ob-font-size-xs, 0.75rem);
  font-style: italic;
  color: var(--ob-muted-foreground, #737373);
  margin-top: var(--ob-space-1, 0.25rem);
}
</style>
