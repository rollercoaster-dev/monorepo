# Feasibility Research — Per-Recipient Selective Disclosure on Self-Signed OB 3.0

**Date:** 2026-04-23
**Purpose:** Validate whether Story 2 (Lina chooses exactly what her librarian sees) in [`apps/openbadges-system/docs/user-stories.md`](../../openbadges-system/docs/user-stories.md) can be built. Decide the cryptographic approach, the library stack, and the honest fall-back before user-story work continues.
**Method:** Web research (specs, IETF drafts, W3C CRs, library repos, production implementations) via a general-purpose research agent, verified against actual repo state.

---

## One-paragraph verdict

**Feasible with significant compromise, leaning toward aspirational-only for the full story as initially described.** As of April 2026, the pieces exist on paper — OB 3.0 rides on W3C VC Data Model 2.0, RFC 9901 (SD-JWT) was finalized November 2025, and selective-disclosure cryptosuites (`ecdsa-sd-2023`, `bbs-2023`) are published with reference JS implementations. But three load-bearing problems make the _full_ cryptographic SD vision a poor solo-dev target today: (1) **1EdTech's OB 3.0 conformance targets only `eddsa-rdfc-2022` and `RSA256` JWT** — SD cryptosuites are not part of OB 3.0 conformance, so you'd be shipping something certified verifiers can't validate; (2) **binary blobs (photos, screenshots) are not well-served by message-based SD** — you get hash-referenced evidence with external hosting, which breaks pure local-first; (3) **no existing project ships this exact pattern**. A solo builder can ship a credible 80% version using a **per-recipient wrapped-presentation approach** (detailed below) that delivers the entire user-facing experience Lina's story promises, with mature libraries and without faking cryptography.

---

## Feasibility grade per sub-question

| #   | Topic                                      | Grade                                                                  | Short reason                                                                                                                                                                                                                                                              |
| --- | ------------------------------------------ | ---------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| 1   | OB 3.0 + SD cryptosuites                   | **YELLOW → RED**                                                       | OB 3.0 permits VCDM 2.0 proofs generically, but 1EdTech conformance targets EdDSA/RSA-JWT only. No 1EdTech SD test vectors.                                                                                                                                               |
| 2   | SD-JWT viability in TS/JS                  | **GREEN**                                                              | RFC 9901 is final (Nov 2025). `@sd-jwt/*` (OpenWallet Foundation) at v0.19.0, Jan 2026, ~3.1k weekly downloads. Hidden = absent (salted digests), not redacted placeholders.                                                                                              |
| 3   | BBS / ECDSA-SD in TS/JS                    | **YELLOW**                                                             | `@digitalbazaar/bbs-2023-cryptosuite` and `ecdsa-sd-2023-cryptosuite` exist and are interop-tested (W3C report Apr 2026), but repos have <20 stars, niche adoption. MATTR's `bbs-signatures` archived Feb 2025. Pairing-crypto is the live path.                          |
| 4   | Evidence array SD + binary blobs           | **YELLOW**                                                             | SD-JWT and BBS both support per-array-element disclosure. But inlined photos as data URIs blow up SD payload sizes; hash-referenced is standard, which means **you must host the hidden-from-X blobs somewhere X can't reach** — pure local-first breaks.                 |
| 5   | Local-first key management on web          | **YELLOW**                                                             | WebAuthn PRF has broad 2026 support (Chrome, Firefox 148+, iOS 18.4+, Windows 11 25H2), but PRF produces a symmetric secret, not an Ed25519/BLS signing key. You use PRF to unlock an IndexedDB-stored signing key. Direct passkey-signs-credential is still not a thing. |
| 6   | Delivery + revocation                      | **GREEN** for per-share-URL + delete; **YELLOW** for crypto revocation | Bitstring Status List is the standard but gives per-credential status, not per-share. Per-share is usually "distinct derived presentation at distinct URL, delete to revoke."                                                                                             |
| 7   | Practical precedent for this exact pattern | **RED**                                                                | DCC LCW (now OpenWallet-Foundation-stewarded since Jan 2025) supports OB 3.0 but not per-recipient evidence SD. No shipped tool does "one OB 3.0 credential → N per-recipient evidence-filtered disclosures."                                                             |

---

## Recommended cryptographic approach

**Wrapped-presentation per recipient, using SD-JWT VC if and when SD lands on the OB 3.0 conformance runway — not before.**

For Iteration A:

- **One self-signed OB 3.0 credential** in compact JWS form (`eddsa-rdfc-2022` or JWT RS256) — certifiable, verifiable by any OB 3.0 verifier.
- **Evidence items stored local-first by content hash.** The credential references content hashes, not embedded blobs. Blobs live in local storage + an access-controlled blob relay.
- **Per-recipient "share package"** = a freshly-signed presentation wrapping: the original credential + the subset of evidence blobs Lina chose + a per-recipient framing note. Signed by Lina's share-time key at share construction.
- **Per-share capability URL** with a random token. Revocation = delete the share package + flip a bit in a status list Lina hosts.
- **Hidden evidence is genuinely not present** in the share package — because the package is freshly constructed per recipient, not a derivation from a single SD signature. Recipients cannot enumerate what else exists; they see only what Lina wrapped.
- **WebAuthn + PRF** to unlock an IndexedDB-stored Ed25519 key for signing share packages.

Why this over the alternatives:

- **vs. BBS (`bbs-2023`)**: BBS gives unlinkability, which sounds great but isn't free — BLS12-381 (WASM), tiny JS ecosystem (<20 stars across repos), not on OB 3.0's conformance runway. For Lina's use case the threat model is weak: librarian and hiring manager aren't colluding. Big complexity tax for a property the story doesn't need.
- **vs. `ecdsa-sd-2023`**: Fewer moving parts than BBS but still JSON-LD / canonicalization. Reference implementation has 16 stars. Very early production territory.
- **vs. SD-JWT VC as primary**: SD-JWT is the most mature crypto-SD path in 2026, but it's also not on 1EdTech's OB 3.0 conformance runway. Wrapped presentation delivers the same user experience with simpler, more portable primitives today, and the SD-JWT path remains available as a future upgrade.

**Trade-offs you accept:**

- No cryptographic unlinkability across shares (librarian and hiring manager could in principle compare notes and see it's the same underlying credential — but they can already, via the issuer DID).
- Not a 1EdTech-blessed "selective disclosure proof." But 1EdTech doesn't certify SD anyway — so no tooling penalty.

**Trade-offs you avoid:**

- JSON-LD canonicalization complexity.
- Bleeding-edge crypto with <20-star library backing.
- Waiting for 1EdTech to bless SD cryptosuites (indeterminate).

---

## Library shortlist

| Package                                                       | Status as of 2026                                              | Use for                                            |
| ------------------------------------------------------------- | -------------------------------------------------------------- | -------------------------------------------------- |
| `@sd-jwt/core`, `@sd-jwt/sd-jwt-vc`, `@sd-jwt/crypto-browser` | v0.19.0 (Jan 2026), ~3.1k weekly dl, OpenWallet Foundation     | Future SD upgrade; not needed for v1               |
| `@digitalbazaar/vc`                                           | Actively maintained                                            | Native Data Integrity path for 1EdTech conformance |
| `@simplewebauthn/browser` + PRF extension                     | Browser-side passkey + PRF to unlock IDB-encrypted Ed25519 key | Web key management                                 |
| `@noble/ed25519`, `@noble/curves`                             | Audited, zero-dep                                              | Signing in the browser                             |
| `@digitalbazaar/bbs-2023-cryptosuite`                         | 60 commits, 6 tags, beta-ish                                   | Only if unlinkability becomes a real requirement   |
| `@digitalbazaar/ecdsa-sd-2023-cryptosuite`                    | 252 commits, 16 stars, interop tests Apr 2026                  | Backup path; niche                                 |
| **Avoid:** `@mattrglobal/bbs-signatures`                      | **Archived Feb 2025**                                          | Do not adopt. Use `pairing_crypto` if you go BBS.  |
| **Avoid:** `@meeco/sd-jwt-vc`                                 | Less active than OWF's                                         | Prefer OWF's `sd-jwt-js` family                    |

---

## Known pitfalls

1. **Evidence blobs force a hosting decision.** You cannot inline 2MB photos as data URIs across many disclosures. Standard pattern: store blobs by content hash, reference from evidence items, serve over per-recipient capability URLs. Hidden-from-librarian blobs still need to live somewhere the librarian can't GET — you'll need an access-controlled blob store. Pure local-first is compromised: blobs serve from user's device when online, or from a relay/pinning service when not.
2. **"Hidden is invisible" breaks at the filename layer.** If evidence items have descriptive `name` fields ("Sobriety-journal-Jan.jpg") you leak metadata in the digests unless each entire evidence object is one disclosure blob. Design the evidence schema so each item is atomic.
3. **WebAuthn PRF is not signing.** PRF returns a 32-byte symmetric secret tied to a passkey. Use it to wrap an Ed25519 signing key at rest in IndexedDB. The passkey does not directly sign credential payloads. Users on non-PRF-capable authenticators need a fallback.
4. **Generic OB 3.0 verifiers will not ingest SD-JWT or wrapped-presentation formats directly.** A librarian using a third-party verifier will fail. You must ship your own verifier UI for share packages, plus produce a fully-disclosed plain OB 3.0 credential on demand for dumb-verifier cases.
5. **Revocation ≠ deletion.** Deleting a share URL works until the recipient has cached the disclosure offline. For genuine revocation use per-share status list entries (Bitstring Status List, one bit per share, not per credential). The issuer's device must periodically serve the status list.
6. **Self-signed + selective disclosure has a trust-model note.** A hiring manager can verify the signature, but "Lina signed a credential saying Lina did X" is circular. Stories and UX should be explicit: the evidence is what's being evaluated; the signature proves _it was Lina who published this specific disclosure_, nothing more. Peer / mentor endorsement (Iteration D) is what adds external trust.
7. **`ecdsa-sd-2023` and `bbs-2023` are JSON-LD based.** Canonicalization (`jsonld.js`, RDF canonicalization) has its own historical footguns. SD-JWT avoids this entire category — another reason it's the default future-upgrade path.

---

## The 80% version that Story 2 actually describes

Reading Lina's story carefully, the _user experience_ it promises is fully deliverable today with the wrapped-presentation approach. What changes is the underlying mechanism, not the user-visible behavior:

| Story promise                                                   | Deliverable today  | How                                                                                            |
| --------------------------------------------------------------- | ------------------ | ---------------------------------------------------------------------------------------------- |
| Data + keys stay on Lina's devices                              | YES                | IndexedDB + WebAuthn PRF + Ed25519 via `@noble/ed25519`                                        |
| Per-recipient evidence toggles                                  | YES                | Share-time UI; wrapped-presentation constructed from chosen subset                             |
| Hidden pieces genuinely not-present (not redacted placeholders) | YES                | Share package contains only chosen items; recipient can't enumerate what's missing             |
| Recipient-specific framing notes                                | YES                | Added to the wrapped presentation as new signed statements at share time                       |
| Revocation per share                                            | YES (with caveats) | Delete share + per-share status list bit                                                       |
| Same badge → many disclosures to many audiences                 | YES                | One credential, many wrapped presentations; no data duplication beyond the small JSON wrappers |
| Verifiable without central server                               | YES                | Verifier checks Lina's signature over the share package + the underlying credential signature  |
| Fully public mode when Lina chooses                             | YES                | Public share = wrapped presentation with all evidence + a public URL                           |

**The thing the story implicitly promised but can't be delivered cleanly:** cryptographic unlinkability between shares. If the librarian and the hiring manager compare notes, they can tell both shares come from the same underlying credential (same issuer DID, same credential ID). This is a weak threat for Lina's use case — she's deliberately sharing with both — but the story should not imply otherwise. Unlinkability is achievable later by upgrading to BBS, if it ever matters.

---

## Upgrade path

When 1EdTech publishes SD guidance (watch `vc-jose-cose` uptake in the OB conformance suite) and the SD-JWT tooling matures further:

1. Swap the wrapped-presentation layer for SD-JWT VC.
2. Keep the evidence-hashing, blob-relay, and key-management layers as-is.
3. If genuine unlinkability becomes a user need (it probably won't for individual earners; might for clinical or high-stakes credentials), add BBS as a parallel signature format.

The architecture choice in v1 does not lock out any of these upgrades.

---

## What Story 2's anti-requirements should be updated to say

Current anti-requirements in Story 2 are directionally correct but miss architectural constraints this research surfaced. Recommended additions:

- Evidence blobs are stored by content hash; the credential references hashes, not embedded blobs.
- Each share is a freshly-signed presentation wrapping the credential + chosen evidence + optional recipient-specific note. Shares are not derivations of a single SD signature.
- Web key management uses WebAuthn + PRF (or equivalent) to unlock an IndexedDB-stored Ed25519 signing key. Users on non-PRF authenticators get a deliberately-chosen fallback (passphrase-derived key or similar) — not silent failure.
- Per-share revocation is cryptographic (status list bit), not just file deletion.
- Self-signed credentials carry the honest trust-model footnote: Lina's signature proves _authorship of the disclosure_, not external validation of the claim. External validation is Iteration D (peer / mentor).

---

## Sources

- [Open Badges 3.0 Spec](https://www.imsglobal.org/spec/ob/v3p0) and [Implementation Guide](https://www.imsglobal.org/spec/ob/v3p0/impl)
- [RFC 9901 — Selective Disclosure for JSON Web Tokens](https://datatracker.ietf.org/doc/rfc9901/)
- [draft-ietf-oauth-sd-jwt-vc-15](https://datatracker.ietf.org/doc/draft-ietf-oauth-sd-jwt-vc/)
- [W3C Data Integrity BBS Cryptosuites v1.0](https://www.w3.org/TR/vc-di-bbs/)
- [W3C Data Integrity ECDSA Cryptosuites v1.0](https://www.w3.org/TR/vc-di-ecdsa/)
- [W3C VC-JOSE-COSE](https://www.w3.org/TR/vc-jose-cose/)
- [digitalbazaar/ecdsa-sd-2023-cryptosuite](https://github.com/digitalbazaar/ecdsa-sd-2023-cryptosuite) · [bbs-2023-cryptosuite](https://github.com/digitalbazaar/bbs-2023-cryptosuite)
- [openwallet-foundation/sd-jwt-js](https://github.com/openwallet-foundation/sd-jwt-js) (v0.19.0, Jan 2026)
- [mattrglobal/bbs-signatures — archived Feb 2025](https://github.com/mattrglobal/bbs-signatures) → successor [pairing_crypto](https://github.com/mattrglobal/pairing_crypto)
- [WebAuthn PRF Developer Guide (Yubico)](https://developers.yubico.com/WebAuthn/Concepts/PRF_Extension/Developers_Guide_to_PRF.html) and [Corbado 2026 PRF status](https://www.corbado.com/blog/passkeys-prf-webauthn)
- [W3C Bitstring Status List](https://www.w3.org/TR/vc-bitstring-status-list/)
- [DCC stewardship transfer to OWF, Jan 2025](https://medium.com/open-learning/dcc-transfers-stewardship-of-learner-credential-wallet-to-the-open-wallet-foundation-24fe0c336829)
- [W3C ECDSA Interop Report (Apr 2026)](https://w3c.github.io/vc-di-ecdsa-test-suite/)
