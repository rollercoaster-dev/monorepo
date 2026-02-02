# User Stories: rollercoaster.dev (native)

**Date:** 2026-02-02
**Status:** Draft
**Owner:** Joe

**Purpose:** Real user scenarios that drive product decisions for the native app. Adapted from the [monorepo user stories](https://github.com/rollercoaster-dev/monorepo/blob/main/apps/docs/product/user-stories.md) and expanded with native-specific stories.

---

## Iteration A — Quiet Victory

The core loop: create a goal, break it into steps, attach evidence, complete steps, earn a self-signed badge.

---

### Lina's Quiet Victory

**User:** Lina, 24, autistic — Part-time library worker

Lina finished reorganizing the Local History section — months of quiet work nobody asked her to do. On the bus home, she opens the app, taps "New Goal," types "Reorganize Local History section," and marks it complete.

She takes a photo of the neatly organized shelves from her camera roll — a before and after she'd been keeping for herself. She adds a screenshot of the thank-you Slack message from the head librarian. And a short note: "This matters to the community even if it wasn't in my job description."

The app creates a self-signed "Local History Archivist" badge with all three pieces of evidence attached. It lives on her phone. She didn't need wifi, an account, or anyone's approval.

**Features used:** Create goal, attach evidence (photos, screenshots, text), complete goal, earn self-signed badge
**Evidence:** Before/after photos, screenshot of thank-you message, written reflection
**ND pattern:** Private recognition without external validation, works offline, no social pressure

---

### Malik's First Scene

**User:** Malik, 31, ADHD — Freelance 3D modeller

Malik's been teaching himself Blender at night. He creates a goal: "Complete first fully-textured 3D scene." He breaks it into steps: basic modelling, UV unwrapping, texturing, lighting, final render.

It takes weeks. Some nights he's on fire, some weeks the app sits untouched. The steps are still there when he comes back — no streak broken, no guilt notification, just "here's where you left off."

When he renders the final cyberpunk coffee cart, he uploads the render, a timelapse screen recording of his Blender work, and a written reflection on what he learned. He marks the goal complete and earns his "3D Modelling: First Complete Scene" badge.

He looks at the five steps — each one checked, each with its own evidence. It's not just a badge, it's the whole path he took to get there.

**Features used:** Create goal, break into steps, attach evidence per step, complete over time, earn self-signed badge
**Evidence:** Final render (image), timelapse (video), written reflection (text)
**ND pattern:** No streak pressure, no guilt for gaps, progress persists across breaks

---

### Tomás Breaks It Down

**User:** Tomás, 22, ADHD + dyslexic — Apprentice electrician

Tomás is working toward his journeyman certification but the whole thing feels overwhelming. He opens the app and creates a goal: "Get journeyman electrician cert." Then he stares at it. Too big.

He taps into the goal and starts breaking it down: "Finish residential wiring module," "Pass NEC code quiz," "Log 2000 supervised hours," "Build practice panel." Each step is its own small win.

He starts with the practice panel. Over a weekend he wires it up, takes a photo of the finished panel, and a short voice memo walking through what each circuit does. He marks the step complete.

One step done. The goal is 1/4. He doesn't think about the other three right now.

Three months later, he's completed two more steps. The app doesn't remind him how long the last one took. It just shows: 3/4, here's what's next.

**Features used:** Create goal, break into steps, attach evidence (photo, voice memo), step-by-step progress
**Evidence:** Photos of work, voice memo walkthrough
**ND pattern:** Breaking overwhelming goals into manageable pieces, no time pressure, no shame for gaps

---

## Iteration B — Learning Journey

Add the learning graph: track interrupts and context switches, reorganize goals, see paused work persist through life's chaos.

---

### Eva's Big Map

**User:** Eva, 35, bipolar I — Former architect, community gardening advocate

In a manic surge, Eva opens the app and creates a massive goal: "City Farm Blueprint." She breaks it into dozens of steps across multiple sub-goals — site surveys, greenhouse design, soil workshops, rooftop gardens, hydroponics, compost networks. She's adding steps faster than she could ever complete them.

Then the crash hits. The app sits unopened for months.

When she comes back, nothing is lost. Every goal, every step, every note is still there. She scrolls through and feels the weight of all those unfinished branches. But she notices something — the five compost-related steps are all complete. She'd finished those during the high and forgotten.

She creates a new, smaller goal: "Neighborhood Compost Program," moves the completed steps under it, adds a few more, and starts from a place of strength instead of failure.

The big City Farm goal stays in the background. Maybe she'll come back to it. Maybe not. It's not judging her.

**Features used:** Multiple goals, reorganize steps between goals, learning graph (paused goals persist), no expiration or archiving pressure
**Evidence:** Planning docs (photos of sketches), workshop attendance photos, soil test results
**ND pattern:** Work survives mental health cycles, scope adjustment without shame, finding what's complete inside what feels unfinished

---

## Iteration C — Skill Tree

Add the visual layer: badges become nodes in a tree you design, showing where you've been and where you could go.

---

### Kai's Scattered Badges

**User:** Kai, 19, autistic + ADHD — Self-taught programmer, between jobs

Kai has been earning badges for months — small ones. "Learned Git basics." "Built a CLI tool in Python." "Completed freeCodeCamp HTML module." "Fixed a bug in an open source project." They're scattered across different goals, different months. It doesn't feel like much.

Then Kai opens the skill tree view for the first time. The badges arrange themselves by the goals they're linked to — a programming cluster, a tools cluster, a community cluster. Kai starts dragging nodes around, connecting them. Git feeds into the open source contribution. HTML leads to JavaScript. It's like arranging cards on a table.

Kai adds a few empty nodes manually — "Learn TypeScript," "Build a full-stack app" — and draws lines from the existing badges to these future goals. The earned badges are solid. The in-progress goals glow. The planned ones are ghosts.

The tree is messy and personal. It doesn't look like a curriculum — it looks like Kai's brain. And for the first time, the scattered work tells a story.

**Features used:** Skill tree visualization, manual node placement, user-drawn connections, visual states (earned/in-progress/planned)
**Evidence:** (accumulated from previous badges)
**ND pattern:** Making invisible progress visible, turning scattered work into a coherent narrative, spatial organization matches how some ND brains think

---

## Iteration D — Community

Peer verification, badge sharing, mentorship — the personal tool connects to other people.

---

### Carmen Passes It On

**User:** Carmen, 40, dyslexic — Community gardening coordinator

Carmen has been using the app for a season. She's got a "Raised Bed Gardening" goal with a dozen completed steps — soil prep, planting schedules, pest management — each with photos of her garden as evidence.

She marks the goal complete and earns her badge. It's self-signed, and that's enough for her.

Then Kayla, a 16-year-old she's been mentoring, downloads the app and starts her own "First Garden Bed" goal. When Kayla finishes and earns her badge, she shares it with Carmen through the app. Carmen looks at the evidence — photos of the bed, a note about what Kayla learned — and taps "Verify." Her name and her own gardening badge are now attached to Kayla's badge as peer verification.

Neither of them needed an institution, a server, or an internet connection to do this. Carmen's phone talked to Kayla's phone directly. The verification is cryptographically signed — it means something beyond the app.

**Features used:** Badge sharing between devices, peer verification, verification chain (Carmen's badge gives weight to her verification of Kayla's)
**Evidence:** Garden photos, written reflection
**ND pattern:** Mentorship as a natural extension of personal tracking, low-friction verification (one tap, not a form)

---

## Evidence Types

Evidence is what makes a badge more than a checkbox. Every badge should have at least one piece of evidence attached.

| Type | Examples | Iteration |
|------|----------|-----------|
| **Photo** | Before/after shots, finished work, event attendance | A |
| **Screenshot** | Messages, certificates, completion screens | A |
| **Text** | Written reflections, notes, descriptions | A |
| **Voice memo** | Audio walkthrough, verbal reflection | A |
| **Video** | Timelapse, screen recording, demo | A |
| **Link** | External URLs (portfolio, repo, article) | A |
| **File** | PDFs, documents, exports | A |

---

## Features by Iteration

| Feature | A | B | C | D |
|---------|---|---|---|---|
| Create goals | x | | | |
| Break into steps | x | | | |
| Attach evidence | x | | | |
| Complete steps/goals | x | | | |
| Earn self-signed badge | x | | | |
| Multiple concurrent goals | | x | | |
| Reorganize steps between goals | | x | | |
| Pause/resume goals | | x | | |
| Learning stack (interrupts) | | x | | |
| Factual nudges (drift detection) | | x | | |
| Skill tree visualization | | | x | |
| Manual node placement | | | x | |
| User-drawn connections | | | x | |
| Visual states (earned/active/planned) | | | x | |
| Badge sharing (device-to-device) | | | | x |
| Peer verification | | | | x |
| Mentor verification | | | | x |

---

## Design Principles Confirmed by Stories

1. **Evidence is non-negotiable** — every story includes concrete proof of work
2. **No time pressure** — Malik's weeks of gaps, Eva's months of silence, Tomás's three-month stretch
3. **No judgment** — the app shows state, not score
4. **Scope is fluid** — Eva's big goal becomes a small goal, and that's a win
5. **The phone is the context** — Lina on the bus, Tomás on the weekend, Carmen with Kayla in the garden
6. **Local-first is freedom** — Carmen and Kayla verify without internet
7. **The tree is yours** — Kai builds it by hand, it looks like their brain

---

_Draft created 2026-02-02. Adapted from monorepo user stories with native-specific scenarios._
