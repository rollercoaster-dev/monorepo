# Vercel React Native & Best Practices Research

Research gathered on 2026-02-03 for native-rd UI library evaluation.

## Articles Reviewed

1. [How We Built the v0 iOS App](https://vercel.com/blog/how-we-built-the-v0-ios-app)
2. [Introducing React Best Practices](https://vercel.com/blog/introducing-react-best-practices)

---

## v0 iOS App Architecture

Vercel's v0 iOS app was built with **React Native + Expo**, targeting Apple Design Award quality.

### Core Stack

| Layer | Technology |
|-------|------------|
| Framework | React Native + Expo |
| Lists | LegendList (virtualized) |
| Animation | React Native Reanimated |
| Keyboard | react-native-keyboard-controller |
| Styling | react-native-unistyles |
| Menus | Zeego (native UIMenu) |
| Effects | @callstack/liquid-glass |

### Key Architecture Decisions

**State Management via Shared Values**

Uses composable provider pattern with Reanimated shared values instead of React Context:

```
ComposerHeightProvider → MessageListProvider → NewMessageAnimationProvider → KeyboardStateProvider
```

> "Shared values let us update state without triggering re-renders."

**Why this matters for native-rd:** With 7 accessibility themes requiring frequent switching, avoiding Context re-renders is critical.

**Styling Without Re-renders**

`react-native-unistyles` provides theming without re-renders or Context access - worth evaluating as alternative to Tamagui/NativeWind/GlueStack.

**Native Over JS Components**

Deliberately avoided JavaScript component libraries in favor of native elements:
- Native `Alert` component
- Native `Modal` with `presentationStyle="formSheet"` for bottom sheets
- Zeego wrapping `react-native-ios-context-menu` for native menus

**API Integration Pattern**

```
Zod types → OpenAPI spec → Hey API code generation → Tanstack Query hooks
```

This creates type-safe API clients with automatic caching and deduplication.

### Performance Techniques

| Technique | Benefit |
|-----------|---------|
| `contentInset` on ScrollView | Avoids Yoga layout recalculations |
| Synchronous `ref.measure()` | New Architecture enables height on first render |
| Animation pool limiting | Max 4 words animating simultaneously |
| No autoscroll during streaming | Content fills naturally, manual scroll button |

### Native Patches Applied

The team patched `RCTUITextView` (Objective-C) for:
- Disabled scroll indicators
- Removed bounce effects
- Interactive keyboard dismissal
- Upward pan gesture to focus input

They acknowledge maintenance burden but consider it "the most practical solution."

---

## React Best Practices Framework

57 rules across 8 categories, prioritized by impact.

### The Ordering Principle

> "If a request waterfall adds 600ms of waiting time, it doesn't matter how optimized your useMemo calls are."

Fix problems from top of stack down.

### Rule Categories by Priority

| Priority | Category | Impact | Rule Count |
|----------|----------|--------|------------|
| 1 | Eliminating Waterfalls | CRITICAL | 5 |
| 2 | Bundle Size | CRITICAL | 5 |
| 3 | Server-Side Performance | HIGH | 7 |
| 4 | Client-Side Data Fetching | MEDIUM-HIGH | 4 |
| 5 | Re-render Optimization | MEDIUM | 12 |
| 6 | Rendering Performance | MEDIUM | 9 |
| 7 | JavaScript Performance | LOW-MEDIUM | 12 |
| 8 | Advanced Patterns | LOW | 3 |

### Key Patterns

**Parallel Async Operations**

```typescript
// Anti-pattern: Sequential
const theme = await loadTheme();
const badges = await fetchBadges();

// Better: Parallel
const [theme, badges] = await Promise.all([
  loadTheme(),
  fetchBadges()
]);
```

**Lazy State Initialization**

```typescript
// Anti-pattern: Runs every render
const [theme, setTheme] = useState(getInitialTheme());

// Better: Callback runs once
const [theme, setTheme] = useState(() => getInitialTheme());
```

**Defer Await After Conditionals**

```typescript
// Anti-pattern: Always waits
const data = await fetchData();
if (!shouldRender) return null;

// Better: Check first
if (!shouldRender) return null;
const data = await fetchData();
```

---

## Relevance to native-rd

### High Priority Recommendations

1. **Evaluate react-native-unistyles** - May outperform Tamagui/NativeWind for 7-theme accessibility system due to zero re-render theming

2. **Use Reanimated shared values for theme state** - Prevents re-renders on theme switch while enabling smooth transitions

3. **Adopt LegendList** - If badge lists grow, virtualization is critical

4. **Consider Tanstack Query** - For badge data fetching with automatic caching/deduplication

5. **Profile theme switching** - Measure actual re-render cost with current Context approach

### Libraries to Evaluate

| Library | Purpose | Link |
|---------|---------|------|
| react-native-unistyles | Zero re-render theming | [GitHub](https://github.com/jpudysz/react-native-unistyles) |
| LegendList | Virtualized lists | [GitHub](https://github.com/LegendApp/legend-list) |
| Zeego | Native menus | [GitHub](https://github.com/nandorojo/zeego) |
| @callstack/liquid-glass | Morphing effects | [npm](https://www.npmjs.com/package/@callstack/liquid-glass) |

---

## Agent Skills Installed

Based on these articles, Vercel's agent skills were installed to enforce these patterns automatically:

```bash
npx skills add vercel-labs/agent-skills --yes
```

Installed to `.agents/skills/`:
- `vercel-react-native-skills` (30+ rules)
- `vercel-react-best-practices` (57 rules)
- `vercel-composition-patterns` (8 rules)
- `web-design-guidelines` (100+ rules)

See: [vercel-labs/agent-skills](https://github.com/vercel-labs/agent-skills)
