# Project Vision

**rollercoaster.dev** - Open Badges credentialing with self-signed badges, local-first architecture, and neurodivergent-first UX.

---

## Why This Exists

The Open Badges ecosystem has a centralization problem. Most implementations require:

- Centralized issuer servers
- Third-party verification dependencies
- Complex infrastructure to issue simple credentials

We're building an alternative: **credentials you can issue yourself, verify offline, and own completely**.

---

## Core Principles

### 1. Self-Signed First

Individuals and small organizations should issue credentials without infrastructure dependencies. A teacher should be able to issue a badge to a student without running a server.

**What this means in practice:**

- Cryptographic signing that works locally
- Badges that verify without network calls
- Export formats that carry their own verification

### 2. Local-First

Data belongs to users. Cloud sync is optional, not required.

**What this means in practice:**

- SQLite for development and single-user deployments
- PostgreSQL for multi-user/production
- No cloud dependency in the critical path

### 3. Neurodivergent-First UX

Design for focus, not distraction. Build for users who need clarity.

**What this means in practice:**

- Clear visual hierarchy with reduced cognitive load
- Consistent patterns across all interfaces
- Structured logging with icons and colors (rd-logger)
- ARIA labels and accessibility by default

### 4. Standards Compliance

Open Badges 3.0 and W3C Verifiable Credentials. Not proprietary extensions.

**What this means in practice:**

- Full OB3 spec compliance as baseline
- Interoperability with other OB implementations
- Conformance suite validation

---

## Current State (January 2026)

### What Works

- **OB2 Implementation**: Full Open Badges 2.0 server (openbadges-modular-server)
- **Type System**: Comprehensive TypeScript types for OB2/OB3 (openbadges-types)
- **Component Library**: Vue 3 components for badge display (openbadges-ui)
- **Full-Stack App**: Vue 3 + Hono application (openbadges-system)
- **Logging**: Published neurodivergent-friendly logger (rd-logger)
- **Claude Integration**: Knowledge graph and workflow tooling (claude-knowledge)

### What's In Progress

- **OB3 Migration**: Types exist, server/UI/system need updates
- **Badge Baking**: PNG/SVG embedding pipeline
- **Verification**: Proof and issuer verification services
- **Claude Tooling**: Session continuity, workflow automation

### What's Missing

- **Self-Signed Badges**: Core differentiator not yet implemented
- **Backpack**: User-facing badge collection interface
- **Badge Generator**: Simple tool to create and issue badges
- **Offline Verification**: Verify without network

---

## Target State

### Near Term (OB3 Foundation)

Complete the Open Badges 3.0 migration:

1. Server compliance with OB3 spec
2. UI components handling OB3 data structures
3. System app creating/displaying OB3 credentials

### Medium Term (Core Features)

Build the differentiating features:

1. **Badge Generator**: Simple web tool to create badges
2. **Self-Signed Issuance**: Issue badges without server
3. **Baking Pipeline**: Embed credentials in images
4. **Verification Pipeline**: Validate badges locally and remotely

### Long Term (Product)

Make it useful for real users:

1. **Backpack Application**: Personal badge collection
2. **Badge Sharing**: Export and share with verification
3. **Organization Tools**: Team badge management
4. **Conformance Certification**: Official OB3 compliance

---

## Decision Principles

When making technical decisions, use these priorities:

### Priority 1: Does it work offline?

If a feature requires network access, question whether that's necessary.

### Priority 2: Does it reduce complexity?

More code = more bugs. Choose simpler solutions.

### Priority 3: Does it follow the spec?

Don't invent proprietary extensions. Stick to OB3.

### Priority 4: Does it improve UX for neurodivergent users?

Clear > clever. Consistent > flexible. Explicit > implicit.

### Priority 5: Does it support self-issuance?

Features should work for individuals, not just organizations.

---

## What We're Not Building

- **Badge Marketplace**: We're not monetizing badges
- **Social Network**: We're not building another feed
- **Centralized Platform**: We're not hosting everyone's badges
- **AI Badge Generation**: We're not auto-generating credentials

We're building infrastructure and tools. Users own their data and can run their own systems if they choose.

---

## Success Metrics

We'll know we're succeeding when:

1. **A teacher can issue a badge** without reading documentation
2. **A student can verify a badge** without creating an account
3. **A developer can extend the system** with clear APIs
4. **An organization can deploy** without cloud dependencies
5. **The OB conformance suite passes** with full compliance

---

## How to Contribute

1. **Check the roadmap** - Know what's prioritized
2. **Read the package CLAUDE.md** - Understand context
3. **Follow the patterns** - Consistency over cleverness
4. **Test your changes** - No untested features
5. **Document decisions** - Write ADRs for non-obvious choices

The goal is a codebase where any contributor can understand any part.
