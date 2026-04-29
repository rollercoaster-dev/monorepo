---
"@rollercoaster-dev/design-tokens": minor
---

Add `accentPurpleFg` token paired with `accentPurple` for theme-aware text-on-purple contrast, and align `backgroundSecondary` across themes.

- New `accentPurpleFg` in the `Colors` interface, sourced from `interactive.secondary-foreground`. Resolves to `#0a0a0a` for light/dark/dyslexia/autism (light purple bg), `#ffffff` for highContrast/lowVision/lowInfo (mid-grey bg).
- `lowVision` and `lowInfo` themes gain explicit `interactive.secondary-foreground: "#ffffff"` so their darker `secondary` reads correctly.
- `semantic.muted` value changes from `{color.gray.50}` (`#fafafa`, identical to background) to `#f0f0f0` (a real elevation step). Affects every consumer that reads `muted` or `backgroundSecondary` — previously `backgroundSecondary` for light resolved to white due to the build script reading `semantic.card`; it now reads `semantic.muted` for consistency with variant themes.
