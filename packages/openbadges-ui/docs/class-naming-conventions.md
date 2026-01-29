# CSS Class Naming Conventions

## Prefix

All openbadges-ui classes use the `ob-` prefix to match the token namespace.

## Pattern (BEM-inspired)

```text
ob-<component>              → root element
ob-<component>__<element>   → child element
ob-<component>--<modifier>  → variant modifier
is-<state>                  → dynamic state (active, expanded, etc.)
```

## Examples

```html
<!-- Badge Display -->
<div
  class="ob-badge-display ob-badge-display--interactive ob-badge-display--density-normal"
>
  <div class="ob-badge-display__image">
    <img class="ob-badge-display__img" />
  </div>
  <div class="ob-badge-display__content">
    <h3 class="ob-badge-display__title">...</h3>
    <p class="ob-badge-display__description">...</p>
  </div>
</div>

<!-- Issuer Card -->
<div class="ob-issuer-card is-interactive">
  <div class="ob-issuer-card__image">...</div>
  <div class="ob-issuer-card__content">...</div>
</div>
```

## Token Usage in Styles

Components use a three-tier fallback chain:

```css
.ob-badge-display {
  /* component-token → semantic-token (no hardcoded fallback) */
  --badge-border-color: var(--ob-badge-border-color, var(--ob-border-color));
  border: 1px solid var(--badge-border-color);
}
```

Hardcoded hex/pixel values are not permitted in fallback chains. All visual values must resolve through the token contract in `src/styles/tokens.css`.

## Legacy

The previous `manus-` prefix has been fully replaced with `ob-` as part of issue #595. All components now use the `ob-` prefix with BEM-style naming.
