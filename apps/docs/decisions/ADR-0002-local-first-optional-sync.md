# ADR-0002: Local-First as Default with Optional Encrypted Sync

**Date:** 2025-08-13  
**Status:** Accepted  
**Owner:** Joe

## Context

Traditional cloud-first applications store user data on remote servers, creating dependencies on service availability, privacy concerns, and vendor lock-in risks. The [local-first principles](https://www.inkandswitch.com/essay/local-first/) from Ink & Switch research demonstrate that applications can provide better user experience, data ownership, and longevity by treating local storage as primary.

For Rollercoaster.dev's OpenBadges system, users create deeply personal credential data representing their skills, achievements, and professional identity. This data has high emotional and practical value, making data ownership and control critical user needs.

Key constraints and considerations:

- Users need access to badges across multiple devices (phone, laptop, tablet)
- Badge data must survive device loss, hardware failure, or software changes
- Privacy is paramount — badge data may contain sensitive personal information
- Users should never lose access to their credentials due to service outages
- Compliance with data protection regulations (GDPR, CCPA) requires user control
- Neurodivergent users particularly value predictable, reliable access to their tools

Prior art includes:

- **Obsidian**: Local markdown files with optional encrypted sync
- **Logseq**: Local-first knowledge management with sync options
- **Automerge/Ink & Switch**: CRDT-based local-first collaboration
- **Apple Notes**: Local storage with iCloud sync as enhancement
- **Git**: Distributed version control with optional remote repositories

## Decision

Rollercoaster.dev will implement a **local-first architecture with optional encrypted sync** as the default approach for badge data storage and management.

**Core Implementation:**

- **Primary storage**: Local device storage (browser IndexedDB, mobile SQLite, desktop files)
- **Sync as enhancement**: Optional encrypted cloud sync for multi-device access
- **Export-first**: Always-available data export in standard formats (JSON, PDF)
- **Offline-capable**: Full functionality without network connectivity
- **User-controlled**: Users choose if/when/where to sync their data

**Technical Architecture:**

- Local badge database using Drizzle ORM with SQLite/IndexedDB
- Optional encrypted sync service using end-to-end encryption
- Conflict resolution using CRDTs or last-writer-wins with user choice
- Standard export formats: Open Badges 3.0 JSON, PDF certificates, CSV summaries
- Import capabilities from other badge systems and formats

## Consequences

**Positive:**

- **Data ownership**: Users retain full control over their badge data
- **Privacy by design**: No server-side access to unencrypted badge content
- **Reliability**: Badge access never depends on server availability
- **Performance**: Instant badge loading and searching from local storage
- **Longevity**: Badges survive service shutdowns or business changes
- **Compliance**: Easier GDPR/CCPA compliance with user-controlled data
- **Offline capability**: Full functionality in low/no connectivity situations
- **Reduced costs**: Lower server infrastructure and storage costs

**Negative / Risks:**

- **Backup responsibility**: Users must understand backup importance
- **Multi-device complexity**: Sync conflicts require user resolution
- **Initial setup friction**: Users must configure sync if desired
- **Support complexity**: Harder to debug user-specific data issues
- **Feature limitations**: Some collaborative features require sync setup
- **Storage limits**: Local device storage constraints on mobile devices
- **Migration challenges**: Moving between devices requires export/import

**Risk Mitigations:**

- **Backup education**: Clear onboarding about backup importance
- **Export automation**: Regular automated exports to user-chosen locations
- **Sync UX**: Simple, one-click sync setup with clear privacy explanations
- **Recovery tools**: Badge recovery from various export formats
- **Storage monitoring**: Alerts when approaching device storage limits
- **Migration guides**: Step-by-step device migration documentation

## Alternatives Considered

**Option A: Cloud-first (Firebase/Supabase model)**

- _Pros_: Simple multi-device sync, easier support, familiar developer experience
- _Cons_: Vendor lock-in, privacy concerns, service dependency, data ownership issues
- _Rejected_: Conflicts with user ownership and privacy principles

**Option B: Hybrid with required sync**

- _Pros_: Guaranteed multi-device access, simpler user mental model
- _Cons_: Forces cloud dependency, privacy compromises, service lock-in
- _Rejected_: Violates local-first principles and user choice

**Option C: Peer-to-peer sync only**

- _Pros_: No central servers, maximum privacy, true decentralization
- _Cons_: Complex NAT traversal, unreliable connections, difficult setup
- _Deferred_: Consider for future federation features

**Option D: Self-hosted sync required**

- _Pros_: User control over sync infrastructure, privacy maintained
- _Cons_: High technical barrier, excludes non-technical users
- _Rejected_: Too complex for primary user base

## Implementation Plan

**Phase 1 (Weeks 1-4): Local-First Foundation**

- Implement local badge storage with Drizzle ORM
- Build export functionality (JSON, PDF formats)
- Create import from Open Badges 2.0/3.0 formats
- Add backup reminder system

**Phase 2 (Weeks 5-8): Optional Sync**

- Design end-to-end encrypted sync protocol
- Implement sync service with user-controlled encryption keys
- Build conflict resolution UI for sync conflicts
- Add sync status indicators and controls

**Phase 3 (Weeks 9-12): Polish & Recovery**

- Create device migration tools and documentation
- Implement automated backup suggestions
- Build badge recovery from various export formats
- Add storage usage monitoring and cleanup tools

## Links

**Specifications:**

- [Local-first software principles](https://www.inkandswitch.com/essay/local-first/) — Ink & Switch research
- [Open Badges 3.0 Specification](https://www.imsglobal.org/spec/ob/v3p0/) — data format standards
- [W3C Verifiable Credentials](https://www.w3.org/TR/vc-data-model-2.0/) — credential format

**Related ADRs:**

- [ADR-0001: Self-Signed Badges](ADR-0001-self-signed-badges.md) — core badge approach
- [ADR-0003: Federation Core Architecture](ADR-0003-federation-core-architecture.md) — multi-node sync

**Architecture:**

- [Architecture Overview](../architecture/overview.md) — system design context
- [Vision: Now/Next/Later](../vision/now-next-later.md) — strategic alignment

**Related Issues:** (link once created)  
**Related PRs:** (link once created)
