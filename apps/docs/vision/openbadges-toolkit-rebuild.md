# OpenBadges Toolkit Rebuild — Planning Scope

**Status:** Working draft — actively being developed
**Date started:** 2026-04-23
**Owner:** Joe
**Phase:** User stories (step 1 of: stories → vision → design → planning)

> This is a **living capture doc** for the rebuild of the openbadges toolkit and its reference implementation. It holds decisions, personas, inventory, and parked ideas in one place while user stories are being developed. Not a finished artifact — expect churn. When planning concludes, settled parts get promoted into `vision/`, `product/`, `architecture/`, and ADRs; this doc gets archived.

---

## The thesis (one line)

**An OB 3.0-native, earner-first, composable open-source toolkit for building credentialing into anything — with a reference implementation that makerspaces and small orgs can actually run.**

---

## Why a rebuild

The current `openbadges-system` and `openbadges-ui` were exploratory first attempts — built to prove the work was possible, without a vision or scope discipline. `native-rd` taught the lessons that will guide this rebuild: tight scope, iteration-based story planning, design-first thinking, neurodivergent-first UX.

The landscape research (see `apps/docs/research/open-source-badge-server-landscape-2026-04.md`) confirms the rebuild is not duplicating existing work. Every actively-maintained OSS badge project is a monolith aimed at institutional issuance. An earner-first, toolkit-shaped, OB 3.0-native project is a genuine gap.

---

## What makes this different — posture, not features

Every actively-maintained OSS badge project is **monolithic**: one app, one database, one deploy unit. This one is a **toolkit** — small, composable libraries + a reference showcase — not a single-deploy app.

The moat isn't features. It's posture:

- **Composable over complete.** Small libraries that do one thing, not one app that does everything.
- **Earner-first over institution-first.** The person who did the thing is the primary user; issuers extend that, they don't own it.
- **OB 3.0-native over OB 2.0-compatible.** Bet on where the spec is going; don't anchor to 2012.
- **Reference implementation as fiduciary duty.** The showcase app only uses public toolkit APIs. If it can't, the toolkit is lying.

Model: Tailwind + Tailwind UI + shadcn/ui. Not: Moodle or Badgr.

---

## Toolkit inventory

### Existing packages (published today)

| Package            | Status              | Role after rebuild                                                                                                    |
| ------------------ | ------------------- | --------------------------------------------------------------------------------------------------------------------- |
| `openbadges-types` | Active              | Keep. Foundation — TypeScript types for OB 2.0/3.0.                                                                   |
| `openbadges-core`  | Active              | Keep. Signing, verification, PNG baking. Already used by `native-rd`.                                                 |
| `openbadges-ui`    | Exploratory / messy | **Rebuild.** Vue 3 components — slim down, drop institutional assumptions, add neo-brutalist design system alignment. |
| `rd-logger`        | Active              | Keep. Structured logging used across monorepo.                                                                        |

### Existing reference implementations

| App                         | Status              | Role after rebuild                                                                                                |
| --------------------------- | ------------------- | ----------------------------------------------------------------------------------------------------------------- |
| `openbadges-system`         | Exploratory / messy | **Rebuild.** Vue + Hono reference web app. Becomes the showcase of what's possible with the toolkit.              |
| `openbadges-modular-server` | Exists              | Decision pending — keep as separate API server? merge into `-core`? re-scope?                                     |
| `native-rd`                 | Active              | Keep. Mobile app, earner-facing. Already consumes `openbadges-core`. Remains the mobile reference implementation. |

### Planned additions

| Package            | Role                                                                                                                                | Source                                                 |
| ------------------ | ----------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------ |
| **Badge Designer** | Visual badge image creator. Integrated into `openbadges-system`. Possibly also a standalone package/app.                            | Extract from `native-rd`'s existing badge designer TS. |
| **CLI**            | Terminal tool for developers to issue, verify, and track credentials. Dual purpose: usable by humans _and_ by AI agents in scripts. | New.                                                   |

---

## Personas — all critical, tackled one at a time

Joe sees all four consumer personas as critical to the toolkit's success. They will be worked **one at a time** during story drafting, not in parallel — each persona gets its own batch of narrative stories before moving on.

### Toolkit consumers (primary — the thesis lives here)

1. **Solo indie developer** — adds badges to their SaaS via `npm install`. Wants clean TS, small bundle, sensible defaults, no OB3 expertise required.
2. **Makerspace tech-lead volunteer** — semi-technical, wants runnable services and config files, not library code. Wires the reference server into their existing member-management.
3. **LMS / institutional platform team** — needs stable public API contracts, OB 3.0 compliance, audit trails, docs that survive a compliance review.
4. **AI agent / scripting author** — uses the CLI and `openbadges-core` programmatically. Wants deterministic outputs, clean TS imports, minimal runtime assumptions.

### Reference implementation users (proves the toolkit is real)

5. **Makerspace coordinator** — adopts `openbadges-system` whole as their org's platform. Not a developer.
6. **Instructor / workshop lead** — issues badges to a cohort through the reference app. Cares about low-friction issuance.
7. **Earner** — receives badges, owns them, carries them into `native-rd`. This is where the ecosystem closes the loop.

---

## Integration modes (sanity check — all three in scope)

- **Mode 1 — Full deployment.** Org runs `openbadges-system` whole. Personas 5, 6, 7.
- **Mode 2 — Component embed.** Existing app drops in `openbadges-ui` / `openbadges-core`. Personas 1, 3.
- **Mode 3 — Headless.** CLI + `openbadges-core` + optional `openbadges-modular-server`. Personas 1, 4.

---

## Anti-requirements (captured as we go)

_(To be filled during story work. Seed list from research + conversation so far:)_

- [ ] No story shall require the user to create an "issuer" before they can create a badge. (Lesson: every existing OSS project does this, and it's the first drop-off point for non-institutional users.)
- [ ] No toolkit package ships without a runnable minimal example (10–20 lines) and a reference use in `openbadges-system`. If we can't write both, the API isn't done.
- [ ] The reference implementation (`openbadges-system`) shall only use public toolkit APIs. No private side-doors.
- [ ] No core dependency on a single corporate steward. (Lesson: Badgr died when Instructure acquired it.)
- [ ] No hard assumptions about a specific identity federation. (Lesson: `edubadges-server` is coupled to SURF's eduID and can't be adopted elsewhere without surgery.)
- [ ] No stack choices whose maintainers age out. (Lesson: Salava died on Clojure + Java 8 + MariaDB.)
- [ ] No forced social interaction or account creation for core self-signing flow.
- [ ] _(more to be added as stories surface them)_

---

## Story pipeline

_(Tracked here as we write. Each entry: persona, story title, status, one-line claim the story validates.)_

| #   | Persona        | Story title | Status | Claim |
| --- | -------------- | ----------- | ------ | ----- |
| —   | _(start here)_ | —           | —      | —     |

---

## Parked ideas / open questions

Explicitly _not_ cutting, but _not_ in the first-cut scope. Captured so they don't get lost.

- **Federation / ActivityPub badge inbox** — conceptually compelling, nobody in the space has done it, but it's a scope trap for v1.
- **EUDI Wallet / OpenID4VCI bridge** — strategically relevant for 2027 per eIDAS 2.0. Defer; consider after v1 lands.
- **Badge Designer as standalone package** — decision to make after extracting from `native-rd`. Could become its own npm package or stay embedded in `openbadges-system`.
- **OB 2.0 compatibility** — to what extent? Institutions still live in OB 2.0 (Moodle, Open edX, Canvas). Verification-only? Full issuance? Decide before design phase.
- **Sustainability / funding model** — not a story question directly, but it shapes pacing. Side project? Grant? Revenue? Needs a separate conversation.
- **`openbadges-modular-server`'s role after rebuild** — keep as separate API? merge into `-core`? split further? Resolve during architecture phase.
- **Badge "migration from Badgr" story** — real, time-limited opportunity (Parchment sunsetted free tier 2025-12-31), but the window is mostly closed. Worth one story? Unclear.

---

## Related docs

- **Landscape research:** [`apps/docs/research/open-source-badge-server-landscape-2026-04.md`](../research/open-source-badge-server-landscape-2026-04.md)
- **Existing ecosystem vision:** [`apps/docs/vision/openbadges-ecosystem.md`](./openbadges-ecosystem.md) — legacy, to be superseded by a new vision doc after stories settle.
- **Existing user stories (earner-first):** [`apps/docs/product/user-stories.md`](../product/user-stories.md) — keep, extend, cross-link from new stories.
- **native-rd story model:** [`apps/native-rd/docs/vision/user-stories.md`](../../native-rd/docs/vision/user-stories.md) — tone, structure, iteration-based scoping reference.
- **Monorepo root:** [`AGENTS.md`](../../../AGENTS.md)

---

## Change log

- **2026-04-23** — Document created. Captured thesis, personas, inventory, integration modes, anti-requirement seeds, parked ideas.
