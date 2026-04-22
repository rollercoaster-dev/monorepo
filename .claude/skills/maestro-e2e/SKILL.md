---
name: maestro-e2e
description: Maestro E2E testing conventions for native-rd. Use when writing or debugging Maestro flows, hitting element-not-found errors, adding clearState, gating a11y wrappers for E2E, or when the user asks about E2E in native-rd.
metadata:
  author: rollercoaster.dev
  version: "1.0.0"
---

# Maestro E2E — native-rd

Project-local conventions and battle-tested recipes for writing Maestro flows against `apps/native-rd` on iOS Simulator. Most of this is non-obvious; read before touching a flow or debugging an element-not-found.

The reference flow that exercises every pattern below is `apps/native-rd/e2e/flows/goal-lifecycle-complete.yaml`. When in doubt, diff against it.

---

## Root commands

```bash
bun run native:ios              # plain dev build
bun run native:ios:e2e          # E2E-flagged build — gates a11y grouping so Maestro can reach testIDs
bun --filter native-rd test:e2e:single e2e/flows/<flow>.yaml
bun run test:e2e                # all flows via turbo
```

Run `native:ios:e2e` before running a flow that touches the CardCarousel (Focus Mode) or the CompletionFlow summary cards. Plain `native:ios` will fail with element-not-found on nested testIDs because the a11y grouping is live.

---

## Determinism baseline

**State-mutating flows** (goal lifecycle, goal create, onboarding) start with:

```yaml
- launchApp:
    clearState: true
    clearKeychain: true
```

**Read-only flows** (`badge-view`, `settings-theme-switch`) skip it — they depend on prior state being populated, and the cost of clearing is high.

### iOS semantics of `clearState`

`clearState: true` on iOS is uninstall+reinstall. Requirements and gotchas:

- The app must already be installed on the simulator (a Maestro build does install it; a fresh simulator needs one `native:ios*` run first).
- It does **not** clear Keychain. `native-rd` uses Expo SecureStore — always pair with `clearKeychain: true` or you will see stale passkeys / signing keys carry across runs.
- It does **not** clear UserDefaults or notification permissions — see "Known Maestro iOS bugs" below.

---

## First-run onboarding prefix

After `clearState`, the app lands on `WelcomeScreen`. Canonical prefix:

```yaml
- assertVisible: "Pick what feels right"
- tapOn: "The Full Ride. Standard theme"
- tapOn: "Get Started"
- assertVisible: "Goals"
```

Note the composed-label form: **`"The Full Ride. Standard theme"`**, not `"The Full Ride"`. That's a consequence of the accessible-wrapper trap (next section).

If 3+ flows need this prefix, factor into `e2e/flows/_onboarding.yaml` and use `runFlow`. With only two lifecycle flows today, inline is fine — don't abstract prematurely.

---

## The accessible-wrapper trap (critical)

React Native `accessible={true}` with `accessibilityLabel` on a parent **collapses all children into a single iOS a11y node**. Maestro element lookup goes through the a11y tree, so nested `testID`s inside a grouped wrapper become invisible.

This is how 90% of "element not found" failures on this project start. Three recipes:

### 1. Tapping a labeled wrapper — match the composed label

The wrapper's `accessibilityLabel` overrides its children's text. Match the full composed string:

```yaml
- tapOn: "The Full Ride. Standard theme" # composed label (correct)
# NOT:
- tapOn: "The Full Ride" # child Text — not reachable
```

### 2. Gating grouping wrappers behind `EXPO_PUBLIC_E2E_MODE`

For wrappers that provide real a11y value in production (carousel `adjustable` role, summary `role`, composed labels) but block Maestro from reaching nested testIDs, gate _only_ the grouping behind a build-time flag. **Do not remove a11y** — that's a WCAG regression.

Reference implementations:

- `apps/native-rd/src/components/CardCarousel/CardCarousel.tsx` — the `accessible` / `accessibilityRole="adjustable"` / `accessibilityValue` / `accessibilityActions` props on the outer View and the `accessible={!isE2E && isCenter}` on `AnimatedCard`
- `apps/native-rd/src/screens/CompletionFlowScreen/CompletionFlowScreen.tsx` — the `summaryA11yProps(label)` helper that drops `accessible + accessibilityRole="summary" + accessibilityLabel` in E2E mode

Pattern:

```tsx
const isE2E = process.env.EXPO_PUBLIC_E2E_MODE === "true";

const groupingA11y = isE2E
  ? ({ accessible: false } as const)
  : ({
      accessible: true,
      accessibilityRole: "summary",
      accessibilityLabel: label,
    } as const);

<View {...groupingA11y}>{/* children with their own testIDs */}</View>;
```

Always add a Jest test that flips `process.env.EXPO_PUBLIC_E2E_MODE` and asserts the grouping is dropped, so a future refactor doesn't silently re-grow the problem.

### 3. Don't put testIDs on non-interactive wrapper Views

If a wrapper `<View>` has no `onPress`, a `tapOn: id:` taps dead pixels — no focus change, and the next `inputText` has nothing to type into. Maestro shows no error; the flow just wanders. Always put the testID on the actual `TextInput`, `Pressable`, or `Button`. Lesson learned: the `completion-note-input` testID was briefly on the wrapping `<View>` and the save step silently failed until it was moved onto the `TextInput` itself.

---

## Keyboard interception on save-style taps

Symptom: `scrollUntilVisible` + `tapOn` on a button near the bottom of a keyboard-active screen reports success, but the onPress never fires, and downstream assertions fail.

Cause: the on-screen soft keyboard is intercepting the tap even though the button is "visible" to Maestro's hit-test.

Fixes in order of preference:

1. **Tap a static element to dismiss the keyboard first.** A label above the input (e.g. the screen's header Text) works well:

   ```yaml
   - inputText: "..."
   - tapOn: "One last thing!" # static header — dismisses keyboard
   - scrollUntilVisible:
       element:
         id: "save-completion-note"
       direction: DOWN
   - tapOn:
       id: "save-completion-note"
   ```

2. **For single-line inputs only:** set `returnKeyType="done"` + `onSubmitEditing={handler}` on the TextInput and use `pressKey: enter` in the flow. This works for `StepCard`'s `quick-note-input`. It does **not** work for multiline inputs without `blurOnSubmit={true}`, which regresses UX by suppressing newlines — avoid.

3. **`hideKeyboard` is unreliable here.** Maestro can't find a dismiss affordance when the app doesn't expose a standard one, and the step fails with a confusing error. The static-tap fallback above is what Maestro's own error message recommends.

---

## Selector preferences

| For…                       | Prefer                                                        |
| -------------------------- | ------------------------------------------------------------- |
| Taps on interactive elems  | `testID` (survives label/copy changes)                        |
| Assertions on user-visible | `assertVisible: "literal text"` (resilient to test refactors) |
| Assertions on non-text UI  | `testID` for images / icons / rendered assets                 |
| Labeled wrappers / cards   | Composed `accessibilityLabel` as visible string               |

For user-visible copy, don't assert on testIDs — they're an implementation detail and hide when the user-visible string diverges from the contract. For non-text UI (images, rendered assets, icons) assert on a stable `testID`: there's no literal-text handle, and the testID is the only selector that also distinguishes "rendered the real thing" from "rendered a placeholder" (see `badge-earned-image` in `goal-lifecycle-complete.yaml` — the testID only appears on the non-placeholder branch). Don't tap on visible text if a testID is available — copy changes cascade into flow breakage.

---

## Env var flow for build-time gates

`EXPO_PUBLIC_*` vars are **Babel-inlined** by Expo at build time. They must be set in Metro's environment, not only on the `expo run:ios` invocation. Two gotchas:

- Set the var via `export` or inline on `scripts/run-ios.sh`, not only on the Expo command downstream. The `native:ios:e2e` script already does this.
- Kill stale Metro before rebuilding (`lsof -iTCP:8081`) or you risk serving a bundle that was built before the flag was set, and the gate silently doesn't apply.

If a flow that normally passes fails on the _first nested testID_ with element-not-found, the first thing to check is whether Metro is serving an E2E-flagged bundle or a stale dev bundle.

---

## Known Maestro iOS bugs

- [mobile-dev-inc/maestro#1601](https://github.com/mobile-dev-inc/maestro/issues/1601) — `clearState` doesn't clear UserDefaults. Open. If a flow depends on first-launch UserDefaults state, clear manually via `runScript` or reset the simulator.
- [mobile-dev-inc/maestro#1306](https://github.com/mobile-dev-inc/maestro/issues/1306) — `clearState` doesn't clear notification permissions. Open. Any permission prompt that depends on a clean state needs a manual sim reset.

When a flow breaks in CI but passes locally, cross-check these before assuming a code regression.

---

## Final-assertion occlusion (by modals, toasts, overlays)

`assertVisible` fails if the target is mounted but hit-test-occluded by an overlay — a modal, toast, snackbar, keyboard, etc. The test log and the screenshot will often show the target is "there", which is misleading. Two sub-cases:

1. **Occluded text under a modal with no wrapper** — the target is genuinely not hit-testable. Pick a different assertion that lives _on top of_ the overlay. A modal that auto-appears on success is often a _stronger_ end-state than the screen it covers (its presence proves the pipeline completed).

2. **Modal's button text is under an `accessible={true}` wrapper on the modal card** — the button is hit-testable by pixels but the a11y tree has collapsed it into the wrapper's composed label. Assert on the composed label (e.g. `accessibilityLabel="Badge earned"` on the modal card makes `- assertVisible: "Badge earned"` the right assertion, not `"View Badge"`).

Real example from `goal-lifecycle-complete.yaml`: the final step transitioned through three iterations — `"You did it!"` (occluded by modal) → `"View Badge"` (collapsed into wrapper's a11y node) → `"Badge earned"` (the composed label, which matches).

## When a flow fails — debug checklist

1. Is Metro running the right bundle (E2E build vs dev build)? Rebuild if in doubt.
2. Is the target element under an `accessible={true}` wrapper? If yes, either gate the wrapper or tap/assert on its composed label.
3. Is the testID on a non-interactive wrapper? Move it to the interactive child.
4. Is the keyboard up? Dismiss with a static-text tap before scrolling/tapping.
5. For a failing final `assertVisible`: is the target occluded by a modal or overlay? Pick a different assertion (see section above).
6. Does the step depend on SecureStore / Keychain state? Add `clearKeychain: true`.
7. Check the Maestro flow log for the actual selector it attempted — don't trust the step definition, trust the log.
