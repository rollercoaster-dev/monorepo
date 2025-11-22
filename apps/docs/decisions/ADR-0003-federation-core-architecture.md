# ADR-0003: Federation as Core Architectural Goal

**Date:** 2025-08-13  
**Status:** Proposed  
**Owner:** Joe

---

## Context

The Open Badges ecosystem currently suffers from fragmentation, with isolated badge systems that cannot interoperate. Users accumulate badges across multiple platforms (LinkedIn Learning, Coursera, university systems, employer platforms) but cannot aggregate them into a unified, portable credential portfolio.

While much of the discussion around federation focuses on formal education, Rollercoaster.dev aims to **empower alternative skill and learning communities** — makerspaces, youth centers, church groups, grassroots clubs, small businesses, and employers — to issue, verify, and endorse badges on their own terms.

These organizations often:
- Operate without dedicated IT staff
- Offer high-value but informal skill-building opportunities
- Want to recognize achievements that fall outside traditional education frameworks
- Value portability and local control over user data

Open Badges 3.0 with Verifiable Credentials (VC) and Decentralized Identifiers (DIDs) provides the technical foundation for federation, but the ecosystem lacks practical, low-barrier implementations demonstrating multi-node interoperability for **non-traditional issuers**.

**Current Problems:**
- Badge silos prevent comprehensive skill representation
- Users lose badges when platforms shut down or change policies
- Informal learning orgs have no easy, trusted way to issue interoperable badges
- Employers and community partners cannot verify badges across different issuing systems
- No standardized trust or endorsement mechanisms between alternative badge networks
- Limited discovery of relevant issuers outside formal education

**Federation Requirements:**
- Multiple independent nodes (issuers/backpacks) must interoperate
- Trust, endorsements, and provenance must be verifiable across nodes
- Simple onboarding for non-technical administrators (e.g., one-command Docker deploy, managed hosting option)
- Badge discovery and search across federated networks
- User identity and reputation portable between nodes
- Conflict resolution for competing or contradictory badges

**Technical Constraints:**
- Must work with existing Open Badges 2.0 systems (backward compatibility)
- Cannot require centralized authority or single point of failure
- Must preserve local-first principles and user data ownership
- Should support both real-time and asynchronous federation
- Must handle network partitions and offline operation

**Prior Art:**
- **Email federation**: SMTP/IMAP protocols enable cross-provider messaging
- **ActivityPub**: Mastodon/fediverse social network federation
- **Matrix protocol**: Federated real-time communication
- **Git**: Distributed version control with multiple remotes
- **DNS**: Hierarchical distributed naming system
- **W3C DID networks**: Decentralized identity federation patterns

---

## Decision

Rollercoaster.dev will implement **federation as a core architectural goal** from the beginning, designing all systems to support multi-node badge networks with decentralized trust, discovery, and endorsement mechanisms — **optimized for alternative skill and learning communities**.

**Core Federation Architecture:**
- **Node-based design**: Each Rollercoaster.dev instance is an independent node
- **DID-based identity**: Users have portable identities across nodes
- **Badge synchronization**: Badges can be shared and verified across nodes
- **Cross-node endorsements**: Any trusted node can endorse a badge issued by another node, with endorsements cryptographically attached to the badge
- **Trust networks**: Reputation and trust scores propagate through federation
- **Discovery protocol**: Users can find and connect to relevant badge networks
- **Audience-first design**: Simplified onboarding for non-technical administrators (e.g., one-command deploy, hosted option)

**Technical Implementation:**
- **DID Method**: Use `did:web` for node identity, `did:key` for user identity
- **Federation Protocol**: Custom protocol built on ActivityPub patterns
- **Trust Mechanism**: Web-of-trust with cryptographic verification and endorsements
- **Discovery Service**: Distributed hash table (DHT) for node/badge discovery
- **Conflict Resolution**: User-controlled with reputation-weighted suggestions

**Phased Rollout Strategy:**
1. **Phase 1**: Single-node operation with federation-ready architecture
2. **Phase 2**: Two-node federation with manual trust establishment
3. **Phase 3**: Multi-node network with automated discovery
4. **Phase 4**: Open federation with public node registry

---

## Consequences

**Positive:**
- **Network effects**: Value increases with each additional federated node
- **User freedom**: Users can migrate between nodes without losing badges
- **Resilience**: No single point of failure for the badge ecosystem
- **Innovation**: Nodes can experiment with different features while maintaining interop
- **Trust distribution**: Reputation, endorsements, and verification distributed across network
- **Market expansion**: Enables badge ecosystem growth beyond single platforms
- **Accessibility**: Onboarding path designed for non-technical community organizations

**Negative / Risks:**
- **Complexity**: Federation adds significant technical and UX complexity
- **Trust challenges**: Establishing trust between unknown nodes is difficult
- **Spam/abuse**: Open federation enables badge spam and fraudulent credentials
- **Performance**: Cross-node operations may be slower than local operations
- **Consistency**: Eventual consistency may confuse users expecting immediate updates
- **Support burden**: Debugging issues across federated nodes is complex

**Risk Mitigations:**
- **Gradual rollout**: Start with trusted partners, expand slowly
- **Trust controls**: Users control which nodes they trust and federate with
- **Spam prevention**: Reputation systems, endorsements, and rate limiting
- **Performance optimization**: Aggressive caching and background sync
- **Clear UX**: Visual indicators for local vs. federated badge status
- **Monitoring tools**: Cross-node debugging and health monitoring

---

## Alternatives Considered

**Option A: Centralized hub model**
- *Pros*: Simpler trust model, easier discovery, consistent performance
- *Cons*: Single point of failure, vendor lock-in, scaling bottlenecks
- *Rejected*: Conflicts with decentralization and user ownership goals

**Option B: Blockchain-based federation**
- *Pros*: Immutable trust records, built-in consensus mechanisms
- *Cons*: High energy costs, transaction fees, scalability limits, complexity
- *Rejected*: Environmental concerns and user experience friction

**Option C: Email-style federation (SMTP/IMAP)**
- *Pros*: Proven federation model, well-understood protocols
- *Cons*: Not designed for credential verification, limited trust mechanisms
- *Considered*: May inform protocol design but insufficient alone

**Option D: Pure peer-to-peer (BitTorrent-style)**
- *Pros*: Maximum decentralization, no server requirements
- *Cons*: NAT traversal issues, discovery problems, offline challenges
- *Deferred*: Consider for future mobile/offline scenarios

---

## Implementation Plan

**Phase 1: Federation-Ready Architecture (Q3 2025)**
- Design all APIs with federation in mind
- Implement DID-based user and node identity
- Create badge export/import with full provenance tracking
- Build trust scoring framework (local-only initially)

**Phase 2: Two-Node Federation (Q4 2025)**
- Implement federation protocol between two trusted nodes
- Create cross-node badge verification and display
- Build trust establishment, endorsement, and management UI
- Test conflict resolution mechanisms

**Phase 3: Multi-Node Network (Q1 2026)**
- Expand to 5+ federated nodes with diverse use cases
- Implement automated node discovery mechanisms
- Create reputation and endorsement propagation across network
- Build federated search and badge discovery

**Phase 4: Open Federation (Q2 2026)**
- Launch public node registry and discovery service
- Create self-service node onboarding process
- Implement advanced spam and abuse prevention
- Build federation monitoring and health dashboards

---

## Technical Specifications

**DID Methods:**
- **Node Identity**: `did:web` for verifiable node credentials and policies
- **User Identity**: `did:key` for portable user identity across nodes
- **Badge Identity**: Unique identifiers with issuer node provenance

**Federation Protocol:**
- **Transport**: HTTPS with JSON-LD payloads
- **Authentication**: DID-based signatures for all cross-node communications
- **Synchronization**: Event-driven with eventual consistency guarantees
- **Discovery**: DHT-based node discovery with manual trust establishment

**Trust & Endorsement Mechanisms:**
- **Node Trust**: Manual trust establishment with cryptographic verification
- **Badge Trust**: Issuer reputation, endorsement records, verification evidence, community validation
- **User Trust**: Portable reputation scores with decay over time
- **Cross-Node Endorsements**: Any trusted node can attach cryptographically-signed endorsements to a badge issued elsewhere
- **Conflict Resolution**: User choice with reputation-weighted recommendations

---

## Links

**Specifications:**
- [Open Badges 3.0 Specification](https://www.imsglobal.org/spec/ob/v3p0/) — credential format
- [W3C Verifiable Credentials](https://www.w3.org/TR/vc-data-model-2.0/) — trust framework
- [W3C DID Core](https://www.w3.org/TR/did-core/) — decentralized identity
- [ActivityPub](https://www.w3.org/TR/activitypub/) — federation protocol patterns

**Related ADRs:**
- [ADR-0001: Self-Signed Badges](ADR-0001-self-signed-badges.md) — badge model foundation
- [ADR-0002: Local-First Optional Sync](ADR-0002-local-first-optional-sync.md) — data architecture

**Architecture:**
- [Architecture Overview](../architecture/overview.md) — system design context
- [Vision: Now/Next/Later](../vision/now-next-later.md) — strategic timeline

**User Stories:**
- [User Stories](../product/user-stories.md) — Carmen's mentorship story demonstrates federation use case

**Related Issues:** (link once created)
**Related PRs:** (link once created)

---

## Open Questions & Future Considerations

*These questions emerged during review and should be addressed in future iterations:*

### UX & Conflict Resolution
- **Conflict presentation**: How do we present conflicting badges to users without overwhelming them?
  - Consider Sofia's "garden in pieces" story - overwhelming choices can trigger analysis paralysis
  - Need clear, simple UI for "Badge A says X, Badge B says Y - which do you trust?"
  - Should we auto-resolve some conflicts based on reputation scores?

- **Graceful degradation**: What happens when federated nodes are offline?
  - Should we cache federated badges locally for offline viewing?
  - How long do we wait before showing "verification pending" vs "verification failed"?
  - Need fallback to local-first behavior when federation is unavailable

### Performance & Scalability
- **Cross-node verification speed**: 10 seconds might feel slow for real-time interactions
  - Consider background verification with immediate display + "verifying..." indicator
  - Could we pre-verify badges from trusted nodes to reduce latency?
  - What's the user experience during the 10-second wait?

- **Discovery mechanism complexity**: DHT-based discovery is ambitious for Phase 3
  - Should we start with simpler centralized registry and evolve to DHT?
  - What happens if DHT nodes go offline - do we lose discovery capability?
  - Consider hybrid approach: registry + DHT for redundancy

### Technical Implementation Details
- **Federation handshake example**: Need concrete example of node-to-node communication
  - What does the initial trust establishment look like in practice?
  - How do we handle version mismatches between federated nodes?
  - Should we define a minimum federation protocol version?

- **Trust scoring algorithm**: "Reputation-weighted recommendations" needs specification
  - How do we calculate cross-node reputation scores?
  - What prevents reputation gaming or Sybil attacks?
  - Should reputation decay over time or with inactivity?

### Security & Privacy
- **Node identity verification**: How do we prevent malicious nodes from impersonating trusted ones?
  - Should we require HTTPS certificates that match DID documents?
  - What's our plan for certificate rotation and key management?
  - How do we handle compromised node keys?

- **Data minimization in federation**: What's the minimum data needed for cross-node verification?
  - Can we verify badges without sharing full evidence files?
  - Should we support zero-knowledge proofs for privacy-preserving verification?
  - How do we handle GDPR "right to be forgotten" across federated nodes?

### Ecosystem & Adoption
- **Incentive alignment**: Why would organizations run federation nodes?
  - What's the value proposition for becoming a federation participant?
  - Should there be economic incentives or is reputation/community value enough?
  - How do we prevent the "tragedy of the commons" in federation maintenance?

*These questions should inform future ADRs, user research, and technical spikes as the federation implementation progresses.*