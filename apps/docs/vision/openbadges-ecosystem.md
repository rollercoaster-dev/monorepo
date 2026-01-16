# OpenBadges Ecosystem Vision

**Status:** Draft
**Owner:** Joe
**Last Updated:** 2025-01-16

---

## The Problem

There are plenty of tools for organizations to issue badges _to_ people. Formal credentials, institutional recognition, top-down credentialing.

There's nothing for people who want to track their own successes and learning.

Current approaches are formalized and serious. We want to make personal achievements - "I gave my first public talk", "I finished a project I actually started", "I organized a neighborhood cleanup" - easy to create, fun to display, and simple to verify.

---

## Why Open Badges 3.0?

A simple goal app says: "I did this" ✓

Open Badges 3.0 says: "I did this, here's the proof, and anyone can verify it."

| Goal App            | Open Badges 3.0                              |
| ------------------- | -------------------------------------------- |
| Locked in one app   | **Portable** - export and take anywhere      |
| Self-reported claim | **Verifiable** - cryptographic proof         |
| Only you see it     | **Shareable** - recognized across platforms  |
| App owns your data  | **You own it** - your credentials, your keys |
| "Trust me"          | **Evidence attached** - show your work       |

### The OB3 Difference

**Portability:** Your badges aren't trapped. Export them, move platforms, keep your achievements forever.

**Verifiability:** Built on W3C Verifiable Credentials. Anyone can check if a badge is real without calling the issuer.

**Ownership:** With Decentralized Identifiers (DIDs), you cryptographically own your credentials. No platform can take them away.

**Interoperability:** OB3 is an open standard. Badges work across any compliant system - schools, employers, communities.

**Evidence:** Attach proof to your claims. Screenshots, links, files - not just a checkbox.

### Why Not Just Use Notion/Todoist/etc?

Those are great for personal tracking. But when you want to:

- Share an achievement that others can trust
- Build a portable record that follows you
- Get recognition that means something outside one app

That's when you need a credential, not a checklist.

---

## Who This Is For

### Individuals

People tracking their own wins:

- Personal milestones ("30 days of consistent exercise")
- Learning achievements ("Shipped my first open source contribution")
- Executive function wins ("Maintained a morning routine for a month")
- Community contributions ("Mentored someone through their first project")

Achievements that matter but institutions never recognize.

### Small Organizations

Community groups, clubs, small schools, local nonprofits who want to:

- Run their own badge server
- Stay totally local (no cloud dependency)
- Connect to federation later if they choose
- Never be locked into someone else's infrastructure

---

## Our Approach

### Self-Signed Badges Are First-Class (ADR-0001)

You don't need an institution to recognize your achievement. Create your own badge, add your evidence.

**Verification layers (in order of implementation):**

1. **Self-signed** (NOW) - You vouch for yourself. Evidence attached. Cryptographically yours.
2. **Peer verified** (LATER) - Someone you know confirms it. Requires platform for peer connections.
3. **Mentor verified** (LATER) - A trusted guide validates your achievement. Requires platform.
4. **AI verified** (FUTURE) - Automated evidence review. Nice to have, not core.

### Neurodivergent-First UI

Not "accessible as an afterthought" - built for neurodivergent users from the start.

**openbadges-ui includes:**

- Themes: dark, high-contrast, large-text, dyslexia-friendly, autism-friendly
- Content density: compact, normal, spacious
- Focus mode for ADHD
- Animation control: none, minimal, full
- Reading modes: bionic reading, ruler, paragraph-focus
- Text simplification (3 levels)
- Number formatting for dyscalculia

The wins that traditional systems never recognize - "maintained a routine for a month", "finished a project I started" - deserve celebration.

### Easy Over Complex

Badge creation should feel like posting to social media, not filling out a grant application.

### Local-First, Federation-Ready

Start simple. Run everything on your laptop. Connect to others when you're ready - not before.

---

## The Stack

```
┌─────────────────────────────────────────────────────┐
│                  openbadges-system                  │
│           (Full app - uses everything)              │
└──────────────┬─────────────────────┬────────────────┘
               │                     │
               ▼                     ▼
┌──────────────────────┐   ┌─────────────────────────┐
│    openbadges-ui     │   │ openbadges-modular-     │
│  (Vue components)    │   │ server (API)            │
└──────────┬───────────┘   └───────────┬─────────────┘
           │                           │
           └───────────┬───────────────┘
                       ▼
          ┌────────────────────────┐
          │    openbadges-types    │
          │   (TypeScript types)   │
          └────────────────────────┘
```

---

### openbadges-types

TypeScript definitions for Open Badges 2.0 and 3.0 specifications.

**Philosophy:** Spec compliance so you don't have to read the spec. The boring but necessary foundation.

**Published:** npm `openbadges-types`

---

### openbadges-ui

Vue 3 component library for displaying and interacting with badges.

**Philosophy (from DESIGN_PHILOSOPHY.md):**

1. **Neurodiversity-First Design** - Accessibility is the bedrock, not an afterthought
2. **Joyful & Empowering Interaction** - Minimize friction and anxiety
3. **Deep Customization as Necessity** - Choice is a fundamental accessibility feature
4. **Adaptive Aesthetics** - Interface adapts to user's context, mood, or needs

**Components:**

- Badge display: `BadgeDisplay`, `BadgeList`, `BadgeClassCard`, `BadgeClassList`
- Verification: `BadgeVerification`, `ProfileViewer`
- Issuing: `IssuerCard`, `IssuerList`, `BadgeIssuerForm`, `IssuerDashboard`
- Accessibility: `AccessibilitySettings`, `ThemeSelector`, `FontSelector`

**Accessibility Features:**

- Themes: default, dark, high-contrast, large-text, dyslexia-friendly, autism-friendly
- Content density: compact, normal, spacious
- Focus mode (ADHD support)
- Animation control: none, minimal, full
- Reading modes: bionic, ruler, paragraph-focus
- Text simplification (3 levels)
- Number formatting for dyscalculia
- Accessibility audit service

**For individuals:** Beautiful, comfortable badge displays in the main app.
**For partners:** Drop components into existing Vue frontends with full theming support.

**Published:** npm `openbadges-ui`
**Live docs:** https://rollercoaster-dev.github.io/openbadges-ui/

---

### openbadges-modular-server

OB 2.0 and 3.0 compliant badge API server.

**Philosophy:** Easy to deploy, works with SQLite (no database server needed), scales to PostgreSQL. Federation-ready architecture without requiring federation.

**Includes:**

- Full OB2/OB3 CRUD API for issuers, badge classes, and assertions
- **Badge Generator (Baking)** - Embed credentials into PNG/SVG images
- Verification endpoints - Check if badges are authentic, detect tampering
- Cryptographic signing with Ed25519 keys
- OpenAPI documentation at `/docs`

**For small orgs:** Their own badge backend. Docker, one command, done.
**For partners:** API they can integrate into their existing systems.

**Published:** Docker image `ghcr.io/rollercoaster-dev/openbadges-modular-server`

---

### openbadges-system

Full-stack badge application. Vue 3 frontend + Bun/Hono backend.

**Philosophy:** The place where you celebrate your wins. Reference implementation showing how the pieces fit together.

**Includes:**

- Badge Generator - Create custom badge images with templates, icons, and styling
- Badge management - Create, issue, and track badges
- Backpack - View and share your earned badges
- Verification - Check if badges are authentic

**For individuals:** Where they create, view, and share badges.
**For small orgs:** Deploy as their complete badge platform.

---

## Current Focus

1. **Get openbadges-system working** - A usable app for creating and viewing badges
2. **Simplify the UI** - Less complexity, more joy
3. **Self-signed badge flow** - Create, evidence, verify without needing an institution
4. **Partner adoption** - Make it easy to plug components into existing systems

---

## Future Direction

These are goals, not current work:

- **Local-first sync** (ADR-0002) - Sync badges across your devices
- **Federation** (ADR-0003) - Connect badge servers into a network
- **AI verification** - Automated evidence review
- **Peer verification** - Community-based trust

The architecture supports these. We'll build them when the foundation is solid.

---

## Related Documents

- [ADR-0001: Self-Signed Badges](../decisions/ADR-0001-self-signed-badges.md)
- [ADR-0002: Local-First Optional Sync](../decisions/ADR-0002-local-first-optional-sync.md)
- [ADR-0003: Federation Core Architecture](../decisions/ADR-0003-federation-core-architecture.md)
- [User Stories](../product/user-stories.md)
