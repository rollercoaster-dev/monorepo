Here’s the revised ADR-0001 with Open Badges 3.0 as the foundation and 2.0 included only for compatibility:

⸻

ADR-0001: Self-Signed Badges Are First-Class Citizens

Date: 2025-08-13
Status: Accepted
Owner: Joe

⸻

Context

The Open Badges 2.0 standard is issuer-centric, requiring all badges to have a designated issuer (person or organization). While technically possible to “self-issue” by making the issuer and recipient the same entity, this is a workaround rather than a formalized feature.

Open Badges 3.0 changes this:
	•	Adopts the W3C Verifiable Credentials (VC) data model.
	•	Supports self-issued badges through Decentralized Identifiers (DIDs), allowing recipients to cryptographically sign and own their credentials.
	•	Enables local-first and federated ecosystems, where a user’s backpack can act as the authoritative source of their badges.

Self-signed badges are critical for:
	•	Neurodivergent users whose skills are often developed outside traditional institutions.
	•	Independent learners and creators who need a portable, verifiable way to showcase skills.
	•	Communities using peer validation instead of top-down credentialing.

⸻

Decision

Rollercoaster.dev will implement self-signed badges as a first-class feature using the Open Badges 3.0 (VC + DID) model.
	•	Self-signed badges will have the same UX priority and polish as organizationally-issued badges.
	•	Verification will be optional but supported via AI review, peer review, or mentor review.
	•	The badge backpack will store and display self-signed badges alongside other badges, with filtering available but no default segregation.
	•	For interoperability, Rollercoaster.dev will also support OB 2.0 import/export, mapping self-signed badges where possible.

⸻

Consequences

Positive:
	•	Empowers users to document achievements without institutional gatekeeping.
	•	Aligns with local-first and user-owned data principles.
	•	Positions Rollercoaster.dev as a leader in OB 3.0 adoption.

Negative / Risks:
	•	Potential for “badge inflation” without strong evidence/review workflows.
	•	May be undervalued by stakeholders used to institutional credentials.
	•	Requires maintaining dual support for OB 2.0 and OB 3.0 formats.

⸻

Alternatives Considered
	1.	Institutional-first (2.0 only) — Higher trust but excludes non-traditional learning.
	2.	Self-signed as hidden option — Lowers risk but undermines inclusivity and quick adoption.

⸻

Links
	•	Open Badges 3.0 Specification
	•	W3C Verifiable Credentials Data Model
	•	Open Badges 2.0 Specification (for interoperability)
	•	Related Issues: (link once created)
	•	Related PRs: (link once created)

