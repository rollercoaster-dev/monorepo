# Open-Source Open Badges Landscape

**Date:** 2026-04-23
**Purpose:** Baseline competitive/ecosystem research gathered before rebuilding `openbadges-system` and `openbadges-ui`. Used to identify real gaps vs. duplication risk and to generate anti-requirements for the rebuild.
**Method:** Web research (WebSearch + direct GitHub/project homepage verification) conducted by a general-purpose research agent. All "last commit" claims verified against the repos at time of writing.

---

## Executive summary

The open-source Open Badges ecosystem is thinner than it appears. Two projects do most of the real work — `edubadges-server` (a Django fork of the now-withdrawn Badgr codebase) and Salava (the Clojure-based Open Badge Passport community edition). The original reference implementations from Mozilla and Concentric Sky are archived or have vanished from GitHub after corporate acquisitions. OB 3.0 / Verifiable Credentials adoption is happening mostly outside the "badge server" category — in the DCC (MIT) and EUDI Wallet (EU) ecosystems — which means there is almost no mature, maintained, institution-agnostic, individual-first, OB 3.0 self-issuing server in the open-source space today.

---

## Comparison table

| Project                                 | License                 | OB 2.0                | OB 3.0 / VC                           | Primary audience                  | Architecture                          | Last meaningful activity                                   | Status                                     |
| --------------------------------------- | ----------------------- | --------------------- | ------------------------------------- | --------------------------------- | ------------------------------------- | ---------------------------------------------------------- | ------------------------------------------ |
| Badgr Server (Concentric Sky canonical) | AGPL-3.0 (historically) | Yes                   | Partial                               | LMS / institutions                | Django monolith + API                 | Repo removed from GitHub post-2022 Instructure acquisition | Effectively dead upstream                  |
| edubadges-server (SURF)                 | AGPL-3.0                | Yes                   | Yes (OB 3.0 / VC)                     | Dutch HE consortium               | Django, Badgr fork                    | 2026-04-21                                                 | Actively maintained                        |
| Salava / Open Badge Passport CE         | Apache-2.0              | Yes                   | No                                    | Individuals / backpack            | Clojure monolith (Java 8 + MariaDB)   | 2020-10                                                    | Stale; cloud product moved on              |
| Open Badge Factory                      | Proprietary SaaS        | Yes                   | Yes (since Sept 2025)                 | Enterprise / education            | Cloud-only                            | N/A                                                        | Commercial; only Salava is OSS             |
| Moodle (core Badges)                    | GPL-3.0                 | Yes                   | Planned                               | LMS users                         | Moodle subsystem                      | Rolling (core)                                             | OB 3.0 schema work "near future"           |
| Open edX Credentials (Badges)           | AGPL-3.0                | Via Credly/Accredible | No native                             | Course operators                  | Django service                        | Rolling                                                    | Depends on third-party issuers             |
| Blockcerts (Hyland / MIT)               | MIT                     | Adjacent              | Partial (VC-based, not OB 3.0 native) | Universities, governments         | Python issuer + JS verifier + wallets | cert-issuer 2026-04; cert-verifier 2020                    | Core issuer active; peripheral tools stale |
| DCC Issuer Coordinator                  | MIT                     | No                    | Yes (VC-API, OBv3 context)            | Higher-ed consortium              | Node microservices                    | 2024-11 (coordinator)                                      | Maintained, modular                        |
| EUDI Wallet ecosystem                   | Apache / EUPL           | No                    | Yes (OpenID4VCI, mdoc / SD-JWT)       | EU member states                  | Reference wallets + issuers           | 2026-04 (daily)                                            | Very active, badges tangential             |
| Mozilla Backpack / BadgeKit             | MPL / NOASSERTION       | Yes (historic)        | No                                    | —                                 | Node monolith                         | Archived 2019 / 2020                                       | Dead                                       |
| Certo (Schroedinger-Hat)                | AGPL-3.0                | No                    | Yes (OB 3.0)                          | Conference / workshop organisers  | Small web app                         | 2026-01                                                    | Tiny but alive                             |
| Tahrir (Fedora)                         | NOASSERTION (GPL-like)  | Yes                   | No                                    | Fedora contributors / communities | Flask app                             | 2026-04                                                    | Maintained for internal use                |
| MediaWiki OpenBadges extension          | GPL                     | Yes                   | No                                    | Wiki communities                  | MediaWiki extension                   | 2026-04                                                    | Maintained but niche                       |

---

## Project notes

### Badgr Server

Historically the reference AGPL-3.0 Django implementation from Concentric Sky. Post-Instructure acquisition (April 2022) and the October 2025 rebrand to "Parchment Digital Badges", the canonical `github.com/concentricsky/badgr-server` repository returns 404. Free issuer plan sunset **December 31, 2025**. What's left are institutional forks (`edubadges`, `fedora-infra`, `reedu-reengineering`, `EOSC-synergy`, `ctrlwebinc/bf2-badgr-server`) that have diverged.

- **Good at:** a proven issuer / backpack / verification flow institutions already know.
- **Bad at:** upstream is gone, the codebase is Django circa 2016, OB 3.0 support is inconsistent across forks.

### edubadges-server

https://github.com/edubadges/edubadges-server — AGPL-3.0, ~44 stars, last push **2026-04-21**. The most actively maintained Badgr descendant, built for the Dutch SURF higher-education network. Explicitly supersedes the older `edubadges/badgr-server` fork, which they mark DEPRECATED.

- **Good at:** real OB 3.0 + W3C VC support from a credible institutional consortium.
- **Bad at:** opinionated for the SURF federation context (eduID, institution hierarchies); not drop-in for a solo issuer.

### Salava / Open Badge Passport CE

https://github.com/openbadgefactory/salava — Apache-2.0, ~21 stars, last push **2020-10-02**. The community edition of Discendum's Open Badge Passport.

- **Good at:** being one of the only OSS projects that treats the earner, not the issuer, as the primary user.
- **Bad at:** effectively abandoned upstream — Clojure + Java 8 + MariaDB, no OB 3.0, while the hosted OBF product quietly kept going.

### Open Badge Factory

https://openbadgefactory.com — Discendum's commercial SaaS; Salava is the only OSS component and is stale. OBF itself moved to OB 3.0 in September 2025 and is 1EdTech certified. "Open source" framing is misleading in practice: you can't self-host a current OBF.

### Mozilla Open Badges Backpack / BadgeKit

Both archived (2019 and 2020). Historically important; do not use. 867 stars on the Backpack repo, but it's a tombstone.

### Moodle core Badges

GPL, OB 2.0/2.1 today. Forum discussions from 2025 confirm OB 3.0 support is planned but not shipped in core. If you're inside Moodle, badges "just work"; outside, it's not a server.

### Open edX Credentials

Does not issue OB natively; it's a thin wrapper around third-party issuers (Credly, Accredible).

- **Good at:** delivering badges tied to edX courses.
- **Bad at:** you're renting someone else's issuance.

### Blockcerts / Hyland

MIT-licensed. `blockchain-certificates/cert-issuer` is active (426 stars, 2026-04 push), `cert-verifier-js` is active (114 stars, daily), but the web verifier, viewer, and some wallet pieces haven't moved since 2020–2021.

- **Good at:** blockchain-anchored credentials with MIT-backed provenance.
- **Bad at:** it's a Blockcerts-shaped hole, not OB 3.0 native; UX assumes you own a wallet.

### DCC (Digital Credentials Consortium)

https://github.com/digitalcredentials — MIT. Not a monolith but a set of composable MIT/Harvard-backed microservices: `issuer-coordinator`, `signing-service`, `verifier-core`, `verifier-plus`, `status-service-db`, and notably `open-badges-context` (the OBv3 JSON-LD context package, 2025-05). This is the closest thing to a credible OB 3.0 reference stack outside Europe.

- **Good at:** modern VC-API, revocation via bitstring status list, academic pedigree.
- **Bad at:** higher-ed-consortium assumptions, no unified UX, you have to assemble the pieces.

### EUDI Wallet

https://github.com/eu-digital-identity-wallet — 60+ repos, Apache / EUPL, all pushed in the last week. Not a badge platform per se, but OpenID4VCI + SD-JWT + mdoc is what EU-issued credentials (including education attestations) will actually ride on by end of 2026 per eIDAS 2.0.

- **Good at:** being the regulatory forcing function for the next five years.
- **Bad at:** nothing here targets badges specifically; diploma / micro-credential use cases are "on the roadmap" rather than shipped.

### Certo

https://github.com/Schroedinger-Hat/certo — AGPL-3.0, ~19 stars, last push **2026-01-28**. An Italian open-source project aimed at workshop / conference organisers issuing OB 3.0 certificates. Small but alive and genuinely OB 3.0 focused — worth watching.

### Tahrir (Fedora)

https://github.com/fedora-infra/tahrir — Flask-based "issue your own Open Badges" app, ~84 stars, active. Built by and for the Fedora community (FAS accounts assumed).

- **Good at:** simple, self-hostable, tested at real community scale.
- **Bad at:** OB 2.0 only, opinionated about the Fedora identity stack.

### MediaWiki OpenBadges extension

Maintained but purely a MediaWiki add-on; not a general-purpose server.

---

## Five gaps / opportunities

1. **There is no actively maintained, OB 3.0-native, individual-first open-source badge server.** Salava was the closest philosophically and it's been stale since 2020. Every actively maintained option (edubadges, Open edX, Moodle, OBF) assumes an institution is the primary actor. An earner-first self-signing server is a genuinely empty slot — not a duplicate.

2. **"Badgr" as a brand is effectively dead upstream**, but thousands of existing badges in the wild point at Badgr URLs. There's a real need for a drop-in verifier / migration path as Parchment sunsets the free tier on 2025-12-31 — that's a concrete, time-boxed opportunity rather than a vague "build a better Badgr."

3. **OB 3.0 is shipping on paper but almost nowhere in self-hostable OSS.** OBF flipped in Sept 2025 (proprietary), edubadges-server has it (institutional), DCC has the pieces (assembly required), Certo is tiny. A polished, single-binary, OB 3.0-first server with VC-API + bitstring status list would not be duplicating any maintained project.

4. **Federation / cross-server verification is not solved.** Every deployment is an island. The DCC VerifierPlus and 1EdTech's public validator verify individual credentials, but there is no "badge fediverse" — no ActivityPub experiments with OB 3.0 surfaced in the search, despite the obvious conceptual fit (earner-owned inbox of achievements). This is greenfield.

5. **The EUDI Wallet is going to eat education credentials by 2027** whether the badge-server world is ready or not. OpenID4VCI + SD-JWT is where regulated issuance will land. A server that speaks _both_ OB 3.0 (the 1EdTech world) _and_ OpenID4VCI (the EU wallet world) as first-class outputs would bridge a gap nobody in either camp has closed — edubadges-server does OB 3.0, EUDI does OpenID4VCI, but no one in the OSS badge space does both credibly today.

---

## Observation: every actively-maintained option is monolithic

Across the whole list, the delivery shape is the same: **one Django/Clojure/Flask app, one database, one deploy unit.** The only exception is the DCC, which is a constellation of microservices — and even DCC is scoped to institutional issuance, not toolkit reuse. No project in this landscape positions itself as **a toolkit for other developers to build badge features into their own products**. This is probably the most significant structural gap: not a missing feature, but a missing posture.

---

## Sources

- Instructure acquisition of Concentric Sky: https://www.instructure.com/press-release/instructure-acquires-concentric-sky
- Canvas Credentials → Parchment Digital Badges rebrand / free tier sunset: https://community.canvaslms.com/ (summarised via search)
- edubadges-server: https://github.com/edubadges/edubadges-server
- Salava: https://github.com/openbadgefactory/salava
- Open Badge Factory OB 3.0 migration: https://openbadgefactory.com/en/your-badges-are-now-open-badges-3-0/
- 1EdTech OB 3.0 spec: https://www.imsglobal.org/spec/ob/v3p0 and https://github.com/1EdTech/openbadges-specification
- Blockcerts org: https://github.com/blockchain-certificates (notably `cert-issuer`, `cert-verifier-js`)
- Digital Credentials Consortium: https://github.com/digitalcredentials (notably `issuer-coordinator`, `open-badges-context`, `verifier-plus`)
- EUDI Wallet: https://github.com/eu-digital-identity-wallet and https://eu-digital-identity-wallet.github.io/eudi-doc-architecture-and-reference-framework/2.5.0/
- Moodle OB 3.0 status: https://moodle.org/mod/forum/discuss.php?d=438152 and https://moodledev.io/docs/5.2/apis/subsystems/badges
- Open edX Credentials / Badges: https://docs.openedx.org/projects/edx-credentials/en/latest/badges/
- Mozilla Backpack (archived): https://github.com/mozilla/openbadges-backpack
- BadgeKit (archived): https://github.com/mozilla/openbadges-badgekit
- Certo: https://github.com/Schroedinger-Hat/certo
- Tahrir: https://github.com/fedora-infra/tahrir
- MediaWiki OpenBadges extension: https://github.com/wikimedia/mediawiki-extensions-OpenBadges
- Hyland / Blockcerts background: https://www.hyland.com/en/solutions/products/hyland-credentials and https://www.blockcerts.org/about.html
