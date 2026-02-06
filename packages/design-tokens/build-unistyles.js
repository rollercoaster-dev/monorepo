#!/usr/bin/env node
/**
 * Build Unistyles theme objects from design token JSON sources.
 *
 * Reads src/tokens/*.json and src/themes/*.json, generates TypeScript files
 * in build/unistyles/ that match the native-rd theme architecture:
 *   - palette.ts    — foundational color constants
 *   - tokens.ts     — spacing, sizing, radius, z-index, font weights, line heights
 *   - colorModes.ts — light/dark semantic color mappings
 *   - variants.ts   — accessibility variant partial overrides
 *   - index.ts      — barrel re-export
 */
import { readFile, writeFile, mkdir } from "node:fs/promises";
import { join } from "node:path";

const ROOT = import.meta.dirname;
const SRC = join(ROOT, "src");
const OUT = join(ROOT, "build/unistyles");

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/** Convert rem string to px number (1rem = 16px) */
function remToPx(val) {
  if (typeof val === "number") return val;
  const s = String(val);
  const m = s.match(/^([\d.]+)rem$/);
  if (m) return Math.round(parseFloat(m[1]) * 16 * 100) / 100;
  // px values — strip unit
  const px = s.match(/^([\d.]+)px$/);
  if (px) return parseFloat(px[1]);
  // unitless numbers
  const n = parseFloat(s);
  return isNaN(n) ? s : n;
}

/** kebab-case → camelCase, with number-leading keys left as-is */
function camel(s) {
  return s.replace(/-([a-z0-9])/g, (_, c) => c.toUpperCase());
}

/** Read a JSON file relative to src/ */
async function readJSON(relPath) {
  return JSON.parse(await readFile(join(SRC, relPath), "utf-8"));
}

/** Extract $value from token, handling nested objects */
function val(token) {
  if (!token) return undefined;
  return token.$value ?? token;
}

// ---------------------------------------------------------------------------
// palette.ts — foundational colors from src/tokens/colors.json
// ---------------------------------------------------------------------------

async function buildPalette() {
  const data = await readJSON("tokens/colors.json");
  const color = data.color;
  const entries = [];

  for (const [key, token] of Object.entries(color)) {
    if (key.startsWith("$")) continue;

    if (key === "gray") {
      for (const [shade, t] of Object.entries(token)) {
        if (shade.startsWith("$")) continue;
        entries.push([`gray${shade}`, val(t)]);
      }
    } else if (key === "highlight" || key === "ink" || key === "paper") {
      // Skip reference aliases — they duplicate other palette entries
      continue;
    } else if (typeof token === "object" && token !== null && !token.$value) {
      // Nested group (shouldn't happen besides gray, but be safe)
      continue;
    } else {
      entries.push([camel(key), val(token)]);
    }
  }

  const lines = entries.map(([k, v]) => `  ${k}: '${v}',`).join("\n");

  return `// Auto-generated from design-tokens. DO NOT EDIT.
export const palette = {
${lines}
} as const;

export type Palette = typeof palette;
`;
}

// ---------------------------------------------------------------------------
// tokens.ts — non-color primitives (spacing, typography, radius, zIndex)
// ---------------------------------------------------------------------------

async function buildTokens() {
  const spacing = await readJSON("tokens/spacing.json");
  const typo = await readJSON("tokens/typography.json");

  // space: rem → px
  const spaceEntries = Object.entries(spacing.space)
    .filter(([k]) => !k.startsWith("$"))
    .map(([k, t]) => [k, remToPx(val(t))]);

  // radius: rem → px
  const radiusEntries = Object.entries(spacing.radius)
    .filter(([k]) => !k.startsWith("$"))
    .map(([k, t]) => [camel(k), remToPx(val(t))]);

  // zIndex
  const zIndexEntries = Object.entries(spacing.zIndex)
    .filter(([k]) => !k.startsWith("$"))
    .map(([k, t]) => [camel(k), parseInt(val(t), 10)]);

  // font sizes → two scales: size (base) and sizeL (large-text theme)
  const fontSizes = typo.font.size;
  const sizeEntries = Object.entries(fontSizes)
    .filter(([k]) => !k.startsWith("$"))
    .map(([k, t]) => [camel(k), remToPx(val(t))]);

  // font weights
  const weightEntries = Object.entries(typo.font.weight)
    .filter(([k]) => !k.startsWith("$"))
    .map(([k, t]) => [camel(k), parseInt(val(t), 10)]);

  // line heights (unitless)
  const lineHeightEntries = Object.entries(typo.font.lineHeight)
    .filter(([k]) => !k.startsWith("$"))
    .map(([k, t]) => [camel(k), parseFloat(val(t))]);

  // large-text sizes from theme
  let sizeLEntries;
  try {
    const lt = await readJSON("themes/large-text.json");
    const ltSizes = lt.theme.font.size;
    sizeLEntries = Object.entries(ltSizes)
      .filter(([k]) => !k.startsWith("$"))
      .map(([k, t]) => [camel(k), remToPx(val(t))]);
  } catch {
    sizeLEntries = null;
  }

  function obj(entries) {
    return entries
      .map(([k, v]) => `  ${k}: ${typeof v === "string" ? `'${v}'` : v},`)
      .join("\n");
  }

  let out = `// Auto-generated from design-tokens. DO NOT EDIT.
export const space = {
${obj(spaceEntries)}
} as const;

export const size = {
${obj(sizeEntries)}
} as const;
`;

  if (sizeLEntries) {
    out += `
export const sizeL = {
${obj(sizeLEntries)}
} as const;
`;
  }

  out += `
export const radius = {
${obj(radiusEntries)}
} as const;

export const zIndex = {
${obj(zIndexEntries)}
} as const;

export const fontWeight = {
${obj(weightEntries)}
} as const;

export const lineHeight = {
${obj(lineHeightEntries)}
} as const;

export type Space = typeof space;
export type Size = typeof size;
export type Radius = typeof radius;
export type ZIndex = typeof zIndex;
export type FontWeight = typeof fontWeight;
export type LineHeight = typeof lineHeight;
`;

  return out;
}

// ---------------------------------------------------------------------------
// colorModes.ts — light/dark semantic color mappings
// ---------------------------------------------------------------------------

/**
 * Resolve a token value from the flat light-mode sources.
 * Handles {reference} syntax by looking up in the token maps.
 */
function resolveRef(ref, colorMap, semanticMap) {
  if (!ref || !ref.startsWith("{")) return ref;

  const path = ref.slice(1, -1); // strip { }

  // Direct color.* references
  if (path.startsWith("color.")) {
    const rest = path.slice(6);
    // Handle nested gray references like color.gray.200
    const parts = rest.split(".");
    let cursor = colorMap.color;
    for (const p of parts) {
      if (!cursor) return ref;
      cursor = cursor[p];
    }
    return val(cursor);
  }

  // Semantic self-references like {foreground} → look in semantic map
  if (semanticMap[path]) {
    const resolved = val(semanticMap[path]);
    if (resolved && resolved.startsWith("{")) {
      return resolveRef(resolved, colorMap, semanticMap);
    }
    return resolved;
  }

  // Primitive token references like {borderWidth.default}
  return ref;
}

async function buildColorModes() {
  const colorData = await readJSON("tokens/colors.json");
  const semantic = await readJSON("tokens/semantic.json");
  const dark = await readJSON("themes/dark.json");
  const darkTheme = dark.theme;

  // Build light mode Colors from semantic.json + colors.json
  const lightMap = {
    background: resolveRef(val(semantic.background), colorData, semantic),
    backgroundSecondary: resolveRef(val(semantic.muted), colorData, semantic),
    backgroundTertiary: resolveRef(val(semantic.border), colorData, semantic),
    text: resolveRef(val(semantic.foreground), colorData, semantic),
    textSecondary: resolveRef(
      val(semantic["text-secondary"]),
      colorData,
      semantic,
    ),
    textMuted: resolveRef(
      val(semantic["muted-foreground"]),
      colorData,
      semantic,
    ),
    accentPrimary: resolveRef(val(semantic.primary), colorData, semantic),
    accentPurple: resolveRef(val(semantic.secondary), colorData, semantic),
    accentMint: val(colorData.color["accent-mint"]),
    accentYellow: val(colorData.color["accent-yellow"]),
    border: resolveRef(val(semantic.border), colorData, semantic),
    shadow: val(colorData.color.black),
    focusRing: resolveRef(val(semantic.ring), colorData, semantic),
  };

  // Build dark mode Colors from dark.json theme
  const darkMap = {
    background: val(darkTheme.surface.background),
    backgroundSecondary: val(darkTheme.surface.muted),
    backgroundTertiary: val(darkTheme.color.gray["200"]),
    text: val(darkTheme.surface.foreground),
    textSecondary: val(darkTheme.typography["text-secondary"]),
    textMuted: val(darkTheme.surface["muted-foreground"]),
    accentPrimary: val(darkTheme.interactive.primary),
    accentPurple: val(darkTheme.color.secondary),
    accentMint: val(darkTheme.color["accent-mint"]),
    accentYellow: val(darkTheme.color["accent-yellow"]),
    border: val(darkTheme.form.border),
    shadow: val(darkTheme.color.black),
    focusRing: val(darkTheme.form.ring),
  };

  function colorObj(map, indent = "  ") {
    return Object.entries(map)
      .map(([k, v]) => `${indent}${k}: '${v}',`)
      .join("\n");
  }

  return `// Auto-generated from design-tokens. DO NOT EDIT.
export interface Colors {
  background: string;
  backgroundSecondary: string;
  backgroundTertiary: string;
  text: string;
  textSecondary: string;
  textMuted: string;
  accentPrimary: string;
  accentPurple: string;
  accentMint: string;
  accentYellow: string;
  border: string;
  shadow: string;
  focusRing: string;
}

export const lightColors: Colors = {
${colorObj(lightMap)}
};

export const darkColors: Colors = {
${colorObj(darkMap)}
};

export const colorModes = {
  light: lightColors,
  dark: darkColors,
} as const;
`;
}

// ---------------------------------------------------------------------------
// variants.ts — accessibility variant overrides (partial Colors)
// ---------------------------------------------------------------------------

async function buildVariants() {
  const colorData = await readJSON("tokens/colors.json");
  const semantic = await readJSON("tokens/semantic.json");

  // Resolve the base light values for comparison
  const baseLightColors = {
    background: resolveRef(val(semantic.background), colorData, semantic),
    backgroundSecondary: resolveRef(val(semantic.muted), colorData, semantic),
    backgroundTertiary: resolveRef(val(semantic.border), colorData, semantic),
    text: resolveRef(val(semantic.foreground), colorData, semantic),
    textSecondary: resolveRef(
      val(semantic["text-secondary"]),
      colorData,
      semantic,
    ),
    textMuted: resolveRef(
      val(semantic["muted-foreground"]),
      colorData,
      semantic,
    ),
    accentPrimary: resolveRef(val(semantic.primary), colorData, semantic),
    accentPurple: resolveRef(val(semantic.secondary), colorData, semantic),
    accentMint: val(colorData.color["accent-mint"]),
    accentYellow: val(colorData.color["accent-yellow"]),
    border: resolveRef(val(semantic.border), colorData, semantic),
    shadow: val(colorData.color.black),
    focusRing: resolveRef(val(semantic.ring), colorData, semantic),
  };

  const variantFiles = [
    { file: "high-contrast", name: "highContrast" },
    { file: "dyslexia-friendly", name: "dyslexiaFriendly" },
    { file: "autism-friendly", name: "autismFriendly" },
    { file: "low-vision", name: "lowVision" },
    { file: "low-info", name: "lowInfo" },
  ];

  const variants = [];

  for (const { file, name } of variantFiles) {
    const data = await readJSON(`themes/${file}.json`);
    const t = data.theme;

    // Map this theme's values to the Colors interface
    const themeColors = {
      background: t.surface?.background?.$value,
      backgroundSecondary: t.surface?.muted?.$value,
      backgroundTertiary:
        t.color?.gray?.["200"]?.$value ?? t.form?.border?.$value,
      text: t.surface?.foreground?.$value,
      textSecondary: t.typography?.["text-secondary"]?.$value,
      textMuted: t.surface?.["muted-foreground"]?.$value,
      accentPrimary: t.interactive?.primary?.$value,
      accentPurple:
        t.color?.secondary?.$value ?? t.interactive?.secondary?.$value,
      accentMint: t.color?.["accent-mint"]?.$value,
      accentYellow: t.color?.["accent-yellow"]?.$value,
      border: t.form?.border?.$value,
      shadow: t.color?.black?.$value,
      focusRing: t.form?.ring?.$value,
    };

    // Only emit properties that differ from base light
    const overrides = {};
    for (const [key, value] of Object.entries(themeColors)) {
      if (value && value !== baseLightColors[key]) {
        overrides[key] = value;
      }
    }

    if (Object.keys(overrides).length > 0) {
      variants.push({ name, overrides });
    }
  }

  function overrideObj(map, indent = "  ") {
    return Object.entries(map)
      .map(([k, v]) => `${indent}${k}: '${v}',`)
      .join("\n");
  }

  let out = `// Auto-generated from design-tokens. DO NOT EDIT.
import type { Colors } from './colorModes';

export type VariantOverride = Partial<Colors>;

`;

  for (const { name, overrides } of variants) {
    out += `export const ${name}: VariantOverride = {
${overrideObj(overrides)}
};

`;
  }

  out += `export const variants = {
${variants.map(({ name }) => `  ${name},`).join("\n")}
} as const;
`;

  return out;
}

// ---------------------------------------------------------------------------
// index.ts — barrel export
// ---------------------------------------------------------------------------

function buildIndex() {
  return `// Auto-generated from design-tokens. DO NOT EDIT.
export { palette } from './palette';
export type { Palette } from './palette';

export { space, size, sizeL, radius, zIndex, fontWeight, lineHeight } from './tokens';
export type { Space, Size, Radius, ZIndex, FontWeight, LineHeight } from './tokens';

export { lightColors, darkColors, colorModes } from './colorModes';
export type { Colors } from './colorModes';

export { variants } from './variants';
export type { VariantOverride } from './variants';
`;
}

// ---------------------------------------------------------------------------
// Main
// ---------------------------------------------------------------------------

async function main() {
  await mkdir(OUT, { recursive: true });

  const [palette, tokens, colorModes, variantsContent] = await Promise.all([
    buildPalette(),
    buildTokens(),
    buildColorModes(),
    buildVariants(),
  ]);

  await Promise.all([
    writeFile(join(OUT, "palette.ts"), palette),
    writeFile(join(OUT, "tokens.ts"), tokens),
    writeFile(join(OUT, "colorModes.ts"), colorModes),
    writeFile(join(OUT, "variants.ts"), variantsContent),
    writeFile(join(OUT, "index.ts"), buildIndex()),
  ]);

  console.log(
    "Built build/unistyles/ with palette, tokens, colorModes, variants, index",
  );
}

main().catch(console.error);
