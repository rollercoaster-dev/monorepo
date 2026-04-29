# Visual Baseline — 2026-04-29 (Dark Rework)

Captured to validate the fix in [#934](https://github.com/rollercoaster-dev/monorepo/issues/934). Companion to the [dark mode rework plan](../../plans/2026-04-29-dark-mode-rework.md).

## Why a dark-only baseline

Before this rework, dark mode lost the neo-brutalist identity entirely: cards, modals, and chrome bands all sat in the same indigo luminance band, borders were indistinguishable from surfaces, and shadows rendered as a faint white bloom. Light mode was untouched throughout the rework, so light captures from the prior baseline still apply.

## What this set should cover

Each capture is taken with `dark-default` active. After capturing, drop the file in this directory using the listed name.

| File                      | Screen              | What it proves                                                              |
| ------------------------- | ------------------- | --------------------------------------------------------------------------- |
| `goals-dark.png`          | Goals (home)        | Tier-1 cards: bold lavender border, no shadow, real luminance step from bg. |
| `focus-mode-dark.png`     | Focus Mode          | Tier-1 step rows + tier-2 EvidenceDrawer (hard black shadow when open).     |
| `timeline-dark.png`       | Timeline            | TimelineNode + TimelineStep small-tier-1 surfaces, no shadow halo.          |
| `badge-designer-dark.png` | Badge Designer      | Preview container + chrome top bar darkened from `#c4b5fd` to `#8d7eb0`.    |
| `badges-dark.png`         | Badges (collection) | BadgeCard tier-1 surfaces in a grid — uniform border, uniform luminance.    |
| `settings-dark.png`       | Settings            | SettingsSection rows + chrome header band; muted-text hierarchy step.       |

## Acceptance check (per #934)

While capturing, verify:

- [ ] No card has a visible bottom-right offset shadow in dark.
- [ ] Borders read as confident outlines, not hairlines (target ~10:1 vs surface).
- [ ] Modals/sheets/FAB/Toast still have a hard offset shadow, but it is _black_ (cutout look), not white (glow).
- [ ] Top header band and bottom tab bar are noticeably darker lavender than they were pre-rework, with black icons/text still legible (≥4.5:1).
- [ ] Muted text (e.g. "Settings → caption rows", section labels) is visibly stepped down from primary, not just a clone of `textSecondary`.
- [ ] Light mode captures from `../visual-baseline-2026-04-29/` are unchanged when re-taken (no regression).

## How to capture

The autonomous toolchain can't drive simulator UI events, so this set has to be captured manually:

```bash
# 1. Build & launch
npx expo run:ios

# 2. In the running app: Settings → Theme → Dark, then navigate to each screen
# 3. Capture (Cmd+S in Simulator, or Device → Screenshot → Save to Files)
# 4. Save into this directory with the names above.
```

Once landed, link from the issue and from `index.md` if the index gets a "Visual baselines" section.
