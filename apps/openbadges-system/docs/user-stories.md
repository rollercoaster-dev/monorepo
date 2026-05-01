# User Stories — openbadges-system / openbadges-ui Rebuild

**Status:** Draft v0.2 — framework aligned to native-rd vision, individual stories still need re-homing
**Date:** 2026-04-23
**Owner:** Joe
**Phase:** User stories (step 1 of: stories → vision → design → planning)

> These stories drive the rebuild of `openbadges-system` (web reference implementation, deployed as `rollercoaster.dev`) and `openbadges-ui` (Vue component library). They follow the iteration framework already accepted in [ADR-0001 (native-rd)](../../native-rd/docs/decisions/ADR-0001-iteration-strategy.md) so web and mobile evolve in sync.

## Iteration framework (inherits from native-rd ADR-0001)

Each iteration ships as a complete product. No iteration is a throwaway prototype. Complexity is earned.

| Iteration                | Theme                                        | Scope (web-shaped)                                                                                                                                                                                                                      |
| ------------------------ | -------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **A — Quiet Victory**    | The core loop. Create, track, earn.          | Create goal → break into steps → attach evidence → mark complete → earn self-signed OB3 badge → view + share on web. Local-first, works offline. All 7 ND themes.                                                                       |
| **B — Learning Journey** | Manage the messy reality of non-linear life. | Multiple concurrent goals, pause/resume, goal journal, learning stack (what interrupted what), factual nudges, drift detection, badge-to-goal linking, multi-device sync. See [Learning Graph](../../../docs/vision/learning-graph.md). |
| **C — Skill Tree**       | Make invisible progress visible.             | Spatial canvas of badges + goals as nodes, manual placement, user-drawn connections, visual states (earned/in-progress/planned), zoom/pan/filter.                                                                                       |
| **D — Community**        | The personal tool connects to other people.  | Peer verification, mentor verification, device-to-device sharing, badge import from institutional servers, spec-compliant `eddsa-rdfc-2022` signing upgrade.                                                                            |

## Cross-iteration primary pattern — the Task View

Runs through all iterations. Not a feature, a default interface.

One screen, one next step per active goal. Nothing else. Answers the only question that matters when overwhelmed: _what's the one thing I could do right now?_

On the web this means the landing-dashboard at `rollercoaster.dev` (once you're signed in) is not a progress bar or a goal tree — it's a short list of one-line next steps, tap/click to mark done, nothing else in your face. Depth is available by drilling in. The surface stays quiet.

Not yet built anywhere (even on native-rd as of 2026-02-28). This is a rebuild commitment.

## Inherited design principles

From [native-rd design-principles.md](../../native-rd/docs/vision/design-principles.md) — adopted wholesale, extended where web adds constraints. Do not re-derive; treat these as preconditions for every story:

- **Offline-first.** Anything that requires connectivity is an enhancement.
- **Reduce cognitive load.** One primary action per screen.
- **Respect user state.** Show facts, not judgments. No guilt, no time pressure, no streak shame.
- **Works in 30 seconds.** Quick check-in is the common interaction, deep use is possible but never required.
- **Self-issuance is always supported.** External verification adds value, never required.
- **ND-first, not ND-friendly.** 7 themes (light / dark / high contrast / large text / dyslexia / low vision / autism-friendly) ship from day one. Spec compliance (OB3, W3C VC) over shortcuts.
- **Character moments, selectively.** Empty states, first-time milestones, returns after long absence speak with personality ("First one. (noted.)", "No badges yet. What have you been up to?"). Buttons, errors, and verification stay direct and clear.

## Story-writing prompts — write target-state stories to answer these

Per [product-planning methodology](../../docs/processes/product-planning.md), stories are forward-looking by design. The unknowns below are not blockers — they are prompts. Write the story of the target experience; the story is how the answer gets defined. Each prompt names what's currently fuzzy and which existing stories it touches.

1. **Personal vs institutional surface.** The [native-rd product vision](../../native-rd/docs/vision/product-vision.md) frames the monorepo as _institutional_ infrastructure and native-rd as _personal_, but rollercoaster.dev's landing page features four personal users (Lina, Eva, Malik, Carmen). Write both a personal-earner story for `rollercoaster.dev` _and_ an institutional-operator story; the pair will reveal whether the product is one, the other, or both. Touches Stories 4 (makerspace), 7 (EdTech), and Iteration B scope.
2. **Badge creation on the web.** Earlier drafts treated the web as view/share/verify only. Write the story of an earner creating a badge on `rollercoaster.dev` end-to-end. If the story feels right, web creation is in Iteration A; if it feels forced, the web is downstream of native-rd. Touches Iteration A scope.
3. **Web identity for a self-issuing earner.** Write the story of a user proving they are the same earner across phone and web without a central account server — passkeys, device pairing, key import, whatever the narrative demands. The story defines the requirements, not the other way around.
4. **OB3 cryptosuite at web launch.** Write the story of a third party verifying a badge issued from `rollercoaster.dev` on day one. The friction (or lack of it) tells you whether to match native-rd's `eddsa-raw-json-iteration-a` and upgrade together in Iteration D, or to ship spec-compliant `eddsa-rdfc-2022` from launch since the web is greenfield.
5. **openbadges-modular-server's role.** Native-rd plans to extract `openbadges-core` _from_ `openbadges-modular-server`. Write parallel stories: one where rollercoaster.dev consumes `openbadges-core` as a library (same as native-rd), and one where it talks to a running `openbadges-modular-server`. The stories will surface which integration mode the product needs — or whether both ship.

---

> The individual stories below are from draft v0.1 and have **not yet been re-homed** into the corrected iteration framework above. Several are currently mis-labeled and at least one (Story 4 — makerspace) may not belong in this file depending on prompt #1 above. They remain for reference until the prompts have been worked through and the stories rewritten.

---

## Iteration A — The web surface exists

The first thing rollercoaster.dev has to earn: a place on the web where a badge can be shown, verified, and designed. No goal tracking (that's native-rd). No accounts (not yet). Just the public face that makes native-rd's private work visible.

---

### Story 1 — _Needs rework_

**Status:** Placeholder — author's gut says this isn't right yet. Previous draft mis-scoped the product as a verifier + public pages rather than a full platform. Leaving the slot open until the story it should tell becomes clear. Do not use previous draft as reference.

---

### Story 2 — Lina chooses exactly what her librarian sees

**Actor:** Lina, 24, autistic — part-time library worker
**Actor class:** Earner (web surface)
**Integration mode:** 1
**Iteration:** A
**Status:** Target state
**Claim validated:** Badges are local-first and user-owned. When Lina shares, she decides — per recipient — which pieces of evidence and which notes are visible. Sharing is a disclosure, not a handing-over.

Lina earned her "Local History Archivist" badge weeks ago. It lives on her devices — her phone, her laptop — not on someone else's server. The badge, the evidence, the reflections, the signing keys: hers, on her hardware. Rollercoaster.dev the service never had the full thing and never will.

The head librarian asks to see it. Lina opens rollercoaster.dev on her laptop, picks the badge, and taps _Share_. The interface asks one question in plain language: _"What does [librarian] get to see?"_ and lays out every piece of evidence with a toggle beside it. The before-and-after photos — yes. Her short reflection about why this mattered — yes. The Slack screenshot from the librarian's own thank-you message — she hides that one; it feels strange to reflect it back. A private note she wrote for herself about a coworker who noticed — hidden, obviously.

She taps _Create share_ and gets a link pointed at the librarian. The link opens a page that renders only the pieces Lina chose. The cryptographic proof verifies against Lina's public key. The hidden pieces aren't greyed-out or redacted — they simply aren't in the disclosure. From the librarian's side there's no way to tell what else exists. The badge itself is still one badge, signed once, owned by Lina; what the librarian sees is a _view_ of it.

A month later, a job posting comes up. Lina wants to share the same badge with a hiring manager — but this time she wants to include the Slack screenshot (it's an implicit reference) and add a longer reflection written specifically for that audience. She creates a second share, with different toggles. One badge, two disclosures, recipient-specific. Neither audience sees the other's view. Either share can be revoked any time; when she revokes the librarian's, the link returns a dignified _"This share is no longer available"_ — no shame, no 404, just: _not for you anymore._

If she ever wants a single link she can put on a portfolio page for anyone to see, that's a third option: a public disclosure she builds deliberately, knowing the whole internet is the audience. All three views are verifiable. All three come from the same badge. None of them move ownership off her devices.

**Features used:** Local-first data + key storage, per-recipient share packages (wrapped presentations), evidence-level toggles (show / hide per piece), recipient-specific framing notes, revocable shares, optional fully-public share mode
**Why this belongs on web:** The librarian is on a laptop. The hiring manager is on a laptop. The share surface — toggles, previews of what each audience sees — is a laptop-ergonomic UI with room to think.
**Anti-requirements this enforces:**

- Data stays on the user's device(s); the service is a relay, not a repository
- Sharing defaults to private; public is a choice made explicitly, per share
- No "share" means "access my data" — every share is a scoped package
- Hidden pieces are not-present in the share package, not redacted-but-visible (a redacted blob tells viewers what they're missing, which is its own disclosure Lina didn't choose to make)
- Revocation tears down the specific share, not the badge
- The same badge supports many shares to many audiences, simultaneously, without copying data or losing ownership

**Architectural commitments (from [selective-disclosure feasibility research](../../../docs/research/selective-disclosure-feasibility-2026-04.md)):**

- Evidence blobs are stored by **content hash**, referenced from the credential — never embedded inline. Blobs live in an access-controlled local/relay store.
- Each share is a **freshly-signed wrapped presentation** containing the credential + Lina's chosen evidence subset + optional recipient-specific note. Shares are not derivations of a single selective-disclosure signature. This is what makes "hidden is genuinely absent" structurally true: the share is constructed from scratch from the chosen subset, so there's nothing for the recipient to enumerate what isn't there.
- Web key management uses **WebAuthn + PRF** (or equivalent) to unlock a locally-stored Ed25519 signing key. Keys never leave Lina's device. Non-PRF authenticators get a deliberate fallback (passphrase-derived key or similar) — no silent failure.
- **Per-share revocation is cryptographic**, not just URL deletion: each share has a bit in a status list Lina publishes. Revoking flips the bit, invalidating cached copies as well.
- Evidence schema is designed so **each item is atomic** — filename and metadata never leak into digests of adjacent items.
- Self-signed credentials carry an **honest trust-model footnote** in the UI: Lina's signature proves authorship of the share, not external validation of the claim. External validation is the job of peer / mentor endorsement (Iteration D).
- **Upgrade path preserved**: if 1EdTech blesses a selective-disclosure cryptosuite (watch `vc-jose-cose` adoption in the OB 3.0 conformance suite), the wrapped-presentation layer can be swapped for SD-JWT VC without changing evidence storage, key management, or the share UI.

---

### Story 3 — Priya verifies a stranger's credential

**Actor:** Priya, 41, hiring manager at a small dev consultancy
**Actor class:** Third-party verifier
**Integration mode:** 1
**Iteration:** A
**Status:** Target state
**Claim validated:** `rollercoaster.dev`'s verifier works on any OB3 credential, not just ones we issued.

Priya is reviewing a candidate who included a badge on their CV — something about open-source contributions, issued by a makerspace in Berlin she's never heard of. The link goes to that makerspace's own site, which is slow and partially broken. She copies the badge JSON and pastes it into `rollercoaster.dev/verify`.

In under a second, she gets back: signature valid, issuer key matches the DID published at their domain, not revoked, evidence links resolve. The page also shows her the claim in plain language — _"Completed: Metal Fabrication Fundamentals, 2026-03-14, 40 hours supervised"_ — and the evidence: three workshop photos and an instructor's endorsement. She didn't have to trust the candidate, the makerspace's site, or her own knowledge of Open Badges. She had to trust the math.

She closes the tab. She never created an account. She never will. `rollercoaster.dev` served her in the 90 seconds she had, and that's the only interaction the site ever needed from her.

**Features used:** Universal OB3 verifier, evidence resolution, plain-language credential rendering
**Why this belongs on web:** Third-party verification is a web-shaped job — it's always "I got a link, I need to check it, I leave." The audience is not the earner and never will be.
**Anti-requirements this enforces:**

- Verifier accepts any OB3 credential, not just ours
- No sign-up wall for verification
- Plain-language rendering is a first-class feature, not a debug view

---

## Iteration B — Orgs can issue, visually

Once the public surface works, the reference implementation earns its second job: a makerspace or workshop organizer can run `openbadges-system` and issue badges to their members without learning the OB3 spec.

---

### Story 4 — The makerspace gives out its first badge

**Actor:** Dani, 38, volunteer tech-lead at a neighborhood makerspace
**Actor class:** Toolkit consumer #2 (makerspace volunteer) + Operator
**Integration mode:** 1
**Iteration:** B
**Status:** Target state
**Claim validated:** A semi-technical volunteer can run `openbadges-system` and issue signed badges to real members in under an afternoon.

Dani runs the Thursday night welding intro. Six people finished last month's cohort. She's been promising them certificates "soon" for three weeks and now she's behind.

She deploys `openbadges-system` to the makerspace's little VPS with one `docker compose up`. The admin interface isn't scary — no "Create Issuer Profile" wall, no 14-field forms. The first-run wizard asks for the makerspace's name, contact email, and whether she wants to generate a signing key now or bring her own. Five minutes later she has an issuer identity, signed locally, key material on the VPS disk and nowhere else.

She creates a badge class called "Welding Intro — Thursday Cohort, March 2026." She types a short description, picks a color from the designer, uploads a photo from class. She pastes the six attendees' email addresses into a textarea, clicks _Issue_. Each person gets an email: _"Dani from [Makerspace] gave you a badge. Here's a link to view and save it."_ The link opens on `rollercoaster.dev`-style public page (self-hosted, or at their own domain if they set one up — both work).

One attendee has `native-rd` installed and their badge lands directly in their mobile backpack. Another forwards the link to their LinkedIn. A third forgets about it for two months and then remembers when they're updating their CV. All three paths work.

**Features used:** One-command deployment, first-run wizard, badge class creation, bulk issuance by email, public badge pages at a self-hostable domain, integration with `native-rd` backpack where installed
**Why this belongs on web:** Dani is not installing a mobile app to issue six badges. She's on a laptop with six email addresses in a spreadsheet.
**Anti-requirements this enforces:**

- First run takes under 15 minutes from zero to signed badge
- No story requires creating an "issuer" as a separate onboarding step — identity and first badge are the same flow
- Email is an acceptable delivery channel; no forced platform install

---

### Story 5 — Dani designs the badge on her laptop

**Actor:** Dani (same as Story 4)
**Actor class:** Operator
**Integration mode:** 1 or 2 (standalone designer)
**Iteration:** B
**Status:** Target state
**Claim validated:** The badge designer feels like a real tool on desktop, not a ported mobile UI.

Before issuing, Dani opens the designer. The canvas is big — her whole laptop screen if she wants — and she can drag the badge around with her mouse in a way that never felt right on her phone. She picks a hard-shadow rectangle, black border, yellow fill. She uploads the makerspace's logo. She types "Welding Intro" with a chunky display font and watches it snap to a grid.

She saves the design to her makerspace's library so next month's cohort gets the same visual. Export options: PNG (with OB3 baked into the image metadata), SVG (for embossing onto t-shirts later), and a JSON design file she can share with the next volunteer running the intro. That JSON also opens in `native-rd`'s designer — the tools are the same format across platforms.

**Features used:** Web badge designer, design library, multi-format export, cross-platform design interop with `native-rd`
**Why this belongs on web:** Visual design is a big-screen job. Mouse precision beats finger dragging on a small canvas. Desktop is where logos already live.
**Anti-requirements this enforces:**

- Design format is the same file native-rd reads — no silo
- Designer works without login (saving to library is the only thing that requires account)

---

## Iteration C — Peer signal, web-shaped

Carmen and Kayla from the existing ecosystem stories, reframed for the web surface.

---

### Story 6 — Carmen endorses Kayla, publicly

**Actor:** Carmen, 40, dyslexic — community gardening coordinator
**Actor class:** Peer / mentor
**Integration mode:** 1 (both on the same rollercoaster.dev instance) or cross-instance (both on their own deployments)
**Iteration:** C
**Status:** Target state — requires native-rd peer flow + web endorsement surface
**Claim validated:** Peer verification produces a publicly verifiable signal that strengthens the badge without moving ownership away from the earner.

Kayla, 16, has been keeping her "First Garden Bed" badge on her phone for months. She wants to put it on the youth-employment portfolio the community center is building — a plain webpage with her photo, her interests, and a few badges. She copies the `rollercoaster.dev/b/<id>` link from `native-rd` and pastes it into her portfolio.

Carmen sees the portfolio at the community center's sharing night. She taps the badge, reviews Kayla's evidence — the bed photos, the short note about what she learned — and adds her endorsement from her phone. The endorsement posts to the same public page: below Kayla's self-signature, a second signature block appears, signed by Carmen, whose own "Mentor: Raised Bed Gardening" badge is linked and verifiable.

Anyone viewing the portfolio now sees two signatures, both verifiable, both from real people with their own badges. The trust chain is visible without being gamified. Kayla owns the badge. Carmen's name is attached because she chose to put it there.

**Features used:** Cross-signature on a public badge page, endorsement UI, verifiable endorser identity via their own badge
**Why this belongs on web:** The portfolio is a webpage. The endorsement has to live where the audience (a future employer, a grant reviewer) will see it.
**Anti-requirements this enforces:**

- Endorsement is additive, never authoritative — can't override the earner's self-signature
- Endorser's credential (their own badge) is verifiable from the endorsed badge's page
- No endorsement without the earner's explicit accept

---

### Story 7 — A teacher-training platform issues PD credentials at scale

**Actor:** Marta, 34, lead engineer at a European EdTech platform for teachers
**Actor class:** Toolkit consumer #3 (institutional platform team)
**Integration mode:** 2 (embed `openbadges-ui` components) + 3 (headless — call `openbadges-modular-server` from their backend)
**Iteration:** B
**Status:** Target state
**Claim validated:** An existing platform with its own identity system and UI can adopt parts of the toolkit to issue spec-compliant OB 3.0 credentials without rewriting their product.

Marta's platform runs certified professional-development courses for teachers across Germany — hundreds of thousands of accounts, strict GDPR constraints, a long-running Rails-and-React stack she isn't about to refactor. When a teacher completes a course, she wants them to receive a real OB 3.0 credential they can put on their own school's LMS, their CV, or carry into any backpack that speaks the spec.

She is not going to deploy `openbadges-system` as a second app. Her platform already has auth, already has a user database, already has a UI language. She needs **pieces**, not a platform.

She reads the toolkit docs for an afternoon and ends up using three parts: `openbadges-types` for TypeScript safety, `openbadges-core` for signing and PNG baking in a small Node service, and `openbadges-ui`'s Vue components wrapped inside a thin React adapter on the course-completion page (the components render the badge and its verification state; her team owns everything around them). The `openbadges-modular-server` she passes on — her platform already has a database, she just wants the library functions, not a second service.

Issuing flow: a teacher completes "Media Literacy 101." Her backend calls `openbadges-core.issue()` with the teacher's identity (their platform-internal DID, generated from the existing user ID), the badge class her team defined, and a link to the completion evidence (course transcript, reflection). A signed OB 3.0 credential lands in the teacher's account page, rendered by the embedded components. A _Download_ button gives them the PNG with the credential baked in. A _Copy verification URL_ gives them a public link — pointed at `rollercoaster.dev/verify` or at their own self-hosted verifier, her choice.

GDPR holds because the toolkit doesn't phone home. No external server sees the teacher's identity, no telemetry, no hosted dependency. The teacher's credentials live on her platform; the signatures are cryptographic, the verification is offline-capable, and if the teacher wants to move their credentials to a personal backpack later, the OB 3.0 format means they can.

Six weeks from "we should do badges" to first-teacher-issued-in-production. Not because the toolkit is magic, but because she picked the three pieces that fit, ignored the rest, and her own stack stayed intact.

**Features used:** `openbadges-types`, `openbadges-core` as a library (signing, baking, verification), `openbadges-ui` components embeddable in a non-Vue host, stable public API contracts, no phone-home / no hosted dependency
**Why this belongs on web:** Teacher-facing credentials need to be on the platform the teacher already uses. The integration can't require the platform to host a second service or UI.
**Anti-requirements this enforces:**

- Toolkit packages are independently useful — you can adopt one without adopting all
- `openbadges-ui` components do not assume the host app uses Vue (the component layer is framework-agnostic at the public contract, even if the implementation is Vue)
- No telemetry, no phone-home, no external-service requirement for core issuance or verification
- Public API contracts stay stable — breaking changes cost the toolkit's trust with platforms

---

## What these seven stories cover

| Story                                   | Actor class           | Integration mode | Iteration | Key surface                        |
| --------------------------------------- | --------------------- | ---------------- | --------- | ---------------------------------- |
| 1. _needs rework_                       | —                     | —                | A         | Placeholder                        |
| 2. Lina chooses what the librarian sees | Earner                | 1                | A         | Selective disclosure + local-first |
| 3. Priya verifies a stranger            | Verifier              | 1                | A         | Universal OB3 verifier             |
| 4. Makerspace first badge               | Operator              | 1                | B         | One-command deploy + issuance      |
| 5. Dani designs on laptop               | Operator              | 1 / 2            | B         | Web badge designer                 |
| 6. Carmen endorses Kayla                | Peer / mentor         | 1 or cross       | C         | Public endorsement                 |
| 7. EdTech platform integrates           | Institutional builder | 2 + 3            | B         | Toolkit-as-library, embedded       |

**Gaps I know about but did not fill this pass:**

- No toolkit-consumer-as-indie-dev story yet — write one. The indie dev who adds badges to their SaaS in an afternoon is a target-state story that defines what the toolkit's DX has to feel like. Writing it will surface anti-requirements for `openbadges-core`, `openbadges-types`, and `openbadges-ui`.
- No CLI story yet — write one. The geeky dev using the CLI from the terminal, and the AI agent scripting credential issuance in CI, are target-state stories that define what the CLI has to be. The CLI doesn't exist yet; that's the point — the story is how we define what it should be.
- No Badgr-migration story yet — optional. The window is mostly closed but one story could capture the disposition toward importing credentials from defunct platforms.
- No story about earner creating a badge on the web directly — write one once Open Question #2 is resolved. Whichever way it resolves, a story captures the intended experience.

---

## Change log

- **2026-04-23** — Draft v0.1. Six stories covering Iteration A (web surface), B (org issuance + designer), C (peer endorsement). Focused on what the web does that native-rd doesn't.
- **2026-04-23** — Added Story 7: institutional platform team integrates the toolkit as a library (Modes 2+3). Anonymized from a real European EdTech platform at ~200k-teacher scale. Fills the LMS-embed gap.
- **2026-04-23** — Story 1 flagged as needs-rework after author feedback ("not clear, not a full reference deployment, nothing of value"). Placeholder left in slot. Story 2 rewritten to center local-first + user-owned data and per-recipient selective disclosure (hide/show individual evidence per viewer).
- **2026-04-23 (v0.2)** — Restructured framework after deeper read of native-rd vision docs, ADR-0001, learning-graph.md, and design-principles.md. Added Iteration A–D scope definitions aligned to ADR-0001. Added Task View as cross-iteration primary pattern. Added inherited design principles section. Added Open Questions section capturing personal-vs-institutional tension and four other unresolved decisions that block story rewrites. Individual stories (2–7) NOT yet re-homed into the corrected framework — flagged explicitly in the doc.
- **2026-04-23 (v0.2.1)** — Corrected gap-list reasoning after author feedback: stories for not-yet-built tools (CLI, AI-agent integration) are not "fiction" — writing them is how the project decides what to build. Gap entries now frame those as stories-to-write, not stories-to-defer. Methodology captured formally in `apps/docs/processes/product-planning.md` and referenced from root `AGENTS.md`.
- **2026-04-23 (v0.2.2)** — Story 2 anti-requirements extended with architectural commitments from the selective-disclosure feasibility research (`apps/docs/research/selective-disclosure-feasibility-2026-04.md`): content-hash evidence storage, wrapped-presentation shares (not SD-signature derivations), WebAuthn+PRF key management with deliberate fallback, cryptographic per-share revocation via status list, atomic evidence schema, honest self-signed trust-model footnote, SD-JWT-VC upgrade path preserved. Narrative unchanged.
