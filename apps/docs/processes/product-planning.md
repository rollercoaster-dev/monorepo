# Product Planning Methodology

**Status:** Accepted
**Owner:** Joe
**Last updated:** 2026-04-23
**Applies to:** All apps and packages in the `rollercoaster.dev` monorepo, including `native-rd`, `openbadges-system`, `openbadges-ui`, and the shared `openbadges-*` packages.

---

## Purpose

This document captures **how product planning happens** in the rollercoaster.dev ecosystem. It exists so that agents and collaborators starting new work — a new product, a rebuild, a major feature, a new package — follow the same sequence the project has already proven works (most recently on `native-rd`).

If you are an agent, **read this before proposing or agreeing to any planning activity**. If the user says "let's plan X," "let's write stories for Y," or "how do I build this," your default is this methodology unless the user explicitly overrides it.

---

## The sequence (in order)

```
 User Stories  →  Vision Docs  →  Design Docs  →  ADRs / Planning  →  Build
  (target             (what it        (how it         (how we'll         (implementation,
   experience)         is, who          looks and        build it)         issues,
                       for, how         feels)                             milestones)
                       it relates)
```

Each phase feeds the next. Skipping a phase is a mistake — the later phases lose grounding and the work drifts.

### 1. User Stories — start here

Write narrative stories describing **the target experience** — what you want the product to deliver once it's built. Stories drive everything downstream. Nothing else gets written until stories are solid.

**Stories are forward-looking by design.** They describe what _should_ be possible, not what already works. Refusing to write a story because "the feature doesn't exist yet" is **the exact opposite of the point**: the story is how you define what needs to be built in the first place.

If a CLI doesn't exist yet, write the story of the developer using the CLI. If the AI-agent integration isn't built, write the story of the agent using the API. Those stories are the thing the vision docs, design docs, ADRs, and build tickets are all serving.

See the "How to write a story" section below for structure.

### 2. Vision Docs

Once stories are solid, write vision documentation:

- **What it is** — product definition
- **Who it's for** — audience, not personas-in-abstract
- **What it isn't** — explicit non-goals
- **How it relates** — to other products, packages, standards
- **Core principles** — the values that decide edge cases
- **Iteration strategy** — the A/B/C/D breakdown (see below)

Canonical example: [`apps/native-rd/docs/vision/product-vision.md`](../../native-rd/docs/vision/product-vision.md).

Vision docs are filtered by stories. If a proposed vision claim can't be traced back to a story it serves, cut it.

### 3. Design Docs

Once vision is settled, write design documentation:

- **Design language** — visual identity, typography, color, spacing
- **Design principles** — ND rules, accessibility, interaction patterns
- **User flows** — how users move through the product
- **Component design** — the building blocks

Canonical examples:

- [`apps/native-rd/docs/vision/design-principles.md`](../../native-rd/docs/vision/design-principles.md)
- [`docs/design/DESIGN_LANGUAGE.md`](../../../docs/design/DESIGN_LANGUAGE.md)

Design docs inherit from the ecosystem-wide design language. Don't re-derive; inherit and extend.

### 4. ADRs / Planning

Once design is settled, write technical decision records and implementation plans:

- **ADRs** (Architecture Decision Records) — every significant technical choice, with context, decision, consequences
- **Iteration strategy doc** — what ships in A, B, C, D (canonical: [`ADR-0001`](../../native-rd/docs/decisions/ADR-0001-iteration-strategy.md))
- **Architecture docs** — data model, sync, deployment
- **Roadmap** — sequencing and dependencies

### 5. Build

Only now do issues get filed and code gets written. Each issue traces back, through ADRs and design docs, to a user story.

---

## Iteration discipline

The rollercoaster.dev approach is **iteration-based product shipping**, not continuous feature creep.

**Rules:**

1. **Each iteration ships as a complete, usable product.** Not a demo, not a prototype. `native-rd`'s Iteration A is a functional self-signed badge tool today, even without Iterations B, C, D.
2. **Complexity is earned.** Don't design A with B's requirements baked in. Let B inform A's data model, but don't let B inflate A's UI.
3. **Later iterations build on earlier ones.** Never replace. If Iteration C would require rewriting A's data model, the model was wrong in A and needs fixing before C starts.
4. **Baby steps, always.** For users (break goals into steps) _and_ for development (A before B before C). Applies recursively within an iteration too.

The canonical breakdown across the rollercoaster.dev ecosystem:

|                                    | Theme                                             |
| ---------------------------------- | ------------------------------------------------- |
| **Iteration A — Quiet Victory**    | The core loop. Create, track, earn.               |
| **Iteration B — Learning Journey** | Manage non-linear life. Stack, interrupts, drift. |
| **Iteration C — Skill Tree**       | Make invisible progress visible.                  |
| **Iteration D — Community**        | Peer verification, federation.                    |

New products in the ecosystem should either adopt this framework or explicitly justify why theirs differs.

---

## How to write a user story

The canonical reference is [`apps/native-rd/docs/vision/user-stories.md`](../../native-rd/docs/vision/user-stories.md). Read a few stories there before writing your own.

### Structure

Each story has:

1. **Title** — a short scene that hints at the outcome
2. **Metadata header** — Actor, Actor class, Iteration, Status, Claim validated (one line stating what this story proves)
3. **Narrative** — 200–500 words, present tense, named actor, concrete details. Read like a short scene, not a spec.
4. **Footer** — _Features used_, _Evidence types_, _ND pattern_ or _Why this belongs on web / mobile / CLI_, _Anti-requirements this enforces_

### Voice

Match the voice of the landing page and of existing stories:

- Non-judgmental, empathetic, factual
- Specific details (names, times, small concrete moments)
- No hype, no marketing copy, no "seamless experience"
- Character moments where they belong (quiet empty states, small personality on milestones) — not in buttons, errors, or verification

### Iteration labels

Match the four-iteration framework. If a story crosses iterations, pick the earliest one where it would ship. If a story is explicitly aspirational and doesn't fit any iteration yet, park it in a clearly-labeled "Parked / future" section with a note.

### Status labels

- **Target state** — the scenario the story describes is what we want to build
- **Partially true today** — parts work; the story describes the intended full state
- **Needs rework** — the story is in the file but the author isn't satisfied; placeholder for later

### Anti-requirements

Every story should, where possible, **surface at least one anti-requirement** — something the story implicitly rules out. Anti-requirements are captured as they emerge during story writing, not as a separate task. They protect scope.

Example: a story where a user verifies a badge without signing up implies the anti-requirement _"no sign-up wall for verification."_ Capture it.

### Do not

- **Do not gatekeep stories on "the feature doesn't exist yet."** The story is how you _define_ what needs to exist.
- **Do not write stories as tickets or specs.** Stories are narrative. Specs come later.
- **Do not write stories only for current users.** Include the aspirational user whose product this will serve once built.
- **Do not skip the metadata header.** Agents downstream read the header to route the story correctly; prose alone isn't enough for downstream automation.
- **Do not delete a story you dislike.** Mark it _needs rework_ and move on. Deletion loses the slot and the intent.

---

## Collaboration rhythm

When planning with an agent:

1. **Start with a short read.** Agent reads the canonical native-rd vision docs, ADR-0001, and design-principles before proposing structure.
2. **Agent drafts, user reacts.** The user's gut is the authoritative signal on whether a story is right. Don't expect the user to specify upfront; draft concrete artifacts and let the user push back.
3. **One question at a time.** When the agent needs clarification, pick the single most-blocking question and ask it cleanly. Don't dump lists of questions on a tired author.
4. **No pretend agreement.** If a draft story is wrong, say so — don't polish it. The frustration breaker rule applies: if the user pushes back twice in a row, stop and reset rather than iterating on a bad draft.
5. **Capture anti-requirements in the stories file as they emerge.** Don't defer to a separate document.
6. **Keep a change log.** Every story file has a change log at the bottom. Every substantive edit adds an entry.

---

## What "stories are solid" means

You know the stories are solid and ready to feed the vision phase when:

- Every iteration (A, B, C, D) has at least one story
- Every intended actor class appears in at least one story
- Each story's "claim validated" is distinct (no two stories validate the same thing)
- The author has read through the file end-to-end and has no _needs-rework_ entries left
- Anti-requirements captured from the stories form a coherent list that you'd be willing to publish as rules

Before this point, don't advance to vision docs. The vision will inherit the story file's problems.

---

## Anti-patterns to avoid

- **Jumping to implementation before stories exist.** "Let me just build the thing" is how the first `openbadges-system` and `openbadges-ui` became a mess. The rebuild exists because planning was skipped.
- **Writing vision docs first.** Vision without stories is abstract and drifts. Stories without vision docs is survivable; vision without stories is not.
- **Specifying stories.** If a story has field types, API shapes, or interface definitions in it, those belong in design or ADR docs. Move them.
- **Using "feature X doesn't exist yet" as a reason to not write the story.** This is the most common mistake. The story is the reason the feature will exist. See the Do Not list above.
- **Letting one agent session redesign the process.** The methodology is stable. If an agent proposes changing the sequence, stop and reference this doc. Changes to the methodology itself are made deliberately, not mid-session.

---

## Canonical references

- **User stories example:** [`apps/native-rd/docs/vision/user-stories.md`](../../native-rd/docs/vision/user-stories.md)
- **Vision doc example:** [`apps/native-rd/docs/vision/product-vision.md`](../../native-rd/docs/vision/product-vision.md)
- **Design principles example:** [`apps/native-rd/docs/vision/design-principles.md`](../../native-rd/docs/vision/design-principles.md)
- **Iteration strategy ADR example:** [`apps/native-rd/docs/decisions/ADR-0001-iteration-strategy.md`](../../native-rd/docs/decisions/ADR-0001-iteration-strategy.md)
- **Current rebuild planning (openbadges-system):** [`apps/docs/vision/openbadges-toolkit-rebuild.md`](../vision/openbadges-toolkit-rebuild.md)
- **Current stories (openbadges-system rebuild, in progress):** [`apps/openbadges-system/docs/user-stories.md`](../../openbadges-system/docs/user-stories.md)

---

## Change log

- **2026-04-23** — Document created after an agent session where an agent incorrectly refused to write stories for unbuilt tools (CLI, AI-agent integration) on the grounds that it would be "fiction." The author corrected the agent: writing stories for not-yet-built tools _is the point_ — that's how the project decides what to build. This doc captures the methodology explicitly so future agents don't repeat the mistake.
