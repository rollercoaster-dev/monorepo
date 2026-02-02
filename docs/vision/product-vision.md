# Product Vision: rollercoaster.dev (native)

**Date:** 2026-02-02
**Status:** Draft
**Owner:** Joe

---

## What It Is

Rollercoaster.dev (native) is a personal learning, goal, and project tracking app for minds that don't move in straight lines. It's built around a simple loop: set a goal, break it into steps, do the work, earn a self-signed Open Badge when you're done. Over time, your badges build into a skill tree — a visual map of where you've been and where you could go, designed to look and feel like a video game progression system.

This is not the monorepo. The monorepo (`rollercoaster-dev/monorepo`) is open-source infrastructure for institutions — schools, youth centers, makerspaces — to issue and manage badges. The native app is the personal tool. It's yours. It runs on your phone, stores data on your device, and works without an internet connection. Cloud sync and community features are optional additions, never requirements.

---

## Who It's For

The app is neurodivergent-first — designed for people with ADHD, autism, dyslexia, bipolar disorder, and other neurodivergent experiences. Not as an accommodation layer on top of a "normal" app, but as the foundational design constraint.

This means:

- Non-linear paths are expected, not edge cases
- Interruptions and context switches are part of the model, not failures
- The interface adapts to you (7 themes, content density, reduced motion, custom fonts)
- When life interrupts your goals, the app tracks where you were so you can find your way back — not to guilt you about what you paused
- "Unfinished" doesn't mean "worthless" — the system surfaces what's complete inside larger projects

Neurodivergent-first design benefits everyone. Clear information, predictable patterns, and low cognitive load make a better app for all users. But the design decisions are driven by ND needs, not retrofitted for them.

---

## What It's Not

- **Not a badge marketplace.** No monetization of credentials, no badge economy.
- **Not a social network.** No feed, no likes, no follower counts. Peer verification and community features come later and are always optional.
- **Not a centralized platform.** Your data lives on your device. The cloud is backup and community, not the primary experience.
- **Not an institutional tool.** Schools and youth centers use the monorepo. This app is for individuals tracking their own learning and growth.
- **Not a todo app.** The point isn't checking boxes and reaching goals. It's capturing the journey — the false starts, the pivots, the breakthroughs, the quiet wins along the way. Badges mark where you've been, not just where you ended up. The rollercoaster is the path.

---

## How It Relates to the Monorepo

The native app and the monorepo are two products built on shared foundations:

| | Monorepo | Native App |
|---|----------|-----------|
| **For** | Institutions (schools, youth centers, makerspaces) | Individuals |
| **Purpose** | Issue and manage badges for others | Track your own learning and goals |
| **Runs on** | Servers (Docker, self-hosted) | Your phone (Expo/React Native) |
| **Data** | Organization-managed | User-owned, on-device |
| **UI framework** | Vue 3 (openbadges-ui) | React Native |

**What they share:**

- `openbadges-types` — TypeScript types for Open Badges 2.0/3.0
- `openbadges-core` — badge creation, signing, baking, verification logic (to be extracted from `openbadges-modular-server`)
- Design token system — shared foundational and semantic tokens, platform-specific implementations
- Open Badges 3.0 standard — badges created in either system are interoperable

**Where they converge (future):**

- A badge earned in the native app can be verified by an institutional server
- A badge issued by a school can appear in your personal skill tree
- Federation connects personal and institutional nodes into a trust network

---

## Core Principles

1. **Local-first, always.** The app works without internet. Your data lives on your device. Sync is an enhancement, not a dependency. If the cloud disappears tomorrow, your badges and progress remain.

2. **Neurodivergent-first, not neurodivergent-friendly.** Design decisions are driven by ND needs from the start. Accessibility isn't a theme you toggle on — it's the default experience. Seven themes, content density, reduced motion, and custom fonts exist because different brains need different environments.

3. **The journey is the product.** Badges mark the path, not just the destination. Interrupted goals, pivots, and scope changes are captured — not erased.

4. **You own everything.** Your data, your badges, your keys. End-to-end encrypted sync means even the backup server can't read your data. No vendor lock-in. Export anytime. Leave anytime.

5. **Baby steps, always.** Both for users (break goals into manageable steps) and for development (iteration A before B before C). Complexity is earned, not assumed.

6. **Open standards, open source.** Built on Open Badges 3.0 and W3C Verifiable Credentials. Badges are portable and interoperable. The core libraries are published for anyone to use.

---

## Iteration Strategy

The app is built in three iterations, each adding a layer on top of the last:

### Iteration A — Quiet Victory

The core loop. Create a goal, break it into steps, complete steps, earn a self-signed badge. Private, personal, no verification needed. This is Lina's story — a small way to honour something only you understand the weight of.

### Iteration B — Learning Journey

Add the learning graph. Set learning goals, track interrupts and context switches, see your stack, link badges to goals, get factual nudges when activity drifts from stated priorities. This is Eva's story — the platform keeps your work organized through the chaos.

### Iteration C — Skill Tree

Add the visual layer. Your badges become nodes in a skill tree you design. Plan where you want to go, see where you've been, identify gaps. Earned badges are solid, in-progress badges glow, planned badges are ghosts. This is the video game progression system for real life.

### Iteration D — Community

Add peer verification and badge sharing. Share a badge with a mentor or peer device-to-device. They review your evidence and verify with a tap. Their name and credentials attach to your badge cryptographically. No server needed — phones talk directly. This is where the personal tool connects to other people.

Each iteration ships as a usable product. A is useful without B. B is useful without C or D. No iteration is a throwaway prototype.

---

## Technical Foundation

| Layer | Choice | Status |
|-------|--------|--------|
| **Runtime** | Expo / React Native | Decided |
| **UI library** | Tamagui or Gluestack + NativeWind | Research complete, prototyping needed |
| **Local storage** | SQLite (on-device) | Decided |
| **Sync layer** | PowerSync or Evolu | Research complete, prototyping needed |
| **Badge logic** | `openbadges-core` (extracted from server) | Decided, extraction needed |
| **Types** | `openbadges-types` (shared with monorepo) | Existing, published on npm |
| **Design tokens** | Shared JSON source → platform-specific transforms | Planned |

---

## Related Documents

- [Documentation Roadmap](../roadmap/documentation-roadmap.md) — what to write next
- [UI Library Comparison](../research/ui-library-comparison.md) — Tamagui vs Gluestack research
- [Local-First Sync Comparison](../research/local-first-sync-comparison.md) — PowerSync vs Evolu research
- [Learning Graph Vision](https://github.com/rollercoaster-dev/monorepo/blob/main/docs/vision/learning-graph.md) — journey management concepts (monorepo)
- [Planning Graph Vision](https://github.com/rollercoaster-dev/monorepo/blob/main/docs/vision/planning-graph.md) — project management concepts (monorepo)
- [User Stories](https://github.com/rollercoaster-dev/monorepo/blob/main/apps/docs/product/user-stories.md) — Lina, Eva, Malik, Marcus, Sofia (monorepo)
- [Design Language](https://github.com/rollercoaster-dev/monorepo/blob/main/docs/design/DESIGN_LANGUAGE.md) — visual design system (monorepo)
- [ADR-0002: Local-First](https://github.com/rollercoaster-dev/monorepo/blob/main/apps/docs/decisions/ADR-0002-local-first-optional-sync.md) — local-first architecture decision (monorepo)

---

_Draft created 2026-02-02. Foundation document for the native rollercoaster.dev app._
