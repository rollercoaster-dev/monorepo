# Design Token Simplification and Chrome Plan

**Status:** Proposed
**Date:** 2026-04-28
**Scope:** `packages/design-tokens`, `apps/native-rd/src/themes`, native-rd app chrome

## Problem

The current design-token system has grown past the product need:

- native-rd exposes 7 peer themes, but the theme code generates 14 combinations by crossing light/dark with accessibility variants.
- `@rollercoaster-dev/design-tokens` is documented as the source of truth, but native-rd still patches colors, aliases, line heights, and theme shapes in `src/themes/adapter.ts`.
- The package already generates `chromeHeader*`, `chromeTabBar*`, and related semantic colors, but native-rd does not compose them into `ComposedTheme`.
- App headers and safe-area backgrounds currently use `theme.colors.accentYellow`, making brand yellow do app-shell work that should belong to chrome tokens.
- The token package exports formats that are not currently consumed, which increases maintenance cost.

## Goal

Make the theme system boring and explicit:

- 7 named product themes, matching the Settings UI.
- One native theme contract consumed by Unistyles.
- Dedicated app-shell chrome roles for headers, top bars, tab bars, and modal chrome.
- No implicit dark/accessibility theme matrix unless each combination is deliberately designed and tested.

## Non-Goals

- Redesigning the visual language.
- Removing neurodivergent-friendly themes.
- Refactoring unrelated component styles.
- Replacing Unistyles.

## Decisions

| ID  | Decision                                                                                                                         | Rationale                                                                           |
| --- | -------------------------------------------------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------- |
| D1  | Treat themes as 7 named product themes: `default`, `dark`, `highContrast`, `dyslexia`, `lowVision`, `autismFriendly`, `lowInfo`. | This matches the UI and avoids unsupported combinations like `dark-dyslexia`.       |
| D2  | Compose generated semantic chrome tokens into native-rd as `theme.chrome`.                                                       | Header/tab/modal colors are app-shell semantics, not general accent colors.         |
| D3  | Keep `theme.colors.accentYellow` for content accents, status badges, and reward/journey moments.                                 | Yellow remains a brand/content token, but no longer owns headers.                   |
| D4  | Make `packages/design-tokens` generate the native theme shape directly or nearly directly.                                       | The adapter should become a compatibility shim, not a second source of truth.       |
| D5  | Add validation before removing outputs.                                                                                          | Existing web consumers still use CSS outputs, so removals should be evidence-based. |

## Implementation Plan

### Step 1: Add chrome to native-rd composed themes

**Files:**

- `apps/native-rd/src/themes/adapter.ts`
- `apps/native-rd/src/themes/variants.ts`
- `apps/native-rd/src/themes/compose.ts`
- `apps/native-rd/src/themes/index.ts`

**Changes:**

- Add `chrome` to `ComposedTheme`.
- Use `lightChromeColors` / `darkChromeColors` as base chrome modes.
- Apply `chromeVariants` alongside color and narrative variant overrides.
- Type the chrome override path so missing generated fields fail TypeScript.

**Acceptance:**

- `theme.chrome.chromeHeaderBg`, `theme.chrome.chromeHeaderFg`, and `theme.chrome.chromeHeaderBorder` are available in Unistyles stylesheets.
- Existing `theme.colors.*` consumers continue to type-check.

### Step 2: Move app headers off accent yellow

**Files:**

- `apps/native-rd/src/screens/GoalsScreen/GoalsScreen.tsx`
- `apps/native-rd/src/screens/GoalsScreen/GoalsScreen.styles.ts`
- `apps/native-rd/src/screens/BadgesScreen/BadgesScreen.tsx`
- `apps/native-rd/src/screens/BadgesScreen/BadgesScreen.styles.ts`
- `apps/native-rd/src/screens/SettingsScreen/SettingsScreen.tsx`
- `apps/native-rd/src/screens/SettingsScreen/SettingsScreen.styles.ts`
- `apps/native-rd/src/screens/TimelineJourneyScreen/TimelineJourneyScreen.tsx`
- `apps/native-rd/src/screens/TimelineJourneyScreen/TimelineJourneyScreen.styles.ts`
- `apps/native-rd/src/screens/FocusModeScreen/FocusModeScreen.tsx`
- `apps/native-rd/src/screens/FocusModeScreen/FocusModeScreen.styles.ts`
- `apps/native-rd/src/screens/BadgeDesignerScreen/BadgeDesignerScreen.tsx`
- `apps/native-rd/src/screens/BadgeDesignerScreen/BadgeDesignerScreen.styles.ts`
- `apps/native-rd/src/badges/IconPickerModal.styles.ts`

**Changes:**

- Replace header and safe-area `theme.colors.accentYellow` usage with:
  - `theme.chrome.chromeHeaderBg`
  - `theme.chrome.chromeHeaderFg`
  - `theme.chrome.chromeHeaderBorder`
- Keep yellow where it marks content state, progress, reward, or status.
- Keep media viewer overlays black/white because they are intentionally full-screen media chrome.

**Acceptance:**

- Top-level app headers are no longer yellow in the default theme unless the chrome token explicitly says they should be.
- Text in headers uses chrome foreground, not generic text when the header background differs.
- Tab bar can move to `theme.chrome.chromeTabBar*` in the same slice if the type change is already touching navigation.

### Step 3: Flatten the theme model

**Files:**

- `apps/native-rd/src/themes/compose.ts`
- `apps/native-rd/src/hooks/useTheme.ts`
- `apps/native-rd/src/hooks/useDensity.ts`
- `apps/native-rd/src/components/ThemeSwitcher/ThemeSwitcher.tsx`
- related tests

**Changes:**

- Replace `ColorMode x Variant` theme generation with an explicit `themeDefinitions` list.
- Make `ThemeName` a union of the 7 exposed product themes.
- Remove dark/accessibility combinations from `themeNames`.
- Keep a compatibility map only if existing persisted settings need migration.

**Acceptance:**

- `themeOptions.length === themeNames.length`.
- No generated `dark-dyslexia`, `dark-lowVision`, or similar names remain.
- Density updates still apply to every available theme.

### Step 4: Reduce adapter responsibilities

**Files:**

- `packages/design-tokens/build-unistyles.js`
- `packages/design-tokens/src/tokens/*.json`
- `apps/native-rd/src/themes/adapter.ts`

**Changes:**

- Move app-required aliases and colors into package tokens or local native-rd constants with clear ownership.
- Generate absolute React Native line heights in the package output instead of recomputing them in the app.
- Remove duplicate or dead semantic mappings, including duplicate JSON keys.

**Acceptance:**

- `adapter.ts` becomes a small import boundary with minimal compatibility aliases.
- Token changes require edits in one layer, not package plus native adapter.

### Step 5: Validate and update docs

**Files:**

- `apps/native-rd/docs/architecture/design-token-system.md`
- `apps/native-rd/docs/design/nd-themes.md`
- token tests / theme tests

**Changes:**

- Rewrite docs around the 7-theme contract.
- Document chrome roles and when to use `theme.chrome` versus `theme.colors`.
- Add checks for:
  - duplicate JSON keys in token/theme sources
  - generated export paths existing
  - theme-name snapshot
  - header foreground/background contrast

**Acceptance:**

- Docs match code.
- `bun run type-check` passes in native-rd.
- `bun test` passes for affected theme and component tests.
- `bun run build` passes in `packages/design-tokens`.

## Suggested Commit Slices

1. `feat(native-rd): expose chrome tokens in composed themes`
2. `fix(native-rd): use chrome tokens for app headers`
3. `refactor(native-rd): flatten theme names to exposed product themes`
4. `refactor(design-tokens): reduce native adapter responsibilities`
5. `docs(native-rd): document simplified design token contract`

## Open Questions

- Should `largeText` remain a selectable theme, or become an independent text-size preference like density?
- Should the default header background be `chromeHeaderBg = card` or `chromeTopBarBg = background`?
- Should tab bar migration happen with header chrome, or as a separate app-shell pass?
