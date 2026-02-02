# ADR-0001: Iteration Strategy

**Date:** 2026-02-02
**Status:** Accepted
**Owner:** Joe

---

## Context

The native rollercoaster.dev app has an ambitious vision: personal goal tracking, learning journey management, skill tree visualization, and peer verification — all local-first, neurodivergent-first, built on Open Badges 3.0.

Building everything at once would be overwhelming and would delay shipping something useful. The vision documents (learning graph, planning graph, user stories) describe features spanning months or years of work.

We need a strategy that delivers value early and often, where each iteration is a complete product — not a half-finished step toward the real thing.

## Decision

Build the native app in four iterations. Each iteration ships as a usable, complete product. No iteration is a throwaway prototype. Each adds a layer on top of the last.

---

## Iteration A — Quiet Victory

**Theme:** The core loop. Create, track, earn.

**Scope:**

- Create a goal with a title and optional description
- Break a goal into ordered steps
- Attach evidence to goals and steps (photo, screenshot, text, voice memo, video, link, file)
- Mark steps complete
- Mark goal complete and earn a self-signed Open Badge (using `openbadges-core`)
- View your badges and their evidence
- All data stored locally on device
- All functionality works offline
- All 7 ND themes available from day one
- Export badges (OB3 JSON)

**Not in scope:**

- Multiple concurrent goals
- Reorganizing steps between goals
- Learning stack / interrupts
- Goal journal
- Skill tree visualization
- Sharing or verification by others
- Sync or cloud features
- AI of any kind

**Definition of done:** A user can create a goal, break it into steps, attach evidence, complete it, and earn a self-signed badge — entirely offline, on their phone.

**User story:** [Lina's Quiet Victory](../vision/user-stories.md#linas-quiet-victory), [Malik's First Scene](../vision/user-stories.md#maliks-first-scene), [Tomás Breaks It Down](../vision/user-stories.md#tomás-breaks-it-down)

---

## Iteration B — Learning Journey

**Theme:** Manage the messy reality of non-linear learning and life interruptions.

**Scope (adds to A):**

- Multiple concurrent goals
- Pause and resume goals
- Reorganize steps between goals (move, copy)
- Scope adjustment (shrink a goal, split into smaller goals)
- Goal journal — dated, informal entries for capturing thinking along the way (not evidence, just notes: "I'm stuck," "changed approach because," "realized I should split this")
- Learning stack — track what interrupted what, see the path back to paused goals
- Factual nudges — "You have 3 goals active. Your last badge was linked to Goal X."
- Badge-to-goal linking — when you earn a badge, link it to an active goal
- Multi-device sync (via chosen sync layer — PowerSync or Evolu)

**Not in scope:**

- Skill tree visualization
- Peer verification or sharing
- Mentor roles
- AI features
- Community or cloud features (beyond sync)

**Definition of done:** A user can manage multiple learning goals, pause and resume through life interruptions, journal their thinking, reorganize their work, and sync across devices.

**User story:** [Eva's Big Map](../vision/user-stories.md#evas-big-map)

---

## Iteration C — Skill Tree

**Theme:** Make invisible progress visible. Your badges become a map.

**Scope (adds to B):**

- Skill tree view — badges and goals rendered as nodes on a spatial canvas
- Manual node placement — drag, arrange, position
- User-drawn connections between badges and goals (prerequisites, progressions)
- Visual states — earned (solid), in-progress (glow), planned (ghost)
- Create future goals directly from the tree view (tap empty space, add a ghost node)
- Zoom, pan, filter by topic or tag

**Not in scope:**

- AI-suggested connections or recommendation engine
- Auto-layout or smart arrangement
- Peer verification or sharing
- Community features

**Definition of done:** A user can see their badges as a spatial skill tree they built by hand, with clear visual states and connections they drew themselves.

**User story:** [Kai's Scattered Badges](../vision/user-stories.md#kais-scattered-badges)

---

## Iteration D — Community

**Theme:** The personal tool connects to other people.

**Scope (adds to C):**

- Share a badge with another device (device-to-device, no server required)
- Peer verification — review someone's evidence, verify with a tap
- Verification chain — verifier's own badges add weight to their verification
- Mentor role — a verified badge holder can verify others in that domain
- Badge import — receive a badge issued by an institutional server (monorepo federation)
- Optional cloud community features (discovery, public profiles)

**Not in scope:**

- Social feeds or follower systems
- Badge marketplace or monetization
- AI verification

**Definition of done:** Two users can share and verify badges between their phones without needing a server or internet connection.

**User story:** [Carmen Passes It On](../vision/user-stories.md#carmen-passes-it-on)

---

## Consequences

**Positive:**

- Users get value from iteration A — no waiting for the full vision
- Each iteration is a natural stopping point if priorities change
- Features are validated by real use before the next layer is added
- Complexity is earned, not assumed
- The data model can evolve — A's simple model doesn't need to anticipate C's skill tree

**Negative / Risks:**

- Data model changes between iterations may require migrations
- Users of A may want B features — need to manage expectations
- Some architectural decisions in A (sync layer choice, database schema) affect all future iterations
- The `openbadges-core` extraction is a prerequisite for A and affects the monorepo

**Mitigations:**

- Choose a sync-ready database from day one (decision in research phase) to avoid rearchitecting in B
- Design the data model for A with B's needs in mind (goals that can be paused, steps that can be moved) even if the UI doesn't expose those features yet
- Document the `openbadges-core` extraction as a separate plan with its own scope

---

## Dependencies

| Iteration | Depends on |
|-----------|-----------|
| A | `openbadges-core` extraction from monorepo |
| A | UI library decision (Tamagui or Gluestack) |
| A | Sync layer decision (PowerSync or Evolu) — chosen in A, sync ships in B |
| B | Iteration A complete |
| C | Iteration B complete |
| D | Iteration C complete, device-to-device communication research |

---

## Related Documents

- [Product Vision](../vision/product-vision.md)
- [User Stories](../vision/user-stories.md)
- [Design Principles](../vision/design-principles.md)
- [UI Library Comparison](../research/ui-library-comparison.md)
- [Local-First Sync Comparison](../research/local-first-sync-comparison.md)
- [Learning Graph Vision (monorepo)](https://github.com/rollercoaster-dev/monorepo/blob/main/docs/vision/learning-graph.md)
- [Planning Graph Phase 2 (monorepo)](https://github.com/rollercoaster-dev/monorepo/blob/main/docs/plans/2026-01-29-planning-graph-phase2-design.md)

---

_Accepted 2026-02-02. Baby steps, always._
